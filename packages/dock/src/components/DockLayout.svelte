<script lang="ts">
  import { onMount, onDestroy, mount, unmount } from 'svelte';
  import type { DockviewApi, SerializedDockview } from 'dockview';
  import { cn } from '../utils.js';
  import type { DockPanel } from './dock-layout.js';
  import 'dockview/dist/styles/dockview.css';

  interface Props {
    panels: DockPanel[];
    layout?: SerializedDockview;
    /** Persist and restore the serialized layout under this localStorage key. */
    storageKey?: string;
    ariaLabel?: string;
    class?: string;
    onlayout?: (layout: SerializedDockview) => void;
    onready?: (api: DockviewApi) => void;
  }

  let {
    panels,
    layout,
    storageKey,
    ariaLabel = 'Dock workspace',
    class: className,
    onlayout,
    onready,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let dock = $state<{ dispose: () => void } | null>(null);
  let error = $state('');
  const mounted = new Map<string, ReturnType<typeof mount>>();

  onMount(() => {
    let active = true;
    let disposeLayout: { dispose: () => void } | undefined;

    void import('dockview').then(({ DockviewComponent }) => {
      if (!active || !host) return;

      const byId = new Map(panels.map((panel) => [panel.id, panel]));
      const component = new DockviewComponent(host, {
        createComponent: (options) => {
          const element = document.createElement('div');
          element.className = 'svadmin-dock__panel';
          const definition = byId.get(options.name) ?? byId.get(options.id);
          if (definition) {
            mounted.set(options.id, mount(definition.component, {
              target: element,
              props: definition.props ?? {},
            }));
          }
          return {
            element,
            init() {},
            dispose() {
              const instance = mounted.get(options.id);
              if (instance) unmount(instance);
              mounted.delete(options.id);
            },
          };
        },
      });

      let restored = layout;
      if (!restored && storageKey) {
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) restored = JSON.parse(raw) as SerializedDockview;
        } catch {
          restored = undefined;
        }
      }

      if (restored) {
        component.fromJSON(restored);
      } else {
        for (const panel of panels) {
          component.addPanel({
            id: panel.id,
            component: panel.id,
            title: panel.title,
            ...(panel.referencePanel === undefined
              ? {}
              : {
                  position: {
                    referencePanel: panel.referencePanel,
                    direction: panel.direction ?? 'right',
                  },
                }),
          });
        }
      }

      const persist = (next: SerializedDockview) => {
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // Private browsing or a full quota must not break the workspace.
          }
        }
      };

      persist(component.toJSON());
      disposeLayout = component.api.onDidLayoutChange(() => {
        const next = component.toJSON();
        onlayout?.(next);
        persist(next);
      });
      onready?.(component.api);
      dock = component;
    }).catch((cause: unknown) => {
      if (!active) return;
      error = cause instanceof Error ? cause.message : 'Dock engine failed to load.';
    });

    return () => {
      active = false;
      disposeLayout?.dispose();
      for (const instance of mounted.values()) unmount(instance);
      mounted.clear();
      dock?.dispose();
      dock = null;
    };
  });

  onDestroy(() => {
    for (const instance of mounted.values()) unmount(instance);
    mounted.clear();
  });
</script>

<div class={cn('svadmin-dock', className)}>
  <div bind:this={host} class="svadmin-dock__host dockview-theme-light" role="region" aria-label={ariaLabel}></div>
  {#if error}
    <p class="svadmin-dock__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .svadmin-dock {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 18rem;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius, 0.5rem);
    background: var(--background);
  }
  .svadmin-dock__host {
    position: absolute;
    inset: 0;
    --dv-group-view-background-color: var(--background);
    --dv-tabs-and-actions-container-background-color: var(--muted);
    --dv-activegroup-visiblepanel-tab-background-color: var(--background);
    --dv-activegroup-hiddenpanel-tab-background-color: var(--muted);
    --dv-inactivegroup-visiblepanel-tab-background-color: var(--background);
    --dv-inactivegroup-hiddenpanel-tab-background-color: var(--muted);
    --dv-activegroup-visiblepanel-tab-color: var(--foreground);
    --dv-activegroup-hiddenpanel-tab-color: var(--muted-foreground);
    --dv-inactivegroup-visiblepanel-tab-color: var(--muted-foreground);
    --dv-inactivegroup-hiddenpanel-tab-color: var(--muted-foreground);
    --dv-separator-border: var(--border);
    --dv-tab-divider-color: var(--border);
    --dv-paneview-header-border-color: var(--border);
    --dv-active-sash-color: var(--primary);
  }
  .svadmin-dock :global(.svadmin-dock__panel) {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--background);
    color: var(--foreground);
  }
  .svadmin-dock__error {
    position: absolute;
    inset-block-start: var(--svadmin-space-3, 0.75rem);
    inset-inline: var(--svadmin-space-3, 0.75rem);
    z-index: 1;
    margin: 0;
    color: var(--destructive);
    font-size: var(--svadmin-text-label, 0.875rem);
  }
</style>
