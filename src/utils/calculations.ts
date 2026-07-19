import type { Transaction, Category, BudgetLimit } from '../types';
import { format, subMonths } from 'date-fns';

export function getTransactionsForMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter(t => t.date.startsWith(month));
}

export function getTransactionsForYear(transactions: Transaction[], year: string): Transaction[] {
  return transactions.filter(t => t.date.startsWith(year));
}

// Exclude internal transfers from income calculations
export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income' && t.category !== 'internal-transfer')
    .reduce((sum, t) => sum + t.amount, 0);
}

// Exclude internal transfers from expense calculations
export function getTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense' && t.category !== 'internal-transfer')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpenses(transactions);
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  budgetLimit?: number;
  percentUsed?: number;
}

export interface FinancialHealthBreakdown {
  savingsRateScore: number;
  budgetAdherenceScore: number;
  debtTrendScore: number;
  cashBufferScore: number;
}

export interface FinancialHealthResult {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'At Risk';
  savingsRate: number;
  budgetAdherence: number;
  debtTrend: 'improving' | 'stable' | 'worsening';
  cashBufferMonths: number;
  breakdown: FinancialHealthBreakdown;
}

/**
 * Find the effective budget for a category in a given period.
 *
 * In monthly mode, only "yyyy-MM" (7-char) limits are considered.
 * In yearly mode, only "yyyy" (4-char) limits are considered.
 *
 * Resolution: exact match first, then most recent prior period, then any limit for category.
 */
export function getEffectiveBudgetLimit(
  budgetLimits: BudgetLimit[],
  categoryId: string,
  period: string,
  mode: 'monthly' | 'yearly' = 'monthly'
): number | undefined {
  const isYearly = mode === 'yearly';
  const expectedLen = isYearly ? 4 : 7;

  // Filter to matching category AND matching format
  const catLimits = budgetLimits.filter(bl =>
    bl.categoryId === categoryId && bl.month.length === expectedLen
  );

  if (catLimits.length === 0) return undefined;

  // Exact match for this period
  const exact = catLimits.find(bl => bl.month === period);
  if (exact) return exact.monthlyLimit;

  // Fall back to most recent prior period
  const prior = catLimits
    .filter(bl => bl.month <= period)
    .sort((a, b) => b.month.localeCompare(a.month));
  if (prior.length > 0) return prior[0].monthlyLimit;

  // Fall back to any limit (e.g. only future periods exist)
  catLimits.sort((a, b) => b.month.localeCompare(a.month));
  return catLimits[0].monthlyLimit;
}

export function getCategoryTotals(
  transactions: Transaction[],
  categories: Category[],
  budgetLimits: BudgetLimit[],
  period: string,
  type: 'income' | 'expense' = 'expense',
  budgetMode: 'monthly' | 'yearly' = 'monthly'
): CategoryTotal[] {
  // Get transactions for the period
  const isYearly = budgetMode === 'yearly' && period.length === 4;
  const periodTx = isYearly
    ? getTransactionsForYear(transactions, period)
    : getTransactionsForMonth(transactions, period);

  // Exclude internal transfers from category breakdowns
  const filteredTx = periodTx.filter(t => t.type === type && t.category !== 'internal-transfer');
  const catMap = new Map(categories.map(c => [c.id, c]));

  const totals = new Map<string, { total: number; count: number }>();
  for (const tx of filteredTx) {
    const prev = totals.get(tx.category) || { total: 0, count: 0 };
    totals.set(tx.category, { total: prev.total + tx.amount, count: prev.count + 1 });
  }

  // Collect all category IDs that have either spending or a budget
  const relevantCatIds = new Set<string>(totals.keys());
  for (const cat of categories) {
    if (cat.type === type || (type === 'expense' && cat.type === 'expense')) {
      const effectiveLimit = getEffectiveBudgetLimit(budgetLimits, cat.id, period, budgetMode);
      if (effectiveLimit !== undefined && effectiveLimit > 0) {
        relevantCatIds.add(cat.id);
      }
    }
  }

  const result: CategoryTotal[] = [];
  for (const catId of relevantCatIds) {
    const cat = catMap.get(catId);
    if (!cat) continue;
    const { total, count } = totals.get(catId) || { total: 0, count: 0 };
    const limit = getEffectiveBudgetLimit(budgetLimits, catId, period, budgetMode);
    result.push({
      categoryId: catId,
      categoryName: cat.name,
      icon: cat.icon,
      color: cat.color,
      total,
      count,
      budgetLimit: limit,
      percentUsed: limit ? (total / limit) * 100 : undefined,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function getMonthlyTrends(transactions: Transaction[], numMonths = 6) {
  const months: string[] = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }

  return months.map(month => {
    const monthTx = getTransactionsForMonth(transactions, month);
    return {
      month,
      label: format(new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1), 'MMM'),
      income: getTotalIncome(monthTx),
      expenses: getTotalExpenses(monthTx),
    };
  });
}

export function getLargestExpenses(transactions: Transaction[], month: string, limit = 5): Transaction[] {
  return getTransactionsForMonth(transactions, month)
    .filter(t => t.type === 'expense' && t.category !== 'internal-transfer')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Sum effective budget limits for all income-type categories in a period.
 * Returns 0 if no income forecasts are set.
 */
export function getTotalExpectedIncome(
  budgetLimits: BudgetLimit[],
  categories: Category[],
  period: string,
  budgetMode: 'monthly' | 'yearly' = 'monthly'
): number {
  const incomeCategories = categories.filter(c => c.type === 'income');
  let total = 0;
  for (const cat of incomeCategories) {
    const limit = getEffectiveBudgetLimit(budgetLimits, cat.id, period, budgetMode);
    if (limit !== undefined && limit > 0) {
      total += limit;
    }
  }
  return total;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function getFinancialHealthScore(
  transactions: Transaction[],
  categories: Category[],
  budgetLimits: BudgetLimit[],
  period: string,
  budgetMode: 'monthly' | 'yearly' = 'monthly'
): FinancialHealthResult {
  const monthTx = getTransactionsForMonth(transactions, period);
  const income = getTotalIncome(monthTx);
  const expenses = getTotalExpenses(monthTx);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  let savingsRateScore = 45;
  if (savingsRate >= 30) savingsRateScore = 100;
  else if (savingsRate >= 20) savingsRateScore = 85;
  else if (savingsRate >= 10) savingsRateScore = 70;
  else if (savingsRate < 0) savingsRateScore = 20;

  const expenseTotals = getCategoryTotals(transactions, categories, budgetLimits, period, 'expense', budgetMode);
  const withBudget = expenseTotals.filter(c => (c.budgetLimit ?? 0) > 0);
  const budgetAdherence = withBudget.length === 0
    ? 50
    : withBudget.reduce((sum, c) => {
        const limit = c.budgetLimit ?? 0;
        if (limit <= 0) return sum;
        const adherence = c.total <= limit ? 100 : (limit / c.total) * 100;
        return sum + clamp(adherence);
      }, 0) / withBudget.length;
  const budgetAdherenceScore = clamp(budgetAdherence);

  const [year, month] = period.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, 1);
  const debtMonthKeys = [
    format(subMonths(selectedDate, 2), 'yyyy-MM'),
    format(subMonths(selectedDate, 1), 'yyyy-MM'),
    format(selectedDate, 'yyyy-MM'),
  ];
  const debtCategories = new Set(
    categories
      .filter(c => /debt|loan|credit|mortgage|interest|repay/i.test(`${c.id} ${c.name}`))
      .map(c => c.id)
  );
  const debtByMonth = debtMonthKeys.map(m =>
    getTransactionsForMonth(transactions, m)
      .filter(t => t.type === 'expense' && debtCategories.has(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );
  const firstDebt = debtByMonth[0];
  const currentDebt = debtByMonth[2];
  let debtTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  let debtTrendScore = 75;
  if (firstDebt <= 0 && currentDebt <= 0) {
    debtTrendScore = 80;
  } else if (firstDebt <= 0 && currentDebt > 0) {
    debtTrend = 'worsening';
    debtTrendScore = 45;
  } else {
    const changePct = (currentDebt - firstDebt) / firstDebt;
    if (changePct <= -0.2) {
      debtTrend = 'improving';
      debtTrendScore = 95;
    } else if (changePct <= -0.05) {
      debtTrend = 'improving';
      debtTrendScore = 85;
    } else if (changePct < 0.05) {
      debtTrend = 'stable';
      debtTrendScore = 70;
    } else if (changePct < 0.2) {
      debtTrend = 'worsening';
      debtTrendScore = 45;
    } else {
      debtTrend = 'worsening';
      debtTrendScore = 25;
    }
  }

  const avgMonthlyExpense = debtMonthKeys
    .map(m => getTotalExpenses(getTransactionsForMonth(transactions, m)))
    .filter(v => v > 0);
  const expenseBaseline = avgMonthlyExpense.length > 0
    ? avgMonthlyExpense.reduce((a, b) => a + b, 0) / avgMonthlyExpense.length
    : 0;
  const availableCash = getBalance(transactions);
  const cashBufferMonths = expenseBaseline > 0 ? availableCash / expenseBaseline : 0;
  let cashBufferScore = 35;
  if (cashBufferMonths >= 6) cashBufferScore = 100;
  else if (cashBufferMonths >= 3) cashBufferScore = 85;
  else if (cashBufferMonths >= 1) cashBufferScore = 65;
  else if (cashBufferMonths < 0) cashBufferScore = 10;

  const score = Math.round(
    savingsRateScore * 0.35 +
    budgetAdherenceScore * 0.25 +
    debtTrendScore * 0.2 +
    cashBufferScore * 0.2
  );

  const label: FinancialHealthResult['label'] =
    score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'At Risk';

  return {
    score,
    label,
    savingsRate,
    budgetAdherence,
    debtTrend,
    cashBufferMonths,
    breakdown: {
      savingsRateScore,
      budgetAdherenceScore,
      debtTrendScore,
      cashBufferScore,
    },
  };
}
