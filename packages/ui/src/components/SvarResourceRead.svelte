<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { useResourceContract, useList, type Filter, type Sort } from '@svadmin/core';
  import { snapshotSvarRecords, SvarLoadCancelled, type SvarWindowPage } from './svar-grid-loading.js';

  /** Internal worker: requests use the same contract, Provider, tenant and query cache as the resource table. */
  export interface SvarResourceReadRequest {
    readonly resourceName: string;
    readonly dataScopeKey: string | number;
    readonly primaryKey: string;
    readonly childrenKey?: string;
    readonly pagination: { current: number; pageSize: number };
    readonly sorters: Sort[];
    readonly filters: Filter[];
    readonly resolve: (page: SvarWindowPage) => void;
    readonly reject: (error: unknown) => void;
  }

  let { request }: { request: SvarResourceReadRequest } = $props();
  const binding = useResourceContract(() => request.resourceName);
  const query = useList({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get pagination() { return request.pagination; },
    get sorters() { return request.sorters; },
    get filters() { return request.filters; },
    get meta() { return { svadminSvarScope: request.dataScopeKey }; },
    queryOptions: { refetchOnWindowFocus: false },
  });
  let settled = false;
  onDestroy(() => {
    if (!settled) { settled = true; request.reject(new SvarLoadCancelled()); }
  });
  $effect(() => {
    const failed = query.isError;
    const failure = query.error;
    const fetching = query.isFetching;
    const data = query.data;
    untrack(() => {
      if (settled || fetching) return;
      if (failed) { settled = true; request.reject(failure); return; }
      if (!data) return;
      try {
        if (!Number.isSafeInteger(data.total) || data.total < 0 || data.total > 10_000_000) throw new Error('Invalid resource total');
        const page = { data: snapshotSvarRecords(data.data, request.primaryKey, request.childrenKey), total: data.total };
        settled = true; request.resolve(page);
      } catch (error) { settled = true; request.reject(error); }
    });
  });
</script>
