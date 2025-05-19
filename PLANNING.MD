The project is a robust, client-side Tokenomics Modeler built with Svelte, TypeScript, and Vite. It features a modular architecture with centralized state management (Svelte Stores), a dedicated simulation engine, and component-based UI. It has successfully implemented the foundational elements described as "Phase 0" in earlier strategic documents, allowing for modeling of token allocations, vesting, burn/mint mechanisms, and Monte Carlo simulations.

**Overarching Goals for Next Development Cycles:**

1. **Enhance Maintainability & Scalability:** Further refine the codebase for clarity, efficiency, and ease of future development.  
2. **Improve User Experience (UX):** Make the tool more intuitive, provide better feedback, and add helpful documentation.  
3. **Expand Core Modeling Capabilities:** Introduce more sophisticated tokenomic features and analytical tools.

---

**Phase 0.5: Polish & Refinement (Immediate Term: 1-2 Sprints)**

**Goal:** Solidify the existing application foundation, improve code clarity, resolve minor architectural ambiguities, and prepare for significant feature development.

**Key Tasks & Deliverables:**

1. **Codebase Consolidation & Clarity:**

   * **Task:** Resolve `runSimulationAction` Redundancy.  
     * **Details:** Standardize on the `runSimulationAction` function located in `src/lib/store.ts` as the primary interface for UI components. This function will orchestrate calls to pure calculation functions within `src/lib/simulationEngine.ts`. The version in `src/lib/actions/simulationActions.ts` will be removed or its distinct logic (if any) merged into the store's action.  
     * **Deliverable:** Single, clearly defined `runSimulationAction` in `store.ts`; updated component imports.  
   * **Task:** Streamline `Entity` State Updates.  
     * **Details:** Review the current mechanism of re-instantiating `Entity` objects in the store when global `totalSupply` changes. Evaluate if a more direct reactivity pattern (e.g., entities subscribing to relevant store values or derived stores for `totalSupply`) can be implemented without sacrificing clarity or correctness, potentially improving performance. If the current method is deemed optimal, add clear documentation justifying this approach.  
     * **Deliverable:** Optimized or well-documented entity update mechanism.  
   * **Task:** Clean Up Project Structure.  
     * **Details:** Remove the `src/routes` directory and its contents (`+layout.svelte`, `+page.svelte`), as they are unused by the current `App.svelte`\-driven application. Update `README.md` or other documentation if it implies SvelteKit usage.  
     * **Deliverable:** Leaner project structure; updated documentation.  
2. **Development Environment & Practices:**

   * **Task:** Formalize Code Quality Standards.  
     * **Sub-task [NEW, COMPLETED]:** Migrate to Tailwind CSS v4+ using @tailwindcss/vite plugin. Remove postcss.config.js and update global CSS import to @import "tailwindcss". CSS is now working again after this migration.
     * **Details:** Ensure ESLint and Prettier are explicitly configured in `package.json` scripts (e.g., `lint`, `format`). Integrate these into a pre-commit hook (e.g., using Husky and lint-staged) to maintain code consistency.  
     * **Deliverable:** `package.json` scripts for linting/formatting; pre-commit hook setup.  
3. **Documentation & Knowledge Transfer:**

   * **Task:** Enhance Internal Documentation.  
     * **Details:** Review and improve code comments, particularly around the `store.ts` initialization logic, the `appStateProvider` pattern, and the simulation engine's core functions.  
     * **Deliverable:** Better-commented critical code sections.

---

## Phase 1: Core Tokenomics Enhancements & UX (Mid-Term: 2–3 Sprints per Major Feature Group)

**Goal:**
Significantly expand the modeler's capabilities with essential tokenomic features and improve overall usability and user guidance.

**Overview:**
Phase 1 focuses on four major areas, each broken down into actionable sub-features and deliverables. Implementation is expected to be iterative, with each feature group tackled in sequence or parallel as resources allow.

### 1. Advanced Vesting Mechanisms
**Objective:** Support more sophisticated vesting scenarios for real-world tokenomics.
- **Sub-features:**
  - Percentage per step vesting (e.g., X% unlocks each period)
  - Conditional/Milestone-based vesting (manual toggle before simulation)
  - Post-vesting transfer restrictions (soft lockups)
- **Deliverables:**
  - UI for defining vesting types and milestones
  - Simulation engine updates for new vesting logic
  - Chart/table updates to visualize vesting outcomes
  - Validation and help text for complex vesting configs

### 2. Staking & Rewards
**Objective:** Model staking flows and reward emissions for protocols with staking.
- **Sub-features:**
  - Allow entities or users to stake tokens
  - Model lockup periods and reward emission schedules
  - Track staked supply and distributed rewards
- **Deliverables:**
  - UI for staking parameters (global and per-entity)
  - Simulation logic for staking and reward flows
  - New chart/table columns for staked supply, rewards distributed
  - Options for mint events to include staking rewards

### 3. Treasury Management (MVP)
**Objective:** Track treasury inflows/outflows and simulate treasury health.
- **Sub-features:**
  - Explicit treasury entity or module
  - Model treasury inflows (initial allocation, % of mints)
  - Model treasury outflows (scheduled expenses)
  - Visualize treasury balance over time
- **Deliverables:**
  - UI for treasury parameters (inflows, outflows)
  - Simulation engine logic for treasury flows
  - Treasury data in charts and tables

### 4. User Experience Enhancements
**Objective:** Make the app more intuitive and user-friendly for both new and advanced users.
- **Sub-features:**
  - Integrated documentation/help (modals, tooltips, inline guides)
  - Improved input validation and error messaging
  - Contextual help for complex forms (vesting, Monte Carlo, staking)
- **Deliverables:**
  - Contextual help accessible in the UI
  - Robust form validation and actionable error messages
  - User-facing documentation for new features

---

**Phase 2: Advanced Modeling & Analytics (Longer-Term: Phased implementation)**

**Goal:** Introduce demand-side simulation factors and more sophisticated analytical tools to provide deeper insights.

**Key Features & Deliverables (Prioritize based on impact and complexity):**

1. **Basic Demand-Side Modeling:**  
   * **Features:** Allow users to model "User Growth" (e.g., using predefined curves like linear, S-curve, or simple % growth). Link this to "Transaction Volume/Value" proxies. Integrate this volume with "Transaction Fee Burns" if applicable.  
   * **Deliverables:** New input sections for demand parameters; `simulationEngine.ts` updates to incorporate these drivers; relevant outputs in charts/tables.  
2. **Granular Token States & Enhanced Visualization:**  
   * **Features:** Refine the tracking and explicit display of various token states beyond simple circulating/locked, such as "Staked Supply" (from Phase 1), conceptual "LP Supply" (as a user input percentage of circulating), and "Soft-Locked Supply."  
   * **Deliverables:** Enhanced `ChartC.svelte` (Supply Composition) and `ResultsTable.svelte` to clearly distinguish these states.  
3. **Key Performance Indicators (KPIs):**  
   * **Features:** Automatically calculate and display a set of predefined, valuable tokenomic KPIs (e.g., inflation rate, sell pressure proxies, runway based on treasury outflows).  
   * **Deliverables:** New KPI display section; logic for KPI calculation post-simulation.  
4. **Scenario Comparison (MVP):**  
   * **Features:** Allow users to load two saved scenarios. The application will re-run simulations if necessary and overlay key charts (e.g., Circulating Supply, Total Supply) and present a simple side-by-side table for key final metrics.  
   * **Deliverables:** UI for selecting scenarios for comparison; logic for handling and displaying comparative data.

---

**Recurring Activities (Across All Phases):**

* **Comprehensive Testing:** Continuously expand unit tests for new business logic in `simulationEngine.ts` and models. Write component tests for new UI interactions and forms. Incrementally add End-to-End (E2E) tests for critical user flows (e.g., creating a full model, running simulation, saving/loading).  
* **Documentation:** Maintain up-to-date internal code documentation. Prepare user-facing guides or help text for new features as they are released (tying into Phase 1 UX enhancements).  
* **Performance Monitoring & Optimization:** Regularly profile the application, especially simulation times and UI responsiveness, as new features and calculations are added. Optimize as needed.  
* **Iterative Refinement:** Based on internal testing and (if applicable) user feedback, continuously refine UI, UX, and feature implementations.

This plan provides a structured approach to both immediate improvements and long-term feature development, ensuring the Tokenomics Modeler evolves into an increasingly powerful and user-friendly tool.
