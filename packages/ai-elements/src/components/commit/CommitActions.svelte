<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div
  class={cn('flex items-center gap-1', className)}
  role="group"
  onclickcapture={(event) => event.preventDefault()}
  onclick={(event) => {
    event.stopPropagation();
  }}
  onkeydown={(event) => event.stopPropagation()}
  {...rest}
>{@render children?.()}</div>
