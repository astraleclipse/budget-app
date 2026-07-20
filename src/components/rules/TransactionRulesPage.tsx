import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import type { TransactionRule, TransactionRuleMatchMode, TransactionType } from '../../types';
import Modal from '../ui/Modal';
import { applyTransactionRules, countRuleMatches } from '../../utils/transactionRules';

interface RuleFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: TransactionRule) => void;
  edit: TransactionRule | null;
  categories: Array<{ id: string; name: string; icon: string; type: string }>;
}

function RuleForm({ open, onClose, onSave, edit, categories }: RuleFormProps) {
  const [name, setName] = useState('');
  const [matchText, setMatchText] = useState('');
  const [matchMode, setMatchMode] = useState<TransactionRuleMatchMode>('contains');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(edit?.name ?? '');
    setMatchText(edit?.matchText ?? '');
    setMatchMode(edit?.matchMode ?? 'contains');
    setType(edit?.type ?? 'expense');
    setCategoryId(edit?.categoryId ?? '');
    setRenameTo(edit?.renameTo ?? '');
    setActive(edit?.active ?? true);
  }, [open, edit]);

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both' || (type === 'transfer' && c.id === 'internal-transfer'));
  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !matchText.trim() || !categoryId) return;

    const now = new Date().toISOString();
    onSave({
      id: edit?.id ?? uuidv4(),
      name: name.trim(),
      matchText: matchText.trim(),
      matchMode,
      type,
      categoryId,
      renameTo: renameTo.trim() || undefined,
      active,
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Transaction Rule' : 'Add Transaction Rule'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Rule name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Woolworths groceries" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Match mode</label>
            <select className={inputCls} value={matchMode} onChange={e => setMatchMode(e.target.value as TransactionRuleMatchMode)}>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="equals">Exact match</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Match text</label>
            <input className={inputCls} value={matchText} onChange={e => setMatchText(e.target.value)} placeholder="woolworths" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={e => { setType(e.target.value as TransactionType); setCategoryId(''); }}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Select category...</option>
              {filteredCategories.map(category => (
                <option key={category.id} value={category.id}>{category.icon} {category.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Rename description to (optional)</label>
          <input className={inputCls} value={renameTo} onChange={e => setRenameTo(e.target.value)} placeholder="Groceries - Woolworths" />
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Rule is active
        </label>
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

export default function TransactionRulesPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionRule | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const rules = state.transactionRules ?? [];
  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  const saveRule = (rule: TransactionRule) => {
    if (editing) dispatch({ type: 'UPDATE_TRANSACTION_RULE', payload: rule });
    else dispatch({ type: 'ADD_TRANSACTION_RULE', payload: rule });
    setEditing(null);
  };

  const applyRulesToExisting = () => {
    const updated = applyTransactionRules(state.transactions, rules);
    const changed = updated.filter((transaction, index) => {
      const original = state.transactions[index];
      return transaction.type !== original.type || transaction.category !== original.category || transaction.description !== original.description;
    });

    if (changed.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_TRANSACTIONS', payload: changed.map(transaction => ({ ...transaction, updatedAt: new Date().toISOString() })) });
    }

    setApplyMessage(changed.length > 0 ? `Applied rules to ${changed.length} transaction${changed.length === 1 ? '' : 's'}.` : 'No existing transactions needed updates.');
    setTimeout(() => setApplyMessage(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Transaction Rules Engine</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create reusable rules that auto-categorize and rename future transactions and CSV imports.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyRulesToExisting}
              disabled={rules.length === 0}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              Apply to Existing
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
            >
              Add Rule
            </button>
          </div>
        </div>

        {applyMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {applyMessage}
          </div>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No rules yet. Add a few merchants or pay patterns you want to automate.</p>
        ) : (
          <div className="space-y-2.5">
            {rules.map(rule => {
              const matches = countRuleMatches(state.transactions, rule);
              const category = state.categories.find(c => c.id === rule.categoryId);
              return (
                <div key={rule.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{rule.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rule.active ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {rule.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {rule.matchMode} "{rule.matchText}" → {category ? `${category.icon} ${category.name}` : rule.categoryId} ({rule.type}){rule.renameTo ? ` · Rename to "${rule.renameTo}"` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{matches} existing match{matches === 1 ? '' : 'es'}</p>
                  </div>
                  <button onClick={() => { setEditing(rule); setShowForm(true); }} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                  <button onClick={() => dispatch({ type: 'DELETE_TRANSACTION_RULE', payload: rule.id })} className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RuleForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveRule}
        edit={editing}
        categories={state.categories}
      />
    </div>
  );
}
