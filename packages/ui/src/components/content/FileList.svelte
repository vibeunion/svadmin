<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  import FileListRow from './FileListRow.svelte';

  export interface FileItem { id?: string; name: string; size?: string; type?: string; updatedAt?: string; }
  type FileActionHandler = (file: FileItem) => void;
  interface Props {
    files?: FileItem[];
    state?: DataStateKind;
    stateTitle?: string;
    stateDescription?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    retry?: () => void;
    retryLabel?: string;
    loadingLabel?: string;
    ondownload?: FileActionHandler;
    onpreview?: FileActionHandler;
    onremove?: FileActionHandler;
    class?: string;
  }
  let {
    files = [], state, stateTitle, stateDescription, emptyTitle, emptyDescription,
    retry, retryLabel, loadingLabel, ondownload, onpreview, onremove, class: className = '',
  }: Props = $props();
  const resolvedState = $derived(state ?? (files.length === 0 ? 'empty' : undefined));
  const isEmptyState = $derived(resolvedState === 'empty' || resolvedState === 'filtered-empty');

  const rows = $derived.by(() => {
    const occurrences = new Map<string, number>();
    return files.map((file, index) => {
      if (file.id === undefined) return { file, key: JSON.stringify(['index', index, file.name]) };
      const occurrence = occurrences.get(file.id) ?? 0;
      occurrences.set(file.id, occurrence + 1);
      return { file, key: JSON.stringify(['id', file.id, occurrence]) };
    });
  });
</script>

{#if resolvedState}
  <DataState state={resolvedState} {...definedOptions({
    title: stateTitle ?? (isEmptyState ? emptyTitle : undefined),
    description: stateDescription ?? (isEmptyState ? emptyDescription : undefined),
    retry, retryLabel, loadingLabel,
  })} class={className} />
{:else}
  <div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className} role="list" data-svadmin-file-list>
    {#each rows as { file, key } (key)}
      <FileListRow {file} {...definedOptions({ ondownload, onpreview, onremove })} />
    {/each}
  </div>
{/if}
