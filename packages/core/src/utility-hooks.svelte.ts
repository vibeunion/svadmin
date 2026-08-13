import { useForm, type UseFormOptions } from './form-hooks.svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import { useParsed } from './useParsed.svelte';
import { captureAdminContext } from './context.svelte';
import { dataQueryMatches } from './query-keys';
import { getAdminOptions } from './options.svelte';
import { t } from './i18n.svelte';
import type { BaseRecord, HttpError, Filter, KnownResources, ResourceDefinition } from './types';
import { useList } from './query-hooks.svelte';
import { toast } from './toast.svelte';
import type { UseSelectOptions } from './hooks.svelte';
import { useSelect as useSelectImpl } from './hooks.svelte';

// ─── useModal ─────────────────────────────────────────────────
export function useModal(options?: { defaultVisible?: boolean }) {
  let visible = $state(options?.defaultVisible ?? false);
  return {
    get visible() { return visible; },
    show() { visible = true; },
    close() { visible = false; },
  };
}

// ─── useModalForm ─────────────────────────────────────────────

export interface UseModalFormOptions<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
> extends UseFormOptions<TVariables, TData, TError> {
  defaultVisible?: boolean;
  autoSave?: UseFormOptions<TVariables, TData, TError>['autoSave'] & {
    invalidateOnClose?: boolean;
  };
}

export function useModalForm<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
>(options: UseModalFormOptions<TVariables, TData, TError> = {} as UseModalFormOptions<TVariables, TData, TError>) {
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();
  const formState = useForm<TVariables, TData, TError>(options);
  let visible = $state(options.defaultVisible ?? false);

  function show(id?: string | number) {
    if (id !== undefined) {
      formState.setAction('edit');
      formState.setId(id);
    } else {
      formState.setAction('create');
      formState.setId(undefined);
    }
    visible = true;
  }

  function close() {
    visible = false;
    formState.reset();
    if (options.autoSave?.invalidateOnClose) {
      const resource = formState.resource;
      const matcher = adminContext.queryKeyMatcher(resource, options.dataProviderName);
      queryClient.invalidateQueries({
        predicate: (q) => dataQueryMatches(q.queryKey, { ...matcher, resource }),
      });
    }
  }

  return {
    get visible() { return visible; },
    show,
    close,
    get modalProps() { return { visible, close }; },
    formState,
  };
}

export const useDrawerForm = useModalForm; // Alias for UI variations

// ─── useMenu ──────────────────────────────────────────────────

export interface MenuConfig {
  name: string;
  route: string;
  label: string;
  icon?: string;
  parentName?: string;
  order?: number;
}

export function useMenu() {
  const adminContext = captureAdminContext();
  const parsed = useParsed();

  const menuItems = $derived.by<MenuConfig[]>(() => {
    const adminOptions = getAdminOptions();
    const resources = adminContext.resources;
    let items: MenuConfig[] = resources
      .filter((r: ResourceDefinition) => r.showInMenu !== false)
      .map((r: ResourceDefinition): MenuConfig => ({
        name: r.name,
        route: `/${r.name}`,
        label: r.label || r.name, // Usually handled by i18n label mapping
        icon: r.icon,
        parentName: r.parentName,
        order: r.menuOrder ?? 999,
      }));

    if (adminOptions.menuItems) items = adminOptions.menuItems(items);
    items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return items;
  });

  return {
    get menuItems() { return menuItems; },
    get selectedKey() { return parsed.resource ?? '/'; },
  };
}

// ─── useBreadcrumb ────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

export function useBreadcrumb() {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  
  const items = $derived.by<BreadcrumbItem[]>(() => {
    const list: BreadcrumbItem[] = [];
    if (!parsed.resource) return list;

    try {
      const res = adminContext.getResource(parsed.resource);
      const chain: { label: string; link: string; icon?: string }[] = [];
      let current: typeof res | undefined = res;
      const visited = new Set<string>();
      while (current) {
        if (visited.has(current.name)) break;
        visited.add(current.name);
        chain.unshift({ label: current.label || current.name, link: `/${current.name}`, icon: current.icon });
        current = current.parentName ? adminContext.getResource(current.parentName) : undefined;
      }
      list.push(...chain);

      if (parsed.action === 'create') {
        list.push({ label: t('common.create') });
      } else if (parsed.action === 'edit' && parsed.id) {
        list.push({ label: t('common.edit') });
        list.push({ label: String(parsed.id) });
      } else if (parsed.action === 'show' && parsed.id) {
        list.push({ label: t('common.show') });
        list.push({ label: String(parsed.id) });
      }
    } catch {
      // Ignored
    }
    return list;
  });

  return { get items() { return items; } };
}

// ─── useRelation ───────────────────────────────────────────

export interface UseRelationOptions<_TData extends BaseRecord = BaseRecord, _TError = HttpError> {
  resource: KnownResources;
  id?: string | number;
  pagination?: { current?: number; pageSize?: number };
  sorters?: { field: string; order: 'asc' | 'desc' }[];
  filters?: Filter[];
  queryOptions?: { enabled?: boolean; staleTime?: number };
}

export function useRelation<TData extends BaseRecord = BaseRecord, TError = HttpError>(options: UseRelationOptions<TData, TError>) {
  return useList<TData, TError>({
    ...options
  });
}

// ─── useNotification ────────────────────────────────────────
export function useNotification() {
  const adminContext = captureAdminContext();

  function sendToast(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    duration?: number,
    options?: { key?: string },
  ): void {
    const provider = adminContext.notificationProvider;
    if (provider) {
      provider.open({ type, message, key: options?.key });
      return;
    }
    toast[type](message, duration, options);
  }

  return {
    open: (message: string, duration?: number, options?: { key?: string }) =>
      sendToast('info', message, duration, options),
    success: (message: string, duration?: number, options?: { key?: string }) =>
      sendToast('success', message, duration, options),
    error: (message: string, duration?: number, options?: { key?: string }) =>
      sendToast('error', message, duration, options),
    warning: (message: string, duration?: number, options?: { key?: string }) =>
      sendToast('warning', message, duration, options),
    close: (key: string) => adminContext.notificationProvider?.close(key),
  };
}

// ─── Field-specific hooks (refine-compatible) ─────────────────────
// useCheckboxGroup / useRadioGroup / useAutocomplete are convenience
// wrappers around useSelect for common form field patterns.

export interface UseCheckboxGroupOptions<TData extends BaseRecord = BaseRecord> extends Omit<UseSelectOptions<TData>, 'optionLabel' | 'optionValue' | 'defaultValue'> {
  /** Field on the record used as the option label (default: 'title') */
  optionLabel?: string | ((item: TData) => string);
  /** Field on the record used as the checkbox value (default: 'id') */
  optionValue?: string | ((item: TData) => string | number);
  /** Currently selected values — controlled mode */
  defaultValue?: (string | number)[];
}

/**
 * useCheckboxGroup — multi-select field state backed by a resource query.
 * Provides a list of checkbox options plus helpers to toggle individual values.
 */
export function useCheckboxGroup<TData extends BaseRecord = BaseRecord>(options: UseCheckboxGroupOptions<TData>) {
  const select = useSelectImpl<TData>(options);
  let selected = $state<(string | number)[]>(options.defaultValue ?? []);

  function toggle(value: string | number) {
    const idx = selected.findIndex(v => String(v) === String(value));
    if (idx >= 0) {
      selected = selected.filter(v => String(v) !== String(value));
    } else {
      selected = [...selected, value];
    }
  }

  function isSelected(value: string | number): boolean {
    return selected.some(v => String(v) === String(value));
  }

  return {
    query: select.query,
    get options() { return select.options; },
    onSearchChange: select.onSearchChange,
    get selected() { return selected; },
    toggle,
    isSelected,
    setSelected: (values: (string | number)[]) => { selected = values; },
  };
}

export interface UseRadioGroupOptions<TData extends BaseRecord = BaseRecord> extends Omit<UseSelectOptions<TData>, 'optionLabel' | 'optionValue' | 'defaultValue'> {
  optionLabel?: string | ((item: TData) => string);
  optionValue?: string | ((item: TData) => string | number);
  defaultValue?: string | number;
}

/**
 * useRadioGroup — single-select field state backed by a resource query.
 * Provides a list of radio options plus a setter for the currently selected value.
 */
export function useRadioGroup<TData extends BaseRecord = BaseRecord>(options: UseRadioGroupOptions<TData>) {
  const { defaultValue: _dv, ...selectOpts } = options;
  // useSelect 的 defaultValue 是数组类型；透传单值以便远程选项回填当前已选值
  const select = useSelectImpl<TData>({
    ...selectOpts,
    defaultValue: _dv !== undefined ? [_dv] : [],
  });
  let value = $state<string | number | undefined>(_dv);

  return {
    query: select.query,
    get options() { return select.options; },
    onSearchChange: select.onSearchChange,
    get value() { return value; },
    setValue: (v: string | number) => { value = v; },
  };
}

export interface UseAutocompleteOptions<TData extends BaseRecord = BaseRecord> extends Omit<UseSelectOptions<TData>, 'onSearch' | 'defaultValue'> {
  optionLabel?: string | ((item: TData) => string);
  optionValue?: string | ((item: TData) => string | number);
  /** Field name to search against (default: optionLabel) */
  searchField?: string;
  defaultValue?: string | number;
}

/**
 * useAutocomplete — typeahead search field backed by a resource query.
 * Builds a 'contains' filter on the search field and debounces input.
 */
export function useAutocomplete<TData extends BaseRecord = BaseRecord>(options: UseAutocompleteOptions<TData>) {
  const { searchField, defaultValue: _dv, ...selectOpts } = options;
  const labelField = typeof options.optionLabel === 'string' ? options.optionLabel : 'title';

  const select = useSelectImpl<TData>({
    ...selectOpts,
    defaultValue: _dv !== undefined ? [_dv] : [],
    onSearch: (term) => [{
      field: searchField ?? labelField,
      operator: 'contains' as const,
      value: term,
    }],
  });
  let value = $state<string | number | undefined>(_dv);

  return {
    query: select.query,
    get options() { return select.options; },
    onSearchChange: select.onSearchChange,
    get value() { return value; },
    setValue: (v: string | number) => { value = v; },
  };
}
