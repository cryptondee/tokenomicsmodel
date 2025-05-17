<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { appStateStore } from '$lib/store';
  import { Utils } from '$lib/utils';
  import type { Entity } from '$lib/models/entity';
  import type { SimulationResults, SimulationStepOutput, AggregatedSimulationStepOutput, MonteCarloMetric } from '$lib/simulationEngine';
  import { color as chartJsColor } from 'chart.js/helpers'; // Import Chart.js color helper

  Chart.register(...registerables);

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  let results: SimulationResults | null = null;
  let entities: Entity[] = [];
  let currentPalette: string[] = [];
  let theme: string = 'light';
  let timeStepUnit: string = 'Month';

  function getValue(metric: number | MonteCarloMetric | undefined): number {
    if (typeof metric === 'number') return metric;
    if (metric && typeof metric === 'object' && 'mean' in metric) return metric.mean;
    return 0;
  }

  function getChartBaseOptions(isDark: boolean) {
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "#9ca3af" : "#6b7280";
    const titleColor = isDark ? "#e5e7eb" : "#374151";
    return {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        scales: {
            x: {
                stacked: true, grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, maxRotation: 0, autoSkipPadding: 20, font: { size: 10 } },
            },
            y: { // Main Y axis for stacked bars
                stacked: true, grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, callback: (v: number | string) => Utils.formatNumber(typeof v === 'string' ? parseFloat(v) : v), font: { size: 10 } },
            },
            // Potentially a second Y axis if line chart scale is very different, but for now use primary
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

    const chartData = {
        labels: labels,
        datasets: [
            ...entities.map((entity, i) => ({
                type: 'bar' as const, // Specify type for mixed charts
                label: `${entity.name} Circ.`,
                data: results!.timeSeries.map(s => getValue(s.entityCirculating?.[entity.id])),
                backgroundColor: chartJsColor(entity.color || currentPalette[i % currentPalette.length]).alpha(0.7).rgbString(),
                stack: "circulating", // All circulating bars on the same stack
            })),
            {
                type: 'line' as const, // Specify type for mixed charts
                label: "Total Supply",
                data: results!.timeSeries.map(s => getValue(s.currentTotalSupply)),
                borderColor: isDark ? "#cbd5e1" : "#475569", // Tailwind slate-300 / slate-600
                backgroundColor: "transparent",
                tension: 0.1,
                pointRadius: 0,
                borderWidth: 2,
                yAxisID: 'y', // Use the primary y-axis
                order: -1 // Ensure line is drawn on top of bars
            },
        ],
    };

    if (chartInstance) {
        chartInstance.data = chartData;
        chartInstance.options = { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Supply Composition (${timeStepUnit})` } } };
        chartInstance.update();
    } else {
        chartInstance = new Chart(canvasElement, {
            // type: 'bar', // For mixed charts, type is defined in datasets
            data: chartData,
            options: { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Supply Composition (${timeStepUnit})` } } },
        });
    }
  }

  appStateStore.subscribe(current => {
    results = current.simulationResults;
    entities = current.entities;
    currentPalette = current.currentPalette;
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
