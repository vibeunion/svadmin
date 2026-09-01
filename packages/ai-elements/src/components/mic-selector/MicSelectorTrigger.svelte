<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown, Mic } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useMicSelectorContext } from './context.svelte.js';

  type Props = { class?: string; children?: Snippet; disabled?: boolean; ariaLabel?: string };
  let { class: className = '', children, disabled = false, ariaLabel = 'Select microphone' }: Props = $props();
  const selector = useMicSelectorContext();
</script>

<button type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost svadmin-ai-mic-selector__trigger', className)} {disabled} aria-label={ariaLabel} aria-expanded={selector.open} onclick={() => selector.setOpen(!selector.open)}><Mic size={15} aria-hidden="true" />{#if children}{@render children()}{:else}<span>{selector.value ? selector.devices.find((device) => device.deviceId === selector.value)?.label || 'Selected microphone' : 'Select microphone'}</span>{/if}<ChevronDown size={14} aria-hidden="true" /></button>

<style>
  .svadmin-ai-mic-selector__trigger { justify-content: space-between; min-width: 12rem; }
</style>
