<script lang="ts">
  import { onMount } from "svelte";
  import { 
    appStateStore, 
    toggleTheme, 
    toggleColorblindMode, 
    saveScenario, 
    loadScenario, 
    deleteScenario, 
    savedScenariosStore, 
    exportModelAsJson, 
    generateShareableUrl 
  } from "$lib/store";

  let scenarioName = "";

  function handleSaveScenario() {
    if (!scenarioName.trim()) {
      alert("Please enter a scenario name.");
      return;
    }
    saveScenario(scenarioName.trim());
    scenarioName = ""; 
  }

  function handleLoadScenario(name: string) {
    if (confirm(`Load scenario "${name}"? Any unsaved changes will be lost.`)) {
      loadScenario(name);
    }
  }

  function handleDeleteScenario(name: string) {
    if (confirm(`Delete scenario "${name}"?`)) {
      deleteScenario(name);
    }
  }
  
  function handleThemeToggle() {
    appStateStore.update(s => { 
        toggleTheme(); 
        return s; 
    });
  }

  function handleColorblindToggle() {
    toggleColorblindMode();
  }

  const inputClass = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const buttonClass = "px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors";
  const buttonSmClass = "px-2 py-1 !text-xs";
  const buttonOutlineClass = "!bg-transparent border border-blue-500 !text-blue-500 hover:!bg-blue-50 dark:hover:!bg-blue-900/50";
  const controlButtonClass = "p-2 rounded-full focus:outline-none text-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors";
  const scenarioItemClass = "flex justify-between items-center p-1.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0 text-xs hover:bg-slate-100 dark:hover:bg-slate-700";
</script>

<section id="controls-sidebar" class="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
  <h3 class="sidebar-section-header text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Controls & Scenario</h3>
  
  <div class="flex space-x-2">
    <input type="text" bind:value={scenarioName} placeholder="Scenario Name" class="{inputClass} flex-grow"/>
    <button on:click={handleSaveScenario} class="{buttonClass} {buttonSmClass}">Save</button>
  </div>

  <div id="savedScenariosContainerSidebar" class="text-xs max-h-28 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-700 rounded p-1 simple-scrollbar">
    {#if $savedScenariosStore.length > 0}
      {#each $savedScenariosStore as name (name)}
        <div class="{scenarioItemClass}">
          <span 
            class="text-slate-700 dark:text-slate-300 flex-1 truncate pr-2 cursor-pointer"
            title="Load {name}" 
            on:click={() => handleLoadScenario(name)} 
            on:keydown={(e) => e.key === 'Enter' && handleLoadScenario(name)} 
            tabindex="0"
            role="button" 
          >{name}</span>
          <div>
            <button class="{buttonClass} !bg-red-500 hover:!bg-red-600 !text-xs !px-2 !py-0.5 !font-normal" on:click={() => handleDeleteScenario(name)}>Del</button>
          </div>
        </div>
      {/each}
    {:else}
      <p class="text-xs text-slate-500 dark:text-slate-400 p-1">No saved scenarios.</p>
    {/if}
  </div>

  <button on:click={exportModelAsJson} class="{buttonClass} {buttonOutlineClass} w-full">Export Model (JSON)</button>
  <button on:click={generateShareableUrl} class="{buttonClass} {buttonOutlineClass} w-full">Share Model (URL)</button>

  <div class="flex items-center space-x-2 mt-4">
    <button on:click={handleThemeToggle} title="Toggle Theme" class="{controlButtonClass}">
      {#if $appStateStore.theme === 'dark'}☀️{:else}🌓{/if}
    </button>
    <button on:click={handleColorblindToggle} title="Toggle Colorblind Mode" class="{controlButtonClass}" style="filter: {$appStateStore.colorblindMode ? 'saturate(0.2) brightness(1.5)' : 'none'};">
      👁️
    </button>
  </div>
</section>
