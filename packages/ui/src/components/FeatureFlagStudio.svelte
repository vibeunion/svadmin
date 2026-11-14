<script lang="ts">
  import { untrack } from 'svelte';
  import * as Dialog from './ui/dialog/index.js';
  import type { FeatureFlag, FeatureFlagContext, FeatureFlagRegistry } from './useFeatureFlag.svelte.js';
  import {
    evaluateFeatureFlag,
    cloneFeatureFlag,
    createFeatureFlagRegistry,
  } from './useFeatureFlag.svelte.js';

  export interface FeatureFlagStudioProps {
    flags?: FeatureFlag[];
    registry?: FeatureFlagRegistry;
    class?: string;
    showSimulator?: boolean;
    onChange?: (flag: FeatureFlag) => void;
    onKillSwitchTriggered?: (flag: FeatureFlag) => void;
  }

  const {
    flags = [],
    registry = createFeatureFlagRegistry(),
    class: className = '',
    showSimulator = true,
    onChange,
    onKillSwitchTriggered,
  }: FeatureFlagStudioProps = $props();

  // Internal reactive state
  let flagList = $derived(flags.map(cloneFeatureFlag));
  const idPrefix = $props.id();
  let searchQuery = $state<string>('');
  let statusFilter = $state<'ALL' | 'ENABLED' | 'DISABLED' | 'KILL_SWITCH'>('ALL');
  let selectedTag = $state<string>('ALL');

  // Kill Switch Confirmation Modal state
  let killSwitchTarget = $state<FeatureFlag | null>(null);

  // New / Edit Flag Dialog state
  let isEditing = $state<boolean>(false);
  let editKey = $state<string>('');
  let editName = $state<string>('');
  let editDescription = $state<string>('');
  let editPercentage = $state<number | undefined>(100);
  let editTags = $state<string>('');
  let editWhitelist = $state<string>('');

  // Simulator state
  let simFlagKey = $state<string>('');
  let simUserId = $state<string>('user_123');
  let simTenantId = $state<string>('tenant_alpha');
  let simRole = $state<string>('admin');

  // 只写入显式传入或本实例拥有的注册表，不污染其他组件树。
  $effect(() => {
    const values = flagList;
    const target = registry;
    untrack(() => target.replace(values));
  });

  // Extract all unique tags
  const allTags = $derived.by(() => {
    const set = new Set<string>();
    for (const flag of flagList) {
      if (flag.tags) {
        for (const t of flag.tags) set.add(t);
      }
    }
    return Array.from(set);
  });

  $effect(() => {
    if (selectedTag !== 'ALL' && !allTags.includes(selectedTag)) selectedTag = 'ALL';
    if (simFlagKey && !flagList.some(flag => flag.key === simFlagKey)) simFlagKey = '';
  });

  // Filtered flag list
  const filteredFlags = $derived.by(() => {
    return flagList.filter((flag) => {
      // Status filter
      if (statusFilter === 'ENABLED' && (!flag.enabled || flag.killSwitch)) return false;
      if (statusFilter === 'DISABLED' && (flag.enabled || flag.killSwitch)) return false;
      if (statusFilter === 'KILL_SWITCH' && !flag.killSwitch) return false;

      // Tag filter
      if (selectedTag !== 'ALL' && (!flag.tags || !flag.tags.includes(selectedTag))) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchKey = flag.key.toLowerCase().includes(query);
        const matchName = flag.name.toLowerCase().includes(query);
        const matchDesc = flag.description ? flag.description.toLowerCase().includes(query) : false;
        if (!matchKey && !matchName && !matchDesc) return false;
      }

      return true;
    });
  });

  // Simulation result calculation
  const simResult = $derived.by((): { enabled: boolean; reason: string } => {
    if (!simFlagKey) return { enabled: false, reason: 'No flag selected' };
    const flag = flagList.find((f) => f.key === simFlagKey);
    if (!flag) return { enabled: false, reason: 'Flag not found' };

    const ctx: FeatureFlagContext = {
      ...(simUserId.trim() ? { userId: simUserId.trim() } : {}),
      ...(simTenantId.trim() ? { tenantId: simTenantId.trim() } : {}),
      ...(simRole.trim() ? { role: simRole.trim() } : {}),
    };

    if (flag.killSwitch) {
      return { enabled: false, reason: 'Kill Switch is ACTIVE (Emergency Disabled)' };
    }
    if (!flag.enabled) {
      return { enabled: false, reason: 'Flag is globally DISABLED' };
    }

    const res = evaluateFeatureFlag(flag, ctx);
    if (res) {
      return { enabled: true, reason: 'Matched rules or inside rollout percentage' };
    }
    return { enabled: false, reason: 'Outside rollout percentage or rule mismatch' };
  });

  function updateFlag(flag: FeatureFlag, updates: Partial<FeatureFlag>): FeatureFlag {
    const next = cloneFeatureFlag({ ...flag, ...updates, updatedAt: new Date().toISOString() });
    flagList = flagList.map(value => value.key === next.key ? next : value);
    registry.set(next);
    onChange?.(cloneFeatureFlag(next));
    return next;
  }

  function toggleFlagEnabled(flag: FeatureFlag) {
    updateFlag(flag, { enabled: !flag.enabled });
  }

  function updatePercentage(flag: FeatureFlag, value: number) {
    if (Number.isFinite(value) && value >= 0 && value <= 100) updateFlag(flag, { percentage: value });
  }

  function triggerKillSwitch(flag: FeatureFlag) {
    if (!flag.killSwitch) killSwitchTarget = flag;
    else updateFlag(flag, { killSwitch: false });
  }

  function confirmKillSwitch() {
    const flag = flagList.find(value => value.key === killSwitchTarget?.key);
    if (flag) {
      const next = updateFlag(flag, { killSwitch: true });
      onKillSwitchTriggered?.(cloneFeatureFlag(next));
    }
    killSwitchTarget = null;
  }

  function openCreateModal() {
    isEditing = true;
    editKey = '';
    editName = '';
    editDescription = '';
    editPercentage = 100;
    editTags = '';
    editWhitelist = '';
  }

  const invalidCreate = $derived(!editKey.trim() || !editName.trim()
    || editPercentage === undefined || !Number.isFinite(editPercentage)
    || editPercentage < 0 || editPercentage > 100
    || flagList.some(flag => flag.key === editKey.trim()));

  function saveFlag() {
    if (invalidCreate || editPercentage === undefined) return;

    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const whitelist = editWhitelist
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);

    const newFlag: FeatureFlag = {
      key: editKey.trim(),
      name: editName.trim(),
      description: editDescription.trim(),
      enabled: true,
      percentage: editPercentage,
      ...(tags.length > 0 ? { tags: [...new Set(tags)] } : {}),
      ...(whitelist.length > 0 ? { rules: [{ field: 'userId', operator: 'in' as const, values: [...new Set(whitelist)] }] } : {}),
      updatedAt: new Date().toISOString(),
    };

    flagList = [...flagList, newFlag];
    registry.set(newFlag);
    onChange?.(cloneFeatureFlag(newFlag));
    isEditing = false;
  }
</script>

<div
  class="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm {className}"
  data-svadmin-component="FeatureFlagStudio"
>
  <!-- Header Bar -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
    <div>
      <h2 class="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
        <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        Feature Flag Studio
      </h2>
      <p class="text-xs text-muted-foreground mt-1">
        Manage feature toggles, percentage rollout, and emergency kill switches.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
        onclick={openCreateModal}
      >
        <svg class="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Feature Flag
      </button>
    </div>
  </div>

  <!-- Search & Filter Controls -->
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-1 items-center gap-3">
      <div class="relative w-full max-w-sm">
        <input
          type="text"
          aria-label="Search feature flags"
          placeholder="Search by flag key, name or description..."
          bind:value={searchQuery}
          data-size="compact" class="svadmin-input"
        />
      </div>
      <select
        aria-label="Filter by status"
        bind:value={statusFilter}
        data-size="compact" class="svadmin-select svadmin-select--inline"
      >
        <option value="ALL">All Status</option>
        <option value="ENABLED">Enabled</option>
        <option value="DISABLED">Disabled</option>
        <option value="KILL_SWITCH">Kill Switch Active</option>
      </select>
      {#if allTags.length > 0}
        <select
          aria-label="Filter by tag"
          bind:value={selectedTag}
          data-size="compact" class="svadmin-select svadmin-select--inline"
        >
          <option value="ALL">All Tags</option>
          {#each allTags as tag (tag)}
            <option value={tag}>{tag}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>

  <!-- Flag Cards Grid -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {#if filteredFlags.length === 0}
      <div class="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        No feature flags matched the current filter.
      </div>
    {:else}
      {#each filteredFlags as flag (flag.key)}
        <div
          class="relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80 {flag.killSwitch ? 'border-destructive/60 bg-destructive/5' : ''}"
        >
          <div>
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm text-foreground">{flag.name}</span>
                  {#if flag.killSwitch}
                    <span class="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      KILL SWITCH ACTIVE
                    </span>
                  {:else if flag.enabled}
                    <span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      ACTIVE
                    </span>
                  {:else}
                    <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      INACTIVE
                    </span>
                  {/if}
                </div>
                <div class="mt-0.5 font-mono text-xs text-muted-foreground">{flag.key}</div>
                {#if flag.description}
                  <p class="mt-2 text-xs text-muted-foreground line-clamp-2">{flag.description}</p>
                {/if}
              </div>

              <!-- Main On/Off Switch -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-label={`Enable ${flag.name}`}
                  aria-checked={flag.enabled && !flag.killSwitch}
                  disabled={flag.killSwitch}
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {flag.enabled && !flag.killSwitch ? 'bg-primary' : 'bg-muted'}"
                  onclick={() => toggleFlagEnabled(flag)}
                >
                  <span
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out {flag.enabled && !flag.killSwitch ? 'translate-x-4' : 'translate-x-0'}"
                  ></span>
                </button>
              </div>
            </div>

            <!-- Rollout Percentage Slider -->
            <div class="mt-4 border-t border-border/60 pt-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Gradual Rollout:</span>
                <span class="font-mono font-medium text-foreground">{flag.percentage ?? 100}%</span>
              </div>
              <input
                aria-label={`Rollout percentage for ${flag.name}`}
                type="range"
                min="0"
                max="100"
                step="5"
                value={flag.percentage ?? 100}
                disabled={flag.killSwitch || !flag.enabled}
                oninput={(e) => updatePercentage(flag, Number((e.target as HTMLInputElement).value))}
                class="mt-1.5 w-full accent-primary disabled:opacity-50"
              />
            </div>

            <!-- Tags & Rules Badge -->
            {#if flag.tags && flag.tags.length > 0}
              <div class="mt-3 flex flex-wrap gap-1.5">
                {#each flag.tags as tag, index (`${tag}:${index}`)}
                  <span class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    #{tag}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Bottom Actions Bar -->
          <div class="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
            <span class="text-[10px] text-muted-foreground">
              Updated: {flag.updatedAt ? new Date(flag.updatedAt).toLocaleTimeString() : 'Never'}
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded px-2 py-1 text-[11px] font-medium transition-colors {flag.killSwitch ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}"
                onclick={() => triggerKillSwitch(flag)}
              >
                {flag.killSwitch ? 'Revoke Kill Switch' : 'Trigger Kill Switch'}
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Interactive Context Playground / Simulator -->
  {#if showSimulator}
    <div class="mt-6 rounded-lg border border-border bg-muted/30 p-5">
      <div class="flex items-center gap-2 border-b border-border pb-3">
        <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-sm font-semibold text-foreground">Feature Flag Evaluation Simulator</h3>
      </div>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label for={`${idPrefix}-target-flag`} class="block text-xs font-medium text-muted-foreground">Target Flag</label>
          <select
            id={`${idPrefix}-target-flag`}
            bind:value={simFlagKey}
            data-size="compact" class="mt-1 svadmin-select"
          >
            <option value="">Select a flag...</option>
            {#each flagList as flag (flag.key)}
              <option value={flag.key}>{flag.name} ({flag.key})</option>
            {/each}
          </select>
        </div>
        <div>
          <label for={`${idPrefix}-user-id`} class="block text-xs font-medium text-muted-foreground">User ID</label>
          <input
            id={`${idPrefix}-user-id`}
            type="text"
            bind:value={simUserId}
            placeholder="e.g. user_99"
            data-size="compact" class="mt-1 svadmin-input"
          />
        </div>
        <div>
          <label for={`${idPrefix}-tenant-id`} class="block text-xs font-medium text-muted-foreground">Tenant ID</label>
          <input
            id={`${idPrefix}-tenant-id`}
            type="text"
            bind:value={simTenantId}
            placeholder="e.g. tenant_pro"
            data-size="compact" class="mt-1 svadmin-input"
          />
        </div>
        <div>
          <label for={`${idPrefix}-role`} class="block text-xs font-medium text-muted-foreground">User Role</label>
          <input
            id={`${idPrefix}-role`}
            type="text"
            bind:value={simRole}
            placeholder="e.g. admin"
            data-size="compact" class="mt-1 svadmin-input"
          />
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between rounded-md border border-border bg-background p-3">
        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-muted-foreground">Simulation Result:</span>
          {#if simResult.enabled}
            <span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              ENABLED (TRUE)
            </span>
          {:else}
            <span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              DISABLED (FALSE)
            </span>
          {/if}
        </div>
        <span class="text-xs text-muted-foreground">{simResult.reason}</span>
      </div>
    </div>
  {/if}

  <!-- Kill Switch Confirmation Dialog -->
  <Dialog.Root open={killSwitchTarget !== null} onOpenChange={(open) => { if (!open) killSwitchTarget = null; }}>
    <Dialog.Content data-svadmin-component="FeatureFlagStudioKillSwitchDialog" closeOnOverlayClick={false}>
      {#if killSwitchTarget}
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <Dialog.Title>Emergency Kill Switch Confirmation</Dialog.Title>
            <p class="text-xs text-muted-foreground">This is a high-risk operational action.</p>
          </div>
        </div>
        <Dialog.Description class="mt-4">
          Are you sure you want to activate the emergency kill switch for <strong class="text-foreground">{killSwitchTarget.name}</strong> (<code class="text-destructive">{killSwitchTarget.key}</code>)?
          This disables this feature in the current preview. Save the configuration in your application to apply it.
        </Dialog.Description>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onclick={() => (killSwitchTarget = null)}
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-destructive px-3.5 py-1.5 text-xs font-medium text-destructive-foreground shadow hover:bg-destructive/90"
            onclick={confirmKillSwitch}
          >
            Confirm Kill Switch
          </button>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Root>

  <!-- Create Flag Modal -->
  <Dialog.Root bind:open={isEditing}>
    <Dialog.Content closeOnOverlayClick={false}>
        <Dialog.Title>Create Feature Flag</Dialog.Title>
        <Dialog.Description>Define a new toggle and set rollout percentage.</Dialog.Description>

        <div class="mt-4 space-y-3">
          <div>
            <label for={`${idPrefix}-edit-key`} class="block text-xs font-medium text-foreground">Flag Key (Unique)</label>
            <input
              id={`${idPrefix}-edit-key`}
              type="text"
              bind:value={editKey}
              placeholder="e.g. enable_beta_checkout"
              data-size="compact" class="mt-1 svadmin-input"
            />
            {#if flagList.some(flag => flag.key === editKey.trim())}
              <p role="status" class="mt-1 text-xs text-destructive">This flag key already exists.</p>
            {/if}
          </div>
          <div>
            <label for={`${idPrefix}-edit-name`} class="block text-xs font-medium text-foreground">Display Name</label>
            <input
              id={`${idPrefix}-edit-name`}
              type="text"
              bind:value={editName}
              placeholder="e.g. Beta Checkout V2"
              data-size="compact" class="mt-1 svadmin-input"
            />
          </div>
          <div>
            <label for={`${idPrefix}-edit-description`} class="block text-xs font-medium text-foreground">Description</label>
            <textarea
              id={`${idPrefix}-edit-description`}
              bind:value={editDescription}
              rows="2"
              placeholder="Explain the purpose of this flag..."
              class="mt-1 svadmin-textarea"
            ></textarea>
          </div>
          <div>
            <label for={`${idPrefix}-edit-percentage`} class="block text-xs font-medium text-foreground">Initial Rollout Percentage (0% - 100%)</label>
            <input
              id={`${idPrefix}-edit-percentage`}
              type="number"
              min="0"
              max="100"
              bind:value={editPercentage}
              data-size="compact" class="mt-1 svadmin-input"
            />
          </div>
          <div>
            <label for={`${idPrefix}-edit-whitelist`} class="block text-xs font-medium text-foreground">User Whitelist (Comma separated User IDs)</label>
            <input
              id={`${idPrefix}-edit-whitelist`}
              type="text"
              bind:value={editWhitelist}
              placeholder="user_1, user_2, admin_test"
              data-size="compact" class="mt-1 svadmin-input"
            />
            <p class="mt-1 text-xs text-muted-foreground">Matching users bypass the rollout percentage. Use 0% for whitelist-only access.</p>
          </div>
          <div>
            <label for={`${idPrefix}-edit-tags`} class="block text-xs font-medium text-foreground">Tags (Comma separated)</label>
            <input
              id={`${idPrefix}-edit-tags`}
              type="text"
              bind:value={editTags}
              placeholder="checkout, experiment, billing"
              data-size="compact" class="mt-1 svadmin-input"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onclick={() => (isEditing = false)}
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90"
            disabled={invalidCreate}
            onclick={saveFlag}
          >
            Save Flag
          </button>
        </div>
    </Dialog.Content>
  </Dialog.Root>
</div>
