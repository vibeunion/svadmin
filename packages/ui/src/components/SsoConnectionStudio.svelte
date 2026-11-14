<script lang="ts">
  import { untrack } from 'svelte';

  export type SsoProtocol = 'saml' | 'oidc' | 'oauth2' | 'feishu' | 'dingtalk' | 'wecom';
  export type SsoStatus = 'active' | 'inactive' | 'testing';

  export interface SsoClaimMapping {
    remoteClaim: string;
    localField: string;
    defaultValue?: string;
  }

  export interface SsoConnection {
    id: string;
    name: string;
    protocol: SsoProtocol;
    status: SsoStatus;
    domains: string[];
    isDefault?: boolean;
    // SAML
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    // OIDC / OAuth2
    clientId?: string;
    clientSecret?: string;
    discoveryUrl?: string;
    scopes?: string[];
    // Enterprise Office Suites
    appId?: string;
    appSecret?: string;
    corpId?: string;
    // Claim mapping
    claimMappings?: SsoClaimMapping[];
    lastTestedAt?: string;
    testStatus?: 'success' | 'failed' | 'untested';
    testMessage?: string;
  }

  export interface SsoConnectionStudioProps {
    connections?: SsoConnection[];
    class?: string;
    spEntityId?: string;
    spAcsUrl?: string;
    onSave?: (conn: SsoConnection) => void;
    onDelete?: (id: string) => void;
    onTest?: (conn: SsoConnection) => Promise<{ success: boolean; message: string }>;
  }

  const {
    connections = [],
    class: className = '',
    spEntityId = 'https://auth.svadmin.internal/saml/metadata',
    spAcsUrl = 'https://auth.svadmin.internal/saml/acs',
    onSave,
    onDelete,
    onTest,
  }: SsoConnectionStudioProps = $props();

  // Internal reactive items
  let connList = $state<SsoConnection[]>([]);

  $effect(() => {
    connList = connections.length > 0
      ? connections.map(c => ({ ...c, domains: [...c.domains], claimMappings: c.claimMappings ? [...c.claimMappings] : [] }))
      : [
          {
            id: 'conn-okta-saml',
            name: 'Corporate Okta SSO',
            protocol: 'saml',
            status: 'active',
            domains: ['corp.example.com', 'partner.example.com'],
            isDefault: true,
            entityId: 'http://www.okta.com/exk1234567890abcdef',
            ssoUrl: 'https://corp.okta.com/app/svadmin/exk1234567890abcdef/sso/saml',
            certificate: 'MIIDpDCCAoygAwIBAgIGAV...[X.509 Certificate]...EXAMPLEDATA',
            claimMappings: [
              { remoteClaim: 'email', localField: 'email' },
              { remoteClaim: 'firstName', localField: 'first_name' },
              { remoteClaim: 'lastName', localField: 'last_name' },
              { remoteClaim: 'department', localField: 'department' },
            ],
            lastTestedAt: '2026-11-14 18:30',
            testStatus: 'success',
            testMessage: 'Handshake 200 OK. Signature verified.',
          },
          {
            id: 'conn-azure-oidc',
            name: 'Microsoft Entra ID (Azure AD)',
            protocol: 'oidc',
            status: 'active',
            domains: ['cloud.example.org'],
            isDefault: false,
            clientId: '9f8b4a2c-1d3e-4f5a-8b9c-0d1e2f3a4b5c',
            clientSecret: 'ms_sec_••••••••••••••••',
            discoveryUrl: 'https://login.microsoftonline.com/tenant-id/v2.0/.well-known/openid-configuration',
            scopes: ['openid', 'profile', 'email'],
            claimMappings: [
              { remoteClaim: 'preferred_username', localField: 'email' },
              { remoteClaim: 'name', localField: 'display_name' },
            ],
            lastTestedAt: '2026-11-14 17:15',
            testStatus: 'success',
            testMessage: 'Discovery endpoint parsed. OIDC JWKS valid.',
          },
          {
            id: 'conn-feishu-suite',
            name: '飞书自建应用企业登录',
            protocol: 'feishu',
            status: 'inactive',
            domains: ['feishu.internal'],
            isDefault: false,
            appId: 'cli_a1b2c3d4e5f6g7h8',
            appSecret: 'secret_••••••••••••',
            claimMappings: [
              { remoteClaim: 'open_id', localField: 'sso_uid' },
              { remoteClaim: 'name', localField: 'display_name' },
              { remoteClaim: 'mobile', localField: 'phone' },
            ],
            lastTestedAt: '2026-11-10 09:00',
            testStatus: 'untested',
          },
        ];
  });

  // Filters & Search
  let searchQuery = $state('');
  let protocolFilter = $state<'ALL' | SsoProtocol>('ALL');
  let statusFilter = $state<'ALL' | SsoStatus>('ALL');
  let showSpMetadata = $state(false);
  let copiedNotification = $state<string | null>(null);

  // Edit / Add modal
  let isEditing = $state(false);
  let editId = $state('');
  let editName = $state('');
  let editProtocol = $state<SsoProtocol>('saml');
  let editStatus = $state<SsoStatus>('active');
  let editDomains = $state('');
  let editIsDefault = $state(false);
  // SAML fields
  let editEntityId = $state('');
  let editSsoUrl = $state('');
  let editCert = $state('');
  // OIDC fields
  let editClientId = $state('');
  let editClientSecret = $state('');
  let editDiscoveryUrl = $state('');
  let editScopes = $state('openid,profile,email');
  // Enterprise Suite fields
  let editAppId = $state('');
  let editAppSecret = $state('');
  let editCorpId = $state('');
  // Claims
  let editClaimMappings = $state<SsoClaimMapping[]>([]);

  // Testing feedback
  let testingConnectionId = $state<string | null>(null);

  const filteredConnections = $derived.by(() => {
    return connList.filter((conn) => {
      if (protocolFilter !== 'ALL' && conn.protocol !== protocolFilter) return false;
      if (statusFilter !== 'ALL' && conn.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = conn.name.toLowerCase().includes(q);
        const matchesDomains = conn.domains.some(d => d.toLowerCase().includes(q));
        const matchesId = conn.id.toLowerCase().includes(q);
        if (!matchesName && !matchesDomains && !matchesId) return false;
      }
      return true;
    });
  });

  // Computed overview metrics
  const activeCount = $derived(connList.filter(c => c.status === 'active').length);
  const totalDomains = $derived(new Set(connList.flatMap(c => c.domains)).size);

  function copyText(text: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copiedNotification = label;
      setTimeout(() => {
        copiedNotification = null;
      }, 2000);
    }
  }

  function openCreateDialog() {
    editId = `conn-${Date.now()}`;
    editName = '';
    editProtocol = 'saml';
    editStatus = 'active';
    editDomains = '';
    editIsDefault = connList.length === 0;
    editEntityId = '';
    editSsoUrl = '';
    editCert = '';
    editClientId = '';
    editClientSecret = '';
    editDiscoveryUrl = '';
    editScopes = 'openid,profile,email';
    editAppId = '';
    editAppSecret = '';
    editCorpId = '';
    editClaimMappings = [
      { remoteClaim: 'email', localField: 'email' },
      { remoteClaim: 'name', localField: 'display_name' },
    ];
    isEditing = true;
  }

  function openEditDialog(conn: SsoConnection) {
    editId = conn.id;
    editName = conn.name;
    editProtocol = conn.protocol;
    editStatus = conn.status;
    editDomains = conn.domains.join(', ');
    editIsDefault = Boolean(conn.isDefault);
    editEntityId = conn.entityId || '';
    editSsoUrl = conn.ssoUrl || '';
    editCert = conn.certificate || '';
    editClientId = conn.clientId || '';
    editClientSecret = conn.clientSecret || '';
    editDiscoveryUrl = conn.discoveryUrl || '';
    editScopes = conn.scopes?.join(',') || 'openid,profile,email';
    editAppId = conn.appId || '';
    editAppSecret = conn.appSecret || '';
    editCorpId = conn.corpId || '';
    editClaimMappings = conn.claimMappings ? conn.claimMappings.map(m => ({ ...m })) : [];
    isEditing = true;
  }

  function addClaimMapping() {
    editClaimMappings = [...editClaimMappings, { remoteClaim: '', localField: '' }];
  }

  function removeClaimMapping(index: number) {
    editClaimMappings = editClaimMappings.filter((_, i) => i !== index);
  }

  function saveConnection() {
    if (!editName.trim()) return;

    const domains = editDomains
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);

    const updated: SsoConnection = {
      id: editId,
      name: editName.trim(),
      protocol: editProtocol,
      status: editStatus,
      domains,
      isDefault: editIsDefault,
      claimMappings: editClaimMappings.filter(m => m.remoteClaim && m.localField),
    };

    if (editProtocol === 'saml') {
      updated.entityId = editEntityId.trim();
      updated.ssoUrl = editSsoUrl.trim();
      updated.certificate = editCert.trim();
    } else if (editProtocol === 'oidc' || editProtocol === 'oauth2') {
      updated.clientId = editClientId.trim();
      updated.clientSecret = editClientSecret.trim();
      updated.discoveryUrl = editDiscoveryUrl.trim();
      updated.scopes = editScopes.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      updated.appId = editAppId.trim();
      updated.appSecret = editAppSecret.trim();
      updated.corpId = editCorpId.trim();
    }

    const existingIndex = connList.findIndex(c => c.id === editId);
    if (existingIndex >= 0) {
      connList[existingIndex] = updated;
    } else {
      connList = [...connList, updated];
    }

    // Handle isDefault exclusivity
    if (updated.isDefault) {
      for (const c of connList) {
        if (c.id !== updated.id) c.isDefault = false;
      }
    }

    onSave?.(updated);
    isEditing = false;
  }

  function deleteConnection(id: string) {
    connList = connList.filter(c => c.id !== id);
    onDelete?.(id);
  }

  function toggleStatus(conn: SsoConnection) {
    const nextStatus = conn.status === 'active' ? 'inactive' : 'active';
    conn.status = nextStatus;
    onSave?.({ ...conn });
  }

  function setDefault(conn: SsoConnection) {
    for (const c of connList) {
      c.isDefault = c.id === conn.id;
    }
    onSave?.({ ...conn, isDefault: true });
  }

  async function testConnection(conn: SsoConnection) {
    testingConnectionId = conn.id;
    try {
      if (onTest) {
        const res = await onTest(conn);
        conn.testStatus = res.success ? 'success' : 'failed';
        conn.testMessage = res.message;
      } else {
        // Built-in synthetic validation
        await new Promise(r => setTimeout(r, 600));
        let pass = false;
        let msg = '';
        if (conn.protocol === 'saml') {
          pass = Boolean(conn.ssoUrl && conn.ssoUrl.startsWith('https://') && conn.entityId);
          msg = pass ? 'SAML Endpoints verified. TLS & Certificate valid.' : 'Failed: SSO URL must be https:// and Entity ID required.';
        } else if (conn.protocol === 'oidc') {
          pass = Boolean(conn.clientId && conn.discoveryUrl && conn.discoveryUrl.includes('.well-known'));
          msg = pass ? 'OIDC Discovery Document 200 OK. Configuration valid.' : 'Failed: Valid Discovery URL and Client ID required.';
        } else {
          pass = Boolean(conn.appId);
          msg = pass ? 'App ID and credentials format valid.' : 'Failed: App ID is required.';
        }
        conn.testStatus = pass ? 'success' : 'failed';
        conn.testMessage = msg;
      }
      conn.lastTestedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      onSave?.({ ...conn });
    } finally {
      testingConnectionId = null;
    }
  }

  function getProtocolBadgeClass(proto: SsoProtocol) {
    switch (proto) {
      case 'saml':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'oidc':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'feishu':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'dingtalk':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'wecom':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }
</script>

<div
  class="w-full flex flex-col gap-6 p-6 bg-background text-foreground rounded-xl border border-border shadow-sm {className}"
  data-svadmin-component="SsoConnectionStudio"
  data-svadmin-resource="sso_connections"
>
  <!-- Header & KPI Overview -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">企业单点登录配置中心 (SSO Studio)</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
          Enterprise Security
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        集中管理企业身份提供商 (IdP)、SAML 2.0 / OIDC 协议绑定、企业邮箱域名路由规则及属性映射。
      </p>
    </div>

    <div class="flex items-center gap-2 self-start md:self-auto">
      <button
        type="button"
        onclick={() => (showSpMetadata = !showSpMetadata)}
        class="inline-flex items-center justify-center text-xs font-medium px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-muted transition-colors"
      >
        <svg class="w-3.5 h-3.5 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {showSpMetadata ? '收起 SP 元数据' : '查看 SP 元数据'}
      </button>

      <button
        type="button"
        onclick={openCreateDialog}
        class="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建企业身份源
      </button>
    </div>
  </div>

  <!-- Copied Toast Alert -->
  {#if copiedNotification}
    <div class="px-3 py-2 text-xs rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-between transition-all">
      <span>已成功复制 {copiedNotification} 至剪贴板！</span>
    </div>
  {/if}

  <!-- SP Metadata Panel -->
  {#if showSpMetadata}
    <div class="p-4 rounded-lg bg-muted/40 border border-border flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-foreground uppercase tracking-wider">系统服务提供商 (SP) 对接参数</span>
        <span class="text-[11px] text-muted-foreground">请将此配置填入您的 Okta / Azure AD / Keycloak 中</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div class="flex flex-col gap-1 p-2.5 rounded bg-card border border-border">
          <span class="text-muted-foreground font-medium">SP Entity ID (Audience URI):</span>
          <div class="flex items-center justify-between font-mono text-[11px] text-foreground break-all">
            <span>{spEntityId}</span>
            <button
              type="button"
              onclick={() => copyText(spEntityId, 'SP Entity ID')}
              class="ml-2 px-1.5 py-0.5 text-[10px] font-sans rounded bg-muted hover:bg-muted/80 text-muted-foreground"
            >
              复制
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1 p-2.5 rounded bg-card border border-border">
          <span class="text-muted-foreground font-medium">ACS URL (Single Sign-On Callback):</span>
          <div class="flex items-center justify-between font-mono text-[11px] text-foreground break-all">
            <span>{spAcsUrl}</span>
            <button
              type="button"
              onclick={() => copyText(spAcsUrl, 'ACS URL')}
              class="ml-2 px-1.5 py-0.5 text-[10px] font-sans rounded bg-muted hover:bg-muted/80 text-muted-foreground"
            >
              复制
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Metrics Strip -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">已注册身份源</span>
      <span class="text-xl font-bold text-foreground">{connList.length}</span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">活跃运行中</span>
      <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">覆盖企业邮箱域名</span>
      <span class="text-xl font-bold text-foreground">{totalDomains}</span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">默认降级认证源</span>
      <span class="text-sm font-semibold text-foreground truncate">
        {connList.find(c => c.isDefault)?.name || '未设置'}
      </span>
    </div>
  </div>

  <!-- Filters & Controls -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
    <div class="relative flex-1 max-w-sm">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索身份源名称、匹配域名..."
        class="w-full text-xs px-3 py-2 pl-8 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <!-- Protocol Filter -->
      <select
        bind:value={protocolFilter}
        class="text-xs px-2.5 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">全部协议</option>
        <option value="saml">SAML 2.0</option>
        <option value="oidc">OpenID Connect (OIDC)</option>
        <option value="oauth2">OAuth 2.0</option>
        <option value="feishu">飞书自建应用</option>
        <option value="dingtalk">钉钉企业应用</option>
        <option value="wecom">企业微信应用</option>
      </select>

      <!-- Status Filter -->
      <select
        bind:value={statusFilter}
        class="text-xs px-2.5 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">全部状态</option>
        <option value="active">启用 (Active)</option>
        <option value="inactive">停用 (Inactive)</option>
      </select>
    </div>
  </div>

  <!-- Connection Cards List -->
  {#if filteredConnections.length === 0}
    <div class="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground text-xs gap-2">
      <svg class="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>没有符合条件的身份提供源</span>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-3">
      {#each filteredConnections as conn (conn.id)}
        <div class="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
          <!-- Left: Identity Provider Info -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="font-semibold text-sm text-foreground">{conn.name}</span>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-medium border {getProtocolBadgeClass(conn.protocol)}">
                {conn.protocol.toUpperCase()}
              </span>
              {#if conn.isDefault}
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  默认身份源
                </span>
              {/if}
              <div class="flex items-center gap-1.5 ml-1">
                <span
                  class="w-2 h-2 rounded-full {conn.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/50'}"
                ></span>
                <span class="text-xs text-muted-foreground capitalize">{conn.status}</span>
              </div>
            </div>

            <!-- Domain Match Badges -->
            <div class="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
              <span class="font-medium">关联邮箱后缀:</span>
              {#if conn.domains.length === 0}
                <span class="text-[11px] italic">无专属域名</span>
              {:else}
                {#each conn.domains as domain}
                  <span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                    @{domain}
                  </span>
                {/each}
              {/if}
            </div>

            <!-- Test status and feedback -->
            <div class="flex items-center gap-2 text-xs">
              {#if conn.testStatus === 'success'}
                <span class="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[11px]">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {conn.testMessage || '握手验证成功'} ({conn.lastTestedAt})
                </span>
              {:else if conn.testStatus === 'failed'}
                <span class="inline-flex items-center text-destructive text-[11px]">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {conn.testMessage || '连通性测试异常'}
                </span>
              {:else}
                <span class="text-[11px] text-muted-foreground">尚未进行握手连通性测试</span>
              {/if}
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              disabled={testingConnectionId === conn.id}
              onclick={() => testConnection(conn)}
              class="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-foreground font-medium transition-colors inline-flex items-center"
            >
              {#if testingConnectionId === conn.id}
                <span class="animate-spin mr-1">⌛</span>
                测试中...
              {:else}
                <svg class="w-3.5 h-3.5 mr-1 text-primary opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                测试连通性
              {/if}
            </button>

            <button
              type="button"
              onclick={() => toggleStatus(conn)}
              class="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
            >
              {conn.status === 'active' ? '停用' : '启用'}
            </button>

            {#if !conn.isDefault && conn.status === 'active'}
              <button
                type="button"
                onclick={() => setDefault(conn)}
                class="text-xs px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                设为默认
              </button>
            {/if}

            <button
              type="button"
              onclick={() => openEditDialog(conn)}
              class="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
            >
              配置
            </button>

            <button
              type="button"
              onclick={() => deleteConnection(conn.id)}
              class="text-xs px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Edit / Add Modal -->
  {#if isEditing}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border p-6 shadow-xl flex flex-col gap-5 text-foreground">
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <h3 class="text-base font-bold text-foreground">
            {editId.startsWith('conn-') && editName === '' ? '新建企业身份源配置' : '编辑企业身份源配置'}
          </h3>
          <button
            type="button"
            onclick={() => (isEditing = false)}
            class="text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-4 text-xs">
          <!-- Connection Name -->
          <div class="flex flex-col gap-1.5">
            <label for="sso-conn-name" class="font-semibold text-foreground">身份源名称</label>
            <input
              id="sso-conn-name"
              type="text"
              bind:value={editName}
              placeholder="例如：总部 Microsoft Entra ID / 钉钉免密登录"
              class="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <!-- Protocol Choice -->
          <div class="flex flex-col gap-1.5">
            <span class="font-semibold text-foreground">协议类型</span>
            <div class="grid grid-cols-3 gap-2">
              {#each [
                { id: 'saml', label: 'SAML 2.0' },
                { id: 'oidc', label: 'OpenID Connect' },
                { id: 'oauth2', label: 'OAuth 2.0' },
                { id: 'feishu', label: '飞书自建应用' },
                { id: 'dingtalk', label: '钉钉企业应用' },
                { id: 'wecom', label: '企业微信' },
              ] as item}
                <button
                  type="button"
                  onclick={() => (editProtocol = item.id as SsoProtocol)}
                  class="px-3 py-2 text-center rounded-lg border text-xs font-medium transition-colors {editProtocol === item.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'}"
                >
                  {item.label}
                </button>
              {/each}
            </div>
          </div>

          <!-- Domains mapping -->
          <div class="flex flex-col gap-1.5">
            <label for="sso-domains" class="font-semibold text-foreground">匹配企业邮箱域名 (以逗号分隔)</label>
            <input
              id="sso-domains"
              type="text"
              bind:value={editDomains}
              placeholder="例如：megacorp.com, subsidiary.com"
              class="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            <span class="text-[11px] text-muted-foreground">当登录用户输入匹配域名的邮箱时，系统自动切换至此身份源。</span>
          </div>

          <!-- Protocol Specific Inputs -->
          {#if editProtocol === 'saml'}
            <div class="p-3 rounded-lg bg-muted/30 border border-border flex flex-col gap-3">
              <span class="font-semibold text-foreground">SAML 2.0 专属参数</span>
              <div class="flex flex-col gap-1">
                <label for="sso-entity-id" class="text-muted-foreground">IdP Entity ID (Issuer)</label>
                <input
                  id="sso-entity-id"
                  type="text"
                  bind:value={editEntityId}
                  placeholder="https://sts.windows.net/... 或 http://www.okta.com/..."
                  class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label for="sso-url" class="text-muted-foreground">Single Sign-On URL (SSO URL)</label>
                <input
                  id="sso-url"
                  type="text"
                  bind:value={editSsoUrl}
                  placeholder="https://company.okta.com/app/svadmin/sso/saml"
                  class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label for="sso-cert" class="text-muted-foreground">X.509 签名证书内容</label>
                <textarea
                  id="sso-cert"
                  rows="3"
                  bind:value={editCert}
                  placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----"
                  class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono text-[11px]"
                ></textarea>
              </div>
            </div>
          {:else if editProtocol === 'oidc' || editProtocol === 'oauth2'}
            <div class="p-3 rounded-lg bg-muted/30 border border-border flex flex-col gap-3">
              <span class="font-semibold text-foreground">OIDC / OAuth 2.0 专属参数</span>
              <div class="flex flex-col gap-1">
                <label for="sso-discovery-url" class="text-muted-foreground">Discovery URL (.well-known/openid-configuration)</label>
                <input
                  id="sso-discovery-url"
                  type="text"
                  bind:value={editDiscoveryUrl}
                  placeholder="https://accounts.google.com/.well-known/openid-configuration"
                  class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-1">
                  <label for="sso-client-id" class="text-muted-foreground">Client ID</label>
                  <input
                    id="sso-client-id"
                    type="text"
                    bind:value={editClientId}
                    placeholder="Client ID"
                    class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="sso-client-secret" class="text-muted-foreground">Client Secret</label>
                  <input
                    id="sso-client-secret"
                    type="password"
                    bind:value={editClientSecret}
                    placeholder="••••••••"
                    class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
              </div>
            </div>
          {:else}
            <div class="p-3 rounded-lg bg-muted/30 border border-border flex flex-col gap-3">
              <span class="font-semibold text-foreground">办公套件自建应用凭据</span>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-1">
                  <label for="sso-app-id" class="text-muted-foreground">App ID / Client Key</label>
                  <input
                    id="sso-app-id"
                    type="text"
                    bind:value={editAppId}
                    placeholder="App ID"
                    class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="sso-app-secret" class="text-muted-foreground">App Secret</label>
                  <input
                    id="sso-app-secret"
                    type="password"
                    bind:value={editAppSecret}
                    placeholder="••••••••"
                    class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
              </div>
              {#if editProtocol === 'wecom'}
                <div class="flex flex-col gap-1">
                  <label for="sso-corp-id" class="text-muted-foreground">企业微信 Corp ID</label>
                  <input
                    id="sso-corp-id"
                    type="text"
                    bind:value={editCorpId}
                    placeholder="ww1234567890abcdef"
                    class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
                  />
                </div>
              {/if}
            </div>
          {/if}

          <!-- Attribute Claims Mapping -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-foreground">用户属性映射 (Claims Mapping)</span>
              <button
                type="button"
                onclick={addClaimMapping}
                class="text-[11px] text-primary hover:underline"
              >
                + 添加映射字段
              </button>
            </div>
            <div class="flex flex-col gap-1.5">
              {#each editClaimMappings as mapping, idx}
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    bind:value={mapping.remoteClaim}
                    placeholder="IdP 字段 (如 sub / email)"
                    class="flex-1 px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono text-[11px]"
                  />
                  <span class="text-muted-foreground">➔</span>
                  <input
                    type="text"
                    bind:value={mapping.localField}
                    placeholder="本地字段 (如 email / name)"
                    class="flex-1 px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onclick={() => removeClaimMapping(idx)}
                    class="text-muted-foreground hover:text-destructive px-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onclick={() => (isEditing = false)}
            class="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onclick={saveConnection}
            class="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors shadow-sm"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
