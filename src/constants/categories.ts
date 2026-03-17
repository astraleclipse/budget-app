import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', icon: '\u{1F4B0}', color: '#22c55e', type: 'income', isDefault: true },
  { id: 'freelance', name: 'Freelance', icon: '\u{1F4BB}', color: '#16a34a', type: 'income', isDefault: true },
  { id: 'investments', name: 'Investments', icon: '\u{1F4C8}', color: '#15803d', type: 'income', isDefault: true },
  { id: 'other-income', name: 'Other Income', icon: '\u{1F4B5}', color: '#14532d', type: 'income', isDefault: true },
  { id: 'rent', name: 'Rent/Mortgage', icon: '\u{1F3E0}', color: '#ef4444', type: 'expense', isDefault: true },
  { id: 'groceries', name: 'Groceries', icon: '\u{1F6D2}', color: '#f97316', type: 'expense', isDefault: true },
  { id: 'dining', name: 'Dining Out', icon: '\u{1F37D}\u{FE0F}', color: '#f59e0b', type: 'expense', isDefault: true },
  { id: 'transport', name: 'Transport', icon: '\u{1F697}', color: '#eab308', type: 'expense', isDefault: true },
  { id: 'utilities', name: 'Utilities', icon: '\u{1F4A1}', color: '#84cc16', type: 'expense', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: '\u{1F3AC}', color: '#06b6d4', type: 'expense', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', icon: '\u{1F4F1}', color: '#8b5cf6', type: 'expense', isDefault: true },
  { id: 'healthcare', name: 'Healthcare', icon: '\u{1F3E5}', color: '#ec4899', type: 'expense', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: '\u{1F6CD}\u{FE0F}', color: '#14b8a6', type: 'expense', isDefault: true },
  { id: 'education', name: 'Education', icon: '\u{1F4DA}', color: '#6366f1', type: 'expense', isDefault: true },
  { id: 'savings-invest', name: 'Savings/Invest', icon: '\u{1F3E6}', color: '#0ea5e9', type: 'expense', isDefault: true },
  { id: 'debt', name: 'Debt Repayment', icon: '\u{1F4B3}', color: '#dc2626', type: 'expense', isDefault: true },
  { id: 'insurance', name: 'Insurance', icon: '\u{1F6E1}\u{FE0F}', color: '#7c3aed', type: 'expense', isDefault: true },
  { id: 'child-support', name: 'Child Support', icon: '\u{1F476}', color: '#e879f9', type: 'expense', isDefault: true },
  { id: 'other-expense', name: 'Other', icon: '\u{1F4CB}', color: '#6b7280', type: 'expense', isDefault: true },
  { id: 'internal-transfer', name: 'Internal Transfer', icon: '\u{1F504}', color: '#94a3b8', type: 'both', isDefault: true },
];

export const SPENDING_BENCHMARKS = {
  needs: 0.50,
  wants: 0.30,
  savings: 0.20,
  categoryBenchmarks: {
    rent: { pct: 0.28, label: 'Housing ~28% of income' },
    groceries: { pct: 0.10, label: 'Groceries ~10% of income' },
    dining: { pct: 0.05, label: 'Dining out ~5% of income' },
    transport: { pct: 0.10, label: 'Transport ~10% of income' },
    utilities: { pct: 0.05, label: 'Utilities ~5% of income' },
    entertainment: { pct: 0.05, label: 'Entertainment ~5% of income' },
    subscriptions: { pct: 0.03, label: 'Subscriptions ~3% of income' },
  } as Record<string, { pct: number; label: string }>,
};
