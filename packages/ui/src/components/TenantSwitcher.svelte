<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronsUpDown, Building2, Check } from '@lucide/svelte';
  import * as DropdownMenu from './ui/dropdown-menu/index.js';
  import type { Tenant } from '../types.js';

  let {
    tenants = [],
    currentTenantId = $bindable(undefined as string | undefined),
    collapsed = false,
    onSwitch,
    headerSnippet,
  }: {
    tenants: Tenant[];
    currentTenantId?: string;
    collapsed?: boolean;
    onSwitch?: (tenantId: string) => void;
    headerSnippet?: Snippet;
  } = $props();

  let currentTenant = $derived(tenants.find(t => t.id === currentTenantId) ?? tenants[0]);

  function selectTenant(id: string) {
    currentTenantId = id;
    onSwitch?.(id);
  }
</script>

{#if tenants.length > 0}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props }: { props: Record<string, unknown> })}
        <button
          type="button"
          {...props}
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/50
            {collapsed ? 'justify-center' : ''}"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
            {#if currentTenant?.logo}
              <img src={currentTenant.logo} alt={currentTenant.name} class="h-full w-full rounded-lg object-cover" />
            {:else}
              <Building2 class="h-4 w-4" />
            {/if}
          </div>
          {#if !collapsed}
            <div class="flex-1 min-w-0">
              <p class="truncate text-sm font-semibold text-sidebar-foreground">{currentTenant?.name ?? 'Select'}</p>
              <p class="truncate text-[10px] text-sidebar-foreground/50">Workspace</p>
            </div>
            <ChevronsUpDown class="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
          {/if}
        </button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-56">
      {#if headerSnippet}
        <div class="px-2 py-1.5">
          {@render headerSnippet()}
        </div>
        <DropdownMenu.Separator />
      {/if}
      <div class="px-2 py-1.5 text-xs text-muted-foreground">Workspaces</div>
      {#each tenants as tenant, _i (_i)}
        <DropdownMenu.Item
          class="flex items-center gap-3 cursor-pointer"
          onclick={() => selectTenant(tenant.id)}
        >
          <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
            {#if tenant.logo}
              <img src={tenant.logo} alt={tenant.name} class="h-full w-full rounded object-cover" />
            {:else}
              {tenant.name.charAt(0).toUpperCase()}
            {/if}
          </div>
          <span class="flex-1 truncate">{tenant.name}</span>
          {#if tenant.id === currentTenant?.id}
            <Check class="h-4 w-4 text-primary" />
          {/if}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
