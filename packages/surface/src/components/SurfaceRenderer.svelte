<script lang="ts">
  import { captureAdminContext, getLogoutVersion } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { onDestroy, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { resolveSurfaceSourceData } from '../binding.js';
  import { defaultSurfaceCatalog } from '../catalog.js';
  import type { SurfaceRenderCatalog } from '../catalog.js';
  import { loadSurfaceSource } from '../runtime.js';
  import { resolveSurfaceMessages } from '../localization.js';
  import type { SurfaceMessages } from '../localization.js';
  import type {
    SurfaceDataError, SurfaceDataProvider, SurfacePolicy,
    SurfaceSourceDataState, SurfaceValidationIssue, JsonObject,
  } from '../types.js';
  import { validateSurfaceSpec } from '../validation.js';
  import { createSurfaceSourceCache, sameSourceIdentity, snapshotSurfaceSource } from '../source-cache.js';
  import type { SurfaceSourceRequest } from '../source-cache.js';
  import { surfaceMetric } from '../recipes.js';
  import '../styles.css';
  import { withoutSurfaceAppearance } from '../workflows/catalog.js';

  function appearanceClasses(props: JsonObject): string {
    const appearance = props['appearance'] as { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; density?: 'compact' | 'comfortable' } | undefined;
    if (!appearance) return '';
    const classes = surfaceMetric(appearance);
    return `surface-appearance ${classes.root} ${classes.card}`;
  }

  export type SurfaceRendererError =
    | { readonly type: 'validation'; readonly issues: readonly SurfaceValidationIssue[] }
    | { readonly type: 'data'; readonly error: SurfaceDataError };

  export interface SurfaceRendererProps {
    readonly spec: unknown;
    readonly policy: SurfacePolicy;
    readonly catalog?: SurfaceRenderCatalog;
    readonly dataProvider?: SurfaceDataProvider;
    /** 可信宿主的用户/租户/授权会话标识；禁止使用凭证或模型提供的值。 */
    readonly scopeKey?: string;
    /** 与独立增量加载接口保持兼容；任一作用域标识变化都会清空状态。 */
    readonly dataScopeKey?: string | number;
    readonly locale?: string;
    readonly messages?: Partial<SurfaceMessages>;
    readonly class?: string;
    readonly onError?: (error: SurfaceRendererError) => void;
  }

  let {
    spec, policy, catalog = defaultSurfaceCatalog, dataProvider, scopeKey = '', dataScopeKey,
    locale, messages, class: className = '', onError,
  }: SurfaceRendererProps = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const activeLocale = $derived(locale ?? i18n.locale);
  const activeMessages = $derived(resolveSurfaceMessages(activeLocale, messages));
  const validation = $derived(validateSurfaceSpec(spec, catalog, policy));
  const widgetRegistrations = $derived(new Map(catalog.widgets.map((widget) => [widget.type, widget])));
  const sourceStates = new SvelteMap<string, SurfaceSourceDataState>();
  let destroyed = false;
  let previousScope: readonly unknown[] = [];
  let widgetScopeRevision = $state(0);
  const sessionIdentity = $derived([
    validation.ok ? validation.value.surfaceId : undefined,
    catalog.version, scopeKey, dataScopeKey, getLogoutVersion(),
    adminContext.tenantCacheKey?.__svadminTenant,
    adminContext.authProvider, adminContext.accessControlProvider,
  ]);
  // 复用 PR #428 的请求所有权与会话隔离实现，不维护第二套缓存。
  const sourceCache = createSurfaceSourceCache({
    set: (id, state) => { sourceStates.set(id, state); },
    remove: (id) => { sourceStates.delete(id); },
    onError: (state) => { onError?.({ type: 'data', error: state.error }); },
  });

  function providerError(sourceId: string, failure: unknown): SurfaceSourceDataState {
    const message = failure instanceof Error ? failure.message : activeMessages.providerUnavailable;
    return { status: 'error', sourceId, error: { code: 'provider_failed', sourceId, message } };
  }

  const sourceRequests: SurfaceSourceRequest[] = $derived.by(() => {
    if (!validation.ok) return [];
    const accessControl = adminContext.accessControlProvider;
    const scope = sessionIdentity;
    return validation.value.dataSources.map((source): SurfaceSourceRequest => {
      const resourcePolicy = Object.hasOwn(policy.resources, source.resource) ? policy.resources[source.resource] : undefined;
      if (!resourcePolicy) throw new Error(`Resource "${source.resource}" is not allowed`);
      const snapshot = snapshotSurfaceSource(source, resourcePolicy);
      let provider: SurfaceDataProvider | undefined;
      let providerFailure: unknown;
      try {
        provider = dataProvider ?? adminContext.getDataProviderForResource(source.resource);
      } catch (failure) { providerFailure = failure; }
      const identity = [snapshot.key, provider, provider?.getList, provider?.getOne, ...scope];
      const isCurrent = () => !destroyed && sourceRequests.some((request) =>
        request.id === snapshot.source.id && sameSourceIdentity(request.identity, identity));
      return {
        id: snapshot.source.id, identity, isCurrent,
        async load(isRequestCurrent) {
          if (!provider) return providerError(snapshot.source.id, providerFailure);
          try {
            return await loadSurfaceSource({
              source: snapshot.source, resourcePolicy: snapshot.resourcePolicy, provider,
              async authorize(resource, action) {
                if (!isRequestCurrent()) return { can: false };
                // 授权检查与缓存身份必须使用同一个所属上下文，不能回退到无关全局授权。
                const meta = adminContext.getProviderMeta(resource);
                const decision = accessControl
                  ? await accessControl.can({ resource, action, ...(meta === undefined ? {} : { meta }) })
                  : { can: true };
                return isRequestCurrent() ? decision : { can: false };
              },
            });
          } catch (failure) { return providerError(snapshot.source.id, failure); }
        },
      };
    });
  });

  export async function refresh(sourceId?: string): Promise<void> {
    if (!validation.ok) { sourceCache.clear(); return; }
    await untrack(() => sourceCache.reconcile(sourceRequests, sourceId ?? true));
  }

  $effect.pre(() => {
    const validatedSpec = validation;
    const requests = sourceRequests;
    const scope = sessionIdentity;
    untrack(() => {
      if (!sameSourceIdentity(previousScope, scope)) {
        previousScope = [...scope];
        widgetScopeRevision += 1;
      }
      if (!validatedSpec.ok) {
        sourceCache.clear();
        onError?.({ type: 'validation', issues: validatedSpec.issues });
        return;
      }
      void sourceCache.reconcile(requests);
    });
  });
  onDestroy(() => { destroyed = true; sourceCache.dispose(); });
</script>

{#if validation.ok}
  <section class="surface {className}" aria-labelledby="surface-{validation.value.surfaceId}-title" data-surface-id={validation.value.surfaceId}>
    <header class="surface-header"><h2 id="surface-{validation.value.surfaceId}-title">{validation.value.title}</h2></header>
    <div class="surface-grid surface-gap-{validation.value.layout.gap ?? 'md'}">
      {#key widgetScopeRevision}
        {#each validation.value.widgets as widget (widget.id)}
          {@const registration = widgetRegistrations.get(widget.type)}
          {@const WidgetComponent = registration?.component}
          {@const semantic = registration?.presentation === 'surface-appearance/v1'}
          <div class="surface-widget surface-span-{widget.placement?.columnSpan ?? 12} {semantic ? appearanceClasses(widget.props) : ''}" data-testid="surface-widget-{widget.id}">
            {#if WidgetComponent}
              <WidgetComponent widgetId={widget.id} props={semantic ? withoutSurfaceAppearance(widget.props) : widget.props}
                data={resolveSurfaceSourceData(widget, widget.binding ? sourceStates.get(widget.binding.sourceId) : undefined)}
                locale={activeLocale} messages={activeMessages} />
            {/if}
          </div>
        {/each}
      {/key}
    </div>
  </section>
{:else}
  <section class="surface-error {className}" role="alert" data-surface-error>
    <h2>{activeMessages.renderErrorTitle}</h2>
    <ul>{#each validation.issues as issue, issueIndex (`${issue.code}:${issue.path}:${issueIndex}`)}
      <li><code>{issue.code}</code>: {issue.message}</li>
    {/each}</ul>
  </section>
{/if}

<style>
  .surface, .surface-error { width: 100%; min-width: 0; }
  .surface-header { margin-bottom: 1rem; }
  .surface-header h2, .surface-error h2 { margin: 0; color: var(--foreground); font-size: clamp(1.25rem, 2vw, 1.75rem); line-height: 1.2; }
  .surface-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .surface-gap-sm { gap: 0.5rem; }
  .surface-gap-md { gap: 1rem; }
  .surface-gap-lg { gap: 1.5rem; }
  .surface-widget { grid-column: 1 / -1; min-width: 0; }
  .surface-appearance { border-block: 1px solid var(--border); border-inline-end: 1px solid var(--border); border-inline-start-style: solid; border-radius: 0.75rem; background: var(--card); }
  .surface-error { padding: 1rem; border: 1px solid var(--destructive); border-radius: 0.75rem; background: var(--card); color: var(--destructive); }
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
