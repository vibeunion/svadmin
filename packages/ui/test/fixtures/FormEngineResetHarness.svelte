<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { defineResource } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import { decodeBaseRecord } from '@svadmin/core/schema';
  import { Type } from 'typebox';
  import AdminApp from '../../src/components/AdminApp.svelte';
  import AutoForm from '../../src/components/AutoForm.svelte';
  import StepsForm from '../../src/components/StepsForm.svelte';

  let { kind = 'auto', denied = false, mode = 'create', redirect = false }: {
    kind?: 'auto' | 'steps';
    denied?: boolean;
    mode?: 'create' | 'edit' | 'show';
    redirect?: 'list' | false;
  } = $props();
  let autoForm = $state<{ reset: () => void }>();
  let navigationGuard: ((fn: () => void) => void) | undefined;
  let stepsForm = $state<{ reset: () => void }>();
  interface PendingWrite {
    action: 'create' | 'update';
    id?: string | number;
    variables: Record<string, unknown>;
    settled: boolean;
    resolve: (value: { data: Record<string, unknown> }) => void;
    reject: (reason?: unknown) => void;
  }
  const writes: PendingWrite[] = [];
  let navigations: string[] = [];
  let successes = 0;
  let dirty = false;
  let dirtyNotifications: boolean[] = [];

  // 所有写入都由测试显式结算，便于制造 reset 前后的在途回执。
  function enqueueWrite(action: 'create' | 'update', variables: unknown, id?: string | number) {
    const snapshot = decodeBaseRecord(variables);
    return new Promise<{ data: Record<string, unknown> }>((resolve, reject) => {
      writes.push({ action, ...definedOptions({ id }), variables: snapshot, settled: false, resolve, reject });
    });
  }

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'record-1', name: 'Baseline', description: 'Baseline description' } }),
    create: ({ variables }) => enqueueWrite('create', variables),
    update: ({ id, variables }) => enqueueWrite('update', variables, id),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  };

  const resources: ResourceDefinition[] = [{
    name: 'records',
    label: 'Records',
    contract: defineResource('records', {
      record: Type.Object({ id: Type.String(), name: Type.String(), description: Type.String() }),
      create: Type.Object({
        name: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
      }),
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, defaultValue: 'Baseline' },
      {
        key: 'description', label: 'Description', type: 'text', required: true,
        defaultValue: 'Baseline description',
      },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: options => { navigations = [...navigations, JSON.stringify(options)]; },
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  export function reset(): void {
    (kind === 'auto' ? autoForm : stepsForm)?.reset();
  }
  export function guardedNavigation(action: () => void): void {
    navigationGuard?.(action);
  }
  export function pendingWriteCount(): number {
    return writes.filter(write => !write.settled).length;
  }
  export function writeVariables(index: number): Record<string, unknown> {
    return { ...writes[index]?.variables };
  }
  export function resolveWrite(index: number, values: Record<string, unknown> = {}): void {
    const pending = writes[index];
    if (!pending || pending.settled) throw new Error(`No pending write at ${index}`);
    pending.settled = true;
    pending.resolve({ data: { id: pending.id ?? 'record-1', ...values } });
  }
  export function rejectWrite(index: number, message = 'write failed'): void {
    const pending = writes[index];
    if (!pending || pending.settled) throw new Error(`No pending write at ${index}`);
    pending.settled = true;
    pending.reject(new Error(message));
  }
  export function navigationCount(): number {
    return navigations.length;
  }
  export function successCount(): number {
    return successes;
  }
  export function currentDirty(): boolean {
    return dirty;
  }
  export function dirtyStates(): boolean[] {
    return [...dirtyNotifications];
  }
</script>

{#snippet dashboard()}
  {#if kind === 'auto'}
    <AutoForm
      bind:this={autoForm}
      resourceName="records"
      showHeader={false}
      {mode}
      {redirect}
      id={mode === 'create' ? undefined : 'record-1'}
      onSuccess={() => { successes += 1; }}
      onNavigationGuardReady={(guard) => { navigationGuard = guard; }}
      onDirtyChange={(next) => { dirty = next; dirtyNotifications = [...dirtyNotifications, next]; }}
    />
  {:else}
    <StepsForm
      bind:this={stepsForm}
      resourceName="records"
      mode={mode === 'show' ? 'create' : mode}
      id={mode === 'create' ? undefined : 'record-1'}
      steps={[
        { title: 'Baseline', fields: ['name'] },
        { title: 'Review', fields: ['description'] },
      ]}
      onSuccess={() => { successes += 1; }}
    />
  {/if}
{/snippet}

<AdminApp
  {dataProvider}
  {resources}
  {routerProvider}
  accessControlProvider={{ can: async () => ({ can: !denied }) }}
  locale="en"
  {dashboard}
/>
