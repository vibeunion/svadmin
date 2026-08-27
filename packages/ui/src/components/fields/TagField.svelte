<script module lang="ts">
  export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
</script>

<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    value: string | string[] | null | undefined;
    colorMap?: Record<string, TagTone | string>;
    tone?: TagTone;
    variant?: 'secondary' | 'outline' | 'default' | 'destructive';
    size?: 'sm' | 'default';
    clickable?: boolean;
    onclick?: (tag: string) => void;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    colorMap,
    tone,
    variant = 'secondary',
    size = 'default',
    clickable = false,
    onclick,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const toneClass: Record<TagTone, string> = {
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
    info: 'border-primary/30 bg-primary/10 text-primary',
    neutral: 'border-border bg-muted text-muted-foreground',
  };

  const tags = $derived(
    Array.isArray(value)
      ? value.filter((t): t is string => t != null && t !== '')
      : value != null && value !== ''
        ? [String(value)]
        : []
  );

  function resolveTagClass(tag: string): string {
    const mapped = colorMap?.[tag] ?? tone;
    if (mapped && mapped in toneClass) {
      return toneClass[mapped as TagTone];
    }
    if (typeof mapped === 'string') {
      return mapped;
    }
    return '';
  }
</script>

<span class={cn('inline-flex flex-wrap gap-1 items-center', className)}>
  {#each tags as tag, _i (_i)}
    {@const customClass = resolveTagClass(tag)}
    {#if clickable || onclick}
      <button
        type="button"
        onclick={() => onclick?.(tag)}
        class="focus:outline-none focus:ring-1 focus:ring-ring rounded"
      >
        <Badge
          variant={customClass ? 'outline' : variant}
          class={cn(
            'transition-colors cursor-pointer hover:opacity-80',
            size === 'sm' ? 'px-1.5 py-0 text-[11px] h-5' : '',
            customClass
          )}
        >
          {tag}
        </Badge>
      </button>
    {:else}
      <Badge
        variant={customClass ? 'outline' : variant}
        class={cn(
          size === 'sm' ? 'px-1.5 py-0 text-[11px] h-5' : '',
          customClass
        )}
      >
        {tag}
      </Badge>
    {/if}
  {/each}
  {#if tags.length === 0}
    <span class="text-muted-foreground">{nullLabel}</span>
  {/if}
</span>
