<!--
Sync Impact Report
==================
Version change: (new) → 1.0.0
Added sections: Core Principles (I–VI), Technology Stack & Constraints, Development Workflow, Governance
Modified principles: N/A (initial ratification)
Removed sections: N/A
Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gate reflects P1–P6
  ✅ .specify/templates/spec-template.md — no structural changes required; constraints align
  ✅ .specify/templates/tasks-template.md — testing discipline note aligns with Principle IV
Deferred TODOs: None
-->

# Budget App Constitution

## Core Principles

### I. Local-First Data (NON-NEGOTIABLE)

All user data MUST be stored exclusively in `localStorage`. There is no backend server,
no cloud sync, and no external data dependency at runtime. The application MUST function
completely offline after the initial page load.

- Data reads/writes MUST go through `src/services/storage.ts` — direct `localStorage`
  access outside that service is forbidden.
- New features MUST NOT introduce any remote data storage without an explicit architectural
  decision and amendment to this constitution.
- Data migrations (schema changes) MUST preserve all existing localStorage entries; no
  silent data loss is permitted on upgrade.

**Rationale**: Users' financial data is sensitive. Keeping it local eliminates server-side
breach risk and ensures the app remains usable without internet access.

### II. Component-Driven Architecture

Each feature area MUST live as a self-contained folder under `src/components/` (e.g.,
`transactions/`, `budgets/`, `dashboard/`). Components MUST NOT reach into sibling feature
folders directly.

- Shared logic MUST live in `src/utils/` (pure functions) or `src/services/` (stateful/IO).
- Shared UI primitives MUST live in `src/components/ui/`.
- Cross-feature state MUST be managed via React Context defined in `src/context/`.
- Feature folders MUST contain only components relevant to that feature.

**Rationale**: Self-contained feature folders reduce merge conflicts, make refactors
predictable, and allow individual features to be reasoned about in isolation.

### III. Type Safety (NON-NEGOTIABLE)

All domain entities and data structures MUST be typed in `src/types/index.ts`. The use
of `any` is forbidden without an explicit inline justification comment.

- TypeScript strict mode applies to all source files.
- API/AI responses MUST be validated and cast to typed interfaces before use.
- `unknown` is preferred over `any` for untyped external data.

**Rationale**: Financial calculations are safety-critical. Type errors caught at compile
time prevent silent data corruption or incorrect budget/spending figures.

### IV. Unit-Test Coverage

All utility functions (`src/utils/`) and service logic (`src/services/`) MUST have Vitest
unit tests co-located with the source file (e.g., `calculations.test.ts` alongside
`calculations.ts`).

- Tests MUST pass (`npm test`) before a feature branch is merged.
- Pure utility functions MUST be tested; React components MAY be tested but are not required.
- Test files MUST cover the happy path and at least one edge-case / error path per function.

**Rationale**: Business logic (budget calculations, forecasting, debt math) is complex and
regression-prone. A fast unit-test suite catches breakage without requiring a browser.

### V. AI as Optional Enhancement

The application MUST be fully functional with no AI provider configured. AI features MUST
degrade gracefully — no unhandled errors or broken layouts when AI is unavailable or
returns an error.

- All AI providers (Anthropic Claude, OpenAI, local LLM) MUST be treated equivalently at
  the service layer (`src/services/ai.ts`).
- AI API keys MUST be stored in `localStorage` settings only; they MUST NOT be hardcoded
  or committed to source control.
- When multiple providers are configured, the user MUST be able to select which provider
  to use at the point of invocation.

**Rationale**: Not all users will configure AI. Mandatory AI coupling would break the app
for the majority of users and creates an external dependency that violates Principle I.

### VI. Simplicity & UX Clarity

Every user-visible action that has a side-effect (data save, export, delete, copy) MUST
provide clear, immediate feedback (success/failure status message or confirmation dialog).
Destructive actions (delete, overwrite) MUST show a confirmation prompt with context about
what will be affected.

- Apply YAGNI: do not add infrastructure for features not yet planned.
- New features MUST NOT silently change or delete existing stored data.
- Period-based data (budgets, forecasts) MUST enforce uniqueness per period; duplicate
  periods MUST be detected and surfaced to the user before overwrite.

**Rationale**: Users trust the app with real financial data. Surprising data loss or
silent failures destroy that trust irreversibly.

## Technology Stack & Constraints

| Concern | Choice | Constraint |
|---------|--------|------------|
| Language | TypeScript 5.x (strict) | No `any`; see Principle III |
| Framework | React 19 | Functional components + hooks only |
| Build | Vite 7 | No webpack migrations without ADR |
| Styling | Tailwind CSS 4 | Utility-first; no inline style blocks |
| Charts | Recharts | Existing chart library; do not add a second |
| Dates | date-fns 4 | No `moment.js`; no `new Date()` parsing of strings |
| IDs | `uuid` (v4) | No `Math.random()` for entity IDs |
| Testing | Vitest 4 | Co-located test files; see Principle IV |
| Storage | `localStorage` only | See Principle I |
| AI | Multi-provider via `src/services/ai.ts` | See Principle V |

New runtime dependencies MUST be justified by a documented need that cannot be met by
existing dependencies.

## Development Workflow

- **Branch strategy**: Feature branches off `main`; one feature per branch.
- **Commits**: Atomic, descriptive messages. Co-author trailer required for AI-assisted
  commits (`Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>`).
- **Constitution Check**: Every `/speckit.plan` and `/speckit.implement` run MUST verify
  the planned changes against Principles I–VI before proceeding.
- **Tests**: Run `npm test` and confirm all tests pass before raising a PR.
- **Data safety**: When modifying `src/services/storage.ts`, manually verify that existing
  sample data round-trips correctly through the updated schema.

## Governance

This constitution supersedes all informal conventions and comments in code. Where this
document and a code comment conflict, this document takes precedence and the code MUST
be updated.

**Amendment process**:
1. Propose the change in a PR description with rationale.
2. Update `.specify/memory/constitution.md` with the new content and a version bump.
3. Version bump rules — MAJOR: principle removal or redefinition; MINOR: new principle or
   section; PATCH: wording clarification or typo fix.
4. Update any affected templates in `.specify/templates/` in the same commit.
5. Commit message format: `docs: amend constitution to vX.Y.Z (<summary>)`

All PRs MUST verify that changed code is consistent with Principles I–VI before merging.

**Version**: 1.0.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-07-21
