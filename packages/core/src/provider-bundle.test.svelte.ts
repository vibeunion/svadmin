import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi } from 'vitest';
import ProviderBundleTestHost from './provider-bundle.test-host.svelte';
import {
  createProviderBundle,
  withTenantDataProvider,
} from './provider-bundle';
import { keys, parseQueryKey, queryKeyMatches } from './query-keys';
import type { AuditEntry, AuditLogProvider } from './audit';
import type { ChatProvider } from './chatProvider.svelte';
import type {
  CredentialProvider,
  IdentityGovernanceProvider,
  OrganizationProvider,
  SessionProvider,
} from './enterprise';
import type { AccessControlProvider } from './permissions.svelte';
import type { GetListParams, DataProvider, NotificationProvider, ResourceDefinition } from './types';

function createDataProvider(instance: string, calls: GetListParams[]): DataProvider {
  return {
    getList: vi.fn(async (params: GetListParams) => {
      calls.push(params);
      return { data: [{ id: instance }], total: 1 };
    }),
    getOne: vi.fn(async () => ({ data: { id: instance } })),
    create: vi.fn(async () => ({ data: { id: instance } })),
    update: vi.fn(async () => ({ data: { id: instance } })),
    deleteOne: vi.fn(async () => ({ data: { id: instance } })),
    getApiUrl: () => `/${instance}`,
    custom: vi.fn(async ({ meta }) => ({ data: meta })),
  } as unknown as DataProvider;
}

function createBundle(instance: string, calls: GetListParams[]) {
  const accessControlProvider: AccessControlProvider = {
    can: vi.fn(async () => ({ can: true })),
  };
  const auditLogProvider: AuditLogProvider = {
    create: vi.fn(async ({ resource }): Promise<AuditEntry> => ({
      timestamp: '2026-01-01T00:00:00.000Z',
      resource,
      action: 'create',
    })),
    get: vi.fn(async () => []),
    update: vi.fn(async (): Promise<AuditEntry> => ({
      timestamp: '2026-01-01T00:00:00.000Z',
      action: 'update',
    })),
  };
  const notificationProvider: NotificationProvider = {
    open: vi.fn(),
    close: vi.fn(),
  };
  const chatProvider: ChatProvider = {
    sendMessage: vi.fn(async () => instance),
  };
  const taskProvider = {
    submit: vi.fn(async () => ({
      id: `${instance}-task`,
      wait: async () => ({ id: `${instance}-task`, status: 'done' }),
    })),
    get: vi.fn(async () => ({ id: `${instance}-task`, status: 'running' })),
  };
  const organizationProvider: OrganizationProvider = {
    getCurrentOrganization: vi.fn(async () => ({ id: instance, name: `${instance} organization` })),
  };
  const identityGovernanceProvider: IdentityGovernanceProvider = {
    getSecurityPolicy: vi.fn(async () => ({ sessionTimeoutMinutes: 30, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false })),
    updateSecurityPolicy: vi.fn(async (policy) => policy),
    listIdentityProviders: vi.fn(async () => []),
    testIdentityProvider: vi.fn(async () => ({ success: true })),
  };
  const sessionProvider: SessionProvider = {
    listSessions: vi.fn(async () => []),
    revokeSession: vi.fn(async () => ({ success: true })),
    revokeOtherSessions: vi.fn(async () => ({ success: true })),
  };
  const credentialProvider: CredentialProvider = {
    listApiCredentials: vi.fn(async () => []),
    createApiCredential: vi.fn(async () => ({
      credential: { id: instance, name: instance, prefix: 'sv_', createdAt: '2026-08-25', permissions: [] },
      secret: 'one-time-secret',
    })),
    revokeApiCredential: vi.fn(async () => ({ success: true })),
    listWebhooks: vi.fn(async () => []),
    createWebhook: vi.fn(async (params) => ({ id: instance, ...params })),
    deleteWebhook: vi.fn(async () => ({ success: true })),
  };

  return createProviderBundle({
    dataProvider: {
      default: createDataProvider(`${instance}-default`, []),
      cms: createDataProvider(instance, calls),
    },
    accessControlProvider,
    auditLogProvider,
    notificationProvider,
    chatProvider,
    taskProvider,
    organizationProvider,
    identityGovernanceProvider,
    sessionProvider,
    credentialProvider,
    tenantAdapter: {
      getProviderMeta: (tenant) => ({ organizationId: tenant.tenantId, tenantId: 'adapter-spoof' }),
      getCacheIdentity: (tenant) => `tenant:${tenant.tenantId}`,
    },
  });
}

const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  fields: [],
  provider: {
    dataProviderName: 'cms',
    transport: { type: 'rest', endpoint: '/posts' },
    adapter: { name: 'elysia-contract' },
    meta: { resourceScope: 'posts', tenantId: 'resource-spoof' },
  },
}];

describe('ProviderBundle and tenant context', () => {
  it('keeps provider capabilities, tenant metadata and cache identity isolated by tree', async () => {
    const firstCalls: GetListParams[] = [];
    const secondCalls: GetListParams[] = [];
    const firstBundle = createBundle('first', firstCalls);
    const secondBundle = createBundle('second', secondCalls);

    render(ProviderBundleTestHost, {
      props: {
        instance: 'first',
        providerBundle: firstBundle,
        tenant: { tenantId: 'alpha', meta: { region: 'cn' } },
        resources,
      },
    });
    render(ProviderBundleTestHost, {
      props: {
        instance: 'second',
        providerBundle: secondBundle,
        tenant: { tenantId: 'beta', meta: { region: 'us' } },
        resources,
      },
    });

    await fireEvent.click(screen.getByTestId('first-read'));
    await fireEvent.click(screen.getByTestId('second-read'));
    await fireEvent.click(screen.getByTestId('first-create'));
    await fireEvent.click(screen.getByTestId('second-create'));
    await fireEvent.click(screen.getByTestId('first-notify'));
    await fireEvent.click(screen.getByTestId('second-notify'));

    await waitFor(() => {
      expect(firstCalls).toHaveLength(1);
      expect(secondCalls).toHaveLength(1);
      expect(firstCalls[0]?.meta).toEqual({
        resourceScope: 'posts',
        request: 'first',
        tenantId: 'alpha',
        transport: { type: 'rest', endpoint: '/posts' },
        adapter: { name: 'elysia-contract' },
        region: 'cn',
        organizationId: 'alpha',
      });
      expect(secondCalls[0]?.meta).toEqual(expect.objectContaining({
        request: 'second',
        tenantId: 'beta',
        region: 'us',
        organizationId: 'beta',
      }));
      expect(screen.getByTestId('first-cache').textContent).toBe('tenant:alpha');
      expect(screen.getByTestId('second-cache').textContent).toBe('tenant:beta');
      expect(screen.getByTestId('first-access').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-audit').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-notification').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-chat').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-organization').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-identity-governance').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-session').textContent?.trim()).toBe('scoped');
      expect(screen.getByTestId('first-credential').textContent?.trim()).toBe('scoped');
      expect(firstBundle.notificationProvider.open).toHaveBeenCalledTimes(2);
      expect(secondBundle.notificationProvider.open).toHaveBeenCalledTimes(2);
      expect(firstBundle.notificationProvider.open).toHaveBeenLastCalledWith({
        type: 'info',
        message: 'first-notice',
        key: undefined,
      });
      expect(secondBundle.notificationProvider.open).toHaveBeenLastCalledWith({
        type: 'info',
        message: 'second-notice',
        key: undefined,
      });
      expect(firstBundle.auditLogProvider.create).toHaveBeenCalledTimes(1);
      expect(secondBundle.auditLogProvider.create).toHaveBeenCalledTimes(1);
      expect(firstBundle.auditLogProvider.create).toHaveBeenCalledWith(expect.objectContaining({
        meta: expect.objectContaining({ tenantId: 'alpha', organizationId: 'alpha' }),
      }));
      expect(secondBundle.auditLogProvider.create).toHaveBeenCalledWith(expect.objectContaining({
        meta: expect.objectContaining({ tenantId: 'beta', organizationId: 'beta' }),
      }));
    });
  });

  it('adapts standalone providers without allowing caller tenant spoofing', async () => {
    const calls: GetListParams[] = [];
    const provider = withTenantDataProvider(
      createDataProvider('standalone', calls),
      { tenantId: 42, meta: { region: 'cn' } },
      { getProviderMeta: () => ({ organizationId: 'org-42', tenantId: 'spoof' }) },
    );

    await provider.getList({ resource: 'posts', meta: { tenantId: 'caller' } });
    const customResult = await provider.custom?.({ url: '/health', method: 'get' });

    expect(calls[0]?.meta).toEqual({ tenantId: 42, region: 'cn', organizationId: 'org-42' });
    expect(customResult?.data).toEqual({ tenantId: 42, region: 'cn', organizationId: 'org-42' });
  });

  it('separates TanStack cache entries when two tenant trees share a QueryClient', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const firstCalls: GetListParams[] = [];
    const secondCalls: GetListParams[] = [];

    render(ProviderBundleTestHost, {
      props: {
        instance: 'query-first',
        providerBundle: createBundle('query-first', firstCalls),
        tenant: { tenantId: 'alpha' },
        resources,
        queryClient,
        queryEnabled: true,
      },
    });
    render(ProviderBundleTestHost, {
      props: {
        instance: 'query-second',
        providerBundle: createBundle('query-second', secondCalls),
        tenant: { tenantId: 'beta' },
        resources,
        queryClient,
        queryEnabled: true,
      },
    });

    await waitFor(() => {
      expect(firstCalls).toHaveLength(1);
      expect(secondCalls).toHaveLength(1);
      expect(screen.getByTestId('query-first-task').textContent).toBe('query-first-task');
      expect(screen.getByTestId('query-second-task').textContent).toBe('query-second-task');
    });

    const tenantIdentities = queryClient.getQueryCache().getAll().map((query) => (
      parseQueryKey(query.queryKey)?.tenant
    ));

    expect(tenantIdentities).toEqual(expect.arrayContaining(['tenant:alpha', 'tenant:beta']));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(4);
  });

  it('matches tenant-specific v2 keys and rejects legacy tuples', () => {
    const alphaKey = keys({ tenant: 'alpha' }).data.list('posts');

    expect(queryKeyMatches(alphaKey, { tenant: 'alpha' })).toBe(true);
    expect(queryKeyMatches(alphaKey, { tenant: 'beta' })).toBe(false);
    expect(queryKeyMatches(alphaKey, { tenant: undefined })).toBe(false);
    expect(queryKeyMatches(['default', 'posts', 'list'], {})).toBe(false);
  });
});
