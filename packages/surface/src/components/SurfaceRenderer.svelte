<script lang="ts">
  import { canAccessAsync, captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { onDestroy, untrack } from 'svelte';
  import { resolveSurfaceWidgetData } from '../binding.js';
  import { defaultSurfaceCatalog } from '../catalog.js';
  import type { SurfaceRenderCatalog } from '../catalog.js';
  import { createSurfaceSourceController } from '../source-controller.js';
  import { resolveSurfaceMessages } from '../localization.js';
  import type { SurfaceMessages } from '../localization.js';
  import type {
    SurfaceDataError, SurfaceDataProvider, SurfacePolicy,
    SurfaceSourceDataState, SurfaceValidationIssue,
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
    /** 可信宿主在用户、租户或授权会话切换时更新；不是模型可提供的字段。 */
    readonly scopeKey?: string;
    readonly locale?: string;
    readonly messages?: Partial<SurfaceMessages>;
    readonly class?: string;
    readonly onError?: (error: SurfaceRendererError) => void;
  }

  let {
    spec, policy, catalog = defaultSurfaceCatalog, dataProvider, scopeKey = '',
    locale, messages, class: className = '', onError,
  }: SurfaceRendererProps = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const activeLocale = $derived(locale ?? i18n.locale);
  const activeMessages = $derived(resolveSurfaceMessages(activeLocale, messages));
  const validation = $derived(validateSurfaceSpec(spec, catalog, policy));
  const widgetRegistrations = $derived(new Map(catalog.widgets.map((widget) => [widget.type, widget])));
  // 单独写入数据源键，避免每次响应替换整个状态对象。
  const sourceStates = $state<Record<string, SurfaceSourceDataState>>({});
  const controller = createSurfaceSourceController({
    authorize: (resource, action) => canAccessAsync(resource, action),
    onState(id, state) {
      if (state === undefined) delete sourceStates[id];
      else sourceStates[id] = state;
    },
    onError: (error) => onError?.({ type: 'data', error }),
  });

  export async function refresh(sourceId?: string): Promise<void> {
    if (!validation.ok) return;
    await controller.refresh(sourceId);
  }

  $effect(() => {
    const validatedSpec = validation;
    const provider = dataProvider;
    const activeScope = scopeKey;
    const activePolicy = policy;
    untrack(() => {
      if (!validatedSpec.ok) {
        controller.clear();
        onError?.({ type: 'validation', issues: validatedSpec.issues });
        return;
      }
      void controller.reconcile(validatedSpec.value, activePolicy,
        (resource) => provider ?? adminContext.getDataProviderForResource(resource), activeScope);
    });
  });
  onDestroy(() => controller.dispose());
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
      {#key JSON.stringify([validation.value.surfaceId, catalog.version, scopeKey])}
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
                locale={activeLocale}
                messages={activeMessages}
              />
            {/if}
          </div>
        {/each}
      {/key}
    </div>
  </section>
{:else}
  <section class="surface-error {className}" role="alert" data-surface-error>
    <h2>{activeMessages.renderErrorTitle}</h2>
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
  .surface-header { margin-bottom: 1rem; }
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
  .surface-widget { grid-column: 1 / -1; min-width: 0; }
  .surface-error {
    padding: 1rem;
    border: 1px solid var(--destructive);
    border-radius: 0.75rem;
    background: var(--card);
    color: var(--destructive);
  }
  .surface-error ul { margin: 0.75rem 0 0; padding-left: 1.25rem; }
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
