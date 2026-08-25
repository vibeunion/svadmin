<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PanelRightClose, PanelRightOpen } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    description?: string;
    open?: boolean;
    ontoggle?: (open: boolean) => void;
    children: Snippet;
    footer?: Snippet;
    openLabel?: string;
    closeLabel?: string;
    class?: string;
  }

  let {
    title,
    description,
    open = true,
    ontoggle,
    children,
    footer,
    openLabel = 'Open inspector',
    closeLabel = 'Close inspector',
    class: className = '',
  }: Props = $props();

  function toggle(): void {
    ontoggle?.(!open);
  }
</script>

<aside class={cn('overflow-hidden rounded-lg border border-border bg-card', className)} data-svadmin-workspace-inspector data-open={open}>
  {#if open}
    <header class="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-foreground">{title}</h2>
        {#if description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>{/if}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={closeLabel} title={closeLabel} onclick={toggle}>
        <PanelRightClose class="size-4" />
      </Button>
    </header>
    <div class="max-h-[calc(100vh-15rem)] overflow-y-auto p-4">{@render children()}</div>
    {#if footer}<footer class="border-t border-border p-3">{@render footer()}</footer>{/if}
  {:else}
    <div class="flex min-h-64 flex-col items-center gap-3 py-3">
      <Button variant="ghost" size="icon-sm" aria-label={openLabel} title={openLabel} onclick={toggle}>
        <PanelRightOpen class="size-4" />
      </Button>
      <span class="[writing-mode:vertical-rl] text-xs font-medium text-muted-foreground">{title}</span>
    </div>
  {/if}
</aside>
