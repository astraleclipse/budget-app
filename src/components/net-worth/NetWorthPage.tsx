import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import type { AssetAccount, AssetAccountType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { getNetWorth, getTotalAssets, getTotalDebtBalance } from '../../utils/netWorth';
import Modal from '../ui/Modal';

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (account: AssetAccount) => void;
  edit: AssetAccount | null;
}

function AssetForm({ open, onClose, onSave, edit }: AssetFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetAccountType>('cash');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(edit?.name ?? '');
    setType(edit?.type ?? 'cash');
    setValue(edit ? String(edit.value) : '');
    setNotes(edit?.notes ?? '');
  }, [open, edit]);

  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(value);
    if (!name.trim() || isNaN(parsedValue) || parsedValue < 0) return;

    const now = new Date().toISOString();
    onSave({
      id: edit?.id ?? uuidv4(),
      name: name.trim(),
      type,
      value: parsedValue,
      notes: notes.trim() || undefined,
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Asset' : 'Add Asset'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Asset name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Everyday Account" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={e => setType(e.target.value as AssetAccountType)}>
              <option value="cash">Cash</option>
              <option value="investment">Investment</option>
              <option value="property">Property</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Current value</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
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

const TYPE_LABELS: Record<AssetAccountType, string> = {
  cash: 'Cash',
  investment: 'Investment',
  property: 'Property',
  vehicle: 'Vehicle',
  other: 'Other',
};

export default function NetWorthPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AssetAccount | null>(null);

  const assets = state.assetAccounts ?? [];
  const debts = state.debtAccounts ?? [];
  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  const assetTotal = getTotalAssets(assets);
  const debtTotal = getTotalDebtBalance(debts);
  const netWorth = getNetWorth(assets, debts);
  const liquidAssets = assets.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.value, 0);

  const assetMix = useMemo(() => {
    const totals = new Map<AssetAccountType, number>();
    for (const asset of assets) {
      totals.set(asset.type, (totals.get(asset.type) || 0) + asset.value);
    }
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [assets]);

  const saveAsset = (account: AssetAccount) => {
    if (editing) dispatch({ type: 'UPDATE_ASSET_ACCOUNT', payload: account });
    else dispatch({ type: 'ADD_ASSET_ACCOUNT', payload: account });
    setEditing(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Total assets</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(assetTotal)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Debt balances</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(debtTotal)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Net worth</p>
          <p className={`text-2xl font-bold mt-1 ${netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(netWorth)}
          </p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Liquid assets</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(liquidAssets)}</p>
        </div>
      </div>

      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Asset Accounts</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Track the current value of your cash, investments, property, and other assets.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
          >
            Add Asset
          </button>
        </div>

        {assets.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Add at least one asset account to start tracking net worth.</p>
        ) : (
          <div className="space-y-2.5">
            {assets.map(asset => (
              <div key={asset.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{asset.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{TYPE_LABELS[asset.type]}{asset.notes ? ` · ${asset.notes}` : ''}</p>
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(asset.value)}</p>
                <button onClick={() => { setEditing(asset); setShowForm(true); }} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onClick={() => dispatch({ type: 'DELETE_ASSET_ACCOUNT', payload: asset.id })} className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Asset Mix</h2>
        {assetMix.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No asset mix to show yet.</p>
        ) : (
          <div className="space-y-3">
            {assetMix.map(([type, total]) => {
              const percent = assetTotal > 0 ? (total / assetTotal) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{TYPE_LABELS[type]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(total)} · {Math.round(percent)}%</p>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AssetForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveAsset}
        edit={editing}
      />
    </div>
  );
}
