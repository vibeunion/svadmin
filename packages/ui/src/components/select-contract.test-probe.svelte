<script lang="ts">
  import { useSelect, useResourceContract } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { selectOptionValue } from '../../../core/src/select-options';
  import { useLogin, useLogout } from '../../../core/src/auth-hooks.svelte';
  import { extendReactiveMembers } from '../../../core/src/reactive-projection';
  import type { BaseRecord } from '@svadmin/core';
  import type { SelectSettings, SelectState } from './select-contract.test.types';

  let { resource, settings, onReady }: {
    resource: string;
    settings: SelectSettings;
    onReady: (value: SelectState) => void;
  } = $props();
  const binding = useResourceContract(() => resource);
  const id = (row: BaseRecord) => selectOptionValue(row['id']);
  const select = useSelect(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return settings.dataProviderName ?? binding.dataProviderName; },
    get optionLabel() { return settings.optionLabel ?? 'title'; },
    get optionValue() { return settings.optionValue ?? id; },
    get filters() { return settings.filters; },
    get sorters() { return settings.sorters; },
    get pagination() { return settings.pagination; },
    get fetchSize() { return settings.fetchSize; },
    get defaultValue() { return settings.defaultValue; },
    get meta() { return settings.meta; },
    get onSearch() { return settings.onSearch; },
    get debounce() { return settings.debounce ?? 0; },
    get queryOptions() { return settings.queryOptions; },
    get defaultValueQueryOptions() { return settings.defaultValueQueryOptions; },
    get successNotification() { return settings.successNotification; },
    get errorNotification() { return settings.errorNotification; },
  }));
  const login = useLogin({ successNotification: false, errorNotification: false });
  const logout = useLogout();
  const result = extendReactiveMembers(select, { login, logout });
  $effect(() => onReady(result));
</script>
