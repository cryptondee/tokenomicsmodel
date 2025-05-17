<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MainContent from '$lib/components/MainContent.svelte';
  import '../app.css'; // Global styles
  import { appStateStore } from '$lib/store'; // For any global subscriptions if needed in layout
  import { onMount } from 'svelte';

  let currentThemeIsDark = false;

  // Theme initialization logic (copied from your existing +layout.svelte)
  onMount(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    currentThemeIsDark = savedTheme ? savedTheme === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", currentThemeIsDark);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
      if (!localStorage.getItem("theme")) {
        currentThemeIsDark = e.matches;
        document.documentElement.classList.toggle("dark", currentThemeIsDark);
      }
    });
  });

</script>

<div class="flex h-screen antialiased text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900">
  <Sidebar />
  <MainContent>
    <slot /> 
  </MainContent>
</div>

<style>
  /* Ensure h-screen and flex take full viewport height */
</style>
