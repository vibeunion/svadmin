<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** True if server layout load confirms authentication */
    isAuthenticated?: boolean;
    loginUrl?: string;
    children?: Snippet;
  }

  let { isAuthenticated = false, loginUrl = '/lite/login', children }: Props = $props();
</script>

{#if isAuthenticated}
  {#if children}
    {@render children()}
  {/if}
{:else}
  <div style="padding: 40px; text-align: center; color: #4E5969;">
    <h2>Authentication Required</h2>
    <p>Please <a href={loginUrl} style="color: #165DFF;">login here</a> to access this page.</p>
  </div>
{/if}
