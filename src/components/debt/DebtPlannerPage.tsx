import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import type { DebtAccount } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateDebtPlan, type DebtPayoffStrategy } from '../../utils/debt';
import Modal from '../ui/Modal';

interface DebtFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (account: DebtAccount) => void;
  edit: DebtAccount | null;
}

function DebtForm({ open, onClose, onSave, edit }: DebtFormProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');

  useMemo(() => {
    if (!open) return;
    setName(edit?.name ?? '');
    setBalance(edit ? String(edit.balance) : '');
    setApr(edit ? String(edit.apr) : '');
    setMinimumPayment(edit ? String(edit.minimumPayment) : '');
  }, [open, edit]);

  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBalance = parseFloat(balance);
    const parsedApr = parseFloat(apr);
    const parsedMin = parseFloat(minimumPayment);
    if (!name.trim() || isNaN(parsedBalance) || parsedBalance < 0 || isNaN(parsedApr) || parsedApr < 0 || isNaN(parsedMin) || parsedMin <= 0) {
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: edit?.id ?? uuidv4(),
      name: name.trim(),
      balance: parsedBalance,
      apr: parsedApr,
      minimumPayment: parsedMin,
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Debt Account' : 'Add Debt Account'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Account name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Visa Credit Card" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Current balance</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>APR %</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={apr} onChange={e => setApr(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={labelCls}>Minimum monthly payment</label>
          <input className={inputCls} type="number" min="0.01" step="0.01" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} required />
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

export default function DebtPlannerPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DebtAccount | null>(null);
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);

  const accounts = state.debtAccounts ?? [];
  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  const totalDebt = accounts.reduce((sum, d) => sum + d.balance, 0);
  const weightedApr = totalDebt > 0
    ? accounts.reduce((sum, d) => sum + d.balance * d.apr, 0) / totalDebt
    : 0;
  const minPaymentTotal = accounts.reduce((sum, d) => sum + d.minimumPayment, 0);

  const snowball = useMemo(() => calculateDebtPlan(accounts, 'snowball', extraPayment), [accounts, extraPayment]);
  const avalanche = useMemo(() => calculateDebtPlan(accounts, 'avalanche', extraPayment), [accounts, extraPayment]);
  const activePlan = strategy === 'snowball' ? snowball : avalanche;

  const saveAccount = (account: DebtAccount) => {
    if (editing) dispatch({ type: 'UPDATE_DEBT_ACCOUNT', payload: account });
    else dispatch({ type: 'ADD_DEBT_ACCOUNT', payload: account });
    setEditing(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Total debt</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalDebt)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Weighted APR</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{weightedApr.toFixed(2)}%</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Minimum monthly</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(minPaymentTotal)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Debt-free ETA ({strategy})</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{activePlan.monthsToDebtFree} mo</p>
        </div>
      </div>

      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Debt Accounts</h2>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
          >
            Add Debt
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Add debt accounts to run payoff simulations.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">APR {a.apr.toFixed(2)}% · Min {formatCurrency(a.minimumPayment)}</p>
                </div>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(a.balance)}</p>
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onClick={() => dispatch({ type: 'DELETE_DEBT_ACCOUNT', payload: a.id })} className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Strategy</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value as DebtPayoffStrategy)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-sm"
            >
              <option value="avalanche">Avalanche (highest APR first)</option>
              <option value="snowball">Snowball (smallest balance first)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Extra monthly payment</label>
            <input
              type="number"
              min="0"
              step="10"
              value={extraPayment}
              onChange={e => setExtraPayment(Math.max(0, Number(e.target.value) || 0))}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-sm w-44"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">{strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} payoff time</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{activePlan.monthsToDebtFree} months</p>
          </div>
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">Estimated total interest</p>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(activePlan.totalInterestPaid)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-4 mb-5">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">Suggested payoff order</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {activePlan.payoffOrder.length > 0 ? activePlan.payoffOrder.join(' → ') : 'Add debts to compute order.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/40">
                <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Month</th>
                <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Remaining debt</th>
                <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Interest paid (to date)</th>
              </tr>
            </thead>
            <tbody>
              {activePlan.snapshots.filter(s => s.month % 3 === 0 || s.month === 1).slice(0, 30).map(s => (
                <tr key={s.month} className="border-b border-slate-50 dark:border-slate-700/20">
                  <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{s.month}</td>
                  <td className="py-2 px-2 text-right font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(s.remainingTotal)}</td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(s.interestPaidToDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DebtForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveAccount}
        edit={editing}
      />
    </div>
  );
}
