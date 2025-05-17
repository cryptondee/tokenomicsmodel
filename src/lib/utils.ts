export const Utils = {
  getRandomColor: (): string =>
    `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`,

  gaussianRandom: (mean = 0, stdev = 1): number => {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return (
      Math.sqrt(-2.0 * Math.log(u)) *
        Math.cos(2.0 * Math.PI * v) *
        stdev +
      mean
    );
  },

  deepClone: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),

  formatNumber: (num: number | undefined | null, d = 0, options: { useGrouping?: boolean } = { useGrouping: true }): string => {
    if (typeof num !== "number" || isNaN(num) || num === undefined || num === null)
      return "-";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      useGrouping: options.useGrouping,
    });
  },

  uid: (): string =>
    Date.now().toString(36) + Math.random().toString(36).substring(2),
};

// The Chart mock (Chart, ChartColor, ChartHelpers) has been removed as it was unused.
// Chart components import directly from 'chart.js'.

export const defaultChartColors: string[] = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

export const colorblindPalette: string[] = [
  "#0077BB", "#33BBEE", "#009988", "#EE7733", "#CC3311",
  "#EE3377", "#BBBBBB", "#555555", "#77AADD", "#DDCC77",
];
