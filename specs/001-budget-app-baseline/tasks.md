---
description: "Task list for budget-app baseline — marks the as-built feature set as complete"
---

# Tasks: Budget App — Baseline

**Input**: Design documents from `specs/001-budget-app-baseline/`

**Prerequisites**: plan.md ✅, spec.md ✅

**Note**: This task list represents the already-implemented state of the application.
All Phase 1–3 tasks are complete. Run `/speckit.converge` to surface any remaining gaps.

## Phase 1: Core Infrastructure (Complete)

- [x] T001 Define all domain types in `src/types/index.ts`
- [x] T002 Implement `BudgetState` reducer and React Context in `src/context/BudgetContext.tsx`
- [x] T003 Implement localStorage persistence in `src/services/storage.ts`
- [x] T004 Implement JSON backup export and import in `src/services/storage.ts`
- [x] T005 Implement category defaults in `src/constants/categories.ts`
- [x] T006 Configure Vite, TypeScript strict mode, Tailwind CSS, Vitest

## Phase 2: Financial Core (Complete)

- [x] T007 [US1] Implement Dashboard with KPI cards, budget chart, trend chart in `src/components/dashboard/Dashboard.tsx`
- [x] T008 [US1] Add month navigation and period selector to Dashboard
- [x] T009 [US2] Implement transaction ledger with add/edit/delete in `src/components/transactions/`
- [x] T010 [US2] Implement bulk category update by description and learned-rules integration
- [x] T011 [US3] Implement budget limits with progress bars in `src/components/budgets/BudgetsPage.tsx`
- [x] T012 [US3] Implement copy-budgets-from-period dropdown
- [x] T013 [US3] Implement copy-forward-N-months with overwrite warning
- [x] T014 [US3] Implement budget templates (save and apply)
- [x] T015 [US3] Implement monthly/yearly budget mode in `src/types/index.ts` and `src/services/storage.ts`
- [x] T016 [US14] Implement Settings page with AI provider config, theme toggle, category management in `src/components/settings/SettingsPage.tsx`

## Phase 3: Extended Features (Complete)

- [x] T017 [US4] Implement multi-provider AI service in `src/services/ai.ts`
- [x] T018 [US4] Implement AI Advisor panel with provider selector in `src/components/ai-advisor/AiAdvisorPanel.tsx`
- [x] T019 [US5] Implement cashflow calendar with risk detection in `src/components/cashflow/CashflowCalendarPage.tsx`
- [x] T020 [US6] Implement debt planner with Avalanche/Snowball and stress test in `src/components/debt/DebtPlannerPage.tsx`
- [x] T021 [US7] Implement savings goals with contribution tracking in `src/components/goals/GoalsPage.tsx`
- [x] T022 [US8] Implement net worth with asset accounts in `src/components/net-worth/NetWorthPage.tsx`
- [x] T023 [US9] Implement recurring transactions registry in `src/components/recurring/RecurringPage.tsx`
- [x] T024 [US10] Implement transaction rules engine in `src/components/rules/TransactionRulesPage.tsx`
- [x] T025 [US11] Implement CSV import with staging, duplicate detection, and confidence levels in `src/components/import/CsvImportPage.tsx`
- [x] T026 [US12] Implement alerts inbox and action scheduler in `src/components/alerts/` and `src/components/actions/`
- [x] T027 [US13] Implement income forecast page in `src/components/income/IncomeForecastPage.tsx`
- [x] T028 [US1] Implement What-If Simulator with reset on Dashboard
- [x] T029 [US1] Implement Merchant Insights, Budget Drift, Fortnightly Brief on Dashboard
- [x] T030 Implement utility unit tests for all `src/utils/` and `src/services/` modules

## Dependencies & Execution Order

All phases complete. Run `/speckit.converge` to identify any remaining gaps.

---

## Phase 4: Convergence

| ID | Gap Type | Severity | Source | Evidence | Remaining Work |
|----|----------|----------|--------|----------|----------------|
| F1 | partial | CRITICAL | Constitution I | `saveState()` in `src/services/storage.ts:91` and `saveLearnedRules()` in `src/services/learnedRules.ts:32` silently swallow `QuotaExceededError` via `console.error` only — user sees no notification when data fails to persist | Surface localStorage write errors to the user |
| F2 | partial | MEDIUM | spec entity `AiAnalysis`, US4/AC3 | `AiAnalysis` in `src/types/index.ts` has no `provider` field; `AiAdvisorPanel.tsx:36` dispatches `ADD_ANALYSIS` without recording the provider used; Previous Analyses list cannot show which provider generated each result | Add `provider` field to `AiAnalysis` type and persist it |
| F3 | missing | LOW | spec entity `Transaction` | `Transaction` interface in `src/types/index.ts` has no `notes` field; add/edit transaction modal has no notes input | Add optional `notes` field to `Transaction` and surface it in the form |
| F4 | missing | LOW | spec entity `DebtAccount` | `DebtAccount` interface in `src/types/index.ts` has no `notes` field; add/edit debt modal has no notes input | Add optional `notes` field to `DebtAccount` and surface it in the form |

**Summary metrics:**
- FR / acceptance criteria checked: 20 FRs, 38 acceptance scenarios, 7 edge cases
- Plan decisions checked: 12 architecture touch-points
- Constitution principles checked: I–VI (all 6)
- Findings: 1 partial (CRITICAL), 1 partial (MEDIUM), 2 missing (LOW)
- Total: 4 findings

- [x] T031 Surface localStorage write errors to the user — update `saveState()` in `src/services/storage.ts` to throw or return a boolean, and `saveLearnedRules()` in `src/services/learnedRules.ts` likewise; add a visible toast or banner in `src/context/BudgetContext.tsx` (or a global error boundary) when persistence fails per Constitution I (partial)
- [x] T032 Add `provider: AiProvider` field to `AiAnalysis` interface in `src/types/index.ts`; update `AiAdvisorPanel.tsx` `ADD_ANALYSIS` dispatch to include `provider: effectiveProvider`; show provider label in the Previous Analyses list timestamp line per spec entity `AiAnalysis` and US4/AC3 (partial)
- [x] T033 Add optional `notes?: string` field to `Transaction` interface in `src/types/index.ts`; add a notes textarea to the add/edit transaction modal per spec entity `Transaction` (missing)
- [x] T034 Add optional `notes?: string` field to `DebtAccount` interface in `src/types/index.ts`; add a notes textarea to the add/edit debt modal per spec entity `DebtAccount` (missing)
