<script lang="ts">
  import GlobalSettings from "./GlobalSettings.svelte";
  import EntitiesSection from './EntitiesSection.svelte'; 
  import BurnSinksSection from './BurnSinksSection.svelte';
  import MintEventsSection from './MintEventsSection.svelte';
  import ControlsSection from './ControlsSection.svelte'; 
</script>

<aside class="sidebar w-[320px] flex-shrink-0 p-5 overflow-y-auto flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
  <div class="sidebar-header border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 s--Std_ohSg4Ou">
    <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100 s--Std_ohSg4Ou">Tokenomics Modeler</h1>
  </div>

  <div class="flex-grow space-y-6 s--Std_ohSg4Ou">
    <GlobalSettings />
    <EntitiesSection />
    <BurnSinksSection />
    <MintEventsSection />
  </div>

  <ControlsSection /> 

</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100vh; 
  }
  .sidebar-header {
    flex-shrink: 0; 
  }
  .flex-grow {
    flex-grow: 1;
    overflow-y: auto; 
    padding-bottom: 1rem; 
  }
  /* .sidebar-section-header class removed as it was unused here and defined in child components */
</style>
