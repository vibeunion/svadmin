<script lang="ts">
  import { onMount } from 'svelte';
  import { connectPanelChannel, type PanelChannel } from 'devframe/in-page-channel';
  import {
    SVADMIN_DEVFRAME_CHANNEL,
    type DevtoolsQuerySelector,
    type SvadminDevframeProtocol,
    type SvadminDevtoolsSnapshot,
  } from '../devtools-bridge.js';

  let channel = $state<PanelChannel<SvadminDevframeProtocol> | null>(null);
  let snapshot = $state<SvadminDevtoolsSnapshot | null>(null);
  let status = $state('connecting');
  let busy = $state(false);
  let selectedProvider = $state('');
  let selectedResource = $state('');
  let selectedOperation = $state('');

  const selector = $derived<DevtoolsQuerySelector>({
    ...(selectedProvider ? { provider: selectedProvider } : {}),
    ...(selectedResource ? { resource: selectedResource } : {}),
    ...(selectedOperation ? { operation: selectedOperation } : {}),
  });

  async function run(action: (selector?: DevtoolsQuerySelector) => Promise<void> | void): Promise<void> {
    if (!channel || !snapshot) return;
    busy = true;
    try {
      await action(Object.keys(selector).length > 0 ? selector : undefined);
      snapshot = await channel.call('getSnapshot');
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    const nextChannel = connectPanelChannel<SvadminDevframeProtocol>({
      name: SVADMIN_DEVFRAME_CHANNEL,
      functions: {},
    });
    channel = nextChannel;
    status = nextChannel.status;
    const onStatus = () => {
      status = nextChannel.status;
      if (nextChannel.status === 'connected') {
        void nextChannel.call('getSnapshot').then((next) => { snapshot = next; });
      }
    };
    nextChannel.events.on('status:updated', onStatus);
    onStatus();
    return () => nextChannel.close();
  });

  function unique(values: string[]): string[] {
    return [...new Set(values)].sort();
  }
</script>

<section aria-label="svadmin Devframe panel">
  <header>
    <strong>svadmin DevTools</strong>
    <span>{status}</span>
  </header>

  {#if snapshot}
    <dl>
      <div><dt>Route</dt><dd>{snapshot.route}</dd></div>
      <div><dt>Resources</dt><dd>{snapshot.resourceCount}</dd></div>
      <div><dt>Queries</dt><dd>{snapshot.cache.queries.total}</dd></div>
      <div><dt>Mutations</dt><dd>{snapshot.cache.mutations.total}</dd></div>
    </dl>
    <div>
      <label>
        Provider
        <select bind:value={selectedProvider}>
          <option value="">All</option>
          {#each unique(snapshot.queries.map((query) => query.provider)) as provider (provider)}
            <option value={provider}>{provider}</option>
          {/each}
        </select>
      </label>
      <label>
        Resource
        <select bind:value={selectedResource}>
          <option value="">All</option>
          {#each unique(snapshot.queries.map((query) => query.resource)) as resource (resource)}
            <option value={resource}>{resource}</option>
          {/each}
        </select>
      </label>
      <label>
        Operation
        <select bind:value={selectedOperation}>
          <option value="">All</option>
          {#each unique(snapshot.queries.map((query) => query.operation)) as operation (operation)}
            <option value={operation}>{operation}</option>
          {/each}
        </select>
      </label>
    </div>
    {#if snapshot.queries.length > 0}
      <ul>
        {#each snapshot.queries as query (`${query.provider}:${query.resource}:${query.operation}`)}
          <li>
            <strong>{query.provider} / {query.resource}</strong>
            <span>{query.operation} · {query.status} · {query.duration}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <div>
      <button type="button" disabled={busy} onclick={() => run((selector) => channel?.call('cacheInvalidate', selector))}>Invalidate</button>
      <button type="button" disabled={busy} onclick={() => run((selector) => channel?.call('cacheRefetch', selector))}>Refetch</button>
      <button type="button" disabled={busy} onclick={() => run((selector) => channel?.call('cacheCancel', selector))}>Cancel</button>
      <button type="button" disabled={busy} onclick={() => run((selector) => channel?.call('cacheReset', selector))}>Reset</button>
      <button type="button" disabled={busy} onclick={() => run((selector) => channel?.call('cacheRemove', selector))}>Remove</button>
      <button type="button" disabled={busy} onclick={() => run(() => channel?.call('cacheClear'))}>Clear cache</button>
      <button type="button" disabled={busy} onclick={() => run(() => channel?.call('clearMutations'))}>Clear mutations</button>
    </div>
  {:else}
    <p>Waiting for an svadmin page.</p>
  {/if}
</section>
