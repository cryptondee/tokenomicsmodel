<script lang="ts">
  import { appStateStore, updateEntity } from "$lib/store";
  import { Entity } from "$lib/models/entity"; 
  import type { VestingSegment } from "$lib/models/entity"; 
  import { createEventDispatcher } from "svelte";

  export let entityId: string; 

  const dispatch = createEventDispatcher();

  let currentEntityStoreData: Partial<Entity> & { allocationPctOfTotal?: number, month0UnlockPctOfEntityAllocation?: number } | undefined;
  let entityInstance: Entity | undefined; 

  let formName = "";
  let formColor = "#FFFFFF";
  // Form values will now directly reflect the entity's getters or be used to calculate new base percentages
  let formAllocationAbs = 0;
  let formAllocationPct = 0;
  let formM0UnlockAbs = 0;
  let formM0UnlockPct = 0;
  let formCliffMonths = 0;
  let formVestSlope: VestingSegment[] = [];

  let currentTotalSupply = 0;

  appStateStore.subscribe(current => {
    currentTotalSupply = current.totalSupply;
    const foundEntityInStore = current.entities.find(e => e.id === entityId);

    if (foundEntityInStore) {
      // Only re-initialize and update form if the found entity data is actually different
      // or if our local entity instance is not yet created or its ID changed.
      if (!entityInstance || entityInstance.id !== entityId || JSON.stringify(currentEntityStoreData) !== JSON.stringify(foundEntityInStore)) {
        currentEntityStoreData = JSON.parse(JSON.stringify(foundEntityInStore)); // Store a deep clone of raw data for comparison
        
        entityInstance = new Entity(currentEntityStoreData, current.getAppState);
        
        formName = entityInstance.name;
        formColor = entityInstance.color;
        // Update form fields from the entity instance getters
        formAllocationAbs = entityInstance.allocation;
        formAllocationPct = entityInstance.allocationPercent; // This is now allocationPctOfTotal
        formM0UnlockAbs = entityInstance.month0Unlock;
        formM0UnlockPct = entityInstance.month0UnlockPercent; // This is now month0UnlockPctOfEntityAllocation
        formCliffMonths = entityInstance.cliffMonths;
        formVestSlope = JSON.parse(JSON.stringify(entityInstance.vestSlope)); 
      }
    } else {
      currentEntityStoreData = undefined;
      entityInstance = undefined; 
    }
  });

  function handleNameChange() {
    if (!entityInstance || !currentEntityStoreData) return;
    updateEntity({ ...currentEntityStoreData, id: entityInstance.id, name: formName });
  }

  function handleColorChange() {
    if (!entityInstance || !currentEntityStoreData) return;
    updateEntity({ ...currentEntityStoreData, id: entityInstance.id, color: formColor });
  }

  function handleAllocationChange(type: 'abs' | 'pct') {
    if (!entityInstance || !currentEntityStoreData) return;
    let newAllocationPctOfTotal = entityInstance.allocationPctOfTotal;

    if (type === 'abs') {
      const absValue = Number(formAllocationAbs) || 0;
      if (currentTotalSupply > 0) {
        newAllocationPctOfTotal = (absValue / currentTotalSupply) * 100;
      }
    } else { // pct
      newAllocationPctOfTotal = Number(formAllocationPct) || 0;
    }
    updateEntity({ ...currentEntityStoreData, id: entityInstance.id, allocationPctOfTotal: newAllocationPctOfTotal });
  }

  function handleM0UnlockChange(type: 'abs' | 'pct') {
    if (!entityInstance || !currentEntityStoreData) return;
    let newM0UnlockPctOfEntity = entityInstance.month0UnlockPctOfEntityAllocation;
    const currentEntityAllocationAbs = entityInstance.allocation; // Use getter for current abs allocation

    if (type === 'abs') {
      const absValue = Number(formM0UnlockAbs) || 0;
      if (currentEntityAllocationAbs > 0) {
        newM0UnlockPctOfEntity = (absValue / currentEntityAllocationAbs) * 100;
      }
    } else { // pct
      newM0UnlockPctOfEntity = Number(formM0UnlockPct) || 0;
    }
    newM0UnlockPctOfEntity = Math.min(100, Math.max(0, newM0UnlockPctOfEntity));
    updateEntity({ ...currentEntityStoreData, id: entityInstance.id, month0UnlockPctOfEntityAllocation: newM0UnlockPctOfEntity });
  }

  function handleCliffChange() {
    if (!entityInstance || !currentEntityStoreData) return;
    updateEntity({ ...currentEntityStoreData, id: entityInstance.id, cliffMonths: Number(formCliffMonths) || 0 });
  }
  
  function handleVestSlopeChange() {
      if (!entityInstance || !currentEntityStoreData) return;
      const cleanedSlope = formVestSlope.map(s => ({
          months: Math.max(1, Number(s.months) || 1),
          percent: Number(s.percent) || 0
      }));
      // Create a temporary Entity to use its validation method
      const tempEntity = new Entity({ ...currentEntityStoreData, id: entityInstance.id, vestSlope: cleanedSlope }, $appStateStore.getAppState);
      tempEntity.validateVestSlope(); 
      // Update the store with the (potentially) validated slope from the temp instance
      updateEntity({ ...currentEntityStoreData, id: entityInstance.id, vestSlope: tempEntity.vestSlope }); 
  }

  function addSlopeSegment() {
    if (!currentEntityStoreData) return;
    formVestSlope = [...formVestSlope, { months: 6, percent: 0 }];
    handleVestSlopeChange(); 
  }

  function removeSlopeSegment(index: number) {
    if (!currentEntityStoreData) return;
    formVestSlope = formVestSlope.filter((_, i) => i !== index);
    handleVestSlopeChange(); 
  }

  const detailLabelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5";
  const inputClass = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const buttonSmOutlineClass = "px-2 py-1 text-xs font-medium border border-slate-400 text-slate-600 dark:text-slate-300 dark:border-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors";

</script>

{#if entityInstance}
  <div class="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
    <div class="flex justify-between items-center">
      <input type="text" bind:value={formName} on:change={handleNameChange} placeholder="Entity Name" id="entityName-{entityInstance.id}" class="{inputClass} font-semibold flex-grow mr-2 !bg-transparent dark:!bg-transparent !border-0 !border-b-2 !rounded-none focus:!border-blue-500"/>
    </div>
    <div>
      <label class="{detailLabelClass}" for="entityColor-{entityInstance.id}">Color</label>
      <input type="color" bind:value={formColor} on:change={handleColorChange} id="entityColor-{entityInstance.id}" class="w-full h-8 p-0.5 {inputClass}"/>
    </div>
    <div>
      <label class="{detailLabelClass}" for="entityAllocPct-{entityInstance.id}">Allocation</label>
      <div class="flex space-x-2">
        <input type="number" step="0.01" bind:value={formAllocationPct} on:change={() => handleAllocationChange('pct')} placeholder="%" title="Percentage of Total Supply" id="entityAllocPct-{entityInstance.id}" class="w-1/2 {inputClass}"/>
        <input type="number" bind:value={formAllocationAbs} on:change={() => handleAllocationChange('abs')} placeholder="Absolute" title="Absolute Token Amount" id="entityAllocAbs-{entityInstance.id}" class="w-1/2 {inputClass}" aria-label="Absolute Allocation"/>
      </div>
    </div>
    <div>
      <label class="{detailLabelClass}" for="entityM0UnlockPct-{entityInstance.id}">Month 0 Unlock (of this entity's allocation)</label>
      <div class="flex space-x-2">
        <input type="number" step="0.01" bind:value={formM0UnlockPct} on:change={() => handleM0UnlockChange('pct')} placeholder="%" title="Percentage of this Entity's Allocation" id="entityM0UnlockPct-{entityInstance.id}" class="w-1/2 {inputClass}"/>
        <input type="number" bind:value={formM0UnlockAbs} on:change={() => handleM0UnlockChange('abs')} placeholder="Absolute" title="Absolute Token Amount for M0 Unlock" id="entityM0UnlockAbs-{entityInstance.id}" class="w-1/2 {inputClass}" aria-label="Absolute M0 Unlock"/>
      </div>
    </div>
    <div>
      <label class="{detailLabelClass}" for="entityCliff-{entityInstance.id}">Cliff (Months)</label>
      <input type="number" bind:value={formCliffMonths} on:change={handleCliffChange} min="0" id="entityCliff-{entityInstance.id}" class="{inputClass}"/>
    </div>
    <div>
      <label class="{detailLabelClass} mb-1">Vesting Slope (after cliff & M0 unlock)</label>
      <div id="vestSlopeContainer-{entityInstance.id}" class="space-y-1.5">
        {#each formVestSlope as slope, i (i)}
          <div class="flex gap-1.5 items-center vest-slope-row-detail">
            <input type="number" bind:value={slope.months} on:change={handleVestSlopeChange} placeholder="Months" min="1" class="w-1/2 {inputClass} !text-xs !py-1" aria-label="Vesting segment {i+1} months"/>
            <input type="number" bind:value={slope.percent} on:change={handleVestSlopeChange} placeholder="%" min="0" class="w-1/2 {inputClass} !text-xs !py-1" aria-label="Vesting segment {i+1} percent"/>
            <button class="text-red-500 hover:text-red-700 text-lg p-0 leading-none font-mono" on:click={() => removeSlopeSegment(i)} title="Remove segment">&times;</button>
          </div>
        {/each}
      </div>
      <button class="{buttonSmOutlineClass} mt-1.5" on:click={addSlopeSegment}>+ Segment</button>
    </div>
  </div>
{:else}
  <p class="text-xs text-center text-slate-500 dark:text-slate-400 py-2">Entity details not available.</p>
{/if}

<style>
  /* Scoped styles if needed */
</style>
