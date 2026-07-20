import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { BudgetState, BudgetAction } from '../types';
import { loadState, saveState, getDefaultState } from '../services/storage';
import { applyTransactionRule, applyTransactionRules } from '../utils/transactionRules';

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, applyTransactionRule(action.payload, state.transactionRules || [])],
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
      };
    case 'SET_BUDGET_LIMIT': {
      const existing = state.budgetLimits.findIndex(
        bl => bl.categoryId === action.payload.categoryId && bl.month === action.payload.month
      );
      if (existing >= 0) {
        const limits = [...state.budgetLimits];
        limits[existing] = action.payload;
        return { ...state, budgetLimits: limits };
      }
      return { ...state, budgetLimits: [...state.budgetLimits, action.payload] };
    }
    case 'REMOVE_BUDGET_LIMIT':
      return {
        ...state,
        budgetLimits: state.budgetLimits.filter(
          bl => !(bl.categoryId === action.payload.categoryId && bl.month === action.payload.month)
        ),
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
        ),
      };
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
      };
    case 'BATCH_ADD_TRANSACTIONS':
      return {
        ...state,
        transactions: [...state.transactions, ...applyTransactionRules(action.payload, state.transactionRules || [])],
      };
    case 'BATCH_UPDATE_TRANSACTIONS': {
      const updates = new Map(action.payload.map(t => [t.id, t]));
      return {
        ...state,
        transactions: state.transactions.map(t => updates.get(t.id) || t),
      };
    }
    case 'ADD_ANALYSIS':
      return { ...state, analyses: [action.payload, ...state.analyses].slice(0, 20) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'IMPORT_DATA':
      return action.payload;
    case 'RESET_ALL':
      return getDefaultState();
    case 'ADD_RECURRING':
      return { ...state, recurringTransactions: [...(state.recurringTransactions || []), action.payload] };
    case 'UPDATE_RECURRING':
      return {
        ...state,
        recurringTransactions: (state.recurringTransactions || []).map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_RECURRING':
      return {
        ...state,
        recurringTransactions: (state.recurringTransactions || []).filter(r => r.id !== action.payload),
      };
    case 'ADD_SAVINGS_GOAL':
      return { ...state, savingsGoals: [...(state.savingsGoals || []), action.payload] };
    case 'UPDATE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: (state.savingsGoals || []).map(g =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case 'DELETE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: (state.savingsGoals || []).filter(g => g.id !== action.payload),
      };
    case 'ADD_GOAL_CONTRIBUTION':
      return {
        ...state,
        savingsGoals: (state.savingsGoals || []).map(g =>
          g.id === action.payload.goalId
            ? {
                ...g,
                currentAmount: Math.max(0, g.currentAmount + action.payload.amount),
                updatedAt: new Date().toISOString(),
              }
            : g
        ),
      };
    case 'ADD_DEBT_ACCOUNT':
      return { ...state, debtAccounts: [...(state.debtAccounts || []), action.payload] };
    case 'UPDATE_DEBT_ACCOUNT':
      return {
        ...state,
        debtAccounts: (state.debtAccounts || []).map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'DELETE_DEBT_ACCOUNT':
      return {
        ...state,
        debtAccounts: (state.debtAccounts || []).filter(d => d.id !== action.payload),
      };
    case 'ADD_ASSET_ACCOUNT':
      return { ...state, assetAccounts: [...(state.assetAccounts || []), action.payload] };
    case 'UPDATE_ASSET_ACCOUNT':
      return {
        ...state,
        assetAccounts: (state.assetAccounts || []).map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ASSET_ACCOUNT':
      return {
        ...state,
        assetAccounts: (state.assetAccounts || []).filter(a => a.id !== action.payload),
      };
    case 'ADD_TRANSACTION_RULE':
      return { ...state, transactionRules: [...(state.transactionRules || []), action.payload] };
    case 'UPDATE_TRANSACTION_RULE':
      return {
        ...state,
        transactionRules: (state.transactionRules || []).map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_TRANSACTION_RULE':
      return {
        ...state,
        transactionRules: (state.transactionRules || []).filter(r => r.id !== action.payload),
      };
    case 'ADD_BUDGET_TEMPLATE':
      return { ...state, budgetTemplates: [...(state.budgetTemplates || []), action.payload] };
    case 'UPDATE_BUDGET_TEMPLATE':
      return {
        ...state,
        budgetTemplates: (state.budgetTemplates || []).map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_BUDGET_TEMPLATE':
      return {
        ...state,
        budgetTemplates: (state.budgetTemplates || []).filter(t => t.id !== action.payload),
      };
    case 'ADD_SCHEDULED_ACTION':
      return { ...state, scheduledActions: [...(state.scheduledActions || []), action.payload] };
    case 'UPDATE_SCHEDULED_ACTION':
      return {
        ...state,
        scheduledActions: (state.scheduledActions || []).map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_SCHEDULED_ACTION':
      return {
        ...state,
        scheduledActions: (state.scheduledActions || []).filter(a => a.id !== action.payload),
      };
    case 'TOGGLE_SCHEDULED_ACTION':
      return {
        ...state,
        scheduledActions: (state.scheduledActions || []).map(a =>
          a.id === action.payload
            ? { ...a, completed: !a.completed, updatedAt: new Date().toISOString() }
            : a
        ),
      };
    case 'SNOOZE_SCHEDULED_ACTION':
      return {
        ...state,
        scheduledActions: (state.scheduledActions || []).map(a =>
          a.id === action.payload.id
            ? { ...a, snoozedUntil: action.payload.until, updatedAt: new Date().toISOString() }
            : a
        ),
      };
    case 'DISMISS_ALERT':
      return {
        ...state,
        dismissedAlertIds: state.dismissedAlertIds.includes(action.payload)
          ? state.dismissedAlertIds
          : [...state.dismissedAlertIds, action.payload],
      };
    case 'SNOOZE_ALERT':
      return {
        ...state,
        snoozedAlerts: { ...state.snoozedAlerts, [action.payload.id]: action.payload.until },
      };
    case 'RESTORE_ALL_ALERTS':
      return {
        ...state,
        dismissedAlertIds: [],
        snoozedAlerts: {},
      };
    default:
      return state;
  }
}

interface BudgetContextValue {
  state: BudgetState;
  dispatch: React.Dispatch<BudgetAction>;
  storageError: boolean;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(budgetReducer, null, loadState);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const ok = saveState(state);
      setStorageError(!ok);
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <BudgetContext.Provider value={{ state, dispatch, storageError }}>
      {storageError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-rose-600 text-white text-sm font-medium rounded-2xl shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Storage full — your latest changes could not be saved. Free up browser storage to continue.
        </div>
      )}
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
