import { useState, useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { getCurrentMonth, formatCurrency, formatMonth } from '../../utils/formatters';
import { getTransactionsForMonth, getTotalIncome, getTotalExpenses, getBalance, getCategoryTotals, getMonthlyTrends, getEffectiveBudgetLimit, getTotalExpectedIncome, getFinancialHealthScore } from '../../utils/calculations';
import { getUpcomingBills, frequencyLabel } from '../../utils/recurring';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, addMonths, subDays, parseISO, isWithinInterval } from 'date-fns';

const SUMMARY_CARDS = [
  {
    label: 'Income',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Expenses',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    iconBg: 'bg-rose-100 dark:bg-rose-500/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    valueColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    label: 'Balance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    iconBg: 'bg-sky-100 dark:bg-sky-500/15',
    iconColor: 'text-sky-600 dark:text-sky-400',
    valueColor: '', // dynamic
  },
  {
    label: 'Savings Rate',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    valueColor: '', // dynamic
    isPercent: true,
  },
];

export default function Dashboard() {
  const { state } = useBudget();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [simIncomePct, setSimIncomePct] = useState(0);
  const [simExpensePct, setSimExpensePct] = useState(0);
  const [simMonths, setSimMonths] = useState(6);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const tx of state.transactions) {
      months.add(tx.date.substring(0, 7));
    }
    // Include months that have budget limits set (e.g. future months from copy-forward)
    for (const bl of state.budgetLimits) {
      if (bl.month.length === 7) months.add(bl.month);
    }
    months.add(getCurrentMonth());
    return [...months].sort().reverse();
  }, [state.transactions, state.budgetLimits]);

  const earliestMonth = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : selectedMonth;
  const latestMonth = availableMonths.length > 0 ? availableMonths[0] : selectedMonth;
  const canGoBack = selectedMonth > earliestMonth;
  const canGoForward = selectedMonth < latestMonth;

  const navigateMonth = (dir: -1 | 1) => {
    if (dir === -1 && !canGoBack) return;
    if (dir === 1 && !canGoForward) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = dir === -1 ? subMonths(new Date(y, m - 1), 1) : addMonths(new Date(y, m - 1), 1);
    setSelectedMonth(format(d, 'yyyy-MM'));
  };

  const monthTx = useMemo(() => getTransactionsForMonth(state.transactions, selectedMonth), [state.transactions, selectedMonth]);
  const income = getTotalIncome(monthTx);
  const expenses = getTotalExpenses(monthTx);
  const balance = getBalance(monthTx);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const budgetMode = state.settings.budgetMode || 'monthly';

  const expectedIncome = useMemo(
    () => getTotalExpectedIncome(state.budgetLimits, state.categories, selectedMonth, budgetMode),
    [state.budgetLimits, state.categories, selectedMonth, budgetMode]
  );

  // Total expense budgets for projected balance
  const totalExpenseBudgets = useMemo(() => {
    const expenseCats = state.categories.filter(c => c.type === 'expense');
    let total = 0;
    for (const cat of expenseCats) {
      if (budgetMode === 'yearly') {
        const yearPeriod = selectedMonth.substring(0, 4);
        const limit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, yearPeriod, 'yearly');
        if (limit) total += limit / 12;
      } else {
        const limit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, selectedMonth, 'monthly');
        if (limit) total += limit;
      }
    }
    return total;
  }, [state.categories, state.budgetLimits, selectedMonth, budgetMode]);

  const projectedBalance = expectedIncome > 0 ? expectedIncome - totalExpenseBudgets : 0;

  const categoryTotals = useMemo(
    () => getCategoryTotals(state.transactions, state.categories, state.budgetLimits, selectedMonth, 'expense', budgetMode),
    [state.transactions, state.categories, state.budgetLimits, selectedMonth, budgetMode]
  );

  const financialHealth = useMemo(
    () => getFinancialHealthScore(state.transactions, state.categories, state.budgetLimits, selectedMonth, budgetMode),
    [state.transactions, state.categories, state.budgetLimits, selectedMonth, budgetMode]
  );

  const budgetVsActuals = useMemo(() => {
    const getEffectiveBudget = (categoryId: string) => {
      if (budgetMode === 'yearly') {
        const yearPeriod = selectedMonth.substring(0, 4);
        const yearlyLimit = getEffectiveBudgetLimit(state.budgetLimits, categoryId, yearPeriod, 'yearly');
        return yearlyLimit ? yearlyLimit / 12 : 0;
      }
      const monthlyLimit = getEffectiveBudgetLimit(state.budgetLimits, categoryId, selectedMonth, 'monthly');
      return monthlyLimit || 0;
    };

    const expenseCats = state.categories.filter(c => c.type === 'expense');
    const data: { name: string; budget: number; actual: number; color: string }[] = [];
    for (const cat of expenseCats) {
      const budgetAmt = getEffectiveBudget(cat.id);
      const total = categoryTotals.find(ct => ct.categoryId === cat.id);
      const actualAmt = total?.total || 0;
      if (budgetAmt > 0 || actualAmt > 0) {
        data.push({ name: cat.name, budget: budgetAmt, actual: actualAmt, color: cat.color });
      }
    }
    return data.sort((a, b) => Math.max(b.budget, b.actual) - Math.max(a.budget, a.actual));
  }, [state.categories, state.budgetLimits, categoryTotals, selectedMonth, budgetMode]);

  const historicalAndProjection = useMemo(() => {
    const trends = getMonthlyTrends(state.transactions, 4);
    const last3Expenses = trends.slice(0, 3).map(t => t.expenses).filter(e => e > 0);
    const last3Income = trends.slice(0, 3).map(t => t.income).filter(i => i > 0);
    const avgExpense = last3Expenses.length > 0 ? last3Expenses.reduce((a, b) => a + b, 0) / last3Expenses.length : 0;
    const avgIncome = last3Income.length > 0 ? last3Income.reduce((a, b) => a + b, 0) / last3Income.length : 0;
    const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM');
    const nextLabel = format(addMonths(new Date(), 1), 'MMM');
    return [
      ...trends.map(t => ({ ...t, projectedIncome: undefined as number | undefined, projectedExpenses: undefined as number | undefined })),
      { month: nextMonth, label: nextLabel + ' (est)', income: 0, expenses: 0, projectedIncome: Math.round(avgIncome), projectedExpenses: Math.round(avgExpense) },
    ];
  }, [state.transactions]);

  const recentTx = useMemo(() => [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [monthTx]);
  const catMap = new Map(state.categories.map(c => [c.id, c]));

  const fortnightlyBrief = useMemo(() => {
    const now = new Date();
    const currentStart = subDays(now, 13);
    const previousEnd = subDays(currentStart, 1);
    const previousStart = subDays(previousEnd, 13);

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const parsed = parseISO(dateStr);
      return isWithinInterval(parsed, { start, end });
    };

    const currentWindow = state.transactions.filter(t => inRange(t.date, currentStart, now));
    const previousWindow = state.transactions.filter(t => inRange(t.date, previousStart, previousEnd));

    const currentIncome = getTotalIncome(currentWindow);
    const currentExpenses = getTotalExpenses(currentWindow);
    const currentNet = currentIncome - currentExpenses;
    const currentSavingsRate = currentIncome > 0 ? (currentNet / currentIncome) * 100 : 0;

    const previousIncome = getTotalIncome(previousWindow);
    const previousExpenses = getTotalExpenses(previousWindow);
    const previousNet = previousIncome - previousExpenses;

    const expenseChangePct = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : 0;
    const netChange = currentNet - previousNet;

    const actions: string[] = [];
    if (currentSavingsRate < 10) actions.push('Reduce discretionary spend this fortnight (dining, entertainment, shopping).');
    if (expenseChangePct > 15) actions.push('Spending is accelerating — set temporary category caps for the next 14 days.');
    if (currentNet < 0) actions.push('You are in a deficit this fortnight — pause non-essential purchases until net is positive.');
    if (actions.length === 0) actions.push('Keep current habits and route surplus to savings goals.');

    return {
      currentIncome,
      currentExpenses,
      currentNet,
      currentSavingsRate,
      expenseChangePct,
      netChange,
      actions: actions.slice(0, 3),
    };
  }, [state.transactions]);

  const whatIfProjection = useMemo(() => {
    // Use the selected month's actual figures as the base.
    // Fall back to trailing 3-month average if the selected month has no data.
    const selectedMonthTx = getTransactionsForMonth(state.transactions, selectedMonth);
    const selectedIncome = getTotalIncome(selectedMonthTx);
    const selectedExpenses = getTotalExpenses(selectedMonthTx);

    let monthlyIncomeBase: number;
    let monthlyExpenseBase: number;

    if (selectedIncome > 0 || selectedExpenses > 0) {
      monthlyIncomeBase = selectedIncome;
      monthlyExpenseBase = selectedExpenses;
    } else {
      // No data for selected month — average last 3 months of available data
      const allMonths = [...new Set(state.transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
      const recentMonths = allMonths.slice(0, 3);
      if (recentMonths.length > 0) {
        const totals = recentMonths.map(m => {
          const tx = getTransactionsForMonth(state.transactions, m);
          return { income: getTotalIncome(tx), expenses: getTotalExpenses(tx) };
        });
        monthlyIncomeBase = totals.reduce((s, m) => s + m.income, 0) / totals.length;
        monthlyExpenseBase = totals.reduce((s, m) => s + m.expenses, 0) / totals.length;
      } else {
        monthlyIncomeBase = 0;
        monthlyExpenseBase = 0;
      }
    }

    const monthlyIncome = monthlyIncomeBase * (1 + simIncomePct / 100);
    const monthlyExpenses = monthlyExpenseBase * (1 + simExpensePct / 100);
    const monthlyNet = monthlyIncome - monthlyExpenses;

    let runningBalance = getBalance(state.transactions);
    const rows: { month: string; income: number; expenses: number; net: number; balance: number }[] = [];
    for (let i = 1; i <= simMonths; i++) {
      const d = addMonths(new Date(), i);
      runningBalance += monthlyNet;
      rows.push({
        month: format(d, 'MMM yyyy'),
        income: monthlyIncome,
        expenses: monthlyExpenses,
        net: monthlyNet,
        balance: runningBalance,
      });
    }

    return { monthlyIncome, monthlyExpenses, monthlyNet, rows };
  }, [state.transactions, selectedMonth, simIncomePct, simExpensePct, simMonths]);

  const merchantInsights = useMemo(() => {
    const now = new Date();
    const currentStart = subDays(now, 59);
    const previousEnd = subDays(currentStart, 1);
    const previousStart = subDays(previousEnd, 59);

    const normalizeMerchant = (raw: string) => {
      const v = raw.trim().toLowerCase();
      if (!v) return 'Unknown';
      return v.replace(/\s+/g, ' ').slice(0, 60);
    };

    const currentMap = new Map<string, number>();
    const previousMap = new Map<string, number>();

    for (const tx of state.transactions) {
      if (tx.type !== 'expense' || tx.category === 'internal-transfer') continue;
      const merchant = normalizeMerchant(tx.description);
      const txDate = parseISO(tx.date);
      if (isWithinInterval(txDate, { start: currentStart, end: now })) {
        currentMap.set(merchant, (currentMap.get(merchant) || 0) + tx.amount);
      } else if (isWithinInterval(txDate, { start: previousStart, end: previousEnd })) {
        previousMap.set(merchant, (previousMap.get(merchant) || 0) + tx.amount);
      }
    }

    return [...currentMap.entries()]
      .map(([merchant, currentAmount]) => {
        const prevAmount = previousMap.get(merchant) || 0;
        const delta = currentAmount - prevAmount;
        const deltaPct = prevAmount > 0 ? (delta / prevAmount) * 100 : 100;
        return { merchant, currentAmount, prevAmount, delta, deltaPct };
      })
      .sort((a, b) => b.currentAmount - a.currentAmount)
      .slice(0, 8);
  }, [state.transactions]);

  const driftAlerts = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(y, m - 1, 1);
    const months = [
      format(subMonths(selectedDate, 2), 'yyyy-MM'),
      format(subMonths(selectedDate, 1), 'yyyy-MM'),
      format(selectedDate, 'yyyy-MM'),
    ];
    const expenseCategories = state.categories.filter(c => c.type === 'expense');

    const alerts: {
      categoryId: string;
      categoryName: string;
      values: number[];
      growthPct: number;
      percentUsed?: number;
    }[] = [];

    for (const cat of expenseCategories) {
      const values = months.map(monthKey =>
        getTransactionsForMonth(state.transactions, monthKey)
          .filter(t => t.type === 'expense' && t.category === cat.id)
          .reduce((sum, t) => sum + t.amount, 0)
      );
      const [v1, v2, v3] = values;
      if (!(v3 > v2 && v2 > v1) || v3 <= 0) continue;
      const growthPct = v1 > 0 ? ((v3 - v1) / v1) * 100 : 100;
      const limit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, selectedMonth, budgetMode);
      const percentUsed = limit && limit > 0 ? (v3 / limit) * 100 : undefined;
      if (growthPct >= 15 || (percentUsed !== undefined && percentUsed >= 70)) {
        alerts.push({
          categoryId: cat.id,
          categoryName: cat.name,
          values,
          growthPct,
          percentUsed,
        });
      }
    }

    return alerts.sort((a, b) => {
      const aScore = (a.percentUsed ?? 0) + a.growthPct;
      const bScore = (b.percentUsed ?? 0) + b.growthPct;
      return bScore - aScore;
    }).slice(0, 6);
  }, [state.categories, state.transactions, state.budgetLimits, selectedMonth, budgetMode]);

  const upcomingBills = useMemo(
    () => getUpcomingBills(state.recurringTransactions ?? [], 7),
    [state.recurringTransactions]
  );

  const values = [income, expenses, balance, savingsRate];

  if (state.transactions.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500 dark:text-slate-400">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-slate-900 dark:text-white">Welcome to Budget Manager</p>
        <p className="mt-3 text-sm max-w-md mx-auto leading-relaxed">
          Start by importing a CSV or adding transactions manually. Head to Import CSV or the Transactions tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateMonth(-1)}
          disabled={!canGoBack}
          className={`p-2 rounded-xl transition-colors ${
            canGoBack
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer'
              : 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-base font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
        >
          {availableMonths.map(m => (
            <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{formatMonth(m)}</option>
          ))}
        </select>
        <button
          onClick={() => navigateMonth(1)}
          disabled={!canGoForward}
          className={`p-2 rounded-xl transition-colors ${
            canGoForward
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer'
              : 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        {selectedMonth !== getCurrentMonth() && (
          <button onClick={() => setSelectedMonth(getCurrentMonth())} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            Go to current
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {SUMMARY_CARDS.map((card, i) => {
          const val = values[i];
          let dynamicColor = card.valueColor;
          if (card.label === 'Balance') dynamicColor = val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
          if (card.label === 'Savings Rate') dynamicColor = val >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

          return (
            <div key={card.label} className="card-hover bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-7">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                <div className={`w-10 h-10 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold tracking-tight ${dynamicColor}`} style={{ fontFamily: 'var(--font-display)' }}>
                {card.isPercent ? `${val.toFixed(1)}%` : formatCurrency(val)}
              </p>
              {card.label === 'Income' && expectedIncome > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  of {formatCurrency(expectedIncome)} expected
                </p>
              )}
              {card.label === 'Balance' && expectedIncome > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  Projected: {formatCurrency(projectedBalance)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Financial health score */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">Financial Health Score</p>
            <div className="flex items-end gap-3 mt-2">
              <p
                className={`text-4xl font-bold ${
                  financialHealth.score >= 85 ? 'text-emerald-600 dark:text-emerald-400'
                  : financialHealth.score >= 70 ? 'text-indigo-600 dark:text-indigo-400'
                  : financialHealth.score >= 55 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {financialHealth.score}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 pb-1">/ 100 · {financialHealth.label}</p>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Built from savings rate, budget adherence, debt trend, and cash buffer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Savings rate</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{financialHealth.breakdown.savingsRateScore.toFixed(0)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{financialHealth.savingsRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Budget adherence</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{financialHealth.breakdown.budgetAdherenceScore.toFixed(0)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{financialHealth.budgetAdherence.toFixed(0)}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Debt trend</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{financialHealth.breakdown.debtTrendScore.toFixed(0)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{financialHealth.debtTrend}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Cash buffer</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{financialHealth.breakdown.cashBufferScore.toFixed(0)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{financialHealth.cashBufferMonths.toFixed(1)} mo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fortnightly brief + merchant insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-6">Fortnightly Money Brief</h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Income (14d)</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(fortnightlyBrief.currentIncome)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Expenses (14d)</p>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(fortnightlyBrief.currentExpenses)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Net</p>
              <p className={`text-sm font-semibold ${fortnightlyBrief.currentNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(fortnightlyBrief.currentNet)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Savings rate</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{fortnightlyBrief.currentSavingsRate.toFixed(1)}%</p>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expense trend vs previous 14d:
              <span className={`ml-1 font-semibold ${fortnightlyBrief.expenseChangePct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {fortnightlyBrief.expenseChangePct >= 0 ? '+' : ''}{fortnightlyBrief.expenseChangePct.toFixed(1)}%
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Net change vs previous 14d:
              <span className={`ml-1 font-semibold ${fortnightlyBrief.netChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {fortnightlyBrief.netChange >= 0 ? '+' : ''}{formatCurrency(fortnightlyBrief.netChange)}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-4">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Recommended next actions</p>
            <ul className="space-y-1.5">
              {fortnightlyBrief.actions.map(action => (
                <li key={action} className="text-xs text-slate-600 dark:text-slate-300">• {action}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-6">Merchant Insights (Last 60 Days)</h3>
          {merchantInsights.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Not enough merchant data yet.</p>
          ) : (
            <div className="space-y-2">
              {merchantInsights.map(item => (
                <div key={item.merchant} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{item.merchant}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Prev 60d: {formatCurrency(item.prevAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(item.currentAmount)}</p>
                    <p className={`text-[11px] font-medium ${item.delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {item.delta >= 0 ? '+' : ''}{item.deltaPct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actuals */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-8">
            Budget vs Actual Spending
            {budgetMode === 'yearly' && (
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">(yearly / 12)</span>
            )}
          </h3>
          {budgetVsActuals.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={budgetVsActuals} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill="#a5b4fc" radius={[0, 6, 6, 0]} barSize={12} />
                <Bar dataKey="actual" name="Actual" fill="#f97316" radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <p className="text-sm">Set budget limits in the Budgets tab to see the comparison</p>
            </div>
          )}
        </div>

        {/* History + Projection */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-8">Monthly History &amp; Projection</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={historicalAndProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#fb7185" radius={[6, 6, 0, 0]} />
              <Bar dataKey="projectedIncome" name="Est. Income" fill="#a7f3d0" radius={[6, 6, 0, 0]} />
              <Bar dataKey="projectedExpenses" name="Est. Expenses" fill="#fecdd3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* What-if simulator + budget drift detector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Forecast What-If Simulator</h3>
            {(simIncomePct !== 0 || simExpensePct !== 0) && (
              <button
                onClick={() => { setSimIncomePct(0); setSimExpensePct(0); }}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Reset sliders to zero"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400">Income adjustment</label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{simIncomePct >= 0 ? '+' : ''}{simIncomePct}%</span>
              </div>
              <input type="range" min={-40} max={40} value={simIncomePct} onChange={e => setSimIncomePct(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400">Expense adjustment</label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{simExpensePct >= 0 ? '+' : ''}{simExpensePct}%</span>
              </div>
              <input type="range" min={-40} max={40} value={simExpensePct} onChange={e => setSimExpensePct(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500 dark:text-slate-400">Projection horizon</label>
              <select
                value={simMonths}
                onChange={e => setSimMonths(Number(e.target.value))}
                className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5"
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={9}>9 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/20 p-3">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Est. monthly income</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(whatIfProjection.monthlyIncome)}</p>
            </div>
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/20 p-3">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Est. monthly expenses</p>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(whatIfProjection.monthlyExpenses)}</p>
            </div>
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/20 p-3">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Est. monthly net</p>
              <p className={`text-xs font-semibold ${whatIfProjection.monthlyNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(whatIfProjection.monthlyNet)}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/40">
                  <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Month</th>
                  <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Net</th>
                  <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Projected Balance</th>
                </tr>
              </thead>
              <tbody>
                {whatIfProjection.rows.map(row => (
                  <tr key={row.month} className="border-b border-slate-50 dark:border-slate-700/20">
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.month}</td>
                    <td className={`py-2 px-2 text-right font-medium ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(row.net)}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${row.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-6">Budget Drift Detector</h3>
          {driftAlerts.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              No strong upward drift detected in expense categories for the last 3 months.
            </p>
          ) : (
            <div className="space-y-2.5">
              {driftAlerts.map(alert => (
                <div key={alert.categoryId} className="rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.categoryName}</p>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      +{alert.growthPct.toFixed(0)}% vs 2 months ago
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {format(subMonths(new Date(selectedMonth + '-01'), 2), 'MMM')}: {formatCurrency(alert.values[0])}
                    {' · '}
                    {format(subMonths(new Date(selectedMonth + '-01'), 1), 'MMM')}: {formatCurrency(alert.values[1])}
                    {' · '}
                    {format(new Date(selectedMonth + '-01'), 'MMM')}: {formatCurrency(alert.values[2])}
                  </p>
                  {alert.percentUsed !== undefined && (
                    <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                      Current month budget usage: <span className="font-semibold">{alert.percentUsed.toFixed(0)}%</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-8">
          Recent Transactions &mdash; {formatMonth(selectedMonth)}
        </h3>
        {recentTx.length > 0 ? (
          <div className="space-y-1">
            {recentTx.map(tx => {
              const cat = catMap.get(tx.category);
              const initial = (tx.description || cat?.name || 'T').charAt(0).toUpperCase();
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  {/* Avatar with category color */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: (cat?.color || '#6b7280') + '18', color: cat?.color || '#6b7280' }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{tx.description || cat?.name}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat?.color || '#6b7280' }}
                      />
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{cat?.name}</p>
                    </div>
                  </div>
                  <p className={`text-[13px] font-semibold tabular-nums ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400'
                    : tx.type === 'transfer' ? 'text-slate-400 dark:text-slate-500'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">No transactions for this month</p>
        )}
      </div>

      {/* Upcoming bills widget */}
      {upcomingBills.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Upcoming Bills — Next 7 Days</h3>
            <a href="#recurring" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {upcomingBills.map(({ recurring: r, dueDate }) => {
              const cat = catMap.get(r.category);
              return (
                <div key={r.id + format(dueDate, 'yyyy-MM-dd')} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: (cat?.color ?? '#6b7280') + '18', color: cat?.color ?? '#6b7280' }}
                  >
                    {cat?.icon ?? '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{format(dueDate, 'EEE, MMM d')} · {frequencyLabel(r.frequency)}</p>
                  </div>
                  <p className={`text-[13px] font-semibold tabular-nums ${r.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
