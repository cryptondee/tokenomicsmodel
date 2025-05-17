<script lang="ts">
  import { appStateStore, updateGlobalSettings } from "$lib/store";
  import type { MonteCarloSettings, AppState } from "$lib/store";

  // Local component state for direct binding, then dispatch to store
  let totalSupply: number = $appStateStore.totalSupply;
  let timeStep: AppState['timeStep'] = $appStateStore.timeStep;
  let mcActive: boolean = $appStateStore.monteCarlo.active;
  let mcIterations: number = $appStateStore.monteCarlo.iterations;
  let mcPriceVolatility: number = $appStateStore.monteCarlo.priceVolatility;
  let mcDemandGrowth: number = $appStateStore.monteCarlo.demandGrowth;

  // Subscribe to store changes to keep local state in sync if modified elsewhere
  appStateStore.subscribe(current => {
    totalSupply = current.totalSupply;
    timeStep = current.timeStep;
    mcActive = current.monteCarlo.active;
    mcIterations = current.monteCarlo.iterations;
    mcPriceVolatility = current.monteCarlo.priceVolatility;
    mcDemandGrowth = current.monteCarlo.demandGrowth;
  });

  function handleChanges() {
    updateGlobalSettings({
      totalSupply: Number(totalSupply) || 0,
      timeStep,
      monteCarlo: {
        active: mcActive,
        iterations: Number(mcIterations) || 100,
        priceVolatility: Number(mcPriceVolatility) || 0,
        demandGrowth: Number(mcDemandGrowth) || 0,
      }
    });
  }

  // Detail label class - you might want to make this a global style or Tailwind component
  const detailLabelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
  const inputClass = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const checkboxClass = "h-4 w-4 mr-2 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 accent-blue-500";

</script>

<section id="global-settings-sidebar" class="mb-6 space-y-3">
  <h3 class="sidebar-section-header text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Global Settings</h3>
  <div>
    <label for="totalSupplySidebar" class="{detailLabelClass}">Total Supply</label>
    <input type="number" id="totalSupplySidebar" bind:value={totalSupply} on:change={handleChanges} class="{inputClass}" />
  </div>
  <div>
    <label for="timeStepSidebar" class="{detailLabelClass}">Time Step</label>
    <select id="timeStepSidebar" bind:value={timeStep} on:change={handleChanges} class="{inputClass}">
      <option value="Month">Month</option>
      <option value="Week">Week</option>
      <option value="Quarter">Quarter</option>
    </select>
  </div>
  <div class="flex items-center pt-1">
    <input type="checkbox" id="monteCarloToggleSidebar" bind:checked={mcActive} on:change={handleChanges} class="{checkboxClass}"/>
    <label for="monteCarloToggleSidebar" class="text-xs font-medium text-slate-700 dark:text-slate-300">Enable Monte-Carlo</label>
  </div>

  {#if mcActive}
    <div id="monteCarloInputsSidebar" class="space-y-2 pl-4 border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-2 py-2 transition-all duration-300 ease-in-out">
      <div>
        <label for="mcIterationsSidebar" class="{detailLabelClass}">Iterations</label>
        <input type="number" id="mcIterationsSidebar" bind:value={mcIterations} on:change={handleChanges} min="10" class="{inputClass}" />
      </div>
      <div>
        <label for="mcPriceVolatilitySidebar" class="{detailLabelClass}">Price Volatility &sigma;</label>
        <input type="number" id="mcPriceVolatilitySidebar" bind:value={mcPriceVolatility} on:change={handleChanges} step="0.01" class="{inputClass}" />
      </div>
      <div>
        <label for="mcDemandGrowthSidebar" class="{detailLabelClass}">Demand Growth &mu; (annual)</label>
        <input type="number" id="mcDemandGrowthSidebar" bind:value={mcDemandGrowth} on:change={handleChanges} step="0.01" class="{inputClass}" />
      </div>
    </div>
  {/if}
</section>
