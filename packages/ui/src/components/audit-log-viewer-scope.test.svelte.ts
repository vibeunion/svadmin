import { requireValue } from "../../../../scripts/test-assertions";
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { resetContext, type AuthProvider } from '@svadmin/core';
import { getToastQueue, resetToast } from '@svadmin/core/toast';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditLogViewerScopeHost from './audit-log-viewer-scope.test-host.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

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
  resetToast();
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

  it('hides provider diagnostics behind generic feedback and recovers on retry', async () => {
    const scopeA = createAuditAuthProvider('scope-a');
    scopeA.getAuditLogs.mockRejectedValueOnce(new Error('PRIVATE_DIAGNOSTIC'));
    const view = renderWithI18n(AuditLogViewerScopeHost, {
      authProvider: scopeA.provider,
      tenant: { tenantId: 'tenant-a' },
    });

    await waitFor(() => expect(view.getByText('Something went wrong')).not.toBeNull());
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(getToastQueue()).toHaveLength(1);
    expect(JSON.stringify(getToastQueue())).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(getToastQueue()[0]).toMatchObject({ type: 'error', message: 'Something went wrong' });

    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(view.getByText('scope-a user')).not.toBeNull());
    expect(view.queryByText('Something went wrong')).toBeNull();
    expect(scopeA.getAuditLogs).toHaveBeenCalledTimes(2);
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
    await fireEvent.click(requireValue(nextPage));

    await waitFor(() => expect(scopeA.getAuditLogs).toHaveBeenCalledWith({ page: 2, pageSize: 20 }));
    expect(view.getByText(/scope-a-secret/)).not.toBeNull();
  });
});
