<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Search, X } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  interface Props {
    query?: string;
    placeholder?: string;
    filters?: Snippet;
    actions?: Snippet;
    class?: string;
  }
  let { query = $bindable(''), placeholder = 'Search', filters, actions, class: className = '' }: Props = $props();
</script>

<div class={'flex flex-col gap-2 sm:flex-row sm:items-center ' + className}>
  <div class="relative min-w-0 flex-1">
    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input bind:value={query} {placeholder} class="pl-9 pr-9" aria-label={placeholder} />
    {#if query}<Button variant="ghost" size="icon-xs" class="absolute right-1 top-1/2 -translate-y-1/2" aria-label="Clear search" onclick={() => query = ''}><X class="size-3.5" /></Button>{/if}
  </div>
  {#if filters}<div class="flex flex-wrap items-center gap-2">{@render filters()}</div>{/if}
  {#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</div>
