import { describe, expect, it } from 'vitest';
import { clearAllLearnedRules, deleteLearnedRule, getAllLearnedRules, learnFromTransactions, lookupLearnedRule } from './learnedRules';

describe('learnedRules service', () => {
  it('learns, retrieves, and deletes rules', () => {
    clearAllLearnedRules();
    learnFromTransactions([
      { description: 'Woolworths City', category: 'groceries', type: 'expense' },
      { description: 'Woolworths City', category: 'groceries', type: 'expense' },
    ]);

    const rule = lookupLearnedRule('woolworths city');
    expect(rule?.categoryId).toBe('groceries');
    expect(rule?.count).toBe(2);

    const all = getAllLearnedRules();
    expect(all.length).toBe(1);

    deleteLearnedRule('woolworths city');
    expect(lookupLearnedRule('woolworths city')).toBeUndefined();
  });
});
