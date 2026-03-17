export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
  isDefault: boolean;
}

export interface BudgetLimit {
  categoryId: string;
  monthlyLimit: number;
  /** Period key: "yyyy-MM" for monthly budgets, "yyyy" for yearly budgets */
  month: string;
}

export interface AiAnalysis {
  id: string;
  timestamp: string;
  month: string;
  response: string;
}

export interface AppSettings {
  claudeApiKey: string;
  claudeModel: string;
  theme: 'light' | 'dark';
  currency: string;
  budgetMode: 'monthly' | 'yearly';
}

export interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  budgetLimits: BudgetLimit[];
  analyses: AiAnalysis[];
  settings: AppSettings;
}

export type BudgetAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_BUDGET_LIMIT'; payload: BudgetLimit }
  | { type: 'REMOVE_BUDGET_LIMIT'; payload: { categoryId: string; month: string } }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'ADD_ANALYSIS'; payload: AiAnalysis }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'BATCH_ADD_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'BATCH_UPDATE_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'IMPORT_DATA'; payload: BudgetState }
  | { type: 'RESET_ALL' };
