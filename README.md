# Tokenomics Modeler

This project is a client-side Tokenomics Modeler built with Svelte, TypeScript, Vite, and Tailwind CSS. It allows users to model and simulate various tokenomic scenarios, including token allocations, vesting schedules, mint/burn events, and Monte Carlo simulations.

## Project Overview

The application features a modular architecture with centralized state management using Svelte Stores, a dedicated simulation engine for calculations, and a component-based UI for user interaction.

Key functionalities include:
- Defining multiple token-holding entities (e.g., Team, Investors, Treasury).
- Configuring detailed vesting schedules for each entity.
- Modeling token minting events and burn mechanisms.
- Running simulations over a defined time period.
- Performing Monte Carlo simulations to analyze probabilistic outcomes.
- Visualizing simulation results through charts and tables.

## Current Status (Phase 0.5: Polish & Refinement)

The project is currently in **Phase 0.5**, which focuses on:
- Solidifying the existing application foundation.
- Improving code clarity and resolving minor architectural ambiguities.
- Preparing for significant future feature development (as outlined in `PLANNING.MD` and `TASKS.md`).

Key tasks for this phase include codebase consolidation, enhancing development environment practices (e.g., linting, pre-commit hooks), and improving internal documentation.

**Progress on Phase 0.5 Tasks:**
- **`runSimulationAction` Redundancy:** The primary simulation logic is consolidated in `src/lib/store.ts`. The redundant `src/lib/actions/simulationActions.ts` file has been removed.
- **Project Structure Cleanup:** The unused `src/routes` directory (not needed for the current `App.svelte`-driven structure) has been removed.
- **Code Quality Standards:** Setup of ESLint, Prettier, and pre-commit hooks is pending.
- **Tailwind CSS Migration:** The project has migrated to Tailwind CSS v4+ using the new @tailwindcss/vite plugin. The legacy postcss.config.js is removed, and the global CSS now uses @import "tailwindcss". CSS is now working again after this migration.

## Tech Stack

- **Framework:** Svelte
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4+ via @tailwindcss/vite)
- **Build Pipeline:** No postcss.config.js required for Tailwind; uses Vite plugin integration.
- **Charting:** Chart.js
- **State Management:** Svelte Stores
- **Testing:** Vitest, Svelte Testing Library

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd tokenomicsmodel
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the port specified by Vite).

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Serves the production build locally.
- `npm run check`: Runs Svelte check and TypeScript compiler checks.
- `npm run test`: Runs unit tests with Vitest.
- `npm run test:watch`: Runs unit tests in watch mode.

## Future Development

Refer to `PLANNING.MD` and `TASKS.md` for detailed information on planned features and future development phases, including:
- Advanced vesting mechanisms.
- Dynamic minting and foundational staking.
- Treasury management features.
- User experience enhancements.
- Advanced modeling and analytics capabilities.
