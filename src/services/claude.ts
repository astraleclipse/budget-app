import type { Transaction, Category, BudgetLimit } from '../types';
import { getCategoryTotals, getTransactionsForMonth, getTotalIncome, getTotalExpenses, getLargestExpenses } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { format, subMonths } from 'date-fns';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `You are a personal finance advisor AI embedded in a budget tracking app.
Your job is to analyze the user's spending data and provide specific, actionable savings recommendations.

Rules:
- Be specific: reference actual category names and dollar amounts from the data
- Be encouraging, not judgmental
- Compare spending to reasonable benchmarks (e.g., 50/30/20 rule)
- Prioritize high-impact suggestions (biggest potential savings first)
- Format your response in clear markdown with headers and bullet points
- Include a brief summary section at the top with key numbers
- End with 3 specific action items the user can take this month

Structure your response as:
## Summary
Key numbers: total income, total expenses, savings rate, biggest category

## Where You're Doing Well
Categories that are within or under budget

## Areas to Watch
Categories over budget or growing fast, with specific amounts

## Savings Opportunities
Specific, actionable suggestions with estimated savings amounts

## This Month's Action Items
3 concrete steps`;

export async function callClaudeApi(apiKey: string, userMessage: string, model?: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export function buildAnalysisPrompt(
  transactions: Transaction[],
  categories: Category[],
  budgetLimits: BudgetLimit[],
  month: string
): string {
  const monthTx = getTransactionsForMonth(transactions, month);
  const totalIncome = getTotalIncome(monthTx);
  const totalExpenses = getTotalExpenses(monthTx);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const expenseTotals = getCategoryTotals(transactions, categories, budgetLimits, month, 'expense');
  const incomeTotals = getCategoryTotals(transactions, categories, budgetLimits, month, 'income');
  const largestExpenses = getLargestExpenses(transactions, month, 5);

  const prevMonth = format(subMonths(new Date(month + '-01'), 1), 'yyyy-MM');
  const prevMonthTx = getTransactionsForMonth(transactions, prevMonth);
  const prevExpenses = getTotalExpenses(prevMonthTx);
  const prevIncome = getTotalIncome(prevMonthTx);

  const lines: string[] = [
    `Analyzing spending for: ${month}`,
    '',
    '### Income',
    ...incomeTotals.map(i => `- ${i.categoryName}: ${formatCurrency(i.total)} (${i.count} transactions)`),
    ...(incomeTotals.length === 0 ? ['- No income recorded'] : []),
    '',
    '### Expenses by Category',
    ...expenseTotals.map(e =>
      `- ${e.categoryName}: ${formatCurrency(e.total)} (${e.count} transactions)` +
      (e.budgetLimit ? ` | Budget: ${formatCurrency(e.budgetLimit)} | ${Math.round(e.percentUsed!)}% used` : ' | No budget set')
    ),
    ...(expenseTotals.length === 0 ? ['- No expenses recorded'] : []),
    '',
    '### Key Metrics',
    `Total Income: ${formatCurrency(totalIncome)}`,
    `Total Expenses: ${formatCurrency(totalExpenses)}`,
    `Net: ${formatCurrency(totalIncome - totalExpenses)}`,
    `Savings Rate: ${savingsRate.toFixed(1)}%`,
    '',
    '### Previous Month Comparison',
    `Previous month income: ${formatCurrency(prevIncome)}`,
    `Previous month expenses: ${formatCurrency(prevExpenses)}`,
    `Change in expenses: ${prevExpenses > 0 ? `${(((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1)}%` : 'N/A'}`,
    '',
    '### Top 5 Largest Expenses This Month',
    ...largestExpenses.map((t, i) => {
      const cat = categories.find(c => c.id === t.category);
      return `${i + 1}. ${formatCurrency(t.amount)} - ${t.description} (${cat?.name || t.category})`;
    }),
    ...(largestExpenses.length === 0 ? ['- No expenses recorded'] : []),
  ];

  return lines.join('\n');
}
