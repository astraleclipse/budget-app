import { useMemo, useState } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency } from '../../utils/formatters';
import { getProjectedCashflow } from '../../utils/recurring';

type Horizon = 30 | 60 | 90;

export default function CashflowCalendarPage() {
  const { state } = useBudget();
  const [horizon, setHorizon] = useState<Horizon>(60);

  const futureManualTransactions = useMemo(() => {
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    return state.transactions
      .filter(t => t.date > today && t.category !== 'internal-transfer')
      .map(t => ({
        date: t.date,
        amount: t.type === 'income' ? t.amount : -t.amount,
        label: t.description || 'Planned transaction',
        type: t.type,
      }));
  }, [state.transactions]);

  const recurringProjection = useMemo(
    () => getProjectedCashflow(state.recurringTransactions ?? [], state.transactions, horizon),
    [state.recurringTransactions, state.transactions, horizon]
  );

  const cashflowRows = useMemo(() => {
    const byDate = new Map<string, { amount: number; label: string; type: 'income' | 'expense' | 'transfer' }[]>();
    for (const tx of futureManualTransactions) {
      if (!byDate.has(tx.date)) byDate.set(tx.date, []);
      byDate.get(tx.date)!.push({
        amount: tx.amount,
        label: tx.label,
        type: tx.type,
      });
    }

    return recurringProjection.map((day, index) => {
      const manualEvents = byDate.get(day.date) || [];
      const manualNet = manualEvents.reduce((sum, e) => sum + e.amount, 0);
      const adjustedBalance = day.balance + manualNet;
      const previousAdjusted = index === 0
        ? recurringProjection[0].balance
        : recurringProjection[index - 1].balance + ((byDate.get(recurringProjection[index - 1].date) || []).reduce((sum, e) => sum + e.amount, 0));
      return {
        date: day.date,
        balance: adjustedBalance,
        delta: adjustedBalance - previousAdjusted,
        events: [
          ...day.events.map(e => ({
            label: e.name,
            amount: e.type === 'income' ? e.amount : -e.amount,
            type: e.type,
            source: 'recurring' as const,
          })),
          ...manualEvents.map(e => ({
            label: e.label,
            amount: e.amount,
            type: e.type,
            source: 'manual' as const,
          })),
        ],
      };
    });
  }, [futureManualTransactions, recurringProjection]);

  const groupedWeeks = useMemo(() => {
    const groups: { label: string; rows: typeof cashflowRows }[] = [];
    let currentLabel = '';
    let currentRows: typeof cashflowRows = [];
    for (const row of cashflowRows) {
      const date = parseISO(row.date);
      const label = `Week of ${format(date, 'MMM d')}`;
      if (label !== currentLabel) {
        if (currentRows.length > 0) groups.push({ label: currentLabel, rows: currentRows });
        currentLabel = label;
        currentRows = [];
      }
      currentRows.push(row);
    }
    if (currentRows.length > 0) groups.push({ label: currentLabel, rows: currentRows });
    return groups;
  }, [cashflowRows]);

  const minBalance = cashflowRows.length ? Math.min(...cashflowRows.map(r => r.balance)) : 0;
  const riskDate = cashflowRows.find(r => r.balance < 0)?.date;

  const cardCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Cashflow Calendar</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Daily running balance with recurring bills and future planned transactions.</p>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => setHorizon(days as Horizon)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                horizon === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cardCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Lowest projected balance</p>
          <p className={`text-2xl font-bold mt-1 ${minBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(minBalance)}
          </p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Risk date</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{riskDate ? format(parseISO(riskDate), 'MMM d') : 'None'}</p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Projected end balance</p>
          <p className={`text-2xl font-bold mt-1 ${cashflowRows.length && cashflowRows[cashflowRows.length - 1].balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {cashflowRows.length ? formatCurrency(cashflowRows[cashflowRows.length - 1].balance) : formatCurrency(0)}
          </p>
        </div>
      </div>

      {riskDate && (
        <div className="flex items-start gap-3 px-6 py-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold">Projected cashflow dip below zero</p>
            <p className="text-xs mt-0.5">Current projection falls negative on {format(parseISO(riskDate), 'MMM d, yyyy')}. Review recurring expenses or move payments.</p>
          </div>
        </div>
      )}

      <div className={cardCls}>
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-6">Daily Timeline</h3>
        <div className="space-y-5">
          {groupedWeeks.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{group.label}</p>
              <div className="space-y-1.5">
                {group.rows.map(row => (
                  <div key={row.date} className="rounded-xl border border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-900/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{format(parseISO(row.date), 'EEE, MMM d')}</p>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${row.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(row.balance)}
                        </p>
                        <p className={`text-[11px] ${row.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {row.delta >= 0 ? '+' : ''}{formatCurrency(row.delta)}
                        </p>
                      </div>
                    </div>
                    {row.events.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {row.events.map((event, idx) => (
                          <span
                            key={`${row.date}-${event.label}-${idx}`}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                              event.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {event.source === 'manual' ? 'Manual' : 'Recurring'} · {event.label} {event.amount >= 0 ? '+' : ''}{formatCurrency(event.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groupedWeeks.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No projected activity yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
