import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogProvider, AuditQueryParams } from '@svadmin/core';
import AutoTableInteractionsHarness from '../../test/fixtures/AutoTableInteractionsHarness.svelte';
import DetailWorkspaceScopeHost from './detail-workspace-scope.test-host.svelte';
import DetailWorkspaceReactiveProviderHost from './detail-workspace-reactive-provider.test-host.svelte';
import type { DetailWorkspaceScope, DetailWorkspaceVersionData } from './detail-workspace.js';

const auditEntry = (recordId: string) => ({
  id: `audit-${recordId}`,
  timestamp: '2026-10-22T00:00:00.000Z',
  action: `audit-${recordId}`,
  resource: 'users',
  recordId,
  userId: 'auditor',
});

function auditProvider(get: (params: AuditQueryParams) => Promise<unknown[]>): AuditLogProvider {
  return {
    create: vi.fn(async input => ({ ...input, id: 'created-audit' })),
    get: vi.fn(get) as AuditLogProvider['get'],
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function flushPromises(): Promise<void> {
  await tick();
  await Promise.resolve();
  await tick();
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true, value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AutoTable detail workspace consumer', () => {
  it('mounts all five record-scoped sections and rebuilds them when the drawer switches A to B', async () => {
    const events: string[] = [];
    const attachmentLoad = vi.fn(async ({ resourceName, recordId }: DetailWorkspaceScope) => {
      events.push(`attachment:${resourceName}:${recordId}`);
      return [{ name: `attachment-${recordId}.txt` }];
    });
    const activityLoad = vi.fn(async ({ recordId }: DetailWorkspaceScope) => {
      events.push(`activity:${recordId}`);
      return [{ id: `activity-${recordId}`, title: `activity-${recordId}` }];
    });
    const versionLoad = vi.fn(async ({ recordId }: DetailWorkspaceScope): Promise<DetailWorkspaceVersionData> => {
      events.push(`version:${recordId}`);
      return { oldValue: { title: `old-${recordId}` }, newValue: { title: `new-${recordId}` } };
    });
    const auditGet = vi.fn(async (params: AuditQueryParams) => {
      const recordId = String(params.meta?.['recordId'] ?? '');
      events.push(`audit:${recordId}`);
      return [auditEntry(recordId)];
    });

    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      includeSecondRecord: true,
      auditProvider: auditProvider(auditGet),
      detailWorkspace: {
        attachments: { provider: { load: attachmentLoad } },
        activity: { provider: { load: activityLoad } },
        versions: { provider: { load: versionLoad } },
      },
    });

    const detailButtons = await view.findAllByRole('button', { name: '详情' });
    // Cache B before switching A -> B so the boundary is tested without a loading unmount.
    await fireEvent.click(detailButtons[1]);
    const cachedB = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(await within(cachedB).findByText('attachment-user-2.txt')).toBeTruthy();
    await fireEvent.click(within(cachedB).getByRole('button', { name: '关闭' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    events.length = 0;

    await fireEvent.click(detailButtons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });

    expect(await within(dialog).findByText('attachment-user-1.txt')).toBeTruthy();
    expect(within(dialog).getByText('activity-user-1')).toBeTruthy();
    expect(await within(dialog).findByText('audit-user-1')).toBeTruthy();
    expect(within(dialog).getByText('old-user-1')).toBeTruthy();
    expect(within(dialog).getByText('new-user-1')).toBeTruthy();

    const probe = within(dialog).getByTestId('detail-extension-probe');
    expect(probe.getAttribute('data-record-id')).toBe('user-1');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'begin extension operation' }));
    expect(within(dialog).getByTestId('detail-extension-state').textContent).toBe('active');
    expect(attachmentLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceName: 'users',
        recordId: 'user-1',
        meta: expect.objectContaining({ recordId: 'user-1' }),
      }),
      expect.any(AbortSignal),
    );
    expect(auditGet).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'users', meta: expect.objectContaining({ recordId: 'user-1' }),
    }));
    await waitFor(() => expect(events.sort()).toEqual([
      'activity:user-1', 'attachment:users:user-1', 'audit:user-1', 'version:user-1',
    ]));

    events.length = 0;
    await fireEvent.click(detailButtons[1]);

    await waitFor(() => expect(within(dialog).getByTestId('detail-extension-probe').getAttribute('data-record-id')).toBe('user-2'));
    expect(within(dialog).getByTestId('detail-extension-state').textContent).toBe('idle');
    expect(within(dialog).queryByText('attachment-user-1.txt')).toBeNull();
    expect(await within(dialog).findByText('attachment-user-2.txt')).toBeTruthy();
    expect(within(dialog).getByText('activity-user-2')).toBeTruthy();
    expect(await within(dialog).findByText('audit-user-2')).toBeTruthy();
    expect(within(dialog).getByText('old-user-2')).toBeTruthy();
    expect(within(dialog).getByText('new-user-2')).toBeTruthy();
    await waitFor(() => expect(events.sort()).toEqual([
      'activity:user-2', 'attachment:users:user-2', 'audit:user-2', 'version:user-2',
    ]));
    expect(events.some(event => event.includes('user-1'))).toBe(false);
  });

  it('fails closed for missing or rejected section providers without leaking A data into B', async () => {
    const unavailable = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(), detailWorkspace: {},
    });
    const unavailableButtons = await unavailable.findAllByRole('button', { name: '详情' });
    await fireEvent.click(unavailableButtons[0]);
    const unavailableDialog = await unavailable.findByRole('dialog', { name: 'Users 详情' });
    await within(unavailableDialog).findByTestId('detail-extension-probe');
    for (const section of ['attachments', 'activity', 'audit', 'versions']) {
      const region = unavailableDialog.querySelector(`[data-svadmin-detail-section="${section}"]`);
      expect(region?.querySelector('[data-svadmin-detail-section-unavailable]')).toBeTruthy();
    }
    unavailable.unmount();

    const load = vi.fn(async ({ recordId }: DetailWorkspaceScope) => {
      if (recordId === 'user-2') throw new Error('PRIVATE_SECTION_FAILURE');
      return [{ name: `attachment-${recordId}.txt` }];
    });
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      includeSecondRecord: true,
      detailWorkspace: { attachments: { provider: { load } } },
    });
    const buttons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(buttons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    expect(await within(dialog).findByText('attachment-user-1.txt')).toBeTruthy();

    await fireEvent.click(buttons[1]);
    await waitFor(() => expect(
      dialog.querySelector('[data-svadmin-detail-section="attachments"] [data-svadmin-detail-section-error]'),
    ).toBeTruthy());
    expect(within(dialog).queryByText('attachment-user-1.txt')).toBeNull();
    expect(within(dialog).queryByText('PRIVATE_SECTION_FAILURE')).toBeNull();
  });

  it('keeps section heading IDs unique across two AutoTable detail workspace instances', async () => {
    const first = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(), syncWithLocation: false, detailWorkspace: {},
    });
    await fireEvent.click((await first.findAllByRole('button', { name: '详情' }))[0]);
    await waitFor(() => expect(document.querySelectorAll('[data-svadmin-detail-workspace]').length).toBe(1));

    const second = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(), syncWithLocation: false, detailWorkspace: {},
    });
    await fireEvent.click((await within(second.container).findAllByRole('button', { name: '详情' }))[0]);
    await waitFor(() => expect(document.querySelectorAll('[data-svadmin-detail-workspace]').length).toBe(2));

    const headings = [...document.querySelectorAll<HTMLHeadingElement>('[data-svadmin-detail-workspace] h3')];
    expect(headings).toHaveLength(10);
    expect(headings.every(heading => heading.id.includes('detail-workspace'))).toBe(true);
    expect(new Set(headings.map(heading => heading.id)).size).toBe(10);
  });

  it('ignores late A success and failure while B is still pending', async () => {
    const attachmentLoads = new Map<string, Deferred<{ name: string }[]>>();
    const versionLoads = new Map<string, Deferred<DetailWorkspaceVersionData>>();
    const attachmentLoad = vi.fn(({ recordId }: DetailWorkspaceScope) => {
      const deferred = createDeferred<{ name: string }[]>();
      attachmentLoads.set(String(recordId), deferred);
      return deferred.promise;
    });
    const versionLoad = vi.fn(({ recordId }: DetailWorkspaceScope) => {
      const deferred = createDeferred<DetailWorkspaceVersionData>();
      versionLoads.set(String(recordId), deferred);
      return deferred.promise;
    });

    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      includeSecondRecord: true,
      detailWorkspace: {
        attachments: { provider: { load: attachmentLoad } },
        versions: { provider: { load: versionLoad } },
      },
    });
    const buttons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(buttons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    await waitFor(() => expect(attachmentLoads.has('user-1') && versionLoads.has('user-1')).toBe(true));

    await fireEvent.click(buttons[1]);
    await waitFor(() => expect(attachmentLoads.has('user-2') && versionLoads.has('user-2')).toBe(true));

    attachmentLoads.get('user-1')!.resolve([{ name: 'late-user-1.txt' }]);
    versionLoads.get('user-1')!.reject(new Error('PRIVATE_LATE_FAILURE'));
    await flushPromises();

    expect(within(dialog).queryByText('late-user-1.txt')).toBeNull();
    expect(within(dialog).queryByText('PRIVATE_LATE_FAILURE')).toBeNull();
    expect(dialog.querySelector('[data-svadmin-detail-section="attachments"] [data-svadmin-detail-section-loading]')).toBeTruthy();
    expect(dialog.querySelector('[data-svadmin-detail-section="versions"] [data-svadmin-detail-section-loading]')).toBeTruthy();

    attachmentLoads.get('user-2')!.resolve([{ name: 'attachment-user-2.txt' }]);
    versionLoads.get('user-2')!.resolve({ oldValue: { title: 'old-user-2' }, newValue: { title: 'new-user-2' } });
    expect(await within(dialog).findByText('attachment-user-2.txt')).toBeTruthy();
    expect(within(dialog).getByText('old-user-2')).toBeTruthy();
    expect(within(dialog).getByText('new-user-2')).toBeTruthy();
    expect(within(dialog).queryByText('late-user-1.txt')).toBeNull();
  });

  it('runs an explicit retry once after failure and then recovers', async () => {
    let attempts = 0;
    const load = vi.fn(async ({ recordId }: DetailWorkspaceScope) => {
      attempts += 1;
      if (attempts === 1) throw new Error('PRIVATE_RETRY_FAILURE');
      return [{ name: `retry-${recordId}.txt` }];
    });
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      detailWorkspace: { attachments: { provider: { load } } },
    });
    const buttons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(buttons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    const error = await waitFor(() => {
      const region = dialog.querySelector<HTMLElement>('[data-svadmin-detail-section="attachments"] [data-svadmin-detail-section-error]');
      expect(region).toBeTruthy();
      return region!;
    });
    expect(within(dialog).queryByText('PRIVATE_RETRY_FAILURE')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);

    await fireEvent.click(within(error).getByRole('button', { name: '重试' }));
    expect(await within(dialog).findByText('retry-user-1.txt')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
    expect(dialog.querySelector('[data-svadmin-detail-section="attachments"] [data-svadmin-detail-section-error]')).toBeNull();
  });

  it('does not read any section when parent record access is denied or revoked', async () => {
    const deniedLoad = vi.fn(async () => [{ name: 'denied.txt' }]);
    const auditGet = vi.fn(async (params: AuditQueryParams) => [auditEntry(String(params.meta?.['recordId'] ?? ''))]);
    const denied = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      initialParams: { detail: 'user-1' },
      recordPermissions: { 'user-1': { show: false } },
      auditProvider: auditProvider(auditGet),
      detailWorkspace: { attachments: { provider: { load: deniedLoad } } },
    });
    expect(await denied.findByText('无权查看此记录')).toBeTruthy();
    expect(denied.container.querySelectorAll('[data-svadmin-detail-section]')).toHaveLength(0);
    expect(denied.container.querySelector('[data-svadmin-detail-extensions]')).toBeNull();
    expect(deniedLoad).not.toHaveBeenCalled();
    expect(auditGet).not.toHaveBeenCalled();
    denied.unmount();

    const load = vi.fn(async ({ recordId }: DetailWorkspaceScope) => [{ name: `attachment-${recordId}.txt` }]);
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      auditProvider: auditProvider(auditGet),
      detailWorkspace: { attachments: { provider: { load } } },
    });
    const buttons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(buttons[0]);
    expect(await view.findByText('attachment-user-1.txt')).toBeTruthy();
    await waitFor(() => expect(auditGet).toHaveBeenCalledTimes(1));
    expect(load).toHaveBeenCalledTimes(1);

    await view.rerender({ recordPermissions: { 'user-1': { show: false } } });
    expect(await view.findByText('无权查看此记录')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-detail-extensions]')).toBeNull();
    expect(view.container.querySelectorAll('[data-svadmin-detail-section]')).toHaveLength(0);
    expect(load).toHaveBeenCalledTimes(1);
    expect(auditGet).toHaveBeenCalledTimes(1);
  });

  it('does not retrigger a section load when the provider reads reactive state synchronously', async () => {
    const load = vi.fn(async () => {
      throw new Error('PRIVATE_REACTIVE_PROVIDER_FAILURE');
    });
    const view = render(DetailWorkspaceReactiveProviderHost, {
      load,
      maxSynchronousReads: 3,
    });

    const error = await view.findByRole('alert');
    expect(load).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('reactive-read-count').textContent).toBe('1');
    expect(within(error).queryByText('PRIVATE_REACTIVE_PROVIDER_FAILURE')).toBeNull();

    await fireEvent.click(within(error).getByRole('button', { name: /重试|Retry/ }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(view.getByTestId('reactive-read-count').textContent).toBe('2');
  });

  it('clears and ignores the same record result when the tenant scope changes', async () => {
    const loads = new Map<string, Deferred<{ name: string }[]>>();
    const load = vi.fn(({ recordId, meta }: DetailWorkspaceScope) => {
      const deferred = createDeferred<{ name: string }[]>();
      loads.set(`${recordId}:${String(meta?.['tenantId'] ?? 'none')}`, deferred);
      return deferred.promise;
    });
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      tenantIdentity: 'tenant-a',
      detailWorkspace: { attachments: { provider: { load } } },
    });
    const buttons = await view.findAllByRole('button', { name: '详情' });
    await fireEvent.click(buttons[0]);
    const dialog = await view.findByRole('dialog', { name: 'Users 详情' });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(load.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      recordId: 'user-1', meta: expect.objectContaining({ recordId: 'user-1', tenantId: 'tenant-a' }),
    }));

    await view.rerender({ tenantIdentity: 'tenant-b' });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(load.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      recordId: 'user-1', meta: expect.objectContaining({ recordId: 'user-1', tenantId: 'tenant-b' }),
    }));

    loads.get('user-1:tenant-a')!.resolve([{ name: 'stale-tenant-a.txt' }]);
    await flushPromises();
    expect(within(dialog).queryByText('stale-tenant-a.txt')).toBeNull();
    expect(dialog.querySelector('[data-svadmin-detail-section="attachments"] [data-svadmin-detail-section-loading]')).toBeTruthy();

    loads.get('user-1:tenant-b')!.resolve([{ name: 'fresh-tenant-b.txt' }]);
    expect(await within(dialog).findByText('fresh-tenant-b.txt')).toBeTruthy();
    expect(within(dialog).queryByText('stale-tenant-a.txt')).toBeNull();
  });

  it('clears and ignores an in-place tenant scope change without a parent remount', async () => {
    const loads = new Map<string, Deferred<{ name: string }[]>>();
    const load = vi.fn(({ recordId, meta }: DetailWorkspaceScope) => {
      const deferred = createDeferred<{ name: string }[]>();
      loads.set(String(meta?.['tenantId'] ?? 'none'), deferred);
      return deferred.promise;
    });
    const view = render(DetailWorkspaceScopeHost, {
      tenant: { tenantId: 'tenant-a' },
      provider: { load },
    });
    await waitFor(() => expect(loads.has('tenant-a')).toBe(true));
    expect(load.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      recordId: 'user-1', meta: expect.objectContaining({ recordId: 'user-1', tenantId: 'tenant-a' }),
    }));

    await view.rerender({ tenant: { tenantId: 'tenant-b' } });
    await waitFor(() => expect(loads.has('tenant-b')).toBe(true));

    loads.get('tenant-a')!.resolve([{ name: 'stale-in-place-tenant-a.txt' }]);
    await flushPromises();
    expect(view.queryByText('stale-in-place-tenant-a.txt')).toBeNull();

    loads.get('tenant-b')!.resolve([{ name: 'fresh-in-place-tenant-b.txt' }]);
    expect(await view.findByText('fresh-in-place-tenant-b.txt')).toBeTruthy();
    expect(view.queryByText('stale-in-place-tenant-a.txt')).toBeNull();
  });

});
