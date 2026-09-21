import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import type { TaskProvider } from '@svadmin/core';
import { buildPivotExportRequest } from '@svadmin/core/pivot';
import Host from './pivot-export.test-host.svelte';

import { requireValue } from '../../../../scripts/test-assertions';
const query = { resource: 'orders', rowField: 'region', columnField: 'status', valueField: 'amount' };
const settings = { query, scopeKey: 'user-a:tenant-a', taskName: 'pivot-export', idempotencyKey: 'request-1' };
const request =requireValue( buildPivotExportRequest(query, settings.scopeKey));
const result = {
  format: 'csv', downloadUrl: '/exports/1.csv', kind: 'pivot', taskName: settings.taskName,
  idempotencyKey: settings.idempotencyKey, scopeKey: settings.scopeKey,
  requestFingerprint: request.requestFingerprint,
};
function provider(): TaskProvider {
  return {
    submit: vi.fn(async () => ({ id: 'task-1', wait: async () => ({ id: 'task-1', status: 'queued' }) })),
    get: vi.fn(async id => ({ id, status: 'completed', result })),
  };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('submits the complete pivot request and waits for an explicit download', async () => {
  const tasks = provider();
  const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const view = render(Host, { settings: { ...settings, taskProvider: tasks } });
  const button = view.getByRole('button', { name: 'Export' });
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  await fireEvent.click(button);
  await view.findByRole('button', { name: 'Download' });
  expect(tasks.submit).toHaveBeenCalledTimes(1);
  expect(tasks.submit).toHaveBeenCalledWith('pivot-export', expect.objectContaining({
    idempotencyKey: 'request-1',
    body: request,
  }));
  expect(clicked).not.toHaveBeenCalled();
  await fireEvent.click(view.getByRole('button', { name: 'Download' }));
  expect(clicked).toHaveBeenCalledTimes(1);
});

it('restores an existing task without submitting again', async () => {
  const tasks = provider();
  const view = render(Host, { settings: { ...settings, taskProvider: tasks, initialTaskId: 'restored' } });
  await view.findByRole('button', { name: 'Download' });
  expect(tasks.get).toHaveBeenCalledWith('restored');
  expect(tasks.submit).not.toHaveBeenCalled();
});

it('does not submit when export permission is denied', async () => {
  const tasks = provider();
  const view = render(Host, { settings: { ...settings, taskProvider: tasks }, denied: true });
  await fireEvent.click(view.getByRole('button', { name: 'Export' }));
  expect(tasks.submit).not.toHaveBeenCalled();
});

it('drops the owned task on tenant changes', async () => {
  const tasks = provider();
  const view = render(Host, { settings: { ...settings, taskProvider: tasks, initialTaskId: 'restored' } });
  await view.findByRole('button', { name: 'Download' });
  await view.rerender({ tenant: 'second' });
  await view.findByRole('button', { name: 'Export' });
  expect(view.queryByRole('button', { name: 'Download' })).toBeNull();
  expect(tasks.submit).not.toHaveBeenCalled();
});

it.each(['taskName', 'scopeKey', 'idempotencyKey', 'requestFingerprint', 'format'] as const)(
  'rejects restored receipts with mismatched %s', async field => {
    const tasks = provider();
    tasks.get = vi.fn(async id => ({ id, status: 'completed', result: { ...result, [field]: 'other' } }));
    const view = render(Host, { settings: { ...settings, taskProvider: tasks, initialTaskId: 'other-task' } });
    await view.findByRole('alert');
    expect(view.queryByRole('button', { name: 'Download' })).toBeNull();
    expect(tasks.submit).not.toHaveBeenCalled();
  },
);

it.each(['https://evil.example/file.csv', 'javascript:alert(1)', 'data:text/plain,secret'])(
  'rejects unsafe completed artifact %s', async downloadUrl => {
    const tasks = provider();
    tasks.get = vi.fn(async id => ({ id, status: 'completed', result: { ...result, downloadUrl } }));
    const view = render(Host, { settings: { ...settings, taskProvider: tasks, initialTaskId: 'task' } });
    await view.findByRole('alert');
    expect(view.queryByRole('button', { name: 'Download' })).toBeNull();
  },
);

it('blocks duplicate submission and ignores a late handle after scope change', async () => {
  const tasks = provider();
  let finish!: (value: Awaited<ReturnType<TaskProvider['submit']>>) => void;
  tasks.submit = vi.fn(() => new Promise<Awaited<ReturnType<TaskProvider['submit']>>>(resolve => { finish = resolve; }));
  const notified = vi.fn();
  const view = render(Host, { settings: { ...settings, taskProvider: tasks, onTaskSubmitted: notified } });
  const button = view.getByRole('button', { name: 'Export' });
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  await fireEvent.click(button);
  await fireEvent.click(button);
  expect(tasks.submit).toHaveBeenCalledTimes(1);
  await view.rerender({ tenant: 'second' });
  finish({ id: 'late', wait: async () => ({ id: 'late', status: 'queued' }) });
  await Promise.resolve();
  await Promise.resolve();
  expect(notified).not.toHaveBeenCalled();
  expect(tasks.get).not.toHaveBeenCalled();
});

it('removes the restored artifact when permission is revoked', async () => {
  const tasks = provider();
  const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const view = render(Host, { settings: { ...settings, taskProvider: tasks, initialTaskId: 'task' } });
  const button = await view.findByRole('button', { name: 'Download' });
  await view.rerender({ denied: true });
  await fireEvent.click(button);
  expect(clicked).not.toHaveBeenCalled();
  expect(view.queryByRole('button', { name: 'Download' })).toBeNull();
});
