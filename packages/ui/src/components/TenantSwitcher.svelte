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
          class="svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-5f22e64f2282 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2eba0d65d059 svadmin-u-ceb69a6b0e5f svadmin-u-55d1f8b9d318
            {collapsed ? 'svadmin-u-86843cf1e227' : ''}"
        >
          <div class="svadmin-u-60fbb7713999 svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-fc7473ca09eb svadmin-u-69450ef1487e">
            {#if currentTenant?.logo}
              <img src={currentTenant.logo} alt={currentTenant.name} class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-7d85d0c21a32" />
            {:else}
              <Building2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            {/if}
          </div>
          {#if !collapsed}
            <div class="svadmin-u-36e579c0b41c svadmin-u-7e0b7cdf1a94">
              <p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-a7a63217e098">{currentTenant?.name ?? 'Select'}</p>
              <p class="svadmin-u-f283ea9bea0e svadmin-u-1dc571a3609f svadmin-u-68d55a736ff4">Workspace</p>
            </div>
            <ChevronsUpDown class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-3e3534b4c5df" />
          {/if}
        </button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="svadmin-u-d16aae848835">
      {#if headerSnippet}
        <div class="svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b">
          {@render headerSnippet()}
        </div>
        <DropdownMenu.Separator />
      {/if}
      <div class="svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-bfa603190748">Workspaces</div>
      {#each tenants as tenant, _i (_i)}
        <DropdownMenu.Item
          class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-34516836730d"
          onclick={() => selectTenant(tenant.id)}
        >
          <div class="svadmin-u-60fbb7713999 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-359090c2d529 svadmin-u-69450ef1487e">
            {#if tenant.logo}
              <img src={tenant.logo} alt={tenant.name} class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-7d85d0c21a32" />
            {:else}
              {tenant.name.charAt(0).toUpperCase()}
            {/if}
          </div>
          <span class="svadmin-u-36e579c0b41c svadmin-u-f283ea9bea0e">{tenant.name}</span>
          {#if tenant.id === currentTenant?.id}
            <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1" />
          {/if}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
