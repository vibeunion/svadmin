<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import WorkspaceLayout from './content/WorkspaceLayout.svelte';

  export type PagePatternKind = 'list' | 'form' | 'detail' | 'workspace' | 'dashboard';

  interface Props {
    kind: PagePatternKind;
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: Snippet;
    toolbar?: Snippet;
    metrics?: Snippet;
    secondary?: Snippet;
    children: Snippet;
    footer?: Snippet;
    width?: 'narrow' | 'default' | 'wide';
    density?: 'compact' | 'comfortable';
    pageId?: string;
    class?: string;
  }

  let {
    kind,
    title,
    description,
    eyebrow,
    actions,
    toolbar,
    metrics,
    secondary,
    children,
    footer,
    width,
    density,
    pageId,
    class: className = '',
  }: Props = $props();

  const resolvedPageId = $derived(pageId ?? `pattern-${kind}`);
  const resolvedWidth = $derived(width ?? (kind === 'form' ? 'narrow' : kind === 'detail' ? 'default' : 'wide'));
  const resolvedDensity = $derived(density ?? (kind === 'list' || kind === 'workspace' ? 'compact' : 'comfortable'));
</script>

<ContentPageShell
  {title}
  {...definedOptions({ description, eyebrow, actions })}
  density={resolvedDensity}
  width={resolvedWidth}
  pageId={resolvedPageId}
  class={className}
>
  {#if metrics}
    <div class="page-pattern__metrics" data-page-pattern-metrics>
      {@render metrics()}
    </div>
  {/if}

  {#if toolbar}
    <div class="page-pattern__toolbar" data-page-pattern-toolbar>
      {@render toolbar()}
    </div>
  {/if}

  {#if secondary}
    <WorkspaceLayout primary={children} {...definedOptions({ secondary })} />
  {:else}
    <div class="page-pattern__content" data-page-pattern-content={kind} data-density={resolvedDensity}>
      {@render children()}
    </div>
  {/if}

  {#if footer}
    <footer class="page-pattern__footer" data-page-pattern-footer>
      {@render footer()}
    </footer>
  {/if}
</ContentPageShell>

<style>
  .page-pattern__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: 16px;
  }

  .page-pattern__toolbar,
  .page-pattern__content {
    min-width: 0;
  }

  .page-pattern__content {
    display: grid;
    gap: 24px;
  }

  .page-pattern__content[data-density='compact'] {
    gap: 16px;
  }

  .page-pattern__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
</style>
