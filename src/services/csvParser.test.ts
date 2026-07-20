import { describe, expect, it } from 'vitest';
import { categorizeTransaction, parseCsv, processImportedCsv } from './csvParser';
import { getCategories } from '../test/fixtures';

describe('csvParser service', () => {
  it('parses csv rows', () => {
    const csv = `Date,Account,Description,Credit,Debit\n20/07/2026,Everyday,Salary Deposit,5000,0\n21/07/2026,Everyday,Woolworths,0,120`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].credit).toBe(5000);
    expect(rows[1].debit).toBe(120);
  });

  it('categorizes by known rules and transfer keywords', () => {
    const categories = getCategories();
    const salary = categorizeTransaction('Salary Deposit', 3000, 0, categories);
    expect(salary.categoryId).toBe('salary');
    expect(salary.type).toBe('income');

    const transfer = categorizeTransaction('Internal transfer to savings', 0, 100, categories);
    expect(transfer.categoryId).toBe('internal-transfer');
    expect(transfer.type).toBe('transfer');
  });

  it('processes imported csv into staged transactions', () => {
    const csv = `Date,Account,Description,Credit,Debit\n20/07/2026,Everyday,Salary Deposit,5000,0\n21/07/2026,Everyday,Woolworths Norwood,0,120`;
    const staged = processImportedCsv(csv, getCategories());
    expect(staged).toHaveLength(2);
    expect(staged[0].date).toBe('2026-07-20');
    expect(staged[0].type).toBe('income');
    expect(staged[1].category).toBe('groceries');
  });
});
