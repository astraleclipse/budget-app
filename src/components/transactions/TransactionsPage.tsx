import { useState, useMemo, useCallback } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { learnFromTransactions } from '../../services/learnedRules';
import TransactionForm from './TransactionForm';
import type { Transaction, TransactionType } from '../../types';

export default function TransactionsPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Available months/years from transactions for the period filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const tx of state.transactions) {
      months.add(tx.date.substring(0, 7));
    }
    return [...months].sort().reverse();
  }, [state.transactions]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const tx of state.transactions) {
      years.add(tx.date.substring(0, 4));
    }
    return [...years].sort().reverse();
  }, [state.transactions]);

  const hasActiveFilters = filterType !== 'all' || filterCategory !== 'all' || filterMonth !== 'all';

  const resetAllFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setFilterMonth('all');
  };

  const filtered = useMemo(() => {
    let result = [...state.transactions];
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterCategory !== 'all') result = result.filter(t => t.category === filterCategory);
    if (filterMonth !== 'all') {
      // filterMonth can be "yyyy" (year) or "yyyy-MM" (month)
      result = result.filter(t => t.date.startsWith(filterMonth));
    }
    result.sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'date') return mul * a.date.localeCompare(b.date);
      return mul * (a.amount - b.amount);
    });
    return result;
  }, [state.transactions, filterType, filterCategory, filterMonth, sortBy, sortDir]);

  const catMap = new Map(state.categories.map(c => [c.id, c]));

  // Bulk update: change category for all transactions with matching description
  const handleCategoryChange = useCallback((id: string, newCategoryId: string) => {
    const target = state.transactions.find(t => t.id === id);
    if (!target) return;

    const targetDesc = target.description.toLowerCase().trim();
    const now = new Date().toISOString();

    const updated: Transaction[] = [];
    for (const tx of state.transactions) {
      if (tx.description.toLowerCase().trim() === targetDesc) {
        const newType: TransactionType = newCategoryId === 'internal-transfer'
          ? 'transfer'
          : tx.type === 'transfer' ? 'expense' : tx.type;
        updated.push({ ...tx, category: newCategoryId, type: newType, updatedAt: now });
      }
    }

    if (updated.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_TRANSACTIONS', payload: updated });
      // Learn from this correction
      learnFromTransactions(
        updated.map(t => ({ description: t.description, category: t.category, type: t.type }))
      );
    }
  }, [state.transactions, dispatch]);

  // Bulk update: change type for all transactions with matching description
  const handleTypeChange = useCallback((id: string, newType: TransactionType) => {
    const target = state.transactions.find(t => t.id === id);
    if (!target) return;

    const targetDesc = target.description.toLowerCase().trim();
    const now = new Date().toISOString();

    const updated: Transaction[] = [];
    for (const tx of state.transactions) {
      if (tx.description.toLowerCase().trim() === targetDesc) {
        let category = tx.category;
        if (newType === 'transfer') {
          category = 'internal-transfer';
        } else if (tx.category === 'internal-transfer') {
          category = newType === 'income' ? 'other-income' : 'other-expense';
        }
        updated.push({ ...tx, type: newType, category, updatedAt: now });
      }
    }

    if (updated.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_TRANSACTIONS', payload: updated });
      learnFromTransactions(
        updated.map(t => ({ description: t.description, category: t.category, type: t.type }))
      );
    }
  }, [state.transactions, dispatch]);

  const handleSave = (tx: Transaction) => {
    if (editTx) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: tx });
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    }
    setEditTx(null);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  };

  const typeBadge = (type: TransactionType) => {
    const styles = {
      income: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      expense: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
      transfer: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
    };
    return styles[type];
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setEditTx(null); setShowForm(true); }}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Transaction
        </button>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense' | 'transfer')}
          className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
          <option value="transfer">Transfers</option>
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {state.categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">All Periods</option>
          <optgroup label="By Year">
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </optgroup>
          <optgroup label="By Month">
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return <option key={m} value={m}>{label}</option>;
            })}
          </optgroup>
        </select>
        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="px-3 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
            title="Clear all filters"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { setSortBy('date'); setSortDir(d => d === 'desc' ? 'asc' : 'desc'); }}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${sortBy === 'date' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
          >
            Date {sortBy === 'date' ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
          </button>
          <button
            onClick={() => { setSortBy('amount'); setSortDir(d => d === 'desc' ? 'asc' : 'desc'); }}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${sortBy === 'amount' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
          >
            Amount {sortBy === 'amount' ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
          </button>
        </div>
      </div>

      {/* Info bar */}
      {state.transactions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Changing the type or category of a transaction will also update all other transactions with the same description.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-4">
            {hasActiveFilters
              ? `${filtered.length} of ${state.transactions.length} transactions`
              : `${state.transactions.length} transactions`}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No transactions yet</p>
          <p className="text-sm mt-1">Add your first transaction to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-900/20">
                  <th className="text-left px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Category</th>
                  <th className="text-center px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const cat = catMap.get(tx.category);
                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-slate-50 dark:border-slate-700/40 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors ${
                        tx.type === 'transfer' ? 'bg-slate-50/30 dark:bg-slate-900/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap text-[13px]">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {cat && (
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          )}
                          <span className="text-slate-900 dark:text-white text-[13px] truncate">
                            {tx.description || cat?.name || 'Transaction'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={tx.type}
                          onChange={e => handleTypeChange(tx.id, e.target.value as TransactionType)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${typeBadge(tx.type)}`}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                          <option value="transfer">Transfer</option>
                        </select>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap text-[13px] ${
                        tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
                        tx.type === 'transfer' ? 'text-slate-500 dark:text-slate-400' :
                        'text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={tx.category}
                          onChange={e => handleCategoryChange(tx.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {state.categories
                            .filter(c => c.type === tx.type || c.type === 'both' ||
                              (tx.type === 'transfer' && c.id === 'internal-transfer'))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditTx(tx); setShowForm(true); }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransactionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTx(null); }}
        onSave={handleSave}
        categories={state.categories}
        editTransaction={editTx}
      />
    </div>
  );
}
