<script lang="ts">
  import { appStateStore } from "$lib/store";
  import { Utils } from "$lib/utils";
  import type { SimulationResults, SimulationStepOutput, AggregatedSimulationStepOutput, MonteCarloMetric } from "$lib/simulationEngine";
  import type { Entity } from "$lib/models/entity";

  let results: SimulationResults | null = null;
  let timeSeries: (SimulationStepOutput | AggregatedSimulationStepOutput)[] = [];
  let entities: Entity[] = [];
  let timeStepUnit: string = "Month";
  let isMonteCarlo = false;

  appStateStore.subscribe(current => {
    results = current.simulationResults;
    entities = current.entities; // Get entities for headers
    timeStepUnit = current.timeStep;
    if (results) {
      timeSeries = results.timeSeries;
      isMonteCarlo = results.isMonteCarlo;
    } else {
      timeSeries = [];
      isMonteCarlo = false;
    }
  });

  // Helper to get the display value (mean for MC, direct value otherwise)
  function getValue(metric: number | MonteCarloMetric | undefined): number {
    if (typeof metric === 'number') {
      return metric;
    }
    if (metric && typeof metric === 'object' && 'mean' in metric) {
      return metric.mean;
    }
    return 0; // Default if undefined or wrong type
  }

</script>

{#if timeSeries.length > 0}
  <div class="table-responsive max-h-[500px] overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
    <table id="resultsTableMain" class="w-full border-collapse">
      <thead class="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
        <tr>
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time ({timeStepUnit})</th>
          {#each entities as entity (entity.id)}
            <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{entity.name} Unlocked</th>
          {/each}
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">&#931; Unlocked</th>
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">&#931; Burned</th>
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">&#931; Minted</th>
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Circulating</th>
          <th class="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Supply</th>
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700">
        {#each timeSeries as step (step.time)}
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(step.time)}</td>
            {#each entities as entity (entity.id)}
              <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.entityUnlockedThisStep?.[entity.id]))}</td>
            {/each}
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.totalUnlockedThisStep))}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.totalBurnedThisStep))}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.totalMintedThisStep))}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.currentCirculatingSupply))}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{Utils.formatNumber(getValue(step.currentTotalSupply))}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if results === null}
  <p class="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Run a simulation to see the results table.</p>
{:else if timeSeries.length === 0}
    <p class="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Simulation ran, but no time series data was generated (e.g., duration was 0 or invalid).</p>
{/if}

<style>
  .table-responsive table th {
    position: sticky;
    top: 0;
    z-index: 1;
    /* Tailwind should handle bg, but ensure it overrides if needed */
  }
</style>
