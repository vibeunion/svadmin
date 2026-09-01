<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { defaultOpen = false, open = $bindable(defaultOpen), class: className = '', children, onopenchange, ...rest }: { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; [key: string]: unknown } = $props();
</script>
<details class={cn('svadmin-ai rounded-lg border border-border bg-background text-foreground', className)} {open} ontoggle={(event) => { const next = (event.currentTarget as HTMLDetailsElement).open; open = next; onopenchange?.(next); }} {...rest}>{@render children?.()}</details>
