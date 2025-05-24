import { describe, it, expect, vi } from 'vitest';
import { 
  convertMonthsToTimeSteps, 
  getSimulationDurationInTimeSteps,
  initializeSimulationData,
  runSingleSimulationStep,
  // Will import aggregateMonteCarloResults later
} from './simulationEngine'; 
import type { Entity, VestingSegment } from './models/entity';
import type { BurnSink } from './models/burnSink';
import type { MintEvent } from './models/mintEvent';
import type { AppState, MonteCarloSettings } from './store'; // Assuming AppState is defined in store
import type { SimDataInternal } from './simulationEngine'; // Import internal type if needed for test setup

describe('simulationEngine core functions', () => {
  describe('convertMonthsToTimeSteps', () => {
    it('should correctly convert months to Months', () => {
      const timeStep = 'Month';
      expect(convertMonthsToTimeSteps(12, timeStep)).toBe(12);
      expect(convertMonthsToTimeSteps(0, timeStep)).toBe(0);
      expect(convertMonthsToTimeSteps(1, timeStep)).toBe(1);
    });

    it('should correctly convert months to Weeks', () => {
      const timeStep = 'Week';
      expect(convertMonthsToTimeSteps(1, timeStep)).toBe(Math.round(1 * (365.2425 / (12 * 7))));
      expect(convertMonthsToTimeSteps(3, timeStep)).toBe(Math.round(3 * (365.2425 / (12 * 7))));
      expect(convertMonthsToTimeSteps(0, timeStep)).toBe(0);
    });

    it('should correctly convert months to Quarters', () => {
      const timeStep = 'Quarter';
      expect(convertMonthsToTimeSteps(12, timeStep)).toBe(4);
      expect(convertMonthsToTimeSteps(3, timeStep)).toBe(1);
      expect(convertMonthsToTimeSteps(1, timeStep)).toBe(Math.round(1/3));
      expect(convertMonthsToTimeSteps(2, timeStep)).toBe(Math.round(2/3));
      expect(convertMonthsToTimeSteps(0, timeStep)).toBe(0);
    });

    it('should handle undefined or unexpected timeStep gracefully (defaults to Month)', () => {
      const timeStepUnk = 'Year' as any; 
      expect(convertMonthsToTimeSteps(12, timeStepUnk)).toBe(12);
      const timeStepUnd = undefined as any;
      expect(convertMonthsToTimeSteps(12, timeStepUnd)).toBe(12);
    });
  });

  describe('getSimulationDurationInTimeSteps', () => {
    const mockEntityBaseGSD = (id: string): Omit<Entity, 'allocation' | 'month0Unlock' | 'cliffMonths' | 'vestSlope'> => ({
        id,
        name: `Entity ${id}`,
        color: '#ffffff',
        get allocationPercent() { return 0; },
        get month0UnlockPercent() { return 0; },
        validateVestSlope: vi.fn(),
    });

    const mockEntityGSD = (id: string, cliff: number, vestSlopeMonths: number[], allocationVal = 1000, m0UnlockVal = 0): Entity => ({
      ...mockEntityBaseGSD(id),
      allocation: allocationVal,
      month0Unlock: m0UnlockVal, 
      cliffMonths: cliff,
      vestSlope: vestSlopeMonths.map(m => ({ months: m, percent: 100/ (vestSlopeMonths.length || 1) })) as VestingSegment[],
    });

    const mockMintEventGSD = (month: number): MintEvent => ({
      id: `mint-${month}`,
      amount: 0, 
      targetEntityId: null,
      month: month,
    });

    it('should calculate duration based on the longest entity vesting schedule', () => {
      const entities = [
        mockEntityGSD('E1', 12, [24]),
        mockEntityGSD('E2', 6, [12]),
      ];
      const mintEvents: MintEvent[] = [];
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Month')).toBe(37);
    });

    it('should calculate duration based on the latest mint event if it extends beyond vesting', () => {
      const entities = [mockEntityGSD('E1', 12, [24])];
      const mintEvents = [mockMintEventGSD(48)];
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Month')).toBe(49);
    });

    it('should ensure a minimum duration of 1 time step', () => {
      const entities = [mockEntityGSD('E1',0, [])];
      const mintEvents = [mockMintEventGSD(0)];
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Month')).toBe(1);
    });

    it('should correctly use timeStep for duration calculation', () => {
      const entities = [mockEntityGSD('E1', 12, [24])]; 
      const mintEvents: MintEvent[] = [];
      const expectedWeeks = convertMonthsToTimeSteps(36, 'Week') + 1;
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Week')).toBe(expectedWeeks);
      
      const expectedQuarters = convertMonthsToTimeSteps(36, 'Quarter') + 1;
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Quarter')).toBe(expectedQuarters);
    });

    it('should handle empty entities and mint events (minimum 1 step)', () => {
      const entities: Entity[] = [];
      const mintEvents: MintEvent[] = [];
      expect(getSimulationDurationInTimeSteps(entities, mintEvents, 'Month')).toBe(1);
    });
  });

  describe('initializeSimulationData', () => {
    const mockEntityBaseISD = (id: string): Omit<Entity, 'allocation' | 'month0Unlock' | 'cliffMonths' | 'vestSlope'> => ({
        id,
        name: `Entity ${id}`,
        color: '#ffffff',
        get allocationPercent() { return 0; },
        get month0UnlockPercent() { return 0; },
        validateVestSlope: vi.fn(),
    });
    const mockFullEntityISD = (id: string, allocationVal: number, m0UnlockVal: number): Entity => ({
      ...mockEntityBaseISD(id),
      allocation: allocationVal,
      month0Unlock: m0UnlockVal,
      cliffMonths: 0,
      vestSlope: [],
    });

    it('should correctly initialize total and circulating supply based on M0 unlocks', () => {
      const entities = [
        mockFullEntityISD('E1', 1000, 100),
        mockFullEntityISD('E2', 2000, 500),
      ];
      const initialTotalSupply = 5000;
      const simData = initializeSimulationData(initialTotalSupply, entities);

      expect(simData.totalSupply).toBe(initialTotalSupply);
      expect(simData.circulatingSupply).toBe(100 + 500);
    });

    it('should correctly initialize entity balances (locked and circulating)', () => {
      const entity1 = mockFullEntityISD('E1', 1000, 100);
      const entity2 = mockFullEntityISD('E2', 2000, 0);
      const entities = [entity1, entity2];
      const simData = initializeSimulationData(3000, entities);

      expect(simData.entityBalances['E1'].circulating).toBe(100);
      expect(simData.entityBalances['E1'].locked).toBe(1000 - 100);
      expect(simData.entityBalances['E2'].circulating).toBe(0);
      expect(simData.entityBalances['E2'].locked).toBe(2000 - 0);
    });

    it('should cap M0 unlock at entity allocation', () => {
      const entity1 = mockFullEntityISD('E1', 100, 150);
      const entities = [entity1];
      const simData = initializeSimulationData(100, entities);

      expect(simData.entityBalances['E1'].circulating).toBe(100);
      expect(simData.entityBalances['E1'].locked).toBe(0);
      expect(simData.circulatingSupply).toBe(100);
    });

    it('should correctly initialize entityVestState', () => {
      const entity1 = mockFullEntityISD('E1', 1000, 100);
      const entities = [entity1];
      const simData = initializeSimulationData(1000, entities);

      expect(simData.entityVestState['E1'].initialLockedAfterM0).toBe(1000 - 100);
      expect(simData.entityVestState['E1'].cumulativePercentVestedFromSlope).toBe(0);
      expect(simData.entityVestState['E1'].lastVestingCalcMonthForSlope).toBe(-1);
      expect(simData.entityVestState['E1'].vestedInSegments).toEqual({});
    });

    it('should handle empty entities array', () => {
      const entities: Entity[] = [];
      const initialTotalSupply = 1000;
      const simData = initializeSimulationData(initialTotalSupply, entities);

      expect(simData.totalSupply).toBe(initialTotalSupply);
      expect(simData.circulatingSupply).toBe(0);
      expect(simData.entityBalances).toEqual({});
      expect(simData.entityVestState).toEqual({});
    });
  });

  describe('runSingleSimulationStep', () => {
    const mockEntityBaseRSS = (id: string): Omit<Entity, 'allocation' | 'month0Unlock' | 'cliffMonths' | 'vestSlope'> => ({
        id,
        name: `Entity ${id}`,
        color: '#ffffff',
        get allocationPercent() { return 0; },
        get month0UnlockPercent() { return 0; },
        validateVestSlope: vi.fn(),
    });

    const createMockEntityRSS = (id: string, allocationVal: number, m0UnlockVal: number, cliffMonthsVal = 0, vestSlopeVal: VestingSegment[] = []): Entity => ({
      ...mockEntityBaseRSS(id),
      allocation: allocationVal,
      month0Unlock: m0UnlockVal,
      cliffMonths: cliffMonthsVal,
      vestSlope: vestSlopeVal,
    });

    const mockBurnSinksRSS: BurnSink[] = []; 
    const mockMintEventsRSS: MintEvent[] = []; 

    it('should process a basic step with no unlocks, burns, or mints', () => {
      const entities = [createMockEntityRSS('E1', 1000, 100)];
      const initialTotalSupply = 1000;
      let simData: SimDataInternal = initializeSimulationData(initialTotalSupply, entities);
      
      const t_step = 0; 
      const timeStepUnit: AppState['timeStep'] = 'Month';

      const stepOutput = runSingleSimulationStep(
        simData, 
        entities, 
        mockBurnSinksRSS, 
        mockMintEventsRSS, 
        timeStepUnit, 
        t_step
      );

      expect(stepOutput.time).toBe(t_step);
      expect(stepOutput.totalUnlockedThisStep).toBe(0); 
      expect(stepOutput.totalBurnedThisStep).toBe(0);
      expect(stepOutput.totalMintedThisStep).toBe(0);
      expect(stepOutput.entityUnlockedThisStep['E1']).toBe(0);
      expect(stepOutput.entityCirculating['E1']).toBe(100);
      expect(stepOutput.entityLocked['E1']).toBe(900);
      expect(stepOutput.currentTotalSupply).toBe(initialTotalSupply);
      expect(stepOutput.currentCirculatingSupply).toBe(100);
      
      expect(simData.circulatingSupply).toBe(100);
      expect(simData.totalSupply).toBe(1000);
    });

    it('should correctly unlock tokens based on a simple linear vesting schedule after cliff', () => {
      const entityVest: Entity = createMockEntityRSS('V1', 1200, 0, 1, [{ months: 12, percent: 100 }]);
      const entities = [entityVest];
      const initialTotalSupply = 1200;
      let simData: SimDataInternal = initializeSimulationData(initialTotalSupply, entities);
      const timeStepUnit: AppState['timeStep'] = 'Month';

      let stepOutput0 = runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, 0);
      expect(stepOutput0.entityUnlockedThisStep['V1']).toBeCloseTo(0);
      expect(simData.entityBalances['V1'].circulating).toBeCloseTo(0);
      expect(simData.entityBalances['V1'].locked).toBeCloseTo(1200);

      let stepOutput1 = runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, 1);
      expect(stepOutput1.entityUnlockedThisStep['V1']).toBeCloseTo(100);
      expect(simData.entityBalances['V1'].circulating).toBeCloseTo(100);
      expect(simData.entityBalances['V1'].locked).toBeCloseTo(1100);
      expect(simData.circulatingSupply).toBeCloseTo(100);

      let stepOutput2 = runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, 2);
      expect(stepOutput2.entityUnlockedThisStep['V1']).toBeCloseTo(100);
      expect(simData.entityBalances['V1'].circulating).toBeCloseTo(200);
      expect(simData.entityBalances['V1'].locked).toBeCloseTo(1000);
      expect(simData.circulatingSupply).toBeCloseTo(200);

      for (let t = 3; t <= 11; t++) { 
        runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, t);
      }
      let stepOutput12 = runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, 12);
      expect(stepOutput12.entityUnlockedThisStep['V1']).toBeCloseTo(100);
      expect(simData.entityBalances['V1'].circulating).toBeCloseTo(1200);
      // Due to potential accumulation of floating point dust, locked might be very slightly off 0.
      // So we check if it's less than a small epsilon, or close to 0.
      expect(simData.entityBalances['V1'].locked).toBeLessThan(0.00001);
      expect(simData.circulatingSupply).toBeCloseTo(1200);
      
      let stepOutput13 = runSingleSimulationStep(simData, entities, mockBurnSinksRSS, mockMintEventsRSS, timeStepUnit, 13);
      expect(stepOutput13.entityUnlockedThisStep['V1']).toBeCloseTo(0);
      expect(simData.entityBalances['V1'].circulating).toBeCloseTo(1200);
      expect(simData.entityBalances['V1'].locked).toBeLessThan(0.00001);
    });

  });

  // And: describe('aggregateMonteCarloResults', () => { ... });
});
