import { DEFAULT_CATEGORIES } from '../constants/categories';
import type { AppSettings, BudgetLimit, BudgetState, Category, DebtAccount, Transaction } from '../types';

export const baseSettings: AppSettings = {
  aiProvider: 'anthropic',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-5',
  openAiApiKey: '',
  openAiModel: 'gpt-5.6',
  localAiBaseUrl: 'http://localhost:11434/v1',
  localAiModel: '',
  theme: 'light',
  currency: 'USD',
  budgetMode: 'monthly',
};

export function getCategories(): Category[] {
  return [...DEFAULT_CATEGORIES];
}

export function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'category' | 'date'>): Transaction {
  const now = new Date('2026-07-01T00:00:00.000Z').toISOString();
  return {
    description: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function budgetLimit(categoryId: string, month: string, monthlyLimit: number): BudgetLimit {
  return { categoryId, month, monthlyLimit };
}

export function debtAccount(partial: Partial<DebtAccount> & Pick<DebtAccount, 'id' | 'name' | 'balance' | 'apr' | 'minimumPayment'>): DebtAccount {
  const now = new Date('2026-07-01T00:00:00.000Z').toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function budgetState(overrides: Partial<BudgetState> = {}): BudgetState {
  return {
    transactions: [],
    categories: getCategories(),
    budgetLimits: [],
    analyses: [],
    settings: { ...baseSettings },
    recurringTransactions: [],
    savingsGoals: [],
    debtAccounts: [],
    assetAccounts: [],
    transactionRules: [],
    budgetTemplates: [],
    scheduledActions: [],
    dismissedAlertIds: [],
    snoozedAlerts: {},
    ...overrides,
  };
}
