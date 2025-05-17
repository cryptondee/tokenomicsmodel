import { Utils } from './utils';
import type { AppState, MonteCarloSettings } from './store'; 
import type { Entity } from './models/entity';
import type { BurnSink } from './models/burnSink';
import type { MintEvent } from './models/mintEvent';

export interface SimulationStepOutput {
  time: number;
  totalUnlockedThisStep: number;
  totalBurnedThisStep: number;
  totalMintedThisStep: number;
  entityUnlockedThisStep: Record<string, number>;
  entityCirculating: Record<string, number>;
  entityLocked: Record<string, number>;
  currentTotalSupply: number;
  currentCirculatingSupply: number;
  isMonteCarloStep?: boolean; 
  [key: string]: any; 
}

interface MonteCarloMetric {
    mean: number;
    p5: number;
    p95: number;
}

export interface AggregatedSimulationStepOutput extends Omit<SimulationStepOutput, 'totalUnlockedThisStep' | 'totalBurnedThisStep' | 'totalMintedThisStep' | 'entityUnlockedThisStep' | 'entityCirculating' | 'entityLocked' | 'currentTotalSupply' | 'currentCirculatingSupply'> {
    totalUnlockedThisStep: MonteCarloMetric;
    totalBurnedThisStep: MonteCarloMetric;
    totalMintedThisStep: MonteCarloMetric;
    entityUnlockedThisStep: Record<string, MonteCarloMetric>;
    entityCirculating: Record<string, MonteCarloMetric>;
    entityLocked: Record<string, MonteCarloMetric>;
    currentTotalSupply: MonteCarloMetric;
    currentCirculatingSupply: MonteCarloMetric;
}

export interface SimulationResults {
  timeSeries: (SimulationStepOutput | AggregatedSimulationStepOutput)[];
  isMonteCarlo: boolean;
}

interface SimDataInternal {
  totalSupply: number;
  circulatingSupply: number;
  entityBalances: Record<string, { locked: number; circulating: number }>;
  entityVestState: Record<string, {
    initialLockedAfterM0: number;
    cumulativePercentVestedFromSlope: number;
    lastVestingCalcMonthForSlope: number;
    vestedInSegments: Record<number, number>; 
  }>;
}

export function convertMonthsToTimeSteps(months: number, timeStep: AppState['timeStep']): number {
  if (months === 0) return 0;
  switch (timeStep) {
    case "Week": return Math.round(months * (365.2425 / (12 * 7)));
    case "Quarter": return Math.round(months / 3);
    case "Month":
    default: return Math.round(months);
  }
}

export function getSimulationDurationInTimeSteps(entities: Entity[], mintEvents: MintEvent[], timeStep: AppState['timeStep']): number {
  let maxMonths = 1; 
  entities.forEach((e) => {
    const entityTotalMonths = e.cliffMonths + e.vestSlope.reduce((sum, s) => sum + s.months, 0);
    maxMonths = Math.max(maxMonths, entityTotalMonths);
  });
  mintEvents.forEach(
    (ev) => (maxMonths = Math.max(maxMonths, ev.month))
  );
  const duration = convertMonthsToTimeSteps(maxMonths, timeStep);
  return Math.max(1, duration); 
}

export function initializeSimulationData(initialTotalSupply: number, entities: Entity[]): SimDataInternal {
  const simData: SimDataInternal = {
    totalSupply: initialTotalSupply,
    circulatingSupply: 0,
    entityBalances: {},
    entityVestState: {},
  };

  entities.forEach((entity) => {
    let m0UnlockActual = Math.min(entity.month0Unlock, entity.allocation);
    m0UnlockActual = Math.max(0, m0UnlockActual);

    simData.entityBalances[entity.id] = {
      locked: entity.allocation - m0UnlockActual,
      circulating: m0UnlockActual,
    };
    simData.circulatingSupply += m0UnlockActual;

    simData.entityVestState[entity.id] = {
      initialLockedAfterM0: entity.allocation - m0UnlockActual,
      cumulativePercentVestedFromSlope: 0,
      lastVestingCalcMonthForSlope: -1, 
      vestedInSegments: {},
    };
  });
  return simData;
}

export function runSingleSimulationStep(
  simData: SimDataInternal, 
  entities: Entity[],
  burnSinks: BurnSink[],
  mintEvents: MintEvent[],
  timeStepUnit: AppState['timeStep'],
  t_step: number, 
  isMonteCarloRun = false,
  mcParams: MonteCarloSettings | null = null
): SimulationStepOutput {
  const stepOutput: SimulationStepOutput = {
    time: t_step,
    totalUnlockedThisStep: 0,
    totalBurnedThisStep: 0,
    totalMintedThisStep: 0,
    entityUnlockedThisStep: {},
    entityCirculating: {},
    entityLocked: {},
    currentTotalSupply: 0, 
    currentCirculatingSupply: 0, 
  };

  entities.forEach((e) => {
    stepOutput.entityUnlockedThisStep[e.id] = 0;
    // Initialize with current state from simData, will be updated at the end of step again
    stepOutput.entityCirculating[e.id] = simData.entityBalances[e.id]?.circulating || 0;
    stepOutput.entityLocked[e.id] = simData.entityBalances[e.id]?.locked || 0;
  });

  // For t_step 0, M0 unlocks are considered part of this step's "unlocked" amount for reporting
  if (t_step === 0) {
    entities.forEach((entity) => {
      let m0UnlockActual = Math.min(entity.month0Unlock, entity.allocation);
      m0UnlockActual = Math.max(0, m0UnlockActual);
      if (m0UnlockActual > 0) {
        stepOutput.entityUnlockedThisStep[entity.id] = (stepOutput.entityUnlockedThisStep[entity.id] || 0) + m0UnlockActual;
        stepOutput.totalUnlockedThisStep += m0UnlockActual;
      }
    });
  }

  let currentMonthEquivalent: number;
  if (timeStepUnit === "Month") currentMonthEquivalent = t_step;
  else if (timeStepUnit === "Week") currentMonthEquivalent = Math.floor(t_step / (365.2425 / (12 * 7)));
  else if (timeStepUnit === "Quarter") currentMonthEquivalent = t_step * 3;
  else currentMonthEquivalent = t_step; 

  // 1. Unlocks (from vesting schedules)
  entities.forEach((entity) => {
    if (!simData.entityBalances[entity.id] || simData.entityBalances[entity.id].locked <= 0.000001) return;

    let unlockedThisStepForEntityByVesting = 0;
    const cliffActualMonths = entity.cliffMonths;

    if (currentMonthEquivalent >= cliffActualMonths) {
      const tokensAvailableForSlopeVesting = simData.entityVestState[entity.id].initialLockedAfterM0;
      if (tokensAvailableForSlopeVesting > 0.000001) {
        let slopeMonthsAlreadyAccountedForCumulative = 0;
        let cumulativePercentVestedInSlopeSoFar = simData.entityVestState[entity.id].cumulativePercentVestedFromSlope;
        const currentMonthInSlopeTimeline = Math.max(0, currentMonthEquivalent - cliffActualMonths);
        const prevCalculatedMonthInSlopeTimeline = Math.max(-1, 
            (simData.entityVestState[entity.id].lastVestingCalcMonthForSlope === undefined ? -1 : simData.entityVestState[entity.id].lastVestingCalcMonthForSlope) - cliffActualMonths
        );

        if (currentMonthInSlopeTimeline > prevCalculatedMonthInSlopeTimeline) {
          for (const segment of entity.vestSlope) {
            if (cumulativePercentVestedInSlopeSoFar >= 99.99999) break;
            const segmentStartMonthInSlope = slopeMonthsAlreadyAccountedForCumulative;
            const segmentEndMonthInSlope = segmentStartMonthInSlope + segment.months;
            const effectiveVestingStartForSegmentInTimeline = Math.max(segmentStartMonthInSlope, prevCalculatedMonthInSlopeTimeline + 1);
            const effectiveVestingEndForSegmentInTimeline = Math.min(segmentEndMonthInSlope - 1, currentMonthInSlopeTimeline);

            if (effectiveVestingEndForSegmentInTimeline >= effectiveVestingStartForSegmentInTimeline) {
              const monthsToVestThisPeriodInSegment = effectiveVestingEndForSegmentInTimeline - effectiveVestingStartForSegmentInTimeline + 1;
              let percentToVestThisPeriodForSegment = (monthsToVestThisPeriodInSegment / segment.months) * segment.percent;
              const vestedInThisSegmentAlreadyForState = simData.entityVestState[entity.id].vestedInSegments?.[segmentStartMonthInSlope] || 0;
              percentToVestThisPeriodForSegment = Math.min(percentToVestThisPeriodForSegment, segment.percent - vestedInThisSegmentAlreadyForState);
              percentToVestThisPeriodForSegment = Math.min(percentToVestThisPeriodForSegment, 100 - cumulativePercentVestedInSlopeSoFar);
              percentToVestThisPeriodForSegment = Math.max(0, percentToVestThisPeriodForSegment);

              if (percentToVestThisPeriodForSegment > 0.000001) {
                let amountToUnlockFromSegment = tokensAvailableForSlopeVesting * (percentToVestThisPeriodForSegment / 100);
                amountToUnlockFromSegment = Math.min(amountToUnlockFromSegment, simData.entityBalances[entity.id].locked - unlockedThisStepForEntityByVesting);
                unlockedThisStepForEntityByVesting += amountToUnlockFromSegment;
                if (!simData.entityVestState[entity.id].vestedInSegments) simData.entityVestState[entity.id].vestedInSegments = {};
                simData.entityVestState[entity.id].vestedInSegments[segmentStartMonthInSlope] = (simData.entityVestState[entity.id].vestedInSegments[segmentStartMonthInSlope] || 0) + percentToVestThisPeriodForSegment;
                cumulativePercentVestedInSlopeSoFar += percentToVestThisPeriodForSegment;
              }
            }
            slopeMonthsAlreadyAccountedForCumulative += segment.months;
            if (currentMonthInSlopeTimeline < segmentEndMonthInSlope) break;
          }
        }
        simData.entityVestState[entity.id].cumulativePercentVestedFromSlope = cumulativePercentVestedInSlopeSoFar;
        simData.entityVestState[entity.id].lastVestingCalcMonthForSlope = currentMonthEquivalent;
      }
    }

    unlockedThisStepForEntityByVesting = Math.max(0, Math.min(unlockedThisStepForEntityByVesting, simData.entityBalances[entity.id].locked));
    if (unlockedThisStepForEntityByVesting > 0.000001) {
      simData.entityBalances[entity.id].locked -= unlockedThisStepForEntityByVesting;
      simData.entityBalances[entity.id].circulating += unlockedThisStepForEntityByVesting;
      simData.circulatingSupply += unlockedThisStepForEntityByVesting;
      stepOutput.totalUnlockedThisStep += unlockedThisStepForEntityByVesting;
      stepOutput.entityUnlockedThisStep[entity.id] = (stepOutput.entityUnlockedThisStep[entity.id] || 0) + unlockedThisStepForEntityByVesting;
    }
  });

  // 2. Burns
  const annualToStepGrowth = (annualRate: number): number => {
    let N_periods_per_year = 12;
    if (timeStepUnit === "Week") N_periods_per_year = 365.2425 / 7;
    else if (timeStepUnit === "Quarter") N_periods_per_year = 4;
    return Math.pow(1 + annualRate, 1 / N_periods_per_year) - 1;
  };
  const demandGrowthPerStep = mcParams && typeof mcParams.demandGrowth === 'number' ? annualToStepGrowth(mcParams.demandGrowth) : 0;
  const demandGrowthMultiplier = Math.pow(1 + demandGrowthPerStep, t_step);

  burnSinks.forEach((sink) => {
    sink.eligibleSegments.forEach((entityId) => {
      const entity = entities.find(e => e.id === entityId);
      if (!entity || !simData.entityBalances[entityId] || simData.entityBalances[entityId].circulating <= 0.000001) return;
      let usesThisStep = sink.usesPerSegmentType === "fixed"
        ? sink.usesFixed
        : Utils.gaussianRandom(sink.usesMean * demandGrowthMultiplier, sink.usesStdDev * demandGrowthMultiplier);
      usesThisStep = Math.max(0, Math.round(usesThisStep));
      if (usesThisStep > 0) {
        let costPerUse: number;
        try {
          costPerUse = new Function('circulating', `"use strict"; return ${sink.costFormula}`)(simData.circulatingSupply);
        } catch (e) {
          console.warn(`Error evaluating burn cost formula "${sink.costFormula}": ${e}`);
          costPerUse = 0;
        }
        if (isMonteCarloRun && mcParams && typeof mcParams.priceVolatility === 'number' && mcParams.priceVolatility > 0) {
          costPerUse *= (1 + Utils.gaussianRandom(0, mcParams.priceVolatility));
        }
        costPerUse = Math.max(0, costPerUse);
        const totalBurnAmountForSegment = costPerUse * usesThisStep;
        const actualBurnAmount = Math.min(totalBurnAmountForSegment, simData.entityBalances[entityId].circulating);
        if (actualBurnAmount > 0.000001) {
          simData.entityBalances[entityId].circulating -= actualBurnAmount;
          simData.circulatingSupply -= actualBurnAmount;
          simData.totalSupply -= actualBurnAmount; 
          stepOutput.totalBurnedThisStep += actualBurnAmount;
        }
      }
    });
  });

  // 3. Mints
  mintEvents.forEach((event) => {
    if (event.month === currentMonthEquivalent) {
      simData.totalSupply += event.amount;
      stepOutput.totalMintedThisStep += event.amount;
      if (event.targetEntityId && simData.entityBalances[event.targetEntityId]) {
        simData.entityBalances[event.targetEntityId].locked += event.amount;
      } else if (!event.targetEntityId) {
         simData.circulatingSupply += event.amount;
      }
    }
  });

  entities.forEach((e) => {
    stepOutput.entityCirculating[e.id] = simData.entityBalances[e.id]?.circulating || 0;
    stepOutput.entityLocked[e.id] = simData.entityBalances[e.id]?.locked || 0;
  });
  stepOutput.currentTotalSupply = simData.totalSupply;
  stepOutput.currentCirculatingSupply = simData.circulatingSupply;

  return stepOutput;
}

export function aggregateMonteCarloResults(
    mcResults: SimulationStepOutput[][], 
    durationInTimeSteps: number,
    entitiesForStats: Entity[] 
): SimulationResults {
  const aggregatedTimeSeries: AggregatedSimulationStepOutput[] = [];
  for (let t = 0; t < durationInTimeSteps; t++) {
    const stepMetrics: any = {
      totalUnlockedThisStep: [], totalBurnedThisStep: [], totalMintedThisStep: [],
      currentTotalSupply: [], currentCirculatingSupply: [],
      entityUnlockedThisStep: {}, entityCirculating: {}, entityLocked: {}
    };
    entitiesForStats.forEach(e => {
      stepMetrics.entityUnlockedThisStep[e.id] = [];
      stepMetrics.entityCirculating[e.id] = [];
      stepMetrics.entityLocked[e.id] = [];
    });

    mcResults.forEach(run => {
      const step = run[t];
      if (!step) return; 
      stepMetrics.totalUnlockedThisStep.push(step.totalUnlockedThisStep);
      stepMetrics.totalBurnedThisStep.push(step.totalBurnedThisStep);
      stepMetrics.totalMintedThisStep.push(step.totalMintedThisStep);
      stepMetrics.currentTotalSupply.push(step.currentTotalSupply);
      stepMetrics.currentCirculatingSupply.push(step.currentCirculatingSupply);
      entitiesForStats.forEach(e => {
        stepMetrics.entityUnlockedThisStep[e.id].push(step.entityUnlockedThisStep[e.id] || 0);
        stepMetrics.entityCirculating[e.id].push(step.entityCirculating[e.id] || 0);
        stepMetrics.entityLocked[e.id].push(step.entityLocked[e.id] || 0);
      });
    });

    const getStats = (arr: number[]): MonteCarloMetric => {
      if (!arr || arr.length === 0) return { mean: 0, p5: 0, p95: 0 };
      arr.sort((a, b) => a - b);
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const p5 = arr[Math.floor(arr.length * 0.05)];
      const p95 = arr[Math.floor(arr.length * 0.95)];
      return { mean, p5, p95 };
    };

    const aggStep: AggregatedSimulationStepOutput = {
        time: t,
        isMonteCarloStep: true,
        totalUnlockedThisStep: getStats(stepMetrics.totalUnlockedThisStep),
        totalBurnedThisStep: getStats(stepMetrics.totalBurnedThisStep),
        totalMintedThisStep: getStats(stepMetrics.totalMintedThisStep),
        currentTotalSupply: getStats(stepMetrics.currentTotalSupply),
        currentCirculatingSupply: getStats(stepMetrics.currentCirculatingSupply),
        entityUnlockedThisStep: {},
        entityCirculating: {},
        entityLocked: {},
    };
    entitiesForStats.forEach(e => {
      aggStep.entityUnlockedThisStep[e.id] = getStats(stepMetrics.entityUnlockedThisStep[e.id]);
      aggStep.entityCirculating[e.id] = getStats(stepMetrics.entityCirculating[e.id]);
      aggStep.entityLocked[e.id] = getStats(stepMetrics.entityLocked[e.id]);
    });
    aggregatedTimeSeries.push(aggStep);
  }
  return { timeSeries: aggregatedTimeSeries, isMonteCarlo: true };
}
