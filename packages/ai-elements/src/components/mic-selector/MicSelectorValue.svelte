<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import { useMicSelectorContext } from './context.svelte.js';
  type Props = { class?: string; children?: Snippet; placeholder?: string };
  let { class: className = '', children, placeholder = 'Select microphone...' }: Props = $props();
  const selector = useMicSelectorContext();
  const selected = $derived(selector.devices.find((device) => device.deviceId === selector.value));
</script>

<span class={cn('min-w-0 flex-1 text-left', className)}>{#if children}{@render children()}{:else if selected}{selected.label || placeholder}{:else}{placeholder}{/if}</span>
