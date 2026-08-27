<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { AutoTable, Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import * as DropdownMenu from '@svadmin/ui/components/ui/dropdown-menu/index.js';
  import {
    CheckCircle2,
    Clock3,
    KeyRound,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Table2,
    UserCog,
    UserPlus,
  } from '@lucide/svelte';
  import { readHashParam, readHashView, replaceHashParam } from '../utils/hashView';

  const i18n = useTranslation();

  interface User {
    id: number;
    name: string;
    email: string;
    roleId: number;
    status: string;
    department: string;
    lastActiveAt: string;
  }

  interface Role {
    id: number;
    name: string;
    slug?: string;
    scope: string;
    level: string;
    description?: string;
  }

  interface Permission {
    id: number;
    module: string;
    action: string;
    roleId: number;
    effect: string;
    updatedAt: string;
    notes?: string;
  }

  interface UserAccount {
    id: number;
    userId: number;
    accountType: string;
    status: string;
    lastSignInAt: string;
    notes?: string;
  }

  interface UserLog {
    id: number;
    userId: number;
    event: string;
    ipAddress: string;
    severity: string;
    createdAt: string;
    details?: string;
  }

  interface UserSetting {
    id: number;
    setting: string;
    scope: string;
    status: string;
    ownerId: number;
    updatedAt: string;
  }

  type UserManagementResource = 'users' | 'roles' | 'permissions' | 'user_accounts' | 'user_logs' | 'user_settings';

  let { resourceName = 'users' } = $props<{ resourceName?: string }>();
  let activeView = $state(readHashView('default'));
  let sortField = $state(readHashParam('sort') ?? 'name');
  let sortOrder = $state(readHashParam('order') ?? 'asc');
  let roleSearch = $state('');
  let selectedRoleId = $state<number | null>(null);
  let userRoleFilter = $state<number | null>(null);
  let userStatusFilter = $state('');
  let showRecords = $state(readHashParam('records') === '1');

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const activeResource = $derived((['users', 'roles', 'permissions', 'user_accounts', 'user_logs', 'user_settings'].includes(resourceName) ? resourceName : 'users') as UserManagementResource);

  const usersQuery = useList({ resource: 'users', pagination: { mode: 'off' } });
  const rolesQuery = useList({ resource: 'roles', pagination: { mode: 'off' } });
  const permissionsQuery = useList({ resource: 'permissions', pagination: { mode: 'off' } });
  const accountsQuery = useList({ resource: 'user_accounts', pagination: { mode: 'off' } });
  const logsQuery = useList({ resource: 'user_logs', pagination: { mode: 'off' } });
  const settingsQuery = useList({ resource: 'user_settings', pagination: { mode: 'off' } });

  const users = $derived((usersQuery.data?.data ?? []) as unknown as User[]);
  const roles = $derived((rolesQuery.data?.data ?? []) as unknown as Role[]);
  const permissions = $derived((permissionsQuery.data?.data ?? []) as unknown as Permission[]);
  const accounts = $derived((accountsQuery.data?.data ?? []) as unknown as UserAccount[]);
  const logs = $derived((logsQuery.data?.data ?? []) as unknown as UserLog[]);
  const settings = $derived((settingsQuery.data?.data ?? []) as unknown as UserSetting[]);
  const filteredUsers = $derived(users.filter((user) =>
    (userRoleFilter === null || user.roleId === userRoleFilter)
    && (!userStatusFilter || user.status === userStatusFilter)
  ));

  const activeUsers = $derived(users.filter((user) => user.status === 'active').length);
  const lockedAccounts = $derived(accounts.filter((account) => account.status === 'locked').length);
  const criticalLogs = $derived(logs.filter((log) => log.severity === 'critical' || log.severity === 'warning').length);
  const enabledSettings = $derived(settings.filter((setting) => setting.status === 'enabled').length);

  const roleCards = $derived.by(() => roles.map((role) => {
    const assignedUsers = users.filter((user) => user.roleId === role.id);
    const rolePermissions = permissions.filter((permission) => permission.roleId === role.id);
    return {
      ...role,
      assignedUsers,
      permissionCount: rolePermissions.length,
      permissions: rolePermissions,
      slug: role.slug ?? roleSlug(role.name),
    };
  }));
  const filteredRoleCards = $derived.by(() => {
    const queryText = roleSearch.trim().toLowerCase();
    const sorted = [...roleCards].sort((a, b) => {
      const field = sortField === 'slug' ? 'slug' : 'name';
      const direction = sortOrder === 'desc' ? -1 : 1;
      return a[field].localeCompare(b[field]) * direction;
    });
    if (!queryText) return sorted;
    return sorted.filter((role) => [
      role.name,
      role.slug,
      role.scope,
      role.level,
      ...role.permissions.map(permissionLabel),
    ].some((value) => value.toLowerCase().includes(queryText)));
  });
  const selectedRole = $derived(roleCards.find((role) => role.id === selectedRoleId) ?? roleCards[0]);
  const selectedPermissionDomains = $derived.by(() => {
    if (!selectedRole) return [];
    const domains: { module: string; permissions: Permission[] }[] = [];
    for (const permission of selectedRole.permissions) {
      const existing = domains.find((domain) => domain.module === permission.module);
      if (existing) {
        existing.permissions = [...existing.permissions, permission];
      } else {
        domains.push({ module: permission.module, permissions: [permission] });
      }
    }
    return domains;
  });
  const focusedRoleId = $derived.by(() => {
    if (!activeView.startsWith('role-')) return null;
    const id = Number(activeView.replace('role-', ''));
    return Number.isFinite(id) ? id : null;
  });
  const visiblePermissions = $derived(
    focusedRoleId ? permissions.filter((permission) => permission.roleId === focusedRoleId) : permissions,
  );
  const focusedRoleName = $derived(focusedRoleId ? roleName(focusedRoleId) : null);
  const pageCopy = $derived.by(() => {
    const copies: Record<UserManagementResource, { badge: string; title: string; description: string; action: string; focus: string }> = {
      users: {
        badge: isZh ? '用户管理' : 'User Management',
        title: isZh ? '用户目录与入职工作台' : 'Users Directory and Onboarding Workspace',
        description: isZh ? '覆盖用户搜索、角色筛选、状态分组、最近登录与团队分配。' : 'Covers user search, role filters, status groups, recent sign-ins, and team assignment.',
        action: isZh ? '新增用户' : 'Add user',
        focus: isZh ? '成员入职' : 'Member onboarding',
      },
      roles: {
        badge: isZh ? '角色管理' : 'Role Management',
        title: isZh ? '角色管理' : 'Roles',
        description: isZh ? '用轻量资源表维护角色、Slug、权限摘要和操作入口。' : 'Maintain roles, slugs, permission summaries, and actions in a lightweight resource table.',
        action: isZh ? '新增角色' : 'Add role',
        focus: isZh ? '角色列表' : 'Roles list',
      },
      permissions: {
        badge: isZh ? '权限策略' : 'Permissions',
        title: isZh ? '权限策略与审批边界' : 'Permission Policies and Approval Boundaries',
        description: isZh ? '呈现模块、动作、角色和允许/复核/拒绝策略，方便快速审查授权边界。' : 'Shows modules, actions, roles, and allow/review/deny effects for fast access-boundary review.',
        action: isZh ? '新增权限' : 'Add permission',
        focus: isZh ? '策略审查' : 'Policy review',
      },
      user_accounts: {
        badge: isZh ? '账户安全' : 'Accounts',
        title: isZh ? '账户状态与登录风险' : 'Account Status and Sign-in Risk',
        description: isZh ? '集中查看账户类型、锁定状态、最近登录和风险说明。' : 'Reviews account types, lock states, last sign-ins, and risk notes.',
        action: isZh ? '新增账户' : 'Add account',
        focus: isZh ? '登录风险' : 'Sign-in risk',
      },
      user_logs: {
        badge: isZh ? '审计日志' : 'Logs',
        title: isZh ? '用户日志与安全事件' : 'User Logs and Security Events',
        description: isZh ? '按事件、IP、严重性和时间追踪用户安全活动。' : 'Tracks user security activity by event, IP, severity, and time.',
        action: isZh ? '记录事件' : 'Log event',
        focus: isZh ? '安全时间线' : 'Security timeline',
      },
      user_settings: {
        badge: isZh ? '用户策略' : 'Settings',
        title: isZh ? '用户策略设置' : 'User Policy Settings',
        description: isZh ? '维护两步验证、邀请审批、休眠账户提醒与会话策略。' : 'Maintains 2FA, invite approval, dormant-account reminders, and session policies.',
        action: isZh ? '新增设置' : 'Add setting',
        focus: isZh ? '策略配置' : 'Policy configuration',
      },
    };

    if (activeResource === 'user_settings' && activeView === 'ai') {
      return {
        badge: isZh ? 'AI 设置' : 'AI Settings',
        title: isZh ? 'AI 助手权限与策略' : 'AI Assistant Access and Policy',
        description: isZh ? '从智能助手入口维护模型访问、历史保留、提示词审批和数据域权限。' : 'Maintain model access, history retention, prompt approval, and data-domain permissions from the AI entry.',
        action: isZh ? '新增 AI 策略' : 'Add AI policy',
        focus: isZh ? 'AI 治理' : 'AI governance',
      };
    }
    if (activeResource === 'user_settings' && activeView === 'mail') {
      return {
        badge: isZh ? '邮件设置' : 'Mail Settings',
        title: isZh ? '邮件规则与通知策略' : 'Mail Rules and Notification Policy',
        description: isZh ? '从邮件入口维护签名、通知、自动归档、反馈分流和支持提醒。' : 'Maintain signatures, notifications, auto-archive, feedback routing, and support alerts from the mail entry.',
        action: isZh ? '新增邮件规则' : 'Add mail rule',
        focus: isZh ? '邮件治理' : 'Mail governance',
      };
    }

    return copies[activeResource];
  });

  function syncView(): void {
    activeView = readHashView('default');
    sortField = readHashParam('sort') ?? 'name';
    sortOrder = readHashParam('order') ?? 'asc';
  }

  function selectRole(roleId: number): void {
    selectedRoleId = roleId;
  }

  function initials(name: string): string {
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  function statusLabel(status: string): string {
    if (!isZh) return status;
    const labels: Record<string, string> = {
      active: '活跃',
      invited: '已邀请',
      suspended: '已停用',
      locked: '已锁定',
      internal: '内部',
      partner: '伙伴',
      enabled: '已启用',
      disabled: '已停用',
      warning: '预警',
      critical: '严重',
      info: '信息',
      allow: '允许',
      review: '复核',
      deny: '拒绝',
      none: '未授权',
      optional: '可选',
    };
    return labels[status] ?? status;
  }

  function roleLevelLabel(level: string): string {
    if (!isZh) return level;
    const labels: Record<string, string> = { owner: '所有者', manager: '经理', operator: '操作员', viewer: '只读' };
    return labels[level] ?? level;
  }

  function userName(userId: number): string {
    return users.find((user) => user.id === userId)?.name ?? `#${userId}`;
  }

  function roleName(roleId: number): string {
    return roles.find((role) => role.id === roleId)?.name ?? `#${roleId}`;
  }

  function userStatusLabel(status: string): string {
    if (!isZh) return status.charAt(0).toUpperCase() + status.slice(1);
    return statusLabel(status);
  }

  function roleSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function permissionLabel(permission: Permission): string {
    return `${permission.module}.${permission.action}`;
  }

  function rolePermissionSummary(role: { permissions: Permission[] }): string {
    if (role.permissions.length === 0) return '-';
    return role.permissions.map(permissionLabel).join(', ');
  }

  function roleScopeLabel(scope: string): string {
    if (!isZh) return scope;
    const labels: Record<string, string> = {
      all: '全局',
      inventory: '库存',
      warehouse: '仓库',
      purchasing: '采购',
      sales: '销售',
      crm: '客户',
      property: '资产',
      support: '支持',
      audit: '审计',
      ai: 'AI',
    };
    return labels[scope] ?? scope;
  }

  function permissionDomainLabel(module: string): string {
    if (!isZh) return module;
    const labels: Record<string, string> = {
      Inventory: '库存',
      Purchasing: '采购',
      CRM: '客户',
      Properties: '资产',
      Sales: '销售',
      Support: '支持',
      Audit: '审计',
      AI: 'AI',
    };
    return labels[module] ?? module;
  }

  function toggleRecords(): void {
    showRecords = !showRecords;
    replaceHashParam('records', showRecords ? '1' : null);
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

{#snippet headerActions()}
  <div class="flex flex-wrap items-center justify-end gap-2">
    {#if activeResource !== 'roles'}
      <Button data-user-record-toggle variant="outline" size="sm" aria-expanded={showRecords} onclick={toggleRecords}>
        <Table2 class="size-4" />
        {showRecords ? (isZh ? '收起记录' : 'Hide records') : (isZh ? '查看记录' : 'View records')}
      </Button>
    {/if}
    <Button size="sm">{pageCopy.action}</Button>
  </div>
{/snippet}

<div data-app-page="user-management" data-user-management-resource={activeResource} data-user-management-view={activeView}>
<ContentPageShell pageId="user-management" width="wide">
  <ContentPageHeader eyebrow={pageCopy.badge} title={pageCopy.title} description={pageCopy.description} actions={headerActions} />
  {#if activeResource !== 'roles'}
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricBlock label={isZh ? '成员总数' : 'Members'} value={users.length} detail={isZh ? '当前组织成员' : 'Current organization'} />
    <MetricBlock label={isZh ? '角色数量' : 'Roles'} value={roles.length} detail={isZh ? '权限边界' : 'Permission boundaries'} />
    <MetricBlock label={isZh ? '权限策略' : 'Policies'} value={permissions.length} detail={isZh ? '可审计规则' : 'Auditable rules'} />
    <MetricBlock label={isZh ? '风险事件' : 'Risk events'} value={criticalLogs} detail={pageCopy.focus} trendTone={criticalLogs > 0 ? 'warning' : 'positive'} />
  </section>
  {/if}

  {#if activeResource === 'roles'}
    <section class="grid gap-4" data-role-workspace>
      <div class="grid gap-4 xl:grid-cols-[1fr_0.36fr]">
        <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {#each roleCards as role (role.id)}
            <button
              class={`rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md ${selectedRole?.id === role.id ? 'border-primary/45 ring-2 ring-primary/10' : 'border-border'}`}
              onclick={() => selectRole(role.id)}
            >
              <div class="flex items-start justify-between gap-3">
                <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {initials(role.name)}
                </span>
                <Badge variant="outline">{roleLevelLabel(role.level)}</Badge>
              </div>
              <div class="mt-4">
                <p class="font-semibold">{role.name}</p>
                <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{role.description}</p>
              </div>
              <div class="mt-4 flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                <span class="text-muted-foreground">{isZh ? '成员' : 'Members'}</span>
                <span class="font-semibold">{role.assignedUsers.length}</span>
              </div>
              <div class="mt-4 flex -space-x-2">
                {#each role.assignedUsers.slice(0, 4) as user (user.id)}
                  <span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-semibold text-primary" title={user.name}>
                    {initials(user.name)}
                  </span>
                {/each}
                {#if role.assignedUsers.length === 0}
                  <span class="text-xs text-muted-foreground">{isZh ? '暂无成员' : 'No assigned members'}</span>
                {/if}
              </div>
              <div class="mt-4 flex flex-wrap gap-1.5">
                {#each role.permissions.slice(0, 3) as permission (permission.id)}
                  <Badge variant="secondary">{permissionDomainLabel(permission.module)}</Badge>
                {/each}
                {#if role.permissions.length > 3}
                  <Badge variant="outline">{role.permissions.length - 3} {isZh ? '更多' : 'more'}</Badge>
                {/if}
              </div>
            </button>
          {/each}
          <a href="#/roles/create" class="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 p-5 text-center transition hover:border-primary/60 hover:bg-primary/5">
            <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck class="h-5 w-5" />
            </span>
            <span class="mt-4 font-semibold">{isZh ? '新增角色' : 'Add New Role'}</span>
            <span class="mt-2 text-sm text-muted-foreground">{isZh ? '创建角色、Slug 和默认权限集合。' : 'Create a role, slug, and default permission set.'}</span>
          </a>
        </div>

        <Card.Root class="border-primary/25 bg-primary/5">
          <Card.Header>
            <Badge>{isZh ? '权限工作台' : 'Permission Studio'}</Badge>
            <Card.Title class="mt-3 text-xl">{selectedRole?.name ?? (isZh ? '选择角色' : 'Select a role')}</Card.Title>
            <Card.Description>{selectedRole?.description ?? (isZh ? '点击左侧角色卡片查看权限分组。' : 'Click a role card to review grouped permissions.')}</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg border bg-card p-3">
                <p class="text-xs text-muted-foreground">{isZh ? '成员' : 'Members'}</p>
                <p class="mt-1 text-2xl font-semibold">{selectedRole?.assignedUsers.length ?? 0}</p>
              </div>
              <div class="rounded-lg border bg-card p-3">
                <p class="text-xs text-muted-foreground">{isZh ? '权限' : 'Permissions'}</p>
                <p class="mt-1 text-2xl font-semibold">{selectedRole?.permissionCount ?? 0}</p>
              </div>
            </div>
            <div class="space-y-2">
              {#each selectedPermissionDomains as domain (domain.module)}
                <div class="rounded-lg border bg-card p-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold">{permissionDomainLabel(domain.module)}</p>
                    <Badge variant="outline">{domain.permissions.length}</Badge>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    {#each domain.permissions as permission (permission.id)}
                      <Badge variant="secondary">{permission.action}</Badge>
                    {/each}
                  </div>
                </div>
              {/each}
              {#if selectedPermissionDomains.length === 0}
                <p class="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{isZh ? '该角色暂无权限，可通过下方表格进入配置。' : 'This role has no permissions yet; use the table below to configure it.'}</p>
              {/if}
            </div>
            <div class="flex flex-wrap gap-2">
              <a class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90" href={`#/permissions?view=role-${selectedRole?.id ?? ''}`}>{isZh ? '配置权限' : 'Configure permissions'}</a>
              <a class="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition hover:bg-muted" href={`#/roles/edit/${selectedRole?.id ?? ''}`}>{isZh ? '编辑角色' : 'Edit role'}</a>
            </div>
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root class="overflow-hidden">
        <Card.Header class="border-b">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Card.Title class="text-2xl">{isZh ? '角色' : 'Roles'}</Card.Title>
              <Card.Description>{isZh ? '对齐参考的角色资源列表：搜索、Add Role、Role / Slug / Permissions / Actions。' : 'A focused role resource list with search, Add Role, and Role / Slug / Permissions / Actions columns.'}</Card.Description>
            </div>
            <div class="flex flex-wrap gap-2">
              <a class="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90" href="#/roles/create">
                <ShieldCheck class="mr-2 h-4 w-4" />{isZh ? '新增角色' : 'Add Role'}
              </a>
            </div>
          </div>
        </Card.Header>
        <Card.Content class="p-0">
          <div class="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <label class="relative block md:w-80">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                bind:value={roleSearch}
                class="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder={isZh ? '搜索角色' : 'Search roles'}
              />
            </label>
            <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{filteredRoleCards.length} {isZh ? '个角色' : 'roles'}</Badge>
              <Badge variant="outline">
                {sortField === 'slug' ? 'Slug' : (isZh ? '名称' : 'Name')} {sortOrder === 'desc' ? (isZh ? '降序' : 'descending') : (isZh ? '升序' : 'ascending')}
              </Badge>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b bg-muted/35 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th class="px-5 py-3 text-left">{isZh ? '角色' : 'Role'}</th>
                  <th class="px-5 py-3 text-left">Slug</th>
                  <th class="px-5 py-3 text-left">{isZh ? '权限' : 'Permissions'}</th>
                  <th class="px-5 py-3 text-left">{isZh ? '操作' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each filteredRoleCards as role (role.id)}
                  <tr class="transition hover:bg-muted/25">
                    <td class="px-5 py-4">
                      <p class="font-semibold">{role.name}</p>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline">{roleLevelLabel(role.level)}</Badge>
                        <Badge variant="outline">{roleScopeLabel(role.scope)}</Badge>
                        <Badge variant="outline">{role.assignedUsers.length} {isZh ? '名成员' : 'members'}</Badge>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <code class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{role.slug}</code>
                    </td>
                    <td class="px-5 py-4">
                      {#if role.permissions.length}
                        <div class="flex max-w-[360px] flex-wrap gap-1.5">
                          {#each role.permissions.slice(0, 3) as permission (permission.id)}
                            <Badge variant="secondary">{permissionLabel(permission)}</Badge>
                          {/each}
                          {#if role.permissions.length > 3}
                            <Badge variant="outline">{role.permissions.length - 3} {isZh ? '更多' : 'more'}</Badge>
                          {/if}
                        </div>
                      {:else}
                        <span class="text-muted-foreground">{rolePermissionSummary(role)}</span>
                      {/if}
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex flex-wrap gap-2">
                        <a class="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition hover:bg-muted" href={`#/permissions?view=role-${role.id}`}>{isZh ? '权限' : 'Permissions'}</a>
                        <a class="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition hover:bg-muted" href={`#/roles/edit/${role.id}`}>{isZh ? '编辑' : 'Edit'}</a>
                      </div>
                    </td>
                  </tr>
                {:else}
                  <tr>
                    <td class="px-5 py-10 text-center text-sm text-muted-foreground" colspan="4">{isZh ? '没有匹配的角色。' : 'No roles match your search.'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div class="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{isZh ? `1 - ${filteredRoleCards.length} / ${roleCards.length}` : `1 - ${filteredRoleCards.length} of ${roleCards.length}`}</span>
            <div class="flex flex-wrap items-center gap-2">
              <span>{isZh ? '每页行数' : 'Rows per page'}</span>
              <Badge variant="outline">10</Badge>
              <Button size="sm" variant="outline" disabled>{isZh ? '上一页' : 'Previous'}</Button>
              <Button size="sm" variant="outline" disabled>{isZh ? '下一页' : 'Next'}</Button>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </section>
  {:else if activeResource === 'permissions'}
    <section class="grid gap-4">
      {#if focusedRoleName}
        <Card.Root class="border-primary/25 bg-primary/5">
          <Card.Content class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge>{isZh ? '角色过滤' : 'Role filter'}</Badge>
              <p class="mt-2 font-semibold">{focusedRoleName}</p>
              <p class="mt-1 text-sm text-muted-foreground">{isZh ? '当前只展示该角色关联的权限策略。' : 'Only policies linked to this role are shown.'}</p>
            </div>
            <a class="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium transition hover:bg-muted" href="#/permissions">{isZh ? '查看全部权限' : 'View all permissions'}</a>
          </Card.Content>
        </Card.Root>
      {/if}
      <div class="grid gap-4 lg:grid-cols-3">
      {#each visiblePermissions as permission (permission.id)}
        <Card.Root class={focusedRoleId === permission.roleId ? 'border-primary/25' : ''}>
          <Card.Header>
            <div class="flex items-center justify-between gap-3"><Badge>{permission.module}</Badge><Badge variant="outline">{statusLabel(permission.effect)}</Badge></div>
            <Card.Title class="text-base">{permission.action}</Card.Title>
            <Card.Description>{roleName(permission.roleId)}</Card.Description>
          </Card.Header>
          <Card.Content><p class="text-sm text-muted-foreground">{permission.notes}</p><p class="mt-3 text-xs font-medium text-primary">{permission.updatedAt}</p></Card.Content>
        </Card.Root>
      {:else}
        <Card.Root class="lg:col-span-3">
          <Card.Content class="p-8 text-center text-sm text-muted-foreground">{isZh ? '该角色暂无权限策略。' : 'No permission policies are linked to this role yet.'}</Card.Content>
        </Card.Root>
      {/each}
      </div>
    </section>
  {:else if activeResource === 'user_accounts'}
    <section class="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card.Root><Card.Header><Card.Title class="text-base">{isZh ? '账户风险概览' : 'Account Risk Overview'}</Card.Title></Card.Header><Card.Content class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1"><div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '账户' : 'Accounts'}</p><p class="text-2xl font-semibold">{accounts.length}</p></div><div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '锁定' : 'Locked'}</p><p class="text-2xl font-semibold">{lockedAccounts}</p></div><div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '活跃成员' : 'Active members'}</p><p class="text-2xl font-semibold">{activeUsers}</p></div></Card.Content></Card.Root>
      <Card.Root class="overflow-hidden"><Card.Header class="border-b"><Card.Title class="text-base">{isZh ? '登录状态' : 'Sign-in Status'}</Card.Title></Card.Header><Card.Content class="divide-y p-0">{#each accounts as account (account.id)}<div class="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto]"><div><p class="font-medium">{userName(account.userId)}</p><p class="text-xs text-muted-foreground">{account.notes}</p></div><Badge variant="outline">{statusLabel(account.accountType)}</Badge><span class="text-xs text-muted-foreground">{account.lastSignInAt}</span></div>{/each}</Card.Content></Card.Root>
    </section>
  {:else if activeResource === 'user_logs'}
    <section class="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
      <Card.Root class="overflow-hidden"><Card.Header class="border-b"><Card.Title class="text-base">{isZh ? '安全时间线' : 'Security Timeline'}</Card.Title></Card.Header><Card.Content class="divide-y p-0">{#each logs as log (log.id)}<div class="grid gap-3 px-5 py-4 md:grid-cols-[auto_1fr_auto]"><span class="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Clock3 class="h-4 w-4" /></span><div><p class="font-medium">{log.event}</p><p class="text-xs text-muted-foreground">{userName(log.userId)} · {log.ipAddress} · {log.details}</p></div><Badge variant="outline">{statusLabel(log.severity)}</Badge></div>{/each}</Card.Content></Card.Root>
      <Card.Root><Card.Header><Card.Title class="text-base">{isZh ? '审计摘要' : 'Audit Summary'}</Card.Title></Card.Header><Card.Content class="space-y-3"><div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '日志总数' : 'Logs'}</p><p class="text-2xl font-semibold">{logs.length}</p></div><div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '需关注' : 'Needs attention'}</p><p class="text-2xl font-semibold">{criticalLogs}</p></div></Card.Content></Card.Root>
    </section>
  {:else if activeResource === 'user_settings'}
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each settings as setting (setting.id)}
        <Card.Root>
          <Card.Header><div class="flex items-center justify-between gap-3"><SlidersHorizontal class="h-5 w-5 text-primary" /><Badge variant="outline">{statusLabel(setting.status)}</Badge></div><Card.Title class="text-base">{setting.setting}</Card.Title><Card.Description>{setting.scope}</Card.Description></Card.Header>
          <Card.Content><p class="text-sm text-muted-foreground">{isZh ? '负责人' : 'Owner'}: {userName(setting.ownerId)}</p><p class="mt-3 text-xs font-medium text-primary">{setting.updatedAt}</p></Card.Content>
        </Card.Root>
      {/each}
      <Card.Root class="border-primary/30"><Card.Content class="p-5"><CheckCircle2 class="h-5 w-5 text-primary" /><p class="mt-3 text-sm text-muted-foreground">{isZh ? `${enabledSettings} 条策略已启用，适合演示企业级账户治理。` : `${enabledSettings} policies are enabled for enterprise account governance demos.`}</p></Card.Content></Card.Root>
    </section>
  {:else}
    <Card.Root class="overflow-hidden">
      <Card.Header class="border-b">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Card.Title class="text-base">{isZh ? '用户目录' : 'User Directory'}</Card.Title>
            <Card.Description>{isZh ? '按用户、角色、状态、加入日期和最近登录查看成员。' : 'Review members by user, role, status, joined date, and last sign-in.'}</Card.Description>
          </div>
          <div class="flex flex-wrap gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button variant="outline" {...props}>
                    {userRoleFilter === null ? (isZh ? '所有角色' : 'All roles') : roleName(userRoleFilter)}
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-52">
                <DropdownMenu.CheckboxItem checked={userRoleFilter === null} onCheckedChange={() => userRoleFilter = null}>
                  {isZh ? '所有角色' : 'All roles'}
                </DropdownMenu.CheckboxItem>
                {#each roles as role (role.id)}
                  <DropdownMenu.CheckboxItem checked={userRoleFilter === role.id} onCheckedChange={() => userRoleFilter = role.id}>
                    {role.name}
                  </DropdownMenu.CheckboxItem>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button variant="outline" {...props}>
                    {userStatusFilter ? userStatusLabel(userStatusFilter) : (isZh ? '所有用户' : 'All users')}
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-44">
                <DropdownMenu.CheckboxItem checked={!userStatusFilter} onCheckedChange={() => userStatusFilter = ''}>
                  {isZh ? '所有用户' : 'All users'}
                </DropdownMenu.CheckboxItem>
                {#each ['active', 'invited', 'suspended'] as status (status)}
                  <DropdownMenu.CheckboxItem checked={userStatusFilter === status} onCheckedChange={() => userStatusFilter = status}>
                    {userStatusLabel(status)}
                  </DropdownMenu.CheckboxItem>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button><UserPlus class="mr-2 h-4 w-4" />{pageCopy.action}</Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm" aria-label={isZh ? '用户目录' : 'User directory'}>
            <thead class="border-b bg-muted/35 text-xs font-semibold text-muted-foreground">
              <tr><th class="px-5 py-3 text-left">{isZh ? '用户' : 'User'}</th><th class="px-5 py-3 text-left">{isZh ? '角色' : 'Role'}</th><th class="px-5 py-3 text-left">{isZh ? '状态' : 'Status'}</th><th class="px-5 py-3 text-left">{isZh ? '加入日期' : 'Joined'}</th><th class="px-5 py-3 text-left">{isZh ? '最近登录' : 'Last Sign In'}</th><th class="px-5 py-3 text-right">{isZh ? '操作' : 'Actions'}</th></tr>
            </thead>
            <tbody class="divide-y">
              {#each filteredUsers as user (user.id)}
                <tr class="transition hover:bg-muted/25"><td class="px-5 py-4"><div class="flex min-w-0 items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(user.name)}</span><div class="min-w-0"><p class="truncate font-semibold">{user.name}</p><p class="truncate text-xs text-muted-foreground">{user.email}</p></div></div></td><td class="px-5 py-4 text-muted-foreground">{roleName(user.roleId)}</td><td class="px-5 py-4"><Badge variant="outline">{statusLabel(user.status)}</Badge></td><td class="px-5 py-4 text-muted-foreground">2026-06-{String(8 + user.id).padStart(2, '0')}</td><td class="px-5 py-4 text-muted-foreground">{user.lastActiveAt}</td><td class="px-5 py-4"><div class="flex justify-end gap-2"><a class="text-xs font-medium text-primary hover:underline" href={`#/users/show/${user.id}`} aria-label={`${isZh ? '查看' : 'View'} ${user.name}`}>{isZh ? '查看' : 'View'}</a><a class="text-xs font-medium text-primary hover:underline" href={`#/users/edit/${user.id}`} aria-label={`${isZh ? '编辑' : 'Edit'} ${user.name}`}>{isZh ? '编辑' : 'Edit'}</a></div></td></tr>
              {:else}
                <tr><td colspan="6" class="px-5 py-10 text-center text-sm text-muted-foreground">{isZh ? '没有匹配的用户。' : 'No users match the selected filters.'}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if activeResource !== 'roles'}
    <section class="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
      <Card.Root class="overflow-hidden">
        <Card.Header class="border-b"><Card.Title class="text-base">{isZh ? '团队成员' : 'Team Members'}</Card.Title></Card.Header>
        <Card.Content class="p-0">
          <div class="divide-y">
            {#each users as user (user.id)}
              <div class="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div class="flex min-w-0 items-center gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(user.name)}</span><div class="min-w-0"><p class="truncate font-semibold">{user.name}</p><p class="truncate text-xs text-muted-foreground">{user.email}</p></div></div>
                <Badge variant="outline">{user.department}</Badge>
                <p class="text-xs text-muted-foreground">{user.lastActiveAt}</p>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
      <div class="grid content-start gap-4">
        <Card.Root>
          <Card.Header><Card.Title class="flex items-center gap-2 text-base"><UserCog class="h-4 w-4 text-primary" />{isZh ? '管理摘要' : 'Management Summary'}</Card.Title></Card.Header>
          <Card.Content class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '角色' : 'Roles'}</p><p class="mt-1 text-xl font-semibold">{roles.length}</p></div>
            <div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '账户' : 'Accounts'}</p><p class="mt-1 text-xl font-semibold">{accounts.length}</p></div>
            <div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '日志' : 'Logs'}</p><p class="mt-1 text-xl font-semibold">{logs.length}</p></div>
            <div class="rounded-lg border p-3"><p class="text-xs text-muted-foreground">{isZh ? '设置' : 'Settings'}</p><p class="mt-1 text-xl font-semibold">{settings.length}</p></div>
          </Card.Content>
        </Card.Root>
        <Card.Root><Card.Content class="p-5"><KeyRound class="h-5 w-5 text-primary" /><p class="mt-3 text-sm text-muted-foreground">{isZh ? '账户、日志与策略按各自任务组织；需要批量筛选或编辑时再打开记录视图。' : 'Accounts, logs, and policies follow their own tasks; open records only for bulk filtering or editing.'}</p></Card.Content></Card.Root>
      </div>
    </section>

    {#if showRecords}
      <section data-user-records>
        <AutoTable {resourceName} />
      </section>
    {/if}
  {/if}
</ContentPageShell>
</div>
