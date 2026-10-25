import { cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from './autocomplete.test-host.svelte';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const resources: ResourceDefinition[] = [{ name: 'posts', label: 'Posts', fields: [], contract: posts }];
const clients: QueryClient[] = [];
const catalog = [
  { id: 1, title: 'Record One' },
  { id: 2, title: 'Record Two' },
  { id: 3, title: 'Record Three' },
];

function provider(getList?: DataProvider['getList']): DataProvider {
  return {
    getList: getList ?? vi.fn(async ({ filters }) => {
      const term = filters?.[0]?.value;
      const matched = typeof term === 'string'
        ? catalog.filter(record => record.title.toLowerCase().includes(term.toLowerCase())) : catalog;
      return { data: matched, total: matched.length };
    }),
    getMany: vi.fn(async ({ ids }) => ({
      data: ids.map((id: string | number) => catalog.find(record => record.id === Number(id)) ?? { id: Number(id), title: `Selected ${id}` }),
    })),
    getOne: async ({ id }) => ({ data: { id: Number(id), title: `Selected ${id}` } }),
    getApiUrl: () => '/api',
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
}

function mount(options: {
  value?: string | number | null;
  onchange?: (value: string | number | null) => void;
  fetchSize?: number;
  requestTimeout?: number;
  debounce?: number;
  disabled?: boolean;
  placeholder?: string;
} = {}, overrides: Partial<DataProvider> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(queryClient);
  return render(Host, {
    provider: { ...provider(), ...overrides }, resources, queryClient, ...options,
  });
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('AutoComplete', () => {
  it('searches as the user types and echoes the selected label', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange, debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.input(input, { target: { value: 'Two' } });
    const option = await view.findByRole('option', { name: 'Record Two' });
    await fireEvent.click(option);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(2);
    expect(input).toHaveProperty('value', 'Record Two');
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('loads the label for a controlled value without opening the menu', async () => {
    const getMany = vi.fn(async () => ({ data: [{ id: 2, title: 'Record Two' }] }));
    const view = mount({ value: 2 }, { getMany });
    const input = view.getByRole('combobox', { name: 'Record' });
    await waitFor(() => expect(input).toHaveProperty('value', 'Record Two'));
    expect(getMany).toHaveBeenCalledWith(expect.objectContaining({ ids: [2] }));
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('supports keyboard selection and Escape restoration', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange, debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await view.findByRole('option', { name: 'Record One' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(2);
    await fireEvent.focus(input);
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveProperty('value', 'Record Two');
  });

  it('does not pick a visible option while a newer search is still debouncing', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange, debounce: 50 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    const stale = await view.findByRole('option', { name: 'Record One' });
    await fireEvent.input(input, { target: { value: 'Two' } });
    await fireEvent.click(stale);
    expect(onchange).not.toHaveBeenCalled();

    await view.findByRole('option', { name: 'Record Two' });
    await waitFor(() => expect(view.queryByRole('option', { name: 'Record One' })).toBeNull());
    await fireEvent.click(await view.findByRole('option', { name: 'Record Two' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('rejects an invalid request timeout before dispatching a provider request', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: catalog, total: catalog.length }));
    const view = mount({ requestTimeout: 0, debounce: 0 }, { getList });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await view.findByRole('alert');
    expect(getList).not.toHaveBeenCalled();
  });

  it('clears the debounce and aborts an in-flight request when the menu closes', async () => {
    const signals: AbortSignal[] = [];
    const getList = vi.fn<DataProvider['getList']>(async params => {
      const signal = (params as { signal?: AbortSignal }).signal;
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });
    const view = mount({ debounce: 0 }, { getList });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'slow' } });
    await waitFor(() => expect(signals.length).toBeGreaterThan(0));
    await fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(signals.at(-1)?.aborted).toBe(true));
  });

  it('clears a pending debounce so closing cannot dispatch the search later', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: catalog, total: catalog.length }));
    const view = mount({ debounce: 50 }, { getList });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await fireEvent.input(input, { target: { value: 'Three' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    await new Promise<void>(resolve => setTimeout(resolve, 120));
    expect(getList).not.toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'Three' }],
    }));
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it('syncs an externally cleared controlled value while the menu is open', async () => {
    const view = mount({ value: 2 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await waitFor(() => expect(input).toHaveProperty('value', 'Record Two'));
    await fireEvent.focus(input);
    await view.rerender({ value: null });
    await waitFor(() => expect(input).toHaveProperty('value', ''));
  });

  it('clears the selected value with a public null callback', async () => {
    const onchange = vi.fn();
    const view = mount({ value: 2, onchange });
    const input = view.getByRole('combobox', { name: 'Record' });
    await waitFor(() => expect(input).toHaveProperty('value', 'Record Two'));
    await fireEvent.click(view.getByRole('button', { name: /clear/i }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(null);
    expect(input).toHaveProperty('value', '');
  });

  it('drops an active virtual option that a manual scroll moved out of the rendered window', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: Array.from({ length: 1200 }, (_, index) => ({ id: index, title: `Item ${index}` })),
      total: 1200,
    }));
    const view = mount({ debounce: 0, fetchSize: 200 }, { getList });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await view.findByRole('option', { name: 'Item 0' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).not.toBeNull();
    const list = view.getByRole('listbox');
    list.scrollTop = 1000 * 36;
    await fireEvent.scroll(list);
    await waitFor(() => expect(input.getAttribute('aria-activedescendant')).toBeNull());
    expect(document.querySelector('.autocomplete-option.active')).toBeNull();
  });

  it('keeps normal Home/End caret semantics when option navigation is inactive', async () => {
    const view = mount({ debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
    input.dispatchEvent(home);
    expect(home.defaultPrevented).toBe(false);
  });

  it('aborts timed-out searches without leaking provider errors', async () => {
    const signals: AbortSignal[] = [];
    const getList = vi.fn<DataProvider['getList']>(async params => {
      const signal = (params as { signal?: AbortSignal }).signal;
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });
    const view = mount({ requestTimeout: 20, debounce: 0 }, { getList });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'stalled' } });
    await view.findByRole('alert');
    expect(view.queryByText('PRIVATE')).toBeNull();
    await waitFor(() => expect(signals.at(-1)?.aborted).toBe(true));
  });

  it('replaces a controlled selection directly on the first open', async () => {
    const onchange = vi.fn();
    const view = mount({ value: 2, onchange, debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await waitFor(() => expect(input).toHaveProperty('value', 'Record Two'));
    await fireEvent.focus(input);
    const option = await view.findByRole('option', { name: 'Record One' });
    await fireEvent.click(option);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(1);
    expect(input).toHaveProperty('value', 'Record One');
  });

  it('reopens with normal candidates after a searched selection and replaces it', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange, debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'Two' } });
    await fireEvent.click(await view.findByRole('option', { name: 'Record Two' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(2);

    await fireEvent.focus(input);
    const option = await view.findByRole('option', { name: 'Record One' });
    await fireEvent.click(option);
    expect(onchange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveProperty('value', 'Record One');
  });

  it('restores the selected label after Escape and replaces it on reopen', async () => {
    const onchange = vi.fn();
    const view = mount({ value: 2, onchange, debounce: 0 });
    const input = view.getByRole('combobox', { name: 'Record' });
    await waitFor(() => expect(input).toHaveProperty('value', 'Record Two'));
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'One' } });
    await view.findByRole('option', { name: 'Record One' });
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveProperty('value', 'Record Two');

    await fireEvent.focus(input);
    const option = await view.findByRole('option', { name: 'Record Three' });
    await fireEvent.click(option);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(3);
    expect(input).toHaveProperty('value', 'Record Three');
  });
});