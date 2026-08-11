<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext } from '@svadmin/core';
  import type { AuthProvider } from '@svadmin/core';
  import PermissionMatrix from './PermissionMatrix.svelte';
  import type { RoleInfo, ResourceInfo, ActionInfo } from '../types.js';
  import { toast } from '@svadmin/core/toast';
  import { AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  const authProvider = $derived(adminContext.authProvider);
  const rawResources = $derived(adminContext.resources);

  let roles = $state<RoleInfo[]>([]);
  let selectedRoleCode = $state<string>('');
  
  // Matrix format: { "roleId": { "resourceName": ["action1", "action2"] } }
  let permissionsCache = $state<Record<string, Record<string, string[]>>>({});
  
  let loadingRoles = $state(true);
  let loadingPermissions = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let roleRequestEpoch = 0;
  let permissionRequestEpoch = 0;
  let mutationRequestEpoch = 0;

  // Convert system resources to MatrixResource format
  let matrixResources = $derived<ResourceInfo[]>(
    rawResources.map(r => ({
      code: r.name,
      name: r.label || r.name,
    }))
  );

  let matrixActions = $state<ActionInfo[]>([
    { code: 'create', name: i18n.t('common.create') ?? 'Create' },
    { code: 'read', name: i18n.t('common.detail') ?? 'Read' },
    { code: 'update', name: i18n.t('common.edit') ?? 'Update' },
    { code: 'delete', name: i18n.t('common.delete') ?? 'Delete' },
  ]);

  async function loadRoles(scopedProvider: AuthProvider | null, epoch: number) {
    if (!scopedProvider?.getRoles) {
      if (epoch !== roleRequestEpoch) return;
      error = i18n.t('settings.rbacNotSupported') ?? 'RBAC not supported by AuthProvider';
      loadingRoles = false;
      return;
    }
    try {
      const fetchedRoles = await scopedProvider.getRoles();
      if (epoch !== roleRequestEpoch) return;
      roles = fetchedRoles.map(r => ({ code: r.id, ...r }));
      selectedRoleCode = roles[0]?.code ?? '';
    } catch (e) {
      if (epoch === roleRequestEpoch) error = (e as Error).message;
    } finally {
      if (epoch === roleRequestEpoch) loadingRoles = false;
    }
  }

  async function loadPermissionsForRole(roleId: string) {
    const scopedProvider = authProvider;
    const epoch = permissionRequestEpoch;
    if (!scopedProvider?.getRolePermissions || permissionsCache[roleId]) return;
    
    loadingPermissions = true;
    try {
      const perms = await scopedProvider.getRolePermissions(roleId);
      if (epoch === permissionRequestEpoch) permissionsCache[roleId] = perms;
    } catch (e) {
      if (epoch === permissionRequestEpoch) toast.error((e as Error).message);
    } finally {
      if (epoch === permissionRequestEpoch) loadingPermissions = false;
    }
  }

  // Load permissions whenever the selected role changes
  $effect(() => {
    if (selectedRoleCode && !permissionsCache[selectedRoleCode] && !loadingPermissions) {
      loadPermissionsForRole(selectedRoleCode);
    }
  });

  $effect(() => {
    const scopedProvider = authProvider;
    const epoch = ++roleRequestEpoch;
    void adminContext.tenantCacheKey?.__svadminTenant;
    permissionRequestEpoch += 1;
    mutationRequestEpoch += 1;
    roles = [];
    selectedRoleCode = '';
    permissionsCache = {};
    error = null;
    loadingRoles = true;
    loadingPermissions = false;
    saving = false;
    void loadRoles(scopedProvider, epoch);

    return () => {
      roleRequestEpoch += 1;
      permissionRequestEpoch += 1;
      mutationRequestEpoch += 1;
    };
  });

  // isGranted logic
  function checkGrant(roleCode: string, resourceCode: string, actionCode: string) {
    const rolePerms = permissionsCache[roleCode];
    if (!rolePerms) return false;
    return rolePerms[resourceCode]?.includes(actionCode) ?? false;
  }

  async function handleToggle(roleCode: string, resourceCode: string, actionCode: string, grant: boolean) {
    const scopedProvider = authProvider;
    if (!scopedProvider?.updateRolePermissions) return;
    const mutationEpoch = ++mutationRequestEpoch;
    
    // Copy state
    const currentRolePerms = { ...(permissionsCache[roleCode] || {}) };
    const currentResPerms = [...(currentRolePerms[resourceCode] || [])];

    // Optimistic update
    if (grant) {
      if (!currentResPerms.includes(actionCode)) currentResPerms.push(actionCode);
    } else {
      const idx = currentResPerms.indexOf(actionCode);
      if (idx > -1) currentResPerms.splice(idx, 1);
    }
    
    currentRolePerms[resourceCode] = currentResPerms;
    permissionsCache[roleCode] = currentRolePerms;

    saving = true;
    try {
      // Send the entire role's permissions back (as defined by our AuthProvider interface)
      const result = await scopedProvider.updateRolePermissions(roleCode, currentRolePerms);
      if (mutationEpoch !== mutationRequestEpoch) return;
      if (result.success) {
        // Success silently
      } else {
         throw new Error(result.error?.message ?? i18n.t('common.operationFailed'));
      }
    } catch (e) {
      if (mutationEpoch !== mutationRequestEpoch) return;
      toast.error((e as Error).message);
      // Rollback on fail
      delete permissionsCache[roleCode]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
      void loadPermissionsForRole(roleCode);
    } finally {
      if (mutationEpoch === mutationRequestEpoch) saving = false;
    }
  }
</script>

{#if error}
  <div class="h-full flex items-center justify-center">
    <div class="max-w-md p-6 border border-destructive/20 bg-destructive/10 text-destructive rounded-lg flex flex-col items-center gap-3 text-center">
      <AlertCircle class="h-8 w-8" />
      <h3 class="font-bold text-lg">{i18n.t('common.error') ?? 'Error'}</h3>
      <p>{error}</p>
    </div>
  </div>
{:else}
  <PermissionMatrix 
    {roles}
    resources={matrixResources}
    actions={matrixActions}
    isGranted={checkGrant}
    bind:selectedRole={selectedRoleCode}
    loading={loadingRoles || loadingPermissions || saving}
    onToggle={handleToggle}
  />
{/if}
