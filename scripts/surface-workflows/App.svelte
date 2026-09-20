<script lang="ts">
  import { createStreamingParser } from '@surface-openui-fixture';
  import { SurfaceRenderer } from '../../packages/surface/src/svelte.js';
  import { createInteractiveSurfaceCatalog, SurfaceWorkflowProvider } from '../../packages/surface/src/interactive.js';
  import { createBusinessSurfaceCatalog } from '../../packages/surface/src/business.js';
  import { defaultSurfaceCatalog } from '../../packages/surface/src/catalog.js';
  import { createSurfaceOpenUIStream } from '../../packages/surface/src/openui.js';
  import type { SurfaceSpec, SurfaceDataProvider } from '../../packages/surface/src/types.js';
  import type { SurfaceWorkflowTransport } from '../../packages/surface/src/workflows/client.js';
  import '@svadmin/ui/app.css';
  import '../../packages/surface/src/styles.css';
  import { actionDescriptor, policy, firstChunk, lastChunk, businessFirstChunk, businessLastChunk } from './fixture.js';
  const actions = [actionDescriptor];
  const catalog = createInteractiveSurfaceCatalog(actions, createBusinessSurfaceCatalog(defaultSurfaceCatalog));
  const business = new URLSearchParams(location.search).has('business');
  let spec = $state<SurfaceSpec | null>(null);
  let enabled = $state(false), complete = $state(false), revision = $state(0), scopeKey = $state('tenant-a');
  let error = $state(''), notice = $state('No model is invoked. This fixture streams a deterministic test program through the real parser.');
  let renderer = $state<{ refresh(sourceId?: string): Promise<void> }>();
  let stream: ReturnType<typeof createSurfaceOpenUIStream>;
  async function rpc(operation: string, input: unknown = {}, signal?: AbortSignal) {
    const response = await fetch('/__workflow', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-tenant': scopeKey }, body: JSON.stringify({ operation, input }), signal });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  }
  const transport: SurfaceWorkflowTransport = {
    propose: (input, signal) => rpc('propose', input, signal), inspect: (id, signal) => rpc('inspect', { id }, signal),
    approve: (id, digest, signal) => rpc('approve', { id, digest }, signal), reject: (id, digest, signal) => rpc('reject', { id, digest }, signal),
    execute: (id, digest, signal) => rpc('execute', { id, digest }, signal),
  };
  const provider: SurfaceDataProvider = { getList: (params) => rpc(params.resource === 'events' ? 'events' : 'list'), getOne: (params) => rpc('one', { resource: params.resource, id: params.id }) };
  function start() {
    enabled = false; complete = false; error = '';
    stream = createSurfaceOpenUIStream({ catalog, policy, createStreamingParser });
    const result = stream.push(business ? businessFirstChunk : firstChunk);
    if (!result.ok) { error = result.error.message; spec = null; return; }
    spec = result.preview; notice = 'Streaming: incomplete program; business actions disabled';
  }
  function finish() {
    const pushed = stream.push(business ? businessLastChunk : lastChunk); const result = pushed.ok ? stream.finish() : pushed;
    if (!result.ok) { error = result.error.message; spec = null; return; }
    spec = result.preview; complete = true; notice = 'Complete validated proposal; explicit acceptance required';
  }
  async function accept() {
    if (!complete || !spec) return;
    try {
      const current = await rpc('state');
      const saved = await rpc('save', { spec: $state.snapshot(spec), expectedRevision: current.revision });
      revision = saved.revision; enabled = true; notice = 'Accepted; submission, confirmation and execution remain separate';
    } catch (failure) { error = String(failure); }
  }
  function presentationEdit() {
    if (!spec) return;
    spec = { ...spec, title: 'Rearranged contact operations', widgets: spec.widgets.map((widget) => ({ ...widget,
      props: { ...widget.props, appearance: { tone: 'warning', density: 'comfortable' } }, placement: { columnSpan: 12 } })) };
  }
  function forbiddenField() {
    if (!spec) return;
    enabled = false;
    spec = { ...spec, widgets: spec.widgets.map((widget) => widget.type === 'resource-detail'
      ? { ...widget, props: { ...widget.props, fields: [{ field: 'secret', label: 'Secret' }] } } : widget) };
  }
  function switchTenant() { scopeKey = 'tenant-b'; enabled = false; complete = false; spec = null; notice = 'Tenant changed; old drafts and proposals discarded'; }
</script>

<main>
  <h1>Surface workflow acceptance</h1>
  <p data-testid="notice">{notice}</p>
  <nav aria-label="Trusted host controls">
    <button onclick={start}>Receive first chunk</button>
    <button onclick={finish} disabled={!spec || complete}>Finish stream</button>
    <button onclick={accept} disabled={!complete || enabled}>Accept surface</button>
    <button onclick={presentationEdit} disabled={!spec}>Change presentation only</button>
    {#if business}<button onclick={forbiddenField} disabled={!spec}>Request forbidden field</button>{/if}
    <button onclick={switchTenant}>Switch tenant</button>
  </nav>
  {#if error}<p role="alert">{error}</p>{/if}
  <SurfaceWorkflowProvider {actions} {transport} {scopeKey} surfaceId="contacts" {revision} {enabled} onCommitted={() => { void renderer?.refresh('records'); }}>
    {#if spec}<SurfaceRenderer bind:this={renderer} {spec} {catalog} {policy} dataProvider={provider} {scopeKey} locale="en-US" />{/if}
  </SurfaceWorkflowProvider>
</main>

<style>
  :global(body) { margin: 0; font-family: system-ui, sans-serif; background: var(--background, #fff); color: var(--foreground, #222); }
  main { padding: 1.5rem; max-width: 90rem; margin: auto; min-width: 0; }
  nav { display: flex; flex-wrap: wrap; gap: .75rem; margin-block: 1rem 2rem; }
  nav button { padding: .5rem .75rem; font: inherit; }
</style>
