import type { Transaction, TransactionRule } from '../types';

export function normalizeRuleText(value: string): string {
  return value.toLowerCase().trim();
}

function matchesRule(description: string, rule: TransactionRule): boolean {
  const normalizedDescription = normalizeRuleText(description);
  const normalizedMatch = normalizeRuleText(rule.matchText);

  if (!normalizedDescription || !normalizedMatch) return false;

  if (rule.matchMode === 'equals') return normalizedDescription === normalizedMatch;
  if (rule.matchMode === 'startsWith') return normalizedDescription.startsWith(normalizedMatch);
  return normalizedDescription.includes(normalizedMatch);
}

export function getMatchingRule(description: string, rules: TransactionRule[]): TransactionRule | undefined {
  return rules.find(rule => rule.active && matchesRule(description, rule));
}

export function applyTransactionRule(transaction: Transaction, rules: TransactionRule[]): Transaction {
  const rule = getMatchingRule(transaction.description, rules);
  if (!rule) return transaction;

  return {
    ...transaction,
    type: rule.type,
    category: rule.categoryId,
    description: rule.renameTo?.trim() ? rule.renameTo.trim() : transaction.description,
  };
}

export function applyTransactionRules(transactions: Transaction[], rules: TransactionRule[]): Transaction[] {
  return transactions.map(transaction => applyTransactionRule(transaction, rules));
}

export function countRuleMatches(transactions: Transaction[], rule: TransactionRule): number {
  return transactions.filter(transaction => rule.active && matchesRule(transaction.description, rule)).length;
}
