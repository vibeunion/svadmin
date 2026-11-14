<script lang="ts">
  import {
    ShieldCheck,
    FileCheck2,
    Copy,
    Check,
    Download,
    Eye,
    Hash,
    Clock,
    User,
    Building2,
    Globe,
    AlertCircle,
    FileCode,
  } from 'lucide-svelte';

  export interface AuditSnapshotDiffItem {
    field: string;
    label?: string;
    before?: unknown;
    after?: unknown;
  }

  interface Props {
    recordId?: string;
    title?: string;
    subtitle?: string;
    operatorName?: string;
    operatorId?: string;
    tenantName?: string;
    clientIp?: string;
    actionType?: 'create' | 'update' | 'delete' | 'export' | 'privilege_grant' | string;
    actionLabel?: string;
    timestamp?: string;
    hash?: string;
    verified?: boolean;
    watermarkText?: string;
    changes?: AuditSnapshotDiffItem[];
    rawPayload?: Record<string, unknown> | null;
    onexport?: (format: 'png' | 'svg' | 'json') => void;
    onverifyHash?: () => void;
  }

  let {
    recordId = 'AUDIT-20261114-9982',
    title = '不可篡改操作存证快照',
    subtitle = '操作发生时自动触发数字取证，已通过区块链与 SHA-256 签名存证',
    operatorName = '张三 (Zhang San)',
    operatorId = 'EMP-88204',
    tenantName = '上海总部 / 核心运营一区',
    clientIp = '10.12.88.42',
    actionType = 'privilege_grant',
    actionLabel = '全局特权提升审批',
    timestamp = '2026-11-14 22:45:10.824 CST',
    hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    verified = true,
    watermarkText,
    changes = [
      { field: 'role', label: '授权角色', before: 'viewer', after: 'super_admin' },
      { field: 'scope', label: '管控边界', before: 'read_only', after: 'full_control' },
      { field: 'ipWhitelist', label: '放行 IP', before: '192.168.1.0/24', after: '0.0.0.0/0' },
      { field: 'mfaRequired', label: 'MFA 强制', before: false, after: true },
    ],
    rawPayload = null,
    onexport,
    onverifyHash,
  }: Props = $props();

  let copied = $state(false);
  let activeTab = $state<'diff' | 'raw'>('diff');

  let effectiveWatermark = $derived(
    watermarkText || `${operatorName} [${operatorId}] ${clientIp} ${timestamp}`
  );

  function handleCopyHash() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(hash);
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function handleExport(format: 'png' | 'svg' | 'json') {
    if (onexport) {
      onexport(format);
    }
  }

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return '(空)';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
</script>

<div
  class="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all"
  data-svadmin-component="AuditSnapshotCapture"
>
  <!-- Security Watermark Background Overlay -->
  <div
    class="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.035] dark:opacity-[0.05]"
    aria-hidden="true"
  >
    <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          id="audit-watermark-pattern"
          width="280"
          height="140"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-25)"
        >
          <text
            x="20"
            y="60"
            font-size="11"
            font-family="monospace"
            fill="currentColor"
            font-weight="bold"
          >
            {effectiveWatermark}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#audit-watermark-pattern)" />
    </svg>
  </div>

  <!-- Header Banner -->
  <div class="relative flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 p-5">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
        <ShieldCheck class="h-5 w-5" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold text-foreground tracking-tight">{title}</h3>
          <span class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground border border-border">
            {recordId}
          </span>
        </div>
        <p class="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>

    <!-- Export Action Buttons -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
        onclick={() => handleExport('png')}
        aria-label="导出 PNG 快照"
      >
        <Download class="h-3.5 w-3.5 text-muted-foreground" />
        <span>存证图片 (PNG)</span>
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
        onclick={() => handleExport('svg')}
        aria-label="导出 SVG 矢量图"
      >
        <FileCheck2 class="h-3.5 w-3.5 text-muted-foreground" />
        <span>矢量存证 (SVG)</span>
      </button>
    </div>
  </div>

  <!-- Cryptographic Hash & Validation Bar -->
  <div class="relative flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-3 text-xs">
    <div class="flex items-center gap-2 min-w-0">
      <Hash class="h-4 w-4 shrink-0 text-muted-foreground" />
      <span class="text-muted-foreground shrink-0 font-medium">SHA-256 指纹：</span>
      <span class="font-mono text-foreground font-semibold truncate select-all">{hash}</span>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onclick={handleCopyHash}
        title="复制哈希值"
        aria-label="复制哈希值"
      >
        {#if copied}
          <Check class="h-3.5 w-3.5 text-success" />
        {:else}
          <Copy class="h-3.5 w-3.5" />
        {/if}
      </button>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if verified}
        <span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success border border-success/30">
          <Check class="h-3 w-3 stroke-[3]" />
          <span>存证验真通过</span>
        </span>
      {:else}
        <span class="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning border border-warning/30">
          <AlertCircle class="h-3 w-3" />
          <span>待复核锚定</span>
        </span>
      {/if}

      {#if onverifyHash}
        <button
          type="button"
          class="text-xs text-primary hover:underline font-medium ml-1"
          onclick={onverifyHash}
        >
          重新验签
        </button>
      {/if}
    </div>
  </div>

  <!-- Metadata Attributes Grid -->
  <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-card border-b border-border text-xs">
    <div class="flex items-start gap-2.5">
      <User class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div>
        <div class="text-muted-foreground font-medium">操作责任人</div>
        <div class="font-semibold text-foreground mt-0.5">{operatorName}</div>
        <div class="font-mono text-[11px] text-muted-foreground">{operatorId}</div>
      </div>
    </div>

    <div class="flex items-start gap-2.5">
      <Globe class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div>
        <div class="text-muted-foreground font-medium">终端 IP 溯源</div>
        <div class="font-mono font-semibold text-foreground mt-0.5">{clientIp}</div>
        <div class="text-[11px] text-muted-foreground">通过内网安全网关审计</div>
      </div>
    </div>

    <div class="flex items-start gap-2.5">
      <Building2 class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div>
        <div class="text-muted-foreground font-medium">归属租户 / 部门</div>
        <div class="font-medium text-foreground mt-0.5 truncate">{tenantName}</div>
      </div>
    </div>

    <div class="flex items-start gap-2.5">
      <Clock class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div>
        <div class="text-muted-foreground font-medium">存证时间戳 (毫秒级)</div>
        <div class="font-mono font-medium text-foreground mt-0.5">{timestamp}</div>
      </div>
    </div>
  </div>

  <!-- Changes Differential View & Payload Switcher -->
  <div class="relative p-5">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1 text-xs font-semibold rounded-lg transition-colors
            {activeTab === 'diff' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'}"
          onclick={() => activeTab = 'diff'}
        >
          变更字段 Diff 对比 ({changes.length})
        </button>
        {#if rawPayload}
          <button
            type="button"
            class="px-3 py-1 text-xs font-semibold rounded-lg transition-colors
              {activeTab === 'raw' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'}"
            onclick={() => activeTab = 'raw'}
          >
            原始 Payload (JSON)
          </button>
        {/if}
      </div>

      <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
        {actionType === 'delete' || actionType === 'privilege_grant' ? 'bg-destructive/15 text-destructive border border-destructive/20' :
         actionType === 'update' ? 'bg-warning/15 text-warning border border-warning/20' :
         'bg-success/15 text-success border border-success/20'}">
        {actionLabel || actionType}
      </span>
    </div>

    {#if activeTab === 'diff'}
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <th class="py-2.5 px-4 w-1/4">字段属性</th>
              <th class="py-2.5 px-4 w-3/8">变更前 (Before)</th>
              <th class="py-2.5 px-4 w-3/8">变更后 (After)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each changes as item}
              <tr class="hover:bg-muted/30 transition-colors">
                <td class="py-2 px-4 font-mono font-medium text-foreground">
                  <div>{item.field}</div>
                  {#if item.label}
                    <div class="text-[11px] text-muted-foreground font-sans">{item.label}</div>
                  {/if}
                </td>
                <td class="py-2 px-4 font-mono text-muted-foreground line-through opacity-75">
                  {formatValue(item.before)}
                </td>
                <td class="py-2 px-4 font-mono font-semibold text-foreground bg-primary/5">
                  {formatValue(item.after)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if rawPayload}
      <pre class="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground max-h-64">{JSON.stringify(rawPayload, null, 2)}</pre>
    {/if}
  </div>

  <!-- Bottom Legal Guarantee Footnote -->
  <div class="relative flex items-center justify-between border-t border-border bg-muted/20 px-5 py-2.5 text-[11px] text-muted-foreground">
    <span>数字签名符合 ISO/IEC 27001 与公安部等保三级合规要求</span>
    <span class="font-mono">Secure Hash Algorithm 256-bit</span>
  </div>
</div>
