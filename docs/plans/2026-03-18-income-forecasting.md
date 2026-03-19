# Income Forecasting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional per-category income forecasting that enriches the Budgets page, Dashboard, and AI Advisor.

**Architecture:** Reuse the existing `BudgetLimit` type for income forecasts — setting a budget limit on an income-type category means "expected income." A new utility function `getTotalExpectedIncome` aggregates these. The Budgets page gets a green-accented income section above expenses. Dashboard cards get contextual subtitles. The AI prompt includes forecast data.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Recharts, date-fns. No test framework — verify via `tsc --noEmit` and preview screenshots.

---

### Task 1: Add `getTotalExpectedIncome` utility

**Files:**
- Modify: `src/utils/calculations.ts` (append after `getLargestExpenses` at ~line 158)

**Step 1: Add the function**

Add to the end of `src/utils/calculations.ts`:

```typescript
/**
 * Sum effective budget limits for all income-type categories in a period.
 * Returns 0 if no income forecasts are set.
 */
export function getTotalExpectedIncome(
  budgetLimits: BudgetLimit[],
  categories: Category[],
  period: string,
  budgetMode: 'monthly' | 'yearly' = 'monthly'
): number {
  const incomeCategories = categories.filter(c => c.type === 'income');
  let total = 0;
  for (const cat of incomeCategories) {
    const limit = getEffectiveBudgetLimit(budgetLimits, cat.id, period, budgetMode);
    if (limit !== undefined && limit > 0) {
      total += limit;
    }
  }
  return total;
}
```

**Step 2: Verify types compile**

Run: `npx.cmd tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/utils/calculations.ts
git commit -m "feat: add getTotalExpectedIncome utility function"
```

---

### Task 2: Add Expected Income section to Budgets page

**Files:**
- Modify: `src/components/budgets/BudgetsPage.tsx`

**Context:** The Budgets page currently shows only expense categories in a grid. We need to add an "Expected Income" section above the expense grid. Income categories are: `state.categories.filter(c => c.type === 'income')`. The existing `BudgetLimit` infrastructure works for income categories — we just need to render cards for them.

**Step 1: Add income categories variable and totals**

Near line 54 where `expenseCategories` is defined, add an `incomeCategories` variable and income totals:

```typescript
const incomeCategories = state.categories.filter(c => c.type === 'income');
const incomeTotals = useMemo(
  () => getCategoryTotals(state.transactions, state.categories, state.budgetLimits, period, 'income', budgetMode),
  [state.transactions, state.categories, state.budgetLimits, period, budgetMode]
);
const incomeTotalMap = new Map(incomeTotals.map(ct => [ct.categoryId, ct]));
```

Also update the import to include `getCategoryTotals` (already imported).

**Step 2: Add the Expected Income section**

Insert between the "copy from previous" banner and the expense category grid (`<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">`). The section should have:

- A heading row: "Expected Income" with a green accent
- A 2-column card grid, same layout as expenses but with green-themed progress bars
- Cards use "Expected" instead of "Limit", "Received" instead of "Spent"
- Same inline name editing support (reuse `editingNameId` / `startEditingName` / `saveEditingName`)
- Same modal for setting expected amount (reuse `editCat` / `handleSetLimit` modal)

The income card JSX pattern:

```tsx
{/* Expected Income section */}
{incomeCategories.length > 0 && (
  <>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Expected Income</h2>
      <span className="text-xs text-slate-400 dark:text-slate-500">Optional — set forecasts per income source</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {incomeCategories.map(cat => {
        const data = incomeTotalMap.get(cat.id);
        const received = data?.total || 0;
        const expectedLimit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, period, budgetMode);
        const percent = expectedLimit ? (received / expectedLimit) * 100 : 0;
        const exactBudgetLimit = state.budgetLimits.find(
          bl => bl.categoryId === cat.id && bl.month === period && bl.month.length === expectedLen
        );
        const displayExpected = expectedLimit;

        return (
          <div
            key={cat.id}
            className="group card-hover bg-white dark:bg-slate-800/50 border border-emerald-200/40 dark:border-emerald-700/20 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-[20px] p-7 lg:p-8"
          >
            {/* Card header — same as expense cards but with income cat */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: cat.color + '18' }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                {/* Reuse inline name editing */}
                {editingNameId === cat.id ? (
                  <input ... /> {/* Same input as expense cards */}
                ) : (
                  <p onClick={() => startEditingName(cat.id, cat.name)} ...>
                    {cat.name} {/* pencil icon */}
                  </p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {data?.count || 0} transaction{(data?.count || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Card body */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Received: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(received)}</span>
                </span>
                {displayExpected !== undefined && displayExpected > 0 && (
                  <span className="text-slate-500 dark:text-slate-400">
                    of {formatCurrency(displayExpected)}
                    {!exactBudgetLimit && <span className="text-[11px] italic ml-1">inherited</span>}
                  </span>
                )}
              </div>

              {displayExpected !== undefined && displayExpected > 0 ? (
                <>
                  <ProgressBar percent={percent} />
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${percent >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatPercent(percent)} received
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditCat(cat.id); setLimitValue(...); }} className="text-xs font-medium text-emerald-600 hover:underline">
                        {exactBudgetLimit ? 'Edit' : 'Set'}
                      </button>
                      {exactBudgetLimit && (
                        <>
                          <span className="text-slate-200 dark:text-slate-700">|</span>
                          <button onClick={() => handleRemoveLimit(cat.id)} className="text-xs font-medium text-rose-600 hover:underline">Remove</button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <button onClick={() => { setEditCat(cat.id); setLimitValue(''); }} className="w-full py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors border border-dashed border-emerald-200 dark:border-emerald-700/40">
                  + Set Expected Income
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </>
)}
```

**Step 3: Update the modal title**

The existing modal shows "Set Budget Limit - CategoryName". When `editCat` is an income category, the title should say "Set Expected Income" instead. Update the Modal title:

```tsx
title={`${state.categories.find(c => c.id === editCat)?.type === 'income' ? 'Set Expected Income' : 'Set Budget Limit'} - ${state.categories.find(c => c.id === editCat)?.name || ''}`}
```

Also update the label inside the modal — change `limitLabel` usage to check if the category being edited is income:

```tsx
const editCatType = editCat ? state.categories.find(c => c.id === editCat)?.type : null;
const modalLimitLabel = editCatType === 'income'
  ? (isYearly ? 'Expected Yearly Income' : 'Expected Monthly Income')
  : limitLabel;
```

**Step 4: Add an "Expense Budgets" heading**

Above the existing expense grid, add a matching section heading so both sections have labels:

```tsx
<div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
    <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  </div>
  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Expense Budgets</h2>
</div>
```

**Step 5: Verify**

Run: `npx.cmd tsc --noEmit`
Expected: no errors

Start preview, navigate to Budgets page, take screenshot. Verify:
- Income section appears above expenses with green accent
- Cards show "Set Expected Income" button
- Click a card, modal says "Set Expected Income"

**Step 6: Commit**

```bash
git add src/components/budgets/BudgetsPage.tsx
git commit -m "feat: add Expected Income section to Budgets page"
```

---

### Task 3: Enhance Dashboard summary cards with forecasts

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`

**Context:** The Dashboard has 4 summary cards: Income, Expenses, Balance, Savings Rate. We need to add contextual subtitles to Income and Balance cards when income forecasts exist.

**Step 1: Import and compute expected income**

Add import for `getTotalExpectedIncome` from calculations. After line 87 where `savingsRate` is computed:

```typescript
import { ..., getTotalExpectedIncome } from '../../utils/calculations';

// After savingsRate calculation:
const expectedIncome = useMemo(
  () => getTotalExpectedIncome(state.budgetLimits, state.categories, selectedMonth, budgetMode),
  [state.budgetLimits, state.categories, selectedMonth, budgetMode]
);

// Compute total expense budgets for projected balance
const totalExpenseBudgets = useMemo(() => {
  const expenseCats = state.categories.filter(c => c.type === 'expense');
  let total = 0;
  for (const cat of expenseCats) {
    const limit = getEffectiveBudgetLimit(state.budgetLimits, cat.id, selectedMonth, budgetMode === 'yearly' ? 'yearly' : 'monthly');
    if (limit) {
      if (budgetMode === 'yearly') {
        total += limit / 12; // Show monthly portion for yearly mode
      } else {
        total += limit;
      }
    }
  }
  return total;
}, [state.categories, state.budgetLimits, selectedMonth, budgetMode]);

const projectedBalance = expectedIncome > 0 ? expectedIncome - totalExpenseBudgets : 0;
```

**Step 2: Add subtitle data to SUMMARY_CARDS rendering**

In the summary cards `.map()` render, after the value `<p>` tag, add conditional subtitles:

For the **Income** card (index 0): When `expectedIncome > 0`, show:
```tsx
{card.label === 'Income' && expectedIncome > 0 && (
  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
    of {formatCurrency(expectedIncome)} expected
  </p>
)}
```

For the **Balance** card (index 2): When `expectedIncome > 0`, show:
```tsx
{card.label === 'Balance' && expectedIncome > 0 && (
  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
    Projected: {formatCurrency(projectedBalance)}
  </p>
)}
```

**Step 3: Verify**

Run: `npx.cmd tsc --noEmit`
Expected: no errors

Set an expected income on the Budgets page, navigate to Dashboard, take screenshot. Verify:
- Income card shows "of $X expected" subtitle
- Balance card shows "Projected: $Z" subtitle
- Without any income forecasts set, no subtitles appear

**Step 4: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "feat: add income forecast annotations to Dashboard cards"
```

---

### Task 4: Update AI Advisor prompt with income forecasts

**Files:**
- Modify: `src/services/claude.ts`

**Step 1: Update the system prompt**

Add to `SYSTEM_PROMPT` (after the existing rules section, before the structure section):

```
- If expected income data is provided, analyze forecast vs. actual income, flag variances (received more or less than expected), and factor the forecast into savings recommendations and projected surplus/deficit
```

Add a new section to the response structure (after "## Summary"):

```
## Income Forecast (if applicable)
Expected vs. actual income, variance analysis
```

**Step 2: Update `buildAnalysisPrompt` to include income forecast data**

Import `getTotalExpectedIncome` and `getEffectiveBudgetLimit` (already imported). After the income totals section in the prompt builder (~line 88), add:

```typescript
// After incomeTotals section
const incomeCategories = categories.filter(c => c.type === 'income');
const incomeForecastLines: string[] = [];
let totalExpected = 0;
for (const cat of incomeCategories) {
  const expected = getEffectiveBudgetLimit(budgetLimits, cat.id, month, 'monthly');
  if (expected && expected > 0) {
    const actual = incomeTotals.find(i => i.categoryId === cat.id)?.total || 0;
    const pct = ((actual / expected) * 100).toFixed(0);
    incomeForecastLines.push(`- ${cat.name}: Expected ${formatCurrency(expected)}, Received ${formatCurrency(actual)} (${pct}%)`);
    totalExpected += expected;
  }
}

// Insert forecast section into prompt lines (after income section):
if (incomeForecastLines.length > 0) {
  lines.push('', '### Expected Income Forecast');
  lines.push(`Total Expected: ${formatCurrency(totalExpected)}`);
  lines.push(`Total Received: ${formatCurrency(totalIncome)}`);
  lines.push(`Variance: ${formatCurrency(totalIncome - totalExpected)} (${totalExpected > 0 ? ((totalIncome / totalExpected) * 100).toFixed(0) : 0}% of forecast)`);
  lines.push(...incomeForecastLines);
}
```

**Step 3: Verify**

Run: `npx.cmd tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add src/services/claude.ts
git commit -m "feat: include income forecasts in AI Advisor prompt"
```

---

### Task 5: Final verification and push

**Step 1: Full type check**

Run: `npx.cmd tsc --noEmit`
Expected: no errors

**Step 2: Visual verification via preview**

1. Navigate to Budgets page — verify income section appears with green cards
2. Set expected income for Salary (e.g., $5000)
3. Navigate to Dashboard — verify Income card shows "of $5,000.00 expected"
4. Verify Balance card shows "Projected: $X"
5. Navigate back to Budgets, verify the Salary card shows the set amount with progress

**Step 3: Push**

```bash
git push
```
