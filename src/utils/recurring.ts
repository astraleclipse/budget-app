import { addWeeks, addMonths, addQuarters, addYears, startOfDay, format, parseISO, eachDayOfInterval } from 'date-fns';
import type { RecurringTransaction, RecurringFrequency, Transaction, TransactionType } from '../types';

export function getNextDueDate(fromDate: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case 'weekly':      return addWeeks(fromDate, 1);
    case 'fortnightly': return addWeeks(fromDate, 2);
    case 'monthly':     return addMonths(fromDate, 1);
    case 'quarterly':   return addQuarters(fromDate, 1);
    case 'yearly':      return addYears(fromDate, 1);
  }
}

export function getUpcomingOccurrences(
  recurring: RecurringTransaction,
  fromDate: Date,
  toDate: Date,
): Date[] {
  const results: Date[] = [];
  let current = startOfDay(parseISO(recurring.nextDueDate));
  const end = startOfDay(toDate);
  const start = startOfDay(fromDate);

  // If first occurrence is already past fromDate, find the first one >= fromDate
  while (current < start) {
    current = getNextDueDate(current, recurring.frequency);
  }

  while (current <= end) {
    results.push(current);
    current = getNextDueDate(current, recurring.frequency);
  }

  return results;
}

export function getUpcomingBills(
  recurringList: RecurringTransaction[],
  days: number,
): { recurring: RecurringTransaction; dueDate: Date }[] {
  const today = startOfDay(new Date());
  const toDate = addDays(today, days);
  const result: { recurring: RecurringTransaction; dueDate: Date }[] = [];

  for (const r of recurringList) {
    if (!r.active) continue;
    const occurrences = getUpcomingOccurrences(r, today, toDate);
    for (const dueDate of occurrences) {
      result.push({ recurring: r, dueDate });
    }
  }

  result.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return result;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export interface CashflowDay {
  date: string;
  balance: number;
  events: { name: string; amount: number; type: TransactionType }[];
}

export function getProjectedCashflow(
  recurringList: RecurringTransaction[],
  transactions: Transaction[],
  days: number,
): CashflowDay[] {
  // Start balance = sum of all actual transactions to date
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  let runningBalance = 0;
  for (const tx of transactions) {
    if (tx.date <= todayStr) {
      if (tx.type === 'income') runningBalance += tx.amount;
      else if (tx.type === 'expense') runningBalance -= tx.amount;
    }
  }

  const toDate = addDays(today, days);
  const upcoming = getUpcomingBills(recurringList, days);

  // Group upcoming by date
  const byDate = new Map<string, { name: string; amount: number; type: TransactionType }[]>();
  for (const { recurring, dueDate } of upcoming) {
    const key = format(dueDate, 'yyyy-MM-dd');
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push({ name: recurring.name, amount: recurring.amount, type: recurring.type });
  }

  const result: CashflowDay[] = [];
  const allDays = eachDayOfInterval({ start: today, end: toDate });

  for (const day of allDays) {
    const key = format(day, 'yyyy-MM-dd');
    const events = byDate.get(key) || [];
    for (const ev of events) {
      if (ev.type === 'income') runningBalance += ev.amount;
      else if (ev.type === 'expense') runningBalance -= ev.amount;
    }
    result.push({ date: key, balance: runningBalance, events });
  }

  return result;
}

export function hasCashflowRisk(cashflow: CashflowDay[], windowDays = 14): boolean {
  for (let i = 0; i <= cashflow.length - windowDays; i++) {
    const window = cashflow.slice(i, i + windowDays);
    let netInWindow = 0;
    for (const day of window) {
      for (const ev of day.events) {
        if (ev.type === 'income') netInWindow += ev.amount;
        else if (ev.type === 'expense') netInWindow -= ev.amount;
      }
    }
    if (netInWindow < 0) return true;
  }
  return false;
}

export function frequencyLabel(frequency: RecurringFrequency): string {
  const labels: Record<RecurringFrequency, string> = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return labels[frequency];
}
