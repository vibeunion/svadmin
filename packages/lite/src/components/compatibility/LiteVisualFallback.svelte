<script lang="ts">
  import { toSafeHref } from '../../security';

  interface Column {
    key: string;
    label: string;
  }

  interface Props {
    title: string;
    description?: string;
    snapshotSrc?: string;
    snapshotAlt?: string;
    columns?: Column[];
    rows?: Record<string, unknown>[];
    downloadHref?: string;
    downloadLabel?: string;
    emptyLabel?: string;
  }

  let {
    title,
    description,
    snapshotSrc,
    snapshotAlt = '',
    columns = [],
    rows = [],
    downloadHref,
    downloadLabel = 'Download source data',
    emptyLabel = 'No structured data is available.',
  }: Props = $props();

  function displayValue(value: unknown): string {
    if (value == null) return '-';
    if (Array.isArray(value)) return value.map(String).join(', ');
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        if (error instanceof TypeError) return String(value);
        throw error;
      }
    }
    return String(value);
  }

  const safeSnapshotSrc = $derived(toSafeHref(snapshotSrc));
  const safeDownloadHref = $derived(toSafeHref(downloadHref));
</script>

<section class="lite-card lite-visual-fallback">
  <div class="lite-section-header">
    <div>
      <h2>{title}</h2>
      {#if description}<p>{description}</p>{/if}
    </div>
    {#if safeDownloadHref}<a class="lite-btn lite-btn-sm" href={safeDownloadHref}>{downloadLabel}</a>{/if}
  </div>

  {#if safeSnapshotSrc}
    <div class="lite-visual-snapshot">
      <img src={safeSnapshotSrc} alt={snapshotAlt} />
    </div>
  {/if}

  {#if columns.length > 0 && rows.length > 0}
    <div class="lite-table-scroll">
      <table class="lite-table">
        <thead><tr>{#each columns as column (column.key)}<th>{column.label}</th>{/each}</tr></thead>
        <tbody>
          {#each rows as row, rowIndex (rowIndex)}
            <tr>{#each columns as column (column.key)}<td>{displayValue(row[column.key])}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if !safeSnapshotSrc}
    <p class="lite-muted">{emptyLabel}</p>
  {/if}
</section>
