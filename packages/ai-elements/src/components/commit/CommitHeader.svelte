<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { useCommitContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
  const disclosure = useCommitContext();
  function toggle(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('[data-slot="commit-actions"]')) return;
    disclosure.toggle();
  }
  function toggleFromKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle(event as unknown as MouseEvent);
  }
</script>
<div class={cn('group flex cursor-pointer items-center justify-between gap-4 p-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring', className)} role="button" tabindex="0" aria-expanded={disclosure.open} onclick={toggle} onkeydown={toggleFromKeyboard} {...rest}>{@render children?.()}</div>
