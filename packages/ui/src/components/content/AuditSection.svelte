<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import AuditContent from './AuditContent.svelte';
  import type { AuditDataState } from './audit-state.js';

  export type AuditAccent = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

  interface Props {
    title: string;
    description?: string | undefined;
    eyebrow?: string;
    accent?: AuditAccent;
    actions?: Snippet | undefined;
    children?: Snippet;
    class?: string;
    state?: AuditDataState;
    message?: string | undefined;
    retry?: (() => void) | undefined;
  }

  let {
    title,
    description,
    eyebrow,
    accent = 'primary',
    actions,
    children,
    class: className = '',
    state = 'ready',
    message,
    retry,
  }: Props = $props();
</script>

<section aria-label={title} class={cn('svadmin-audit-section', className)} data-svadmin-audit-section data-accent={accent} data-state={state}>
  <header class="svadmin-audit-section__header">
    <div class="svadmin-audit-section__heading">
      {#if eyebrow}<p class="svadmin-audit-section__eyebrow">{eyebrow}</p>{/if}
      <h2>{title}</h2>
      {#if description}<p class="svadmin-audit-section__description">{description}</p>{/if}
    </div>
    {#if actions && state !== 'forbidden'}<div class="svadmin-audit-section__actions">{@render actions()}</div>{/if}
  </header>
  <div class="svadmin-audit-section__body"><AuditContent {state} {message} {retry} {children} /></div>
</section>
