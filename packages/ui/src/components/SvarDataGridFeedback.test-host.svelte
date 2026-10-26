<script lang="ts">
  import type { Component } from 'svelte';
  import SvarDataGrid from './SvarDataGrid.svelte';
  import ProbeGrid from '../../test/fixtures/SvarGridEngineProbe.svelte';
  import Theme from '../../test/fixtures/SvarGridThemeProbe.svelte';
  import type { SvarInteractiveColumn, SvarCellEdit } from './svar-grid-interactions.js';
  import type { SvarWindowSource } from './svar-grid-loading.js';
  import type { SvarManagedEngineProps } from './svar-grid-panes.js';

  const Grid = ProbeGrid as unknown as Component<SvarManagedEngineProps>;

  let { items = [], columns, onCellEdit, locale = 'en-US', windowSource, queryMode = 'local', freezeRight = 0,
    loading, disabled, error, label, emptyLabel, loadingLabel, disabledLabel, fallbackLabel }: {
    items?: readonly Record<string, unknown>[];
    columns: readonly SvarInteractiveColumn[];
    onCellEdit?: (edit: SvarCellEdit) => Promise<void>;
    locale?: string;
    windowSource?: SvarWindowSource;
    queryMode?: 'local' | 'server';
    freezeRight?: number;
    loading?: boolean;
    disabled?: boolean;
    error?: string;
    label?: string;
    emptyLabel?: string;
    loadingLabel?: string;
    disabledLabel?: string;
    fallbackLabel?: string;
  } = $props();
</script>

<SvarDataGrid {Grid} {Theme} {items} {columns} {onCellEdit} {locale} {windowSource} {queryMode} {freezeRight}
  {loading} {disabled} {error} {label} {emptyLabel} {loadingLabel} {disabledLabel} {fallbackLabel} />
