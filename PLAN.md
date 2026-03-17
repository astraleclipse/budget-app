# Monthly vs Yearly Budget Mode Implementation Plan

## Summary
Add a setting to toggle between monthly and yearly budget modes. Budgets will be stored with the appropriate period key ("yyyy-MM" for monthly, "yyyy" for yearly). The BudgetsPage gets full period navigation and a "Copy from previous" button. Dashboard adapts to show the correct budget comparison (yearly budgets pro-rated to /12 for monthly chart view).

## Files to Change (in order)

### 1. `src/types/index.ts` — Add `budgetMode` to AppSettings
- Add `budgetMode: 'monthly' | 'yearly'` to `AppSettings`

### 2. `src/services/storage.ts` — Default `budgetMode: 'monthly'`
- Add to `getDefaultState()` settings. Existing users auto-get `'monthly'` via spread merge.

### 3. `src/utils/formatters.ts` — Add year formatting helpers
- `getCurrentYear()` → `"2026"`
- `getCurrentPeriod(mode)` → returns month or year string

### 4. `src/utils/calculations.ts` — Mode-aware budget resolution
- Rewrite `getEffectiveBudgetLimit` to accept `mode` param; filter limits by string length (4=yearly, 7=monthly)
- Update `getCategoryTotals` to accept `budgetMode` param, use `getTransactionsForYear()` when yearly
- Add `getTransactionsForYear()` helper

### 5. `src/components/settings/SettingsPage.tsx` — Budget mode toggle
- New section with Monthly/Yearly toggle buttons between "Data Storage" and "Learned Rules"

### 6. `src/components/budgets/BudgetsPage.tsx` — Major rewrite
- Add period navigation (month arrows in monthly mode, year arrows in yearly mode)
- Period dropdown showing available months or years
- "Copy from previous" button when current period has no budgets
- Spending shown as month total (monthly mode) or year-to-date total (yearly mode)
- Label changes: "Monthly Limit" vs "Yearly Limit"

### 7. `src/components/dashboard/Dashboard.tsx` — Mode-aware budget lookup
- `getEffectiveBudget` filters by mode, divides yearly budgets by 12 for monthly chart
- Pass `budgetMode` to `getCategoryTotals`
- Show "(yearly budget / 12)" note on chart title when in yearly mode
