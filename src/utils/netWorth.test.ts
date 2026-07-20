import { describe, expect, it } from 'vitest';
import { getNetWorth, getTotalAssets, getTotalDebtBalance } from './netWorth';

describe('netWorth utils', () => {
  it('sums assets and debts and computes net worth', () => {
    const assets = [
      { id: 'a1', name: 'Cash', type: 'cash', value: 10000, createdAt: '', updatedAt: '' },
      { id: 'a2', name: 'Brokerage', type: 'investment', value: 25000, createdAt: '', updatedAt: '' },
    ] as const;
    const debts = [
      { id: 'd1', name: 'Card', balance: 3000, apr: 19, minimumPayment: 100, createdAt: '', updatedAt: '' },
      { id: 'd2', name: 'Loan', balance: 12000, apr: 8, minimumPayment: 200, createdAt: '', updatedAt: '' },
    ] as const;

    expect(getTotalAssets([...assets])).toBe(35000);
    expect(getTotalDebtBalance([...debts])).toBe(15000);
    expect(getNetWorth([...assets], [...debts])).toBe(20000);
  });
});
