<script lang="ts">
  import type { Snippet } from 'svelte'; import { onMount } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { usePromptInputCommand } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'value'> { value: string; class?: string; children?: Snippet; }
  let { value, class: className = '', children, disabled = false, onclick, ...rest }: Props = $props(); const command = usePromptInputCommand(); const id = $props.id(); let element = $state<HTMLButtonElement | null>(null);
  onMount(() => command.register({ id, value, disabled: Boolean(disabled), select: () => element?.click() }));
  const visible = $derived(command.isVisible(value));
</script>
{#if visible}<button bind:this={element} {...rest} type="button" role="option" aria-selected={command.activeId === id} class={cn('flex min-h-8 w-full items-center rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} data-slot="prompt-input-command-item" onclick={(event) => { onclick?.(event); }} {disabled}>{@render children?.()}</button>{/if}
