import { describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { getNextDueDate, getProjectedCashflow, getUpcomingBills, hasCashflowRisk } from './recurring';
import type { RecurringTransaction } from '../types';
import { tx } from '../test/fixtures';

describe('recurring utils', () => {
  const recurring: RecurringTransaction = {
    id: 'r1',
    name: 'Salary',
    amount: 2000,
    type: 'income',
    category: 'salary',
    frequency: 'monthly',
    startDate: '2026-07-01',
    nextDueDate: '2026-07-20',
    active: true,
    createdAt: '',
    updatedAt: '',
  };

  it('computes next due date by frequency', () => {
    const next = getNextDueDate(new Date('2026-07-01'), 'monthly');
    expect(format(next, 'yyyy-MM-dd')).toBe('2026-08-01');
  });

  it('returns upcoming bills and projected cashflow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T00:00:00.000Z'));
    const bills = getUpcomingBills([recurring], 10);
    expect(bills.length).toBe(1);
    expect(format(bills[0].dueDate, 'yyyy-MM-dd')).toBe('2026-07-20');

    const cashflow = getProjectedCashflow(
      [recurring, { ...recurring, id: 'r2', name: 'Rent', amount: 1200, type: 'expense', category: 'rent' }],
      [tx({ id: 't1', type: 'income', amount: 1000, category: 'salary', date: '2026-07-01' })],
      10
    );
    expect(cashflow.length).toBe(11);
    expect(cashflow.at(-1)?.balance).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('detects cashflow risk windows', () => {
    const risky = hasCashflowRisk([
      { date: '2026-07-01', balance: 100, events: [{ name: 'bill', amount: 500, type: 'expense' }] },
      { date: '2026-07-02', balance: -400, events: [] },
    ], 2);
    expect(risky).toBe(true);
  });
});
