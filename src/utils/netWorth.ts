import type { AssetAccount, DebtAccount } from '../types';

export function getTotalAssets(assetAccounts: AssetAccount[]): number {
  return assetAccounts.reduce((sum, account) => sum + account.value, 0);
}

export function getTotalDebtBalance(debtAccounts: DebtAccount[]): number {
  return debtAccounts.reduce((sum, account) => sum + account.balance, 0);
}

export function getNetWorth(assetAccounts: AssetAccount[], debtAccounts: DebtAccount[]): number {
  return getTotalAssets(assetAccounts) - getTotalDebtBalance(debtAccounts);
}
