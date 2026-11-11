<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    PieChart,
    AlertTriangle,
    Zap,
    HardDrive,
    Users,
    Cpu,
    ArrowUpRight,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface TenantQuotaItem {
    id: string;
    resourceName: string;
    used: number;
    limit: number;
    unit?: string | undefined;
    icon?: 'api' | 'storage' | 'seats' | 'compute' | undefined;
  }

  export interface TenantQuotasMatrixProps {
    tenantName?: string | undefined;
    planName?: string | undefined;
    quotas?: TenantQuotaItem[] | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onUpgradePlan?: (() => void) | undefined;
    onRequestQuotaIncrease?: ((quota: TenantQuotaItem) => void) | undefined;
    children?: Snippet | undefined;
  }

  let {
    tenantName = 'Acme Global Group',
    planName = 'Enterprise Pro',
    quotas = [
      { id: 'api_calls', resourceName: '每月 API 调用次数', used: 980000, limit: 1000000, unit: '次', icon: 'api' },
      { id: 'cloud_storage', resourceName: '分布式对象存储容量', used: 485, limit: 500, unit: 'GB', icon: 'storage' },
      { id: 'team_seats', resourceName: '企业已分配席位', used: 48, limit: 50, unit: '人', icon: 'seats' },
      { id: 'gpu_compute', resourceName: 'AI 算力点数消耗', used: 12000, limit: 12000, unit: '点', icon: 'compute' },
    ],
    title,
    class: className = '',
    onUpgradePlan,
    onRequestQuotaIncrease,
    children,
  }: TenantQuotasMatrixProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let exhaustedModalQuota = $state<TenantQuotaItem | null>(null);

  const enrichedQuotas = $derived(
    quotas.map((q) => {
      const percentage = Math.min(100, Math.round((q.used / Math.max(1, q.limit)) * 100));
      const isExhausted = q.used >= q.limit;
      const isNearLimit = percentage >= 80 && !isExhausted;

      return {
        ...q,
        percentage,
        isExhausted,
        isNearLimit,
      };
    }),
  );


  const resolvedTitle = $derived(title ?? (chinese ? '多租户配额与资源熔断看板' : 'Tenant Resource Quotas Matrix'));
</script>

<div
  data-svadmin-component="TenantQuotasMatrix"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <PieChart class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{tenantName} · {planName}</p>
      </div>
    </div>

    {#if onUpgradePlan}
      <Button size="sm" onclick={onUpgradePlan} class="gap-1 text-xs font-semibold">
        <span>{chinese ? '升级租户套餐' : 'Upgrade Plan'}</span>
        <ArrowUpRight class="h-3.5 w-3.5" />
      </Button>
    {/if}
  </div>

  <!-- Quota Gauges Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each enrichedQuotas as quota (quota.id)}
      <div
        class={cn(
          'relative flex flex-col justify-between p-4 rounded-xl border transition-all bg-card shadow-2xs space-y-3',
          quota.isExhausted
            ? 'border-destructive/60 ring-2 ring-destructive/20 bg-destructive/5'
            : quota.isNearLimit
              ? 'border-warning/60 bg-warning/5'
              : 'border-border/80',
        )}
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2">
            {#if quota.icon === 'api'}
              <Zap class="h-4 w-4 text-primary" />
            {:else if quota.icon === 'storage'}
              <HardDrive class="h-4 w-4 text-info" />
            {:else if quota.icon === 'seats'}
              <Users class="h-4 w-4 text-success" />
            {:else}
              <Cpu class="h-4 w-4 text-warning" />
            {/if}
            <span class="font-bold text-xs text-foreground truncate max-w-28">{quota.resourceName}</span>
          </div>

          {#if quota.isExhausted}
            <span class="rounded bg-destructive/15 px-1.5 py-0.2 text-[9px] font-bold text-destructive uppercase">
              100% 熔断
            </span>
          {:else if quota.isNearLimit}
            <span class="rounded bg-warning/15 px-1.5 py-0.2 text-[9px] font-bold text-warning uppercase">
              {quota.percentage}% 告警
            </span>
          {:else}
            <span class="font-mono text-[11px] text-muted-foreground font-semibold">
              {quota.percentage}%
            </span>
          {/if}
        </div>

        <!-- Numbers Row -->
        <div class="flex items-baseline justify-between font-mono text-xs">
          <span class="font-bold text-foreground text-sm">
            {quota.used.toLocaleString()} <span class="text-[11px] text-muted-foreground font-normal">{quota.unit ?? ''}</span>
          </span>
          <span class="text-muted-foreground text-[11px]">
            / {quota.limit.toLocaleString()} {quota.unit ?? ''}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            class={cn(
              'h-full rounded-full transition-all duration-300',
              quota.isExhausted ? 'bg-destructive' : quota.isNearLimit ? 'bg-warning' : 'bg-primary',
            )}
            style="width: {quota.percentage}%;"
          ></div>
        </div>

        {#if quota.isExhausted && onRequestQuotaIncrease}
          <button
            type="button"
            onclick={() => (exhaustedModalQuota = quota)}
            class="w-full text-center text-[11px] font-bold text-destructive hover:underline pt-1"
          >
            {chinese ? '⚠️ 配额已用尽，申请临时提额' : 'Request Quota Increase'}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if children}
    <div class="pt-2">
      {@render children()}
    </div>
  {/if}
</div>

<!-- Exhausted Warning Dialog -->
{#if exhaustedModalQuota}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Quota Exhausted"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
  >
    <div class="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl text-xs space-y-3">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive border border-destructive/20 shrink-0">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold text-foreground">
            {chinese ? '当前租户资源配额已耗尽' : 'Resource Quota Exhausted'}
          </h4>
          <p class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {chinese
              ? `租户已达到 [${exhaustedModalQuota.resourceName}] 上限 (${exhaustedModalQuota.limit.toLocaleString()} ${exhaustedModalQuota.unit ?? ''})。继续执行操作可能被服务端拒绝。`
              : `Quota for ${exhaustedModalQuota.resourceName} has reached 100%.`}
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-border/70">
        <Button variant="ghost" size="sm" onclick={() => (exhaustedModalQuota = null)}>
          {chinese ? '关闭' : 'Dismiss'}
        </Button>
        {#if onRequestQuotaIncrease}
          <Button
            size="sm"
            onclick={() => {
              if (exhaustedModalQuota) onRequestQuotaIncrease(exhaustedModalQuota);
              exhaustedModalQuota = null;
            }}
          >
            {chinese ? '提交提额工单' : 'Submit Request'}
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
