<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Check, CircleAlert, Clock3, X } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import {
    provideConfirmationContext,
    type ConfirmationApproval,
    type ConfirmationState,
    type ConfirmationStatus,
  } from './context.svelte.js';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> {
    title?: string;
    description?: string;
    status?: ConfirmationStatus;
    state?: ConfirmationState;
    approval?: ConfirmationApproval;
    confirmLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    onconfirm?: () => void | Promise<void>;
    oncancel?: () => void | Promise<void>;
  }

  let {
    title = 'Confirmation required',
    description,
    status = 'pending',
    state: stateProp,
    approval,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    disabled = false,
    class: className = '',
    children,
    onconfirm,
    oncancel,
    ...rest
  }: Props = $props();

  const componentId = $props.id();
  let busy = $state(false);
  const officialMode = $derived(stateProp !== undefined || approval !== undefined);
  const resolvedState = $derived<ConfirmationState>(stateProp ?? (
    status === 'pending' ? 'approval-requested'
      : status === 'approved' ? 'output-available'
        : 'output-denied'
  ));
  const resolvedApproval = $derived<ConfirmationApproval | undefined>(approval ?? (
    status === 'approved' ? { approved: true }
      : status === 'rejected' || status === 'expired' ? { approved: false }
        : undefined
  ));
  const visible = $derived(!officialMode || (
    resolvedApproval !== undefined
    && resolvedState !== 'input-streaming'
    && resolvedState !== 'input-available'
  ));
  const actionable = $derived(status === 'pending' && !disabled && !busy);
  const statusLabel = $derived.by(() => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return 'Awaiting confirmation';
    }
  });

  async function run(action?: () => void | Promise<void>) {
    if (!actionable || !action) return;
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }

  provideConfirmationContext({
    get approval() { return resolvedApproval; },
    get state() { return resolvedState; },
    get status() { return status; },
  });
</script>

{#if visible}
<section {...rest} class={cn('svadmin-ai-confirmation', `svadmin-ai-confirmation--${status}`, className)} aria-labelledby={`${componentId}-title`} data-slot="confirmation">
  {#if children}
    {@render children()}
  {:else}
  <div class="svadmin-ai-confirmation__heading">
    <div>
      <h3 id={`${componentId}-title`}>{title}</h3>
      {#if description}<p>{description}</p>{/if}
    </div>
    <span class="svadmin-ai-confirmation__status" data-status={status}>
      {#if status === 'approved'}<Check size={14} aria-hidden="true" />
      {:else if status === 'rejected' || status === 'expired'}<CircleAlert size={14} aria-hidden="true" />
      {:else}<Clock3 size={14} aria-hidden="true" />{/if}
      {statusLabel}
    </span>
  </div>
  {#if status === 'pending'}
    <div class="svadmin-ai-confirmation__actions">
      {#if oncancel}<button class="svadmin-ai-confirmation__button svadmin-ai-confirmation__button--ghost" type="button" disabled={!actionable} onclick={() => run(oncancel)}><X size={15} aria-hidden="true" />{cancelLabel}</button>{/if}
      {#if onconfirm}<button class="svadmin-ai-confirmation__button" type="button" disabled={!actionable} aria-busy={busy} onclick={() => run(onconfirm)}><Check size={15} aria-hidden="true" />{busy ? 'Working...' : confirmLabel}</button>{/if}
    </div>
  {/if}
  {/if}
</section>
{/if}

<style>
  .svadmin-ai-confirmation { display: grid; gap: 1rem; padding: 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-confirmation__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  h3 { margin: 0; font-size: .95rem; font-weight: 650; }
  p { margin: .3rem 0 0; color: var(--muted-foreground, currentColor); font-size: .82rem; line-height: 1.45; }
  .svadmin-ai-confirmation__status { display: inline-flex; flex: none; align-items: center; gap: .35rem; padding: .25rem .5rem; border: 1px solid var(--border, currentColor); border-radius: 999px; color: var(--muted-foreground, currentColor); font-size: .72rem; white-space: nowrap; }
  .svadmin-ai-confirmation--approved .svadmin-ai-confirmation__status { border-color: color-mix(in oklch, var(--success, currentColor) 35%, var(--border, currentColor)); color: var(--success, currentColor); }
  .svadmin-ai-confirmation--rejected .svadmin-ai-confirmation__status, .svadmin-ai-confirmation--expired .svadmin-ai-confirmation__status { border-color: color-mix(in oklch, var(--destructive, currentColor) 35%, var(--border, currentColor)); color: var(--destructive, currentColor); }
  .svadmin-ai-confirmation__body { padding: .75rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); font-size: .85rem; }
  .svadmin-ai-confirmation__actions { display: flex; justify-content: flex-end; gap: .5rem; }
  .svadmin-ai-confirmation__button { display: inline-flex; min-height: 2.25rem; align-items: center; justify-content: center; gap: .4rem; padding: .5rem .75rem; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); font: inherit; font-size: .82rem; cursor: pointer; }
  .svadmin-ai-confirmation__button--ghost { border-color: var(--border, currentColor); background: transparent; color: var(--foreground, currentColor); }
  .svadmin-ai-confirmation__button:hover:not(:disabled) { opacity: .88; }
  .svadmin-ai-confirmation__button:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-confirmation__button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  @media (max-width: 36rem) { .svadmin-ai-confirmation__heading { flex-direction: column; } }
</style>
