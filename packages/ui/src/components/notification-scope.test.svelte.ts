import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DataProvider, ResourceDefinition } from '@svadmin/core';
import { resetContext } from '@svadmin/core';
import { clearNotifications, createNotificationController, notification } from '../notifications.svelte.js';
import ScopeHost from './notification-scope.test-host.svelte';

const resources = [{ name: 'posts', label: 'Posts', fields: [] }] satisfies ResourceDefinition[];

function createDataProvider(): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: '1' } }),
    create: async () => ({ data: { id: '1' } }),
    update: async () => ({ data: { id: '1' } }),
    deleteOne: async () => ({ data: { id: '1' } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;
}

beforeEach(() => {
  window.location.hash = '#/';
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
  resetContext();
  clearNotifications();
});

afterEach(() => {
  cleanup();
  resetContext();
  clearNotifications();
});

describe('notification ownership', () => {
  it('keeps two controllers from seeing each other', () => {
    const alpha = createNotificationController();
    const beta = createNotificationController();
    alpha.success('Alpha only', undefined, { duration: 0 });
    expect(alpha.items.map((item) => item.title)).toEqual(['Alpha only']);
    expect(beta.items).toEqual([]);
    expect(notification.items.map((item) => item.title)).not.toContain('Alpha only');
  });

  it('does not share notifications between two AdminApp hosts', async () => {
    const dataProvider = createDataProvider();
    render(ScopeHost, { label: 'Alpha', dataProvider, resources });
    render(ScopeHost, { label: 'Beta', dataProvider, resources });
    const alpha = await screen.findByRole('region', { name: 'Alpha' });
    const beta = await screen.findByRole('region', { name: 'Beta' });

    (document.activeElement as HTMLElement | null)?.blur();
    notification.success('orphan', 'unscoped', { duration: 0 });
    expect(within(alpha).queryByText('orphan')).toBeNull();
    expect(within(beta).queryByText('orphan')).toBeNull();

    await fireEvent.click(within(alpha).getByRole('button', { name: 'Scoped Alpha' }));
    expect(within(alpha).getByText('Alpha scoped')).toBeTruthy();
    expect(within(beta).queryByText('Alpha scoped')).toBeNull();

    const moduleButton = within(beta).getByRole('button', { name: 'Module Beta' });
    moduleButton.focus();
    await fireEvent.click(moduleButton);
    expect(within(beta).getByText('Beta module')).toBeTruthy();
    expect(within(alpha).queryByText('Beta module')).toBeNull();
    expect(within(alpha).queryByText('orphan')).toBeNull();
  });
});
