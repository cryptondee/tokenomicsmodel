import { Utils } from '../utils';
import type { AppState } from '../store';

export interface VestSlopeSegment {
  months: number;
  percent: number;
}

export class Entity {
  id: string;
  name: string;
  color: string;
  // allocation: number; // Now a getter
  allocationPctOfTotal: number; // Percentage of global total supply (e.g., 10 for 10%)
  cliffMonths: number;
  // month0Unlock: number; // Now a getter
  month0UnlockPctOfEntityAllocation: number; // Percentage of this entity's own allocation (e.g., 5 for 5%)
  vestSlope: VestSlopeSegment[];
  private _appStateProvider: () => AppState;

  constructor(
    data: Partial<Entity> & { allocationPctOfTotal?: number, month0UnlockPctOfEntityAllocation?: number, allocation?: number, month0Unlock?: number },
    appStateProvider: () => AppState
  ) {
    this.id = data.id || Utils.uid();
    this.name = data.name || "New Entity";
    this.color = data.color || Utils.getRandomColor();
    this._appStateProvider = appStateProvider;

    // Initialize allocationPctOfTotal: 
    // Priority: data.allocationPctOfTotal > convert data.allocation (abs) to % > default 0
    if (data.allocationPctOfTotal !== undefined) {
      this.allocationPctOfTotal = parseFloat(String(data.allocationPctOfTotal)) || 0;
    } else if (data.allocation !== undefined && this.appState.totalSupply > 0) {
      this.allocationPctOfTotal = ( (parseFloat(String(data.allocation)) || 0) / this.appState.totalSupply) * 100;
    } else {
      this.allocationPctOfTotal = 0;
    }

    this.cliffMonths = parseInt(String(data.cliffMonths)) || 0;
    
    // Initialize month0UnlockPctOfEntityAllocation:
    // Priority: data.month0UnlockPctOfEntityAllocation > convert data.month0Unlock (abs) to % of current allocation > default 0
    const currentAllocation = this.allocation; // Use the getter here
    if (data.month0UnlockPctOfEntityAllocation !== undefined) {
      this.month0UnlockPctOfEntityAllocation = parseFloat(String(data.month0UnlockPctOfEntityAllocation)) || 0;
    } else if (data.month0Unlock !== undefined && currentAllocation > 0) {
      this.month0UnlockPctOfEntityAllocation = ( (parseFloat(String(data.month0Unlock)) || 0) / currentAllocation) * 100;
    } else {
      this.month0UnlockPctOfEntityAllocation = 0;
    }
    // Ensure month0UnlockPctOfEntityAllocation is not > 100% or negative
    this.month0UnlockPctOfEntityAllocation = Math.min(100, Math.max(0, this.month0UnlockPctOfEntityAllocation));

    this.vestSlope = (data.vestSlope || [{ months: 12, percent: 100 }]).map((s) => ({
      months: Math.max(1, parseInt(String(s.months)) || 1),
      percent: parseFloat(String(s.percent)) || 0,
    }));

    this.validateVestSlope();
  }

  get appState(): AppState {
    return this._appStateProvider();
  }

  get allocation(): number {
    const totalSupply = this.appState.totalSupply;
    return (this.allocationPctOfTotal / 100) * totalSupply;
  }

  get allocationPercent(): number { // This is now simpler
    return this.allocationPctOfTotal;
  }

  get month0Unlock(): number {
    return (this.month0UnlockPctOfEntityAllocation / 100) * this.allocation;
  }

  get month0UnlockPercent(): number { // This is the % of entity's own allocation
    return this.month0UnlockPctOfEntityAllocation;
  }

  validateVestSlope(): void {
    // If there's remaining allocation (after M0) and no slope, it's locked indefinitely.
    if (this.vestSlope.length === 0 && (this.allocation - this.month0Unlock > 0.00001)) {
        return;
    }
    if (this.vestSlope.length === 0) return;

    const totalPercent = this.vestSlope.reduce((sum, s) => sum + s.percent, 0);

    if (Math.abs(totalPercent - 100) > 0.01 && this.vestSlope.length > 0) {
      console.warn(
        `Entity ${this.name} vest slope sums to ${totalPercent}%. Auto-adjusting last segment.`
      );
      const diff = 100 - (totalPercent - this.vestSlope[this.vestSlope.length - 1].percent);
      this.vestSlope[this.vestSlope.length - 1].percent = Math.max(0, diff);
    }
  }
}
