<script lang="ts">
  import { addTranslations, getAvailableLocales, getLocale } from '@svadmin/core';

  export interface I18nStudioProps {
    /** Map of locale to translation dictionary records */
    dictionaries?: Record<string, Record<string, string>>;
    /** Active source locale for reference (default: 'zh-CN') */
    sourceLocale?: string;
    /** Active target locale being translated (default: 'en-US') */
    targetLocale?: string;
    /** Supported locales list */
    locales?: string[];
    /** Whether to allow hot-reloading translations directly into current runtime memory */
    allowLiveApply?: boolean;
    /** Callback when user saves all translation modifications */
    onSave?: (dictionaries: Record<string, Record<string, string>>) => void;
    /** Callback when user live-applies translations */
    onApplyLive?: (locale: string, dict: Record<string, string>) => void;
    /** Callback when user exports dictionary */
    onExport?: (locale: string, dict: Record<string, string>) => void;
    /** Callback when user imports dictionary */
    onImport?: (locale: string, dict: Record<string, string>) => void;
  }

  let {
    dictionaries = {},
    sourceLocale = 'zh-CN',
    targetLocale = 'en-US',
    locales = ['zh-CN', 'en-US', 'ja-JP', 'fr-FR'],
    allowLiveApply = true,
    onSave,
    onApplyLive,
    onExport,
    onImport,
  }: I18nStudioProps = $props();

  // Internal reactive copy of dictionaries
  let localDictionaries = $state<Record<string, Record<string, string>>>({});
  let activeSource = $state('zh-CN');
  let activeTarget = $state('en-US');
  let searchQuery = $state('');
  let selectedNamespace = $state('all');
  let statusFilter = $state<'all' | 'missing' | 'modified'>('all');
  let newKeyName = $state('');
  let newSourceVal = $state('');
  let isAddingKey = $state(false);
  let importJsonText = $state('');
  let showImportModal = $state(false);
  let liveSuccessMessage = $state<string | null>(null);
  let initialTargetSnapshot = $state<Record<string, string>>({});

  $effect(() => {
    activeSource = sourceLocale;
  });
  $effect(() => {
    activeTarget = targetLocale;
  });
  $effect(() => {
    localDictionaries = JSON.parse(JSON.stringify(dictionaries));
    initialTargetSnapshot = JSON.parse(JSON.stringify(dictionaries[targetLocale] || {}));
  });

  // Ensure dictionaries have objects for selected locales
  function ensureLocale(loc: string) {
    if (!localDictionaries[loc]) {
      localDictionaries[loc] = {};
    }
    return localDictionaries[loc];
  }

  // All combined keys across all locales
  const allKeys = $derived(() => {
    const keySet = new Set<string>();
    for (const dict of Object.values(localDictionaries)) {
      for (const k of Object.keys(dict)) {
        keySet.add(k);
      }
    }
    return Array.from(keySet).sort();
  });

  // Extract unique namespaces (e.g., 'dashboard' from 'dashboard.title')
  const namespaces = $derived(() => {
    const nsSet = new Set<string>();
    for (const k of allKeys()) {
      const parts = k.split('.');
      if (parts.length > 1) {
        nsSet.add(parts[0]!);
      } else {
        nsSet.add('common');
      }
    }
    return Array.from(nsSet).sort();
  });

  // Filtered keys
  const filteredKeys = $derived(() => {
    const keys = allKeys();
    const sourceDict = localDictionaries[activeSource] || {};
    const targetDict = localDictionaries[activeTarget] || {};

    return keys.filter((key) => {
      // Namespace filter
      if (selectedNamespace !== 'all') {
        const ns = key.includes('.') ? key.split('.')[0] : 'common';
        if (ns !== selectedNamespace) return false;
      }

      const sVal = sourceDict[key] || '';
      const tVal = targetDict[key] || '';

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKey = key.toLowerCase().includes(q);
        const matchSource = sVal.toLowerCase().includes(q);
        const matchTarget = tVal.toLowerCase().includes(q);
        if (!matchKey && !matchSource && !matchTarget) return false;
      }

      // Status filter
      const isMissing = !tVal || tVal.trim() === '';
      const isModified = initialTargetSnapshot[key] !== tVal;

      if (statusFilter === 'missing' && !isMissing) return false;
      if (statusFilter === 'modified' && !isModified) return false;

      return true;
    });
  });

  // Completion stats
  const completionStats = $derived(() => {
    const keys = allKeys();
    if (keys.length === 0) return { total: 0, translated: 0, percent: 100 };
    const targetDict = localDictionaries[activeTarget] || {};
    let translatedCount = 0;
    for (const k of keys) {
      if (targetDict[k] && targetDict[k]!.trim() !== '') {
        translatedCount++;
      }
    }
    const percent = Math.round((translatedCount / keys.length) * 100);
    return {
      total: keys.length,
      translated: translatedCount,
      percent,
    };
  });

  function updateTargetTranslation(key: string, value: string) {
    const dict = ensureLocale(activeTarget);
    dict[key] = value;
  }

  function handleSaveAll() {
    onSave?.(localDictionaries);
    liveSuccessMessage = `Translations saved successfully (${filteredKeys().length} keys)`;
    setTimeout(() => {
      liveSuccessMessage = null;
    }, 3000);
  }

  function handleLiveApply() {
    const targetDict = localDictionaries[activeTarget] || {};
    // Directly inject into core runtime dictionary
    addTranslations(activeTarget, targetDict);
    onApplyLive?.(activeTarget, targetDict);
    liveSuccessMessage = `Applied hot reload for [${activeTarget}] directly to runtime`;
    setTimeout(() => {
      liveSuccessMessage = null;
    }, 3000);
  }

  function handleExport() {
    const targetDict = localDictionaries[activeTarget] || {};
    onExport?.(activeTarget, targetDict);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetDict, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeTarget}-translations.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImportSubmit() {
    try {
      const parsed = JSON.parse(importJsonText);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid JSON dictionary');
      }
      const dict = ensureLocale(activeTarget);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          dict[k] = v;
        }
      }
      onImport?.(activeTarget, dict);
      showImportModal = false;
      importJsonText = '';
      liveSuccessMessage = `Imported translations into [${activeTarget}]`;
      setTimeout(() => {
        liveSuccessMessage = null;
      }, 3000);
    } catch (e) {
      alert(`JSON import failed: ${(e as Error).message}`);
    }
  }

  function handleAddNewKey() {
    if (!newKeyName.trim()) return;
    const key = newKeyName.trim();
    const sDict = ensureLocale(activeSource);
    sDict[key] = newSourceVal;
    const tDict = ensureLocale(activeTarget);
    if (!tDict[key]) {
      tDict[key] = '';
    }
    newKeyName = '';
    newSourceVal = '';
    isAddingKey = false;
  }

  function handleDeleteKey(key: string) {
    for (const dict of Object.values(localDictionaries)) {
      delete dict[key];
    }
  }
</script>

<div
  class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-foreground shadow-sm"
  data-svadmin-component="I18nStudio"
>
  <!-- Studio Header -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
    <div>
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">I18n Studio</h2>
        <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {activeTarget}
        </span>
      </div>
      <p class="text-xs text-muted-foreground">
        Manage bilingual/multilingual dictionaries, verify translation completeness, and apply hot reloads.
      </p>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        onclick={() => (isAddingKey = !isAddingKey)}
      >
        + Add Key
      </button>

      <button
        type="button"
        class="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        onclick={() => (showImportModal = true)}
      >
        Import JSON
      </button>

      <button
        type="button"
        class="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        onclick={handleExport}
      >
        Export
      </button>

      {#if allowLiveApply}
        <button
          type="button"
          class="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/90"
          onclick={handleLiveApply}
        >
          ⚡ Hot Reload
        </button>
      {/if}

      <button
        type="button"
        class="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        onclick={handleSaveAll}
      >
        Save Changes
      </button>
    </div>
  </div>

  <!-- Notification Banner -->
  {#if liveSuccessMessage}
    <div
      role="status"
      class="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success"
    >
      <span>✓ {liveSuccessMessage}</span>
      <button
        type="button"
        class="text-success hover:underline"
        onclick={() => (liveSuccessMessage = null)}
      >
        Dismiss
      </button>
    </div>
  {/if}

  <!-- Add New Key Form -->
  {#if isAddingKey}
    <div class="flex flex-wrap items-end gap-3 rounded-lg border border-primary/20 bg-muted/40 p-3">
      <div class="flex flex-1 flex-col gap-1 min-w-[200px]">
        <label for="new-key-input" class="text-xs font-medium text-foreground">Translation Key (dot notation)</label>
        <input
          id="new-key-input"
          type="text"
          placeholder="e.g. auth.mfa.verifyButton"
          bind:value={newKeyName}
          class="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1 min-w-[200px]">
        <label for="new-source-input" class="text-xs font-medium text-foreground">Source Reference Value ({activeSource})</label>
        <input
          id="new-source-input"
          type="text"
          placeholder="e.g. 验证并登录"
          bind:value={newSourceVal}
          class="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onclick={handleAddNewKey}
        >
          Confirm Add
        </button>
        <button
          type="button"
          class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          onclick={() => (isAddingKey = false)}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Import Modal -->
  {#if showImportModal}
    <div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-foreground">Paste JSON dictionary to merge into [{activeTarget}]</span>
        <button
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground"
          onclick={() => (showImportModal = false)}
        >
          ✕
        </button>
      </div>
      <textarea
        rows="4"
        placeholder={`{\n  "common.ok": "OK",\n  "common.cancel": "Cancel"\n}`}
        bind:value={importJsonText}
        class="font-mono text-xs w-full rounded-md border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      ></textarea>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          onclick={handleImportSubmit}
        >
          Merge Import
        </button>
      </div>
    </div>
  {/if}

  <!-- Locales, Filters & Progress Stats -->
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
    <!-- Language Pairs -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-muted-foreground">Source:</span>
      <select
        bind:value={activeSource}
        class="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none"
      >
        {#each locales as loc}
          <option value={loc}>{loc}</option>
        {/each}
      </select>

      <span class="text-xs text-muted-foreground">➔ Target:</span>
      <select
        bind:value={activeTarget}
        class="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none"
      >
        {#each locales as loc}
          <option value={loc}>{loc}</option>
        {/each}
      </select>
    </div>

    <!-- Progress Indicator -->
    <div class="flex items-center gap-3">
      <div class="flex flex-col items-end">
        <span class="text-xs font-semibold text-foreground">
          {completionStats().percent}% Translated
        </span>
        <span class="text-[10px] text-muted-foreground">
          {completionStats().translated} / {completionStats().total} keys completed
        </span>
      </div>
      <div class="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full bg-primary transition-all duration-300"
          style={`width: ${completionStats().percent}%`}
        ></div>
      </div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search Input -->
      <div class="relative">
        <input
          type="search"
          placeholder="Filter by key, source, or target..."
          bind:value={searchQuery}
          class="w-64 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <!-- Namespace dropdown -->
      <select
        bind:value={selectedNamespace}
        class="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
      >
        <option value="all">All Namespaces</option>
        {#each namespaces() as ns}
          <option value={ns}>{ns}</option>
        {/each}
      </select>

      <!-- Status segment filters -->
      <div class="flex rounded-md border border-border bg-muted/40 p-0.5">
        <button
          type="button"
          class={`rounded px-2.5 py-1 text-xs font-medium transition ${
            statusFilter === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (statusFilter = 'all')}
        >
          All
        </button>
        <button
          type="button"
          class={`rounded px-2.5 py-1 text-xs font-medium transition ${
            statusFilter === 'missing'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (statusFilter = 'missing')}
        >
          Missing
        </button>
        <button
          type="button"
          class={`rounded px-2.5 py-1 text-xs font-medium transition ${
            statusFilter === 'modified'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (statusFilter = 'modified')}
        >
          Modified
        </button>
      </div>
    </div>

    <span class="text-xs text-muted-foreground">
      Showing {filteredKeys().length} of {allKeys().length} entries
    </span>
  </div>

  <!-- Dictionary List / Grid -->
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-left text-xs text-foreground">
      <thead class="border-b border-border bg-muted/50 text-[11px] font-medium uppercase text-muted-foreground">
        <tr>
          <th scope="col" class="py-2.5 pl-4 pr-3 w-1/4">Key & Namespace</th>
          <th scope="col" class="px-3 py-2.5 w-1/3">Source: {activeSource}</th>
          <th scope="col" class="px-3 py-2.5 w-1/3">Target: {activeTarget}</th>
          <th scope="col" class="py-2.5 pl-3 pr-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border bg-background">
        {#if filteredKeys().length === 0}
          <tr>
            <td colspan="4" class="py-8 text-center text-xs text-muted-foreground">
              No translation keys match the selected filters.
            </td>
          </tr>
        {:else}
          {#each filteredKeys() as key}
            {@const sourceVal = (localDictionaries[activeSource] || {})[key] || ''}
            {@const targetVal = (localDictionaries[activeTarget] || {})[key] || ''}
            {@const isMissing = !targetVal || targetVal.trim() === ''}
            {@const isModified = initialTargetSnapshot[key] !== targetVal}
            <tr class="hover:bg-muted/30 transition">
              <!-- Key -->
              <td class="py-3 pl-4 pr-3 align-top font-mono text-[11px]">
                <div class="flex flex-col gap-1">
                  <span class="font-semibold text-foreground break-all">{key}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {key.includes('.') ? key.split('.')[0] : 'common'}
                    </span>
                    {#if isMissing}
                      <span class="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                        Missing
                      </span>
                    {:else if isModified}
                      <span class="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        Draft
                      </span>
                    {/if}
                  </div>
                </div>
              </td>

              <!-- Source Text -->
              <td class="px-3 py-3 align-top text-muted-foreground">
                <div class="max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
                  {sourceVal || '—'}
                </div>
              </td>

              <!-- Target Text Editable -->
              <td class="px-3 py-3 align-top">
                <textarea
                  rows="2"
                  value={targetVal}
                  oninput={(e) => updateTargetTranslation(key, e.currentTarget.value)}
                  placeholder={`Translate to ${activeTarget}...`}
                  class={`w-full rounded border px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary ${
                    isMissing
                      ? 'border-destructive/40 bg-destructive/5'
                      : isModified
                        ? 'border-warning/50 bg-background'
                        : 'border-border bg-background'
                  }`}
                ></textarea>
              </td>

              <!-- Action Controls -->
              <td class="py-3 pl-3 pr-4 text-right align-top">
                <button
                  type="button"
                  class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete key"
                  onclick={() => handleDeleteKey(key)}
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
