# Feature Specification: Budget App — Baseline

**Feature Branch**: `astraleclipse-multi-provider-ai`

**Created**: 2026-07-21

**Status**: Baseline (documents current implemented state)

**Input**: Full codebase inventory of all implemented features

---

## Overview

Budget App is a fully offline, browser-based personal finance manager. All data lives in
`localStorage`; there is no backend server. Users track income and expenses, set category
budgets, project cashflow, manage debt, monitor savings goals, and optionally send their
data to an AI provider (Anthropic, OpenAI, or a local LLM) for personalised spending advice.

---

## User Scenarios & Testing

### User Story 1 — Monthly Financial Overview (Priority: P1)

A user opens the app on any device and immediately sees their financial position for the
current month: income received, expenses spent, net balance, savings rate, and a budget vs.
actuals chart. They can navigate to any prior month to review historical performance.

**Why this priority**: This is the default landing screen. If the dashboard is broken or
confusing, no other feature delivers value.

**Independent Test**: Open the app with at least 3 transactions in the current month.
The dashboard shows 4 KPI cards (Income, Expenses, Balance, Savings Rate), a bar chart
comparing budget vs. actuals per category, and a trend chart. Navigate one month back and
verify figures update.

**Acceptance Scenarios**:

1. **Given** at least one transaction exists, **When** the user opens the app,
   **Then** the Dashboard shows the 4 KPI summary cards populated with correct figures
   for the current month.
2. **Given** budgets are set for the current period, **When** the user views the dashboard,
   **Then** the Budget vs. Actuals bar chart renders a bar for each category with a budget limit.
3. **Given** the user is on the Dashboard, **When** they click the left arrow or select a
   prior month from the dropdown, **Then** all KPI cards and charts update to reflect that month's data.
4. **Given** at least 4 months of transaction data exist, **When** the user views the dashboard,
   **Then** the trend chart shows the last 4 months of income/expense bars plus a 1-month
   forward projection.
5. **Given** no transactions exist for the selected month, **When** the user views the dashboard,
   **Then** all KPI cards show zero and the chart shows no data (no crash or blank page).

---

### User Story 2 — Transaction Ledger Management (Priority: P1)

A user records, edits, and deletes transactions. They can filter by type, category, or period,
and correct misclassified transactions — which simultaneously re-classifies all transactions
from the same merchant.

**Why this priority**: Transactions are the source of truth for every other feature.
Inaccurate or missing transactions break budgets, dashboards, and AI analysis.

**Independent Test**: Add 5 transactions of various types and categories. Change the category
on one transaction; confirm all transactions with the same description are updated. Delete one
transaction; confirm it disappears from the list.

**Acceptance Scenarios**:

1. **Given** the Transactions page is open, **When** the user fills in the add-transaction
   form and clicks Save, **Then** the new transaction appears in the list and all derived
   figures (balance, category totals) update immediately.
2. **Given** multiple transactions share a description (e.g., "Woolworths"), **When** the user
   changes the category on one row, **Then** all rows with that description are updated to
   the new category and a learned rule is saved.
3. **Given** active filters are applied, **When** the user clicks "Reset Filters",
   **Then** all filters clear and the full transaction list is shown.
4. **Given** a transaction exists, **When** the user deletes it,
   **Then** it is removed from the list and all derived figures recalculate.
5. **Given** transactions span multiple years, **When** the user selects a year shortcut in
   the period filter, **Then** only transactions from that year are shown.

---

### User Story 3 — Budget Setting & Tracking (Priority: P1)

A user sets monthly (or yearly) spending limits per category, reviews progress against actuals
throughout the month, copies budgets from previous periods, and saves reusable budget templates.

**Why this priority**: Budgets are the core planning tool — without them the app is only a
ledger, not a planning tool.

**Independent Test**: Set a budget limit for 3 categories in the current month. Verify progress
bars and remaining amounts display. Navigate to next month (no budgets); use "Copy from [source
month]" to copy budgets. Verify they appear. Save as a template and apply it to another period.

**Acceptance Scenarios**:

1. **Given** the user is on the Budgets page, **When** they click the pencil icon for a category
   and enter an amount, **Then** the limit is saved and a progress bar appears showing spend vs. limit.
2. **Given** a category's spend exceeds its limit, **When** the user views the Budgets page,
   **Then** the progress bar turns red/amber and the over-budget amount is highlighted.
3. **Given** the current period has no budgets, **When** the user selects a source period from
   the copy dropdown and clicks "Copy Budgets", **Then** the source period's limits are cloned
   to the current period.
4. **Given** the current period already has budgets and the user tries to copy forward,
   **When** the copy-forward dialog is confirmed, **Then** existing periods are overwritten
   and a warning was shown before confirmation.
5. **Given** budgets are set for the current period, **When** the user clicks "Save as Template",
   **Then** the template is saved with the given name and can be applied to any future period.
6. **Given** the app is in yearly budget mode, **When** the user views the Budgets page,
   **Then** limits are labelled "Yearly Limit" and progress is shown against year-to-date spend.

---

### User Story 4 — AI Spending Analysis (Priority: P2)

A user with at least one AI provider configured sends their month's transactions and budget
limits to an LLM and receives a Markdown-formatted analysis with savings recommendations.
If multiple providers are configured, the user can choose which to use.

**Why this priority**: The AI feature is optional — the app works without it — but it is a
key differentiator once the user has set up a provider.

**Independent Test**: Configure one AI provider in Settings. Navigate to AI Advisor, select
the current month, and click "Analyse My Spending". Verify a formatted analysis appears.
Navigate away and back — the analysis persists.

**Acceptance Scenarios**:

1. **Given** a valid AI provider is configured and ≥ 3 transactions exist for the selected month,
   **When** the user clicks "Analyse My Spending", **Then** a Markdown-formatted analysis appears
   with at least one recommendation.
2. **Given** no AI provider is configured, **When** the user views the AI Advisor page,
   **Then** an informational banner explains that an API key is required — no crash or empty state.
3. **Given** two or more AI providers are configured, **When** the user is on the AI Advisor page,
   **Then** a provider selector toggle is visible; changing the selection updates which provider
   is used for the next analysis.
4. **Given** an analysis has been run, **When** the user navigates away and returns,
   **Then** the previous analysis is still visible in the "Previous Analyses" list.
5. **Given** fewer than 3 transactions exist for the selected month, **When** the user views the
   AI Advisor, **Then** a banner explains insufficient data — the Analyse button is not shown or
   is disabled.

---

### User Story 5 — Cashflow Calendar & Risk Detection (Priority: P2)

A user projects their running cash balance day-by-day for the next 30, 60, or 90 days using
their recurring bills and any future-dated transactions, and is warned before a potential
cash shortfall.

**Why this priority**: Preventing a negative balance is a high-value, proactive feature that
gives the app predictive utility beyond historical reporting.

**Independent Test**: Add 2 recurring expenses (e.g., monthly rent, weekly groceries) and one
future-dated transaction. Open Cashflow. Verify the daily timeline populates and shows the
running balance. Set an expense that would drive the balance negative; verify the risk warning
appears naming the earliest negative date.

**Acceptance Scenarios**:

1. **Given** at least one recurring expense exists, **When** the user opens the Cashflow page,
   **Then** the daily timeline shows projected events and running balances across the selected horizon.
2. **Given** the projected balance would go negative on any day, **When** the user views the
   Cashflow page, **Then** an amber warning banner names the earliest at-risk date.
3. **Given** the user changes the horizon from 30 to 90 days, **When** the selection is changed,
   **Then** the timeline extends and summary cards recalculate.

---

### User Story 6 — Debt Payoff Planning (Priority: P2)

A user enters their debt accounts and uses the Avalanche or Snowball strategy to get a
month-by-month payoff schedule, a debt-free ETA, and a stress-test showing the impact of
rate rises or income drops.

**Why this priority**: Debt planning is a distinct, high-value module that is independently
complete and testable.

**Independent Test**: Add 2 debts with different balances and APRs. Switch between Avalanche
and Snowball; verify the payoff order changes. Set an extra payment; verify the ETA shortens.
Use the stress test sliders; verify the impact figures update.

**Acceptance Scenarios**:

1. **Given** at least one debt is entered, **When** the user selects a strategy and views the
   Debt page, **Then** a payoff schedule table shows milestones and a total interest figure
   is displayed.
2. **Given** two debts exist, **When** the user switches from Avalanche to Snowball,
   **Then** the suggested payoff order changes and the total interest figure updates.
3. **Given** the user sets an extra monthly payment, **When** the value is changed,
   **Then** the debt-free ETA and interest saved both update.
4. **Given** the user moves the stress-test sliders, **When** values are changed,
   **Then** the stressed ETA, timeline impact, and interest impact all update in real time.

---

### User Story 7 — Savings Goals Tracking (Priority: P2)

A user creates named savings goals with target amounts and optional deadlines, logs contributions,
and is alerted when a goal is at risk of missing its deadline.

**Why this priority**: A sinking-fund tracker gives concrete saving targets that motivate
ongoing use of the app.

**Independent Test**: Add a goal with a target amount and a deadline 3 months away. Log a
contribution less than the required monthly rate. Verify the progress bar, estimated completion
month, and "Behind target" badge appear correctly.

**Acceptance Scenarios**:

1. **Given** the Goals page is open, **When** the user adds a goal with name, target, and
   monthly contribution, **Then** the goal card appears with a progress bar and estimated
   completion date.
2. **Given** a goal's projected completion date exceeds its deadline, **When** the user views
   the Goals page, **Then** the goal card displays a "Behind target" amber badge.
3. **Given** a goal exists, **When** the user logs a contribution, **Then** the goal's
   current saved amount increases by the entered value and the progress bar updates.

---

### User Story 8 — Net Worth Dashboard (Priority: P2)

A user tracks asset accounts (cash, investments, property) alongside their debt balances for
a live net worth figure and an asset-type breakdown.

**Independent Test**: Add 2 asset accounts. Verify net worth = total assets − total debts. Add
a debt (on the Debt page) and verify the net worth figure decreases accordingly.

**Acceptance Scenarios**:

1. **Given** at least one asset and one debt exist, **When** the user views the Net Worth page,
   **Then** net worth = total assets − total debt balances is shown.
2. **Given** assets of different types exist, **When** the user views the Asset Mix section,
   **Then** horizontal bars show the percentage of each asset type.

---

### User Story 9 — Recurring Bills Registry (Priority: P2)

A user maintains a list of fixed recurring items — subscriptions, rent, salary — with
frequency, next due date, and active/paused state. Active items feed into cashflow projections.

**Independent Test**: Add 2 recurring expenses and 1 recurring income. Verify they appear in
the upcoming bills list if due within 14 days. Pause one; verify it no longer appears in the
upcoming list and is excluded from cashflow projections.

**Acceptance Scenarios**:

1. **Given** a recurring item is due within 14 days, **When** the user views the Recurring
   page, **Then** it appears in the "Upcoming Bills" highlighted section.
2. **Given** a recurring item is active, **When** the user toggles it to paused,
   **Then** it is excluded from cashflow projections and the upcoming list.

---

### User Story 10 — Transaction Rules Engine (Priority: P3)

A user defines keyword-based rules that auto-assign category, type, and description to matching
transactions when a CSV is imported or rules are applied to existing transactions.

**Independent Test**: Create a rule matching "AMAZON" → category "Shopping". Import a CSV
with an "AMAZON" transaction. Verify it is pre-categorised as Shopping. Click "Apply to
Existing" and verify matching existing transactions are re-categorised.

**Acceptance Scenarios**:

1. **Given** a rule is defined for a keyword, **When** a CSV is imported containing a
   transaction matching that keyword, **Then** the staged transaction is pre-categorised
   and tagged as high confidence.
2. **Given** an active rule exists, **When** the user clicks "Apply to Existing",
   **Then** a confirmation showing the count of updated transactions is displayed.
3. **Given** a rule is toggled to inactive, **When** "Apply to Existing" is run,
   **Then** the inactive rule is skipped.

---

### User Story 11 — CSV Bank Statement Import (Priority: P3)

A user imports a CSV bank export, reviews auto-categorised staged transactions, corrects any
misclassifications, and commits the batch to the ledger — with duplicate detection preventing
re-import.

**Independent Test**: Import a CSV with 10 rows. Verify the staging table shows all rows.
Change the category on one row; verify all rows with that description update. Remove one row.
Confirm import; verify 9 transactions appear in the ledger and the staged set is cleared.

**Acceptance Scenarios**:

1. **Given** a valid CSV is selected, **When** the user opens the import page,
   **Then** all parsed rows appear in a staging table with auto-assigned categories and
   confidence levels.
2. **Given** transactions already exist in the ledger from a prior import, **When** the same CSV
   is imported again, **Then** duplicate rows are excluded from the staged set.
3. **Given** staged transactions are reviewed, **When** the user clicks "Confirm Import",
   **Then** all staged rows are added to the transaction ledger and staging is cleared.
4. **Given** the user changes a category on one staged row, **When** the change is applied,
   **Then** all staged rows with the same description are updated and a learned rule is saved.

---

### User Story 12 — Alerts Inbox & Action Scheduler (Priority: P3)

The app automatically generates risk and attention alerts across all data (overspend, low
savings, cashflow dips, goal drift, anomalies). The user can view, snooze, dismiss, and
convert alerts into scheduled actions.

**Independent Test**: Spend over a budget limit for one category. Open Alerts; verify an
overspend alert appears. Click "Add to action scheduler" on it; verify an action appears
on the Actions list. Snooze an alert; verify it disappears until the snooze date.

**Acceptance Scenarios**:

1. **Given** a category spend exceeds its budget limit, **When** the user opens the Alerts page,
   **Then** a budget overspend alert is present for that category.
2. **Given** an alert exists, **When** the user clicks "Add to action scheduler",
   **Then** an action item appears in the Action Scheduler with a default 3-day due date.
3. **Given** an alert is snoozed for 1 day, **When** the user views the Alerts page within
   that day, **Then** the snoozed alert is hidden.
4. **Given** dismissed/snoozed alerts exist, **When** the user clicks "Restore all alerts",
   **Then** all alerts return to the active feed.

---

### User Story 13 — Income Forecasting (Priority: P3)

A user sees a month-by-month income projection for 3 to 12 months ahead, sourced from
budgeted income, recurring income items, or the recent 3-month average — whichever is most
reliable.

**Independent Test**: Add recurring income of $5,000/month. Open Income Forecast, select
a 6-month horizon. Verify the recurring income baseline appears for each future month and
the baseline total equals $30,000.

**Acceptance Scenarios**:

1. **Given** recurring income items exist, **When** the user opens Income Forecast and selects
   a horizon, **Then** each future month shows the recurring income as the baseline.
2. **Given** budgeted income is also set, **When** the user views the forecast table,
   **Then** budgeted income is shown as the primary (highest-reliability) source and the
   source label reflects this.
3. **Given** no budgeted or recurring income data exists, **When** the user views the forecast,
   **Then** the 3-month average of actual income is used as the baseline.

---

### User Story 14 — Settings & Configuration (Priority: P1)

A user configures AI providers (API key, model), switches budget mode, exports/imports their
full data backup, manages categories, and controls the app theme.

**Independent Test**: Enter an Anthropic API key and click "Test Connection". Verify success
or failure feedback appears. Export a JSON backup. Clear all data (by importing an empty
backup). Re-import the backup; verify all transactions are restored.

**Acceptance Scenarios**:

1. **Given** the user is on the Settings page and selects a provider tab, **When** they enter
   a valid API key and click "Test Connection", **Then** a success message appears.
2. **Given** a different AI provider tab is selected, **When** the user clicks Test Connection
   on the new tab, **Then** any previous connection result is cleared before the new test runs.
3. **Given** the user clicks "Export Backup", **When** the download is triggered,
   **Then** a JSON file is downloaded and a success status message is shown.
4. **Given** a valid backup JSON is selected for import, **When** the user confirms the import,
   **Then** all data is restored and the transaction/budget counts in the storage status update.
5. **Given** the user toggles Budget Mode from Monthly to Yearly, **When** they navigate to
   the Budgets page, **Then** period navigation shows years and limits are labelled "Yearly Limit".
6. **Given** the user toggles the Dark/Light theme, **When** the toggle is clicked,
   **Then** the entire app switches theme immediately and the preference persists on reload.

---

### Edge Cases

- What happens when `localStorage` is full (quota exceeded)?
- What happens when a CSV file has no recognisable column headers?
- What happens when an AI provider returns an error mid-analysis?
- What happens when a copied-forward budget would overwrite a period with custom budgets?
- What happens when a goal's target date is set in the past?
- What happens when a user has budgets for both monthly and yearly mode in the same period key?
- What happens when the same CSV file is imported twice in the same session?

---

## Requirements

### Functional Requirements

- **FR-001**: The app MUST function fully offline with no network access (except AI calls).
- **FR-002**: All data MUST persist in `localStorage` across page refreshes and browser restarts.
- **FR-003**: Users MUST be able to add, edit, and delete transactions with date, description,
  amount, type (Income / Expense / Transfer), and category.
- **FR-004**: Users MUST be able to set a budget limit for any category in any period.
- **FR-005**: The dashboard MUST display Income, Expenses, Balance, and Savings Rate KPIs for
  the selected month.
- **FR-006**: The app MUST support both monthly (yyyy-MM) and yearly (yyyy) budget modes;
  the mode MUST be configurable in Settings.
- **FR-007**: The AI Advisor MUST support Anthropic, OpenAI, and local LLM (OpenAI-compatible)
  providers. The app MUST be fully usable with no provider configured.
- **FR-008**: AI API keys MUST be stored only in `localStorage`; they MUST NOT be committed
  to source control or sent to any server other than the selected AI provider.
- **FR-009**: Users MUST be able to import transactions via CSV with automatic duplicate
  detection and a staged-review step before committing.
- **FR-010**: Changing a transaction's category MUST update all transactions sharing that
  description and persist a learned rule for future imports.
- **FR-011**: The Cashflow Calendar MUST project a daily running balance using recurring
  items and future-dated transactions, and MUST surface the earliest at-risk date if any
  day goes negative.
- **FR-012**: The Debt Planner MUST support both Avalanche and Snowball strategies and display
  a payoff schedule and debt-free ETA.
- **FR-013**: Savings Goals MUST detect and display a "Behind target" status when projected
  completion exceeds the deadline.
- **FR-014**: The Alerts system MUST auto-generate alerts for: budget overspend, low savings
  rate, negative balance, cashflow risk, upcoming debt payments, spending anomalies, budget
  drift, and goal delay.
- **FR-015**: Users MUST be able to export a full JSON backup and restore from it.
- **FR-016**: Copying budgets forward MUST warn the user if any target period already has budgets.
- **FR-017**: Budget periods MUST be unique; duplicate periods MUST be prevented or resolved at
  the point of creation.
- **FR-018**: The app MUST support light and dark themes; the preference MUST persist.
- **FR-019**: Users MUST be able to define keyword-based transaction rules with Contains,
  Starts With, and Exact Match modes.
- **FR-020**: The Income Forecast MUST use the highest-reliability source available (budgeted >
  recurring > 3-month average) per future month.

### Key Entities

- **Transaction**: id, date, description, amount, type (Income/Expense/Transfer), category, notes
- **BudgetLimit**: category, period (yyyy-MM or yyyy), limit, type (expense/income)
- **Category**: id, name, type, color, icon
- **RecurringItem**: id, name, amount, type, category, frequency, startDate, nextDueDate, active, notes
- **Debt**: id, name, balance, apr, minimumPayment, paymentDueDay, notes
- **SavingsGoal**: id, name, targetAmount, currentAmount, monthlyContribution, targetDate, category, notes
- **Asset**: id, name, type, value, notes
- **Alert**: id, type, severity, title, message, category, date, snoozedUntil, dismissed
- **Action**: id, title, description, dueDate, status, source, snoozedUntil
- **AiAnalysis**: id, month, provider, content, createdAt
- **LearnedRule**: description, category, type, appliedCount
- **TransactionRule**: id, name, matchText, matchMode, type, category, renameDescription, active
- **AppSettings**: budgetMode, currency, theme, aiProviders (anthropic/openai/local), aiModel, templateBudgets

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All core financial data (transactions, budgets, goals, debts, assets, settings)
  survives a full browser refresh without loss.
- **SC-002**: Users can add a transaction, view it on the dashboard, and see updated KPI figures
  within the same page session with no manual refresh.
- **SC-003**: CSV import correctly auto-categorises at least 80% of rows when learned rules
  are present for those merchants.
- **SC-004**: A bulk category change (one row → all matching descriptions) completes and is
  visible within 1 second for up to 1,000 transactions.
- **SC-005**: Switching from monthly to yearly budget mode and back preserves all previously
  set budget limits with no data loss.
- **SC-006**: AI analysis runs within 30 seconds for a month with up to 200 transactions
  (network and provider latency aside).
- **SC-007**: All unit tests (`npm test`) pass with no failures before any branch is merged.
- **SC-008**: The app renders correctly in both light and dark themes with no invisible text
  or layout breakage.
- **SC-009**: A full JSON backup can be exported and re-imported to restore an identical app
  state, verified by matching transaction count, budget count, and goal count.
- **SC-010**: The Cashflow Calendar correctly projects a negative-balance risk date to within
  ±1 day based on known recurring schedule data.

---

## Assumptions

- Users run a modern Chromium, Firefox, or Safari browser with `localStorage` available and
  not blocked by privacy extensions.
- The app is a single-user tool; there is no multi-user, sharing, or sync requirement.
- Currency is single-currency per installation; multi-currency conversion is out of scope.
- AI provider calls are made directly from the browser (no CORS proxy); users are responsible
  for configuring any necessary CORS allowances for local LLMs.
- CSV imports follow common bank export formats (date, description, amount columns); no
  specialist bank-specific parsers are guaranteed.
- The transaction category list is managed by the user; the app ships with sensible defaults
  but does not impose a fixed taxonomy.
- Mobile responsiveness is a goal but the primary target is desktop browsers.
- The What-If simulator on the dashboard uses a 3-month rolling average as its data baseline
  when the selected month has no transactions.
