import { describe, expect, it } from 'vitest';
import { applyTransactionRule, applyTransactionRules, countRuleMatches, getMatchingRule, normalizeRuleText } from './transactionRules';
import { tx } from '../test/fixtures';

describe('transactionRules utils', () => {
  const rules = [
    {
      id: 'r1',
      name: 'Groceries',
      matchText: 'woolworths',
      matchMode: 'contains',
      categoryId: 'groceries',
      type: 'expense',
      active: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'r2',
      name: 'Salary',
      matchText: 'PAYROLL',
      matchMode: 'startsWith',
      categoryId: 'salary',
      type: 'income',
      renameTo: 'Salary payment',
      active: true,
      createdAt: '',
      updatedAt: '',
    },
  ] as const;

  it('normalizes text and matches rules', () => {
    expect(normalizeRuleText('  Hello ')).toBe('hello');
    expect(getMatchingRule('Woolworths Norwood', [...rules])?.id).toBe('r1');
    expect(getMatchingRule('PAYROLL AUG', [...rules])?.id).toBe('r2');
  });

  it('applies single and batch rule transforms', () => {
    const a = tx({ id: '1', type: 'expense', amount: 20, category: 'other-expense', description: 'Woolworths City', date: '2026-07-01' });
    const b = tx({ id: '2', type: 'income', amount: 3000, category: 'other-income', description: 'PAYROLL JUL', date: '2026-07-01' });

    const appliedA = applyTransactionRule(a, [...rules]);
    expect(appliedA.category).toBe('groceries');

    const applied = applyTransactionRules([a, b], [...rules]);
    expect(applied[1].description).toBe('Salary payment');
    expect(applied[1].category).toBe('salary');
  });

  it('counts rule matches', () => {
    const transactions = [
      tx({ id: '1', type: 'expense', amount: 10, category: 'other-expense', description: 'Woolworths A', date: '2026-07-01' }),
      tx({ id: '2', type: 'expense', amount: 11, category: 'other-expense', description: 'Woolworths B', date: '2026-07-02' }),
      tx({ id: '3', type: 'expense', amount: 12, category: 'other-expense', description: 'Coles', date: '2026-07-03' }),
    ];
    expect(countRuleMatches(transactions, rules[0])).toBe(2);
  });
});
