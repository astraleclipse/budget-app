# AGENTS.md

## Purpose
This repository is a React + TypeScript single-page budget app built with Vite. It manages transactions, categories, budget limits, and AI-assisted analysis, with all app data persisted in browser localStorage.

## Tech Stack
- React 19 + TypeScript
- Vite 7
- ESLint 9
- Tailwind CSS 4
- Recharts + date-fns

## Local Setup
1. `npm ci`
2. `npm run dev`

## Validation Commands
- Lint: `npm run lint`
- Build: `npm run build`

## Repository Map
- `/src/App.tsx`: top-level app shell, hash-based page routing
- `/src/context/BudgetContext.tsx`: central state reducer + dispatch
- `/src/context/ThemeContext.tsx`: theme state/provider
- `/src/services/storage.ts`: default state + localStorage load/save/import/export
- `/src/components/*`: feature UIs (dashboard, transactions, budgets, settings, advisor, csv import)
- `/src/utils/*`: calculations and formatting helpers
- `/src/types/index.ts`: domain types and reducer action types

## Data and Domain Notes
- State is persisted under `budget-app:state` in localStorage.
- Budget periods use string keys in `BudgetLimit.month`:
  - Monthly: `yyyy-MM`
  - Yearly: `yyyy`
- `settings.budgetMode` controls monthly vs yearly budget behavior.

## Contributor Guidelines for Agents
- Keep changes minimal and scoped to the requested task.
- Prefer updating existing modules over adding abstractions unless needed.
- Preserve type safety and existing reducer action patterns.
- Do not commit secrets (API keys are user-provided settings and should remain runtime-only).
- Run lint and build before finalizing changes; document any pre-existing failures separately from new issues.
