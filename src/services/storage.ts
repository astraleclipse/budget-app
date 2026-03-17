import type { BudgetState, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { format } from 'date-fns';

const STORAGE_KEY = 'budget-app:state';

export function getDefaultState(): BudgetState {
  return {
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    budgetLimits: [],
    analyses: [],
    settings: {
      claudeApiKey: '',
      claudeModel: 'claude-sonnet-4-5-20250929',
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
    const parsed = JSON.parse(raw);

    // Merge categories: keep all saved categories + add any new defaults that are missing
    const savedCategories: Category[] = parsed.categories || [];
    const savedIds = new Set(savedCategories.map((c: Category) => c.id));
    const mergedCategories = [
      ...savedCategories,
      ...DEFAULT_CATEGORIES.filter(dc => !savedIds.has(dc.id)),
    ];

    return {
      ...getDefaultState(),
      ...parsed,
      categories: mergedCategories,
      settings: { ...getDefaultState().settings, ...parsed.settings },
    };
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

export function exportData(state: BudgetState): void {
  const blob = new Blob(
    [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(json: string): BudgetState | null {
  try {
    const parsed = JSON.parse(json);
    const data = parsed.data || parsed;
    if (!data.transactions || !Array.isArray(data.transactions)) return null;
    if (!data.categories || !Array.isArray(data.categories)) return null;
    return {
      ...getDefaultState(),
      ...data,
      settings: { ...getDefaultState().settings, ...data.settings },
    };
  } catch {
    return null;
  }
}
