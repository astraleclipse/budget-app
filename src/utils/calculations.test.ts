import { describe, expect, it } from 'vitest';
import { budgetLimit, getCategories, tx } from '../test/fixtures';
import {
  getBalance,
  getCategoryTotals,
  getEffectiveBudgetLimit,
  getFinancialHealthScore,
  getLargestExpenses,
  getMonthlyTrends,
  getTotalExpectedIncome,
  getTotalExpenses,
  getTotalIncome,
  getTransactionsForMonth,
} from './calculations';

describe('calculations utils', () => {
  const categories = getCategories();
  const transactions = [
    tx({ id: 'i1', type: 'income', amount: 5000, category: 'salary', description: 'Salary', date: '2026-07-01' }),
    tx({ id: 'e1', type: 'expense', amount: 1000, category: 'rent', description: 'Rent', date: '2026-07-02' }),
    tx({ id: 'e2', type: 'expense', amount: 400, category: 'groceries', description: 'Groceries', date: '2026-07-03' }),
    tx({ id: 'e3', type: 'expense', amount: 300, category: 'dining', description: 'Dining', date: '2026-07-04' }),
    tx({ id: 'x1', type: 'transfer', amount: 200, category: 'internal-transfer', description: 'Transfer', date: '2026-07-05' }),
  ];
  const budgetLimits = [
    budgetLimit('rent', '2026-07', 1200),
    budgetLimit('groceries', '2026-07', 500),
    budgetLimit('salary', '2026-07', 5200),
  ];

  it('calculates core totals and filters month transactions', () => {
    const monthTx = getTransactionsForMonth(transactions, '2026-07');
    expect(monthTx.length).toBe(5);
    expect(getTotalIncome(monthTx)).toBe(5000);
    expect(getTotalExpenses(monthTx)).toBe(1700);
    expect(getBalance(monthTx)).toBe(3300);
  });

  it('resolves effective budget limits and totals', () => {
    expect(getEffectiveBudgetLimit(budgetLimits, 'rent', '2026-07')).toBe(1200);
    expect(getTotalExpectedIncome(budgetLimits, categories, '2026-07')).toBe(5200);
    const totals = getCategoryTotals(transactions, categories, budgetLimits, '2026-07', 'expense');
    expect(totals.some(t => t.categoryId === 'rent')).toBe(true);
    expect(totals.find(t => t.categoryId === 'rent')?.percentUsed).toBeCloseTo(83.3333, 2);
  });

  it('builds trends and largest expense lists', () => {
    const trends = getMonthlyTrends(transactions, 2);
    expect(trends.length).toBe(2);
    const largest = getLargestExpenses(transactions, '2026-07', 2);
    expect(largest[0].amount).toBe(1000);
    expect(largest).toHaveLength(2);
  });

  it('computes financial health score result', () => {
    const health = getFinancialHealthScore(transactions, categories, budgetLimits, '2026-07');
    expect(health.score).toBeGreaterThan(0);
    expect(['Excellent', 'Good', 'Fair', 'At Risk']).toContain(health.label);
    expect(health.breakdown.savingsRateScore).toBeGreaterThan(0);
  });
});
