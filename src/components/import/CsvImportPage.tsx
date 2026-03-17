import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import { processImportedCsv, type StagedTransaction } from '../../services/csvParser';
import { learnFromTransactions } from '../../services/learnedRules';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Transaction, TransactionType } from '../../types';

const STAGED_STORAGE_KEY = 'budget-app:csv-staged';
const STAGED_FILENAME_KEY = 'budget-app:csv-filename';

function loadStaged(): StagedTransaction[] {
  try {
    const raw = localStorage.getItem(STAGED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStaged(staged: StagedTransaction[]): void {
  try {
    localStorage.setItem(STAGED_STORAGE_KEY, JSON.stringify(staged));
  } catch (e) { console.error('Failed to save staged:', e); }
}

function clearStaged(): void {
  localStorage.removeItem(STAGED_STORAGE_KEY);
  localStorage.removeItem(STAGED_FILENAME_KEY);
}

export default function CsvImportPage() {
  const { state, dispatch } = useBudget();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staged, setStagedRaw] = useState<StagedTransaction[]>(loadStaged);
  const [fileName, setFileName] = useState(() => localStorage.getItem(STAGED_FILENAME_KEY) || '');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'unknown' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [submitted, setSubmitted] = useState(false);

  // Wrapper that persists to localStorage on every change
  const setStaged = useCallback((updater: StagedTransaction[] | ((prev: StagedTransaction[]) => StagedTransaction[])) => {
    setStagedRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStaged(next);
      return next;
    });
  }, []);

  // Persist filename
  useEffect(() => {
    if (fileName) {
      localStorage.setItem(STAGED_FILENAME_KEY, fileName);
    }
  }, [fileName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSubmitted(false);
    const reader = new FileReader();
    reader.onload = () => {
      const result = processImportedCsv(reader.result as string, state.categories);
      setStaged(result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Bulk update: when changing category, update all rows with the same visible description
  const handleCategoryChange = (id: string, newCategoryId: string) => {
    setStaged(prev => {
      const target = prev.find(s => s.id === id);
      if (!target) return prev;

      // Match on the visible description (the cleaned one shown in the table)
      const targetDesc = target.description.toLowerCase().trim();

      return prev.map(s => {
        const sDesc = s.description.toLowerCase().trim();
        if (s.id === id || sDesc === targetDesc) {
          const sNewType: TransactionType = newCategoryId === 'internal-transfer' ? 'transfer' : s.type === 'transfer' ? 'expense' : s.type;
          return { ...s, category: newCategoryId, confidence: 'high' as const, type: sNewType };
        }
        return s;
      });
    });
  };

  const handleTypeChange = (id: string, newType: TransactionType) => {
    setStaged(prev => {
      const target = prev.find(s => s.id === id);
      if (!target) return prev;

      const targetDesc = target.description.toLowerCase().trim();

      return prev.map(s => {
        const sDesc = s.description.toLowerCase().trim();
        if (s.id !== id && sDesc !== targetDesc) return s;

        if (newType === 'transfer') {
          return { ...s, type: newType, category: 'internal-transfer', confidence: 'high' as const };
        }
        if (s.category === 'internal-transfer') {
          return { ...s, type: newType, category: newType === 'income' ? 'other-income' : 'other-expense', confidence: 'low' as const };
        }
        return { ...s, type: newType };
      });
    });
  };

  const handleRemove = (id: string) => {
    setStaged(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmitAll = () => {
    // Learn from user's category/type corrections for future imports
    learnFromTransactions(
      staged.map(s => ({ description: s.description, category: s.category, type: s.type }))
    );

    const now = new Date().toISOString();
    const transactions: Transaction[] = staged.map(s => ({
      id: uuidv4(),
      type: s.type,
      amount: s.amount,
      category: s.category,
      description: s.description,
      date: s.date,
      createdAt: now,
      updatedAt: now,
    }));
    dispatch({ type: 'BATCH_ADD_TRANSACTIONS', payload: transactions });
    setSubmitted(true);
    setStagedRaw([]);
    clearStaged();
  };

  const handleClearStaged = () => {
    setStagedRaw([]);
    clearStaged();
    setFileName('');
  };

  const filtered = useMemo(() => {
    let result = [...staged];
    if (filterConfidence === 'unknown') result = result.filter(s => s.confidence === 'unknown');
    if (filterConfidence === 'low') result = result.filter(s => s.confidence === 'low' || s.confidence === 'unknown');
    if (filterCategory !== 'all') result = result.filter(s => s.category === filterCategory);
    if (filterType !== 'all') result = result.filter(s => s.type === filterType);
    return result;
  }, [staged, filterConfidence, filterCategory, filterType]);

  const unknownCount = staged.filter(s => s.confidence === 'unknown').length;
  const lowCount = staged.filter(s => s.confidence === 'low' || s.confidence === 'unknown').length;

  // Summary stats (excluding transfers)
  const totalIncome = staged.filter(s => s.type === 'income').reduce((sum, s) => sum + s.amount, 0);
  const totalExpense = staged.filter(s => s.type === 'expense').reduce((sum, s) => sum + s.amount, 0);
  const totalTransfers = staged.filter(s => s.type === 'transfer').length;

  const typeBadge = (type: TransactionType) => {
    const styles = {
      income: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      expense: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
      transfer: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
    };
    return styles[type];
  };

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-[20px] p-14 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
          <svg className="w-7 h-7 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          {fileName ? `Loaded: ${fileName}` : 'Click to upload a CSV file'}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Expects columns: Date, Account, Description, Credit, Debit
        </p>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
      </div>

      {submitted && (
        <div className="flex items-center gap-3 p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Transactions imported successfully! View them in the Transactions tab.</p>
        </div>
      )}

      {staged.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
            <div className="card-hover p-6 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px]">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Rows</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{staged.length}</p>
            </div>
            <div className="card-hover p-6 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px]">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Income</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="card-hover p-6 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px]">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Expenses</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="card-hover p-6 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px]">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Transfers</p>
              <p className="text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">{totalTransfers} ignored</p>
            </div>
            <div className="card-hover p-6 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px]">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Needs Review</p>
              <p className={`text-xl font-bold mt-1 ${unknownCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {unknownCount > 0 ? unknownCount : 'All good'}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense' | 'transfer')}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select
              value={filterConfidence}
              onChange={e => setFilterConfidence(e.target.value as 'all' | 'unknown' | 'low')}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Confidence ({staged.length})</option>
              <option value="unknown">Unknown Only ({unknownCount})</option>
              <option value="low">Needs Review ({lowCount})</option>
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
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleClearStaged}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleSubmitAll}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-indigo-500/25"
              >
                Submit All ({staged.length} transactions)
              </button>
            </div>
          </div>

          {/* Bulk update notice */}
          <p className="text-xs text-slate-400 dark:text-slate-500 -mt-3">
            Changing the type or category of a transaction will also update all other rows with the same description.
          </p>

          {/* Transaction review table */}
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
                    <th className="text-center px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Confidence</th>
                    <th className="text-center px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map(row => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 dark:border-slate-700/40 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors ${
                        row.confidence === 'unknown' ? 'bg-amber-50/30 dark:bg-amber-500/5' :
                        row.type === 'transfer' ? 'bg-slate-50/30 dark:bg-slate-900/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap text-[13px]">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white max-w-xs truncate text-[13px]" title={row.originalDescription}>
                        {row.description}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={row.type}
                          onChange={e => handleTypeChange(row.id, e.target.value as TransactionType)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${typeBadge(row.type)}`}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                          <option value="transfer">Transfer</option>
                        </select>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap text-[13px] ${
                        row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
                        row.type === 'transfer' ? 'text-slate-500 dark:text-slate-400' :
                        'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={row.category}
                          onChange={e => handleCategoryChange(row.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                            row.confidence === 'unknown'
                              ? 'border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-500/10'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                          } text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                        >
                          {state.categories
                            .filter(c => c.type === row.type || c.type === 'both' ||
                              (row.type === 'transfer' && c.id === 'internal-transfer'))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          row.confidence === 'high' ? 'bg-emerald-500' :
                          row.confidence === 'medium' ? 'bg-sky-500' :
                          row.confidence === 'low' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} title={`${row.confidence} confidence`} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemove(row.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 200 && (
              <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center border-t border-slate-100 dark:border-slate-700/60">
                Showing first 200 of {filtered.length} rows. Submit to import all.
              </div>
            )}
          </div>
        </>
      )}

      {staged.length === 0 && !submitted && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-base font-medium">Upload a bank CSV file to preview and categorize your transactions before importing.</p>
          <p className="text-sm mt-2">The system will auto-categorize based on description keywords. You can review and adjust any category and type before submitting.</p>
          <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Internal transfers between your accounts are automatically detected and excluded from budget calculations.</p>
        </div>
      )}
    </div>
  );
}
