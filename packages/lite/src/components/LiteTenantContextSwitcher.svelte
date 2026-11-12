<script lang="ts">
  export interface TenantRole {
    id: string;
    name: string;
    isPrimary?: boolean;
  }

  export interface TenantItem {
    id: string;
    name: string;
    code?: string;
    type?: 'group' | 'subsidiary' | 'division' | 'store' | 'workspace';
    logo?: string;
    tier?: 'free' | 'pro' | 'enterprise';
    roles?: (TenantRole | string)[];
    status?: 'active' | 'suspended' | 'trial';
    memberCount?: number;
    description?: string;
    parentId?: string;
  }

  interface Props {
    currentTenantId?: string;
    tenants?: TenantItem[];
    userRole?: string;
    class?: string;
  }

  let {
    currentTenantId = 'tenant-corp-01',
    tenants = [
      { id: 'tenant-corp-01', name: '星谷数智总集团', code: 'HQ-GLOBAL', type: 'group', tier: 'enterprise' },
      { id: 'tenant-east-02', name: '华东大区创新科技中心', code: 'DIV-EAST', type: 'subsidiary', tier: 'enterprise' },
    ],
    userRole = '全局系统主管',
    class: className = '',
  }: Props = $props();

  const currentTenant = $derived(
    tenants.find((t) => t.id === currentTenantId) ?? tenants[0]
  );
</script>

<div
  class="lite-tenant-switcher {className}"
  data-svadmin-component="LiteTenantContextSwitcher"
  role="region"
  aria-label="Tenant Context Switcher"
>
  <div class="lite-tenant-trigger">
    <div class="lite-tenant-badge">
      <span class="lite-tenant-icon">🏢</span>
    </div>
    <div class="lite-tenant-info">
      <div class="lite-tenant-name-row">
        <span class="lite-tenant-name">{currentTenant?.name ?? '当前租户'}</span>
        {#if currentTenant?.tier}
          <span class="lite-tier-tag">{currentTenant.tier}</span>
        {/if}
      </div>
      <span class="lite-tenant-code">{currentTenant?.code ?? userRole}</span>
    </div>
    <span class="lite-caret">▼</span>
  </div>

  <div class="lite-tenant-noscript-list">
    <span class="lite-list-title">可用组织与工作区 (SSR 降级静态展示):</span>
    <ul class="lite-tenants-ul">
      {#each tenants as t (t.id)}
        <li class="lite-tenant-li" class:lite-tenant-active={t.id === currentTenantId}>
          <span class="lite-tenant-bullet">•</span>
          <span class="lite-tenant-li-name">{t.name}</span>
          {#if t.code}<span class="lite-tenant-li-code">({t.code})</span>{/if}
          {#if t.id === currentTenantId}<span class="lite-active-mark">[当前]</span>{/if}
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .lite-tenant-switcher {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
    padding: 8px 12px;
  }
  .lite-tenant-trigger {
    display: flex;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px dashed #e5e6eb;
  }
  .lite-tenant-trigger > * + * { margin-left: 8px; }
  .lite-tenant-badge {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: #f2f3f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .lite-tenant-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .lite-tenant-name-row {
    display: flex;
    align-items: center;
  }
  .lite-tenant-name-row > * + * { margin-left: 6px; }
  .lite-tenant-name {
    font-weight: 600;
    color: #1d2129;
  }
  .lite-tier-tag {
    font-size: 9px;
    background: #e8f3ff;
    color: #165dff;
    padding: 1px 4px;
    border-radius: 2px;
    text-transform: uppercase;
  }
  .lite-tenant-code {
    font-size: 10px;
    color: #86909c;
  }
  .lite-caret {
    font-size: 10px;
    color: #86909c;
  }
  .lite-tenant-noscript-list {
    margin-top: 6px;
    font-size: 11px;
    color: #4e5969;
  }
  .lite-list-title {
    font-size: 10px;
    color: #86909c;
  }
  .lite-tenants-ul {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
  }
  .lite-tenant-li {
    display: flex;
    align-items: center;
    padding: 2px 0;
  }
  .lite-tenant-li > * + * { margin-left: 4px; }
  .lite-tenant-active {
    color: #165dff;
    font-weight: 600;
  }
  .lite-active-mark {
    font-size: 10px;
    color: #165dff;
  }
</style>
