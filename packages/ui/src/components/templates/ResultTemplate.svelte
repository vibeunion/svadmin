<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import Result from '../Result.svelte';
  import { cn } from '../../utils.js';

  type ResultStatus = 'success' | 'failure' | '403' | '404' | '500' | 'info' | 'warning';

  interface Props {
    status: ResultStatus;
    title: string;
    subtitle?: string;
    actions?: Snippet;
    details?: Snippet;
    pageId?: string;
    class?: string;
  }

  let { status, title, subtitle, actions, details, pageId = 'result', class: className = '' }: Props = $props();
  const resultStatus = $derived(status === 'failure' ? 'error' : status);
</script>

<ContentPageShell {pageId} width="narrow" class={cn('svadmin-result-page', className)}>
  <Result status={resultStatus} {title} {...(subtitle ? { subtitle } : {})}>
    {#if details}{@render details()}{/if}
  </Result>
  {#if actions}<div class="svadmin-result-page__actions">{@render actions()}</div>{/if}
</ContentPageShell>

<style>
  :global(.svadmin-result-page) { display: grid; place-items: center; padding-block: var(--svadmin-space-6); }
  .svadmin-result-page__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--svadmin-space-2);
    margin-block-start: var(--svadmin-space-4);
  }
</style>