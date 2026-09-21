import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import LazyAutoForm from './LazyAutoForm.svelte';
import LazyAutoTable from './LazyAutoTable.svelte';
import LazyShowPage from './LazyShowPage.svelte';
import LazySettingsPage from './LazySettingsPage.svelte';

vi.mock('./AutoForm.svelte', () => import('../../test/fixtures/LazyCrudProbe.svelte'));
vi.mock('./AutoTable.svelte', () => import('../../test/fixtures/LazyCrudProbe.svelte'));
vi.mock('./ShowPage.svelte', () => import('../../test/fixtures/LazyCrudProbe.svelte'));
vi.mock('./SettingsPage.svelte', () => import('../../test/fixtures/LazyCrudProbe.svelte'));
afterEach(cleanup);

it('forwards form mode, current props, callback and header snippet after loading', async () => {
  const onSuccess = vi.fn();
  const headerContent = createRawSnippet(() => ({ render: () => '<h2>Custom form header</h2>' }));
  const view = render(LazyAutoForm, { resourceName: 'products', id: 1, mode: 'edit', onSuccess, headerContent });
  expect(screen.getByRole('status')).toBeTruthy();
  expect(await screen.findByTestId('crud-props')).toHaveProperty('textContent', 'products:1:edit');
  expect(screen.getByRole('heading', { name: 'Custom form header' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
  expect(onSuccess).toHaveBeenCalledTimes(1);
  await view.rerender({ resourceName: 'orders', id: 2, mode: 'clone', onSuccess, headerContent });
  expect(screen.getByTestId('crud-props')).toHaveProperty('textContent', 'orders:2:clone');
});

it('forwards detail identity and children without changing snippet ownership', async () => {
  const children = createRawSnippet(() => ({ render: () => '<p>Host detail content</p>' }));
  render(LazyShowPage, { resourceName: 'products', id: 'record-7', children });
  expect(await screen.findByTestId('crud-props')).toHaveProperty('textContent', 'products:record-7:');
  expect(screen.getByText('Host detail content')).toBeTruthy();
});

it('forwards the default list resource after its module loads', async () => {
  render(LazyAutoTable, { resourceName: 'products' });
  expect(await screen.findByTestId('crud-props')).toHaveProperty('textContent', 'products::');
});

it('forwards settings providers and host snippets', async () => {
  const profile = createRawSnippet(() => ({ render: () => '<p>Host profile</p>' }));
  const preferencesProvider = {
    description: 'Host preferences',
    load: vi.fn(),
    save: vi.fn(),
  };
  render(LazySettingsPage, { profile, preferencesProvider });
  expect(await screen.findByText('Host preferences')).toBeTruthy();
  expect(screen.getByText('Host profile')).toBeTruthy();
});
