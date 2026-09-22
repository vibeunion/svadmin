import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { Type } from '@sinclair/typebox';
import ResourceScopeTestHost from './resource-scope.test-host.svelte';
import { defineAdminConfig } from './admin-config';
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

const config = defineAdminConfig({
  providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
  resources: [contract('orders'), contract('audit_logs')],
});

describe('provideResourceScope', () => {
  it('restricts the resource registry but inherits providers', () => {
    render(ResourceScopeTestHost, {
      props: {
        config,
        scope: {
          resources: [{ name: 'orders', label: 'Orders', fields: [], contract: contract('orders') }],
        },
      },
    });

    expect(screen.getByTestId('resources').textContent).toBe('orders');
    expect(screen.getByTestId('provider-url').textContent).toBe('/primary');
  });

  it('swaps providers but inherits the resource registry', () => {
    render(ResourceScopeTestHost, {
      props: {
        config,
        scope: { providerBundle: createProviderBundle({ dataProvider: stubDataProvider('secondary') }) },
      },
    });

    expect(screen.getByTestId('resources').textContent).toBe('orders,audit_logs');
    expect(screen.getByTestId('provider-url').textContent).toBe('/secondary');
  });
});