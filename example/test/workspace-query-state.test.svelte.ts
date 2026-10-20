import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkspaceQueryState from '../src/workspace/WorkspaceQueryState.svelte';

afterEach(cleanup);

const children = createRawSnippet(() => ({
  render: () => '<p data-query-content>Loaded records</p>',
}));

function query(overrides: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
  return {
    isLoading: false,
    isError: false,
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
    expect(filtered.getByText('Loaded records')).toBeTruthy();
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
