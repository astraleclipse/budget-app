import { describe, expect, it, vi } from 'vitest';
import { buildSystemAlerts, getSnoozeDate } from './alerts';
import { budgetLimit, budgetState, debtAccount, tx } from '../test/fixtures';

describe('alerts utils', () => {
  it('generates debt due and anomaly alerts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    const state = budgetState({
      transactions: [
        tx({ id: 'h1', type: 'expense', amount: 40, category: 'groceries', description: 'Shop X', date: '2026-05-20' }),
        tx({ id: 'h2', type: 'expense', amount: 45, category: 'groceries', description: 'Shop X', date: '2026-05-25' }),
        tx({ id: 'n1', type: 'expense', amount: 120, category: 'groceries', description: 'Shop X', date: '2026-07-20' }),
        tx({ id: 'd1', type: 'expense', amount: 30, category: 'dining', description: 'Cafe', date: '2026-07-18' }),
        tx({ id: 'd2', type: 'expense', amount: 30, category: 'dining', description: 'Cafe', date: '2026-07-19' }),
      ],
      budgetLimits: [budgetLimit('salary', '2026-07', 4000)],
      debtAccounts: [debtAccount({ id: 'debt1', name: 'Visa', balance: 5000, apr: 20, minimumPayment: 150, paymentDueDay: 23 })],
    });

    const alerts = buildSystemAlerts(state);
    expect(alerts.some(a => a.id.startsWith('debt-payment-due-'))).toBe(true);
    expect(alerts.some(a => a.id.startsWith('anomaly-large-'))).toBe(true);
    expect(alerts.some(a => a.id.startsWith('anomaly-duplicate-'))).toBe(true);
    vi.useRealTimers();
  });

  it('respects dismissed and snoozed alerts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    const base = budgetState({
      debtAccounts: [debtAccount({ id: 'debt1', name: 'Visa', balance: 2000, apr: 20, minimumPayment: 80, paymentDueDay: 22 })],
    });
    const generated = buildSystemAlerts(base);
    const dueAlert = generated.find(a => a.id.startsWith('debt-payment-due-'));
    expect(dueAlert).toBeTruthy();

    const filtered = buildSystemAlerts({
      ...base,
      dismissedAlertIds: dueAlert ? [dueAlert.id] : [],
      snoozedAlerts: dueAlert ? { [dueAlert.id]: getSnoozeDate(3) } : {},
    });
    expect(dueAlert ? filtered.some(a => a.id === dueAlert.id) : true).toBe(false);
    vi.useRealTimers();
  });
});
