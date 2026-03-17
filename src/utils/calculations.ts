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
