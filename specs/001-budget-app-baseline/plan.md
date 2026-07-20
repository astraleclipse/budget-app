# Implementation Plan: Budget App — Baseline

**Branch**: `astraleclipse-multi-provider-ai` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Existing codebase — this plan documents the as-built architecture.

## Summary

Budget App is a fully client-side personal finance manager built with React 19 + TypeScript + Vite.
All state lives in `localStorage` via a single `BudgetState` object managed by a React Context
reducer. There is no backend. AI calls go directly from the browser to the configured provider.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict)

**Primary Dependencies**: React 19, Vite 7, Tailwind CSS 4, Recharts 3, date-fns 4, uuid 13

**Storage**: `localStorage` — single key `budget-app:state` (JSON-serialised `BudgetState`);
separate key `budget-app:learned-rules` for description→category memory;
separate key `budget-app:staged` for in-progress CSV imports.

**Testing**: Vitest 4 — co-located `.test.ts` files in `src/utils/` and `src/services/`.

**Target Platform**: Modern browsers (Chromium, Firefox, Safari) — desktop primary.

**Project Type**: Single-page web app (SPA)

**Performance Goals**: UI interactions respond within 200ms for datasets up to 10,000 transactions.

**Constraints**: Fully offline; no server round-trips except optional AI provider calls.

**Scale/Scope**: Single user; ~10k transactions maximum realistic dataset.

## Constitution Check

- [x] I. Local-First Data — all persistence via `src/services/storage.ts` → `localStorage`
- [x] II. Component-Driven Architecture — features in `src/components/<feature>/`
- [x] III. Type Safety — all entities typed in `src/types/index.ts`; no `any` in production code
- [x] IV. Unit-Test Coverage — all utils and services have co-located `.test.ts` files
- [x] V. AI as Optional Enhancement — `hasValidAiConfig()` gates all AI features
- [ ] VI. Simplicity & UX Clarity — `saveState` silently swallows QuotaExceededError (gap)

## Project Structure

```text
src/
├── types/index.ts          # All domain types + BudgetState + BudgetAction
├── context/BudgetContext.tsx  # State reducer + React Context provider
├── services/
│   ├── storage.ts          # localStorage read/write/export/import
│   ├── ai.ts               # Multi-provider AI dispatcher
│   ├── claude.ts           # Prompt builder + Anthropic direct call
│   ├── csvParser.ts        # CSV → staged transactions
│   └── learnedRules.ts     # Description→category memory (separate localStorage key)
├── utils/
│   ├── calculations.ts     # Budget totals, category spend, financial health score
│   ├── alerts.ts           # System alert generation
│   ├── debt.ts             # Avalanche/Snowball payoff simulations
│   ├── recurring.ts        # Next due date, cashflow projections
│   ├── netWorth.ts         # Asset totals
│   ├── formatters.ts       # Date/currency formatting helpers
│   └── transactionRules.ts # Rule matching engine
└── components/
    ├── dashboard/           # Main dashboard + What-If + Merchant Insights
    ├── transactions/        # Transaction ledger + inline category editing
    ├── budgets/             # Budget limits + copy/template management
    ├── ai-advisor/          # AI spending analysis panel
    ├── cashflow/            # Day-by-day cashflow calendar
    ├── debt/                # Debt planner + stress test
    ├── goals/               # Savings goals tracker
    ├── net-worth/           # Asset accounts + net worth summary
    ├── recurring/           # Recurring transactions registry
    ├── rules/               # Keyword-based transaction rules engine
    ├── import/              # CSV import + staging table
    ├── alerts/              # Alerts inbox
    ├── actions/             # Action scheduler
    ├── income/              # Income forecast
    ├── settings/            # Settings page (AI, data, categories, theme)
    └── ui/                  # Shared UI primitives
```

## Complexity Tracking

No constitution violations that require justification in the as-built state beyond the
`saveState` silent error noted in the Constitution Check above (tracked as a convergence gap).
