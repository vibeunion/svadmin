<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  type Props = { device: MediaDeviceInfo; class?: string; children?: Snippet };
  let { device, class: className = '', children }: Props = $props();
  const match = $derived(device.label.match(/\(([0-9a-f]{4}:[0-9a-f]{4})\)$/i));
  const name = $derived(match ? device.label.slice(0, -match[0].length).trim() : device.label || 'Microphone');
</script>

<span class={cn('min-w-0 truncate', className)}>{#if children}{@render children()}{:else}{name}{#if match}<span class="svadmin-ai__muted"> ({match[1]})</span>{/if}{/if}</span>
