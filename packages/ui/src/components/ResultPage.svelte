<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    ShieldAlert,
    FileQuestion,
    ServerCrash,
  } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export type ResultStatus = 'success' | 'processing' | 'warning' | 'error' | '403' | '404' | '500';

  export interface ResultPageProps {
    /** 业务结果或异常状态类型，默认 'success' */
    status?: ResultStatus | undefined;
    /** 大号主标题，如 "订单提交成功" 或 "无权访问此页面" */
    title: string;
    /** 详细描述说明或提示信息 */
    description?: string | undefined;
    /** 主要操作按钮文案（如 "返回工作台"、"重新提交"） */
    primaryActionText?: string | undefined;
    /** 主要操作按钮点击回调 */
    onPrimaryAction?: (() => void) | undefined;
    /** 次要操作按钮文案（如 "查看详情"、"返回上一页"） */
    secondaryActionText?: string | undefined;
    /** 次要操作按钮点击回调 */
    onSecondaryAction?: (() => void) | undefined;
    /** 布局形态：'page'（页面级全宽居中）或 'card'（卡片容器内嵌），默认 'card' */
    layout?: 'page' | 'card' | undefined;
    /** 自定义操作按钮区域插槽 */
    actions?: Snippet | undefined;
    /** 关联业务信息或补充详情插槽（如订单明细卡片、审批人流水等） */
    children?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    status = 'success',
    title,
    description,
    primaryActionText,
    onPrimaryAction,
    secondaryActionText,
    onSecondaryAction,
    layout = 'card',
    actions,
    children,
    class: className = '',
  }: ResultPageProps = $props();

  const statusTone = $derived.by(() => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconClass: 'text-success',
          bgClass: 'bg-success/10 ring-success/20',
        };
      case 'processing':
        return {
          icon: Clock,
          iconClass: 'text-primary',
          bgClass: 'bg-primary/10 ring-primary/20',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconClass: 'text-warning',
          bgClass: 'bg-warning/10 ring-warning/20',
        };
      case 'error':
        return {
          icon: XCircle,
          iconClass: 'text-destructive',
          bgClass: 'bg-destructive/10 ring-destructive/20',
        };
      case '403':
        return {
          icon: ShieldAlert,
          iconClass: 'text-warning',
          bgClass: 'bg-warning/10 ring-warning/20',
        };
      case '404':
        return {
          icon: FileQuestion,
          iconClass: 'text-muted-foreground',
          bgClass: 'bg-muted ring-border',
        };
      case '500':
      default:
        return {
          icon: ServerCrash,
          iconClass: 'text-destructive',
          bgClass: 'bg-destructive/10 ring-destructive/20',
        };
    }
  });

  const IconComp = $derived(statusTone.icon);
</script>

<div
  data-svadmin-component="ResultPage"
  data-status={status}
  class={cn(
    'flex flex-col items-center justify-center text-center',
    layout === 'page'
      ? 'min-h-[50vh] py-16 px-4 w-full'
      : 'rounded-md border border-border bg-card p-8 md:p-12 shadow-xs w-full',
    className
  )}
>
  <!-- Big Semantic Icon with Soft Halo Ring -->
  <div class={cn('mb-6 flex h-20 w-20 items-center justify-center rounded-full ring-8', statusTone.bgClass)}>
    <IconComp class={cn('h-10 w-10', statusTone.iconClass)} />
  </div>

  <!-- Title & Description -->
  <h1 class="text-xl md:text-2xl font-bold tracking-tight text-foreground">
    {title}
  </h1>

  {#if description}
    <p class="mt-2.5 max-w-lg text-sm text-muted-foreground leading-relaxed">
      {description}
    </p>
  {/if}

  <!-- Action Buttons -->
  {#if actions}
    <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
      {@render actions()}
    </div>
  {:else if primaryActionText || secondaryActionText}
    <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
      {#if primaryActionText}
        <Button
          class="min-w-28"
          onclick={onPrimaryAction}
        >
          {primaryActionText}
        </Button>
      {/if}
      {#if secondaryActionText}
        <Button
          variant="outline"
          class="min-w-28"
          onclick={onSecondaryAction}
        >
          {secondaryActionText}
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Related Business Information Slot -->
  {#if children}
    <div class="mt-8 w-full max-w-xl text-left rounded-md border border-border/80 bg-muted/20 p-5 text-sm">
      {@render children()}
    </div>
  {/if}
</div>
