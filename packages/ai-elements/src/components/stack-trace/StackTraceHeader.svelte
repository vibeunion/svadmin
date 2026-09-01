<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useStackTraceContext } from './context.svelte.js';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> {
    class?: string;
    children?: Snippet;
  }

  let { class: className = '', children, onclick, onkeydown, tabindex = 0, ...rest }: Props = $props();
  const stack = useStackTraceContext('StackTraceHeader');

  function toggleFromClick(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
    onclick?.(event);
    if (!event.defaultPrevented) stack.setOpen(!stack.open);
  }

  function toggleFromKeyboard(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
    onkeydown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    stack.setOpen(!stack.open);
  }
</script>

<div
  {...rest}
  role="button"
  {tabindex}
  class={cn('svadmin-ai-stack-part__header', className)}
  aria-expanded={stack.open}
  data-slot="stack-trace-header"
  onclick={toggleFromClick}
  onkeydown={toggleFromKeyboard}
>{@render children?.()}</div>
<style>.svadmin-ai-stack-part__header { display: flex; width: 100%; align-items: center; gap: .75rem; padding: .7rem .8rem; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }.svadmin-ai-stack-part__header:hover { background: var(--muted, transparent); }.svadmin-ai-stack-part__header:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }</style>
