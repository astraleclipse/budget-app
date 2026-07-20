import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt } from './claude';
import { budgetLimit, getCategories, tx } from '../test/fixtures';

describe('claude service', () => {
  it('builds analysis prompt with key sections and metrics', () => {
    const categories = getCategories();
    const transactions = [
      tx({ id: 'i1', type: 'income', amount: 4000, category: 'salary', description: 'Salary', date: '2026-07-01' }),
      tx({ id: 'e1', type: 'expense', amount: 900, category: 'rent', description: 'Rent', date: '2026-07-02' }),
      tx({ id: 'e2', type: 'expense', amount: 300, category: 'groceries', description: 'Woolworths', date: '2026-07-03' }),
    ];
    const limits = [
      budgetLimit('salary', '2026-07', 4200),
      budgetLimit('rent', '2026-07', 1000),
      budgetLimit('groceries', '2026-07', 450),
    ];

    const prompt = buildAnalysisPrompt(transactions, categories, limits, '2026-07');
    expect(prompt).toContain('### Income');
    expect(prompt).toContain('### Expected Income Forecast');
    expect(prompt).toContain('### Expenses by Category');
    expect(prompt).toContain('### Top 5 Largest Expenses This Month');
    expect(prompt).toContain('Total Income: $4,000.00');
  });
});
