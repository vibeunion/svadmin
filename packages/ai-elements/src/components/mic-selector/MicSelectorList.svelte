<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import { useMicSelectorContext } from './context.svelte.js';
  type Props = { class?: string; children?: Snippet<[MediaDeviceInfo[]]> };
  let { class: className = '', children }: Props = $props();
  const selector = useMicSelectorContext();
</script>

{#if selector.loading}<p class={cn('svadmin-ai__muted text-xs', className)}>Loading microphones...</p>{:else if selector.error}<p class={cn('text-destructive text-xs', className)} role="alert">{selector.error}</p>{:else}{@render children?.(selector.devices)}{/if}
