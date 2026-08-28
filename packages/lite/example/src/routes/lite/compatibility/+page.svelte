<script lang="ts">
  import {
    LITE_COMPATIBILITY_CATALOG,
    LiteCapabilityBoundary,
    LiteClipboardFallback,
    LiteComputeFallback,
    LiteDirectoryUpload,
    LiteOrderedList,
    LiteRealtimeStatus,
    LiteVisualFallback,
  } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();

  const flowRows = [
    { id: 'start', label: 'Start', next: 'review' },
    { id: 'review', label: 'Review', next: 'approved' },
    { id: 'approved', label: 'Approved', next: '-' },
  ];
</script>

<svelte:head>
  <title>Lite compatibility</title>
</svelte:head>

<div class="lite-page">
  <div class="lite-page-header">
    <div>
      <h1 class="lite-page-title">Compatibility Fallbacks</h1>
      <p class="lite-muted">The modern SPA remains unchanged. This route is the IE11-safe server-rendered contract.</p>
    </div>
    <a class="lite-btn" href="/lite">Back to dashboard</a>
  </div>

  {#if form?.success}
    <div class="lite-alert lite-alert-success">Server fallback action completed.</div>
  {/if}

  <div class="lite-card">
    <h2>Capability catalog</h2>
    <p class="lite-muted">Every browser-only enhancement has a readable server operation or static representation.</p>
    <div class="lite-table-scroll">
      <table class="lite-table">
        <thead><tr><th>Capability</th><th>Fallback</th><th>Optional enhancement</th></tr></thead>
        <tbody>
          {#each LITE_COMPATIBILITY_CATALOG as item (item.capability)}
            <tr><td><code>{item.capability}</code></td><td>{item.fallback}</td><td>{item.enhancement}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <LiteCapabilityBoundary
    capability="websocket"
    title="WebSocket / SSE"
    description="Realtime is an enhancement, not a correctness dependency."
  />

  <LiteVisualFallback
    title="Canvas / WebGL / Flow UI"
    description="A structured table remains available when a canvas runtime cannot load."
    columns={[{ key: 'id', label: 'Node' }, { key: 'label', label: 'Label' }, { key: 'next', label: 'Next' }]}
    rows={flowRows}
    downloadHref="/lite/compatibility/flow.json"
  />

  <LiteComputeFallback
    title="WASM / Worker"
    description="The same business task can run through a native server POST."
    action="?/compute"
    values={{ task: 'rebuild-index' }}
    downloadHref="/lite/compatibility/result.json"
  />

  <form method="POST" action="?/upload" enctype="multipart/form-data" class="lite-card">
    <LiteDirectoryUpload name="directoryFiles" zipName="directoryArchive" />
    <button type="submit" class="lite-btn lite-btn-primary" style="margin-top: 12px;">Upload selection</button>
  </form>

  <LiteOrderedList
    title="Drag-and-drop ordering fallback"
    action="?/move"
    items={[
      { id: 'one', label: 'First step', description: 'The first item cannot move up.' },
      { id: 'two', label: 'Second step', description: 'Move with ordinary POST actions.' },
      { id: 'three', label: 'Third step' },
    ]}
  />

  <LiteClipboardFallback value="https://admin.example/reports/123" />

  <LiteRealtimeStatus
    title="Server snapshot"
    status="Fallback"
    lastUpdated="2026-08-28 00:00"
    refreshHref="/lite/compatibility"
    refreshSeconds={0}
  />
</div>
