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

<div class="h-full flex flex-col pt-2">
  <!-- Header Title -->
  <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
        <Shield class="w-6 h-6 text-primary" />
        {i18n.t('permissions.title') || 'Permission Matrix'}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">{i18n.t('permissions.description') || 'Configure authorization rules for system modules and roles.'}</p>
    </div>
    
    <!-- Toast Feedback -->
    {#if message}
      <div class={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2 ${messageType === 'success' ? 'bg-success/10 text-success ring-1 ring-success/20' : 'bg-destructive/10 text-destructive ring-1 ring-destructive/20'}`}>
        {#if messageType === 'success'}
           <Check class="w-4 h-4" />
        {:else}
           <AlertCircle class="w-4 h-4" />
        {/if}
        {message}
      </div>
    {/if}
  </div>

  <div class="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
    <div class="w-full rounded-lg border border-border bg-card p-4 shadow-sm lg:hidden">
      <label for="permission-role-select" class="mb-2 block text-sm font-medium text-foreground">{i18n.t('permissions.roles') || 'Roles'}</label>
      <select id="permission-role-select" bind:value={selectedRole} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" disabled={roles.length === 0}>
        {#each roles as role (role.code)}<option value={role.code}>{role.name}</option>{/each}
      </select>
      {#if roles.length === 0}<p class="mt-2 text-sm text-muted-foreground">{i18n.t('permissions.noRoles') || 'No roles available'}</p>{/if}
      {#if sidebarExtra}<div class="mt-4 border-t border-border pt-4">{@render sidebarExtra()}</div>{/if}
    </div>

    <!-- Left: Role Selector Sidebar -->
    <div class="hidden w-full flex-shrink-0 flex-col rounded-lg border border-border bg-card p-4 shadow-sm lg:flex lg:w-64">
      <h2 class="mb-4 px-2 text-sm font-semibold text-muted-foreground">{i18n.t('permissions.roles') || 'Roles'}</h2>
      <div class="space-y-1 flex-1 overflow-y-auto">
        {#each roles as role, _i (_i)}
          <button 
            onclick={() => selectedRole = role.code}
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 {selectedRole === role.code ? 'bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/20' : 'text-foreground hover:bg-muted'}"
          >
            {role.name}
            <div class="mt-0.5 font-mono text-[10px] opacity-60">{role.code}</div>
          </button>
        {/each}
        {#if roles.length === 0}
          <p class="text-center text-muted-foreground text-sm p-4">{i18n.t('permissions.noRoles') || 'No roles available'}</p>
        {/if}
      </div>
      
      <!-- Slot for Upper Logic inject (e.g. Org Switcher, Security Level Filter) -->
      {#if sidebarExtra}
         <div class="mt-4 pt-4 border-t border-border">
           {@render sidebarExtra()}
         </div>
      {/if}
    </div>

    <!-- Right: Matrix Grid -->
    <div class="flex-1 bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col">
      <!-- Matrix Header -->
      <div class="p-5 border-b border-border bg-muted/30 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h2 class="text-lg font-bold text-foreground">{i18n.t('permissions.currentRole') || 'Current role'}:
              <span class="text-primary">{roles.find(r => r.code === selectedRole)?.name || (i18n.t('permissions.noneSelected') || 'None selected')}</span>
            </h2>
            <p class="text-xs text-muted-foreground mt-1">{i18n.t('permissions.toggleHint') || 'Toggle checkboxes to grant or revoke permissions'}</p>
          </div>

          <!-- Slot for header extra logic -->
          {#if headerExtra}
            {@render headerExtra()}
          {/if}
        </div>
        
        {#if conflictCount > 0}
          <div class="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium ring-1 ring-destructive/20 flex items-center gap-1.5">
            <AlertCircle class="w-4 h-4" /> {conflictCount} {i18n.t('permissions.conflicts') || 'conflicting rules'}
          </div>
        {/if}
      </div>
      
      <!-- Table Area -->
      <div class="flex-1 overflow-auto p-4">
        <table class="min-w-full rounded-lg overflow-hidden shadow-sm ring-1 ring-border/10">
          <thead class="bg-muted/50">
            <tr>
              <th scope="col" class="py-3 pr-3 pl-4 text-left text-sm font-semibold text-foreground w-48">{i18n.t('permissions.resources') || 'Resources'}</th>
              {#each actions as action, _i (_i)}
                <th scope="col" class="px-2 py-3 text-center text-sm font-semibold text-foreground">
                  <div class="flex flex-col items-center">
                    <span>{action.name}</span>
                    <span class="text-[10px] text-muted-foreground font-mono">{action.code}</span>
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="bg-card">
            {#if resources.length === 0}
              <tr>
                 <td colspan={actions.length + 1} class="py-10 text-center text-muted-foreground">{i18n.t('permissions.noResources') || 'No resources available'}</td>
              </tr>
            {/if}
            {#each resources as resource, i (i)}
              <!-- Section Grouping Header -->
              {#if resource.section && (i === 0 || resource.section !== resources[i-1].section)}
                <tr class="bg-primary/5">
                  <td colspan="{actions.length + 1}" class="px-4 py-2 text-xs font-bold text-primary">{resource.section}</td>
                </tr>
              {/if}
              
              <tr class="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                <td class="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
                  <div class="font-medium text-foreground">{resource.name}</div>
                  <div class="text-xs text-muted-foreground font-mono">{resource.code}</div>
                </td>
                
                <!-- Action Checkboxes -->
                {#each actions as action, _i (_i)}
                  {@const granted = selectedRole ? isGranted(selectedRole, resource.code, action.code) : false}
                  <td class="whitespace-nowrap px-3 py-3 text-center">
                    <div class="flex items-center justify-center">
                      <button 
                        disabled={loading || !selectedRole}
                        aria-label="Toggle {action.name}"
                        onclick={() => onToggle(selectedRole as string, resource.code, action.code, !granted)}
                        class="w-6 h-6 rounded border flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 {granted ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent'} {loading || !selectedRole ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                      >
                        <svg class="w-3.5 h-3.5 {granted ? 'block' : 'hidden'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
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
