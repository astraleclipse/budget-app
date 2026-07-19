import type { DebtAccount } from '../types';

export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export interface DebtSnapshot {
  month: number;
  remainingTotal: number;
  interestPaidToDate: number;
  principalPaidToDate: number;
}

export interface DebtPlanResult {
  monthsToDebtFree: number;
  totalInterestPaid: number;
  payoffOrder: string[];
  snapshots: DebtSnapshot[];
}

interface DebtWorking {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

function sortDebts(list: DebtWorking[], strategy: DebtPayoffStrategy): DebtWorking[] {
  const arr = [...list];
  if (strategy === 'snowball') {
    arr.sort((a, b) => a.balance - b.balance || b.apr - a.apr);
  } else {
    arr.sort((a, b) => b.apr - a.apr || a.balance - b.balance);
  }
  return arr;
}

export function calculateDebtPlan(
  accounts: DebtAccount[],
  strategy: DebtPayoffStrategy,
  extraMonthlyPayment: number
): DebtPlanResult {
  const debts: DebtWorking[] = accounts
    .filter(d => d.balance > 0)
    .map(d => ({
      id: d.id,
      name: d.name,
      balance: d.balance,
      apr: d.apr,
      minimumPayment: Math.max(0, d.minimumPayment),
    }));

  if (debts.length === 0) {
    return {
      monthsToDebtFree: 0,
      totalInterestPaid: 0,
      payoffOrder: [],
      snapshots: [],
    };
  }

  const payoffOrder: string[] = [];
  const snapshots: DebtSnapshot[] = [];
  let month = 0;
  let interestPaid = 0;
  let principalPaid = 0;

  // Safety cap to prevent infinite loops in pathological input.
  while (month < 600 && debts.some(d => d.balance > 0.01)) {
    month += 1;

    // 1) Apply monthly interest.
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const monthlyRate = d.apr / 100 / 12;
      const monthInterest = d.balance * monthlyRate;
      d.balance += monthInterest;
      interestPaid += monthInterest;
    }

    // 2) Apply minimums first.
    let totalBudget = debts.reduce((sum, d) => sum + (d.balance > 0 ? d.minimumPayment : 0), 0) + Math.max(0, extraMonthlyPayment);
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const payment = Math.min(d.minimumPayment, d.balance, totalBudget);
      d.balance -= payment;
      totalBudget -= payment;
      principalPaid += payment;
    }

    // 3) Route extra to target debt according to strategy.
    while (totalBudget > 0.01) {
      const active = sortDebts(debts.filter(d => d.balance > 0.01), strategy);
      if (active.length === 0) break;
      const target = active[0];
      const payment = Math.min(target.balance, totalBudget);
      target.balance -= payment;
      totalBudget -= payment;
      principalPaid += payment;
      if (target.balance <= 0.01 && !payoffOrder.includes(target.name)) {
        payoffOrder.push(target.name);
      }
    }

    // 4) Capture newly cleared debts (from minimum payments only path).
    for (const d of debts) {
      if (d.balance <= 0.01 && !payoffOrder.includes(d.name)) {
        payoffOrder.push(d.name);
      }
    }

    const remainingTotal = debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
    snapshots.push({
      month,
      remainingTotal,
      interestPaidToDate: interestPaid,
      principalPaidToDate: principalPaid,
    });
  }

  return {
    monthsToDebtFree: snapshots.length,
    totalInterestPaid: interestPaid,
    payoffOrder,
    snapshots,
  };
}
