import { useMemo, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency, formatMonth, getCurrentMonth } from '../../utils/formatters';
import { getTotalExpectedIncome, getTransactionsForMonth, getTotalIncome } from '../../utils/calculations';
import type { RecurringTransaction, RecurringFrequency } from '../../types';

function monthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  if (frequency === 'weekly') return amount * 52 / 12;
  if (frequency === 'fortnightly') return amount * 26 / 12;
  if (frequency === 'monthly') return amount;
  if (frequency === 'quarterly') return amount / 3;
  return amount / 12;
}

function monthlyRecurringIncome(recurringTransactions: RecurringTransaction[]): number {
  return recurringTransactions
    .filter(item => item.active && item.type === 'income')
    .reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.frequency), 0);
}

export default function IncomeForecastPage() {
  const { state } = useBudget();
  const [monthsAhead, setMonthsAhead] = useState(6);

  const budgetMode = state.settings.budgetMode || 'monthly';
  const recurringBaseline = useMemo(
    () => monthlyRecurringIncome(state.recurringTransactions ?? []),
    [state.recurringTransactions]
  );

  const recentIncomeAverage = useMemo(() => {
    const months = Array.from({ length: 3 }, (_, index) => format(addMonths(new Date(), -index), 'yyyy-MM'));
    const totals = months
      .map(month => getTotalIncome(getTransactionsForMonth(state.transactions, month)))
      .filter(total => total > 0);
    return totals.length > 0 ? totals.reduce((sum, total) => sum + total, 0) / totals.length : 0;
  }, [state.transactions]);

  const forecastRows = useMemo(() => {
    return Array.from({ length: monthsAhead }, (_, index) => {
      const month = format(addMonths(new Date(), index), 'yyyy-MM');
      const budgeted = getTotalExpectedIncome(state.budgetLimits, state.categories, month, budgetMode);
      const fallback = budgeted > 0 ? budgeted : recurringBaseline > 0 ? recurringBaseline : recentIncomeAverage;
      const stretch = Math.max(fallback, recurringBaseline, recentIncomeAverage);

      return {
        month,
        budgeted,
        recurring: recurringBaseline,
        baseline: fallback,
        stretch,
        source: budgeted > 0 ? 'Budgeted income' : recurringBaseline > 0 ? 'Recurring income' : 'Recent average',
      };
    });
  }, [monthsAhead, state.budgetLimits, state.categories, budgetMode, recurringBaseline, recentIncomeAverage]);

  const totalBaseline = forecastRows.reduce((sum, row) => sum + row.baseline, 0);
  const totalStretch = forecastRows.reduce((sum, row) => sum + row.stretch, 0);
  const highestMonth = forecastRows.reduce((best, row) => row.baseline > best.baseline ? row : best, forecastRows[0] ?? {
    month: getCurrentMonth(),
    baseline: 0,
    stretch: 0,
    source: 'None',
    budgeted: 0,
    recurring: 0,
  });

  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  return (
    <div className="space-y-8">
      <div className={sectionCls}>
        <div className="flex flex-wrap items-end gap-4 justify-between mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Income Forecast</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Project income from budgeted pay, recurring income, and recent actuals.</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Forecast horizon</label>
            <select
              value={monthsAhead}
              onChange={e => setMonthsAhead(Number(e.target.value))}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-sm"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={9}>9 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">Recurring monthly baseline</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(recurringBaseline)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">Recent average income</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(recentIncomeAverage)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">Baseline total</p>
            <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalBaseline)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">Best baseline month</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatMonth(highestMonth.month)}</p>
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/40">
                <th className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Month</th>
                <th className="text-right py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Budgeted</th>
                <th className="text-right py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Recurring</th>
                <th className="text-right py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Baseline forecast</th>
                <th className="text-right py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Stretch forecast</th>
                <th className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">Primary source</th>
              </tr>
            </thead>
            <tbody>
              {forecastRows.map(row => (
                <tr key={row.month} className="border-b border-slate-50 dark:border-slate-700/20">
                  <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{formatMonth(row.month)}</td>
                  <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.budgeted)}</td>
                  <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.recurring)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.baseline)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(row.stretch)}</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          Baseline uses budgeted income when available, then recurring income, then your recent average. Stretch shows the strongest of those sources for planning upside.
        </p>
      </div>

      <div className={sectionCls}>
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Planning Notes</h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>1. Add expected income budgets in the Budgets tab to make month-by-month forecasts more intentional.</p>
          <p>2. Add recurring pay or benefit items in Bills &amp; Recurring so the baseline stays accurate even when transaction history is light.</p>
          <p>3. Compare baseline total {formatCurrency(totalBaseline)} versus stretch total {formatCurrency(totalStretch)} when planning debt payoff or savings contributions.</p>
        </div>
      </div>
    </div>
  );
}
