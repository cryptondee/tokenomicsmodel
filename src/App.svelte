<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MainContent from '$lib/components/MainContent.svelte';
  import ResultsTable from '$lib/components/ResultsTable.svelte';
  import ChartA from '$lib/components/charts/ChartA.svelte';
  import ChartB from '$lib/components/charts/ChartB.svelte';
  import ChartC from '$lib/components/charts/ChartC.svelte';
  import ChartD from '$lib/components/charts/ChartD.svelte';
  import { appStateStore } from '$lib/store'; // loadModelFromUrlParams removed, called from store
  import { Utils } from "$lib/utils"; 
  // import { onMount } from 'svelte'; // No longer needed here for loadModelFromUrlParams

  appStateStore.subscribe(current => {
    if (current && typeof document !== 'undefined') {
      document.documentElement.classList.toggle("dark", current.theme === 'dark');
    }
  });

  function handleExportCsv() {
    const results = $appStateStore.simulationResults;
    const entities = $appStateStore.entities;
    const timeStepUnit = $appStateStore.timeStep;

    if (!results || !results.timeSeries || results.timeSeries.length === 0) {
        alert("No simulation data to export."); return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers: string[] = [`"Time (${timeStepUnit})"`];
    entities.forEach(e => headers.push(`"${e.name} Unlocked"`)); // Quotes added
    headers.push("Σ Unlocked");        // Quotes added for consistency
    headers.push("Σ Burned");          // Quotes added
    headers.push("Σ Minted");          // Quotes added
    headers.push("Circulating Supply"); // Quotes added
    headers.push("Total Supply");        // Quotes added
    csvContent += headers.join(",") + "";

    results.timeSeries.forEach(step => {
        const row: string[] = [];
        const getValueForCsv = (metric: any): string => {
            let val = 0;
            if (typeof metric === 'number') val = metric;
            else if (metric && typeof metric === 'object' && 'mean' in metric) val = metric.mean;
            return `"${Utils.formatNumber(val, 2, { useGrouping: false })}"`;
        };
        row.push(`"${step.time}"`);
        entities.forEach(e => {
            const unlockedMetric = step.entityUnlockedThisStep?.[e.id];
            row.push(getValueForCsv(unlockedMetric));
        });
        row.push(getValueForCsv(step.totalUnlockedThisStep));
        row.push(getValueForCsv(step.totalBurnedThisStep));
        row.push(getValueForCsv(step.totalMintedThisStep));
        row.push(getValueForCsv(step.currentCirculatingSupply));
        row.push(getValueForCsv(step.currentTotalSupply));
        csvContent += row.join(",") + "";
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "token_simulation_table.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

</script>

<div class="flex h-screen antialiased text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900">
  <Sidebar />
  <MainContent>
    <section id="charts-section" class="mb-8">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartA />
        <ChartB />
        <ChartC />
        <ChartD />
      </div>
    </section>

    <section id="table-section">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Results Table</h2>
        <button 
          on:click={handleExportCsv} 
          class="button button-sm button-outline border border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-700 px-3 py-1 rounded-md text-xs">
          Export CSV
        </button>
      </div>
      <ResultsTable />
    </section>
  </MainContent>
</div>

<style>
  /* .chart-container is now defined within each chart component */
</style>
