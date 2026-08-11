import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { resetContext, type AuthProvider } from '@svadmin/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditLogViewerScopeHost from './audit-log-viewer-scope.test-host.svelte';

function createAuditAuthProvider(scope: string, total = 1) {
  const getAuditLogs = vi.fn(async (params?: { page?: number; pageSize?: number }) => ({
    data: [{
      id: `${scope}-${params?.page ?? 1}`,
      userName: `${scope} user`,
      action: 'update',
      resource: 'profiles',
      details: { secret: `${scope}-secret` },
      createdAt: '2026-08-11T00:00:00.000Z',
    }],
    total,
  }));
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: scope, name: `${scope} user` }),
    getAuditLogs,
  };
  return { provider, getAuditLogs };
}

async function openFirstSnapshot(container: HTMLElement) {
  const scopedView = within(container);
  const row = scopedView.getByText('scope-a user').closest('tr');
  if (!row) throw new Error('Expected the scope-a audit row');
  await fireEvent.click(within(row).getByRole('button'));
  await waitFor(() => expect(scopedView.getByText(/scope-a-secret/)).not.toBeNull());
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('AuditLogViewer scope', () => {
  it('closes an open snapshot when auth and tenant scope change', async () => {
    const scopeA = createAuditAuthProvider('scope-a');
    const scopeB = createAuditAuthProvider('scope-b');
    const view = render(AuditLogViewerScopeHost, {
      authProvider: scopeA.provider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('scope-a user')).not.toBeNull());
    await openFirstSnapshot(view.container);
    await view.rerender({
      authProvider: scopeB.provider,
      tenant: { tenantId: 'tenant-b' },
    });

    await waitFor(() => expect(view.getByText('scope-b user')).not.toBeNull());
    expect(view.queryByText(/scope-a-secret/)).toBeNull();
  });

  it('keeps the open snapshot when only pagination changes', async () => {
    const scopeA = createAuditAuthProvider('scope-a', 40);
    const view = render(AuditLogViewerScopeHost, {
      authProvider: scopeA.provider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('scope-a user')).not.toBeNull());
    await openFirstSnapshot(view.container);
    const pagination = view.getByText('1 / 2').parentElement;
    if (!pagination) throw new Error('Expected audit pagination controls');
    const [, nextPage] = within(pagination).getAllByRole('button');
    await fireEvent.click(nextPage);

    await waitFor(() => expect(scopeA.getAuditLogs).toHaveBeenCalledWith({ page: 2, pageSize: 20 }));
    expect(view.getByText(/scope-a-secret/)).not.toBeNull();
  });
});
