<script lang="ts">
  // Import chart and table components here when created
  import { appStateStore } from "$lib/store";
  import { Utils } from "$lib/utils";
  // Assuming runSimulationAction is correctly imported and set up in the store or actions file
  import { runSimulationAction } from "$lib/store"; // Or from '$lib/actions/simulationActions'

  let summaryInitTotalSupply: string = "-";
  let summaryFinalCircSupply: string = "-";
  let summarySimSteps: string = "-";
  let summarySimTimeStep: string = "-";

  appStateStore.subscribe(current => {
    summaryInitTotalSupply = Utils.formatNumber(current.totalSupply, 0);
    summarySimTimeStep = current.timeStep;
    if (current.simulationResults && current.simulationResults.timeSeries.length > 0) {
      const lastStep = current.simulationResults.timeSeries[current.simulationResults.timeSeries.length - 1];
      // @ts-ignore - This will need proper type guards for MonteCarloMetric vs number
      const finalCirc = current.simulationResults.isMonteCarlo && lastStep.currentCirculatingSupply && typeof lastStep.currentCirculatingSupply === 'object' && 'mean' in lastStep.currentCirculatingSupply 
        ? lastStep.currentCirculatingSupply.mean 
        : lastStep.currentCirculatingSupply as number;
      summaryFinalCircSupply = Utils.formatNumber(finalCirc, 0);
      summarySimSteps = Utils.formatNumber(current.simulationResults.timeSeries.length, 0);
    } else {
      summaryFinalCircSupply = "-";
      summarySimSteps = "0"; // Or "-" if preferred for no simulation yet
    }
  });

  function handleRunSimulation() {
    runSimulationAction(); 
  }

</script>

<main class="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900">
  <header class="main-header flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
    <div id="simulationSummaryMain" class="text-xs space-y-0.5 mb-3 sm:mb-0 text-slate-600 dark:text-slate-400">
      <p><strong>Initial Total Supply:</strong> <span class="font-mono text-slate-800 dark:text-slate-200">{summaryInitTotalSupply}</span></p>
      <p><strong>Final Circulating Supply:</strong> <span class="font-mono text-slate-800 dark:text-slate-200">{summaryFinalCircSupply}</span></p>
      <p>
        <strong>Simulation:</strong> <span class="font-mono text-slate-800 dark:text-slate-200">{summarySimSteps}</span>
        <span class="text-slate-800 dark:text-slate-200"> {summarySimTimeStep}</span> steps
      </p>
    </div>
    <button 
      on:click={handleRunSimulation}
      class="button bg-green-500 hover:bg-green-600 px-6 py-2.5 text-sm font-semibold text-white rounded-md transition-colors">
      Run Simulation
    </button>
  </header>

  <!-- Page content (charts, table) will be rendered here via the slot -->
  <slot />

</main>
