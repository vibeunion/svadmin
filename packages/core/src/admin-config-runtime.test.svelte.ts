import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { Type } from '@sinclair/typebox';
import AdminConfigRuntimeTestHost from './admin-config-runtime.test-host.svelte';
import { defineAdminConfig, defineSvadminPlugin } from './admin-config';
import { createProviderBundle } from './provider-bundle';
import { defineResource } from './resource-contract';
import type { DataProvider } from './types';

function stubDataProvider(label: string): DataProvider {
  return {
    getApiUrl: () => `/${label}`,
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: '1' } }),
    create: async () => ({ data: { id: '1' } }),
    update: async () => ({ data: { id: '1' } }),
    deleteOne: async () => ({ data: { id: '1' } }),
  };
}

function contract(name: string) {
  return defineResource(name, { record: Type.Object({ id: Type.String() }) });
}

describe('provideAdminConfig', () => {
  it('installs the resolved providers and resources into AdminContext', () => {
    const config = defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
      plugins: [
        defineSvadminPlugin({
          name: 'audit',
          version: '1',
          capabilities: ['audit-log'],
          contributes: { resources: [contract('audit_logs')] },
        }),
      ],
    });

    render(AdminConfigRuntimeTestHost, { props: { config } });

    expect(screen.getByTestId('provider-url').textContent).toBe('/primary');
    expect(screen.getByTestId('resources').textContent).toBe('orders,audit_logs');
  });

  it('keeps full resource definitions with their label and contract', () => {
    const orders = contract('orders');
    const config = defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [
        { name: 'orders', label: 'Orders', fields: [], contract: orders },
      ],
    });

    render(AdminConfigRuntimeTestHost, { props: { config } });

    expect(screen.getByTestId('resources').textContent).toBe('orders');
  });
});