<script lang="ts">
  import { cn } from '../../utils.js';
  import type { AuditAccent } from './AuditSection.svelte';
  import AuditContent from './AuditContent.svelte';
  import type { AuditDataState } from './audit-state.js';

  export interface CoverageMatrixColumn {
    key: string;
    label: string;
  }

  export interface CoverageMatrixRow {
    id: string;
    title: string;
    cells: Readonly<Record<string, string | undefined>>;
    accent?: AuditAccent;
  }

  interface Props {
    columns: readonly CoverageMatrixColumn[];
    rows: readonly CoverageMatrixRow[];
    class?: string;
    caption: string;
    rowLabel?: string;
    state?: AuditDataState;
    message?: string | undefined;
    retry?: (() => void) | undefined;
  }

  let { columns, rows, caption, rowLabel = '', state = 'ready', message, retry, class: className = '' }: Props = $props();
</script>

<AuditContent state={state === 'ready' && rows.length === 0 ? 'empty' : state} {message} {retry}>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (命名滚动区域需要键盘访问。) -->
  <div class={cn('svadmin-coverage-matrix', className)} data-svadmin-coverage-matrix role="region" aria-label={caption} tabindex="0">
    <table>
      <caption>{caption}</caption>
      <thead><tr><th scope="col">{rowLabel}</th>{#each columns as column (column.key)}<th scope="col">{column.label}</th>{/each}</tr></thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr data-accent={row.accent ?? 'neutral'}>
            <th scope="row">{row.title}</th>
            {#each columns as column (column.key)}<td>{row.cells[column.key] ?? '—'}</td>{/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</AuditContent>
