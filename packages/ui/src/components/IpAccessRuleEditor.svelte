<script lang="ts" module>
  export type IpRuleType = 'SINGLE' | 'CIDR' | 'RANGE';
  export type IpRuleAction = 'ALLOW' | 'DENY';

  export interface IpAccessRule {
    id: string;
    type: IpRuleType;
    value: string;
    action: IpRuleAction;
    description?: string;
    enabled: boolean;
    expiresAt?: string | null;
    priority?: number;
    createdAt?: string;
  }

  // IPv4 regex
  const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

  export function validateIpRuleValue(type: IpRuleType, value: string): { valid: boolean; error?: string } {
    const val = value.trim();
    if (!val) return { valid: false, error: 'IP value cannot be empty' };

    if (type === 'SINGLE') {
      if (!IPV4_REGEX.test(val) && !val.includes(':')) {
        return { valid: false, error: 'Invalid IPv4 address format (e.g. 192.168.1.100)' };
      }
      return { valid: true };
    }

    if (type === 'CIDR') {
      const parts = val.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return { valid: false, error: 'Invalid CIDR format (e.g. 172.16.0.0/16)' };
      }
      const [ip, maskStr] = parts;
      const mask = Number(maskStr);
      if (!IPV4_REGEX.test(ip) || isNaN(mask) || mask < 0 || mask > 32) {
        return { valid: false, error: 'Invalid CIDR format: mask must be between 0 and 32' };
      }
      return { valid: true };
    }

    if (type === 'RANGE') {
      const parts = val.split('-').map((p) => p.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1] || !IPV4_REGEX.test(parts[0]) || !IPV4_REGEX.test(parts[1])) {
        return { valid: false, error: 'Invalid IP Range format (e.g. 10.0.0.1 - 10.0.0.50)' };
      }
      return { valid: true };
    }

    return { valid: true };
  }
</script>

<script lang="ts">
  export interface IpAccessRuleEditorProps {
    rules?: IpAccessRule[];
    mode?: 'WHITELIST' | 'BLACKLIST';
    currentClientIp?: string;
    class?: string;
    onChange?: (rules: IpAccessRule[]) => void;
    onAddMyIp?: (ip: string) => void;
  }

  let {
    rules = $bindable([]),
    mode = 'WHITELIST',
    currentClientIp = '192.168.1.100',
    class: className = '',
    onChange,
    onAddMyIp,
  }: IpAccessRuleEditorProps = $props();

  let searchQuery = $state<string>('');
  let typeFilter = $state<'ALL' | IpRuleType>('ALL');
  let actionFilter = $state<'ALL' | IpRuleAction>('ALL');

  // Modal State for adding/editing rule
  let isModalOpen = $state<boolean>(false);
  let editId = $state<string | null>(null);
  let editType = $state<IpRuleType>('SINGLE');
  let editValue = $state<string>('');
  let editAction = $state<IpRuleAction>('ALLOW');
  let editDescription = $state<string>('');
  let editExpiration = $state<'PERMANENT' | '2H' | '24H' | '7D'>('PERMANENT');
  let validationError = $state<string | null>(null);

  // Filtered rules
  const filteredRules = $derived.by((): IpAccessRule[] => {
    return rules.filter((rule) => {
      if (typeFilter !== 'ALL' && rule.type !== typeFilter) return false;
      if (actionFilter !== 'ALL' && rule.action !== actionFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchVal = rule.value.toLowerCase().includes(query);
        const matchDesc = rule.description ? rule.description.toLowerCase().includes(query) : false;
        if (!matchVal && !matchDesc) return false;
      }
      return true;
    });
  });

  function openCreateModal(initialValue?: string) {
    editId = null;
    editType = initialValue?.includes('/') ? 'CIDR' : initialValue?.includes('-') ? 'RANGE' : 'SINGLE';
    editValue = initialValue ?? '';
    editAction = mode === 'WHITELIST' ? 'ALLOW' : 'DENY';
    editDescription = '';
    editExpiration = 'PERMANENT';
    validationError = null;
    isModalOpen = true;
  }

  function openEditModal(rule: IpAccessRule) {
    editId = rule.id;
    editType = rule.type;
    editValue = rule.value;
    editAction = rule.action;
    editDescription = rule.description ?? '';
    editExpiration = 'PERMANENT';
    validationError = null;
    isModalOpen = true;
  }

  function handleAddCurrentIp() {
    if (!currentClientIp) return;
    onAddMyIp?.(currentClientIp);

    // Check if already in rules
    const existing = rules.find((r) => r.value === currentClientIp);
    if (!existing) {
      const newRule: IpAccessRule = {
        id: `ip_${Date.now()}`,
        type: 'SINGLE',
        value: currentClientIp,
        action: 'ALLOW',
        description: 'Current Operator Administrator IP (Self-Protection)',
        enabled: true,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      };
      rules = [newRule, ...rules];
      onChange?.(rules);
    }
  }

  function toggleRule(rule: IpAccessRule) {
    rule.enabled = !rule.enabled;
    rules = [...rules];
    onChange?.(rules);
  }

  function deleteRule(id: string) {
    rules = rules.filter((r) => r.id !== id);
    onChange?.(rules);
  }

  function saveRule() {
    const check = validateIpRuleValue(editType, editValue);
    if (!check.valid) {
      validationError = check.error ?? 'Invalid IP address';
      return;
    }

    let expiresAt: string | null = null;
    if (editExpiration === '2H') {
      expiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    } else if (editExpiration === '24H') {
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    } else if (editExpiration === '7D') {
      expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    }

    if (editId) {
      // Edit existing
      const index = rules.findIndex((r) => r.id === editId);
      if (index >= 0) {
        const existing = rules[index];
        if (existing) {
          rules[index] = {
            ...existing,
            type: editType,
            value: editValue.trim(),
            action: editAction,
            ...(editDescription.trim() ? { description: editDescription.trim() } : {}),
            expiresAt,
          };
        }
      }
    } else {
      // Create new
      const newRule: IpAccessRule = {
        id: `ip_${Date.now()}`,
        type: editType,
        value: editValue.trim(),
        action: editAction,
        ...(editDescription.trim() ? { description: editDescription.trim() } : {}),
        enabled: true,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      rules = [newRule, ...rules];
    }

    rules = [...rules];
    onChange?.(rules);
    isModalOpen = false;
  }
</script>

<div
  class="flex flex-col gap-5 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm {className}"
  data-svadmin-component="IpAccessRuleEditor"
>
  <!-- Header Bar -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
    <div>
      <h2 class="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
        <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        IP Access Control Rules ({mode === 'WHITELIST' ? 'Whitelist Mode' : 'Blacklist Mode'})
      </h2>
      <p class="text-xs text-muted-foreground mt-1">
        Configure granular IPv4, IPv6, CIDR subnet masks, and IP ranges for network security isolation.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <!-- One-click add current IP button -->
      {#if currentClientIp}
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          onclick={handleAddCurrentIp}
        >
          <svg class="mr-1.5 h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Trust My IP ({currentClientIp})
        </button>
      {/if}

      <button
        type="button"
        class="inline-flex items-center rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
        onclick={() => openCreateModal()}
      >
        <svg class="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add IP Rule
      </button>
    </div>
  </div>

  <!-- Filters & Search Toolbar -->
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-1 items-center gap-3">
      <div class="relative w-full max-w-xs">
        <input
          type="text"
          placeholder="Filter by IP, CIDR or description..."
          bind:value={searchQuery}
          class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <select
        bind:value={typeFilter}
        data-size="compact" class="svadmin-select--inline svadmin-select"
      >
        <option value="ALL">All Types</option>
        <option value="SINGLE">Single IP</option>
        <option value="CIDR">CIDR Subnet</option>
        <option value="RANGE">IP Range</option>
      </select>

      <select
        bind:value={actionFilter}
        data-size="compact" class="svadmin-select--inline svadmin-select"
      >
        <option value="ALL">All Actions</option>
        <option value="ALLOW">Allow (Whitelist)</option>
        <option value="DENY">Deny (Block)</option>
      </select>
    </div>
  </div>

  <!-- Rules Table -->
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-left text-xs text-foreground">
      <thead class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3">IP / CIDR Pattern</th>
          <th class="px-4 py-3">Type</th>
          <th class="px-4 py-3">Action</th>
          <th class="px-4 py-3">Expiration</th>
          <th class="px-4 py-3">Description</th>
          <th class="px-4 py-3 text-right">Operations</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60 bg-card">
        {#if filteredRules.length === 0}
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-xs text-muted-foreground">
              No IP access rules found. Click "Add IP Rule" to create one.
            </td>
          </tr>
        {:else}
          {#each filteredRules as rule (rule.id)}
            <tr class="hover:bg-muted/40 transition-colors">
              <!-- Switch toggle -->
              <td class="px-4 py-3">
                <button
                  type="button"
                  role="switch"
                  aria-label="Toggle rule status"
                  aria-checked={rule.enabled}
                  class="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {rule.enabled ? 'bg-primary' : 'bg-muted'}"
                  onclick={() => toggleRule(rule)}
                >
                  <span
                    class="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out {rule.enabled ? 'translate-x-3' : 'translate-x-0'}"
                  ></span>
                </button>
              </td>

              <!-- Value -->
              <td class="px-4 py-3 font-mono font-medium text-foreground">
                {rule.value}
              </td>

              <!-- Type -->
              <td class="px-4 py-3">
                <span class="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {rule.type}
                </span>
              </td>

              <!-- Action -->
              <td class="px-4 py-3">
                {#if rule.action === 'ALLOW'}
                  <span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    ALLOW
                  </span>
                {:else}
                  <span class="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    DENY
                  </span>
                {/if}
              </td>

              <!-- Expiration -->
              <td class="px-4 py-3 text-muted-foreground">
                {#if rule.expiresAt}
                  <span class="text-xs text-warning font-medium">
                    Exp: {new Date(rule.expiresAt).toLocaleTimeString()}
                  </span>
                {:else}
                  <span class="text-[11px] text-muted-foreground">Permanent</span>
                {/if}
              </td>

              <!-- Description -->
              <td class="px-4 py-3 text-muted-foreground max-w-xs truncate">
                {rule.description || '—'}
              </td>

              <!-- Operations -->
              <td class="px-4 py-3 text-right">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="text-xs text-primary hover:underline"
                    onclick={() => openEditModal(rule)}
                  >
                    Edit
                  </button>
                  <span class="text-border">|</span>
                  <button
                    type="button"
                    class="text-xs text-destructive hover:underline"
                    onclick={() => deleteRule(rule.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Create / Edit Rule Modal -->
  {#if isModalOpen}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl text-card-foreground">
        <h3 class="text-base font-bold text-foreground">
          {editId ? 'Edit IP Access Rule' : 'Add IP Access Rule'}
        </h3>
        <p class="text-xs text-muted-foreground mt-0.5">
          Define IP address, CIDR subnet mask, or IP range.
        </p>

        <div class="mt-4 space-y-3">
          <!-- Type Select -->
          <div>
            <label for="rule-type-select" class="block text-xs font-medium text-foreground">Rule Type</label>
            <select
              id="rule-type-select"
              bind:value={editType}
              data-size="compact" class="mt-1 svadmin-select"
            >
              <option value="SINGLE">Single IP (e.g. 192.168.1.100)</option>
              <option value="CIDR">CIDR Subnet (e.g. 172.16.0.0/16)</option>
              <option value="RANGE">IP Range (e.g. 10.0.0.1 - 10.0.0.50)</option>
            </select>
          </div>

          <!-- Value Input -->
          <div>
            <label for="rule-pattern-input" class="block text-xs font-medium text-foreground">IP / Pattern Value</label>
            <input
              id="rule-pattern-input"
              type="text"
              bind:value={editValue}
              placeholder={editType === 'SINGLE' ? '192.168.1.100' : editType === 'CIDR' ? '10.0.0.0/16' : '192.168.1.1 - 192.168.1.50'}
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {#if validationError}
              <p class="mt-1 text-xs text-destructive">{validationError}</p>
            {/if}
          </div>

          <!-- Action Select -->
          <div>
            <label for="rule-action-select" class="block text-xs font-medium text-foreground">Action</label>
            <select
              id="rule-action-select"
              bind:value={editAction}
              data-size="compact" class="mt-1 svadmin-select"
            >
              <option value="ALLOW">ALLOW (Permit Connection)</option>
              <option value="DENY">DENY (Block Connection)</option>
            </select>
          </div>

          <!-- Expiration Select -->
          <div>
            <label for="rule-expiration-select" class="block text-xs font-medium text-foreground">Expiration Period</label>
            <select
              id="rule-expiration-select"
              bind:value={editExpiration}
              data-size="compact" class="mt-1 svadmin-select"
            >
              <option value="PERMANENT">Permanent (Never expires)</option>
              <option value="2H">Temporary: 2 Hours</option>
              <option value="24H">Temporary: 24 Hours</option>
              <option value="7D">Temporary: 7 Days</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label for="rule-description-input" class="block text-xs font-medium text-foreground">Description (Optional)</label>
            <input
              id="rule-description-input"
              type="text"
              bind:value={editDescription}
              placeholder="e.g. Office VPN Gateway"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onclick={() => (isModalOpen = false)}
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90"
            onclick={saveRule}
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
