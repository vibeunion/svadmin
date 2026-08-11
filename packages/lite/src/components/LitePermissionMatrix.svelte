<script lang="ts">
  /**
   * LitePermissionMatrix — SSR-compatible permission matrix.
   * Pure HTML table with checkbox inputs. No client-side JS required.
   * Works with form POST actions for state changes.
   */
  import type { ResourceDefinition, Role } from '@svadmin/core';

  interface LegacyLiteRole {
    code: string;
    name: string;
  }

  interface LiteResource {
    code: string;
    name: string;
    section?: string;
  }

  interface LiteAction {
    code: string;
    name: string;
  }

  interface Props {
    roles: Array<Role | LegacyLiteRole>;
    resources: Array<ResourceDefinition | LiteResource>;
    actions: LiteAction[];
    /** Core matrix ({ resource: [actions] }) or legacy flat boolean map. */
    permissions: Record<string, string[]> | Record<string, boolean>;
    selectedRole?: string;
    /** Form POST action URL */
    actionUrl?: string;
    disabled?: boolean;
  }

  let {
    roles,
    resources,
    actions,
    permissions,
    selectedRole = '',
    actionUrl = '?/updatePermissions',
    disabled = false,
  }: Props = $props();

  function isCoreRole(role: Role | LegacyLiteRole): role is Role {
    return 'id' in role && typeof role.id === 'string';
  }

  function isCoreResource(resource: ResourceDefinition | LiteResource): resource is ResourceDefinition {
    return 'fields' in resource && Array.isArray(resource.fields);
  }

  function roleId(role: Role | LegacyLiteRole | undefined): string {
    if (!role) return '';
    return isCoreRole(role) ? role.id : role.code;
  }

  function resourceCode(resource: ResourceDefinition | LiteResource): string {
    return isCoreResource(resource) ? resource.name : resource.code;
  }

  function resourceLabel(resource: ResourceDefinition | LiteResource): string {
    return isCoreResource(resource) ? resource.label : resource.name;
  }

  function resourceSection(resource: ResourceDefinition | LiteResource | undefined): string | undefined {
    if (!resource) return undefined;
    return isCoreResource(resource) ? resource.group : resource.section;
  }

  const activeRole = $derived(selectedRole || roleId(roles[0]));

  function isGranted(resource: string, action: string): boolean {
    const flatPermission = permissions[`${resource}:${action}`];
    if (typeof flatPermission === 'boolean') return flatPermission;
    const resourcePermissions = permissions[resource];
    return Array.isArray(resourcePermissions) && resourcePermissions.includes(action);
  }
</script>

<div class="lite-permission-matrix">
  <!-- Role Tabs -->
  <div class="lite-role-tabs">
    {#each roles as role, _i (_i)}
      <a
        href="?role={roleId(role)}"
        class="lite-role-tab {activeRole === roleId(role) ? 'active' : ''}"
      >
        {role.name}
      </a>
    {/each}
  </div>

  <!-- Matrix Table -->
  <form method="POST" action={actionUrl}>
    <input type="hidden" name="role" value={activeRole} />

    <table class="lite-table" style="margin-top:0;">
      <thead>
        <tr>
          <th style="width:200px;">Resource</th>
          {#each actions as action, _i (_i)}
            <th style="text-align:center;">{action.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each resources as resource, i (i)}
          {@const section = resourceSection(resource)}
          {#if section && (i === 0 || section !== resourceSection(resources[i-1]))}
            <tr>
              <td colspan={actions.length + 1} style="background:#f1f5f9;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">
                {section}
              </td>
            </tr>
          {/if}
          <tr>
            <td><strong>{resourceLabel(resource)}</strong><br/><small style="color:#94a3b8;">{resourceCode(resource)}</small></td>
            {#each actions as action, _i (_i)}
              <td style="text-align:center;">
                <input
                  type="checkbox"
                  name="perm_{resourceCode(resource)}_{action.code}"
                  checked={isGranted(resourceCode(resource), action.code)}
                  {disabled}
                  style="width:18px;height:18px;cursor:{disabled ? 'not-allowed' : 'pointer'};"
                />
              </td>
            {/each}
          </tr>
        {/each}
        {#if resources.length === 0}
          <tr>
            <td colspan={actions.length + 1} style="text-align:center;padding:24px;color:#94a3b8;">
              No resources configured.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>

    {#if !disabled}
      <div style="margin-top:12px;text-align:right;">
        <button type="submit" class="lite-btn lite-btn-primary">Save Permissions</button>
      </div>
    {/if}
  </form>
</div>

<style>
  .lite-role-tabs {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 16px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0;
  }
  .lite-role-tab {
    padding: 8px 16px;
    margin-right: 4px;
    text-decoration: none;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .lite-role-tab:hover {
    color: #0f172a;
    text-decoration: none;
  }
  .lite-role-tab.active {
    color: #4f46e5;
    border-bottom-color: #4f46e5;
    font-weight: 600;
  }
</style>
