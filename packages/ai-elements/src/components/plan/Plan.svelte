<script module lang="ts">
  export type PlanStepStatus = 'pending' | 'active' | 'complete' | 'error' | 'skipped';
  export interface PlanStep {
    id: string;
    title: string;
    description?: string;
    status?: PlanStepStatus;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, CircleAlert, CircleDot, ListChecks, Minus } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { providePlanContext } from './context.svelte.js';

  interface Props {
    steps?: PlanStep[];
    title?: string;
    description?: string;
    isStreaming?: boolean;
    open?: boolean;
    class?: string;
    children?: Snippet;
    onstepclick?: (step: PlanStep, index: number) => void;
  }

  let {
    steps,
    title = 'Plan',
    description,
    isStreaming = false,
    open = $bindable(true),
    class: className = '',
    children,
    onstepclick,
  }: Props = $props();

  const componentId = $props.id();
  const resolvedSteps = $derived(steps ?? []);
  const completedCount = $derived(resolvedSteps.filter((step) => step.status === 'complete').length);
  const progress = $derived(resolvedSteps.length ? Math.round((completedCount / resolvedSteps.length) * 100) : 0);
  providePlanContext({
    get isStreaming() { return isStreaming; },
    get open() { return open; },
    setOpen(nextOpen) { open = nextOpen; },
  });

  function stepStatus(step: PlanStep): PlanStepStatus {
    return step.status ?? 'pending';
  }
</script>

<section class={cn('svadmin-ai-plan', className)} aria-labelledby={children ? undefined : `${componentId}-title`} data-slot="plan">
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-plan__header">
    <div class="svadmin-ai-plan__title-wrap">
      <span class="svadmin-ai-plan__icon" aria-hidden="true"><ListChecks size={16} /></span>
      <div>
        <h3 id={`${componentId}-title`}>{title}</h3>
        {#if description}<p>{description}</p>{/if}
      </div>
    </div>
    <div class="svadmin-ai-plan__header-actions">
      <span class="svadmin-ai-plan__progress" aria-label={`${completedCount} of ${resolvedSteps.length} steps complete`}>{completedCount}/{resolvedSteps.length}</span>
      <button class="svadmin-ai-plan__toggle" type="button" aria-expanded={open} aria-controls={`${componentId}-steps`} onclick={() => { open = !open; }}>
        {open ? 'Hide' : 'Show'} steps
      </button>
    </div>
  </header>

  <div class="svadmin-ai-plan__meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} aria-label="Plan completion">
    <span style={`width: ${progress}%`}></span>
  </div>

  {#if open}
    <ol id={`${componentId}-steps`} class="svadmin-ai-plan__steps">
      {#each resolvedSteps as step, index (step.id)}
        {@const status = stepStatus(step)}
        <li class={cn('svadmin-ai-plan__step', `svadmin-ai-plan__step--${status}`)}>
          {#if onstepclick}
            <button type="button" class="svadmin-ai-plan__step-button" aria-current={status === 'active' ? 'step' : undefined} onclick={() => onstepclick?.(step, index)}>
              <span class="svadmin-ai-plan__marker" aria-hidden="true">
                {#if status === 'complete'}<Check size={13} />{:else if status === 'error'}<CircleAlert size={13} />{:else if status === 'skipped'}<Minus size={13} />{:else if status === 'active'}<CircleDot size={13} />{:else}<span>{index + 1}</span>{/if}
              </span>
              <span class="svadmin-ai-plan__step-copy"><strong>{step.title}</strong>{#if step.description}<small>{step.description}</small>{/if}</span>
            </button>
          {:else}
            <div class="svadmin-ai-plan__step-button" aria-current={status === 'active' ? 'step' : undefined}>
              <span class="svadmin-ai-plan__marker" aria-hidden="true">
                {#if status === 'complete'}<Check size={13} />{:else if status === 'error'}<CircleAlert size={13} />{:else if status === 'skipped'}<Minus size={13} />{:else if status === 'active'}<CircleDot size={13} />{:else}<span>{index + 1}</span>{/if}
              </span>
              <span class="svadmin-ai-plan__step-copy"><strong>{step.title}</strong>{#if step.description}<small>{step.description}</small>{/if}</span>
            </div>
          {/if}
        </li>
      {:else}
        <li class="svadmin-ai-plan__empty">No plan steps yet.</li>
      {/each}
    </ol>
  {/if}

  {/if}
</section>

<style>
  .svadmin-ai-plan { display: grid; gap: .8rem; padding: 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-plan__header, .svadmin-ai-plan__title-wrap, .svadmin-ai-plan__header-actions { display: flex; align-items: center; }
  .svadmin-ai-plan__header { justify-content: space-between; gap: 1rem; }
  .svadmin-ai-plan__title-wrap { min-width: 0; gap: .6rem; }
  .svadmin-ai-plan__icon { display: inline-flex; color: var(--primary, currentColor); }
  h3 { margin: 0; font-size: .95rem; font-weight: 650; }
  p { margin: .2rem 0 0; color: var(--muted-foreground, currentColor); font-size: .8rem; }
  .svadmin-ai-plan__header-actions { gap: .6rem; }
  .svadmin-ai-plan__progress { color: var(--muted-foreground, currentColor); font-size: .75rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-plan__toggle { border: 0; background: transparent; color: var(--primary, currentColor); font: inherit; font-size: .75rem; cursor: pointer; }
  .svadmin-ai-plan__toggle:focus-visible, .svadmin-ai-plan__step-button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-plan__meter { height: .3rem; overflow: hidden; border-radius: 999px; background: var(--muted, color-mix(in oklch, var(--foreground, currentColor) 12%, transparent)); }
  .svadmin-ai-plan__meter span { display: block; height: 100%; border-radius: inherit; background: var(--primary, currentColor); transition: width 180ms ease; }
  .svadmin-ai-plan__steps { display: grid; gap: .15rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-plan__step { position: relative; }
  .svadmin-ai-plan__step:not(:last-child)::after { content: ''; position: absolute; top: 1.85rem; bottom: -.15rem; left: .82rem; width: 1px; background: var(--border, currentColor); }
  .svadmin-ai-plan__step-button { position: relative; z-index: 1; display: flex; width: 100%; align-items: flex-start; gap: .65rem; padding: .45rem .2rem; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  div.svadmin-ai-plan__step-button { cursor: default; }
  .svadmin-ai-plan__marker { display: inline-flex; width: 1.65rem; height: 1.65rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: 50%; background: var(--background, transparent); color: var(--muted-foreground, currentColor); font-size: .72rem; }
  .svadmin-ai-plan__step-copy { display: grid; gap: .15rem; min-width: 0; padding-top: .1rem; }
  .svadmin-ai-plan__step-copy strong { font-size: .82rem; font-weight: 600; }
  .svadmin-ai-plan__step-copy small { color: var(--muted-foreground, currentColor); font-size: .75rem; line-height: 1.4; }
  .svadmin-ai-plan__step--active .svadmin-ai-plan__marker { border-color: var(--primary, currentColor); color: var(--primary, currentColor); }
  .svadmin-ai-plan__step--complete .svadmin-ai-plan__marker { border-color: var(--success, currentColor); color: var(--success, currentColor); }
  .svadmin-ai-plan__step--error .svadmin-ai-plan__marker { border-color: var(--destructive, currentColor); color: var(--destructive, currentColor); }
  .svadmin-ai-plan__step--skipped { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-plan__empty { padding: .75rem 0; color: var(--muted-foreground, currentColor); font-size: .8rem; }
  .svadmin-ai-plan__footer { border-top: 1px solid var(--border, currentColor); padding-top: .75rem; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-plan__meter span { transition: none; } }
</style>
