<script lang="ts">
  import { toSafeHref } from '../../security';

  type Connection = 'connecting' | 'connected' | 'disconnected';

  interface Props {
    title?: string;
    /** Free-text snapshot label rendered as a badge. */
    status?: string;
    /** Connection state, mirroring the reference `status` prop. */
    connection?: Connection;
    /** Resource the stream is bound to, shown when details are enabled. */
    resource?: string;
    /** Last received event; only its type and timestamp are rendered. */
    lastEvent?: { type: string; timestamp?: number } | null;
    /** Render resource and last-event details next to the badge. */
    showDetails?: boolean;
    lastUpdated?: string;
    refreshHref?: string;
    refreshLabel?: string;
    refreshSeconds?: number;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    title = 'Live status',
    status = 'Snapshot',
    connection,
    resource,
    lastEvent = null,
    showDetails = false,
    lastUpdated,
    refreshHref = '',
    refreshLabel = 'Refresh status',
    refreshSeconds = 0,
    class: className = '',
  }: Props = $props();

  const connectionLabel: Record<Connection, string> = {
    connected: 'Live',
    connecting: 'Connecting…',
    disconnected: 'Offline',
  };
  const connectionTone: Record<Connection, string> = {
    connected: 'lite-badge-success',
    connecting: 'lite-badge-warning',
    disconnected: 'lite-badge-danger',
  };
  const connectionClass = $derived(connection ? connectionTone[connection] : 'lite-badge-info');
  const badgeText = $derived(connection ? connectionLabel[connection] : status);

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

<section
  class={`lite-realtime-status ${className}`.trim()}
  aria-live="polite"
  data-connection={connection}
>
  <div>
    <strong>{title}</strong>
    <span class={`lite-badge ${connectionClass}`} role={connection ? 'status' : undefined}>{badgeText}</span>
    {#if resource}<span class="lite-muted">{resource}</span>{/if}
    {#if showDetails && lastEvent}
      <span class="lite-muted">{lastEvent.type}{#if lastEvent.timestamp} · {new Date(lastEvent.timestamp).toISOString()}{/if}</span>
    {/if}
    {#if lastUpdated}<span class="lite-muted">Updated {lastUpdated}</span>{/if}
  </div>
  {#if safeRefreshHref}<a href={safeRefreshHref} class="lite-btn lite-btn-sm">{refreshLabel}</a>{/if}
</section>
