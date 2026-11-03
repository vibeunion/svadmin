<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import IconSecurity from './icons/IconSecurity.svelte';
  import IconTenant from './icons/IconTenant.svelte';
  import IconApprove from './icons/IconApprove.svelte';

  export interface RoleItem {
    /** Unique role identifier */
    key: string;
    /** Human-readable role display name */
    label: string;
    /** Short role description */
    description?: string;
    /** Permissions array associated with this role */
    permissions?: string[];
    /** Organization or tenant name */
    tenant?: string;
    /** Optional badge text or tag */
    badge?: string;
    /** Whether the role is disabled */
    disabled?: boolean;
  }

  export interface RoleSwitcherProps {
    /** List of available mock roles */
    roles?: RoleItem[];
    /** Currently active role key */
    activeRole?: string;
    /** Title shown in the role switcher drawer/popover */
    title?: string;
    /** Trigger button label override */
    triggerText?: string;
    /** Compact mode (icon or minimal badge only) */
    compact?: boolean;
    /** Callback when a role is selected */
    onroleswitch?: (role: RoleItem) => void;
    /** Callback when reset to standard role */
    onreset?: () => void;
    /** Custom extra action in footer */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    roles = [
      {
        key: 'super_admin',
        label: '超级管理员',
        description: '系统最高权限，具备所有模块的写操作、系统审计与多租户管理权限',
        permissions: ['system:write', 'user:admin', 'audit:export', 'tenant:full'],
        tenant: '全平台 (Root)',
        badge: '全量',
      },
      {
        key: 'operator',
        label: '运营专家',
        description: '负责业务数据运营、活动流转与内容审核，不可修改核心系统配置',
        permissions: ['order:read', 'order:audit', 'marketing:write', 'content:publish'],
        tenant: '华东大区运营中心',
      },
      {
        key: 'developer',
        label: '研发技术专员',
        description: '拥有 API 网关配置、自动化脚本调试与系统监控诊断权限',
        permissions: ['gateway:config', 'monitor:read', 'devtools:debug'],
        tenant: '技术工程部',
      },
      {
        key: 'auditor',
        label: '合规审计员',
        description: '仅具备全局只读与全量不可篡改审计日志导出检索权限',
        permissions: ['audit:read', 'audit:export', 'log:immutable'],
        tenant: '风险与合规法务组',
        badge: '只读',
      },
      {
        key: 'guest',
        label: '访客体验角色',
        description: '仅用于公共视图预览，受限于最低数据展示策略',
        permissions: ['public:view'],
        tenant: '演示沙盒环境',
        disabled: false,
      },
    ],
    activeRole = 'super_admin',
    title = '角色与权限模拟器',
    triggerText,
    compact = false,
    onroleswitch,
    onreset,
    extra,
    class: className = '',
  }: RoleSwitcherProps = $props();

  let isOpen = $state(false);
  let selectedRoleKey = $state(activeRole);
  $effect(() => {
    selectedRoleKey = activeRole;
  });

  const currentRole = $derived(roles.find((r) => r.key === selectedRoleKey) || roles[0]);

  function handleSelect(role: RoleItem) {
    if (role.disabled) return;
    selectedRoleKey = role.key;
    onroleswitch?.(role);
    isOpen = false;
  }

  function handleReset() {
    selectedRoleKey = roles[0]?.key || 'super_admin';
    const fallback = roles[0];
    if (fallback) {
      onroleswitch?.(fallback);
    }
    onreset?.();
    isOpen = false;
  }
</script>

<div
  data-svadmin-component="RoleSwitcher"
  class={cn('svadmin-role-switcher relative inline-block text-foreground', className)}
>
  <!-- Trigger Button -->
  <button
    type="button"
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    onclick={() => (isOpen = !isOpen)}
    class={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/70 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-primary',
      isOpen && 'border-primary ring-1 ring-primary'
    )}
  >
    <div class="flex items-center justify-center w-5 h-5 rounded-[4px] bg-primary/10 text-primary shrink-0">
      <IconSecurity size={13} />
    </div>
    {#if !compact}
      <div class="flex flex-col text-left">
        <span class="text-[10px] text-muted-foreground leading-tight">模拟角色</span>
        <span class="font-semibold text-xs leading-none">{triggerText || currentRole.label}</span>
      </div>
    {/if}
    <span class="inline-block px-1.5 py-0.2 rounded-[2px] bg-primary/15 text-[10px] text-primary font-mono font-medium">
      {currentRole.key}
    </span>
    <svg
      class={cn('w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Overlay Dropdown Card -->
  {#if isOpen}
    <!-- Backdrop to close -->
    <div
      class="fixed inset-0 z-40"
      tabindex="-1"
      role="presentation"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    ></div>

    <div
      role="dialog"
      aria-label={title}
      class="absolute right-0 top-full mt-1.5 z-50 w-80 sm:w-96 rounded-[4px] border border-border bg-card p-3.5 shadow-xl text-xs flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div class="flex items-center gap-2">
          <IconTenant size={15} class="text-primary" />
          <span class="font-semibold text-sm">{title}</span>
        </div>
        <button
          type="button"
          onclick={handleReset}
          class="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          重置默认
        </button>
      </div>

      <!-- Role Items List -->
      <div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {#each roles as role}
          {@const isSelected = role.key === selectedRoleKey}
          <button
            type="button"
            disabled={role.disabled}
            onclick={() => handleSelect(role)}
            class={cn(
              'group w-full flex flex-col items-start gap-1 p-2.5 rounded-[4px] border transition-all text-left cursor-pointer',
              isSelected
                ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                : 'border-border/60 hover:border-border hover:bg-muted/40',
              role.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <span class={cn('font-medium text-xs', isSelected ? 'text-primary font-semibold' : 'text-foreground')}>
                  {role.label}
                </span>
                {#if role.badge}
                  <span class="px-1.5 py-0.5 rounded-[2px] bg-primary/10 text-primary text-[10px] font-medium">
                    {role.badge}
                  </span>
                {/if}
              </div>
              {#if isSelected}
                <span class="flex items-center gap-1 text-[11px] text-primary font-medium">
                  <IconApprove size={13} />
                  已生效
                </span>
              {/if}
            </div>

            {#if role.description}
              <p class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {role.description}
              </p>
            {/if}

            {#if role.tenant}
              <div class="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5">
                <span>所属部门/租户:</span>
                <span class="font-medium text-foreground/80">{role.tenant}</span>
              </div>
            {/if}

            {#if role.permissions && role.permissions.length > 0}
              <div class="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/40 w-full">
                {#each role.permissions.slice(0, 4) as perm}
                  <span class="px-1 py-0.2 rounded-[2px] bg-muted text-[10px] text-muted-foreground font-mono">
                    {perm}
                  </span>
                {/each}
                {#if role.permissions.length > 4}
                  <span class="text-[10px] text-muted-foreground/70 self-center">
                    +{role.permissions.length - 4}
                  </span>
                {/if}
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Footer Actions -->
      {#if extra}
        <div class="pt-2 border-t border-border flex items-center justify-end">
          {@render extra()}
        </div>
      {/if}
    </div>
  {/if}
</div>
