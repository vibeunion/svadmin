<script lang="ts">
  import {
    Languages,
    Search,
    Save,
    RotateCcw,
    Check,
  } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { applyLocalePatch } from './useDynamicLocale.svelte.js';

  export interface I18nEntry {
    key: string;
    namespace: string;
    defaultValue: string;
    currentValue: string;
    isModified?: boolean | undefined;
  }

  export interface I18nLanguagePackEditorProps {
    targetLocale?: string | undefined;
    initialEntries?: I18nEntry[] | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onSavePatch?: ((locale: string, patch: Record<string, string>) => void) | undefined;
  }

  let {
    targetLocale = 'zh-CN',
    initialEntries = [
      { key: 'common.save', namespace: 'common', defaultValue: 'Save', currentValue: '保存' },
      { key: 'common.cancel', namespace: 'common', defaultValue: 'Cancel', currentValue: '取消' },
      { key: 'common.delete', namespace: 'common', defaultValue: 'Delete', currentValue: '删除' },
      { key: 'table.actions', namespace: 'table', defaultValue: 'Actions', currentValue: '操作' },
      { key: 'table.filter', namespace: 'table', defaultValue: 'Filter', currentValue: '筛选' },
      { key: 'auth.login', namespace: 'auth', defaultValue: 'Sign in', currentValue: '登录系统' },
    ],
    title,
    class: className = '',
    onSavePatch,
  }: I18nLanguagePackEditorProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let query = $state('');
  let activeNamespace = $state<string>('all');
  let entries = $state<I18nEntry[]>(untrack(() => JSON.parse(JSON.stringify(initialEntries))));
  let isSaved = $state(false);

  const namespaces = $derived([
    'all',
    ...Array.from(new Set(initialEntries.map((e) => e.namespace))),
  ]);

  const filteredEntries = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchNs = activeNamespace === 'all' || e.namespace === activeNamespace;
      const matchQuery =
        !q ||
        e.key.toLowerCase().includes(q) ||
        e.defaultValue.toLowerCase().includes(q) ||
        e.currentValue.toLowerCase().includes(q);
      return matchNs && matchQuery;
    });
  });

  function updateValue(entry: I18nEntry, val: string) {
    entry.currentValue = val;
    entry.isModified = entry.currentValue !== entry.defaultValue;
    isSaved = false;
  }

  function handleSaveAll() {
    const patch: Record<string, string> = {};
    entries.forEach((e) => {
      if (e.currentValue) {
        patch[e.key] = e.currentValue;
      }
    });

    applyLocalePatch(targetLocale, patch);
    onSavePatch?.(targetLocale, patch);
    isSaved = true;
    setTimeout(() => {
      isSaved = false;
    }, 2000);
  }

  function handleResetAll() {
    entries = JSON.parse(JSON.stringify(initialEntries));
    isSaved = false;
  }

  const modifiedCount = $derived(entries.filter((e) => e.isModified).length);
  const resolvedTitle = $derived(
    title ?? (chinese ? '多语言文案在线热修与补丁管理' : 'I18n Dynamic Language Pack Editor'),
  );
</script>

<div
  data-svadmin-component="I18nLanguagePackEditor"
  class={cn(
    'w-full rounded-md border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col',
    className,
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
        <Languages class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">
          {chinese ? `目标语种: ${targetLocale} · 在线即时覆盖生效，无需重新构建部署` : `Target: ${targetLocale}`}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" class="h-8 text-xs gap-1" onclick={handleResetAll}>
        <RotateCcw class="h-3.5 w-3.5" />
        <span>{chinese ? '还原初始' : 'Reset'}</span>
      </Button>

      <Button size="sm" class="h-8 text-xs gap-1.5" onclick={handleSaveAll}>
        {#if isSaved}
          <Check class="h-3.5 w-3.5 text-success" />
          <span>{chinese ? '已发布热补丁' : 'Published'}</span>
        {:else}
          <Save class="h-3.5 w-3.5" />
          <span>{chinese ? `发布热补丁 (${modifiedCount})` : 'Publish Patch'}</span>
        {/if}
      </Button>
    </div>
  </div>

  <!-- Filters Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-md border border-border/60">
    <!-- Namespace tabs -->
    <div class="flex gap-1 overflow-x-auto text-xs">
      {#each namespaces as ns (ns)}
        <button
          type="button"
          onclick={() => (activeNamespace = ns)}
          class={cn(
            'px-2.5 py-1 rounded-md font-medium transition-colors',
            activeNamespace === ns ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {ns}
        </button>
      {/each}
    </div>

    <!-- Search box -->
    <div class="relative flex items-center min-w-56">
      <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        bind:value={query}
        placeholder={chinese ? '检索词条 Key 或文本…' : 'Search keys or text…'}
        class="h-7.5 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  </div>

  <!-- Translation Table -->
  <div class="rounded-md border border-border overflow-hidden">
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
        <tr>
          <th class="p-3 w-56">{chinese ? '词条标识 (Key)' : 'Key'}</th>
          <th class="p-3 w-28">{chinese ? '命名空间' : 'Namespace'}</th>
          <th class="p-3">{chinese ? '默认基准文案' : 'Default'}</th>
          <th class="p-3">{chinese ? '线上覆盖文案 (可直接编辑)' : 'Current Translation (Editable)'}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each filteredEntries as entry (entry.key)}
          <tr class={cn('hover:bg-muted/20', entry.isModified && 'bg-primary/5')}>
            <td class="p-3 font-mono font-medium text-foreground">{entry.key}</td>
            <td class="p-3">
              <span class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                {entry.namespace}
              </span>
            </td>
            <td class="p-3 text-muted-foreground">{entry.defaultValue}</td>
            <td class="p-2.5">
              <input
                type="text"
                value={entry.currentValue}
                oninput={(e) => updateValue(entry, (e.target as HTMLInputElement).value)}
                class="h-7.5 w-full rounded border border-input bg-background px-2.5 text-xs text-foreground font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
