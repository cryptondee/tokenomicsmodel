<script lang="ts">
  import { appStateStore, addEntity, selectEntity, deleteEntity } from "$lib/store"; // Added deleteEntity
  import { Utils } from "$lib/utils";
  import type { Entity } from "$lib/models/entity";
  import EntityDetailForm from "./EntityDetailForm.svelte"; // Import the new form

  let entities: Entity[] = [];
  let selectedEntityId: string | null = null;
  let allocationWarningText = "";
  let allocationWarningClass = "";

  appStateStore.subscribe(current => {
    entities = current.entities;
    selectedEntityId = current.ui.selectedEntityId;
    updateAllocationWarning(current.entities, current.totalSupply);
  });

  function handleAddEntity() {
    addEntity(); 
  }

  function handleSelectEntity(entityId: string) {
    selectEntity(entityId);
  }
  
  function handleDeleteSelectedEntity() {
      if (selectedEntityId && confirm("Are you sure you want to delete this entity?")) {
          deleteEntity(selectedEntityId);
          // selectEntity(null); // Store action should handle clearing selection if needed
      }
  }

  function updateAllocationWarning(currentEntities: Entity[], globalTotalSupply: number) {
    let totalAllocAbs = currentEntities.reduce((sum, e) => sum + e.allocation, 0);
    let totalAllocPercent = globalTotalSupply > 0 ? (totalAllocAbs / globalTotalSupply) * 100 : 0;

    if (currentEntities.length > 0) {
      const mismatch = Math.abs(totalAllocPercent - 100) > 0.1 || 
                       (globalTotalSupply > 0 && Math.abs(totalAllocAbs - globalTotalSupply) > 0.01 * globalTotalSupply);
      
      allocationWarningText = `Allocated: ${totalAllocPercent.toFixed(1)}% (${Utils.formatNumber(totalAllocAbs, 0)}). Supply: ${Utils.formatNumber(globalTotalSupply, 0)}.${mismatch ? " Warning: Mismatch!" : ""}`;
      
      if (mismatch) {
        allocationWarningClass = "text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900 border border-red-300 dark:border-red-700";
      } else {
        allocationWarningClass = "text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900 border border-green-300 dark:border-green-700";
      }
    } else {
      allocationWarningText = "No entities defined.";
      allocationWarningClass = "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700";
    }
  }

  const buttonOutlineClass = "border border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-700 px-3 py-1 rounded-md text-xs transition-colors";
  const entityListItemBaseClass = "entity-list-item flex items-center p-1.5 pr-1 text-sm rounded-md cursor-pointer transition-colors mb-1";
  const entityListItemInactiveClass = "hover:bg-slate-200 dark:hover:bg-slate-700";
  const entityListItemActiveClass = "active bg-blue-500 text-white dark:bg-blue-600";
  const deleteButtonClass = "px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors absolute top-2 right-2"; // Added positioning for delete

</script>

<section id="entities-sidebar" class="mb-6">
  <div class="sidebar-subsection-header flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
    <h3 class="sidebar-subsection-title text-base font-medium text-slate-800 dark:text-slate-200">Entities & Allocations</h3>
    <button on:click={handleAddEntity} class="{buttonOutlineClass}">
      Add Entity
    </button>
  </div>

  <div id="entitiesListSidebar" class="space-y-1 max-h-60 overflow-y-auto pr-1 mb-2 simple-scrollbar">
    {#each entities as entity (entity.id)}
      <div 
        class="{entityListItemBaseClass} {selectedEntityId === entity.id ? entityListItemActiveClass : entityListItemInactiveClass}"
        on:click={() => handleSelectEntity(entity.id)}
        role="button" 
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && handleSelectEntity(entity.id)}
      >
        <div 
          class="entity-color-swatch w-3 h-3 rounded-sm mr-2.5 border border-black/20 dark:border-white/30 flex-shrink-0"
          style="background-color: {entity.color};"
        ></div>
        <span class="truncate flex-grow {selectedEntityId === entity.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'}">{entity.name}</span>
      </div>
    {/each}
    {#if entities.length === 0}
        <p class="text-xs text-center text-slate-500 dark:text-slate-400 py-2">No entities. Click "Add Entity".</p>
    {/if}
  </div>

  <div 
    id="allocationWarningSidebar" 
    class="mt-2 text-xs p-1.5 rounded-md {allocationWarningClass}"
  >
    {allocationWarningText}
  </div>

  <div id="selectedEntityDetailsSidebar" class="mt-3 relative"> <!-- Added relative for positioned delete button -->
    {#if selectedEntityId}
      <EntityDetailForm entityId={selectedEntityId} />
      <button class="{deleteButtonClass}" on:click={handleDeleteSelectedEntity} title="Delete Entity">Delete</button>
    {:else}
      <p class="text-xs text-center text-slate-500 dark:text-slate-400 py-2">Select an entity to see details or add a new one.</p>
    {/if}
  </div>

</section>

<style>
    .simple-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    .simple-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .simple-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1; /* Tailwind gray-300 */
        border-radius: 3px;
    }
    .dark .simple-scrollbar::-webkit-scrollbar-thumb {
        background: #475569; /* Tailwind slate-600 */
    }
    .simple-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8; /* Tailwind slate-400 */
    }
    .dark .simple-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #64748b; /* Tailwind slate-500 */
    }

    .entity-list-item.active .entity-color-swatch {
        border-color: rgba(255, 255, 255, 0.7) !important;
    }
</style>
