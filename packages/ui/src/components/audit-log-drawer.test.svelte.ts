import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetContext, setAuditLogProvider } from '@svadmin/core';
import type { AuditEntry } from '@svadmin/core';
import AuditLogDrawer from './AuditLogDrawer.svelte';

const entry = {
  id: 'audit-1',
  timestamp: '2026-11-05T00:00:00.000Z',
  action: 'update',
  resource: 'orders',
  recordId: 7,
  userId: 'user-1',
};

describe('AuditLogDrawer custom loader', () => {
  beforeEach(() => resetContext());

  it('loads entries through the injected loader and ignores the context provider', async () => {
    const providerGet = vi.fn(async () => []);
    setAuditLogProvider({ create: async params => params, get: providerGet });
    const loadEntries = vi.fn(async () => [entry]);

    render(AuditLogDrawer, {
      open: true,
      resource: 'orders',
      recordId: 7,
      loadEntries,
    });

    await waitFor(() => expect(loadEntries).toHaveBeenCalledWith({
      resource: 'orders',
      meta: { recordId: 7 },
    }));
    expect(providerGet).not.toHaveBeenCalled();
    expect(await screen.findByText('update')).toBeTruthy();
  });

  it('shows the error state when the injected loader rejects', async () => {
    const loadEntries = vi.fn(async () => {
      throw new Error('audit unavailable');
    });

    render(AuditLogDrawer, {
      open: true,
      resource: 'orders',
      loadEntries,
    });

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('rejects malformed entries from the injected loader', async () => {
    const loadEntries = vi.fn(async () => [{ action: 'update' }] as unknown as AuditEntry[]);

    render(AuditLogDrawer, {
      open: true,
      resource: 'orders',
      loadEntries,
    });

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
