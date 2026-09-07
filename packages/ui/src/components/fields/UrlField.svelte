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
    class={cn('svadmin-u-20aaf08a7ed1 svadmin-u-f673f4a7d061 svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069', className)}
    title={value}
  >
    <span>{display}</span>
    {#if showIcon}
      <ExternalLink class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-012fbd121f37 svadmin-u-f2868c227fcd" />
    {/if}
  </a>
{:else}
  <span class="svadmin-u-bfa603190748">{nullLabel}</span>
{/if}
