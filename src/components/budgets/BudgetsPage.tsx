import { useState, useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { getCurrentPeriod, formatCurrency, formatPeriod, formatPercent } from '../../utils/formatters';
import { getCategoryTotals, getEffectiveBudgetLimit } from '../../utils/calculations';
import { format, subMonths, addMonths } from 'date-fns';
import ProgressBar from '../ui/ProgressBar';
import Modal from '../ui/Modal';

export default function BudgetsPage() {
  const { state, dispatch } = useBudget();
  const budgetMode = state.settings.budgetMode || 'monthly';
  const isYearly = budgetMode === 'yearly';

  const [period, setPeriod] = useState(getCurrentPeriod(budgetMode));
  const [editCat, setEditCat] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [copied, setCopied] = useState(false);

  // Inline category name editing
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  const startEditingName = (catId: string, currentName: string) => {
    setEditingNameId(catId);
    setEditingNameValue(currentName);
  };

  const saveEditingName = () => {
    if (!editingNameId) return;
    const trimmed = editingNameValue.trim();
    if (trimmed && trimmed !== state.categories.find(c => c.id === editingNameId)?.name) {
      dispatch({ type: 'UPDATE_CATEGORY', payload: { id: editingNameId, changes: { name: trimmed } } });
    }
    setEditingNameId(null);
    setEditingNameValue('');
  };

  const cancelEditingName = () => {
    setEditingNameId(null);
    setEditingNameValue('');
  };

  // Navigate period forward/backward
  const navigatePeriod = (dir: -1 | 1) => {
    if (isYearly) {
      const y = parseInt(period, 10) + dir;
      setPeriod(String(y));
    } else {
      const [y, m] = period.split('-').map(Number);
      const d = dir === -1 ? subMonths(new Date(y, m - 1), 1) : addMonths(new Date(y, m - 1), 1);
      setPeriod(format(d, 'yyyy-MM'));
    }
    setCopied(false);
  };

  // Available periods from transactions + current period
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    for (const tx of state.transactions) {
      if (isYearly) {
        periods.add(tx.date.substring(0, 4));
      } else {
        periods.add(tx.date.substring(0, 7));
      }
    }
    // Also include periods that have budget limits set
    for (const bl of state.budgetLimits) {
      if (isYearly && bl.month.length === 4) {
        periods.add(bl.month);
      } else if (!isYearly && bl.month.length === 7) {
        periods.add(bl.month);
      }
    }
    periods.add(period);
    return [...periods].sort().reverse();
  }, [state.transactions, state.budgetLimits, isYearly, period]);

  const expenseCategories = state.categories.filter(c => c.type === 'expense');
  const categoryTotals = useMemo(
    () => getCategoryTotals(state.transactions, state.categories, state.budgetLimits, period, 'expense', budgetMode),
    [state.transactions, state.categories, state.budgetLimits, period, budgetMode]
  );
  const totalMap = new Map(categoryTotals.map(ct => [ct.categoryId, ct]));

  const incomeCategories = state.categories.filter(c => c.type === 'income');
  const incomeTotals = useMemo(
    () => getCategoryTotals(state.transactions, state.categories, state.budgetLimits, period, 'income', budgetMode),
    [state.transactions, state.categories, state.budgetLimits, period, budgetMode]
  );
  const incomeTotalMap = new Map(incomeTotals.map(ct => [ct.categoryId, ct]));

  // Check if this period has any budgets set (exact match only)
  const expectedLen = isYearly ? 4 : 7;
  const periodHasBudgets = state.budgetLimits.some(
    bl => bl.month === period && bl.month.length === expectedLen
  );

  // Find the previous period key
  const getPreviousPeriod = (): string => {
    if (isYearly) {
      return String(parseInt(period, 10) - 1);
    }
    const [y, m] = period.split('-').map(Number);
    const prev = subMonths(new Date(y, m - 1), 1);
    return format(prev, 'yyyy-MM');
  };

  // Check if previous period has budgets to copy
  const previousPeriod = getPreviousPeriod();
  const previousBudgets = state.budgetLimits.filter(
    bl => bl.month === previousPeriod && bl.month.length === expectedLen
  );
  const canCopyFromPrevious = !periodHasBudgets && previousBudgets.length > 0;

  const handleCopyFromPrevious = () => {
    for (const bl of previousBudgets) {
      dispatch({
        type: 'SET_BUDGET_LIMIT',
        payload: { categoryId: bl.categoryId, monthlyLimit: bl.monthlyLimit, month: period },
      });
    }
    setCopied(true);
  };

  const handleSetLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCat) return;
    const parsed = parseFloat(limitValue);
    if (isNaN(parsed) || parsed <= 0) return;
    dispatch({ type: 'SET_BUDGET_LIMIT', payload: { categoryId: editCat, monthlyLimit: parsed, month: period } });
    setEditCat(null);
    setLimitValue('');
  };

  const handleRemoveLimit = (categoryId: string) => {
    dispatch({ type: 'REMOVE_BUDGET_LIMIT', payload: { categoryId, month: period } });
  };

  const limitLabel = isYearly ? 'Yearly Limit' : 'Monthly Limit';
  const spendLabel = isYearly ? 'Year-to-date' : 'Spent';

  const editCatType = editCat ? state.categories.find(c => c.id === editCat)?.type : null;
  const modalTitle = editCatType === 'income'
    ? `Set Expected Income - ${state.categories.find(c => c.id === editCat)?.name || ''}`
    : `Set Budget Limit - ${state.categories.find(c => c.id === editCat)?.name || ''}`;
  const modalLimitLabel = editCatType === 'income'
    ? (isYearly ? 'Expected Yearly Income' : 'Expected Monthly Income')
    : limitLabel;

  return (
    <div className="space-y-8">
      {/* Period navigator */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigatePeriod(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <select
          value={period}
          onChange={e => { setPeriod(e.target.value); setCopied(false); }}
          className="text-lg font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
        >
          {availablePeriods.map(p => (
            <option key={p} value={p} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              {formatPeriod(p)}
            </option>
          ))}
        </select>

        <button
          onClick={() => navigatePeriod(1)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {period !== getCurrentPeriod(budgetMode) && (
          <button
            onClick={() => { setPeriod(getCurrentPeriod(budgetMode)); setCopied(false); }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Go to current
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full capitalize font-medium">
          {budgetMode} mode
        </span>
      </div>

      {/* Copy from previous button */}
      {canCopyFromPrevious && !copied && (
        <div className="flex items-center gap-4 p-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
              No budgets set for this period
            </p>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/60 mt-0.5">
              Copy {previousBudgets.length} budget{previousBudgets.length !== 1 ? 's' : ''} from {formatPeriod(previousPeriod)}
            </p>
          </div>
          <button
            onClick={handleCopyFromPrevious}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-indigo-500/25"
          >
            Copy Budgets
          </button>
        </div>
      )}

      {copied && (
        <div className="flex items-center gap-4 p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Budgets copied from {formatPeriod(previousPeriod)}!
          </p>
        </div>
      )}

      {/* Expected Income section */}
      {incomeCategories.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Expected Income</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Track income received against forecasts</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {incomeCategories.map(cat => {
              const data = incomeTotalMap.get(cat.id);
              const received = data?.total || 0;
              const effectiveLimit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, period, budgetMode);
              const percent = effectiveLimit ? (received / effectiveLimit) * 100 : 0;
              const exactBudgetLimit = state.budgetLimits.find(
                bl => bl.categoryId === cat.id && bl.month === period && bl.month.length === expectedLen
              );
              const displayLimit = effectiveLimit;

              return (
                <div
                  key={cat.id}
                  className="group card-hover bg-white dark:bg-slate-800/50 border border-emerald-200/40 dark:border-emerald-700/20 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-7 lg:p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: cat.color + '18' }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingNameId === cat.id ? (
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={e => setEditingNameValue(e.target.value)}
                          onBlur={saveEditingName}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveEditingName(); }
                            if (e.key === 'Escape') cancelEditingName();
                          }}
                          autoFocus
                          className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700/50 border border-emerald-300 dark:border-emerald-500/50 rounded-lg px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      ) : (
                        <p
                          className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                          onClick={() => startEditingName(cat.id, cat.name)}
                          title="Click to rename"
                        >
                          {cat.name}
                          <svg className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover:opacity-100 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {data?.count || 0} transaction{(data?.count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Received: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(received)}</span>
                      </span>
                      {displayLimit !== undefined && displayLimit > 0 && (
                        <span className="text-slate-500 dark:text-slate-400">
                          of {formatCurrency(displayLimit)}
                          {!exactBudgetLimit && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1 italic" title="Inherited from a previous period">
                              inherited
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {displayLimit !== undefined && displayLimit > 0 ? (
                      <>
                        <ProgressBar percent={percent} />
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-medium ${percent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {formatPercent(percent)} received
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { setEditCat(cat.id); setLimitValue((exactBudgetLimit?.monthlyLimit || displayLimit || '').toString()); }}
                              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              {exactBudgetLimit ? 'Edit' : 'Set'}
                            </button>
                            {exactBudgetLimit && (
                              <>
                                <span className="text-slate-200 dark:text-slate-700">|</span>
                                <button
                                  onClick={() => handleRemoveLimit(cat.id)}
                                  className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditCat(cat.id); setLimitValue(''); }}
                        className="w-full py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors border border-dashed border-emerald-200 dark:border-emerald-700/40"
                      >
                        + Set Expected Income
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Budgets heading */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Expense Budgets</h2>
      </div>

      {/* Category budget cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {expenseCategories.map(cat => {
          const data = totalMap.get(cat.id);
          const spent = data?.total || 0;
          const effectiveLimit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, period, budgetMode);
          const percent = effectiveLimit ? (spent / effectiveLimit) * 100 : 0;
          // Check for an exact-period budget limit
          const exactBudgetLimit = state.budgetLimits.find(
            bl => bl.categoryId === cat.id && bl.month === period && bl.month.length === expectedLen
          );
          // Display the effective limit value (exact or inherited)
          const displayLimit = effectiveLimit;

          return (
            <div
              key={cat.id}
              className="group card-hover bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-7 lg:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: cat.color + '18' }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {editingNameId === cat.id ? (
                    <input
                      type="text"
                      value={editingNameValue}
                      onChange={e => setEditingNameValue(e.target.value)}
                      onBlur={saveEditingName}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEditingName(); }
                        if (e.key === 'Escape') cancelEditingName();
                      }}
                      autoFocus
                      className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700/50 border border-indigo-300 dark:border-indigo-500/50 rounded-lg px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p
                      className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                      onClick={() => startEditingName(cat.id, cat.name)}
                      title="Click to rename"
                    >
                      {cat.name}
                      <svg className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover:opacity-100 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {data?.count || 0} transaction{(data?.count || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {spendLabel}: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(spent)}</span>
                  </span>
                  {displayLimit !== undefined && displayLimit > 0 && (
                    <span className="text-slate-500 dark:text-slate-400">
                      of {formatCurrency(displayLimit)}
                      {!exactBudgetLimit && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1 italic" title="Inherited from a previous period">
                          inherited
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {displayLimit !== undefined && displayLimit > 0 ? (
                  <>
                    <ProgressBar percent={percent} />
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-medium ${percent > 100 ? 'text-rose-600 dark:text-rose-400' : percent > 75 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatPercent(percent)} used
                        {percent > 100 && displayLimit > 0 && ` (${formatCurrency(spent - displayLimit)} over)`}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setEditCat(cat.id); setLimitValue((exactBudgetLimit?.monthlyLimit || displayLimit || '').toString()); }}
                          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {exactBudgetLimit ? 'Edit' : 'Set'}
                        </button>
                        {exactBudgetLimit && (
                          <>
                            <span className="text-slate-200 dark:text-slate-700">|</span>
                            <button
                              onClick={() => handleRemoveLimit(cat.id)}
                              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditCat(cat.id); setLimitValue(''); }}
                    className="w-full py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors border border-dashed border-slate-200 dark:border-slate-700/60"
                  >
                    + Set Budget Limit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!editCat}
        onClose={() => { setEditCat(null); setLimitValue(''); }}
        title={modalTitle}
      >
        <form onSubmit={handleSetLimit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {modalLimitLabel}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={limitValue}
              onChange={e => setLimitValue(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              This budget will be saved for {formatPeriod(period)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEditCat(null); setLimitValue(''); }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25"
            >
              Save Limit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
