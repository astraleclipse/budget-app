import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency } from '../../utils/formatters';
import {
  getUpcomingBills,
  getProjectedCashflow,
  hasCashflowRisk,
  frequencyLabel,
  getNextDueDate,
} from '../../utils/recurring';
import Modal from '../ui/Modal';
import type { RecurringTransaction, RecurringFrequency, TransactionType } from '../../types';

const FREQUENCIES: RecurringFrequency[] = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'];

// ── Form modal ──────────────────────────────────────────────────────────────

interface RecurringFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (r: RecurringTransaction) => void;
  edit: RecurringTransaction | null;
  categories: { id: string; name: string; icon: string; type: string }[];
}

function RecurringForm({ open, onClose, onSave, edit, categories }: RecurringFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState(edit?.name ?? '');
  const [amount, setAmount] = useState(edit ? String(edit.amount) : '');
  const [type, setType] = useState<TransactionType>(edit?.type ?? 'expense');
  const [category, setCategory] = useState(edit?.category ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(edit?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(edit?.startDate ?? today);
  const [notes, setNotes] = useState(edit?.notes ?? '');

  // Reset when modal opens/closes
  useMemo(() => {
    if (open) {
      setName(edit?.name ?? '');
      setAmount(edit ? String(edit.amount) : '');
      setType(edit?.type ?? 'expense');
      setCategory(edit?.category ?? '');
      setFrequency(edit?.frequency ?? 'monthly');
      setStartDate(edit?.startDate ?? today);
      setNotes(edit?.notes ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit]);

  const filteredCats = categories.filter(
    c => c.type === type || c.type === 'both' || (type === 'transfer' && c.id === 'internal-transfer')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || !category || !name.trim()) return;
    const now = new Date().toISOString();
    const nextDueDate = format(parseISO(startDate), 'yyyy-MM-dd');
    onSave({
      id: edit?.id ?? uuidv4(),
      name: name.trim(),
      amount: parsed,
      type,
      category,
      frequency,
      startDate,
      nextDueDate: edit?.nextDueDate ?? nextDueDate,
      active: edit?.active ?? true,
      notes: notes.trim() || undefined,
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                type === t
                  ? t === 'expense'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-500/30'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <div>
          <label className={labelCls}>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rent, Netflix" required className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Amount</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} required className={inputCls}>
            <option value="">Select category…</option>
            {filteredCats.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringFrequency)} className={inputCls}>
              {FREQUENCIES.map(f => (
                <option key={f} value={f}>{frequencyLabel(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes…" className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25">
            {edit ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [showCashflow, setShowCashflow] = useState(false);

  const recurringList = state.recurringTransactions ?? [];
  const catMap = new Map(state.categories.map(c => [c.id, c]));

  const upcomingBills = useMemo(() => getUpcomingBills(recurringList, 60), [recurringList]);
  const cashflow = useMemo(() => getProjectedCashflow(recurringList, state.transactions, 90), [recurringList, state.transactions]);
  const riskDetected = useMemo(() => hasCashflowRisk(cashflow), [cashflow]);

  // Group upcoming bills by date
  const billsByDate = useMemo(() => {
    const map = new Map<string, typeof upcomingBills>();
    for (const bill of upcomingBills) {
      const key = format(bill.dueDate, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bill);
    }
    return map;
  }, [upcomingBills]);

  const handleSave = (r: RecurringTransaction) => {
    if (editItem) {
      dispatch({ type: 'UPDATE_RECURRING', payload: r });
    } else {
      dispatch({ type: 'ADD_RECURRING', payload: r });
    }
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_RECURRING', payload: id });
  };

  const handleToggleActive = (r: RecurringTransaction) => {
    const now = new Date().toISOString();
    dispatch({ type: 'UPDATE_RECURRING', payload: { ...r, active: !r.active, updatedAt: now } });
  };

  const handleMarkPaid = (r: RecurringTransaction) => {
    const now = new Date().toISOString();
    const nextDueDate = format(getNextDueDate(parseISO(r.nextDueDate), r.frequency), 'yyyy-MM-dd');
    dispatch({ type: 'UPDATE_RECURRING', payload: { ...r, nextDueDate, updatedAt: now } });
  };

  const cardCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8';

  return (
    <div className="space-y-8">
      {/* Cashflow risk banner */}
      {riskDetected && recurringList.some(r => r.active) && (
        <div className="flex items-start gap-3 px-6 py-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold">Cashflow Risk Detected</p>
            <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">A 14-day window in the next 90 days has projected expenses exceeding income from your recurring transactions.</p>
          </div>
        </div>
      )}

      {/* Recurring list */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recurring Transactions</h2>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Recurring
          </button>
        </div>

        {recurringList.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No recurring transactions yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add bills, subscriptions, or regular income</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recurringList.map(r => {
              const cat = catMap.get(r.category);
              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    r.active
                      ? 'border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20'
                      : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/10 opacity-60'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: (cat?.color ?? '#6b7280') + '22', color: cat?.color ?? '#6b7280' }}
                      >
                        {cat?.icon ?? '💰'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{cat?.name}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.active
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {r.active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  {/* Amount + frequency */}
                  <div className="mb-3">
                    <p className={`text-lg font-bold tabular-nums ${
                      r.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {frequencyLabel(r.frequency)} · Next: {format(parseISO(r.nextDueDate), 'MMM d, yyyy')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/40">
                    <button
                      onClick={() => { setEditItem(r); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleActive(r)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      title={r.active ? 'Pause' : 'Resume'}
                    >
                      {r.active ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleMarkPaid(r)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Mark as paid / advance next due date"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-auto"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming bills calendar — next 60 days */}
      {recurringList.some(r => r.active) && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Upcoming Bills — Next 60 Days</h2>
            <button
              onClick={() => setShowCashflow(c => !c)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showCashflow ? 'Hide' : 'Show'} cashflow projection
            </button>
          </div>

          {upcomingBills.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No upcoming bills in the next 60 days</p>
          ) : (
            <div className="space-y-4">
              {[...billsByDate.entries()].map(([dateKey, bills]) => {
                const dayIncome = bills.filter(b => b.recurring.type === 'income').reduce((s, b) => s + b.recurring.amount, 0);
                const dayExpense = bills.filter(b => b.recurring.type === 'expense').reduce((s, b) => s + b.recurring.amount, 0);
                return (
                  <div key={dateKey}>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {format(parseISO(dateKey), 'EEE, MMM d')}
                      </p>
                      {dayIncome > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(dayIncome)}</span>
                      )}
                      {dayExpense > 0 && (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(dayExpense)}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {bills.map(({ recurring: r }) => {
                        const cat = catMap.get(r.category);
                        return (
                          <div
                            key={r.id + dateKey}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                              r.type === 'income'
                                ? 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5'
                                : 'border-rose-100 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                              style={{ backgroundColor: (cat?.color ?? '#6b7280') + '22', color: cat?.color ?? '#6b7280' }}
                            >
                              {cat?.icon ?? '💰'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{r.name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">{cat?.name} · {frequencyLabel(r.frequency)}</p>
                            </div>
                            <p className={`text-sm font-semibold tabular-nums ${
                              r.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cashflow projection table */}
          {showCashflow && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/40">
              <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Projected Balance (next 90 days)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/40">
                      <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Date</th>
                      <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Projected Balance</th>
                      <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.filter(d => d.events.length > 0).map(d => (
                      <tr key={d.date} className="border-b border-slate-50 dark:border-slate-700/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{format(parseISO(d.date), 'MMM d')}</td>
                        <td className={`py-2 px-3 text-right font-semibold tabular-nums ${d.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(d.balance)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {d.events.map((ev, i) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                ev.type === 'income'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              }`}>
                                {ev.name} {ev.type === 'income' ? '+' : '-'}{formatCurrency(ev.amount)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <RecurringForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSave}
        edit={editItem}
        categories={state.categories}
      />
    </div>
  );
}
