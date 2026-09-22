import { describe, expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import {
  assertAdminConfig,
  defineAdminConfig,
  defineSvadminPlugin,
  normalizeAdminResource,
  resolveAdminConfig,
  toAdminContextSource,
} from './admin-config';
import { createProviderBundle } from './provider-bundle';
import { defineResource } from './resource-contract';
import type { DataProvider } from './types';

function stubDataProvider(label: string): DataProvider {
  return {
    getApiUrl: () => `/api/${label}`,
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

describe('defineAdminConfig', () => {
  test('brands the configuration and preserves the input shape', () => {
    const config = defineAdminConfig({
      name: 'demo',
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
    });

    expect(config.__svadminConfig).toBe(true);
    expect(config.name).toBe('demo');
    expect(config.resources?.map((resource) => resource.name)).toEqual(['orders']);
  });

  test('rejects an empty provider bundle list', () => {
    expect(() => defineAdminConfig({ providers: [] })).toThrow(/at least one provider bundle/);
  });
});

describe('defineSvadminPlugin', () => {
  test('returns the manifest and validates identity fields', () => {
    const plugin = defineSvadminPlugin({
      name: 'audit',
      version: '1',
      capabilities: ['audit-log', 'admin-route'],
    });

    expect(plugin.name).toBe('audit');
    expect(() => defineSvadminPlugin({ name: ' ', version: '1', capabilities: [] })).toThrow(/non-empty name/);
    expect(() => defineSvadminPlugin({ name: 'x', version: '', capabilities: [] })).toThrow(/non-empty version/);
    expect(() => defineSvadminPlugin({
      name: 'x',
      version: '1',
      capabilities: ['ai', 'ai'],
    })).toThrow(/duplicate capabilities/);
  });
});

describe('resolveAdminConfig', () => {
  test('folds plugin resources into the application snapshot', () => {
    const auditPlugin = defineSvadminPlugin({
      name: 'audit',
      version: '1',
      capabilities: ['audit-log'],
      contributes: { resources: [contract('audit_logs')] },
    });

    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
      plugins: [auditPlugin],
    }));

    expect(resolved.resources.map((resource) => resource.name)).toEqual(['orders', 'audit_logs']);
    expect(resolved.diagnostics).toEqual([]);
  });

  test('reports duplicate resource names across config and plugins', () => {
    const plugin = defineSvadminPlugin({
      name: 'orders-extension',
      version: '1',
      capabilities: ['data'],
      contributes: { resources: [contract('orders')] },
    });

    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
      plugins: [plugin],
    }));

    expect(resolved.diagnostics).toEqual([
      { code: 'duplicate-resource', message: 'Resource "orders" is registered more than once', source: 'orders' },
    ]);
  });

  test('reports duplicate plugin registration', () => {
    const plugin = defineSvadminPlugin({ name: 'audit', version: '1', capabilities: ['audit-log'] });
    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      plugins: [plugin, plugin],
    }));

    expect(resolved.diagnostics).toEqual([
      { code: 'duplicate-plugin', message: 'Plugin "audit" is registered more than once', source: 'audit' },
    ]);
  });

  test('composes provider bundles declared by plugins', () => {
    const livePlugin = defineSvadminPlugin({
      name: 'live',
      version: '1',
      capabilities: ['live'],
      contributes: {
        providers: createProviderBundle({
          dataProvider: { secondary: stubDataProvider('secondary') },
        }),
      },
    });

    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      plugins: [livePlugin],
    }));

    const dataProvider = resolved.providers.dataProvider;
    expect(typeof dataProvider).toBe('object');
    const named = dataProvider as Record<string, DataProvider>;
    expect(named['default']?.getApiUrl()).toBe('/api/primary');
    expect(named['secondary']?.getApiUrl()).toBe('/api/secondary');
  });

  test('normalizes bare contracts into definitions with the contract attached', () => {
    const orders = contract('orders');
    const normalized = normalizeAdminResource(orders);
    expect(normalized.name).toBe('orders');
    expect(normalized.label).toBe('orders');
    expect(normalized.fields).toEqual([]);
    expect(normalized.contract).toBe(orders);

    const full = normalizeAdminResource({
      name: 'orders',
      label: 'Orders',
      fields: [{ key: 'title', label: 'Title', type: 'text' }],
      contract: orders,
    });
    expect(full.label).toBe('Orders');
    expect(full.fields).toHaveLength(1);
  });

  test('toAdminContextSource forwards the composed bundle and normalized resources', () => {
    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
    }));
    const source = toAdminContextSource(resolved);
    expect(source.providerBundle).toBe(resolved.providers);
    expect(source.resources.map((resource) => resource.name)).toEqual(['orders']);
    expect(source.resources[0]?.contract?.name).toBe('orders');
  });

  test('assertAdminConfig throws on error diagnostics', () => {
    expect(() => assertAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [contract('orders')],
      plugins: [
        defineSvadminPlugin({
          name: 'dup',
          version: '1',
          capabilities: [],
          contributes: { resources: [contract('orders')] },
        }),
      ],
    }))).toThrow(/duplicate-resource/);
  });
});