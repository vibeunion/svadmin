<script module lang="ts">
  import type { Snippet } from 'svelte';

  export type NotificationCategory = 'TASKS' | 'ANNOUNCEMENTS' | 'SECURITY_ALERTS';

  export interface NotificationAction {
    id: string;
    label: string;
    variant?: 'primary' | 'destructive' | 'default';
    onClick?: (item: NotificationItem) => void;
  }

  export interface NotificationItem {
    id: string;
    title: string;
    description?: string;
    category: NotificationCategory;
    read: boolean;
    createdAt: string;
    avatar?: string;
    badge?: string;
    actions?: NotificationAction[];
    meta?: Record<string, unknown>;
  }

  export interface NotificationDrawerProps {
    open?: boolean;
    items?: NotificationItem[];
    dndEnabled?: boolean;
    class?: string;
    onClose?: () => void;
    onItemClick?: (item: NotificationItem) => void;
    onMarkAllRead?: () => void;
    onClearRead?: () => void;
    onToggleDnd?: (enabled: boolean) => void;
    onAction?: (actionId: string, item: NotificationItem) => void;
    customItem?: Snippet<[{ item: NotificationItem; index: number }]>;
  }
</script>

<script lang="ts">

  let {
    open = $bindable(false),
    items = $bindable([]),
    dndEnabled = $bindable(false),
    class: className = '',
    onClose,
    onItemClick,
    onMarkAllRead,
    onClearRead,
    onToggleDnd,
    onAction,
    customItem,
  }: NotificationDrawerProps = $props();

  let activeTab = $state<'ALL' | NotificationCategory>('ALL');

  // Filtered list based on active tab
  const filteredItems = $derived.by((): NotificationItem[] => {
    if (activeTab === 'ALL') return items;
    return items.filter((item) => item.category === activeTab);
  });

  // Unread count per category
  interface UnreadCounts {
    ALL: number;
    TASKS: number;
    ANNOUNCEMENTS: number;
    SECURITY_ALERTS: number;
  }

  const unreadCounts = $derived.by((): UnreadCounts => {
    const counts: UnreadCounts = {
      ALL: 0,
      TASKS: 0,
      ANNOUNCEMENTS: 0,
      SECURITY_ALERTS: 0,
    };
    for (const item of items) {
      if (!item.read) {
        counts.ALL += 1;
        counts[item.category] += 1;
      }
    }
    return counts;
  });

  function handleMarkAllAsRead() {
    items = items.map((i) => ({ ...i, read: true }));
    onMarkAllRead?.();
  }

  function handleClearRead() {
    items = items.filter((i) => !i.read);
    onClearRead?.();
  }

  function toggleDndMode() {
    dndEnabled = !dndEnabled;
    onToggleDnd?.(dndEnabled);
  }

  function markSingleRead(item: NotificationItem) {
    item.read = true;
    items = [...items];
    onItemClick?.(item);
  }

  function handleActionClick(e: MouseEvent, action: NotificationAction, item: NotificationItem) {
    e.stopPropagation();
    action.onClick?.(item);
    onAction?.(action.id, item);
  }
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

  <!-- Right Slide-over Drawer Panel -->
  <div
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-in-out {className}"
    data-svadmin-component="NotificationDrawer"
    role="dialog"
    aria-modal="true"
    aria-label="Notification Center Drawer"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border p-4">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Notification Center</h2>
          <p class="text-xs text-muted-foreground">
            {unreadCounts.ALL} unread notification{unreadCounts.ALL === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Do Not Disturb Toggle -->
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors {dndEnabled ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-muted'}"
          title={dndEnabled ? 'Do Not Disturb is ON' : 'Turn on Do Not Disturb'}
          onclick={toggleDndMode}
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span>{dndEnabled ? 'DND On' : 'DND'}</span>
        </button>

        <!-- Close button -->
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close notification drawer"
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

    <!-- Category Tabs -->
    <div class="flex border-b border-border bg-muted/40 px-3 pt-2 text-xs font-medium">
      <button
        type="button"
        class="relative px-3 py-2 transition-colors {activeTab === 'ALL' ? 'text-primary font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'ALL')}
      >
        All
        {#if unreadCounts.ALL > 0}
          <span class="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {unreadCounts.ALL > 99 ? '99+' : unreadCounts.ALL}
          </span>
        {/if}
      </button>

      <button
        type="button"
        class="relative px-3 py-2 transition-colors {activeTab === 'TASKS' ? 'text-primary font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'TASKS')}
      >
        Tasks
        {#if (unreadCounts.TASKS ?? 0) > 0}
          <span class="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {unreadCounts.TASKS}
          </span>
        {/if}
      </button>

      <button
        type="button"
        class="relative px-3 py-2 transition-colors {activeTab === 'ANNOUNCEMENTS' ? 'text-primary font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'ANNOUNCEMENTS')}
      >
        Notices
        {#if (unreadCounts.ANNOUNCEMENTS ?? 0) > 0}
          <span class="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {unreadCounts.ANNOUNCEMENTS}
          </span>
        {/if}
      </button>

      <button
        type="button"
        class="relative px-3 py-2 transition-colors {activeTab === 'SECURITY_ALERTS' ? 'text-primary font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => (activeTab = 'SECURITY_ALERTS')}
      >
        Security
        {#if (unreadCounts.SECURITY_ALERTS ?? 0) > 0}
          <span class="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
            {unreadCounts.SECURITY_ALERTS}
          </span>
        {/if}
      </button>
    </div>

    <!-- Actions toolbar: Mark all read / Clear read -->
    <div class="flex items-center justify-between border-b border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground">
      <span>{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}</span>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="hover:text-primary transition-colors disabled:opacity-50"
          disabled={unreadCounts.ALL === 0}
          onclick={handleMarkAllAsRead}
        >
          Mark all as read
        </button>
        <span class="text-border">|</span>
        <button
          type="button"
          class="hover:text-destructive transition-colors disabled:opacity-50"
          disabled={filteredItems.every((i) => !i.read)}
          onclick={handleClearRead}
        >
          Clear read
        </button>
      </div>
    </div>

    <!-- Notification List Content -->
    <div class="flex-1 overflow-y-auto divide-y divide-border/60 p-2">
      {#if filteredItems.length === 0}
        <div class="flex h-64 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <svg class="h-10 w-10 stroke-1 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="mt-2 text-xs">No notifications in this category</p>
        </div>
      {:else}
        {#each filteredItems as item, index (item.id)}
          {#if customItem}
            {@render customItem({ item, index })}
          {:else}
            <!-- Default Notification Item Card -->
            <div
              class="group relative flex flex-col gap-2 rounded-md p-3 transition-colors hover:bg-muted/40 {item.read ? 'opacity-80' : 'bg-card font-medium'}"
              role="button"
              tabindex="0"
              onclick={() => markSingleRead(item)}
              onkeydown={(e) => {
                if (e.key === 'Enter') markSingleRead(item);
              }}
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2.5">
                  <!-- Unread indicator dot -->
                  <div class="mt-1 h-2 w-2 shrink-0 rounded-full {item.read ? 'bg-transparent' : 'bg-primary'}"></div>

                  <!-- Category icon -->
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-foreground">
                    {#if item.category === 'TASKS'}
                      <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    {:else if item.category === 'SECURITY_ALERTS'}
                      <svg class="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    {:else}
                      <svg class="h-4 w-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    {/if}
                  </div>

                  <div class="flex-1">
                    <div class="text-xs font-semibold text-foreground">{item.title}</div>
                    {#if item.description}
                      <p class="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    {/if}
                  </div>
                </div>

                <!-- Time string -->
                <span class="text-[10px] text-muted-foreground shrink-0">{item.createdAt}</span>
              </div>

              <!-- Quick action buttons -->
              {#if item.actions && item.actions.length > 0}
                <div class="mt-2 flex flex-wrap items-center gap-2 pl-9">
                  {#each item.actions as action (action.label ?? action.id ?? action.variant ?? 'action')}
                    <button
                      type="button"
                      class="rounded px-2 py-1 text-[11px] font-medium transition-colors {action.variant === 'primary' ? 'bg-primary text-primary-foreground hover:opacity-90' : action.variant === 'destructive' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'border border-input bg-background text-foreground hover:bg-muted'}"
                      onclick={(e) => handleActionClick(e, action, item)}
                    >
                      {action.label}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>
{/if}
