import { addDays, format, isAfter, parseISO, startOfDay } from 'date-fns';
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
  source: 'health' | 'cashflow' | 'goals' | 'debt' | 'bills';
  createdAt: string;
  actionLabel?: string;
  linkHash?: string;
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

  const dismissed = new Set(state.dismissedAlertIds || []);
  const snoozed = state.snoozedAlerts || {};
  const today = startOfDay(now);

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
