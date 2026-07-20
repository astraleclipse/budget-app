export type TransactionType = 'income' | 'expense' | 'transfer';
export type AssetAccountType = 'cash' | 'investment' | 'property' | 'vehicle' | 'other';
export type TransactionRuleMatchMode = 'contains' | 'startsWith' | 'equals';

export type RecurringFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: RecurringFrequency;
  startDate: string;       // 'yyyy-MM-dd'
  nextDueDate: string;     // 'yyyy-MM-dd'
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // 'yyyy-MM-dd'
  monthlyContributionTarget: number;
  linkedCategoryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtAccount {
  id: string;
  name: string;
  balance: number;
  apr: number; // annual percentage rate (e.g. 18.5)
  minimumPayment: number;
  paymentDueDay?: number; // 1-31
  createdAt: string;
  updatedAt: string;
}

export interface AssetAccount {
  id: string;
  name: string;
  type: AssetAccountType;
  value: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRule {
  id: string;
  name: string;
  matchText: string;
  matchMode: TransactionRuleMatchMode;
  categoryId: string;
  type: TransactionType;
  renameTo?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetTemplateLine {
  categoryId: string;
  monthlyLimit: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  budgetMode: 'monthly' | 'yearly';
  lines: BudgetTemplateLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledAction {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // 'yyyy-MM-dd'
  completed: boolean;
  snoozedUntil?: string; // 'yyyy-MM-dd'
  source?: 'manual' | 'alert' | 'ai';
  createdAt: string;
  updatedAt: string;
}

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

export type AiProvider = 'anthropic' | 'openai' | 'local';

export interface AppSettings {
  aiProvider: AiProvider;
  claudeApiKey: string;
  claudeModel: string;
  openAiApiKey: string;
  openAiModel: string;
  localAiBaseUrl: string;
  localAiModel: string;
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
  recurringTransactions: RecurringTransaction[];
  savingsGoals: SavingsGoal[];
  debtAccounts: DebtAccount[];
  assetAccounts: AssetAccount[];
  transactionRules: TransactionRule[];
  budgetTemplates: BudgetTemplate[];
  scheduledActions: ScheduledAction[];
  dismissedAlertIds: string[];
  snoozedAlerts: Record<string, string>; // alertId -> snoozedUntil (yyyy-MM-dd)
}

export type BudgetAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_BUDGET_LIMIT'; payload: BudgetLimit }
  | { type: 'REMOVE_BUDGET_LIMIT'; payload: { categoryId: string; month: string } }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; changes: Partial<Omit<Category, 'id'>> } }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'ADD_ANALYSIS'; payload: AiAnalysis }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'BATCH_ADD_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'BATCH_UPDATE_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'IMPORT_DATA'; payload: BudgetState }
  | { type: 'RESET_ALL' }
  | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
  | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
  | { type: 'DELETE_RECURRING'; payload: string }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  | { type: 'ADD_GOAL_CONTRIBUTION'; payload: { goalId: string; amount: number } }
  | { type: 'ADD_DEBT_ACCOUNT'; payload: DebtAccount }
  | { type: 'UPDATE_DEBT_ACCOUNT'; payload: DebtAccount }
  | { type: 'DELETE_DEBT_ACCOUNT'; payload: string }
  | { type: 'ADD_ASSET_ACCOUNT'; payload: AssetAccount }
  | { type: 'UPDATE_ASSET_ACCOUNT'; payload: AssetAccount }
  | { type: 'DELETE_ASSET_ACCOUNT'; payload: string }
  | { type: 'ADD_TRANSACTION_RULE'; payload: TransactionRule }
  | { type: 'UPDATE_TRANSACTION_RULE'; payload: TransactionRule }
  | { type: 'DELETE_TRANSACTION_RULE'; payload: string }
  | { type: 'ADD_BUDGET_TEMPLATE'; payload: BudgetTemplate }
  | { type: 'UPDATE_BUDGET_TEMPLATE'; payload: BudgetTemplate }
  | { type: 'DELETE_BUDGET_TEMPLATE'; payload: string }
  | { type: 'ADD_SCHEDULED_ACTION'; payload: ScheduledAction }
  | { type: 'UPDATE_SCHEDULED_ACTION'; payload: ScheduledAction }
  | { type: 'DELETE_SCHEDULED_ACTION'; payload: string }
  | { type: 'TOGGLE_SCHEDULED_ACTION'; payload: string }
  | { type: 'SNOOZE_SCHEDULED_ACTION'; payload: { id: string; until: string } }
  | { type: 'DISMISS_ALERT'; payload: string }
  | { type: 'SNOOZE_ALERT'; payload: { id: string; until: string } }
  | { type: 'RESTORE_ALL_ALERTS' };
