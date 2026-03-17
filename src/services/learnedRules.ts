import type { TransactionType } from '../types';

export interface LearnedRule {
  description: string;   // lowercase cleaned description (the visible one)
  categoryId: string;
  type: TransactionType;
  learnedAt: string;     // ISO timestamp
  count: number;         // how many times this rule was applied
}

const STORAGE_KEY = 'budget-app:learned-rules';

export function loadLearnedRules(): Map<string, LearnedRule> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr: LearnedRule[] = JSON.parse(raw);
    const map = new Map<string, LearnedRule>();
    for (const rule of arr) {
      map.set(rule.description, rule);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function saveLearnedRules(rules: Map<string, LearnedRule>): void {
  try {
    const arr = Array.from(rules.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Failed to save learned rules:', e);
  }
}

/**
 * Learn from user corrections during CSV import.
 * Saves the description → category/type mapping so future imports
 * automatically use the user's preference.
 */
export function learnFromTransactions(
  transactions: Array<{ description: string; category: string; type: TransactionType }>
): void {
  const rules = loadLearnedRules();

  for (const tx of transactions) {
    const key = tx.description.toLowerCase().trim();
    if (!key) continue;

    const existing = rules.get(key);
    rules.set(key, {
      description: key,
      categoryId: tx.category,
      type: tx.type,
      learnedAt: new Date().toISOString(),
      count: (existing?.count || 0) + 1,
    });
  }

  saveLearnedRules(rules);
}

/**
 * Look up a learned rule for a given description.
 * Returns the rule if found, or undefined.
 */
export function lookupLearnedRule(description: string): LearnedRule | undefined {
  const rules = loadLearnedRules();
  return rules.get(description.toLowerCase().trim());
}

/**
 * Get all learned rules sorted by most recently learned.
 */
export function getAllLearnedRules(): LearnedRule[] {
  const rules = loadLearnedRules();
  return Array.from(rules.values()).sort((a, b) =>
    b.learnedAt.localeCompare(a.learnedAt)
  );
}

/**
 * Delete a single learned rule by description key.
 */
export function deleteLearnedRule(description: string): void {
  const rules = loadLearnedRules();
  rules.delete(description.toLowerCase().trim());
  saveLearnedRules(rules);
}

/**
 * Clear all learned rules.
 */
export function clearAllLearnedRules(): void {
  localStorage.removeItem(STORAGE_KEY);
}
