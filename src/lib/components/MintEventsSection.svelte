<script lang="ts">
  import { appStateStore, addDefaultMintEvent, updateMintEvent, deleteMintEvent } from "$lib/store";
  import type { MintEvent } from "$lib/models/mintEvent";
  import type { Entity } from "$lib/models/entity";

  $: mintEvents = $appStateStore.mintEvents;
  $: entities = $appStateStore.entities;

  function handleAddEvent() {
    addDefaultMintEvent();
  }

  // For inline editing, we need to pass the event and its index to the store updater
  function handleEventChange(eventData: MintEvent, index: number, field: keyof MintEvent, value: any) {
    const updatedEvent: MintEvent = { ...eventData };

    if (field === 'amount' || field === 'month') {
      (updatedEvent[field] as number) = Number(value) || 0;
    } else if (field === 'targetEntityId') {
      updatedEvent.targetEntityId = value === "" ? null : value as string;
    } else {
      // For any other potential string fields, though MintEvent is simple
      (updatedEvent[field] as string) = value;
    }
    updateMintEvent(updatedEvent, index);
  }

  function handleDelete(index: number) {
    if (confirm("Are you sure you want to delete this mint event?")) {
      deleteMintEvent(index);
    }
  }

  const detailLabelClass = "text-xs text-slate-500 dark:text-slate-400 mr-1";
  const inputClass = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm p-0.5 text-xs focus:ring-blue-500 focus:border-blue-500 transition-colors w-20";
  const selectClass = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm p-0.5 text-xs focus:ring-blue-500 focus:border-blue-500 transition-colors w-auto max-w-[120px]";
  const buttonOutlineClass = "px-3 py-1 text-xs font-medium border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors";
  const deleteButtonInlineClass = "text-red-500 hover:text-red-700 text-sm p-0 leading-none font-mono ml-2";

</script>

<section id="mintevents-sidebar" class="mb-6">
  <div class="flex justify-between items-center mb-3">
    <h3 class="sidebar-section-header text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mint Events</h3>
    <button on:click={handleAddEvent} class="{buttonOutlineClass}">Add Event</button>
  </div>

  <div id="mintEventsListSidebar" class="space-y-2 max-h-40 overflow-y-auto pr-1 p-2 rounded bg-slate-50 dark:bg-slate-800/30">
    {#each mintEvents as event, i (event.id || i)} <!-- Assuming event might get an ID later, fallback to index for key -->
      <div class="text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 mb-1 shadow-sm">
        <div class="flex justify-between items-center mb-1.5">
          <span class="font-medium text-slate-700 dark:text-slate-300">Mint Event #{i + 1}</span>
          <button class="{deleteButtonInlineClass}" on:click={() => handleDelete(i)} title="Delete Mint Event">&times;</button>
        </div>
        <div class="space-y-1">
          <div class="flex items-center">
            <label class="{detailLabelClass}" for="mintAmount-{i}">Amount:</label>
            <input 
              type="number" 
              id="mintAmount-{i}" 
              value={event.amount} 
              on:change={(e) => handleEventChange(event, i, 'amount', (e.target as HTMLInputElement).value)} 
              class="{inputClass}"/>
          </div>
          <div class="flex items-center">
            <label class="{detailLabelClass}" for="mintTarget-{i}">Target:</label>
            <select 
              id="mintTarget-{i}" 
              value={event.targetEntityId || ""} 
              on:change={(e) => handleEventChange(event, i, 'targetEntityId', (e.target as HTMLSelectElement).value)} 
              class="{selectClass}">
              <option value="">General Supply</option>
              {#each entities as entity (entity.id)}
                <option value={entity.id}>{entity.name}</option>
              {/each}
            </select>
          </div>
          <div class="flex items-center">
            <label class="{detailLabelClass}" for="mintMonth-{i}">Month:</label>
            <input 
              type="number" 
              id="mintMonth-{i}" 
              value={event.month} 
              on:change={(e) => handleEventChange(event, i, 'month', (e.target as HTMLInputElement).value)} 
              class="{inputClass} w-16"/>
          </div>
        </div>
      </div>
    {/each}
    {#if mintEvents.length === 0}
      <p class="text-xs text-center text-slate-500 dark:text-slate-400 py-2">No mint events added.</p>
    {/if}
  </div>
</section>
