<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Whether the user has access (computed from server load function) */
    allowed: boolean;
    children?: Snippet;
    fallback?: Snippet;
  }

  let { allowed, children, fallback }: Props = $props();
</script>

{#if allowed}
  {#if children}
    {@render children()}
  {/if}
{:else}
  {#if fallback}
    {@render fallback()}
  {:else}
    <div style="padding: 24px; background: #FFECE8; color: #be123c; border-radius: 6px; border: 1px solid #fecdd3;">
      <h3>Access Denied</h3>
      <p>You do not have permission to view this content.</p>
    </div>
  {/if}
{/if}
