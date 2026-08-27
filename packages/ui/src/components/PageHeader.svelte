<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ArrowLeft } from '@lucide/svelte';
  import Breadcrumbs from './Breadcrumbs.svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    extra?: Snippet;
    tags?: Snippet;
    back?: Snippet;
    onBack?: () => void;
    backLabel?: string;
    showBreadcrumbs?: boolean;
    density?: 'compact' | 'comfortable';
    class?: string;
  }

  let {
    title,
    description,
    actions,
    extra,
    tags,
    back,
    onBack,
    backLabel = 'Back',
    showBreadcrumbs = true,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

  const isCompact = $derived(density === 'compact');
</script>

<div class={cn(isCompact ? 'space-y-1.5' : 'space-y-4', className)}>
  {#if showBreadcrumbs}
    <Breadcrumbs class={isCompact ? 'mb-1 text-xs' : 'mb-4'} />
  {/if}
  <div class={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between', isCompact ? 'gap-1.5' : 'gap-2')}>
    <div class="flex items-center gap-2.5 min-w-0">
      {#if back}
        {@render back()}
      {:else if onBack}
        <Button
          variant="ghost"
          size="icon-xs"
          class="shrink-0 text-muted-foreground hover:text-foreground"
          onclick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft class="size-4" />
        </Button>
      {/if}
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class={cn('font-semibold text-foreground truncate', isCompact ? 'text-lg' : 'text-xl')}>
            {title}
          </h1>
          {#if tags}
            <div class="inline-flex items-center gap-1.5">
              {@render tags()}
            </div>
          {/if}
        </div>
        {#if description}
          <p class={cn('text-muted-foreground', isCompact ? 'text-xs' : 'text-sm')}>{description}</p>
        {/if}
      </div>
    </div>
    {#if actions || extra}
      <div class={cn('flex items-center shrink-0', isCompact ? 'gap-1.5' : 'gap-2')}>
        {#if extra}
          {@render extra()}
        {/if}
        {#if actions}
          {@render actions()}
        {/if}
      </div>
    {/if}
  </div>
</div>
