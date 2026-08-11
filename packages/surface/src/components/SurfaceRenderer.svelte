<script lang="ts">
  import { canAccessAsync, captureAdminContext } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { resolveSurfaceWidgetData } from '../binding.js';
  import { defaultSurfaceCatalog } from '../catalog.js';
  import type { SurfaceRenderCatalog } from '../catalog.js';
  import { loadSurfaceSource } from '../runtime.js';
  import type {
    SurfaceDataError,
    SurfaceDataProvider,
    SurfaceDataSource,
    SurfacePolicy,
    SurfaceSourceDataState,
    SurfaceValidationIssue,
  } from '../types.js';
  import { validateSurfaceSpec } from '../validation.js';

  export type SurfaceRendererError =
    | { readonly type: 'validation'; readonly issues: readonly SurfaceValidationIssue[] }
    | { readonly type: 'data'; readonly error: SurfaceDataError };

  export interface SurfaceRendererProps {
    readonly spec: unknown;
    readonly policy: SurfacePolicy;
    readonly catalog?: SurfaceRenderCatalog;
    readonly dataProvider?: SurfaceDataProvider;
    readonly class?: string;
    readonly onError?: (error: SurfaceRendererError) => void;
  }

  let {
    spec,
    policy,
    catalog = defaultSurfaceCatalog,
    dataProvider,
    class: className = '',
    onError,
  }: SurfaceRendererProps = $props();

  const adminContext = captureAdminContext();
  const validation = $derived(validateSurfaceSpec(spec, catalog, policy));
  const widgetRegistrations = $derived(new Map(catalog.widgets.map((widget) => [widget.type, widget])));
  const currentSpec = $derived(validation.ok ? validation.value : null);
  const sourceGenerations: Record<string, number> = Object.create(null) as Record<string, number>;
  let sourceStates = $state.raw<Record<string, SurfaceSourceDataState>>({});

  function nextGeneration(sourceId: string): number {
    const generation = (sourceGenerations[sourceId] ?? 0) + 1;
    sourceGenerations[sourceId] = generation;
    return generation;
  }

  function setSourceState(sourceId: string, state: SurfaceSourceDataState): void {
    sourceStates = { ...sourceStates, [sourceId]: state };
  }

  function providerFor(resource: string): SurfaceDataProvider {
    return dataProvider ?? adminContext.getDataProviderForResource(resource);
  }

  async function authorize(resource: string, action: 'list' | 'show') {
    return canAccessAsync(resource, action);
  }

  function providerError(sourceId: string, failure: unknown): SurfaceSourceDataState {
    const message = failure instanceof Error ? failure.message : 'Data provider is unavailable';
    return {
      status: 'error',
      sourceId,
      error: { code: 'provider_failed', sourceId, message },
    };
  }

  async function loadSource(source: SurfaceDataSource): Promise<void> {
    const generation = nextGeneration(source.id);
    setSourceState(source.id, { status: 'loading', sourceId: source.id });

    let result: SurfaceSourceDataState;
    try {
      const resourcePolicy = Object.hasOwn(policy.resources, source.resource)
        ? policy.resources[source.resource]
        : undefined;
      if (!resourcePolicy) throw new Error(`Resource "${source.resource}" is not allowed`);
      result = await loadSurfaceSource({
        source,
        resourcePolicy,
        provider: providerFor(source.resource),
        authorize,
      });
    } catch (failure) {
      result = providerError(source.id, failure);
    }

    if (sourceGenerations[source.id] !== generation) return;
    setSourceState(source.id, result);
    if (result.status === 'error') onError?.({ type: 'data', error: result.error });
  }

  async function loadSources(sources: readonly SurfaceDataSource[]): Promise<void> {
    await Promise.all(sources.map(loadSource));
  }

  function invalidateCurrentSources(): void {
    for (const sourceId of Object.keys(sourceGenerations)) nextGeneration(sourceId);
    sourceStates = {};
  }

  export async function refresh(sourceId?: string): Promise<void> {
    const activeSpec = currentSpec;
    if (!activeSpec) return;
    const sources = sourceId === undefined
      ? activeSpec.dataSources
      : activeSpec.dataSources.filter((source) => source.id === sourceId);
    await loadSources(sources);
  }

  $effect(() => {
    const validatedSpec = validation;
    void dataProvider;
    invalidateCurrentSources();
    if (!validatedSpec.ok) {
      onError?.({ type: 'validation', issues: validatedSpec.issues });
      return;
    }

    untrack(() => {
      void loadSources(validatedSpec.value.dataSources);
    });
  });
</script>

{#if validation.ok}
  <section
    class="surface {className}"
    aria-labelledby="surface-{validation.value.surfaceId}-title"
    data-surface-id={validation.value.surfaceId}
  >
    <header class="surface-header">
      <h2 id="surface-{validation.value.surfaceId}-title">{validation.value.title}</h2>
    </header>
    <div class="surface-grid surface-gap-{validation.value.layout.gap ?? 'md'}">
      {#each validation.value.widgets as widget (widget.id)}
        {@const registration = widgetRegistrations.get(widget.type)}
        {@const WidgetComponent = registration?.component}
        <div
          class="surface-widget surface-span-{widget.placement?.columnSpan ?? 12}"
          data-testid="surface-widget-{widget.id}"
        >
          {#if WidgetComponent}
            <WidgetComponent
              widgetId={widget.id}
              props={widget.props}
              data={resolveSurfaceWidgetData(widget, sourceStates)}
            />
          {/if}
        </div>
      {/each}
    </div>
  </section>
{:else}
  <section class="surface-error {className}" role="alert" data-surface-error>
    <h2>Surface could not be rendered</h2>
    <ul>
      {#each validation.issues as issue, issueIndex (`${issue.code}:${issue.path}:${issueIndex}`)}
        <li><code>{issue.code}</code>: {issue.message}</li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .surface,
  .surface-error {
    width: 100%;
    min-width: 0;
  }

  .surface-header {
    margin-bottom: 1rem;
  }

  .surface-header h2,
  .surface-error h2 {
    margin: 0;
    color: var(--foreground);
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    line-height: 1.2;
  }

  .surface-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .surface-gap-sm { gap: 0.5rem; }
  .surface-gap-md { gap: 1rem; }
  .surface-gap-lg { gap: 1.5rem; }

  .surface-widget {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .surface-error {
    padding: 1rem;
    border: 1px solid var(--destructive);
    border-radius: 0.75rem;
    background: var(--card);
    color: var(--destructive);
  }

  .surface-error ul {
    margin: 0.75rem 0 0;
    padding-left: 1.25rem;
  }

  @media (min-width: 48rem) {
    .surface-span-1 { grid-column: span 1; }
    .surface-span-2 { grid-column: span 2; }
    .surface-span-3 { grid-column: span 3; }
    .surface-span-4 { grid-column: span 4; }
    .surface-span-5 { grid-column: span 5; }
    .surface-span-6 { grid-column: span 6; }
    .surface-span-7 { grid-column: span 7; }
    .surface-span-8 { grid-column: span 8; }
    .surface-span-9 { grid-column: span 9; }
    .surface-span-10 { grid-column: span 10; }
    .surface-span-11 { grid-column: span 11; }
    .surface-span-12 { grid-column: span 12; }
  }
</style>
