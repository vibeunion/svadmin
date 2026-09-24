import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceDefinition } from '@svadmin/core';
import ResourceOverview from './ResourceOverview.svelte';

const state = vi.hoisted(() => ({
  resources: [] as ResourceDefinition[],
  denied: new Set<string>(),
  loading: false,
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@svadmin/core', async original => ({
  ...await original<typeof import('@svadmin/core')>(),
  captureAdminContext: () => ({ get resources() { return state.resources; } }),
  useNavigation: () => ({ list: state.list, create: state.create }),
  useCan: (get: () => { resource: string; action: string }) => ({
    get allowed() { const query = get(); return !state.denied.has(`${query.resource}:${query.action}`); },
    get isLoading() { return state.loading; },
  }),
}));

beforeEach(() => {
  state.resources = [
    { name: 'posts', label: 'Posts', fields: [] },
    { name: 'users', label: 'Users', fields: [], canCreate: false },
    { name: 'hidden', label: 'Hidden', fields: [], showInMenu: false },
    { name: 'nested', label: 'Nested', fields: [], parentName: 'posts' },
  ];
  state.denied.clear();
  state.loading = false;
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('resource overview', () => {
  it('uses the public resource definitions and real navigation, not fabricated metrics', async () => {
    const view = render(ResourceOverview, { title: 'Workspace' });
    expect(view.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(view.queryByText('Hidden')).toBeNull();
    expect(view.queryByText('Nested')).toBeNull();
    const posts = within(view.getByRole('region', { name: 'Posts' }));
    await fireEvent.click(posts.getByRole('button', { name: /view all/i }));
    await fireEvent.click(posts.getByRole('button', { name: /create/i }));
    expect(state.list).toHaveBeenCalledWith('posts');
    expect(state.create).toHaveBeenCalledWith('posts');
    expect(within(view.getByRole('region', { name: 'Users' })).queryByRole('button', { name: /create/i })).toBeNull();
  });

  it('does not offer actions before permission resolution or after denial', () => {
    state.denied.add('posts:list');
    state.denied.add('users:create');
    const view = render(ResourceOverview);
    expect(within(view.getByRole('region', { name: 'Posts' })).queryByRole('button')).toBeNull();
    expect(view.getByRole('alert')).toBeTruthy();
    cleanup();
    state.loading = true;
    const pending = render(ResourceOverview);
    expect(pending.queryByRole('button')).toBeNull();
  });

  it('renders an empty state when no top-level resources are visible', () => {
    state.resources = [];
    const view = render(ResourceOverview);
    expect(view.getByRole('status')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });
});
