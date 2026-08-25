<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import AdminApp from '../../src/components/AdminApp.svelte';

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'product-1' } }),
    create: async ({ variables }) => ({ data: { id: 'product-1', ...variables } }),
    update: async ({ id, variables }) => ({ data: { id, ...variables } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = [{
    name: 'products',
    label: 'Products',
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
</script>

<AdminApp {dataProvider} {resources} {routerProvider} locale="en" />
