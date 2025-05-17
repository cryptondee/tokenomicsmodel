import { Utils } from '../utils';

export class BurnSink {
  id: string;
  label: string;
  costFormula: string;
  eligibleSegments: string[]; // Array of Entity IDs
  usesPerSegmentType: "fixed" | "normal";
  usesFixed: number;
  usesMean: number;
  usesStdDev: number;
  utilityBoost: number;

  constructor({
    id = Utils.uid(),
    label = "New Burn Sink",
    costFormula = "100",
    eligibleSegments = [],
    usesPerSegmentType = "fixed",
    usesFixed = 1,
    usesMean = 1,
    usesStdDev = 0.1,
    utilityBoost = 0,
  }: Partial<BurnSink>) {
    this.id = id;
    this.label = label;
    this.costFormula = costFormula;
    this.eligibleSegments = eligibleSegments;
    this.usesPerSegmentType = usesPerSegmentType;
    this.usesFixed = parseFloat(String(usesFixed)) || 0;
    this.usesMean = parseFloat(String(usesMean)) || 0;
    this.usesStdDev = parseFloat(String(usesStdDev)) || 0.1;
    this.utilityBoost = parseFloat(String(utilityBoost)) || 0;
  }
}
