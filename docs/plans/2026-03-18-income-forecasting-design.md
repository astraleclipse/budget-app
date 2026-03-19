# Income Forecasting Design

## Overview

Add optional income forecasting to the Budget Manager app. Users can set expected income per income category on the Budgets page. When present, forecasts enhance the Dashboard summary cards and AI Advisor analysis.

## Data Model

No new types. Reuse `BudgetLimit` — setting a budget limit on an income category (type `'income'`) acts as an expected income forecast. All existing infrastructure (`SET_BUDGET_LIMIT`, `REMOVE_BUDGET_LIMIT`, `getEffectiveBudgetLimit`, inheritance, copy-from-previous) works unchanged.

## Budgets Page

- **Separate "Expected Income" section** above the expense budget grid
- Green-accented cards matching income category colors
- Same card interaction: click to set/edit expected amount, inline name editing
- Labels adapted: "Expected" instead of "Limit", "Received" instead of "Spent"
- Progress bar shows percentage received (green-themed)
- Same period-aware behavior (monthly/yearly), same copy-from-previous support
- Section heading: "Expected Income" with a collapsible/visible toggle or always visible

## Dashboard

Contextual annotations on existing summary cards (no layout changes):

- **Income card**: When any income forecast exists, show subtitle "of $X expected" below actual income
- **Balance card**: When forecast exists, show subtitle "Projected: $Z" (expected income minus total expense budgets)

## AI Advisor

- **Prompt data**: Add "Expected Income" section to `buildAnalysisPrompt` with per-category forecasts and actual vs. expected percentages
- **System prompt**: Add instruction to analyze income forecast vs. actuals when data is present, flag variances, and factor into savings recommendations

## Calculations

- New helper: `getTotalExpectedIncome(budgetLimits, categories, period, budgetMode)` — sums effective budget limits for all income-type categories in the given period
- Reuses `getEffectiveBudgetLimit` for per-category lookups (already supports period inheritance)

## Files to Modify

1. `src/utils/calculations.ts` — add `getTotalExpectedIncome`
2. `src/components/budgets/BudgetsPage.tsx` — add income section above expenses
3. `src/components/dashboard/Dashboard.tsx` — annotate Income and Balance cards
4. `src/services/claude.ts` — update prompt builder and system prompt
