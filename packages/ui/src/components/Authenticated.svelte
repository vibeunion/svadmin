<script lang="ts">
  import { captureAdminContext, useIsAuthenticated } from '@svadmin/core';
  import type { Snippet } from 'svelte';

  let {
    children,
    fallback,
    loading,
    redirectTo = '/login',
    appendCurrentPathToQuery = true,
  }: {
    children?: Snippet;
    fallback?: Snippet;
    loading?: Snippet;
    redirectTo?: string;
    appendCurrentPathToQuery?: boolean;
  } = $props();

  const adminContext = captureAdminContext();
  const isAuth = useIsAuthenticated();

  function triggerRedirect() {
    if (fallback) return;
    let url = redirectTo;
    if (appendCurrentPathToQuery && typeof window !== 'undefined') {
      const rp = adminContext.routerProvider;
      let currentString = window.location.pathname + window.location.search;
      if (rp) {
        const parsed = rp.parse();
        const qs = new URLSearchParams(parsed.params).toString();
        currentString = parsed.pathname + (qs ? `?${qs}` : '');
      }
      const current = encodeURIComponent(currentString);
      url += url.includes('?') ? `&to=${current}` : `?to=${current}`;
    }
    adminContext.navigate(url);
  }

  $effect(() => {
    if (!isAuth.isLoading && !isAuth.isAuthenticated) {
      triggerRedirect();
    }
  });
</script>

{#if isAuth.isLoading}
  {#if loading}
    {@render loading()}
  {/if}
{:else if isAuth.isAuthenticated}
  {#if children}
    {@render children()}
  {/if}
{:else}
  {#if fallback}
    {@render fallback()}
  {/if}
{/if}
