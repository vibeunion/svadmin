<script lang="ts">
  import { Shield, AlertCircle, Check } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { RoleInfo, ResourceInfo, ActionInfo } from '../types.js';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  
  let {
    // Basic metadata lists
    roles = [],
    resources = [],
    actions = [],
    
    // Authorization state resolver
    // isGranted(roleCode, resourceCode, actionCode) => boolean
    isGranted,
    
    // Interactive states
    selectedRole = $bindable(''),
    loading = false,
    
    // Feedback and alerts (passed down from upper business logic)
    message = '',
    messageType = 'success', // 'success' | 'error' | 'warning'
    conflictCount = 0,
    
    // Custom slots for injecting multi-tenant switchers or security filters
    sidebarExtra,
    headerExtra,

    // Callback event
    onToggle
  }: {
    roles: RoleInfo[];
    resources: ResourceInfo[];
    actions: ActionInfo[];
    isGranted: (role: string, resource: string, action: string) => boolean;
    selectedRole?: string;
    loading?: boolean;
    message?: string;
    messageType?: 'success' | 'error' | 'warning';
    conflictCount?: number;
    sidebarExtra?: Snippet;
    headerExtra?: Snippet;
    onToggle: (role: string, resource: string, action: string, grant: boolean) => void;
  } = $props();

  $effect(() => {
    if (!selectedRole && roles.length > 0) {
      selectedRole = roles[0].code;
    }
  });
</script>

<div class="svadmin-u-668b21aa5409 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-f46b61a9b310">
  <!-- Header Title -->
  <div class="svadmin-u-b6777c6db914 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93">
    <div>
      <h1 class="svadmin-u-3febee094e85 svadmin-u-69450ef1487e svadmin-u-d4108abe6359 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Shield class="svadmin-u-7ec10f86d9b1 svadmin-u-f6fe902450dc svadmin-u-20aaf08a7ed1" />
        {i18n.t('permissions.title') || 'Permission Matrix'}
      </h1>
      <p class="svadmin-u-bfa603190748 svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb">{i18n.t('permissions.description') || 'Configure authorization rules for system modules and roles.'}</p>
    </div>
    
    <!-- Toast Feedback -->
    {#if message}
      <div class={`svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-5f22e64f2282 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-438b2237b8d6 svadmin-u-0fe7d7d814d0 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 ${messageType === 'success' ? 'svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff svadmin-u-3daca9af0861 svadmin-u-be62e835b692' : 'svadmin-u-43928fcc832f svadmin-u-811148b13d1e svadmin-u-3daca9af0861 svadmin-u-5b92fd698365'}`}>
        {#if messageType === 'success'}
           <Check class="svadmin-u-dc7972ebf3f3 svadmin-u-11e59c6d5f6b" />
        {:else}
           <AlertCircle class="svadmin-u-dc7972ebf3f3 svadmin-u-11e59c6d5f6b" />
        {/if}
        {message}
      </div>
    {/if}
  </div>

  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2adea12c41f3 svadmin-u-0d304f904cb0 svadmin-u-36e579c0b41c svadmin-u-243d62579c55">
    <div class="svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-438b2237b8d6 svadmin-u-a327049cac5b">
      <label for="permission-role-select" class="svadmin-u-a77ed4d908c0 svadmin-u-0214b4b355d1 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('permissions.roles') || 'Roles'}</label>
      <select id="permission-role-select" bind:value={selectedRole} class="svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-fc7473ca09eb svadmin-u-582e6ef4b245 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752" disabled={roles.length === 0}>
        {#each roles as role (role.code)}<option value={role.code}>{role.name}</option>{/each}
      </select>
      {#if roles.length === 0}<p class="svadmin-u-50d0d216a2f8 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('permissions.noRoles') || 'No roles available'}</p>{/if}
      {#if sidebarExtra}<div class="svadmin-u-0ab8667228fd svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-173fa8f06789">{@render sidebarExtra()}</div>{/if}
    </div>

    <!-- Left: Role Selector Sidebar -->
    <div class="svadmin-u-99d72c7fc3e2 svadmin-u-6da6a3c3f741 svadmin-u-2074a75bf2e7 svadmin-u-8dddea0773ed svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-438b2237b8d6 svadmin-u-3eb153dc198f svadmin-u-c9c45f3d5d06">
      <h2 class="svadmin-u-da019856f2cc svadmin-u-d5eab218aa34 svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-bfa603190748">{i18n.t('permissions.roles') || 'Roles'}</h2>
      <div class="svadmin-u-da7c36cd8867 svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1">
        {#each roles as role, _i (_i)}
          <button 
            onclick={() => selectedRole = role.code}
            class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-5f22e64f2282 svadmin-u-fc7473ca09eb svadmin-u-0fe7d7d814d0 svadmin-u-625a4c3fbeb2 {selectedRole === role.code ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069 svadmin-u-438b2237b8d6 svadmin-u-3daca9af0861 svadmin-u-2b6f77ad4036' : 'svadmin-u-d4108abe6359 svadmin-u-8e551981c8d7'}"
          >
            {role.name}
            <div class="svadmin-u-15e1b1f444fe svadmin-u-0e65706bcccd svadmin-u-1dc571a3609f svadmin-u-f2868c227fcd">{role.code}</div>
          </button>
        {/each}
        {#if roles.length === 0}
          <p class="svadmin-u-ca6bf63030aa svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb svadmin-u-8e63407b5ceb">{i18n.t('permissions.noRoles') || 'No roles available'}</p>
        {/if}
      </div>
      
      <!-- Slot for Upper Logic inject (e.g. Org Switcher, Security Level Filter) -->
      {#if sidebarExtra}
         <div class="svadmin-u-0ab8667228fd svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-18049387f0af">
           {@render sidebarExtra()}
         </div>
      {/if}
    </div>

    <!-- Right: Matrix Grid -->
    <div class="svadmin-u-36e579c0b41c svadmin-u-cd0ad9a56558 svadmin-u-5f22e64f2282 svadmin-u-438b2237b8d6 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-2cd02d11d1af svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
      <!-- Matrix Header -->
      <div class="svadmin-u-c07e54fd1439 svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-2859c861d7de svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93">
        <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-cdaa0b7ef445">
          <div>
            <h2 class="svadmin-u-42536e69e639 svadmin-u-69450ef1487e svadmin-u-d4108abe6359">{i18n.t('permissions.currentRole') || 'Current role'}:
              <span class="svadmin-u-20aaf08a7ed1">{roles.find(r => r.code === selectedRole)?.name || (i18n.t('permissions.noneSelected') || 'None selected')}</span>
            </h2>
            <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-b6b02c0ebef6">{i18n.t('permissions.toggleHint') || 'Toggle checkboxes to grant or revoke permissions'}</p>
          </div>

          <!-- Slot for header extra logic -->
          {#if headerExtra}
            {@render headerExtra()}
          {/if}
        </div>
        
        {#if conflictCount > 0}
          <div class="svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-43928fcc832f svadmin-u-811148b13d1e svadmin-u-5f22e64f2282 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-3daca9af0861 svadmin-u-5b92fd698365 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
            <AlertCircle class="svadmin-u-dc7972ebf3f3 svadmin-u-11e59c6d5f6b" /> {conflictCount} {i18n.t('permissions.conflicts') || 'conflicting rules'}
          </div>
        {/if}
      </div>
      
      <!-- Table Area -->
      <div class="svadmin-u-36e579c0b41c svadmin-u-73fc3fb18ceb svadmin-u-8e63407b5ceb">
        <table class="svadmin-u-a1e7a8069878 svadmin-u-5f22e64f2282 svadmin-u-2cd02d11d1af svadmin-u-438b2237b8d6 svadmin-u-3daca9af0861 svadmin-u-a10fdd7667ee">
          <thead class="svadmin-u-358af0b65a31">
            <tr>
              <th scope="col" class="svadmin-u-1b2d54a3fd12 svadmin-u-fafb9e0bfb6a svadmin-u-fdb4af3ae0bc svadmin-u-2eba0d65d059 svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-74b2435a1d40">{i18n.t('permissions.resources') || 'Resources'}</th>
              {#each actions as action, _i (_i)}
                <th scope="col" class="svadmin-u-d5eab218aa34 svadmin-u-1b2d54a3fd12 svadmin-u-ca6bf63030aa svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
                  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9">
                    <span>{action.name}</span>
                    <span class="svadmin-u-1dc571a3609f svadmin-u-bfa603190748 svadmin-u-0e65706bcccd">{action.code}</span>
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="svadmin-u-cd0ad9a56558">
            {#if resources.length === 0}
              <tr>
                 <td colspan={actions.length + 1} class="svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">{i18n.t('permissions.noResources') || 'No resources available'}</td>
              </tr>
            {/if}
            {#each resources as resource, i (i)}
              <!-- Section Grouping Header -->
              {#if resource.section && (i === 0 || resource.section !== resources[i-1].section)}
                <tr class="svadmin-u-989c466fdbe7">
                  <td colspan="{actions.length + 1}" class="svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-359090c2d529 svadmin-u-69450ef1487e svadmin-u-20aaf08a7ed1">{resource.section}</td>
                </tr>
              {/if}
              
              <tr class="svadmin-u-a951c7ab6715 svadmin-u-39f703dbe296 svadmin-u-ceb69a6b0e5f">
                <td class="svadmin-u-e82ae8be04aa svadmin-u-1b2d54a3fd12 svadmin-u-fdb4af3ae0bc svadmin-u-fafb9e0bfb6a svadmin-u-fc7473ca09eb">
                  <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{resource.name}</div>
                  <div class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0e65706bcccd">{resource.code}</div>
                </td>
                
                <!-- Action Checkboxes -->
                {#each actions as action, _i (_i)}
                  {@const granted = selectedRole ? isGranted(selectedRole, resource.code, action.code) : false}
                  <td class="svadmin-u-e82ae8be04aa svadmin-u-0e17f2bd9074 svadmin-u-1b2d54a3fd12 svadmin-u-ca6bf63030aa">
                    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227">
                      <button 
                        disabled={loading || !selectedRole}
                        aria-label="Toggle {action.name}"
                        onclick={() => onToggle(selectedRole as string, resource.code, action.code, !granted)}
                        class="svadmin-u-7ec10f86d9b1 svadmin-u-f6fe902450dc svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-0fe7d7d814d0 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-094cedcfedfd {granted ? 'svadmin-u-75b1bec3ea0e svadmin-u-6cbc84dd9e1a svadmin-u-30ca335ae9c2' : 'svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0557b88819cd'} {loading || !selectedRole ? 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162' : 'svadmin-u-34516836730d'}"
                      >
                        <svg class="svadmin-u-bf600f8e029c svadmin-u-7fc7f732bf7e {granted ? 'svadmin-u-0214b4b355d1' : 'svadmin-u-99d72c7fc3e2'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
