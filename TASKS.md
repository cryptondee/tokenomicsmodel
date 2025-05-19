# Project Task List: Tokenomics Modeler

## Phase 0.5: Polish & Refinement (Immediate Term: 1-2 Sprints)

**Goal:** Solidify the existing application foundation, improve code clarity, resolve minor architectural ambiguities, and prepare for significant feature development.

### 1. Codebase Consolidation & Clarity
* **Task:** Resolve `runSimulationAction` Redundancy [COMPLETED]
    * **Sub-task:** Analyze both `runSimulationAction` implementations (in `store.ts` and `actions/simulationActions.ts`).
    * **Sub-task:** Standardize on `store.ts` version as the primary interface for UI components.
    * **Sub-task:** Ensure `store.ts` version orchestrates calls to pure functions in `simulationEngine.ts`.
    * **Sub-task:** Remove or merge distinct logic from `actions/simulationActions.ts`. [COMPLETED - Removed simulationActions.ts]
    * **Sub-task:** Update all component imports to use the standardized action. [COMPLETED - Inferred by non-usage of actions file]
    * **Deliverable:** Single, clearly defined `runSimulationAction` in `store.ts`; updated component imports. [COMPLETED]
* **Task:** Streamline `Entity` State Updates
    * **Sub-task:** Review current `Entity` re-instantiation mechanism on global `totalSupply` change.
    * **Sub-task:** Evaluate alternative reactivity patterns (e.g., direct store subscription by entities, derived stores).
    * **Sub-task:** Implement chosen optimized pattern or thoroughly document the rationale for the current approach if deemed optimal.
    * **Deliverable:** Optimized or well-documented entity update mechanism.
* **Task:** Clean Up Project Structure [COMPLETED]
    * **Sub-task:** Identify and confirm unused files/directories, specifically `src/routes`. [COMPLETED]
    * **Sub-task:** Remove the `src/routes` directory and its contents. [COMPLETED]
    * **Sub-task:** Update `README.md` or other project documentation if it incorrectly implies SvelteKit usage. [COMPLETED - README updated]
    * **Deliverable:** Leaner project structure; updated documentation. [COMPLETED]

### 2. Development Environment & Practices
* **Task:** Formalize Code Quality Standards [COMPLETED]
    * **Sub-task:** Add explicit ESLint and Prettier scripts to `package.json` (e.g., `npm run lint`, `npm run format`). [COMPLETED]
    * **Sub-task:** Configure and implement pre-commit hooks (e.g., using Husky and lint-staged) to enforce linting and formatting. [COMPLETED]
    * **Sub-task:** Migrate to Tailwind CSS v4+ using @tailwindcss/vite plugin, remove postcss.config.js, and update global CSS import to @import "tailwindcss". CSS is now working again after this migration. [COMPLETED]
    * **Deliverable:** `package.json` scripts for linting/formatting; pre-commit hook setup. [COMPLETED]

### 3. Documentation & Knowledge Transfer
* **Task:** Enhance Internal Documentation
    * **Sub-task:** Review and add/improve JSDoc comments or other code comments for critical sections:
        * `store.ts` initialization logic.
        * `appStateProvider` pattern and its usage.
        - [x] Polish and expand code documentation for core logic (store, simulation engine)
        - Comprehensive JSDoc and inline comments added to `src/lib/store.ts` and `src/lib/simulationEngine.ts` for maintainability and clarity.
        * Complex UI components or state interactions.
    * **Deliverable:** Better-commented critical code sections.

---

## Phase 1: Core Tokenomics Enhancements & UX (Mid-Term: 2-3 Sprints per major feature group)

**Goal:** Significantly expand the modeler's capabilities with essential tokenomic features and improve overall usability and user guidance.

### 1. Advanced Vesting Mechanisms
* **Task:** Implement "Percentage Per Step" Vesting
    * **Sub-task:** Design UI inputs in `EntityDetailForm.svelte`.
    * **Sub-task:** Update `Entity` model to store new vesting parameters.
    * **Sub-task:** Modify `simulationEngine.ts` to calculate unlocks based on this method.
    * **Sub-task:** Ensure UI clearly represents this vesting type.
* **Task:** Implement "Conditional Vesting (Milestone-based)"
    * **Sub-task:** Add UI for defining milestones and a manual "Is Met Pre-Simulation" toggle.
    * **Sub-task:** Update `Entity` model.
    * **Sub-task:** Update `simulationEngine.ts` to respect milestone conditions.
* **Task:** Implement "Transfer Restrictions Post-Vesting (Soft Lockups)"
    * **Sub-task:** Design UI for defining soft lockup periods and conditions.
    * **Sub-task:** Update `Entity` model.
    * **Sub-task:** Modify `simulationEngine.ts` to track soft-locked tokens.
    * **Sub-task:** Update charts/tables to visualize soft-locked supply.
* **Deliverables (for all advanced vesting):** New input fields in `EntityDetailForm.svelte`; updated `Entity` model and `simulationEngine.ts` logic; clear UI representation of these vesting types; relevant tests.

### 2. Dynamic Minting & Foundational Staking
* **Task:** Implement "Algorithmic Inflation (Target Annual Rate)" for Mint Events
    * **Sub-task:** Add new options/inputs for mint event configuration.
    * **Sub-task:** Update `MintEvent` model if necessary.
    * **Sub-task:** Update `simulationEngine.ts` to handle algorithmic minting.
* **Task:** Implement Basic "Staking Rewards as Emissions"
    * **Sub-task:** Add global/entity-level inputs for "Percentage of Circulating Supply Staked" (user assumption) and reward pool details.
    * **Sub-task:** Update `simulationEngine.ts` to calculate and distribute staking rewards.
    * **Sub-task:** Add new chart/table columns for staking data (total staked, rewards distributed).
* **Deliverables (for dynamic minting & staking):** New UI options for mint events & staking; updated simulation logic; new chart/table outputs; relevant tests.

### 3. Treasury Management (MVP)
* **Task:** Implement "Explicit Treasury Entity" or Dedicated Module
    * **Sub-task:** Design UI for defining treasury parameters (inflows, outflows, schedule).
    * **Sub-task:** Determine if a special entity type or a separate store module is best.
    * **Sub-task:** Implement simulation logic for treasury balance changes.
    * **Sub-task:** Display treasury balance and activity in charts/tables.
* **Deliverables:** UI for treasury configuration; simulation logic for treasury; treasury data visualization; relevant tests.

### 4. User Experience Enhancements
* **Task:** Implement "Integrated Documentation/Help"
    * **Sub-task:** Identify complex input sections needing help text.
    * **Sub-task:** Design and implement modals or rich tooltips for these sections.
* **Task:** Improve Input Validation
    * **Sub-task:** Review all input fields for necessary validation rules.
    * **Sub-task:** Implement clear, actionable error messages for invalid inputs.
* **Deliverables:** Contextual help in UI; robust form validation; improved tooltips.

---

## Phase 2: Advanced Modeling & Analytics (Longer-Term: Phased implementation)

**Goal:** Introduce demand-side simulation factors and more sophisticated analytical tools to provide deeper insights.

### 1. Basic Demand-Side Modeling
* **Task:** Implement "User Growth Models"
    * **Sub-task:** Add UI for selecting growth models (linear, S-curve, % growth) and parameters.
    * **Sub-task:** Update `simulationEngine.ts` to project user numbers over time.
* **Task:** Link User Growth to "Transaction Volume/Value" Proxies
    * **Sub-task:** Add UI for defining relationship between users and transaction activity.
    * **Sub-task:** Update `simulationEngine.ts` to calculate transaction volume/value.
* **Task:** Integrate Transaction Volume with "Transaction Fee Burns"
    * **Sub-task:** Allow burn sinks to be configured to use transaction volume as a driver for burns.
    * **Sub-task:** Update `simulationEngine.ts` burn logic.
* **Deliverables:** New UI for demand parameters; `simulationEngine.ts` updates; demand-driven outputs in charts/tables; relevant tests.

### 2. Granular Token States & Enhanced Visualization
* **Task:** Refine Tracking of Token States
    * **Sub-task:** Ensure simulation engine accurately tracks "Staked Supply," conceptual "LP Supply" (user input %), and "Soft-Locked Supply."
* **Task:** Enhance Supply Composition Chart & Table
    * **Sub-task:** Update `ChartC.svelte` and `ResultsTable.svelte` to clearly distinguish and visualize these granular token states.
* **Deliverables:** Updated simulation logic for token states; enhanced visualizations in `ChartC` and `ResultsTable`.

### 3. Key Performance Indicators (KPIs)
* **Task:** Define and Implement Key Tokenomic KPIs
    * **Sub-task:** Research and select a set of valuable KPIs (e.g., inflation rate, sell pressure proxies, treasury runway).
    * **Sub-task:** Implement logic for KPI calculation post-simulation.
    * **Sub-task:** Design and implement a new UI section to display these KPIs.
* **Deliverables:** KPI calculation logic; new KPI display section in the UI.

### 4. Scenario Comparison (MVP)
* **Task:** Implement Basic Scenario Comparison Feature
    * **Sub-task:** Develop UI for selecting two saved scenarios to compare.
    * **Sub-task:** Implement logic to load, (re-)run simulations if necessary, and process data for comparison.
    * **Sub-task:** Overlay key charts (e.g., Circulating Supply) for the two scenarios.
    * **Sub-task:** Display a simple side-by-side table for key final metrics.
* **Deliverables:** UI for scenario selection; comparison logic; comparative charts and table.

---

### Recurring Activities (Across All Phases)
* **Task:** Write Comprehensive Tests
    * **Sub-task:** Add unit tests for all new business logic in `simulationEngine.ts` and data models.
    * **Sub-task:** Add component tests for new UI interactions, forms, and displays.
    * **Sub-task:** Incrementally add End-to-End (E2E) tests for critical user flows.
* **Task:** Maintain and Update Documentation
    * **Sub-task:** Keep internal code documentation (comments, JSDoc) current with changes.
    * **Sub-task:** Create/update user-facing guides or help text for new features.
* **Task:** Monitor and Optimize Performance
    * **Sub-task:** Regularly profile simulation times and UI responsiveness.
    * **Sub-task:** Identify and address performance bottlenecks.
* **Task:** Conduct Iterative Refinement
    * **Sub-task:** Gather feedback (internal or user-based if applicable).
    * **Sub-task:** Continuously refine UI, UX, and feature implementations based on feedback and testing.
