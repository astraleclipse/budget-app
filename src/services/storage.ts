import type { BudgetState, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { format } from 'date-fns';

const STORAGE_KEY = 'budget-app:state';

function mergeWithDefaultCategories(categories: Category[]): Category[] {
  const savedIds = new Set(categories.map(c => c.id));
  return [
    ...categories,
    ...DEFAULT_CATEGORIES.filter(dc => !savedIds.has(dc.id)),
  ];
}

function normalizeState(data: Partial<BudgetState>): BudgetState {
  const defaults = getDefaultState();
  const categories = Array.isArray(data.categories) ? data.categories : [];

  return {
    ...defaults,
    ...data,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    categories: mergeWithDefaultCategories(categories),
    budgetLimits: Array.isArray(data.budgetLimits) ? data.budgetLimits : [],
    analyses: Array.isArray(data.analyses) ? data.analyses : [],
    recurringTransactions: Array.isArray(data.recurringTransactions) ? data.recurringTransactions : [],
    savingsGoals: Array.isArray(data.savingsGoals) ? data.savingsGoals : [],
    debtAccounts: Array.isArray(data.debtAccounts) ? data.debtAccounts : [],
    scheduledActions: Array.isArray(data.scheduledActions) ? data.scheduledActions : [],
    dismissedAlertIds: Array.isArray(data.dismissedAlertIds) ? data.dismissedAlertIds : [],
    snoozedAlerts: data.snoozedAlerts && typeof data.snoozedAlerts === 'object' ? data.snoozedAlerts : {},
    settings: { ...defaults.settings, ...data.settings },
  };
}

export function getDefaultState(): BudgetState {
  return {
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    budgetLimits: [],
    analyses: [],
    recurringTransactions: [],
    savingsGoals: [],
    debtAccounts: [],
    scheduledActions: [],
    dismissedAlertIds: [],
    snoozedAlerts: {},
    settings: {
      aiProvider: 'anthropic' as const,
      claudeApiKey: '',
      claudeModel: 'claude-sonnet-5',
      openAiApiKey: '',
      openAiModel: 'gpt-5.6',
      localAiBaseUrl: 'http://localhost:11434/v1',
      localAiModel: '',
      theme: 'light',
      currency: 'USD',
      budgetMode: 'monthly' as const,
    },
  };
}

export function loadState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<BudgetState>;
    return normalizeState(parsed);
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function exportData(state: BudgetState): boolean {
  let url: string | null = null;
  try {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2)],
      { type: 'application/json' }
    );
    url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    return true;
  } catch (e) {
    console.error('Failed to export data:', e);
    return false;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export function importData(json: string): BudgetState | null {
  try {
    const parsed = JSON.parse(json);
    const data = (parsed.data || parsed) as Partial<BudgetState>;
    if (!data.transactions || !Array.isArray(data.transactions)) return null;
    if (!data.categories || !Array.isArray(data.categories)) return null;
    return normalizeState(data);
  } catch {
    return null;
  }
}
