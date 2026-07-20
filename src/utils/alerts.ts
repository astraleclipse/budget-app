import { addDays, differenceInCalendarDays, endOfMonth, format, isAfter, parseISO, startOfDay } from 'date-fns';
import type { BudgetState, SavingsGoal } from '../types';
import { getCurrentMonth } from './formatters';
import { getFinancialHealthScore } from './calculations';
import { getUpcomingBills, getProjectedCashflow } from './recurring';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: 'health' | 'cashflow' | 'goals' | 'debt' | 'bills' | 'anomaly';
  createdAt: string;
  actionLabel?: string;
  linkHash?: string;
}

function getUpcomingDebtDueDate(paymentDueDay: number, today: Date): Date {
  const currentMonthEnd = endOfMonth(today).getDate();
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(paymentDueDay, currentMonthEnd));
  if (startOfDay(dueThisMonth) >= startOfDay(today)) return dueThisMonth;

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = endOfMonth(nextMonth).getDate();
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(paymentDueDay, nextMonthEnd));
}

function isGoalBehind(goal: SavingsGoal): boolean {
  if (!goal.targetDate || goal.monthlyContributionTarget <= 0) return false;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsNeeded = Math.ceil(remaining / goal.monthlyContributionTarget);
  const now = new Date();
  const target = parseISO(goal.targetDate);
  if (!isAfter(target, now)) return remaining > 0;
  const monthsLeft = Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()) + 1
  );
  return monthsNeeded > monthsLeft;
}

export function buildSystemAlerts(state: BudgetState): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const now = new Date();
  const today = startOfDay(now);
  const nowStr = format(now, 'yyyy-MM-dd');
  const month = getCurrentMonth();
  const health = getFinancialHealthScore(
    state.transactions,
    state.categories,
    state.budgetLimits,
    month,
    state.settings.budgetMode || 'monthly'
  );

  if (health.score < 55) {
    alerts.push({
      id: 'health-at-risk',
      title: 'Financial health is at risk',
      message: `Current score is ${health.score}/100. Focus on savings rate and budget adherence this month.`,
      severity: 'critical',
      source: 'health',
      createdAt: nowStr,
      actionLabel: 'Review budget categories',
      linkHash: '#budgets',
    });
  } else if (health.score < 70) {
    alerts.push({
      id: 'health-fair',
      title: 'Financial health needs attention',
      message: `Current score is ${health.score}/100. Small changes can move this into the Good range.`,
      severity: 'warning',
      source: 'health',
      createdAt: nowStr,
      actionLabel: 'Check dashboard recommendations',
      linkHash: '#dashboard',
    });
  }

  const cashflow = getProjectedCashflow(state.recurringTransactions ?? [], state.transactions, 30);
  const riskDay = cashflow.find(d => d.balance < 0);
  if (riskDay) {
    alerts.push({
      id: `cashflow-negative-${riskDay.date}`,
      title: 'Projected negative cashflow',
      message: `Your projected running balance drops below zero on ${format(parseISO(riskDay.date), 'MMM d')}.`,
      severity: 'critical',
      source: 'cashflow',
      createdAt: nowStr,
      actionLabel: 'Open cashflow calendar',
      linkHash: '#cashflow',
    });
  }

  const upcomingBills = getUpcomingBills(state.recurringTransactions ?? [], 7);
  const upcomingExpenseBills = upcomingBills.filter(b => b.recurring.type === 'expense');
  if (upcomingExpenseBills.length >= 3) {
    const total = upcomingExpenseBills.reduce((sum, b) => sum + b.recurring.amount, 0);
    alerts.push({
      id: 'bills-heavy-week',
      title: 'Heavy bill week ahead',
      message: `${upcomingExpenseBills.length} expense bills due in the next 7 days (${total.toFixed(2)} total).`,
      severity: 'warning',
      source: 'bills',
      createdAt: nowStr,
      actionLabel: 'Review recurring bills',
      linkHash: '#recurring',
    });
  }

  for (const goal of state.savingsGoals ?? []) {
    if (!isGoalBehind(goal)) continue;
    alerts.push({
      id: `goal-behind-${goal.id}`,
      title: `Goal behind target: ${goal.name}`,
      message: `You're behind pace for this goal's target date. Consider increasing monthly contributions.`,
      severity: 'warning',
      source: 'goals',
      createdAt: nowStr,
      actionLabel: 'Open savings goals',
      linkHash: '#goals',
    });
  }

  const highAprDebts = (state.debtAccounts ?? []).filter(d => d.balance > 0 && d.apr >= 18);
  if (highAprDebts.length > 0) {
    const maxApr = Math.max(...highAprDebts.map(d => d.apr));
    alerts.push({
      id: 'debt-high-apr',
      title: 'High-interest debt detected',
      message: `${highAprDebts.length} debt account(s) are above 18% APR (max ${maxApr.toFixed(1)}%).`,
      severity: 'warning',
      source: 'debt',
      createdAt: nowStr,
      actionLabel: 'Run debt plan',
      linkHash: '#debt',
    });
  }

  const debtDueSoon = (state.debtAccounts ?? [])
    .filter(d => d.balance > 0 && d.paymentDueDay)
    .map(account => {
      const dueDate = getUpcomingDebtDueDate(account.paymentDueDay!, now);
      return { account, dueDate, daysUntil: differenceInCalendarDays(startOfDay(dueDate), today) };
    })
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= 5);

  for (const item of debtDueSoon) {
    alerts.push({
      id: `debt-payment-due-${item.account.id}-${format(item.dueDate, 'yyyy-MM-dd')}`,
      title: `Debt payment due soon: ${item.account.name}`,
      message: `Minimum payment ${item.account.minimumPayment.toFixed(2)} is due on ${format(item.dueDate, 'MMM d')}.`,
      severity: item.daysUntil <= 1 ? 'critical' : 'warning',
      source: 'debt',
      createdAt: nowStr,
      actionLabel: 'Open debt planner',
      linkHash: '#debt',
    });
  }

  const expenseTransactions = state.transactions
    .filter(t => t.type === 'expense' && t.category !== 'internal-transfer')
    .sort((a, b) => b.date.localeCompare(a.date));
  const recentWindowStart = format(addDays(now, -30), 'yyyy-MM-dd');
  const duplicateWindowStart = format(addDays(now, -10), 'yyyy-MM-dd');

  const recentExpenses = expenseTransactions.filter(t => t.date >= recentWindowStart);
  const historicalExpenses = expenseTransactions.filter(t => t.date < recentWindowStart);

  for (const tx of recentExpenses) {
    const normalizedDescription = tx.description.toLowerCase().trim();
    if (!normalizedDescription) continue;
    const history = historicalExpenses.filter(h => h.description.toLowerCase().trim() === normalizedDescription).slice(0, 5);
    if (history.length < 2) continue;
    const average = history.reduce((sum, item) => sum + item.amount, 0) / history.length;
    if (average <= 0) continue;
    if (tx.amount >= average * 1.8 && tx.amount - average >= 20) {
    alerts.push({
      id: `anomaly-large-${tx.id}`,
      title: `Unusually large charge: ${tx.description}`,
      message: `${tx.amount.toFixed(2)} is much higher than your usual ${average.toFixed(2)} average for this merchant.`,
      severity: 'warning',
      source: 'anomaly',
      createdAt: nowStr,
      actionLabel: 'Review transactions',
      linkHash: '#transactions',
    });
    break;
    }
  }

  const duplicateGroups = new Map<string, typeof expenseTransactions>();
  for (const tx of expenseTransactions.filter(t => t.date >= duplicateWindowStart)) {
    const key = `${tx.description.toLowerCase().trim()}::${tx.amount.toFixed(2)}`;
    const existing = duplicateGroups.get(key) || [];
    duplicateGroups.set(key, [...existing, tx]);
  }
  for (const [key, matches] of duplicateGroups.entries()) {
    if (matches.length < 2) continue;
    const [description, amount] = key.split('::');
    alerts.push({
      id: `anomaly-duplicate-${description}-${amount}`,
      title: `Possible duplicate charge: ${matches[0].description}`,
      message: `${matches.length} charges of ${Number(amount).toFixed(2)} appeared in the last 10 days. Double-check they are legitimate.`,
      severity: 'warning',
      source: 'anomaly',
      createdAt: nowStr,
      actionLabel: 'Open transactions',
      linkHash: '#transactions',
    });
    break;
  }

  const dismissed = new Set(state.dismissedAlertIds || []);
  const snoozed = state.snoozedAlerts || {};

  return alerts.filter(alert => {
    if (dismissed.has(alert.id)) return false;
    const until = snoozed[alert.id];
    if (!until) return true;
    return startOfDay(parseISO(until)) <= today;
  });
}

export function getSnoozeDate(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}
