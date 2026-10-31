import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkspaceQueryState from '../src/workspace/WorkspaceQueryState.svelte';

afterEach(cleanup);

const children = createRawSnippet(() => ({
  render: () => '<p data-query-content>Loaded records</p>',
}));

function query(overrides: Partial<{ isLoading: boolean; isError: boolean; isFetching: boolean }> = {}) {
  return {
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('WorkspaceQueryState', () => {
  it('distinguishes an initial empty result from a filtered empty result', () => {
    const initial = render(WorkspaceQueryState, {
      query: query(),
      count: 0,
      children,
    });
    expect(initial.container.querySelector('[data-svadmin-data-state="empty"]')).toBeTruthy();
    expect(initial.container.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeNull();
    initial.unmount();

    const filtered = render(WorkspaceQueryState, {
      query: query(),
      count: 0,
      hasActiveFilters: true,
      children,
    });
    expect(filtered.container.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeTruthy();
    expect(filtered.container.querySelector('[data-svadmin-data-state="empty"]')).toBeNull();
    expect(filtered.queryByText('Loaded records')).toBeNull();

    const filteredAction = createRawSnippet(() => ({
      render: () => '<button type="button">View all tasks</button>',
    }));
    const recoverable = render(WorkspaceQueryState, {
      query: query(),
      count: 0,
      hasActiveFilters: true,
      filteredEmptyAction: filteredAction,
      children,
    });
    expect(recoverable.getByRole('button', { name: 'View all tasks' })).toBeTruthy();

    const loaded = render(WorkspaceQueryState, {
      query: query(),
      count: 1,
      children,
    });
    expect(loaded.getByText('Loaded records')).toBeTruthy();

    const uncounted = render(WorkspaceQueryState, {
      query: query(),
      children,
    });
    expect(uncounted.container.querySelector('[data-query-content]')).toBeTruthy();
  });

  it('keeps loaded content visible while a background refresh is pending', () => {
    const view = render(WorkspaceQueryState, {
      query: query({ isFetching: true }),
      count: 1,
      children,
    });

    expect(view.getByText('Loaded records')).toBeTruthy();
    const status = view.container.querySelector('[data-svadmin-data-state="refreshing"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(view.queryByText('Refreshing…')).toBeTruthy();
  });

  it('keeps query errors recoverable and does not render stale content', () => {
    const refetch = vi.fn();
    const view = render(WorkspaceQueryState, {
      query: query({ isError: true, refetch }),
      children,
    });

    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByText('Loaded records')).toBeNull();
    view.getByRole('button', { name: /retry/i }).click();
    expect(refetch).toHaveBeenCalledOnce();
  });
});
