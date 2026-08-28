<script lang="ts">
  import { toSafeHref } from '../../security';

  interface Props {
    title?: string;
    status?: string;
    lastUpdated?: string;
    refreshHref?: string;
    refreshLabel?: string;
    refreshSeconds?: number;
  }

  let {
    title = 'Live status',
    status = 'Snapshot',
    lastUpdated,
    refreshHref = '',
    refreshLabel = 'Refresh status',
    refreshSeconds = 0,
  }: Props = $props();

  const safeRefreshSeconds = $derived(
    Number.isFinite(refreshSeconds) && refreshSeconds >= 5
      ? Math.floor(refreshSeconds)
      : 0,
  );
  const safeRefreshHref = $derived(toSafeHref(refreshHref));
</script>

<svelte:head>
  {#if safeRefreshSeconds > 0 && safeRefreshHref}
    <meta http-equiv="refresh" content={`${safeRefreshSeconds}; url=${safeRefreshHref}`} />
  {/if}
</svelte:head>

<section class="lite-realtime-status" aria-live="polite">
  <div>
    <strong>{title}</strong>
    <span class="lite-badge lite-badge-info">{status}</span>
    {#if lastUpdated}<span class="lite-muted">Updated {lastUpdated}</span>{/if}
  </div>
  {#if safeRefreshHref}<a href={safeRefreshHref} class="lite-btn lite-btn-sm">{refreshLabel}</a>{/if}
</section>
