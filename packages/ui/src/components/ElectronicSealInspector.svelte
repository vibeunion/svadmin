<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    FileCheck2,
    Clock,
    Key,
    Building2,
    Award,
    Hash,
    ChevronDown,
    ChevronUp,
    Download,
    RefreshCw,
    ExternalLink
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type SealValidationStatus = 'valid' | 'expired' | 'revoked' | 'tampered' | 'untrusted';
  export type SealType = 'official' | 'contract' | 'finance' | 'legal_person' | 'custom';

  export interface SealCertificateInfo {
    /** 证书颁发 CA 机构，如 "中国金融认证中心 (CFCA)" */
    issuer: string;
    /** 证书持有人主体名称 */
    subject: string;
    /** 证书序列号 */
    serialNumber: string;
    /** 签名与加密算法，如 "SM2-with-SM3" 或 "RSA-SHA256" */
    algorithm: string;
    /** 有效期开始时间 */
    validFrom: string;
    /** 有效期截止时间 */
    validTo: string;
    /** SHA-256 证书指纹 */
    fingerprintSha256: string;
    /** 密钥用途 */
    keyUsage?: string;
  }

  export interface SealTimestampInfo {
    /** 时间戳服务机构，如 "国家授时中心 TSA" */
    tsaName: string;
    /** 签署存证确切时间，如 "2024-11-14 15:32:08 CST" */
    stampedAt: string;
    /** 时间戳令牌哈希 */
    timestampTokenId: string;
    /** 时间戳是否校验通过 */
    verified: boolean;
  }

  export interface SealVerificationLog {
    id: string;
    step: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    checkedAt: string;
  }

  export interface ElectronicSealInfo {
    id: string;
    sealName: string;
    sealType: SealType;
    enterpriseName: string;
    creditCode: string;
    sealCode?: string;
    signerName?: string;
    signerDepartment?: string;
    sealGraphicUrl?: string;
    status: SealValidationStatus;
    documentHashMatch: boolean;
    certificate: SealCertificateInfo;
    timestamp: SealTimestampInfo;
    auditLogs?: SealVerificationLog[];
  }

  export interface ElectronicSealInspectorProps {
    /** 电子印章与防伪校验数据 */
    seal: ElectronicSealInfo;
    /** 是否可折叠详情卡片 */
    collapsible?: boolean;
    /** 默认是否展开证书与审计日志 */
    defaultExpanded?: boolean;
    /** 验真报告导出回调 */
    onExportReport?: (seal: ElectronicSealInfo) => void;
    /** 重新触发验真回调 */
    onRevalidate?: (sealId: string) => void;
    /** 自定义操作区插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    seal,
    collapsible = true,
    defaultExpanded = true,
    onExportReport,
    onRevalidate,
    actions,
    class: className = ''
  }: ElectronicSealInspectorProps = $props();

  let isExpanded = $state(defaultExpanded);
  let isRevalidating = $state(false);

  async function handleRevalidate() {
    if (isRevalidating) return;
    isRevalidating = true;
    try {
      onRevalidate?.(seal.id);
    } finally {
      setTimeout(() => {
        isRevalidating = false;
      }, 500);
    }
  }

  function getStatusConfig(status: SealValidationStatus, hashMatch: boolean) {
    if (!hashMatch || status === 'tampered') {
      return {
        label: '文档已被篡改',
        tone: 'danger',
        desc: '数字签名与文档哈希比对不一致，正文或附件在盖章后发生变动，印章失效。',
        icon: ShieldAlert,
        badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400',
        cardBorder: 'border-rose-500/30'
      };
    }
    switch (status) {
      case 'valid':
        return {
          label: '验真通过 · 真实有效',
          tone: 'success',
          desc: 'CA 机构数字证书有效，时间戳存证可信，签名文档哈希一致且未被篡改。',
          icon: ShieldCheck,
          badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
          cardBorder: 'border-emerald-500/30'
        };
      case 'expired':
        return {
          label: '证书已过期',
          tone: 'warning',
          desc: '数字证书已超出有效截止时间，盖章当时的时间戳需进一步核验有效性。',
          icon: ShieldAlert,
          badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
          cardBorder: 'border-amber-500/30'
        };
      case 'revoked':
        return {
          label: '证书已被吊销',
          tone: 'danger',
          desc: '颁发 CA 机构 CRL 吊销列表中查询到该证书已被撤销，印章失效。',
          icon: ShieldX,
          badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400',
          cardBorder: 'border-rose-500/30'
        };
      default:
        return {
          label: '不受信任机构',
          tone: 'warning',
          desc: '根证书颁发机构不在权威信任链清单中，请核对自签名或第三方 CA。',
          icon: ShieldAlert,
          badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
          cardBorder: 'border-amber-500/30'
        };
    }
  }

  function getSealTypeLabel(type: SealType) {
    switch (type) {
      case 'official':
        return '企业公章 / 法定名称章';
      case 'contract':
        return '合同专用章';
      case 'finance':
        return '财务专用章';
      case 'legal_person':
        return '法定代表人名章';
      default:
        return '业务专用电子印章';
    }
  }

  const statusConfig = $derived(getStatusConfig(seal.status, seal.documentHashMatch));
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all',
    statusConfig.cardBorder,
    className
  )}
  data-svadmin-component="ElectronicSealInspector"
>
  <!-- 主卡片头部 -->
  <div class="flex flex-wrap items-start justify-between gap-4 p-5">
    <div class="flex items-start gap-4">
      <!-- 纯 SVG 矢量电子印章预览模拟器 -->
      <div class="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 p-2">
        <svg viewBox="0 0 100 100" class="h-full w-full text-rose-500 select-none">
          <!-- 外圆圈 -->
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.85" />
          <!-- 内同心细圈 -->
          <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.6" />
          <!-- 中心五角星 -->
          <polygon
            points="50,28 56,42 70,42 59,51 63,65 50,56 37,65 41,51 30,42 44,42"
            fill="currentColor"
            opacity="0.9"
          />
          <!-- 底部横排文字 -->
          <text
            x="50"
            y="76"
            text-anchor="middle"
            font-size="7"
            font-weight="bold"
            fill="currentColor"
            letter-spacing="0.5"
          >
            {getSealTypeLabel(seal.sealType).slice(0, 5)}
          </text>
          <!-- 环形企业名称路径 -->
          <path id="seal-text-path" d="M 12,50 A 38,38 0 1,1 88,50" fill="none" />
          <text font-size="6" fill="currentColor" font-weight="600" opacity="0.85">
            <textPath href="#seal-text-path" startOffset="50%" text-anchor="middle">
              {seal.enterpriseName}
            </textPath>
          </text>
        </svg>

        <!-- 角标防伪状态徽标 -->
        <div class="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow-xs">
          {#if seal.status === 'valid' && seal.documentHashMatch}
            <ShieldCheck class="h-5 w-5 text-emerald-500" />
          {:else}
            <ShieldAlert class="h-5 w-5 text-rose-500" />
          {/if}
        </div>
      </div>

      <!-- 印章名称与基础信息 -->
      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base font-bold text-foreground">{seal.sealName}</h3>
          <span class={cn('rounded border px-2 py-0.5 text-xs font-semibold', statusConfig.badgeClass)}>
            {statusConfig.label}
          </span>
          <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {getSealTypeLabel(seal.sealType)}
          </span>
        </div>

        <p class="text-xs text-muted-foreground max-w-xl leading-relaxed">
          {statusConfig.desc}
        </p>

        <!-- 关键元数据小胶囊 -->
        <div class="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <Building2 class="h-3.5 w-3.5" />
            {seal.enterpriseName}
          </span>
          <span>统一信用代码：<code class="font-mono text-foreground">{seal.creditCode}</code></span>
          {#if seal.sealCode}
            <span>印章防伪编码：<code class="font-mono text-foreground">{seal.sealCode}</code></span>
          {/if}
        </div>
      </div>
    </div>

    <!-- 右上角快捷操作 -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        disabled={isRevalidating}
        onclick={handleRevalidate}
        title="向 CA 与时间戳服务器重新发起验真"
      >
        <RefreshCw class={cn('h-3.5 w-3.5', isRevalidating && 'animate-spin text-primary')} />
        重新验真
      </button>

      {#if onExportReport}
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          onclick={() => onExportReport(seal)}
          title="导出防伪验真报告 PDF/存证凭据"
        >
          <Download class="h-3.5 w-3.5" />
          验真凭据
        </button>
      {/if}

      {#if actions}
        {@render actions()}
      {/if}

      {#if collapsible}
        <button
          type="button"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={() => (isExpanded = !isExpanded)}
          aria-label={isExpanded ? '收起详情' : '展开详情'}
        >
          {#if isExpanded}
            <ChevronUp class="h-4 w-4" />
          {:else}
            <ChevronDown class="h-4 w-4" />
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- 可折叠详细凭证区 -->
  {#if isExpanded}
    <div class="flex flex-col divide-y divide-border border-t border-border bg-muted/20 text-xs">
      <!-- 双卡片分栏：CA 数字证书 + 可信时间戳 -->
      <div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <!-- CA 证书详情卡片 -->
        <div class="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="flex items-center gap-1.5 font-semibold text-foreground">
              <Award class="h-4 w-4 text-primary" />
              CA 权威机构数字证书
            </span>
            <span class="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-mono">
              {seal.certificate.algorithm}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-2 text-muted-foreground">
            <div class="flex justify-between">
              <span>颁发机构 (Issuer)：</span>
              <strong class="text-foreground">{seal.certificate.issuer}</strong>
            </div>
            <div class="flex justify-between">
              <span>证书使用者 (Subject)：</span>
              <span class="text-foreground">{seal.certificate.subject}</span>
            </div>
            <div class="flex justify-between">
              <span>证书序列号：</span>
              <code class="font-mono text-foreground text-[11px]">{seal.certificate.serialNumber}</code>
            </div>
            <div class="flex justify-between">
              <span>有效期限：</span>
              <span class="text-foreground">{seal.certificate.validFrom} 至 {seal.certificate.validTo}</span>
            </div>
            <div class="flex flex-col gap-0.5 pt-1">
              <span>SHA-256 指纹：</span>
              <code class="break-all rounded bg-muted p-1 font-mono text-[10px] text-foreground">
                {seal.certificate.fingerprintSha256}
              </code>
            </div>
          </div>
        </div>

        <!-- TSA 可信时间戳卡片 -->
        <div class="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="flex items-center gap-1.5 font-semibold text-foreground">
              <Clock class="h-4 w-4 text-emerald-500" />
              权威可信时间戳 (TSA)
            </span>
            <span class={cn('rounded px-1.5 py-0.2 text-[10px] font-medium border',
              seal.timestamp.verified
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            )}>
              {seal.timestamp.verified ? '时间戳验真有效' : '时间戳无效'}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-2 text-muted-foreground">
            <div class="flex justify-between">
              <span>授时机构：</span>
              <strong class="text-foreground">{seal.timestamp.tsaName}</strong>
            </div>
            <div class="flex justify-between">
              <span>盖章存证时间：</span>
              <span class="font-mono text-foreground">{seal.timestamp.stampedAt}</span>
            </div>
            {#if seal.signerName}
              <div class="flex justify-between">
                <span>经办签章人：</span>
                <span class="text-foreground">{seal.signerName} {seal.signerDepartment ? `(${seal.signerDepartment})` : ''}</span>
              </div>
            {/if}
            <div class="flex flex-col gap-0.5 pt-1">
              <span>时间戳防伪令牌哈希：</span>
              <code class="break-all rounded bg-muted p-1 font-mono text-[10px] text-foreground">
                {seal.timestamp.timestampTokenId}
              </code>
            </div>
          </div>
        </div>
      </div>

      <!-- 审计校验日志链 -->
      {#if seal.auditLogs && seal.auditLogs.length > 0}
        <div class="p-5">
          <div class="mb-3 flex items-center justify-between">
            <span class="font-semibold text-foreground">防伪验真链路与合规审计日志</span>
            <span class="text-muted-foreground text-[11px]">共计 {seal.auditLogs.length} 项核验点</span>
          </div>

          <div class="flex flex-col gap-2">
            {#each seal.auditLogs as log (log.id)}
              <div class="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
                <div class="flex items-center gap-2.5">
                  {#if log.status === 'pass'}
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-bold">✓</span>
                  {:else if log.status === 'warn'}
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold">!</span>
                  {:else}
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 text-xs font-bold">✕</span>
                  {/if}
                  <div class="flex flex-col">
                    <span class="font-medium text-foreground">{log.step}</span>
                    <span class="text-[11px] text-muted-foreground">{log.message}</span>
                  </div>
                </div>
                <span class="font-mono text-[10px] text-muted-foreground">{log.checkedAt}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
