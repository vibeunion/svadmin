import { describe, expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { defineAdminConfig, defineSvadminPlugin, resolveAdminConfig } from './admin-config';
import { buildAdminManifest } from './admin-manifest';
import { createProviderBundle } from './provider-bundle';
import { defineResource } from './resource-contract';
import type { AuthProvider, DataProvider } from './types';

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

const stubAuthProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  getIdentity: async () => null,
  onError: async () => ({ logout: false }),
};

function ordersContract() {
  return defineResource('orders', {
    record: Type.Object({ id: Type.String(), title: Type.String(), total: Type.Number() }),
    create: Type.Object({ title: Type.String(), total: Type.Number() }),
    update: Type.Object({ title: Type.String() }),
  });
}

describe('buildAdminManifest', () => {
  test('captures providers, resources, contract fields, and plugins', () => {
    const resolved = resolveAdminConfig(defineAdminConfig({
      name: 'shop',
      providers: createProviderBundle({
        dataProvider: { primary: stubDataProvider('primary'), reporting: stubDataProvider('reporting') },
        authProvider: stubAuthProvider,
      }),
      resources: [{
        name: 'orders',
        label: 'Orders',
        fields: [
          { key: 'id', label: 'ID', type: 'text', showInForm: false },
          { key: 'title', label: 'Title', type: 'text', required: true },
        ],
        contract: ordersContract(),
      }],
      plugins: [defineSvadminPlugin({
        name: 'audit',
        version: '1',
        capabilities: ['audit-log', 'admin-route'],
      })],
    }));

    const manifest = buildAdminManifest(resolved, {
      commands: { dev: 'bun run dev', test: 'bun test' },
      testCommand: 'bun test',
      forbiddenImports: ['@svadmin/ui/src'],
    });

    expect(manifest.version).toBe(1);
    expect(manifest.project.name).toBe('shop');
    expect(manifest.project.forbiddenImports).toEqual(['@svadmin/ui/src']);
    expect(manifest.providers.dataProviders).toEqual(['primary', 'reporting']);
    expect(manifest.providers.scalarProviders).toEqual(['authProvider']);

    expect(manifest.resources).toHaveLength(1);
    expect(manifest.resources[0]?.name).toBe('orders');
    expect(manifest.resources[0]?.fields).toHaveLength(2);
    expect(manifest.resources[0]?.fields[1]?.required).toBe(true);
    expect(manifest.resources[0]?.contract.record).toEqual(['id', 'title', 'total']);
    expect(manifest.resources[0]?.contract.create).toEqual(['title', 'total']);
    expect(manifest.resources[0]?.contract.update).toEqual(['title']);

    expect(manifest.plugins).toEqual([
      { name: 'audit', version: '1', capabilities: ['audit-log', 'admin-route'] },
    ]);
  });

  test('is JSON-serializable and reports a single default data provider', () => {
    const resolved = resolveAdminConfig(defineAdminConfig({
      providers: createProviderBundle({ dataProvider: stubDataProvider('primary') }),
      resources: [{
        name: 'todos',
        label: 'Todos',
        fields: [],
        contract: defineResource('todos', { record: Type.Object({ id: Type.String() }) }),
      }],
    }));

    const manifest = buildAdminManifest(resolved);
    expect(manifest.providers.dataProviders).toEqual(['default']);
    expect(manifest.resources[0]?.contract).toEqual({ record: ['id'], create: [], update: [] });
    expect(() => JSON.stringify(manifest)).not.toThrow();
  });
});