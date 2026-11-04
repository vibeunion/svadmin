<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  export type ModelComparisonStatus = 'complete' | 'streaming' | 'error';

  export interface ModelComparisonResult {
    id: string;
    model: string;
    provider?: string;
    response: string;
    latencyMs?: number;
    tokens?: number;
    score?: number;
    status?: ModelComparisonStatus;
    error?: string;
  }

  export type ModelComparisonCardProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'results'> & {
    title?: string;
    description?: string;
    results: readonly ModelComparisonResult[];
    winnerId?: string;
    selectLabel?: string;
    onSelect?: (result: ModelComparisonResult) => void;
    onselect?: (result: ModelComparisonResult) => void;
    class?: string;
  };
</script>

<script lang="ts">
  import { Check, CircleAlert, Trophy } from '@lucide/svelte';
  import { cn } from '../utils.js';

  let {
    title = 'Model comparison',
    description = 'Compare responses before choosing the result to continue with.',
    results,
    winnerId,
    selectLabel = 'Use this response',
    onSelect,
    onselect,
    class: className = '',
    ...rest
  }: ModelComparisonCardProps = $props();

  function select(result: ModelComparisonResult): void {
    onSelect?.(result);
    onselect?.(result);
  }
</script>

<section {...rest} class={cn('svadmin-ai__surface svadmin-ai-model-comparison', className)} data-slot="model-comparison-card" aria-label={title}>
  <header class="svadmin-ai-model-comparison__header">
    <div>
      <h2>{title}</h2>
      {#if description}<p>{description}</p>{/if}
    </div>
    <span class="svadmin-ai-model-comparison__count">{results.length} models</span>
  </header>

  {#if results.length === 0}
    <p class="svadmin-ai-model-comparison__empty" role="status">No model responses yet.</p>
  {:else}
    <div class="svadmin-ai-model-comparison__grid">
      {#each results as result (result.id)}
        {@const isWinner = winnerId === result.id}
        <article class={cn('svadmin-ai-model-comparison__result', isWinner && 'svadmin-ai-model-comparison__result--winner')} data-model-id={result.id}>
          <header class="svadmin-ai-model-comparison__result-header">
            <div class="svadmin-ai-model-comparison__model">
              {#if isWinner}<Trophy size={15} aria-hidden="true" />{/if}
              <h3>{result.model}</h3>
              {#if result.provider}<span>{result.provider}</span>{/if}
            </div>
            {#if isWinner}<span class="svadmin-ai-model-comparison__winner"><Check size={13} aria-hidden="true" />Selected</span>{/if}
          </header>

          {#if result.status === 'error'}
            <div class="svadmin-ai-model-comparison__error" role="alert"><CircleAlert size={15} aria-hidden="true" />{result.error ?? 'This model did not return a response.'}</div>
          {:else}
            <p class:svadmin-ai-model-comparison__streaming={result.status === 'streaming'} class="svadmin-ai-model-comparison__response">{result.response || 'Waiting for response…'}</p>
          {/if}

          <footer class="svadmin-ai-model-comparison__footer">
            <div class="svadmin-ai-model-comparison__metrics" aria-label="Response metrics">
              {#if result.latencyMs !== undefined}<span>{result.latencyMs} ms</span>{/if}
              {#if result.tokens !== undefined}<span>{result.tokens} tokens</span>{/if}
              {#if result.score !== undefined}<span>Score {result.score}</span>{/if}
            </div>
            {#if result.status !== 'error'}
              <button type="button" onclick={() => select(result)}>{selectLabel}</button>
            {/if}
          </footer>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .svadmin-ai-model-comparison { display: grid; gap: 1rem; padding: 1rem; }
  .svadmin-ai-model-comparison__header, .svadmin-ai-model-comparison__result-header, .svadmin-ai-model-comparison__footer { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
  .svadmin-ai-model-comparison__header h2, .svadmin-ai-model-comparison__model h3 { margin: 0; color: var(--foreground, currentColor); font-size: .9375rem; font-weight: 650; }
  .svadmin-ai-model-comparison__header p { max-width: 55ch; margin: .25rem 0 0; color: var(--muted-foreground, currentColor); font-size: .8125rem; }
  .svadmin-ai-model-comparison__count, .svadmin-ai-model-comparison__model span, .svadmin-ai-model-comparison__metrics { color: var(--muted-foreground, currentColor); font-size: .75rem; }
  .svadmin-ai-model-comparison__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: .75rem; }
  .svadmin-ai-model-comparison__result { display: flex; min-width: 0; flex-direction: column; gap: .75rem; padding: .875rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); }
  .svadmin-ai-model-comparison__result--winner { border-color: var(--primary, currentColor); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary, currentColor) 24%, transparent); }
  .svadmin-ai-model-comparison__model { display: flex; min-width: 0; align-items: center; gap: .375rem; }
  .svadmin-ai-model-comparison__model h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-model-comparison__model span { margin-inline-start: auto; }
  .svadmin-ai-model-comparison__winner { display: inline-flex; align-items: center; gap: .25rem; color: var(--success, currentColor); font-size: .75rem; font-weight: 600; white-space: nowrap; }
  .svadmin-ai-model-comparison__response { min-height: 5rem; margin: 0; color: var(--foreground, currentColor); font-size: .8125rem; line-height: 1.55; white-space: pre-wrap; }
  .svadmin-ai-model-comparison__streaming { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-model-comparison__error { display: flex; min-height: 5rem; align-items: flex-start; gap: .375rem; margin: 0; color: var(--destructive, currentColor); font-size: .8125rem; line-height: 1.55; }
  .svadmin-ai-model-comparison__footer { align-items: center; margin-top: auto; padding-top: .625rem; border-top: 1px solid color-mix(in srgb, var(--border, currentColor) 70%, transparent); }
  .svadmin-ai-model-comparison__metrics { display: flex; flex-wrap: wrap; gap: .5rem; }
  .svadmin-ai-model-comparison__footer button { border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .375rem); padding: .375rem .625rem; background: var(--background, transparent); color: var(--foreground, currentColor); font: inherit; font-size: .75rem; cursor: pointer; }
  .svadmin-ai-model-comparison__footer button:hover { background: var(--muted, transparent); }
  .svadmin-ai-model-comparison__footer button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-model-comparison__empty { margin: 0; color: var(--muted-foreground, currentColor); font-size: .8125rem; }
  @media (max-width: 30rem) { .svadmin-ai-model-comparison { padding: .75rem; } .svadmin-ai-model-comparison__grid { grid-template-columns: 1fr; } .svadmin-ai-model-comparison__footer { align-items: stretch; flex-direction: column; } .svadmin-ai-model-comparison__footer button { width: 100%; } }
</style>
