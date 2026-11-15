<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy, untrack } from 'svelte';
  import {
    Lock,
    Globe,
    RefreshCw,
    Key,
    CheckCircle2
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type CertSecurityLevel = 'valid' | 'expiring_soon' | 'critical' | 'expired';

  export interface SslCertificateData {
    id: string;
    domain: string;
    sanDomains?: string[]; // 备用名称（Subject Alternative Names）
    issuer: string; // 颁发者 CA，如 "Let's Encrypt Authority X3"、"DigiCert Global Root CA"
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    algorithm?: string; // 如 "RSA 2048-bit"、"ECDSA P-256"
    tlsVersions?: string[]; // 如 ["TLS 1.2", "TLS 1.3"]
    ocspStaplingEnabled?: boolean;
    autoRenewEnabled?: boolean;
    chainComplete?: boolean;
  }

  export interface SslCertificateMonitorCardProps {
    /** SSL/TLS 证书监控数据 */
    certificate: SslCertificateData;
    /** 自动续期触发回调 */
    onTriggerAutoRenew?: (certId: string) => void | Promise<void>;
    /** 重新扫描证书链状态回调 */
    onRecheckChain?: (certId: string) => void | Promise<void>;
    /** 自定义操作栏插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    certificate,
    onTriggerAutoRenew,
    onRecheckChain,
    actions,
    class: className = ''
  }: SslCertificateMonitorCardProps = $props();

  let pending = $state({ renew: false, check: false });
  let errors = $state({ renew: '', check: '' });
  const generations = { renew: 0, check: 0 };
  let destroyed = false;
  let observed = untrack(() => ({ id: certificate.id, onTriggerAutoRenew, onRecheckChain }));
  $effect.pre(() => {
    if (certificate.id !== observed.id || onTriggerAutoRenew !== observed.onTriggerAutoRenew) {
      generations.renew += 1;
      pending.renew = false;
      errors.renew = '';
    }
    if (certificate.id !== observed.id || onRecheckChain !== observed.onRecheckChain) {
      generations.check += 1;
      pending.check = false;
      errors.check = '';
    }
    observed = { id: certificate.id, onTriggerAutoRenew, onRecheckChain };
  });
  onDestroy(() => { destroyed = true; generations.renew += 1; generations.check += 1; });

  async function runCertificateAction(action: 'renew' | 'check') {
    const callback = action === 'renew' ? onTriggerAutoRenew : onRecheckChain;
    if (pending[action] || !callback || destroyed) return;
    const scope = generations[action];
    const certId = certificate.id;
    const isCurrent = () => !destroyed && generations[action] === scope && certificate.id === certId
      && callback === (action === 'renew' ? onTriggerAutoRenew : onRecheckChain);
    pending[action] = true;
    errors[action] = '';
    try {
      await callback(certificate.id);
    } catch {
      if (isCurrent()) errors[action] = action === 'renew' ? '证书续期失败，请重试' : '证书链检查失败，请重试';
    } finally {
      if (isCurrent()) pending[action] = false;
    }
  }

  function getSecurityStatus(daysRemaining: number): {
    level: CertSecurityLevel;
    label: string;
    border: string;
    badgeClass: string;
    desc: string;
  } {
    if (daysRemaining <= 0) {
      return {
        level: 'expired',
        label: '证书已过期',
        border: 'border-destructive/40',
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
        desc: '证书已超过有效截止期，浏览器将向访客拦截并提示安全风险，请立即更新证书！'
      };
    }
    if (daysRemaining <= 7) {
      return {
        level: 'critical',
        label: `即将到期 (${daysRemaining}天)`,
        border: 'border-destructive/40',
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/30 dark:text-destructive',
        desc: '证书剩余有效天数不足 7 天，属于极高危状态，建议立即执行 ACME 自动或人工续期。'
      };
    }
    if (daysRemaining <= 30) {
      return {
        level: 'expiring_soon',
        label: `到期预警 (${daysRemaining}天)`,
        border: 'border-warning/30',
        badgeClass: 'bg-warning/15 text-warning border-warning/30 dark:text-warning',
        desc: '证书处于 30 天常规预警期，建议核查 DNS 验证记录与自动续期任务状态。'
      };
    }
    return {
      level: 'valid',
      label: `证书正常 (${daysRemaining}天)`,
      border: 'border-success/30',
      badgeClass: 'bg-success/15 text-success border-success/30 dark:text-success',
      desc: '证书剩余有效期超过 30 天；信任链及吊销状态须以实际核验结果为准。'
    };
  }

  const status = $derived(getSecurityStatus(certificate.daysRemaining));
  // 按照 90 天证书周期估算剩余寿命百分比
  const lifePercentage = $derived(Math.max(0, Math.min(100, Math.round((certificate.daysRemaining / 90) * 100))));
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all overflow-hidden',
    status.border,
    className
  )}
  data-svadmin-component="SslCertificateMonitorCard"
>
  <!-- 头部：域名与证书到期倒计时雷达 -->
  <header class="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-border bg-muted/20">
    <div class="flex items-start gap-4">
      <!-- 锁与到期倒计时雷达环 -->
      <div class="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-background p-2 shadow-xs">
        <svg viewBox="0 0 36 36" class="h-full w-full">
          <path
            class="text-muted stroke-current"
            stroke-width="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            class={cn(
              'stroke-current transition-all duration-500',
              certificate.daysRemaining <= 7
                ? 'text-destructive'
                : certificate.daysRemaining <= 30
                  ? 'text-warning'
                  : 'text-success'
            )}
            stroke-dasharray="{lifePercentage}, 100"
            stroke-width="3.5"
            stroke-linecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>

        <div class="absolute flex flex-col items-center justify-center text-center">
          <Lock class="h-4 w-4 text-foreground mb-0.5" />
          <span class="text-[10px] font-bold font-mono text-foreground leading-none">
            {certificate.daysRemaining}d
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base font-bold text-foreground font-mono">{certificate.domain}</h3>
          <span class={cn('rounded border px-2 py-0.5 text-xs font-semibold', status.badgeClass)}>
            {status.label}
          </span>
          {#if certificate.autoRenewEnabled}
            <span class="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium">
              自动续期已开启
            </span>
          {/if}
        </div>

        <p class="text-xs text-muted-foreground max-w-xl leading-relaxed">
          {status.desc}
        </p>

        <!-- 颁发机构与时间范围 -->
        <div class="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>颁发者：<strong class="text-foreground">{certificate.issuer}</strong></span>
          <span>有效截止：<code class="font-mono text-foreground">{certificate.validTo}</code></span>
        </div>
      </div>
    </div>

    <!-- 右侧快捷运维控制 -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        disabled={pending.check || !onRecheckChain}
        onclick={() => runCertificateAction('check')}
      >
        <RefreshCw class={cn('h-3.5 w-3.5', pending.check && 'animate-spin text-primary')} />
        校验证书链
      </button>

      {#if onTriggerAutoRenew}
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={pending.renew}
          onclick={() => runCertificateAction('renew')}
        >
          <RefreshCw class={cn('h-3.5 w-3.5', pending.renew && 'animate-spin')} />
          立即续期
        </button>
      {/if}

      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </header>
  {#if errors.renew}<p role="alert" class="p-4 text-xs text-destructive">{errors.renew}</p>{/if}
  {#if errors.check}<p role="alert" class="p-4 text-xs text-destructive">{errors.check}</p>{/if}

  <!-- 中间：证书参数属性表 -->
  <div class="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 text-xs">
    <!-- 密码套件与算法参数 (左) -->
    <div class="flex flex-col gap-2.5 p-5">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <span class="flex items-center gap-1.5 font-semibold text-foreground">
          <Key class="h-4 w-4 text-primary" />
          加密算法与 TLS 协议特性
        </span>
        {#if certificate.chainComplete}
          <span class="flex items-center gap-1 rounded bg-success/10 text-success px-1.5 py-0.2 text-[10px] font-medium border border-success/20">
            <CheckCircle2 class="h-3 w-3" />
            证书链完整
          </span>
        {:else}
          <span>{certificate.chainComplete === false ? '证书链不完整' : '证书链状态未知'}</span>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-2 text-muted-foreground">
        <div>
          <span>加密公钥算法：</span>
          <strong class="text-foreground font-mono block pt-0.5">
            {certificate.algorithm || '未提供'}
          </strong>
        </div>
        <div>
          <span>OCSP Stapling：</span>
          <span class="text-foreground block pt-0.5">
            {certificate.ocspStaplingEnabled === undefined ? '未知' : certificate.ocspStaplingEnabled ? '已启用' : '未启用'}
          </span>
        </div>
        <div>
          <span>生效起止区间：</span>
          <span class="font-mono text-foreground text-[11px] block pt-0.5">
            {certificate.validFrom} ~ {certificate.validTo}
          </span>
        </div>
        <div>
          <span>支持 TLS 协议：</span>
          <div class="flex gap-1 pt-0.5 font-mono">
            {#each certificate.tlsVersions ?? [] as tls (tls)}
              <span class="rounded bg-muted px-1.5 py-0.2 text-[10px] text-foreground">{tls}</span>
            {:else}<span>{certificate.tlsVersions ? '未报告支持版本' : '未提供'}</span>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- SAN 多域名覆盖 (右) -->
    <div class="flex flex-col gap-2.5 p-5 bg-muted/10">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <span class="flex items-center gap-1.5 font-semibold text-foreground">
          <Globe class="h-4 w-4 text-success" />
          备用名称覆盖 (SAN Domains)
        </span>
        <span class="text-muted-foreground text-[11px]">
          共计 {certificate.sanDomains?.length ?? 1} 个域名
        </span>
      </div>

      <div class="flex flex-wrap gap-1.5 pt-1">
        {#each certificate.sanDomains || [certificate.domain] as d (d)}
          <span class="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground shadow-2xs">
            {d}
          </span>
        {/each}
      </div>
    </div>
  </div>
</div>
