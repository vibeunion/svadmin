<script lang="ts">
  import type { IpAccessRule } from './IpAccessRuleEditor.svelte';
  import IpAccessRuleEditor from './IpAccessRuleEditor.svelte';

  export interface IpWhitelistDrawerProps {
    open?: boolean;
    rules?: IpAccessRule[];
    mode?: 'WHITELIST' | 'BLACKLIST';
    currentClientIp?: string;
    class?: string;
    onClose?: () => void;
    onChange?: (rules: IpAccessRule[]) => void;
    onAddMyIp?: (ip: string) => void;
  }

  let {
    open = $bindable(false),
    rules = $bindable([]),
    mode = $bindable('WHITELIST'),
    currentClientIp = '192.168.1.100',
    class: className = '',
    onClose,
    onChange,
    onAddMyIp,
  }: IpWhitelistDrawerProps = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity"
    onclick={() => {
      open = false;
      onClose?.();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        open = false;
        onClose?.();
      }
    }}
    tabindex="-1"
    role="presentation"
  ></div>

  <!-- Slide-over Drawer Panel -->
  <div
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-in-out {className}"
    data-svadmin-component="IpWhitelistDrawer"
    role="dialog"
    aria-modal="true"
    aria-label="IP Access Control Drawer"
  >
    <!-- Drawer Header -->
    <div class="flex items-center justify-between border-b border-border p-4">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Network Security & IP Access Rules</h2>
          <p class="text-xs text-muted-foreground">
            Manage firewall rules and IP access whitelist/blacklist.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Close button -->
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close IP whitelist drawer"
          onclick={() => {
            open = false;
            onClose?.();
          }}
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mode Selector Bar -->
    <div class="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-2.5">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-foreground">Enforcement Mode:</span>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {mode === 'WHITELIST' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}"
          onclick={() => (mode = 'WHITELIST')}
        >
          Whitelist Only
        </button>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {mode === 'BLACKLIST' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:bg-muted'}"
          onclick={() => (mode = 'BLACKLIST')}
        >
          Blacklist Block
        </button>
      </div>

      <span class="text-xs text-muted-foreground">
        Active rules: {rules.filter((r) => r.enabled).length} / {rules.length}
      </span>
    </div>

    <!-- Drawer Body -->
    <div class="flex-1 overflow-y-auto p-6">
      <IpAccessRuleEditor
        bind:rules
        {mode}
        {currentClientIp}
        {onChange}
        {onAddMyIp}
      />
    </div>
  </div>
{/if}
