import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, TransactionType, Category } from '../../types';
import Modal from '../ui/Modal';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  categories: Category[];
  editTransaction?: Transaction | null;
}

export default function TransactionForm({ open, onClose, onSave, categories, editTransaction }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(editTransaction.amount.toString());
      setCategory(editTransaction.category);
      setDescription(editTransaction.description);
      setDate(editTransaction.date);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editTransaction, open]);

  const filteredCategories = categories.filter(c =>
    c.type === type || c.type === 'both' || (type === 'transfer' && c.id === 'internal-transfer')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || !category) return;

    const now = new Date().toISOString();
    onSave({
      id: editTransaction?.id || uuidv4(),
      type,
      amount: parsed,
      category,
      description: description.trim(),
      date,
      createdAt: editTransaction?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editTransaction ? 'Edit Transaction' : 'Add Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          {(['expense', 'income', 'transfer'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(t === 'transfer' ? 'internal-transfer' : ''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                type === t
                  ? t === 'expense'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-500/30'
                    : t === 'income'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Transfer'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select category...</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25"
          >
            {editTransaction ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
