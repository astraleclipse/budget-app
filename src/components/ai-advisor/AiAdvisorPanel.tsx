import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { useBudget } from '../../context/BudgetContext';
import { getCurrentMonth, formatMonth } from '../../utils/formatters';
import { callClaudeApi, buildAnalysisPrompt } from '../../services/claude';

export default function AiAdvisorPanel() {
  const { state, dispatch } = useBudget();
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<string | null>(null);

  const hasApiKey = !!state.settings.claudeApiKey;
  const hasTransactions = state.transactions.length >= 3;

  const handleAnalyze = async () => {
    if (!hasApiKey || !hasTransactions) return;
    setLoading(true);
    setError(null);
    setCurrentResult(null);

    try {
      const budgetMode = state.settings.budgetMode || 'monthly';
      const prompt = buildAnalysisPrompt(state.transactions, state.categories, state.budgetLimits, month, budgetMode);
      const response = await callClaudeApi(state.settings.claudeApiKey, prompt, state.settings.claudeModel);
      setCurrentResult(response);
      dispatch({
        type: 'ADD_ANALYSIS',
        payload: { id: uuidv4(), timestamp: new Date().toISOString(), month, response },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const months: string[] = [];
  const seen = new Set<string>();
  for (const tx of state.transactions) {
    const m = tx.date.substring(0, 7);
    if (!seen.has(m)) { seen.add(m); months.push(m); }
  }
  months.sort().reverse();
  if (!months.includes(getCurrentMonth())) months.unshift(getCurrentMonth());

  return (
    <div className="space-y-8">
      {!hasApiKey && (
        <div className="flex items-center gap-4 p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">API Key Required</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/60 mt-0.5">
              Go to Settings and add your Anthropic API key to enable AI-powered spending analysis.
            </p>
          </div>
        </div>
      )}

      {!hasTransactions && (
        <div className="flex items-center gap-4 p-6 bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-sky-900 dark:text-sky-200">More Data Needed</p>
            <p className="text-xs text-sky-700/70 dark:text-sky-300/60 mt-0.5">
              Add at least 3 transactions so the AI has enough data to analyze your spending patterns.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {months.map(m => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>

        <button
          onClick={handleAnalyze}
          disabled={loading || !hasApiKey || !hasTransactions}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-semibold transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analyze My Spending
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-4 p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/15 rounded-[20px]">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-rose-900 dark:text-rose-200">Analysis Failed</p>
            <p className="text-xs text-rose-700/70 dark:text-rose-300/60 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {currentResult && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-8 lg:p-10">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-indigo-700 dark:prose-headings:text-indigo-400 prose-li:marker:text-indigo-500 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-strong:text-slate-900 dark:prose-strong:text-white">
            <Markdown>{currentResult}</Markdown>
          </div>
        </div>
      )}

      {!currentResult && state.analyses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Previous Analyses</h3>
          {state.analyses.slice(0, 5).map(analysis => (
            <div key={analysis.id} className="card-hover bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-7 lg:p-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {formatMonth(analysis.month)} &middot; {new Date(analysis.timestamp).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setCurrentResult(analysis.response)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Full Analysis
                </button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-4 text-slate-500 dark:text-slate-400">
                <Markdown>{analysis.response.split('\n').slice(0, 6).join('\n')}</Markdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {!currentResult && state.analyses.length === 0 && hasApiKey && hasTransactions && (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Ready to Analyze</p>
          <p className="text-sm mt-1">Click "Analyze My Spending" to get AI-powered savings insights</p>
        </div>
      )}
    </div>
  );
}
