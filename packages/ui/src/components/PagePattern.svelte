<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import WorkspaceLayout from './content/WorkspaceLayout.svelte';
  import DataState from './content/DataState.svelte';

  export type PagePatternKind = 'list' | 'form' | 'detail' | 'workspace' | 'dashboard';
  export type PagePatternState = 'ready' | 'loading' | 'empty' | 'filtered-empty' | 'error' | 'forbidden';

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
    /** @deprecated Accepted for compatibility; the product baseline is shared. */
    density?: 'compact' | 'comfortable';
    pageId?: string;
    state?: PagePatternState;
    stateTitle?: string;
    stateDescription?: string;
    retry?: () => void;
    stateAction?: Snippet;
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
    density = 'comfortable',
    pageId,
    state = 'ready',
    stateTitle,
    stateDescription,
    retry,
    stateAction,
    class: className = '',
  }: Props = $props();

  const resolvedPageId = $derived(pageId ?? `pattern-${kind}`);
  const resolvedWidth = $derived(width ?? (kind === 'form' ? 'narrow' : kind === 'detail' ? 'default' : 'wide'));
  const showState = $derived(state !== 'ready');
</script>

<ContentPageShell
  {title}
  {...definedOptions({ description, eyebrow, actions })}
  width={resolvedWidth}
  {density}
  pageId={resolvedPageId}
  class={className}
>
  <div data-page-pattern-kind={kind} data-page-pattern-state={state}>
  {#if showState}
    {#if state === 'loading' || state === 'empty' || state === 'filtered-empty' || state === 'error' || state === 'forbidden'}
      <DataState
        {state}
        {...definedOptions({ title: stateTitle })}
        {...definedOptions({ description: stateDescription })}
        {...definedOptions({ retry: state === 'error' ? retry : undefined })}
        {...definedOptions({ action: stateAction })}
      />
    {/if}
  {:else}
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
    <div class="page-pattern__content" data-page-pattern-content={kind}>
      {@render children()}
    </div>
  {/if}

  {#if footer}
    <footer class="page-pattern__footer" data-page-pattern-footer>
      {@render footer()}
    </footer>
  {/if}
  {/if}
  </div>
</ContentPageShell>

<style>
  .page-pattern__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: var(--svadmin-space-4);
  }

  .page-pattern__toolbar,
  .page-pattern__content {
    min-width: 0;
  }

  .page-pattern__content {
    display: grid;
    gap: var(--svadmin-space-5);
  }

  .page-pattern__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--svadmin-space-2);
    margin-top: var(--svadmin-space-5);
    padding-top: var(--svadmin-space-3);
    border-top: 1px solid var(--border);
  }
</style>
