<script lang="ts">
  import type { DataProvider, FieldDefinition, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import FieldRenderer from '../../src/components/FieldRenderer.svelte';

  const fields: FieldDefinition[] = [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'summary', label: 'Summary', type: 'textarea' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'count', label: 'Count', type: 'number' },
    { key: 'launchedOn', label: 'Launched on', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Paused', value: 'paused' },
    ] },
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'tags', label: 'Tags', type: 'tags' },
    { key: 'permissions', label: 'Permissions', type: 'multiselect', options: [
      { label: 'Read', value: 'read' },
      { label: 'Write', value: 'write' },
    ] },
    { key: 'images', label: 'Images', type: 'images' },
    { key: 'metadata', label: 'Metadata', type: 'json' },
    { key: 'ownerId', label: 'Owner', type: 'relation', resource: 'owners', optionLabel: 'name' },
    { key: 'items', label: 'Items', type: 'array', subFields: [
      { key: 'sku', label: 'SKU', type: 'text' },
    ] },
  ];

  let values = $state.raw<Record<string, unknown>>({
    title: 'Alpha',
    summary: 'Contract summary',
    email: 'alpha@example.test',
    website: 'https://example.test',
    phone: '+1 555 0100',
    count: 7,
    launchedOn: '2026-08-25',
    status: 'active',
    enabled: true,
    tags: ['red', 'blue'],
    permissions: ['read', 'write'],
    images: ['https://example.test/a.png', 'https://example.test/b.png'],
    metadata: { audited: true },
    ownerId: 2,
    items: [{ sku: 'SKU-1' }],
  });

  function updateValue(key: string, value: unknown) {
    values = { ...values, [key]: value };
  }

  const dataProvider = {
    getList: async ({ resource }) => ({
      data: resource === 'owners' ? [{ id: 2, name: 'Owner Two' }] : [],
      total: resource === 'owners' ? 1 : 0,
    }),
    getOne: async () => ({ data: { id: 2, name: 'Owner Two' } }),
    create: async ({ variables }) => ({ data: { id: 'created', ...variables } }),
    update: async ({ id, variables }) => ({ data: { id, ...variables } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = [
    { name: 'contracts', label: 'Contracts', fields },
    { name: 'owners', label: 'Owners', fields: [{ key: 'name', label: 'Name', type: 'text' }] },
  ];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
</script>

{#snippet dashboard()}
  <form data-testid="field-contract-form">
    {#each fields as field (field.key)}
      <FieldRenderer
        {field}
        value={values[field.key]}
        onchange={(value) => updateValue(field.key, value)}
        invalid={field.key === 'title' || field.key === 'permissions'}
        errorId={field.key === 'title' || field.key === 'permissions' ? `${field.key}-error` : undefined}
      />
    {/each}
    <p id="title-error">Title is required</p>
    <p id="permissions-error">Permissions are required</p>
  </form>
{/snippet}

<AdminApp {dataProvider} {resources} {routerProvider} locale="en" dashboard={dashboard as never} />
