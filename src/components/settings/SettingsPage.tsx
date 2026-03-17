import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import { exportData, importData } from '../../services/storage';
import { getAllLearnedRules, deleteLearnedRule, clearAllLearnedRules, type LearnedRule } from '../../services/learnedRules';
import type { Category, TransactionType } from '../../types';

export default function SettingsPage() {
  const { state, dispatch } = useBudget();
  const [apiKey, setApiKey] = useState(state.settings.claudeApiKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [showAllRules, setShowAllRules] = useState(false);

  // Load learned rules on mount
  useEffect(() => {
    setLearnedRules(getAllLearnedRules());
  }, []);

  const handleDeleteRule = (description: string) => {
    deleteLearnedRule(description);
    setLearnedRules(getAllLearnedRules());
  };

  const handleClearAllRules = () => {
    if (confirm('Are you sure you want to clear all learned rules? Future imports will no longer remember your category preferences.')) {
      clearAllLearnedRules();
      setLearnedRules([]);
    }
  };

  const getCategoryName = (catId: string) => {
    const cat = state.categories.find(c => c.id === catId);
    return cat ? `${cat.icon} ${cat.name}` : catId;
  };

  const handleSaveApiKey = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { claudeApiKey: apiKey } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestApiKey = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: state.settings.claudeModel || 'claude-sonnet-4-5-20250929',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "ok"' }],
        }),
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat: Category = {
      id: uuidv4(),
      name: newCatName.trim(),
      icon: newCatType === 'income' ? '\u{1F4B5}' : '\u{1F4CB}',
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
      type: newCatType,
      isDefault: false,
    };
    dispatch({ type: 'ADD_CATEGORY', payload: cat });
    setNewCatName('');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(reader.result as string);
      if (result) {
        dispatch({ type: 'IMPORT_DATA', payload: result });
        setApiKey(result.settings.claudeApiKey || '');
        setImportMsg('Data imported successfully!');
      } else {
        setImportMsg('Invalid backup file. Please check the format.');
      }
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sectionClasses = "bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10";
  const inputClasses = "w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* API Key */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Claude API Key</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Required for AI spending analysis. Stored locally and only sent to Anthropic's API.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type={apiKeyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setSaved(false); }}
              placeholder="sk-ant-..."
              className={`${inputClasses} pr-12`}
            />
            <button
              type="button"
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {apiKeyVisible ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                )}
              </svg>
            </button>
          </div>
          <button
            onClick={handleSaveApiKey}
            className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-colors ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={handleTestApiKey}
            disabled={!apiKey || testing}
            className="px-5 py-3 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-40 transition-colors"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm mt-3 ${testResult === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {testResult === 'success' ? 'API key is valid!' : 'Invalid API key or connection error.'}
          </p>
        )}
      </section>

      {/* AI Model Selection */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">AI Model</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              More capable models provide deeper insights but may cost more per request.
            </p>
          </div>
        </div>
        <select
          value={state.settings.claudeModel || 'claude-sonnet-4-5-20250929'}
          onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { claudeModel: e.target.value } })}
          className={inputClasses}
        >
          <optgroup label="Claude 4">
            <option value="claude-opus-4-0-20250514">Claude Opus 4 (Most capable)</option>
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Recommended)</option>
            <option value="claude-sonnet-4-0-20250514">Claude Sonnet 4</option>
          </optgroup>
          <optgroup label="Claude 3.5">
            <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fastest, cheapest)</option>
          </optgroup>
        </select>
      </section>

      {/* Storage Info */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Data Storage</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              All data is saved automatically to your browser's local storage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/20 rounded-2xl p-5">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Auto-save enabled &mdash; {state.transactions.length} transactions, {state.budgetLimits.length} budget limits, {state.analyses.length} AI analyses stored</span>
        </div>
      </section>

      {/* Budget Mode */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Budget Mode</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Choose whether to set budgets on a monthly or yearly basis.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { budgetMode: 'monthly' } })}
            className={`flex-1 py-4 px-6 rounded-2xl text-sm font-semibold transition-all ${
              state.settings.budgetMode === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { budgetMode: 'yearly' } })}
            className={`flex-1 py-4 px-6 rounded-2xl text-sm font-semibold transition-all ${
              state.settings.budgetMode === 'yearly'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40'
            }`}
          >
            Yearly
          </button>
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-5">
          Current mode: <span className="font-semibold capitalize text-slate-600 dark:text-slate-300">{state.settings.budgetMode}</span>. Changing modes won't delete existing budgets.
        </p>
      </section>

      {/* Learned Rules */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Smart Categorization Rules</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              The app learns from your choices during CSV import.
            </p>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/30 px-3 py-1.5 rounded-full font-semibold">
            {learnedRules.length} {learnedRules.length === 1 ? 'rule' : 'rules'}
          </span>
        </div>

        {learnedRules.length > 0 ? (
          <>
            <div className="space-y-2.5 mb-5">
              {(showAllRules ? learnedRules : learnedRules.slice(0, 10)).map(rule => (
                <div key={rule.description} className="flex items-center justify-between py-4 px-5 bg-slate-50/80 dark:bg-slate-900/20 rounded-2xl group">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-900 dark:text-white truncate block">{rule.description}</span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{getCategoryName(rule.categoryId)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                        rule.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                        rule.type === 'transfer' ? 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400' :
                        'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}>{rule.type}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">applied {rule.count}×</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.description)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete this rule"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {learnedRules.length > 10 && (
                <button
                  onClick={() => setShowAllRules(!showAllRules)}
                  className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showAllRules ? 'Show less' : `Show all ${learnedRules.length} rules`}
                </button>
              )}
              <button
                onClick={handleClearAllRules}
                className="text-sm font-semibold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 ml-auto"
              >
                Clear All Rules
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6 bg-slate-50/80 dark:bg-slate-900/20 rounded-2xl">
            No learned rules yet. Import and categorize CSV transactions to start teaching the system.
          </p>
        )}
      </section>

      {/* Custom Categories */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Custom Categories</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Add your own transaction categories.
            </p>
          </div>
        </div>
        <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Category name"
            className={`flex-1 ${inputClasses}`}
          />
          <select
            value={newCatType}
            onChange={e => setNewCatType(e.target.value as TransactionType)}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button type="submit" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20">
            Add
          </button>
        </form>

        <div className="space-y-2.5">
          {state.categories.filter(c => !c.isDefault).map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-4 px-5 bg-slate-50/80 dark:bg-slate-900/20 rounded-2xl">
              <span className="text-sm text-slate-900 dark:text-white">{cat.icon} {cat.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 capitalize font-semibold">{cat.type}</span>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_CATEGORY', payload: cat.id })}
                  className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {state.categories.filter(c => !c.isDefault).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6 bg-slate-50/80 dark:bg-slate-900/20 rounded-2xl">No custom categories yet</p>
          )}
        </div>
      </section>

      {/* Data Export/Import */}
      <section className={sectionClasses}>
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Data Backup</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Export or import your data as JSON.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => exportData(state)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
          >
            Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {importMsg && (
          <p className={`text-sm mt-3 ${importMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
            {importMsg}
          </p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-slate-800/50 border border-rose-200/60 dark:border-rose-500/15 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-rose-600 dark:text-rose-400">Danger Zone</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">This will delete all your data permanently.</p>
          </div>
        </div>
        <button
          onClick={() => { if (confirm('Are you sure? This cannot be undone.')) dispatch({ type: 'RESET_ALL' }); }}
          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-rose-500/20"
        >
          Reset All Data
        </button>
      </section>
    </div>
  );
}
