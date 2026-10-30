<script lang="ts">
  import LiteBadge, { type LiteBadgeVariant } from './LiteBadge.svelte';

  interface Props {
    status: string;
    tone?: LiteBadgeVariant;
    label?: string;
    href?: string;
  }

  let { status, tone, label, href }: Props = $props();

  const normalized = $derived(status.toLowerCase().replace(/[\s_]+/g, '-'));
  const resolvedTone = $derived(tone ?? (
    ['active', 'success', 'completed', 'approved', 'online', 'enabled'].includes(normalized) ? 'success'
      : ['error', 'failed', 'rejected', 'danger', 'offline', 'disabled'].includes(normalized) ? 'danger'
        : ['warning', 'pending', 'review', 'processing'].includes(normalized) ? 'warning'
          : ['info', 'new', 'draft'].includes(normalized) ? 'info'
            : 'secondary'
  ));
</script>

{#if href}
  <a href={href} class="lite-status-badge"><LiteBadge variant={resolvedTone}>{label ?? status}</LiteBadge></a>
{:else}
  <span class="lite-status-badge"><LiteBadge variant={resolvedTone}>{label ?? status}</LiteBadge></span>
{/if}

<style>
  .lite-status-badge { display: inline-flex; text-decoration: none; }
</style>
