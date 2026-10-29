<script lang="ts">
  import { captureAdminContext, useIsAuthenticated } from '@svadmin/core';
  import NavigateToResource from './NavigateToResource.svelte';
  
  const adminContext = captureAdminContext();
  const auth = useIsAuthenticated();

  $effect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      adminContext.navigate('/login');
    }
  });
</script>

{#if auth.isLoading}
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
  </div>
{:else if auth.isAuthenticated}
  <NavigateToResource />
{/if}
