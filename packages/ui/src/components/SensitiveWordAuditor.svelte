<script lang="ts">
  import type {
    ModerationCategory,
    ModerationAction,
    ModerationSeverity,
    SensitiveWordItem,
  } from './moderation-utils.js';
  import { scanContent } from './moderation-utils.js';

  export interface SensitiveWordAuditorProps {
    words?: SensitiveWordItem[];
    class?: string;
    onSaveWords?: (words: SensitiveWordItem[]) => void;
  }

  const {
    words: initialWords = [],
    class: className = '',
    onSaveWords,
  }: SensitiveWordAuditorProps = $props();

  // Internal reactive word dictionary
  let wordList = $state<SensitiveWordItem[]>([]);

  $effect(() => {
    wordList = initialWords.length > 0
      ? initialWords.map(w => ({ ...w }))
      : [
          { id: 'sw-1', word: '高额返现', category: 'spam', action: 'mask', severity: 'medium', replacement: '***', enabled: true },
          { id: 'sw-2', word: '保本高收益', category: 'spam', action: 'block', severity: 'critical', enabled: true },
          { id: 'sw-3', word: '枪支弹药', category: 'violence', action: 'block', severity: 'critical', enabled: true },
          { id: 'sw-4', word: '博彩下注', category: 'custom', action: 'block', severity: 'high', enabled: true },
          { id: 'sw-5', word: '内幕暴利', category: 'spam', action: 'review', severity: 'high', enabled: true },
        ];
  });

  // Filters & search
  let searchQuery = $state('');
  let selectedCategory = $state<'ALL' | ModerationCategory>('ALL');
  let selectedAction = $state<'ALL' | ModerationAction>('ALL');

  // Interactive Test Sandbox State
  let testInput = $state(
    '尊敬的客户，本月理财产品承诺保本高收益，充值可享受高额返现，绝非博彩下注，详情联系专员。',
  );

  const scanResult = $derived(scanContent(testInput, wordList));

  // Add / Edit Modal state
  let isAddOpen = $state(false);
  let newWord = $state('');
  let newCategory = $state<ModerationCategory>('spam');
  let newAction = $state<ModerationAction>('mask');
  let newSeverity = $state<ModerationSeverity>('medium');
  let newReplacement = $state('***');

  const filteredWords = $derived.by(() => {
    return wordList.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedAction !== 'ALL' && item.action !== selectedAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.word.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  function toggleWord(item: SensitiveWordItem) {
    item.enabled = !item.enabled;
    onSaveWords?.($state.snapshot(wordList));
  }

  function deleteWord(id: string) {
    wordList = wordList.filter(w => w.id !== id);
    onSaveWords?.($state.snapshot(wordList));
  }

  function handleAddWord() {
    if (!newWord.trim()) return;
    const item: SensitiveWordItem = {
      id: `sw-${Date.now()}`,
      word: newWord.trim(),
      category: newCategory,
      action: newAction,
      severity: newSeverity,
      replacement: newReplacement.trim() || undefined,
      enabled: true,
    };
    wordList = [item, ...wordList];
    onSaveWords?.($state.snapshot(wordList));
    newWord = '';
    isAddOpen = false;
  }

  function getSeverityBadge(sev: ModerationSeverity) {
    switch (sev) {
      case 'critical':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  function getActionBadge(act: ModerationAction) {
    switch (act) {
      case 'block':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'mask':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'review':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  }
</script>

<div
  class="w-full flex flex-col gap-6 p-6 bg-background text-foreground rounded-xl border border-border shadow-sm {className}"
  data-svadmin-component="SensitiveWordAuditor"
  data-svadmin-resource="content_moderation"
>
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">敏感词合规审查与词库管理中心 (Auditor Studio)</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
          Security & Compliance
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        等保 2.0 与内容安全合规必备：管理涉黄、涉政、广告欺诈违规词库，提供实时拦截、自动脱敏与人工复审策略。
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (isAddOpen = true)}
        class="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加敏感词
      </button>
    </div>
  </div>

  <!-- Live Content Moderation Sandbox -->
  <div class="p-5 rounded-xl border border-border bg-card flex flex-col gap-4 shadow-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-foreground">实时内容合规检测沙箱</span>
        <span class="text-[11px] text-muted-foreground">键入待检测文本实时识别命中违规词与处理决策</span>
      </div>
      {#if scanResult.hasViolation}
        <span class="text-xs px-2.5 py-1 rounded-full font-semibold border {scanResult.blockRequired ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'}">
          {scanResult.blockRequired ? '⚠️ 触发高危拦截规则' : '⚡ 建议人工复审 / 自动脱敏'}
        </span>
      {:else}
        <span class="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          ✓ 合规检测通过
        </span>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <!-- Input -->
      <div class="flex flex-col gap-1.5">
        <label for="test-content-input" class="font-semibold text-foreground">输入待审文本内容:</label>
        <textarea
          id="test-content-input"
          rows="4"
          bind:value={testInput}
          class="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed"
          placeholder="请输入测试文本..."
        ></textarea>
      </div>

      <!-- Result / Masked Preview -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground">脱敏清洗与合规结果:</span>
          <span class="text-[11px] text-muted-foreground font-mono">命中违规词: {scanResult.totalHits} 个</span>
        </div>
        <div class="flex-1 p-3 rounded-lg border border-border bg-muted/30 text-foreground leading-relaxed min-h-[96px] flex flex-col justify-between">
          <div>{scanResult.maskedText}</div>
          {#if scanResult.matches.length > 0}
            <div class="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-border/50">
              <span class="text-muted-foreground font-medium text-[10px]">命中词条:</span>
              {#each scanResult.matches as match}
                <span class="text-[10px] px-1.5 py-0.5 rounded border {getSeverityBadge(match.severity)}">
                  {match.word} ({match.action})
                </span>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Filter Controls -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
    <div class="relative flex-1 max-w-sm">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索敏感词..."
        class="w-full px-3 py-2 pl-8 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="flex items-center gap-2">
      <select
        bind:value={selectedCategory}
        class="px-2.5 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">全部分类</option>
        <option value="spam">广告营销 / 欺诈</option>
        <option value="violence">违法暴恐</option>
        <option value="politics">涉政违规</option>
        <option value="pornography">涉黄低俗</option>
        <option value="custom">业务自定义</option>
      </select>

      <select
        bind:value={selectedAction}
        class="px-2.5 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">全部处置策略</option>
        <option value="block">直接拦截 (Block)</option>
        <option value="mask">自动脱敏 (Mask)</option>
        <option value="review">人工审核 (Review)</option>
      </select>
    </div>
  </div>

  <!-- Word List Table -->
  <div class="rounded-xl border border-border bg-card overflow-hidden text-xs">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
          <th class="p-3 text-left">词条内容</th>
          <th class="p-3 text-left">违规分类</th>
          <th class="p-3 text-left">风险严重度</th>
          <th class="p-3 text-left">处置动作</th>
          <th class="p-3 text-left">替换值</th>
          <th class="p-3 text-center">状态</th>
          <th class="p-3 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredWords.length === 0}
          <tr>
            <td colspan="7" class="p-8 text-center text-muted-foreground">没有找到匹配的敏感词</td>
          </tr>
        {:else}
          {#each filteredWords as item (item.id)}
            <tr class="border-b border-border/60 hover:bg-muted/20 transition-colors">
              <td class="p-3 font-semibold text-foreground font-mono">{item.word}</td>
              <td class="p-3 capitalize text-muted-foreground">{item.category}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium border {getSeverityBadge(item.severity)}">
                  {item.severity}
                </span>
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium border {getActionBadge(item.action)}">
                  {item.action}
                </span>
              </td>
              <td class="p-3 font-mono text-muted-foreground">{item.replacement || '-'}</td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  onclick={() => toggleWord(item)}
                  class="text-[11px] px-2 py-0.5 rounded font-medium transition-colors {item.enabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}"
                >
                  {item.enabled ? '启用中' : '已停用'}
                </button>
              </td>
              <td class="p-3 text-right">
                <button
                  type="button"
                  onclick={() => deleteWord(item.id)}
                  class="text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
                >
                  删除
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Add Word Modal -->
  {#if isAddOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 text-foreground text-xs">
        <div class="flex items-center justify-between pb-2 border-b border-border">
          <h3 class="font-bold text-sm text-foreground">添加敏感词条</h3>
          <button type="button" onclick={() => (isAddOpen = false)} class="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label for="new-word-input" class="font-semibold text-foreground">违规词条</label>
            <input
              id="new-word-input"
              type="text"
              bind:value={newWord}
              placeholder="请输入词条，如：虚假宣传"
              class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label for="new-category-select" class="font-semibold text-foreground">违规分类</label>
              <select id="new-category-select" bind:value={newCategory} class="px-2 py-1.5 rounded border border-border bg-background text-foreground">
                <option value="spam">广告营销 / 欺诈</option>
                <option value="violence">违法暴恐</option>
                <option value="politics">涉政违规</option>
                <option value="pornography">涉黄低俗</option>
                <option value="custom">业务自定义</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label for="new-severity-select" class="font-semibold text-foreground">严重级别</label>
              <select id="new-severity-select" bind:value={newSeverity} class="px-2 py-1.5 rounded border border-border bg-background text-foreground">
                <option value="critical">严重 (Critical)</option>
                <option value="high">高危 (High)</option>
                <option value="medium">中等 (Medium)</option>
                <option value="low">轻微 (Low)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label for="new-action-select" class="font-semibold text-foreground">处置动作</label>
              <select id="new-action-select" bind:value={newAction} class="px-2 py-1.5 rounded border border-border bg-background text-foreground">
                <option value="block">直接拦截 (Block)</option>
                <option value="mask">自动脱敏 (Mask)</option>
                <option value="review">人工审核 (Review)</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label for="new-replacement-input" class="font-semibold text-foreground">替换值 (若脱敏)</label>
              <input
                id="new-replacement-input"
                type="text"
                bind:value={newReplacement}
                placeholder="***"
                class="px-2 py-1.5 rounded border border-border bg-background text-foreground font-mono"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button type="button" onclick={() => (isAddOpen = false)} class="px-3 py-1.5 rounded border border-border bg-card">取消</button>
          <button type="button" onclick={handleAddWord} class="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold">保存</button>
        </div>
      </div>
    </div>
  {/if}
</div>
