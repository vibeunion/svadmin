<script module lang="ts">
  export type WorkspaceActionBarTone = 'default' | 'warning' | 'success' | 'destructive' | 'info';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    description?: string;
    status?: string;
    statusTone?: WorkspaceActionBarTone;
    primaryAction: Snippet;
    secondaryActions?: Snippet;
    class?: string;
  }

  let {
    title,
    description,
    status,
    statusTone = 'warning',
    primaryAction,
    secondaryActions,
    class: className = '',
  }: Props = $props();

  const toneClassMap: Record<WorkspaceActionBarTone, string> = {
    default: 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
    warning: 'svadmin-u-d9c3c520f7d5 svadmin-u-3a4ff758c2ab',
    success: 'svadmin-u-4cf5af8d25d3 svadmin-u-76747e5e02ff',
    destructive: 'svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e',
    info: 'svadmin-u-269105289e8f svadmin-u-fa68ba954fb0',
  };
</script>

<section
  class={cn('svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-8b8196092091 svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12 svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93', className)}
  aria-label={title}
  data-svadmin-workspace-action-bar
>
  <div class="svadmin-u-7e0b7cdf1a94">
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      {#if status}
        <span class={cn('svadmin-u-36d4469299aa svadmin-u-d5eab218aa34 svadmin-u-465609a240a8 svadmin-u-359090c2d529 svadmin-u-2689f3958069', toneClassMap[statusTone] || toneClassMap.warning)}>
          {status}
        </span>
      {/if}
      <h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</h2>
    </div>
    {#if description}<p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-7054e2767710 svadmin-u-bfa603190748">{description}</p>{/if}
  </div>
  <div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
    {#if secondaryActions}{@render secondaryActions()}{/if}
    {@render primaryAction()}
  </div>
</section>
