<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { DockviewApi, SerializedDockview } from 'dockview';
  import DockLayout from './DockLayout.svelte';
  import type { DockPanel } from './dock-layout.js';
  import { cn } from '../utils.js';

  interface Props {
    panels: DockPanel[];
    title?: string;
    description?: string;
    storageKey?: string;
    layout?: SerializedDockview;
    class?: string;
    actions?: Snippet;
    onlayout?: (layout: SerializedDockview) => void;
    onready?: (api: DockviewApi) => void;
  }

  let {
    panels,
    title = 'Workspace',
    description = 'Panels are restored automatically on your next visit.',
    storageKey = 'svadmin:workspace-dock',
    layout,
    class: className,
    actions,
    onlayout,
    onready,
  }: Props = $props();
</script>

<section class={cn('svadmin-dock-workspace', className)} aria-label={title}>
  <header class="svadmin-dock-workspace__header">
    <div class="svadmin-dock-workspace__heading">
      <h2>{title}</h2>
      {#if description}<p>{description}</p>{/if}
    </div>
    {#if actions}<div class="svadmin-dock-workspace__actions">{@render actions()}</div>{/if}
  </header>
  <div class="svadmin-dock-workspace__body">
    <DockLayout
      {panels}
      {storageKey}
      {...(layout === undefined ? {} : { layout })}
      {...(onlayout === undefined ? {} : { onlayout })}
      {...(onready === undefined ? {} : { onready })}
      ariaLabel={title}
    />
  </div>
</section>

<style>
  .svadmin-dock-workspace {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    min-height: 24rem;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
  }
  .svadmin-dock-workspace__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .svadmin-dock-workspace__heading h2 { margin: 0; font-size: var(--svadmin-text-body, 0.9375rem); font-weight: 650; }
  .svadmin-dock-workspace__heading p { margin: 0.2rem 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption, 0.75rem); }
  .svadmin-dock-workspace__actions { display: inline-flex; align-items: center; gap: 0.5rem; }
  .svadmin-dock-workspace__body { min-height: 0; }
  .svadmin-dock-workspace__body :global(.svadmin-dock) { border: 0; border-radius: 0; }
</style>
