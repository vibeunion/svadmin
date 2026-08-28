<script lang="ts">
  import { toSafeHref } from '../../security';

  interface Props {
    title?: string;
    description?: string;
    action: string;
    actionLabel?: string;
    status?: string;
    engine?: string;
    values?: Record<string, string | number | boolean>;
    downloadHref?: string;
    downloadLabel?: string;
  }

  let {
    title = 'Server computation',
    description = 'This task runs through a normal server request when browser compute is unavailable.',
    action,
    actionLabel = 'Run task',
    status = 'Ready',
    engine = 'Server',
    values = {},
    downloadHref,
    downloadLabel = 'Download result',
  }: Props = $props();

  const safeAction = $derived(toSafeHref(action));
  const safeDownloadHref = $derived(toSafeHref(downloadHref));
</script>

<section class="lite-card lite-compute-fallback">
  <div class="lite-section-header">
    <div><h2>{title}</h2><p>{description}</p></div>
    <span class="lite-badge">{engine}: {status}</span>
  </div>
  <div class="lite-inline-actions">
    {#if safeAction}
      <form method="POST" action={safeAction}>
        {#each Object.entries(values) as [name, value] (name)}
          <input type="hidden" {name} value={String(value)} />
        {/each}
        <button class="lite-btn lite-btn-primary" type="submit">{actionLabel}</button>
      </form>
    {:else}
      <button class="lite-btn lite-btn-primary" type="button" disabled>{actionLabel}</button>
    {/if}
    {#if safeDownloadHref}<a class="lite-btn" href={safeDownloadHref}>{downloadLabel}</a>{/if}
  </div>
</section>
