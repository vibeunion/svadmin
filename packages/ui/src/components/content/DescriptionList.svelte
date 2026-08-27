<script lang="ts">
  import { cn } from '../../utils.js';

  export interface DescriptionItem {
    label: string;
    value: unknown;
    description?: string;
    href?: string;
    span?: number;
  }

  interface Props {
    items?: DescriptionItem[];
    columns?: 1 | 2 | 3 | 4;
    layout?: 'vertical' | 'horizontal';
    bordered?: boolean;
    density?: 'compact' | 'comfortable';
    class?: string;
  }

  let {
    items = [],
    columns = 1,
    layout = 'vertical',
    bordered = false,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

  const isCompact = $derived(density === 'compact');
  const isHorizontal = $derived(layout === 'horizontal');

  const columnClass = $derived.by(() => {
    switch (columns) {
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      default:
        return 'grid-cols-1';
    }
  });
</script>

{#if bordered}
  <div class={cn('overflow-hidden rounded-lg border border-border bg-card text-foreground', className)}>
    <dl class={cn('grid divide-y divide-border/60 sm:divide-y-0', columnClass)}>
      {#each items as item (item.label)}
        <div
          class={cn(
            'flex flex-col border-b border-r border-border/40 last:border-b-0',
            isHorizontal ? 'sm:flex-row' : '',
            item.span && item.span > 1 ? `sm:col-span-${Math.min(item.span, columns)}` : '',
          )}
        >
          <dt
            class={cn(
              'bg-muted/30 font-medium text-muted-foreground shrink-0 border-b sm:border-b-0 sm:border-r border-border/30',
              isCompact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm',
              isHorizontal ? 'sm:w-1/3' : '',
            )}
          >
            {item.label}
          </dt>
          <dd
            class={cn(
              'break-words font-medium text-foreground bg-card flex-1 min-w-0',
              isCompact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm',
            )}
          >
            {#if item.href}
              <a class="text-primary underline-offset-4 hover:underline" href={item.href}>{String(item.value ?? '—')}</a>
            {:else}
              {item.value != null ? String(item.value) : '—'}
            {/if}
            {#if item.description}
              <p class="mt-0.5 text-xs font-normal text-muted-foreground">{item.description}</p>
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  </div>
{:else}
  <dl
    class={cn(
      'grid',
      columnClass,
      isCompact ? 'gap-x-4 gap-y-3' : 'gap-x-6 gap-y-5',
      className,
    )}
  >
    {#each items as item (item.label)}
      <div
        class={cn(
          'min-w-0',
          isHorizontal ? 'flex items-baseline gap-2' : '',
          item.span && item.span > 1 ? `sm:col-span-${Math.min(item.span, columns)}` : '',
        )}
      >
        <dt
          class={cn(
            'font-medium text-muted-foreground',
            isCompact ? 'text-xs' : 'text-xs',
            isHorizontal ? 'shrink-0 min-w-20' : '',
          )}
        >
          {item.label}
        </dt>
        <dd
          class={cn(
            'break-words font-medium text-foreground min-w-0 flex-1',
            isHorizontal ? 'text-xs sm:text-sm' : isCompact ? 'mt-0.5 text-xs sm:text-sm' : 'mt-1 text-sm',
          )}
        >
          {#if item.href}
            <a class="text-primary underline-offset-4 hover:underline" href={item.href}>{String(item.value ?? '—')}</a>
          {:else}
            {item.value != null ? String(item.value) : '—'}
          {/if}
          {#if item.description}
            <p class="mt-1 text-xs font-normal text-muted-foreground">{item.description}</p>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
{/if}
