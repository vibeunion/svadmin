<script lang="ts">
  import { untrack } from 'svelte';
  import {
    MessageSquare,
    Search,
    Variable,
    Send,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CannedTemplate {
    id: string;
    title: string;
    category: string;
    content: string;
    shortcut?: string | undefined;
    tags?: string[] | undefined;
  }

  export interface CannedResponsePickerProps {
    /** 预设话术模版列表 */
    templates: CannedTemplate[];
    /** 外部注入的上下文变量，如 { customer_name: '张三', ticket_id: 'TCK-8848' } */
    contextVariables?: Record<string, string> | undefined;
    /** 选定话术后的回填回调 */
    onselect?: ((renderedText: string, template: CannedTemplate) => void) | undefined;
    /** 是否紧凑模式 */
    compact?: boolean | undefined;
    class?: string | undefined;
  }

  let {
    templates = [],
    contextVariables = {},
    onselect,
    compact = false,
    class: className = '',
  }: CannedResponsePickerProps = $props();

  let searchQuery = $state('');
  let selectedCategory = $state<string>('all');
  // Seeded from the initial prop; selection owns the value afterwards.
  let activeTemplateId = $state<string>(untrack(() => templates[0]?.id ?? ''));
  let variableOverrides = $state<Record<string, string>>({});

  // 提取分类列表
  const categories = $derived.by(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ['all', ...Array.from(set)];
  });

  // 过滤后的模版列表
  const filteredTemplates = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        (t.shortcut && t.shortcut.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  });

  // 当前选中的模版
  const currentTemplate = $derived.by(() => {
    return templates.find((t) => t.id === activeTemplateId) ?? filteredTemplates[0];
  });

  // 解析当前模版中所有的 {{placeholder}} 变量
  const templatePlaceholders = $derived.by<string[]>(() => {
    if (!currentTemplate) return [];
    const matches = currentTemplate.content.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
    const set = new Set<string>();
    for (const m of matches) {
      if (m[1]) set.add(m[1]);
    }
    return Array.from(set);
  });

  // 实时推演替换后的最终文本
  const renderedContent = $derived.by<string>(() => {
    if (!currentTemplate) return '';
    let text = currentTemplate.content;
    templatePlaceholders.forEach((key) => {
      const val = variableOverrides[key] ?? contextVariables[key] ?? `{{${key}}}`;
      text = text.replaceAll(`{{${key}}}`, val);
    });
    return text;
  });

  function handleSelect() {
    if (!currentTemplate) return;
    onselect?.(renderedContent, currentTemplate);
  }
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all',
    className
  )}
  data-svadmin-component="CannedResponsePicker"
  data-compact={compact ? 'true' : undefined}
>
  <!-- 头部搜索与检索控制栏 -->
  <div class="border-b border-border/60 p-4">
    <div class="flex items-center gap-2 mb-3">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MessageSquare class="h-4 w-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold tracking-tight">快捷客服与工单回复模版</h3>
        <p class="text-xs text-muted-foreground">内置智能变量替换与一键回填工单流转台</p>
      </div>
    </div>

    <!-- 搜索输入框 -->
    <div class="relative">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索快捷模版标题、正文关键词或快捷指令 (如 /hello)..."
        class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>

    <!-- 分类横向滚动标签栏 -->
    <div class="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
      {#each categories as cat (cat)}
        <button
          type="button"
          class={cn(
            'whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium transition-colors',
            selectedCategory === cat
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
          onclick={() => (selectedCategory = cat)}
        >
          {cat === 'all' ? '全部分类' : cat}
        </button>
      {/each}
    </div>
  </div>

  <!-- 主体双栏展示：左侧列表，右侧变量调整与推演预览 -->
  <div class="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-12 sm:divide-x sm:divide-y-0">
    <!-- 左侧模版列表 (5列) -->
    <div class="sm:col-span-5 max-h-80 overflow-y-auto divide-y divide-border/40 p-2">
      {#if filteredTemplates.length === 0}
        <div class="py-8 text-center text-xs text-muted-foreground">
          暂未找到匹配的话术模版
        </div>
      {:else}
        {#each filteredTemplates as t (t.id)}
          <button
            type="button"
            class={cn(
              'flex w-full flex-col gap-1 rounded-lg p-2.5 text-left text-xs transition-colors',
              currentTemplate?.id === t.id
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-muted/40'
            )}
            onclick={() => (activeTemplateId = t.id)}
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold">{t.title}</span>
              {#if t.shortcut}
                <code class="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                  {t.shortcut}
                </code>
              {/if}
            </div>
            <p class="line-clamp-2 text-[11px] text-muted-foreground">
              {t.content}
            </p>
          </button>
        {/each}
      {/if}
    </div>

    <!-- 右侧变量填报与实时推演 (7列) -->
    <div class="sm:col-span-7 flex flex-col justify-between p-4">
      {#if currentTemplate}
        <div class="space-y-3">
          <div class="flex items-center justify-between border-b border-border/40 pb-2">
            <span class="text-xs font-semibold text-foreground">
              {currentTemplate.title}
            </span>
            <span class="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {currentTemplate.category}
            </span>
          </div>

          <!-- 动态占位符配置项 -->
          {#if templatePlaceholders.length > 0}
            <div class="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div class="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <Variable class="h-3.5 w-3.5 text-primary" />
                <span>动态参数智能注入 ({templatePlaceholders.length})</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                {#each templatePlaceholders as ph (ph)}
                  <div>
                    <label for={`var-input-${ph}`} class="text-[10px] text-muted-foreground block mb-0.5">
                      {ph}
                    </label>
                    <input
                      id={`var-input-${ph}`}
                      type="text"
                      placeholder={contextVariables[ph] ?? '填入替换值'}
                      value={variableOverrides[ph] ?? contextVariables[ph] ?? ''}
                      oninput={(e) => (variableOverrides[ph] = e.currentTarget.value)}
                      class="h-7 w-full rounded border border-input bg-background px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- 渲染后正文推演预览 -->
          <div>
            <span class="text-[11px] font-medium text-muted-foreground block mb-1">
              推演最终发送文本：
            </span>
            <div class="rounded-lg border border-border/60 bg-background p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
              {renderedContent}
            </div>
          </div>
        </div>

        <!-- 底部确定回填按钮 -->
        <div class="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
            onclick={handleSelect}
          >
            <Send class="h-3.5 w-3.5" />
            <span>选用此模版并填入</span>
          </button>
        </div>
      {:else}
        <div class="flex h-full items-center justify-center text-xs text-muted-foreground">
          请从左侧选择话术模版
        </div>
      {/if}
    </div>
  </div>
</div>
