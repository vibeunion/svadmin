<script lang="ts">
    import {
    Building2,
    ChevronDown,
    Check,
    Search,
        Clock,
    Plus,
    Users,
      ArrowRightLeft,
    Settings,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface TenantRole {
    id: string;
    name: string;
    isPrimary?: boolean | undefined;
  }

  export interface TenantItem {
    id: string;
    name: string;
    code?: string | undefined;
    type?: 'group' | 'subsidiary' | 'division' | 'store' | 'workspace' | undefined;
    logo?: string | undefined;
    tier?: 'free' | 'pro' | 'enterprise' | undefined;
    roles?: (TenantRole | string)[] | undefined;
    status?: 'active' | 'suspended' | 'trial' | undefined;
    memberCount?: number | undefined;
    description?: string | undefined;
    parentId?: string | undefined;
  }

  export interface TenantContextSwitcherProps {
    currentTenantId?: string | undefined;
    tenants?: TenantItem[] | undefined;
    recentTenantIds?: string[] | undefined;
    userRole?: string | undefined;
    isSwitching?: boolean | undefined;
    allowCreate?: boolean | undefined;
    placeholder?: string | undefined;
    searchPlaceholder?: string | undefined;
    class?: string | undefined;
    onTenantSelect?: ((tenant: TenantItem) => void | Promise<void>) | undefined;
    onCreateTenant?: (() => void) | undefined;
    onManageWorkspaces?: (() => void) | undefined;
  }

  let {
    currentTenantId = $bindable('tenant-corp-01'),
    tenants = [
      { id: 'tenant-corp-01', name: '星谷数智总集团', code: 'HQ-GLOBAL', type: 'group', tier: 'enterprise', memberCount: 1280, status: 'active' },
      { id: 'tenant-east-02', name: '华东大区创新科技中心', code: 'DIV-EAST', type: 'subsidiary', tier: 'enterprise', memberCount: 420, status: 'active' },
      { id: 'tenant-cloud-03', name: 'SupaCloud 云原生实验室', code: 'LAB-CLOUD', type: 'workspace', tier: 'pro', memberCount: 65, status: 'active' },
      { id: 'tenant-sandbox-04', name: '金融合规验收隔离沙箱', code: 'FIN-SANDBOX', type: 'subsidiary', tier: 'pro', memberCount: 18, status: 'trial' },
    ],
    recentTenantIds = ['tenant-corp-01', 'tenant-east-02'],
    userRole = '全局系统主管',
    isSwitching = false,
    allowCreate = true,
    placeholder = '选择工作区/租户',
    searchPlaceholder = '搜索租户名称或编号…',
    class: className = '',
    onTenantSelect,
    onCreateTenant,
    onManageWorkspaces,
  }: TenantContextSwitcherProps = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');

  let currentTenant = $derived(
    tenants.find((t) => t.id === currentTenantId) ?? tenants[0]
  );

  let filteredTenants = $derived(
    tenants.filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.code && t.code.toLowerCase().includes(q));
    })
  );

  let recentTenants = $derived(
    recentTenantIds
      .map((id) => tenants.find((t) => t.id === id))
      .filter((t): t is TenantItem => Boolean(t))
  );

  function handleSelect(tenant: TenantItem) {
    if (tenant.status === 'suspended') return;
    currentTenantId = tenant.id;
    isOpen = false;
    onTenantSelect?.(tenant);
  }

  function getTypeBadge(type: TenantItem['type']) {
    switch (type) {
      case 'group':
        return { label: '集团总部', class: 'bg-primary/10 text-primary border-primary/20' };
      case 'subsidiary':
        return { label: '子公司', class: 'bg-info/10 text-info border-info/20' };
      case 'division':
        return { label: '事业部', class: 'bg-warning/10 text-warning border-warning/20' };
      case 'store':
        return { label: '门店/网点', class: 'bg-secondary text-secondary-foreground border-border' };
      default:
        return { label: '工作区', class: 'bg-muted text-muted-foreground border-border' };
    }
  }

  function getTierBadge(tier: TenantItem['tier']) {
    switch (tier) {
      case 'enterprise':
        return { label: '旗舰版', class: 'bg-primary/10 text-primary border-primary/20' };
      case 'pro':
        return { label: '专业版', class: 'bg-success/10 text-success border-success/20' };
      default:
        return { label: '基础版', class: 'bg-muted text-muted-foreground border-border' };
    }
  }
</script>

<div
  class={cn('relative inline-block text-left', className)}
  data-svadmin-component="tenant-context-switcher"
>
  <!-- 切换触发器按钮 -->
  <button
    type="button"
    class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    onclick={() => (isOpen = !isOpen)}
  >
    <div class="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
      {#if currentTenant?.logo}
        <img src={currentTenant.logo} alt={currentTenant.name} class="w-full h-full rounded-md object-cover" />
      {:else}
        <Building2 class="w-4 h-4" />
      {/if}
    </div>

    <div class="flex flex-col text-left">
      <div class="flex items-center gap-1.5">
        <span class="font-medium text-sm leading-tight tracking-tight text-foreground line-clamp-1 max-w-[160px]">
          {currentTenant?.name ?? placeholder}
        </span>
        {#if currentTenant?.tier}
          {@const tier = getTierBadge(currentTenant.tier)}
          <span class={cn('text-[10px] font-medium px-1.5 py-0.2 rounded border leading-none', tier.class)}>
            {tier.label}
          </span>
        {/if}
      </div>
      <span class="text-[11px] text-muted-foreground leading-tight">
        {currentTenant?.code ?? userRole}
      </span>
    </div>

    <div class="ml-1 text-muted-foreground">
      {#if isSwitching}
        <ArrowRightLeft class="w-3.5 h-3.5 animate-spin text-primary" />
      {:else}
        <ChevronDown class={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
      {/if}
    </div>
  </button>

  <!-- 浮层下拉面板 -->
  {#if isOpen}
    <div
      class="fixed inset-0 z-40"
      onclick={() => (isOpen = false)}
      aria-hidden="true"
    ></div>

    <div
      class="absolute left-0 mt-1.5 w-80 rounded-xl border border-border bg-card text-foreground shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-150"
      role="listbox"
    >
      <!-- 搜索栏 -->
      <div class="p-2.5 border-b border-border bg-muted/20">
        <div class="relative flex items-center">
          <Search class="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={searchPlaceholder}
            class="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <!-- 最近访问 -->
      {#if recentTenants.length > 0 && !searchQuery}
        <div class="px-3 pt-2 pb-1 border-b border-border/50">
          <div class="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1.5">
            <Clock class="w-3 h-3" />
            <span>最近访问</span>
          </div>
          <div class="flex flex-wrap gap-1 mb-1">
            {#each recentTenants as recent (recent.id)}
              <button
                type="button"
                class={cn(
                  'text-xs px-2 py-1 rounded-md border text-left transition-colors flex items-center gap-1.5',
                  recent.id === currentTenantId
                    ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                    : 'border-border bg-muted/30 text-foreground hover:bg-muted'
                )}
                onclick={() => handleSelect(recent)}
              >
                <span class="truncate max-w-[100px]">{recent.name}</span>
                {#if recent.id === currentTenantId}
                  <Check class="w-3 h-3 text-primary" />
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- 租户列表 -->
      <div class="max-h-60 overflow-y-auto p-1.5 divide-y divide-border/30">
        {#if filteredTenants.length === 0}
          <div class="py-6 text-center text-xs text-muted-foreground">
            未检索到匹配的租户或工作区
          </div>
        {:else}
          {#each filteredTenants as tenant (tenant.id)}
            {@const isSelected = tenant.id === currentTenantId}
            {@const typeBadge = getTypeBadge(tenant.type)}
            {@const isSuspended = tenant.status === 'suspended'}
            <button
              type="button"
              class={cn(
                'w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors',
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground',
                isSuspended && 'opacity-60 cursor-not-allowed'
              )}
              disabled={isSuspended}
              onclick={() => handleSelect(tenant)}
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground border border-border shrink-0">
                  <Building2 class="w-3.5 h-3.5" />
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class={cn('text-xs font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                      {tenant.name}
                    </span>
                    <span class={cn('text-[9px] px-1 py-0.2 rounded border leading-none shrink-0', typeBadge.class)}>
                      {typeBadge.label}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {#if tenant.code}
                      <span>{tenant.code}</span>
                    {/if}
                    {#if tenant.memberCount}
                      <span class="flex items-center gap-0.5">
                        <Users class="w-2.5 h-2.5" />
                        {tenant.memberCount} 成员
                      </span>
                    {/if}
                    {#if isSuspended}
                      <span class="text-destructive font-medium">已停用</span>
                    {/if}
                  </div>
                </div>
              </div>

              {#if isSelected}
                <Check class="w-4 h-4 text-primary shrink-0 ml-2" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- 底部操作区 -->
      <div class="p-1.5 border-t border-border bg-muted/30 flex items-center justify-between gap-1 text-xs">
        {#if allowCreate}
          <button
            type="button"
            class="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground hover:bg-muted font-medium transition-colors"
            onclick={() => {
              isOpen = false;
              onCreateTenant?.();
            }}
          >
            <Plus class="w-3.5 h-3.5 text-primary" />
            <span>创建新租户</span>
          </button>
        {/if}

        <button
          type="button"
          class="flex items-center gap-1 px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto"
          onclick={() => {
            isOpen = false;
            onManageWorkspaces?.();
          }}
        >
          <Settings class="w-3 h-3" />
          <span>组织管理</span>
        </button>
      </div>
    </div>
  {/if}
</div>
