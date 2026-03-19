import { useState, useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { getCurrentMonth, formatCurrency, formatMonth } from '../../utils/formatters';
import { getTransactionsForMonth, getTotalIncome, getTotalExpenses, getBalance, getCategoryTotals, getMonthlyTrends, getEffectiveBudgetLimit, getTotalExpectedIncome } from '../../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, addMonths } from 'date-fns';

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

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const tx of state.transactions) {
      months.add(tx.date.substring(0, 7));
    }
    const current = getCurrentMonth();
    months.add(current);
    return [...months].sort().reverse();
  }, [state.transactions]);

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

  const getEffectiveBudget = (categoryId: string) => {
    if (budgetMode === 'yearly') {
      const yearPeriod = selectedMonth.substring(0, 4);
      const yearlyLimit = getEffectiveBudgetLimit(state.budgetLimits, categoryId, yearPeriod, 'yearly');
      return yearlyLimit ? yearlyLimit / 12 : 0;
    }
    const monthlyLimit = getEffectiveBudgetLimit(state.budgetLimits, categoryId, selectedMonth, 'monthly');
    return monthlyLimit || 0;
  };

  const budgetVsActuals = useMemo(() => {
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
    </div>
  );
}
