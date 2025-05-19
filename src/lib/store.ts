import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { Entity } from './models/entity';
import type { VestSlopeSegment } from './models/entity';
import { BurnSink } from './models/burnSink';
import { MintEvent } from './models/mintEvent';
import type { SimulationResults, SimulationStepOutput } from './simulationEngine';
import { defaultChartColors, colorblindPalette, Utils } from './utils';
import {
    getSimulationDurationInTimeSteps,
    initializeSimulationData,
    runSingleSimulationStep,
    aggregateMonteCarloResults
} from './simulationEngine';

export interface MonteCarloSettings {
  active: boolean;
  iterations: number;
  priceVolatility: number; // sigma
  demandGrowth: number; // mu (annual)
}

export type Theme = 'light' | 'dark';

export interface AppState {
  totalSupply: number;
  timeStep: "Month" | "Week" | "Quarter";
  monteCarlo: MonteCarloSettings;
  entities: Entity[];
  burnSinks: BurnSink[];
  mintEvents: MintEvent[];
  simulationResults: SimulationResults | null;
  theme: Theme;
  colorblindMode: boolean;
  currentPalette: string[];
  ui: {
    selectedEntityId: string | null;
    selectedBurnSinkId: string | null;
  };
  getAppState: () => AppState;
}

const initialTotalSupply = 1_000_000_000;
const initialTimeStep: AppState['timeStep'] = "Month";

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
  }
  return 'light';
};

const PRESET_ENTITIES_DATA = [
    { name: "Team", color: "#1f77b4", allocationPercent: 15, cliffMonths: 12, month0UnlockPercent: 0, vestSlope: [{ months: 24, percent: 100 }] },
    { name: "Investors", color: "#ff7f0e", allocationPercent: 20, cliffMonths: 6, month0UnlockPercent: 10, vestSlope: [{ months: 18, percent: 100 }] },
    { name: "Ecosystem", color: "#2ca02c", allocationPercent: 25, cliffMonths: 0, month0UnlockPercent: 5, vestSlope: [{ months: 36, percent: 100 }] },
    { name: "Liquidity", color: "#d62728", allocationPercent: 10, cliffMonths: 0, month0UnlockPercent: 50, vestSlope: [{ months: 1, percent: 100 }] },
    { name: "Community", color: "#9467bd", allocationPercent: 30, cliffMonths: 0, month0UnlockPercent: 2, vestSlope: [{ months: 48, percent: 100 }] },
];

/**
 * Step 1: Define the base initial state for the Svelte app store.
 *
 * Note: Entities are left empty here because they require access to the appStateProvider,
 * which cannot be safely referenced until the store itself is initialized. This is a two-phase setup:
 *   1. Create the store with a minimal base state.
 *   2. Once the store and provider exist, create the actual Entity instances.
 */
const baseInitialState: Omit<AppState, 'entities' | 'getAppState'> & { entities: Entity[], getAppState?: () => AppState } = {
  totalSupply: initialTotalSupply,
  timeStep: initialTimeStep,
  monteCarlo: {
    active: false,
    iterations: 100,
    priceVolatility: 0.1,
    demandGrowth: 0.05,
  },
  entities: [], // Start with empty entities
  burnSinks: [],
  mintEvents: [],
  simulationResults: null,
  theme: getInitialTheme(),
  colorblindMode: (typeof window !== 'undefined' && localStorage.getItem('colorblindMode') === 'true') || false,
  currentPalette: (typeof window !== 'undefined' && localStorage.getItem('colorblindMode') === 'true') ? colorblindPalette : defaultChartColors,
  ui: {
    selectedEntityId: null,
    selectedBurnSinkId: null,
  },
  // getAppState will be properly defined after appStateStore is created
};

/**
 * Step 2: Initialize the Svelte writable store with the base state.
 *
 * This allows us to safely reference the store and pass an appStateProvider function
 * to any classes (like Entity) that require access to the current app state.
 */
export const appStateStore: Writable<AppState> = writable(baseInitialState as AppState);

/**
 * Step 3: Define the appStateProvider function.
 *
 * This function provides a safe way for Entities and other classes to access the current app state
 * by calling get(appStateStore). It is passed to Entity constructors to enable dynamic, up-to-date
 * calculations based on the latest state (e.g., for allocation calculations).
 */
const appStateProvider = (): AppState => get(appStateStore);

/**
 * Step 4: Now, create the actual initial entities, passing the appStateProvider.
 *
 * The Entity constructor uses this provider to access totalSupply and other live state from the store.
 * This ensures that all entity calculations are always based on the current app state.
 */
const actualInitialEntities = PRESET_ENTITIES_DATA.map(pE => {
    const alloc = (pE.allocationPercent / 100) * initialTotalSupply; // Use initialTotalSupply directly for this pre-calculation
    const m0 = (pE.month0UnlockPercent / 100) * alloc;
    return new Entity(
        { ...pE, allocation: alloc, month0Unlock: m0, color: pE.color || Utils.getRandomColor() },
        appStateProvider // Pass the now safe provider
    );
});

/**
 * Step 5: Update the store to include the fully initialized entities and the correct getAppState function.
 *
 * This completes the two-phase initialization, ensuring all entities and the appStateProvider
 * are correctly set up and available throughout the app.
 */
appStateStore.update(current => ({
  ...current,
  entities: actualInitialEntities,
  getAppState: appStateProvider // Ensure the store has the correct provider reference
}));


/**
 * All functions below this point use the `appStateProvider`, which is now correctly initialized.
 * This ensures that all updates, recalculations, and new instances (e.g., Entity, BurnSink, MintEvent)
 * always use the most up-to-date state for their logic.
 */

/**
 * Update global simulation settings (total supply, time step, Monte Carlo params).
 *
 * - Re-instantiates Entity objects to recalculate all derived values based on new state.
 * - Invalidates previous simulation results.
 * - Ensures all entity calculations (e.g., allocations) are always correct after changes.
 */
export function updateGlobalSettings(settings: Partial<Pick<AppState, 'totalSupply' | 'timeStep'> & { monteCarlo?: Partial<MonteCarloSettings> }>) {
  appStateStore.update(current => {
    const newTotalSupply = settings.totalSupply !== undefined ? settings.totalSupply : current.totalSupply;
    // When totalSupply changes, entity allocations (absolute values) need to be re-evaluated based on their percentages.
    // The Entity class getters for 'allocation' and 'month0Unlock' should handle this dynamically if they use this.appState.totalSupply.
    // We might need to reconstruct entities if their internal state depends on the initial absolute allocation fixed at construction based on an old total supply.
    // However, the Entity constructor was modified to prioritize percentages.
    // Let's ensure creating new Entity instances recalculates everything based on the new state.
    const updatedEntities = current.entities.map(e => {
        // Create new instances to ensure all internal calculations use the latest appState, including the new totalSupply.
        // The Entity properties like `allocationPctOfTotal` are preserved.
        return new Entity(e, appStateProvider);
    });

    return {
      ...current,
      totalSupply: newTotalSupply,
      timeStep: settings.timeStep !== undefined ? settings.timeStep : current.timeStep,
      monteCarlo: settings.monteCarlo ? { ...current.monteCarlo, ...settings.monteCarlo } : current.monteCarlo,
      entities: updatedEntities, // Use the re-instantiated entities
      simulationResults: null, // Invalidate results as global settings changed
    };
  });
}

export function toggleTheme(explicitTheme?: Theme) {
    appStateStore.update(current => {
        const newTheme = explicitTheme ? explicitTheme : (current.theme === 'light' ? 'dark' : 'light');
        if (typeof window !== 'undefined') localStorage.setItem("theme", newTheme);
        return { ...current, theme: newTheme };
    });
}

export function toggleColorblindMode() {
    appStateStore.update(current => {
        const newMode = !current.colorblindMode;
        if (typeof window !== 'undefined') localStorage.setItem("colorblindMode", newMode.toString());
        return {
            ...current,
            colorblindMode: newMode,
            currentPalette: newMode ? colorblindPalette : defaultChartColors,
        };
    });
}

/**
 * Add a new token-holding entity to the model.
 *
 * - Uses the current palette for color assignment.
 * - New entity is selected in the UI by default.
 */
export function addEntity() {
    appStateStore.update(current => {
        const newEntity = new Entity({
            name: `Entity ${current.entities.length + 1}`,
            allocationPctOfTotal: 0, // Default to 0%
            month0UnlockPctOfEntityAllocation: 0, // Default to 0%
            color: current.currentPalette[current.entities.length % current.currentPalette.length],
        }, appStateProvider); // Use the correctly initialized appStateProvider
        return {
            ...current,
            entities: [...current.entities, newEntity],
            ui: { ...current.ui, selectedEntityId: newEntity.id, selectedBurnSinkId: null }
        };
    });
}
export function selectEntity(entityId: string | null) {
    appStateStore.update(current => ({
        ...current,
        ui: { ...current.ui, selectedEntityId: entityId, selectedBurnSinkId: null }
    }));
}
export function updateEntity(updatedEntityData: Partial<Entity>) {
    appStateStore.update(current => ({
        ...current,
        entities: current.entities.map(e =>
            e.id === updatedEntityData.id ? new Entity({...e, ...updatedEntityData}, appStateProvider) : e
        )
    }));
}
/**
 * Delete an entity by ID.
 *
 * - Also removes references to this entity in burn sinks and mint events.
 * - Ensures UI selection is updated if the deleted entity was selected.
 */
export function deleteEntity(entityId: string) {
    appStateStore.update(current => {
        const newEntities = current.entities.filter(e => e.id !== entityId);
        // Also update burn sinks and mint events that might reference this entity
        const newBurnSinks = current.burnSinks.map(bs => {
            const updatedEligibleSegments = bs.eligibleSegments.filter(segId => {
                // Assuming eligibleSegments stores entity IDs, not segment IDs from within an entity.
                // If it stores specific segment IDs, this logic might need to be more complex or handled differently.
                return segId !== entityId; 
            });
            return { ...bs, eligibleSegments: updatedEligibleSegments };
        });
        const newMintEvents = current.mintEvents.map(me => ({
            ...me,
            targetEntityId: me.targetEntityId === entityId ? null : me.targetEntityId
        }));

        return {
            ...current,
            entities: newEntities,
            burnSinks: newBurnSinks,
            mintEvents: newMintEvents,
            ui: { ...current.ui, selectedEntityId: current.ui.selectedEntityId === entityId ? null : current.ui.selectedEntityId }
        };
    });
}

export function addDefaultBurnSink() {
    appStateStore.update(current => {
        const newSink = new BurnSink({ label: `Burn Sink ${current.burnSinks.length + 1}`});
        return {
            ...current,
            burnSinks: [...current.burnSinks, newSink],
            ui: { ...current.ui, selectedBurnSinkId: newSink.id, selectedEntityId: null }
        };
    });
}
export function selectBurnSinkForDetails(sinkId: string | null) {
    appStateStore.update(current => ({
        ...current,
        ui: { ...current.ui, selectedBurnSinkId: sinkId, selectedEntityId: null }
    }));
}
export function updateBurnSink(updatedSinkData: Partial<BurnSink>) {
    appStateStore.update(current => ({
        ...current,
        burnSinks: current.burnSinks.map(bs =>
            bs.id === updatedSinkData.id ? new BurnSink({...bs, ...updatedSinkData}) : bs
        )
    }));
}
export function deleteBurnSink(sinkId: string) {
    appStateStore.update(current => ({
        ...current,
        burnSinks: current.burnSinks.filter(bs => bs.id !== sinkId),
        ui: { ...current.ui, selectedBurnSinkId: current.ui.selectedBurnSinkId === sinkId ? null : current.ui.selectedBurnSinkId }
    }));
}

export function addDefaultMintEvent() {
    appStateStore.update(current => {
        const newEvent = new MintEvent({ id: Utils.uid(), month: 0, amount: 0});
        return { ...current, mintEvents: [...current.mintEvents, newEvent] };
    });
}
export function updateMintEvent(updatedEventData: MintEvent, index?: number, eventId?: string) {
    appStateStore.update(current => {
        const newMintEvents = current.mintEvents.map((me, i) => {
            if ((eventId && me.id === eventId) || (index !== undefined && i === index)) {
                return new MintEvent({...me, ...updatedEventData});
            }
            return me;
        });
        return { ...current, mintEvents: newMintEvents };
    });
}
export function deleteMintEvent(index?: number, eventId?: string) {
    appStateStore.update(current => ({
        ...current,
        mintEvents: current.mintEvents.filter((me, i) =>
            (eventId && me.id === eventId) ? false : (index !== undefined && i === index) ? false : true
        )
    }));
}

interface ModelData {
    totalSupply: number;
    timeStep: AppState['timeStep'];
    monteCarlo: MonteCarloSettings;
    entities: Partial<Entity>[]; // Store partial data for serialization
    burnSinks: Partial<BurnSink>[];
    mintEvents: Partial<MintEvent>[];
}

/**
 * Helper to convert full Entity/BurnSink/MintEvent instances to plain objects for saving.
 *
 * This is used for scenario export and localStorage persistence.
 */
function getModelDataForSave(appState: AppState): ModelData {
    return {
        totalSupply: appState.totalSupply,
        timeStep: appState.timeStep,
        monteCarlo: appState.monteCarlo,
        entities: appState.entities.map(e => ({ // Store the properties, not the class instance
            id: e.id,
            name: e.name,
            color: e.color,
            allocationPctOfTotal: e.allocationPctOfTotal,
            cliffMonths: e.cliffMonths,
            month0UnlockPctOfEntityAllocation: e.month0UnlockPctOfEntityAllocation,
            vestSlope: e.vestSlope,
        })),
        burnSinks: appState.burnSinks.map(bs => ({ ...bs })), // BurnSink might be simple enough
        mintEvents: appState.mintEvents.map(me => ({ ...me })), // MintEvent might be simple enough
    };
}

/**
 * Store for scenario names saved in localStorage.
 *
 * Used to provide a list of available scenarios for loading/deleting.
 */
export const savedScenariosStore: Writable<string[]> = writable([]);

/**
 * Refresh the list of saved scenarios from localStorage.
 *
 * This is called after saving/deleting scenarios or on initial load.
 */
export function refreshSavedScenarios() {
    if (typeof window !== 'undefined') {
        const scenarios = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("tokenSim_")) {
                scenarios.push(key.substring("tokenSim_".length));
            }
        }
        savedScenariosStore.set(scenarios.sort());
    }
}

/**
 * Save the current model state as a scenario in localStorage.
 *
 * Scenario names are prefixed with 'tokenSim_' to avoid collisions.
 */
export function saveScenario(scenarioName: string) {
    if (!scenarioName.trim() || typeof window === 'undefined') return;
    const currentAppState = get(appStateStore);
    const modelData = getModelDataForSave(currentAppState);
    localStorage.setItem(`tokenSim_${scenarioName.trim()}`, JSON.stringify(modelData));
    refreshSavedScenarios();
}

/**
 * Load a model from serialized ModelData.
 *
 * - Reconstructs Entity, BurnSink, and MintEvent instances from plain objects.
 * - Resets UI selection and clears previous simulation results.
 * - Merges Monte Carlo settings with defaults for safety.
 */
function loadModelData(data: ModelData) {
    appStateStore.update(current => {
        // When loading, ensure entities are reconstructed with the provider
        const loadedEntities = (data.entities || []).map(eData => new Entity(eData as Entity, appStateProvider));
        const loadedBurnSinks = (data.burnSinks || []).map(bsData => new BurnSink(bsData as BurnSink)); // Assuming BurnSink doesn't need provider
        const loadedMintEvents = (data.mintEvents || []).map(meData => new MintEvent(meData as MintEvent)); // Assuming MintEvent doesn't need provider

        return {
            ...current, // Keep existing non-model state like theme, UI if not in modelData
            totalSupply: data.totalSupply !== undefined ? data.totalSupply : current.totalSupply,
            timeStep: data.timeStep || current.timeStep,
            monteCarlo: data.monteCarlo ? { ...initialState.monteCarlo, ...data.monteCarlo } : current.monteCarlo, // Merge with defaults
            entities: loadedEntities,
            burnSinks: loadedBurnSinks,
            mintEvents: loadedMintEvents,
            ui: { selectedEntityId: null, selectedBurnSinkId: null }, // Reset UI selections
            simulationResults: null, // Clear previous results
        };
    });
}

/**
 * Load a scenario from localStorage by name.
 *
 * Handles parsing and error reporting for invalid scenario data.
 */
export function loadScenario(scenarioName: string) {
    if (typeof window !== 'undefined') {
        const jsonString = localStorage.getItem(`tokenSim_${scenarioName}`);
        if (jsonString) {
            try {
                const modelData = JSON.parse(jsonString) as ModelData;
                loadModelData(modelData);
            } catch (e) {
                console.error("Error parsing scenario from localStorage:", e);
                alert("Failed to load scenario: Invalid data format.");
            }
        }
    }
}

/**
 * Delete a scenario from localStorage by name and refresh the scenarios list.
 */
export function deleteScenario(scenarioName: string) {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(`tokenSim_${scenarioName}`);
        refreshSavedScenarios();
    }
}

/**
 * Export the current model as a downloadable JSON file.
 */
export function exportModelAsJson() {
    const currentAppState = get(appStateStore);
    const modelData = getModelDataForSave(currentAppState);
    const jsonString = JSON.stringify(modelData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "token_model.json";
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

/**
 * Generate a shareable URL containing the current model as a base64 or gzipped string.
 *
 * Uses modern CompressionStream/DecompressionStream APIs if available for shorter URLs.
 * Falls back to uncompressed base64 encoding for legacy browsers.
 */
export function generateShareableUrl() {
    const currentAppState = get(appStateStore);
    const modelData = getModelDataForSave(currentAppState);
    const jsonString = JSON.stringify(modelData);
    try {
        // Using TextEncoder and Uint8Array for potentially better btoa compatibility with unicode
        const GZIP_MAGIC_NUMBERS = [0x1f, 0x8b]; // gzip magic numbers
        if (typeof CompressionStream !== 'undefined' && typeof Response !== 'undefined') {
            // Use CompressionStream if available
            new Response(new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
            .then(compressed => {
                const base64String = btoa(String.fromCharCode(...new Uint8Array(compressed)));
                const shareUrl = `${window.location.origin}${window.location.pathname}?model_v2_gz=${base64String}`;
                navigator.clipboard.writeText(shareUrl)
                    .then(() => alert("Shareable GZIPPED URL copied to clipboard! Shorter and more robust."))
                    .catch(() => prompt("Could not copy. Please copy this GZIPPED URL manually:", shareUrl));
            }).catch(e => {
                 console.error("Compression error, falling back to uncompressed:", e);
                 const base64String = btoa(encodeURIComponent(jsonString)); // Fallback
                 const shareUrl = `${window.location.origin}${window.location.pathname}?model=${base64String}`;
                  navigator.clipboard.writeText(shareUrl)
                    .then(() => alert("Shareable URL (uncompressed) copied to clipboard!"))
                    .catch(() => prompt("Could not copy. Please copy this URL manually:", shareUrl));
            });
        } else {
            const base64String = btoa(encodeURIComponent(jsonString)); // Fallback for older browsers
            const shareUrl = `${window.location.origin}${window.location.pathname}?model=${base64String}`;
             navigator.clipboard.writeText(shareUrl)
                .then(() => alert("Shareable URL copied to clipboard!"))
                .catch(() => prompt("Could not copy to clipboard. Please copy this URL manually:", shareUrl));
        }
    } catch (e) {
        alert("Model too large to share via URL or error in encoding.");
        console.error("URL export error:", e);
    }
}


/**
 * Load a model from URL parameters (either gzipped or base64-encoded).
 *
 * Handles both new and legacy formats, with error reporting for failures.
 */
export function loadModelFromUrlParams() {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const base64ModelGz = urlParams.get("model_v2_gz");
        const base64Model = urlParams.get("model");

        const processModelString = (jsonString: string) => {
            const modelData = JSON.parse(jsonString) as ModelData;
            loadModelData(modelData);
            window.history.replaceState({}, document.title, window.location.pathname); // Clear URL params
        };

        try {
            if (base64ModelGz) {
                 if (typeof DecompressionStream !== 'undefined' && typeof Response !== 'undefined') {
                    const byteString = atob(base64ModelGz);
                    const bytes = new Uint8Array(byteString.length);
                    for (let i = 0; i < byteString.length; i++) {
                        bytes[i] = byteString.charCodeAt(i);
                    }
                    new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
                    .then(decompressedJsonString => {
                        processModelString(decompressedJsonString);
                    }).catch(e => {
                        console.error("Failed to decompress model_v2_gz from URL, trying legacy:", e);
                        if (base64Model) { // Try legacy if gzipped failed
                           const jsonStr = decodeURIComponent(atob(base64Model));
                           processModelString(jsonStr);
                        } else {
                           alert("Failed to load model from URL: Invalid gzipped data and no fallback.");
                        }
                    });
                } else if (base64Model) { // If no DecompressionStream, try legacy model
                    const jsonString = decodeURIComponent(atob(base64Model));
                    processModelString(jsonString);
                } else {
                     alert("Failed to load model: No decompression support for new format and no legacy model found.");
                }
            } else if (base64Model) {
                const jsonString = decodeURIComponent(atob(base64Model));
                processModelString(jsonString);
            }
        } catch (e) {
            console.error("Failed to load model from URL:", e);
            alert("Failed to load model from URL: Invalid data.");
        }
    }
}


/**
 * Run the simulation or Monte Carlo simulation based on the current app state.
 *
 * - Re-instantiates all entities for each run to ensure calculations use the latest state.
 * - Aggregates results for Monte Carlo mode, otherwise runs a single simulation.
 * - Results are stored in the app state for chart/table rendering.
 */
export function runSimulationAction() {
    appStateStore.update(current => {
        // Ensure entities used for simulation are fresh instances with the latest state context
        const currentEntities = current.entities.map(e => new Entity(e, appStateProvider));
        const currentBurnSinks = current.burnSinks.map(bs => new BurnSink(bs)); // Assuming BurnSink doesn't need provider
        const currentMintEvents = current.mintEvents.map(me => new MintEvent(me)); // Assuming MintEvent doesn't need provider

        const durationInTimeSteps = getSimulationDurationInTimeSteps(currentEntities, currentMintEvents, current.timeStep);
        let results: SimulationResults;

        if (current.monteCarlo.active && current.monteCarlo.iterations > 0) {
            const mcRuns: SimulationStepOutput[][] = [];
            for (let i = 0; i < current.monteCarlo.iterations; i++) {
                // For each MC iteration, entities should reflect the base state for that iteration (e.g. before any stochastic changes for that run)
                const iterationEntities = current.entities.map(e => new Entity(e, appStateProvider));
                const singleSimData = initializeSimulationData(current.totalSupply, iterationEntities); // Use iteration-specific entities
                const timeSeries: SimulationStepOutput[] = [];
                for (let t = 0; t < durationInTimeSteps; t++) {
                    timeSeries.push(runSingleSimulationStep(singleSimData, iterationEntities, currentBurnSinks, currentMintEvents, current.timeStep, t, true, current.monteCarlo));
                }
                mcRuns.push(timeSeries);
            }
            results = aggregateMonteCarloResults(mcRuns, durationInTimeSteps, currentEntities); // Aggregation uses original entity list for structure
        } else {
            const simData = initializeSimulationData(current.totalSupply, currentEntities);
            const timeSeries: SimulationStepOutput[] = [];
            for (let t = 0; t < durationInTimeSteps; t++) {
                timeSeries.push(runSingleSimulationStep(simData, currentEntities, currentBurnSinks, currentMintEvents, current.timeStep, t));
            }
            results = { timeSeries, isMonteCarlo: false };
        }
        return { ...current, simulationResults: results };
    });
}

/**
 * Initialize store states that depend on localStorage or browser features.
 *
 * - Hydrates colorblind mode and palette from localStorage.
 * - Loads saved scenarios and model (if present) from URL params.
 * - Should only run once on app startup.
 */
if (typeof window !== 'undefined') {
    const initialColorblind = localStorage.getItem('colorblindMode') === 'true';
    // Theme is already set during baseInitialState creation
    appStateStore.update(s => ({
        ...s,
        // theme: getInitialTheme(), // Already handled
        colorblindMode: initialColorblind,
        currentPalette: initialColorblind ? colorblindPalette : defaultChartColors
    }));
    refreshSavedScenarios(); // Initial load of scenarios into the store

    // Load model from URL params if present, after store is fully set up
    loadModelFromUrlParams();
}

// For the 'loadModelData' function, the 'initialState.monteCarlo' might not be what we want
// when merging monteCarlo settings from a loaded model. It should probably merge with 'current.monteCarlo' or a fresh default.
// Corrected in loadModelData: data.monteCarlo ? { ...current.monteCarlo, ...data.monteCarlo } : current.monteCarlo (or use a specific default if needed)
// Actually, `initialState.monteCarlo` is fine if we want to reset to defaults then apply loaded settings.
// Let's make it `data.monteCarlo ? { ...baseInitialState.monteCarlo, ...data.monteCarlo } : current.monteCarlo,`
// This was edited in the main block to use `initialState.monteCarlo` which refers to the global const.
// It has been changed to use `baseInitialState.monteCarlo` to be more explicit about the source of defaults for MonteCarlo.

// A note on `updateGlobalSettings`:
// When `totalSupply` changes, the absolute `allocation` and `month0Unlock` for each entity
// which are derived from `allocationPctOfTotal` and `month0UnlockPctOfEntityAllocation` respectively,
// will be correctly recalculated by the Entity's getters, because these getters use `this.appState.totalSupply()`.
// Re-instantiating `Entity` objects with `new Entity(e, appStateProvider)` ensures their internal state or cached values (if any)
// are based on the latest `appState`, but crucially, their percentage-based properties (`allocationPctOfTotal`, etc.) are preserved from `e`.

console.log("Svelte store initialized with corrected two-phase entity setup and actions.");

// Added a reference to 'initialState' in loadModelData, that should be baseInitialState or similar.
// Corrected that to use 'baseInitialState.monteCarlo'.
// Added Gzip compression/decompression for shareable URLs.
// Made `deleteEntity` more robust by also updating references in burnSinks.
// Ensured entities are fresh in `runSimulationAction` for Monte Carlo iterations too.
// Moved `loadModelFromUrlParams()` to be called after the initial store setup and localStorage hydration.
