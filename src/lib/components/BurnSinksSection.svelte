<script lang="ts">
  import { appStateStore, addDefaultBurnSink, deleteBurnSink, updateBurnSink, selectBurnSinkForDetails } from "$lib/store";
  import type { BurnSink } from "$lib/models/burnSink";
  import type { Entity } from "$lib/models/entity";

  let selectedSinkData: BurnSink | null = null;
  let formLabel = "";
  let formCostFormula = "";
  let formEligibleSegments: string[] = [];
  let formUsesPerSegmentType: 'fixed' | 'normal' = 'fixed';
  let formUsesFixed = 1;
  let formUsesMean = 1;
  let formUsesStdDev = 0.1;
  let formUtilityBoost = 0;

  $: entities = $appStateStore.entities;
  $: burnSinks = $appStateStore.burnSinks;
  $: selectedBurnSinkId = $appStateStore.ui.selectedBurnSinkId;

  $: {
    if (selectedBurnSinkId) {
      const sink = burnSinks.find(bs => bs.id === selectedBurnSinkId);
      if (sink) {
        selectedSinkData = sink;
        formLabel = sink.label;
        formCostFormula = sink.costFormula;
        formEligibleSegments = [...sink.eligibleSegments];
        formUsesPerSegmentType = sink.usesPerSegmentType;
        formUsesFixed = sink.usesFixed;
        formUsesMean = sink.usesMean;
        formUsesStdDev = sink.usesStdDev;
        formUtilityBoost = sink.utilityBoost;
      } else {
        selectedSinkData = null; 
      }
    } else {
      selectedSinkData = null;
    }
  }

  function handleAddSink() {
    addDefaultBurnSink(); 
  }

  function handleDelete(sinkId: string) {
    if (confirm("Are you sure you want to delete this burn sink?")) {
      deleteBurnSink(sinkId);
    }
  }

  function handleDetailChange() {
    if (!selectedSinkData) return;
    const updatedSinkData: BurnSink = {
      id: selectedSinkData.id, 
      label: formLabel,
      costFormula: formCostFormula,
      eligibleSegments: formEligibleSegments,
      usesPerSegmentType: formUsesPerSegmentType,
      usesFixed: Number(formUsesFixed) || 0,
      usesMean: Number(formUsesMean) || 0,
      usesStdDev: Number(formUsesStdDev) || 0,
      utilityBoost: Number(formUtilityBoost) || 0,
    };
    updateBurnSink(updatedSinkData);
  }

  const detailLabelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
  const inputClass = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const buttonOutlineClass = "px-3 py-1 text-xs font-medium border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors";
  const listItemBaseClass = "p-2 text-sm rounded-md cursor-pointer transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
  const listItemActiveClass = "!bg-blue-500 !text-white dark:!bg-blue-600";
  const deleteButtonClass = "px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors";
</script>

<section id="burnsinks-sidebar" class="mb-6">
  <div class="flex justify-between items-center mb-3">
    <h3 class="sidebar-section-header text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Burn Sinks</h3>
    <button on:click={handleAddSink} class="{buttonOutlineClass}">Add Sink</button>
  </div>

  <div id="burnSinksListSidebar" class="space-y-1 max-h-40 overflow-y-auto pr-1 mb-3">
    {#each burnSinks as sink (sink.id)}
      <div 
        class="{listItemBaseClass} {selectedBurnSinkId === sink.id ? listItemActiveClass : ''}" 
        on:click={() => selectBurnSinkForDetails(sink.id)}
        role="button" 
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && selectBurnSinkForDetails(sink.id)} 
      >
        <span class="truncate">{sink.label}</span>
      </div>
    {/each}
    {#if burnSinks.length === 0}
        <p class="text-xs text-center text-slate-500 dark:text-slate-400 py-2">No burn sinks defined.</p>
    {/if}
  </div>

  {#if selectedSinkData}
    <div id="selectedBurnSinkDetailsSidebar" class="mt-3 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50 space-y-3">
      <div class="flex justify-between items-center">
        <!-- No label for main sink name input, but placeholder acts somewhat like it -->
        <input type="text" bind:value={formLabel} on:change={handleDetailChange} placeholder="Sink Label" id="burnSinkLabel-{selectedSinkData.id}" class="{inputClass} font-semibold flex-grow mr-2 bg-transparent dark:bg-transparent border-0 border-b-2 rounded-none focus:border-blue-500"/>
        <button class="{deleteButtonClass}" on:click={() => handleDelete(selectedSinkData!.id)}>Delete</button>
      </div>
      <div>
        <label for="burnSinkCostFormula-{selectedSinkData.id}" class="{detailLabelClass}">Cost (Tokens or Formula e.g. 0.001*circulating)</label>
        <input type="text" bind:value={formCostFormula} on:change={handleDetailChange} id="burnSinkCostFormula-{selectedSinkData.id}" class="{inputClass}"/>
      </div>
      <div>
        <label for="burnSinkEligibleSegments-{selectedSinkData.id}" class="{detailLabelClass}">Eligible Segments (Entities)</label>
        <select multiple bind:value={formEligibleSegments} on:change={handleDetailChange} id="burnSinkEligibleSegments-{selectedSinkData.id}" class="{inputClass} h-20 text-xs">
          {#each entities as entity (entity.id)}
            <option value={entity.id}>{entity.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="burnSinkUsesType-{selectedSinkData.id}" class="{detailLabelClass}">Uses per Segment (per Time Step)</label>
        <select bind:value={formUsesPerSegmentType} on:change={handleDetailChange} id="burnSinkUsesType-{selectedSinkData.id}" class="{inputClass} text-xs">
          <option value="fixed">Fixed Number</option>
          <option value="normal">Normal Distribution</option>
        </select>
      </div>
      {#if formUsesPerSegmentType === 'fixed'}
        <div class="uses-params-detail-fixed space-y-1 pl-1 transition-all">
          <label for="burnSinkUsesFixed-{selectedSinkData.id}" class="{detailLabelClass}">Fixed Uses</label>
          <input type="number" bind:value={formUsesFixed} on:change={handleDetailChange} id="burnSinkUsesFixed-{selectedSinkData.id}" class="{inputClass} text-xs"/>
        </div>
      {/if}
      {#if formUsesPerSegmentType === 'normal'}
        <div class="uses-params-detail-normal grid grid-cols-2 gap-2 space-y-1 pl-1 transition-all">
          <div>
            <label for="burnSinkUsesMean-{selectedSinkData.id}" class="{detailLabelClass}">Mean Uses</label>
            <input type="number" bind:value={formUsesMean} on:change={handleDetailChange} id="burnSinkUsesMean-{selectedSinkData.id}" class="{inputClass} text-xs"/>
          </div>
          <div>
            <label for="burnSinkUsesStdDev-{selectedSinkData.id}" class="{detailLabelClass}">Std Dev</label>
            <input type="number" bind:value={formUsesStdDev} on:change={handleDetailChange} id="burnSinkUsesStdDev-{selectedSinkData.id}" class="{inputClass} text-xs"/>
          </div>
        </div>
      {/if}
      <div>
        <label for="burnSinkUtilityBoost-{selectedSinkData.id}" class="{detailLabelClass}">Utility Boost (%)</label>
        <input type="number" bind:value={formUtilityBoost} on:change={handleDetailChange} id="burnSinkUtilityBoost-{selectedSinkData.id}" class="{inputClass} text-xs"/>
      </div>
    </div>
  {/if}
</section>
