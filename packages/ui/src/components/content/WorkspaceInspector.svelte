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

<aside class={cn('svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558', className)} data-svadmin-workspace-inspector data-open={open}>
  {#if open}
    <header class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12">
      <div class="svadmin-u-7e0b7cdf1a94">
        <h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</h2>
        {#if description}<p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-7054e2767710 svadmin-u-bfa603190748">{description}</p>{/if}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={closeLabel} title={closeLabel} onclick={toggle}>
        <PanelRightClose class="svadmin-u-f7b5fa971871" />
      </Button>
    </header>
    <div class="svadmin-u-005b1fee4088 svadmin-u-92bf82f493b1 svadmin-u-8e63407b5ceb">{@render children()}</div>
    {#if footer}<footer class="svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-eb6e8b881acd">{@render footer()}</footer>{/if}
  {:else}
    <div class="svadmin-u-60fbb7713999 svadmin-u-c7f14f00a474 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-1b2d54a3fd12">
      <Button variant="ghost" size="icon-sm" aria-label={openLabel} title={openLabel} onclick={toggle}>
        <PanelRightOpen class="svadmin-u-f7b5fa971871" />
      </Button>
      <span class="[writing-mode:vertical-rl] svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{title}</span>
    </div>
  {/if}
</aside>
