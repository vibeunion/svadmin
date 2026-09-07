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
  <div class="svadmin-u-60fbb7713999 svadmin-u-ef114b5f5ad1 svadmin-u-71ec51c9997d svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227">
    <div class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-afbdd13a380e svadmin-u-ac204c108886 svadmin-u-b485ae1c3b47 svadmin-u-6cbc84dd9e1a svadmin-u-980d09f1c472"></div>
  </div>
{:else if auth.isAuthenticated}
  <NavigateToResource />
{/if}
