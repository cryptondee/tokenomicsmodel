<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { appStateStore } from '$lib/store';
  import { Utils } from '$lib/utils';
  import type { Entity } from '$lib/models/entity';
  import type { SimulationResults, SimulationStepOutput, AggregatedSimulationStepOutput, MonteCarloMetric } from '$lib/simulationEngine';

  Chart.register(...registerables);

  export let canvasId = "chartA"; // Allow passing ID if needed, though we might not need it with direct canvas ref
  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  let results: SimulationResults | null = null;
  let entities: Entity[] = [];
  let currentPalette: string[] = [];
  let theme: string = 'light';
  let timeStepUnit: string = 'Month';

  // Helper to get display value
  function getValue(metric: number | MonteCarloMetric | undefined): number {
    if (typeof metric === 'number') return metric;
    if (metric && typeof metric === 'object' && 'mean' in metric) return metric.mean;
    return 0;
  }

  function getChartBaseOptions(isDark: boolean) {
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "#9ca3af" : "#6b7280"; // Tailwind gray-400 / gray-500
    const titleColor = isDark ? "#e5e7eb" : "#374151"; // Tailwind gray-200 / gray-700
    return {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        scales: {
            x: {
                stacked: true, grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, maxRotation: 0, autoSkipPadding: 20, font: { size: 10 } },
            },
            y: {
                stacked: true, grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, callback: (v: number | string) => Utils.formatNumber(typeof v === 'string' ? parseFloat(v) : v), font: { size: 10 } },
            },
        },
        plugins: {
            title: { display: true, color: titleColor, font: { size: 14, weight: "600" }, padding: { top: 5, bottom: 15 } },
            legend: {
                position: "bottom" as const,
                labels: { color: tickColor, boxWidth: 12, padding: 15, font: { size: 10 } },
            },
            tooltip: {
                backgroundColor: isDark ? "#374151E6" : "#FFFFFFE6", // gray-700 with alpha / white with alpha
                titleColor: isDark ? "#f3f4f6" : "#1f2937", // gray-100 / gray-800
                bodyColor: isDark ? "#d1d5db" : "#4b5563", // gray-300 / gray-600
                borderColor: isDark ? "#4b5563" : "#e5e7eb", // gray-600 / gray-200
                borderWidth: 1, padding: 10,
                callbacks: { label: (ctx: any) => `${ctx.dataset.label || ""}: ${Utils.formatNumber(ctx.raw)}`},
            },
        },
        interaction: { mode: "index" as const, intersect: false },
    };
  }

  function updateChart() {
    if (!canvasElement || !results || results.timeSeries.length === 0) {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    const labels = results.timeSeries.map(s => `${s.time}`);
    const isDark = theme === 'dark';
    let baseOptions = getChartBaseOptions(isDark);

    const chartData = {
        labels: labels,
        datasets: entities.map((entity, i) => ({
            label: entity.name,
            data: results!.timeSeries.map(s => getValue(s.entityUnlockedThisStep?.[entity.id])),
            backgroundColor: entity.color || currentPalette[i % currentPalette.length],
        })),
    };

    if (chartInstance) {
        chartInstance.data = chartData;
        chartInstance.options = { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Emissions by Entity (${timeStepUnit})` } } };
        chartInstance.update();
    } else {
        chartInstance = new Chart(canvasElement, {
            type: 'bar',
            data: chartData,
            options: { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Emissions by Entity (${timeStepUnit})` } } },
        });
    }
  }

  appStateStore.subscribe(current => {
    results = current.simulationResults;
    entities = current.entities;
    currentPalette = current.currentPalette;
    theme = current.theme;
    timeStepUnit = current.timeStep;
    if (canvasElement) { // Only update if canvas is mounted
        updateChart();
    }
  });

  onMount(() => {
    // Initial chart draw when component mounts and canvas is available
    updateChart();
  });

  onDestroy(() => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  });

</script>

<div class="chart-container h-[350px] w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-md shadow">
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  /* Chart container styles are in App.svelte or global, this is just for the canvas wrapper */
</style>
