import { appStateStore } from "$lib/store";
import {
    getSimulationDurationInTimeSteps,
    initializeSimulationData,
    runSingleSimulationStep,
    aggregateMonteCarloResults,
    type SimulationResults,
    type SimulationStepOutput
} from "$lib/simulationEngine";

export function runSimulationAction() {
    appStateStore.update(current => {
        const { entities, mintEvents, timeStep, totalSupply, monteCarlo, burnSinks } = current;
        const durationInTimeSteps = getSimulationDurationInTimeSteps(entities, mintEvents, timeStep);
        let results: SimulationResults;

        if (durationInTimeSteps <= 0) {
            return { 
                ...current, 
                simulationResults: { timeSeries: [], isMonteCarlo: false }
            };
        }

        if (monteCarlo.active && monteCarlo.iterations > 0) {
            const mcRuns: SimulationStepOutput[][] = [];
            for (let i = 0; i < monteCarlo.iterations; i++) {
                const singleSimData = initializeSimulationData(totalSupply, entities);
                const timeSeries: SimulationStepOutput[] = [];
                for (let t = 0; t < durationInTimeSteps; t++) {
                    timeSeries.push(runSingleSimulationStep(singleSimData, entities, burnSinks, mintEvents, timeStep, t, true, monteCarlo));
                }
                mcRuns.push(timeSeries);
            }
            results = aggregateMonteCarloResults(mcRuns, durationInTimeSteps, entities);
        } else {
            const simData = initializeSimulationData(totalSupply, entities);
            const timeSeries: SimulationStepOutput[] = [];
            for (let t = 0; t < durationInTimeSteps; t++) {
                timeSeries.push(runSingleSimulationStep(simData, entities, burnSinks, mintEvents, timeStep, t));
            }
            results = { timeSeries, isMonteCarlo: false };
        }
        return { ...current, simulationResults: results };
    });
}
