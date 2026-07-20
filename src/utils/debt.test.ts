import { describe, expect, it } from 'vitest';
import { calculateDebtPlan } from './debt';
import { debtAccount } from '../test/fixtures';

describe('debt utils', () => {
  it('returns zeroed plan when no active debt', () => {
    const result = calculateDebtPlan([], 'avalanche', 0);
    expect(result.monthsToDebtFree).toBe(0);
    expect(result.totalInterestPaid).toBe(0);
    expect(result.payoffOrder).toEqual([]);
  });

  it('produces a payoff plan and snapshots', () => {
    const accounts = [
      debtAccount({ id: 'd1', name: 'Card', balance: 1000, apr: 18, minimumPayment: 100 }),
      debtAccount({ id: 'd2', name: 'Loan', balance: 1500, apr: 8, minimumPayment: 120 }),
    ];
    const result = calculateDebtPlan(accounts, 'avalanche', 50);
    expect(result.monthsToDebtFree).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.snapshots.length).toBe(result.monthsToDebtFree);
    expect(result.payoffOrder.length).toBe(2);
    expect(result.snapshots.at(-1)?.remainingTotal ?? 1).toBeLessThanOrEqual(0.05);
  });
});
