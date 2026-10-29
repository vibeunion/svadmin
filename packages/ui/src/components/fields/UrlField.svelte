<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value: string | null | undefined;
    label?: string;
    target?: string;
    maxDisplayLength?: number;
    showIcon?: boolean;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    label,
    target = '_blank',
    maxDisplayLength = 40,
    showIcon = true,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const display = $derived.by(() => {
    if (label) return label;
    if (!value) return '';
    if (maxDisplayLength && value.length > maxDisplayLength) {
      return value.slice(0, maxDisplayLength) + '…';
    }
    return value;
  });
</script>

{#if value}
  <a
    href={value}
    {target}
    rel="noopener noreferrer"
    class={cn('text-primary hover:underline inline-flex items-center gap-1 text-sm font-medium', className)}
    title={value}
  >
    <span>{display}</span>
    {#if showIcon}
      <ExternalLink class="h-3 w-3 shrink-0 opacity-60" />
    {/if}
  </a>
{:else}
  <span class="text-muted-foreground">{nullLabel}</span>
{/if}
