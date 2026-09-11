<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { Type } from '@sinclair/typebox';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoFormSuccessProbe from './AutoFormSuccessProbe.svelte';

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'product-1' } }),
    create: async ({ variables }) => ({ data: { id: 'product-1', ...decodeBaseRecord(variables) } }),
    update: async ({ id, variables }) => ({ data: { id, ...decodeBaseRecord(variables) } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  };

  const resources: ResourceDefinition[] = [{
    name: 'products',
    label: 'Products',
    contract: defineResource('products', {
      record: Type.Object({ id: Type.String(), name: Type.String(), description: Type.String() }),
      create: Type.Object({ name: Type.String({ minLength: 1 }), description: Type.String({ minLength: 1 }) }),
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({
      pathname: '/products/create',
      resource: 'products',
      action: 'create',
      params: {},
    }),
  };

  const resourcePages = {
    products: { create: AutoFormSuccessProbe },
  };
</script>

<AdminApp {dataProvider} {resources} {routerProvider} {resourcePages} locale="en" />
