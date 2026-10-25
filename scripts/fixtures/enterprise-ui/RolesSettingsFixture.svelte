<script lang="ts">
  import { untrack } from 'svelte';
  import { getToastQueue, provideAdminContext, type AuthProvider, type DataProvider } from '@svadmin/core';
  import RolesSettings from '../../../packages/ui/src/components/RolesSettings.svelte';

  interface PendingRead {
    label: string;
    succeed: () => void;
    fail: () => void;
  }
  let pending = $state.raw<PendingRead[]>([]);
  let reads = $state(0);
  let writes = $state(0);
  let lastWrite = $state('');
  let tenantId = $state('a');
  let pendingWrites = $state.raw<PendingRead[]>([]);
  const holdWrites = new URLSearchParams(window.location.search).has('hold-writes');
  const hasPermissionRead = !new URLSearchParams(window.location.search).has('no-permission-read');
  const permissions: Record<string, Record<string, string[]>> = {
    reader: { orders: ['read'] },
    editor: { orders: ['read', 'update'] },
  };

  function read<T>(label: string, value: T): Promise<T> {
    const id = untrack(() => {
      reads += 1;
      return reads;
    });
    return new Promise((resolve, reject) => {
      const request: PendingRead = {
        label: `${label} ${id}`,
        succeed: () => {
          pending = pending.filter(item => item !== request);
          resolve(structuredClone(value));
        },
        fail: () => {
          pending = pending.filter(item => item !== request);
          reject(new Error('PRIVATE_ROLE_FIXTURE'));
        },
      };
      untrack(() => {
        pending = [...pending, request];
      });
    });
  }
  const replacementPermissions: Record<string, Record<string, string[]>> = {
    reader: { orders: ['update'] },
    editor: { orders: ['delete'] },
  };
  function createAuthProvider(replacement = false): AuthProvider {
    const newScope = () => replacement || untrack(() => tenantId === 'b');
    return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'operator' }),
    getRoles: () => read(newScope() ? 'new-roles' : 'roles', [
      { id: 'reader', name: newScope() ? 'New Reader' : 'Reader' },
      { id: 'editor', name: newScope() ? 'New Editor' : 'Editor' },
    ]),
    ...(hasPermissionRead ? { getRolePermissions: (role: string) =>
      read(newScope() ? `new-${role}` : role, (newScope() ? replacementPermissions : permissions)[role] ?? {}) } : {}),
    updateRolePermissions: async (role, next) => {
      writes += 1;
      lastWrite = JSON.stringify({ role, permissions: next });
      const destination = newScope() ? replacementPermissions : permissions;
      const submitted = structuredClone(next);
      if (holdWrites) {
        const id = writes;
        await new Promise<void>((resolve, reject) => {
          const request: PendingRead = {
            label: `write ${id}`,
            succeed: () => {
              pendingWrites = pendingWrites.filter(item => item !== request);
              resolve();
            },
            fail: () => {
              pendingWrites = pendingWrites.filter(item => item !== request);
              reject(new Error('PRIVATE_ROLE_SAVE_FIXTURE'));
            },
          };
          pendingWrites = [...pendingWrites, request];
        });
      } else if (writes === 1) throw new Error('PRIVATE_ROLE_SAVE_FIXTURE');
      destination[role] = submitted;
      return { success: true };
    },
    };
  }
  let authProvider = $state.raw<AuthProvider>(createAuthProvider());
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  provideAdminContext({
    dataProvider,
    get authProvider() { return authProvider; },
    get tenant() { return { tenantId }; },
    resources: [{ name: 'orders', label: 'Orders', fields: [] }],
  });
</script>

<section data-testid="roles-settings"><RolesSettings /></section>
<aside aria-label="Fixture controls">
  <button type="button" onclick={() => { authProvider = createAuthProvider(true); }}>Replace provider</button>
  <button type="button" onclick={() => { tenantId = 'b'; }}>Replace tenant</button>
  {#each pending as request (request)}
    <button type="button" onclick={request.succeed}>Resolve {request.label}</button>
    <button type="button" onclick={request.fail}>Reject {request.label}</button>
  {/each}
  {#each pendingWrites as request (request)}
    <button type="button" onclick={request.succeed}>Resolve {request.label}</button>
    <button type="button" onclick={request.fail}>Reject {request.label}</button>
  {/each}
  <output data-testid="roles-reads">{reads}</output>
  <output data-testid="roles-writes">{writes}</output>
  <output data-testid="roles-last-write">{lastWrite}</output>
  <output data-testid="roles-feedback">{getToastQueue().map(item => item.message).join('; ')}</output>
</aside>
