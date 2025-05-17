<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { appStateStore } from '$lib/store';
  import { Utils } from '$lib/utils';
  import type { Entity } from '$lib/models/entity';
  import type { SimulationResults, SimulationStepOutput, AggregatedSimulationStepOutput, MonteCarloMetric } from '$lib/simulationEngine';

  Chart.register(...registerables);

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  let results: SimulationResults | null = null;
  let entities: Entity[] = [];
  let currentPalette: string[] = [];
  let theme: string = 'light';
  let timeStepUnit: string = 'Month'; // Not used in title for this chart but good to have

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
            y: {
                stacked: true, grid: { color: gridColor, drawBorder: false },
                ticks: { color: tickColor, callback: (value: number | string) => `${value}%`, font: { size: 10 } },
                min: 0, max: 100, // Y-axis from 0 to 100 for percentage
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
                callbacks: {
                    label: function (context: any) {
                        const entityName = context.dataset.label || "";
                        const percentage = context.raw.toFixed(2);
                        // Find the original step data to get absolute value
                        const stepData = results?.timeSeries[context.dataIndex];
                        const entity = entities.find(e => e.name === entityName);
                        let absoluteValue = 0;
                        if (stepData && entity && stepData.entityCirculating?.[entity.id]) {
                            absoluteValue = getValue(stepData.entityCirculating[entity.id]);
                        }
                        return `${entityName}: ${percentage}% (${Utils.formatNumber(absoluteValue, 0)} tokens)`;
                    }
                },
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
        datasets: entities.map((entity, i) => ({
            label: entity.name,
            data: results!.timeSeries.map((step) => {
                const entityCirculating = getValue(step.entityCirculating?.[entity.id]);
                const totalCirculating = getValue(step.currentCirculatingSupply);
                return totalCirculating > 0 ? (entityCirculating / totalCirculating) * 100 : 0;
            }),
            backgroundColor: entity.color || currentPalette[i % currentPalette.length],
        })),
    };

    if (chartInstance) {
        chartInstance.data = chartData;
        chartInstance.options = { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Circulating Supply Share (%)` } } };
        chartInstance.update();
    } else {
        chartInstance = new Chart(canvasElement, {
            type: 'bar',
            data: chartData,
            options: { ...baseOptions, plugins: { ...baseOptions.plugins, title: { ...baseOptions.plugins.title, text: `Circulating Supply Share (%)` } } },
        });
    }
  }

  appStateStore.subscribe(current => {
    results = current.simulationResults;
    entities = current.entities;
    currentPalette = current.currentPalette;
    theme = current.theme;
    timeStepUnit = current.timeStep; // Keep this for consistency, though not in this chart's title
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
