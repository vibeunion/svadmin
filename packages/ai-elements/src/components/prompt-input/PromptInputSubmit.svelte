<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements';
  import { CornerDownLeft, LoaderCircle, Square, X } from '@lucide/svelte'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; status?: 'submitted' | 'streaming' | 'error' | 'ready'; onstop?: () => void; onStop?: () => void; }
  let { class: className = '', children, status = 'ready', onstop, onStop, onclick, ...rest }: Props = $props();
  const generating = $derived(status === 'submitted' || status === 'streaming');
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { if (generating && (onstop || onStop)) { event.preventDefault(); (onstop ?? onStop)?.(); return; } onclick?.(event); }
</script>
<button {...rest} type={generating && (onstop || onStop) ? 'button' : 'submit'} class={cn('svadmin-ai__button size-8 min-h-8 p-0', className)} aria-label={generating ? 'Stop' : 'Submit'} data-slot="prompt-input-submit" onclick={click}>
  {#if children}{@render children()}{:else if status === 'submitted'}<LoaderCircle class="animate-spin" size={15} aria-hidden="true" />{:else if status === 'streaming'}<Square size={14} fill="currentColor" aria-hidden="true" />{:else if status === 'error'}<X size={15} aria-hidden="true" />{:else}<CornerDownLeft size={15} aria-hidden="true" />{/if}
</button>
