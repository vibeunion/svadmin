<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Rocket,
    ArrowRight,
    Zap,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface FeatureCardItem {
    id: string;
    title: string;
    description: string;
    tag?: string | undefined;
  }

  export interface FeatureAnnouncementModalProps {
    open?: boolean | undefined;
    version?: string | undefined;
    releaseDate?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    features?: FeatureCardItem[] | undefined;
    storageKey?: string | undefined;
    class?: string | undefined;
    onExplore?: (() => void) | undefined;
    onClose?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    version = 'v0.5.15',
    releaseDate = '2026-11-11',
    title,
    description,
    features = [
      { id: '1', title: '多级审批流设计器', description: '纵向节点编排，支持会签、或签与多级路由分支。', tag: 'NEW' },
      { id: '2', title: '全景微服务拓扑图', description: '0KB 纯原生 SVG 矢量绘制三层集群网关、服务与数据库。', tag: 'ENHANCED' },
      { id: '3', title: '动态公式沙箱计算', description: '无 eval() 安全公式字段，支持四则运算与统计函数。', tag: 'SECURITY' },
      { id: '4', title: '全键盘动作托盘', description: '按 ⌘. 瞬时呼出 Raycast 极速动作托盘，支持拼音模糊检索。', tag: 'PRODUCTIVITY' },
    ],
    storageKey = 'svadmin_dismissed_version',
    class: className = '',
    onExplore,
    onClose,
  }: FeatureAnnouncementModalProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let dontShowAgain = $state(false);

  onMount(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved === version) {
          open = false;
        }
      } catch {
        // Storage unavailable
      }
    }
  });

  function handleDismiss() {
    if (dontShowAgain && storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, version);
      } catch {
        // Ignore
      }
    }
    open = false;
    onClose?.();
  }

  function handleExploreClick() {
    handleDismiss();
    onExplore?.();
  }

  const resolvedTitle = $derived(title ?? (chinese ? '新功能特性发布' : "What's New in SVAdmin"));
  const resolvedDesc = $derived(
    description ?? (chinese ? '欢迎体验最新升级的企业级生产力套件' : 'Explore newly shipped enterprise productivity suites'),
  );
</script>

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="What is new modal"
    data-svadmin-component="FeatureAnnouncementModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm select-none"
  >
    <!-- Modal Container -->
    <div
      class={cn(
        'relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150',
        className,
      )}
    >
      <!-- Top Radial Ambient Header -->
      <div class="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border/70">
        <button
          type="button"
          onclick={handleDismiss}
          class="absolute top-4 right-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>

        <div class="flex items-center gap-2 mb-2">
          <span class="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-mono font-bold text-primary border border-primary/30">
            <Rocket class="h-3.5 w-3.5" />
            <span>{version}</span>
          </span>
          <span class="text-[11px] font-mono text-muted-foreground">{releaseDate}</span>
        </div>

        <h3 class="text-lg font-bold tracking-tight text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground mt-0.5">{resolvedDesc}</p>
      </div>

      <!-- Features Cards Stack -->
      <div class="max-h-80 overflow-y-auto p-5 space-y-2.5">
        {#each features as feat (feat.id)}
          <div class="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
              <Zap class="h-3.5 w-3.5" />
            </div>

            <div class="flex-1 space-y-0.5 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-foreground">{feat.title}</span>
                {#if feat.tag}
                  <span class="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-mono font-bold text-primary uppercase">
                    {feat.tag}
                  </span>
                {/if}
              </div>
              <p class="text-[11px] text-muted-foreground leading-relaxed">{feat.description}</p>
            </div>
          </div>
        {/each}
      </div>

      <!-- Footer Bar -->
      <div class="flex items-center justify-between border-t border-border/70 px-6 py-4 bg-card">
        <label class="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
          <input type="checkbox" bind:checked={dontShowAgain} />
          <span>{chinese ? '此版本不再弹出提示' : "Don't show again"}</span>
        </label>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" onclick={handleDismiss} class="text-xs">
            {chinese ? '稍后查看' : 'Dismiss'}
          </Button>

          <Button size="sm" onclick={handleExploreClick} class="gap-1 text-xs font-semibold">
            <span>{chinese ? '立即去体验' : 'Explore Now'}</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
