<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { appStateStore } from '$lib/store';
  import { Utils } from '$lib/utils';
  import type { SimulationResults, SimulationStepOutput, AggregatedSimulationStepOutput, MonteCarloMetric } from '$lib/simulationEngine';
  import { color as chartJsColor } from 'chart.js/helpers';

  Chart.register(...registerables);

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  let results: SimulationResults | null = null;
  let theme: string = 'light';
  let timeStepUnit: string = 'Month';

  function getChartBaseOptions(isDark: boolean) {
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "#9ca3af" : "#6b7280";
    const titleColor = isDark ? "#e5e7eb" : "#374151";
    return {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        scales: {
            x: {
                stacked: false, // Not stacked for this line chart
                grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, maxRotation: 0, autoSkipPadding: 20, font: { size: 10 } },
            },
            y: {
                stacked: false, // Not stacked
                grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, callback: (v: number | string) => Utils.formatNumber(typeof v === 'string' ? parseFloat(v) : v), font: { size: 10 } },
            },
        },
        plugins: {
            title: { display: true, color: titleColor, font: { size: 14, weight: "600" }, padding: { top: 5, bottom: 15 } },
            legend: {
                position: "bottom" as const, labels: { color: tickColor, boxWidth: 12, padding: 15, font: { size: 10 } },
            },
            tooltip: {
                backgroundColor: isDark ? "#374151E6" : "#FFFFFFE6", titleColor: isDark ? "#f3f4f6" : "#1f2937",
                bodyColor: isDark ? "#d1d5db" : "#4b5563", borderColor: isDark ? "#4b5563" : "#e5e7eb",
                borderWidth: 1, padding: 10,
                callbacks: { label: (ctx: any) => `${ctx.dataset.label || ""}: ${Utils.formatNumber(ctx.raw)}`},
            },
        },
        interaction: { mode: "index" as const, intersect: false },
    };
  }

  function updateChart() {
    if (!canvasElement || !results || results.timeSeries.length === 0) {
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        return;
    }

    const labels = results.timeSeries.map(s => `${s.time}`);
    const isDark = theme === 'dark';
    let baseOptions = getChartBaseOptions(isDark);

    const datasets = [
        {
            label: "Tokens Burned",
            data: results.timeSeries.map(s => (s.totalBurnedThisStep as MonteCarloMetric)?.mean ?? (s.totalBurnedThisStep as number) ?? 0),
            borderColor: "#ef4444", // Tailwind red-500
            backgroundColor: chartJsColor("#ef4444").alpha(0.1).rgbString(),
            fill: results.isMonteCarlo ? 'origin' : false,
            tension: 0.1, pointRadius: 1, borderWidth: 2,
        },
        {
            label: "Tokens Minted",
            data: results.timeSeries.map(s => (s.totalMintedThisStep as MonteCarloMetric)?.mean ?? (s.totalMintedThisStep as number) ?? 0),
            borderColor: "#22c55e", // Tailwind green-500
            backgroundColor: chartJsColor("#22c55e").alpha(0.1).rgbString(),
            fill: results.isMonteCarlo ? 'origin' : false,
            tension: 0.1, pointRadius: 1, borderWidth: 2,
        },
    ];

    if (results.isMonteCarlo) {
        const addConfidenceBand = (metricKey: 'totalBurnedThisStep' | 'totalMintedThisStep', baseDatasetIndex: number, color: string) => {
            datasets.push({
                label: `${datasets[baseDatasetIndex].label} P95`,
                data: results!.timeSeries.map(s => (s[metricKey] as MonteCarloMetric)?.p95 ?? 0),
                borderColor: chartJsColor(color).alpha(0.5).rgbString(),
                borderDash: [5,5], borderWidth: 1, pointRadius: 0, yAxisID: 'y', fill: false,
                order: baseDatasetIndex + 0.1 // Ensure drawn correctly relative to mean line
            } as any);
            datasets.push({
                label: `${datasets[baseDatasetIndex].label} P5`,
                data: results!.timeSeries.map(s => (s[metricKey] as MonteCarloMetric)?.p5 ?? 0),
                borderColor: chartJsColor(color).alpha(0.5).rgbString(),
                borderDash: [5,5], borderWidth: 1, pointRadius: 0, yAxisID: 'y', fill: false, // Fill between P5 and P95 is more complex
                order: baseDatasetIndex + 0.2,
            } as any);
        };
        addConfidenceBand('totalBurnedThisStep', 0, '#ef4444');
        addConfidenceBand('totalMintedThisStep', 1, '#22c55e');
    }

    const chartData = { labels: labels, datasets: datasets }; 

    if (chartInstance) {
        chartInstance.data = chartData;
        chartInstance.options = { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Activity: Burn vs Mint (${timeStepUnit})` } } };
        chartInstance.update();
    } else {
        chartInstance = new Chart(canvasElement, {
            type: 'line',
            data: chartData,
            options: { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Activity: Burn vs Mint (${timeStepUnit})` } } },
        });
    }
  }

  appStateStore.subscribe(current => {
    results = current.simulationResults;
    theme = current.theme;
    timeStepUnit = current.timeStep;
    if (canvasElement) updateChart();
  });

  onMount(() => updateChart());
  onDestroy(() => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  });

</script>

<div class="chart-container h-[350px] w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-md shadow">
  <canvas bind:this={canvasElement}></canvas>
</div>
