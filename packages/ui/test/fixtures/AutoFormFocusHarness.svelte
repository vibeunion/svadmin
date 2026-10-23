<script lang="ts">
  import type { DataProvider, FieldDefinition, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { Type } from 'typebox';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoForm from '../../src/components/AutoForm.svelte';
  import { definedOptions } from '@svadmin/core/options';

  let { fields, custom = false, firstLegend = false, onCreate = () => {} }: {
    fields: FieldDefinition[];
    custom?: boolean;
    firstLegend?: boolean;
    onCreate?: () => void;
  } = $props();

  const fieldValue = Type.Union([
    Type.String(), Type.Array(Type.String()),
    Type.Array(Type.Object({ second: Type.String() })),
  ]);
  const shape = {
    first: Type.Optional(fieldValue), second: Type.Optional(fieldValue),
    valid: Type.Optional(fieldValue), later: Type.Optional(fieldValue),
    blocked: Type.Optional(fieldValue), rows: Type.Optional(fieldValue),
  };
  const contract = defineResource('records', {
    record: Type.Object({ id: Type.String(), ...shape }),
    create: Type.Object(shape),
  });
  const resources: ResourceDefinition[] = $derived([{ name: 'records', label: 'Records', fields, contract }]);
  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'record-1' } }),
    create: async ({ variables }) => {
      onCreate();
      return { data: { id: 'record-1', ...decodeBaseRecord(variables) } };
    },
    update: async ({ id, variables }) => ({ data: { id, ...decodeBaseRecord(variables) } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
  };
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
</script>

{#snippet customField({ field }: { field: FieldDefinition; value: unknown; onchange: (value: unknown) => void })}
  <input type="hidden" name={field.key} value="hidden" />
  <fieldset disabled>
    <legend>{#if firstLegend}<input aria-label={`${field.label} first legend`} />{:else}Unavailable{/if}</legend>
    <legend><input aria-label={`${field.label} second legend`} /></legend>
    <input aria-label={`${field.label} disabled fieldset`} />
  </fieldset>
  <div hidden><input aria-label={`${field.label} hidden`} /></div>
  <div inert><input aria-label={`${field.label} inert`} /></div>
  <button type="button" disabled>{field.label} disabled</button>
  <button type="button" aria-disabled="true">{field.label} unavailable</button>
  {#if field.key !== 'blocked'}
    <input aria-label={field.label} tabindex="-1" />
  {/if}
{/snippet}

{#snippet dashboard()}
  <AutoForm
    resourceName="records"
    showHeader={false}
    redirect={false}
    {...definedOptions({ fieldRenderer: custom ? customField : undefined })}
  />
{/snippet}

<AdminApp {dataProvider} {resources} {routerProvider} locale="en" {dashboard} />
