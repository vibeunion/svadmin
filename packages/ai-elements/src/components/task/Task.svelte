<script module lang="ts">
  export type TaskStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  export interface TaskStep {
    id: string;
    title?: string;
    status?: 'pending' | 'running' | 'complete' | 'failed';
    detail?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, CircleAlert, Clock3, LoaderCircle, Play, RotateCcw, Square } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { provideTaskContext } from './context.svelte.js';

  interface Props {
    id?: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
    progress?: number;
    steps?: TaskStep[];
    open?: boolean;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    oncancel?: () => void | Promise<void>;
    onretry?: () => void | Promise<void>;
    onresume?: () => void | Promise<void>;
  }

  let {
    id,
    title,
    description,
    status = 'queued',
    progress,
    steps = [],
    open = $bindable(false),
    disabled = false,
    class: className = '',
    children,
    oncancel,
    onretry,
    onresume,
  }: Props = $props();

  const componentId = $props.id();
  const titleId = $derived(id ? `${id}-title` : `${componentId}-title`);
  provideTaskContext({ get open() { return open; }, setOpen(nextOpen) { open = nextOpen; } });
  let busy = $state(false);
  const normalizedProgress = $derived(typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined);
  const statusLabel = $derived.by(() => {
    switch (status) {
      case 'running': return 'Running';
      case 'complete': return 'Complete';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Queued';
    }
  });

  async function invoke(action?: () => void | Promise<void>) {
    if (!action || disabled || busy) return;
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }
</script>

<article id={id} class={cn('svadmin-ai-task', `svadmin-ai-task--${status}`, className)} aria-labelledby={children ? undefined : titleId} data-slot="task">
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-task__header">
    <div class="svadmin-ai-task__summary">
      <span class="svadmin-ai-task__status" aria-hidden="true">
        {#if status === 'running'}<LoaderCircle class="svadmin-ai-task__spin" size={16} />
        {:else if status === 'complete'}<Check size={16} />
        {:else if status === 'failed'}<CircleAlert size={16} />
        {:else if status === 'cancelled'}<Square size={14} />
        {:else}<Clock3 size={16} />{/if}
      </span>
      <div class="svadmin-ai-task__copy">
        <h3 id={titleId}>{title ?? 'Task'}</h3>
        {#if description}<p>{description}</p>{/if}
      </div>
    </div>
    <div class="svadmin-ai-task__controls">
      <span class="svadmin-ai-task__label">{statusLabel}</span>
      {#if steps.length > 0 || children}
        <button class="svadmin-ai-task__toggle" type="button" aria-expanded={open} onclick={() => { open = !open; }}>
          {open ? 'Hide details' : 'Show details'}
        </button>
      {/if}
    </div>
  </header>

  {#if normalizedProgress !== undefined}
    <div class="svadmin-ai-task__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={normalizedProgress} aria-label={`${title ?? 'Task'} progress`}>
      <span style={`width: ${normalizedProgress}%`}></span>
    </div>
  {/if}

  {#if open}
    <div class="svadmin-ai-task__details">
      {#if steps.length > 0}
        <ol class="svadmin-ai-task__steps">
          {#each steps as step, index (step.id)}
            {@const stepStatus = step.status ?? 'pending'}
            <li class={cn('svadmin-ai-task__step', `svadmin-ai-task__step--${stepStatus}`)}>
              <span class="svadmin-ai-task__step-marker" aria-hidden="true">{#if stepStatus === 'complete'}<Check size={12} />{:else if stepStatus === 'running'}<LoaderCircle class="svadmin-ai-task__spin" size={12} />{:else if stepStatus === 'failed'}<CircleAlert size={12} />{:else}{index + 1}{/if}</span>
              <span><strong>{step.title}</strong>{#if step.detail}<small>{step.detail}</small>{/if}</span>
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  {/if}

  {#if status === 'running' && oncancel || status === 'failed' && onretry || status === 'cancelled' && onresume}
    <footer class="svadmin-ai-task__actions">
      {#if status === 'running' && oncancel}<button type="button" class="svadmin-ai-task__button svadmin-ai-task__button--ghost" disabled={disabled || busy} onclick={() => invoke(oncancel)}><Square size={14} aria-hidden="true" /> Cancel</button>{/if}
      {#if status === 'failed' && onretry}<button type="button" class="svadmin-ai-task__button" disabled={disabled || busy} onclick={() => invoke(onretry)}><RotateCcw size={14} aria-hidden="true" /> {busy ? 'Retrying...' : 'Retry'}</button>{/if}
      {#if status === 'cancelled' && onresume}<button type="button" class="svadmin-ai-task__button" disabled={disabled || busy} onclick={() => invoke(onresume)}><Play size={14} aria-hidden="true" /> Resume</button>{/if}
    </footer>
  {/if}
  {/if}
</article>

<style>
  .svadmin-ai-task { display: grid; gap: .8rem; padding: .9rem 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-task__header, .svadmin-ai-task__summary, .svadmin-ai-task__controls { display: flex; align-items: flex-start; }
  .svadmin-ai-task__header { justify-content: space-between; gap: 1rem; }
  .svadmin-ai-task__summary { min-width: 0; gap: .6rem; }
  .svadmin-ai-task__status { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-task--running .svadmin-ai-task__status { background: color-mix(in oklch, var(--primary, currentColor) 14%, transparent); color: var(--primary, currentColor); }
  .svadmin-ai-task--complete .svadmin-ai-task__status { background: color-mix(in oklch, var(--success, currentColor) 14%, transparent); color: var(--success, currentColor); }
  .svadmin-ai-task--failed .svadmin-ai-task__status { background: color-mix(in oklch, var(--destructive, currentColor) 14%, transparent); color: var(--destructive, currentColor); }
  .svadmin-ai-task__copy { min-width: 0; }
  h3 { margin: .1rem 0 0; font-size: .88rem; font-weight: 650; }
  p { margin: .25rem 0 0; color: var(--muted-foreground, currentColor); font-size: .78rem; line-height: 1.4; }
  .svadmin-ai-task__controls { flex: none; flex-direction: column; align-items: flex-end; gap: .3rem; }
  .svadmin-ai-task__label { color: var(--muted-foreground, currentColor); font-size: .72rem; white-space: nowrap; }
  .svadmin-ai-task__toggle { border: 0; padding: 0; background: transparent; color: var(--primary, currentColor); font: inherit; font-size: .72rem; cursor: pointer; }
  .svadmin-ai-task__toggle:focus-visible, .svadmin-ai-task__button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-task__progress { height: .28rem; overflow: hidden; border-radius: 999px; background: var(--muted, color-mix(in oklch, var(--foreground, currentColor) 12%, transparent)); }
  .svadmin-ai-task__progress span { display: block; height: 100%; border-radius: inherit; background: var(--primary, currentColor); transition: width 180ms ease; }
  .svadmin-ai-task__details { display: grid; gap: .7rem; border-top: 1px solid var(--border, currentColor); padding-top: .75rem; }
  .svadmin-ai-task__steps { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-task__step { display: flex; align-items: flex-start; gap: .55rem; color: var(--muted-foreground, currentColor); font-size: .78rem; }
  .svadmin-ai-task__step > span:last-child { display: grid; gap: .15rem; }
  .svadmin-ai-task__step strong { color: var(--foreground, currentColor); font-weight: 550; }
  .svadmin-ai-task__step small { font-size: .72rem; line-height: 1.4; }
  .svadmin-ai-task__step-marker { display: inline-flex; width: 1.3rem; height: 1.3rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: 50%; font-size: .68rem; }
  .svadmin-ai-task__step--complete .svadmin-ai-task__step-marker { border-color: var(--success, currentColor); color: var(--success, currentColor); }
  .svadmin-ai-task__step--running .svadmin-ai-task__step-marker { border-color: var(--primary, currentColor); color: var(--primary, currentColor); }
  .svadmin-ai-task__step--failed .svadmin-ai-task__step-marker { border-color: var(--destructive, currentColor); color: var(--destructive, currentColor); }
  .svadmin-ai-task__custom { font-size: .8rem; }
  .svadmin-ai-task__actions { display: flex; justify-content: flex-end; gap: .5rem; }
  .svadmin-ai-task__button { display: inline-flex; align-items: center; gap: .4rem; min-height: 2rem; padding: .4rem .65rem; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); font: inherit; font-size: .78rem; cursor: pointer; }
  .svadmin-ai-task__button--ghost { border-color: var(--border, currentColor); background: transparent; color: var(--foreground, currentColor); }
  .svadmin-ai-task__button:hover:not(:disabled) { opacity: .88; }
  .svadmin-ai-task__button:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-task__spin { animation: svadmin-ai-task-spin 1s linear infinite; }
  @keyframes svadmin-ai-task-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-task__spin { animation: none; } .svadmin-ai-task__progress span { transition: none; } }
  @media (max-width: 36rem) { .svadmin-ai-task__header { flex-direction: column; } .svadmin-ai-task__controls { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; } }
</style>
