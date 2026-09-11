<script lang="ts">
  import { untrack } from 'svelte';
  import { useList, useOne, useMany, useShow, useTable, useInvalidate } from './strict-hooks.svelte';
  import { useResourceContract } from './resource-binding.svelte';
  import { useLogin, useLogout } from './auth-hooks.svelte';
  import type { NotificationConfig } from './hook-utils.svelte';
  import { definedOptions, definedReactiveOptions } from './defined-options';
  import type { Filter, Sort, Pagination } from './types';
  import type { ReadKind, ReadState } from './query-source.test.types';

  let { kind, resource, id, ids, filters, sorters, pagination, meta, enabled, providerOverride, onReady,
    successNotification, errorNotification }: {
    kind: ReadKind;
    resource: string;
    id: string | number;
    ids: (string | number)[];
    filters: Filter[];
    sorters: Sort[];
    pagination: Pagination;
    meta: Record<string, unknown>;
    enabled: boolean;
    providerOverride: string;
    onReady: (value: ReadState) => void;
    successNotification: NotificationConfig;
    errorNotification: NotificationConfig;
  } = $props();
  const binding = useResourceContract(() => resource);
  function options() {
    return definedOptions({
      resource: binding.resource,
      dataProviderName: providerOverride || binding.dataProviderName,
      meta,
      successNotification, errorNotification,
      queryOptions: { enabled },
    });
  }
  const query = untrack(() => {
    switch (kind) {
      case 'list': return useList(() => ({ ...options(), filters, sorters, pagination }));
      case 'one': return useOne(() => ({ ...options(), id }));
      case 'many': return useMany(() => ({ ...options(), ids }));
      case 'show': return useShow(() => ({ ...options(), id }));
      case 'table': return useTable(() => ({
        ...options(), pagination,
        filters: { permanent: filters }, sorters: { permanent: sorters },
      })).query;
    }
  });
  const invalidate = useInvalidate(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return providerOverride || binding.dataProviderName; },
  }));
  const login = useLogin({ successNotification: false, errorNotification: false });
  const logout = useLogout();
  $effect(() => onReady({ query, invalidate, login, logout }));
</script>
