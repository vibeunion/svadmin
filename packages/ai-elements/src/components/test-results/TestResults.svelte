<script module lang="ts">
  export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'todo' | 'running';

  export interface TestResultItem {
    id: string;
    name: string;
    status: TestResultStatus;
    durationMs?: number;
    file?: string;
    suite?: string;
    message?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, CircleDashed, CircleHelp, Clock3, X } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import TestResultsDuration from './TestResultsDuration.svelte';
  import TestResultsHeader from './TestResultsHeader.svelte';
  import TestResultsProgress from './TestResultsProgress.svelte';
  import TestResultsSummary from './TestResultsSummary.svelte';
  interface Props {
    results?: TestResultItem[];
    summary?: import('./context.svelte.js').TestResultsSummaryData;
    title?: string;
    filter?: TestResultStatus | 'all';
    open?: boolean;
    class?: string;
    children?: Snippet;
    onselect?: (result: TestResultItem) => void;
  }

  let {
    results = [],
    summary,
    title = 'Test results',
    filter = $bindable<TestResultStatus | 'all'>('all'),
    open = $bindable(true),
    class: className = '',
    children,
    onselect,
  }: Props = $props();

  import { provideTestResultsContext } from './context.svelte.js';

  const counts = $derived({
    passed: results.filter((result) => result.status === 'passed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    todo: results.filter((result) => result.status === 'todo').length,
    running: results.filter((result) => result.status === 'running').length,
  });
  const visibleResults = $derived(filter === 'all' ? results : results.filter((result) => result.status === filter));
  const passed = $derived(counts.passed === results.length && results.length > 0);
  const resolvedSummary = $derived(summary ?? { passed: counts.passed, failed: counts.failed, skipped: counts.skipped, total: results.length, duration: results.reduce((total, result) => total + (result.durationMs ?? 0), 0) });
  provideTestResultsContext({ get summary() { return resolvedSummary; } });

  function statusLabel(status: TestResultStatus): string {
    return status === 'todo' ? 'To do' : status[0].toUpperCase() + status.slice(1);
  }

  function formatDuration(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) return '';
    return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
  }
</script>

{#if children}
<section class={cn('svadmin-ai-test-results', 'svadmin-ai-test-results--compound', className)} data-slot="test-results">{@render children()}</section>
{:else if summary && !results.length}
<section class={cn('svadmin-ai-test-results', 'svadmin-ai-test-results--compound', className)} data-slot="test-results">
  <TestResultsHeader><TestResultsSummary /><TestResultsDuration /></TestResultsHeader>
  <div class="svadmin-ai-test-results__summary-only"><TestResultsProgress /></div>
</section>
{:else}
<details class={cn('svadmin-ai-test-results', passed && 'svadmin-ai-test-results--passed', className)} {open} ontoggle={(event) => { open = (event.currentTarget as HTMLDetailsElement).open; }}>
  <summary class="svadmin-ai-test-results__summary">
    <span class="svadmin-ai-test-results__heading"><span class="svadmin-ai-test-results__marker" aria-hidden="true"></span><strong>{title}</strong><span class="svadmin-ai__muted">{results.length} tests</span></span>
    <span class="svadmin-ai-test-results__counts" aria-label={`${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped`}>
      <span class="svadmin-ai-test-results__count svadmin-ai-test-results__count--passed">{counts.passed}</span>
      <span class="svadmin-ai-test-results__count svadmin-ai-test-results__count--failed">{counts.failed}</span>
      <span class="svadmin-ai-test-results__count svadmin-ai-test-results__count--skipped">{counts.skipped}</span>
    </span>
  </summary>

  <div class="svadmin-ai-test-results__content">
    <div class="svadmin-ai-test-results__toolbar">
      <label>
        <span class="svadmin-ai__sr-only">Filter test results</span>
        <select class="svadmin-ai__select" bind:value={filter}>
          <option value="all">All tests</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="skipped">Skipped</option>
          <option value="todo">To do</option>
        </select>
      </label>
      <span class="svadmin-ai-test-results__summary-status" role="status" aria-live="polite">{counts.failed ? `${counts.failed} failing` : passed ? 'All passed' : 'Results available'}</span>
    </div>
    <ul class="svadmin-ai-test-results__list" aria-label="Tests">
      {#each visibleResults as result (result.id)}
        <li class={cn('svadmin-ai-test-results__item', `svadmin-ai-test-results__item--${result.status}`)}>
          <button type="button" onclick={() => onselect?.(result)}>
            <span class="svadmin-ai-test-results__icon" aria-hidden="true">
              {#if result.status === 'passed'}<Check size={14} />{:else if result.status === 'failed'}<X size={14} />{:else if result.status === 'running'}<CircleDashed size={14} />{:else if result.status === 'todo'}<CircleHelp size={14} />{:else}<Clock3 size={14} />{/if}
            </span>
            <span class="svadmin-ai-test-results__copy"><strong>{result.name}</strong>{#if result.suite || result.file}<small>{result.suite ?? result.file}</small>{/if}{#if result.message}<small class="svadmin-ai-test-results__message">{result.message}</small>{/if}</span>
            <span class="svadmin-ai-test-results__meta"><span>{statusLabel(result.status)}</span>{#if result.durationMs !== undefined}<time>{formatDuration(result.durationMs)}</time>{/if}</span>
          </button>
        </li>
      {:else}
        <li class="svadmin-ai-test-results__empty">No tests match this filter.</li>
      {/each}
    </ul>
  </div>
</details>
{/if}

<style>
  .svadmin-ai-test-results { border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-test-results__summary { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .7rem .8rem; cursor: pointer; list-style: none; }
  .svadmin-ai-test-results__summary::-webkit-details-marker { display: none; }
  .svadmin-ai-test-results__summary:focus-visible, .svadmin-ai-test-results__item button:focus-visible, .svadmin-ai__select:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-test-results__heading, .svadmin-ai-test-results__counts { display: inline-flex; align-items: center; gap: .5rem; }
  .svadmin-ai-test-results__heading { min-width: 0; font-size: .82rem; }
  .svadmin-ai-test-results__marker { width: .5rem; height: .5rem; border-radius: 50%; background: var(--warning, currentColor); }
  .svadmin-ai-test-results--passed .svadmin-ai-test-results__marker { background: var(--success, currentColor); }
  .svadmin-ai-test-results__counts { font-variant-numeric: tabular-nums; font-size: .72rem; }
  .svadmin-ai-test-results__count::before { content: ''; display: inline-block; width: .4rem; height: .4rem; margin-right: .2rem; border-radius: 50%; background: currentColor; vertical-align: .05em; }
  .svadmin-ai-test-results__count--passed { color: var(--success, currentColor); }
  .svadmin-ai-test-results__count--failed { color: var(--destructive, currentColor); }
  .svadmin-ai-test-results__count--skipped { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-test-results__content { border-top: 1px solid var(--border, currentColor); padding: .6rem; }
  .svadmin-ai-test-results__toolbar { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .55rem; }
  .svadmin-ai-test-results__toolbar label { width: min(12rem, 55%); }
  .svadmin-ai__select { min-height: 2rem; padding: .35rem .55rem; font-size: .76rem; }
  .svadmin-ai-test-results__summary-status { color: var(--muted-foreground, currentColor); font-size: .72rem; }
  .svadmin-ai-test-results__list { display: grid; gap: .2rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-test-results__item { border-radius: min(var(--radius, .5rem), .35rem); }
  .svadmin-ai-test-results__item:hover { background: var(--muted, transparent); }
  .svadmin-ai-test-results__item button { display: flex; width: 100%; align-items: center; gap: .55rem; padding: .5rem; border: 0; border-radius: inherit; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-test-results__icon { display: inline-flex; flex: none; color: var(--muted-foreground, currentColor); }
  .svadmin-ai-test-results__item--passed .svadmin-ai-test-results__icon { color: var(--success, currentColor); }
  .svadmin-ai-test-results__item--failed .svadmin-ai-test-results__icon { color: var(--destructive, currentColor); }
  .svadmin-ai-test-results__item--running .svadmin-ai-test-results__icon { color: var(--primary, currentColor); }
  .svadmin-ai-test-results__copy { display: grid; min-width: 0; flex: 1; gap: .1rem; }
  .svadmin-ai-test-results__copy strong { overflow: hidden; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-test-results__copy small { overflow: hidden; color: var(--muted-foreground, currentColor); font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-test-results__message { color: var(--destructive, currentColor) !important; }
  .svadmin-ai-test-results__meta { display: grid; flex: none; justify-items: end; color: var(--muted-foreground, currentColor); font-size: .68rem; }
  .svadmin-ai-test-results__meta time { font-variant-numeric: tabular-nums; }
  .svadmin-ai-test-results__empty { padding: .8rem; color: var(--muted-foreground, currentColor); font-size: .78rem; text-align: center; }
  .svadmin-ai-test-results--compound { overflow: hidden; }
  .svadmin-ai-test-results__summary-only { padding: .75rem; }
</style>
