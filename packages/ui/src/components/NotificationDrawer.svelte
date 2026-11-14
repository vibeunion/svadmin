<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type NotificationCategory = 'TASKS' | 'ANNOUNCEMENTS' | 'SECURITY_ALERTS';
  export interface NotificationAction {
    id: string;
    label: string;
    variant?: 'primary' | 'destructive' | 'default';
    onClick?: (item: NotificationItem) => void | Promise<void>;
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
    onClose?: () => void | Promise<void>;
    onItemClick?: (item: NotificationItem) => void | Promise<void>;
    onMarkAllRead?: () => void | Promise<void>;
    onClearRead?: () => void | Promise<void>;
    onToggleDnd?: (enabled: boolean) => void | Promise<void>;
    onAction?: (actionId: string, item: NotificationItem) => void | Promise<void>;
    onError?: (error: unknown) => void;
    customItem?: Snippet<[{ item: NotificationItem; index: number }]>;
  }
</script>

<script lang="ts">
  import { Sheet } from './ui/sheet/index.js';

  let {
    open = $bindable(false), items = $bindable([]), dndEnabled = $bindable(false),
    class: className = '', onClose, onItemClick, onMarkAllRead, onClearRead,
    onToggleDnd, onAction, onError, customItem,
  }: NotificationDrawerProps = $props();

  type Filter = 'ALL' | 'UNREAD' | NotificationCategory;
  const categories: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'All' }, { key: 'UNREAD', label: 'Unread' },
    { key: 'TASKS', label: 'Tasks' }, { key: 'ANNOUNCEMENTS', label: 'Notices' },
    { key: 'SECURITY_ALERTS', label: 'Security' },
  ];
  let activeTab = $state<Filter>('ALL');
  let pendingOperation = $state<string | null>(null);
  let errorMessage = $state('');
  const filteredItems = $derived(items.filter(item => activeTab === 'ALL'
    || (activeTab === 'UNREAD' ? !item.read : item.category === activeTab)));
  const unreadCounts = $derived.by(() => {
    const counts: Record<Filter, number> = { ALL: 0, UNREAD: 0, TASKS: 0, ANNOUNCEMENTS: 0, SECURITY_ALERTS: 0 };
    for (const item of items) {
      if (!item.read) { counts.ALL++; counts.UNREAD++; counts[item.category]++; }
    }
    return counts;
  });

  function reportError(error: unknown) {
    errorMessage = error instanceof Error ? error.message : 'The notification operation failed. Please try again.';
    try { void Promise.resolve(onError?.(error)).catch(() => {}); } catch { /* 错误观察者不能打断组件恢复。 */ }
  }
  async function runOperation(key: string, operation: () => void | Promise<void>) {
    if (pendingOperation) return;
    pendingOperation = key;
    errorMessage = '';
    try { await operation(); } catch (error) { reportError(error); }
    finally { pendingOperation = null; }
  }
  function handleMarkAllAsRead() {
    return runOperation('mark-all', async () => {
      const ids = new Set(items.map(item => item.id));
      await onMarkAllRead?.();
      items = items.map(item => ids.has(item.id) ? { ...item, read: true } : item);
    });
  }
  function handleClearRead() {
    return runOperation('clear-read', async () => {
      const ids = new Set(items.filter(item => item.read).map(item => item.id));
      await onClearRead?.();
      items = items.filter(item => !ids.has(item.id));
    });
  }
  function toggleDndMode() {
    return runOperation('dnd', async () => {
      const enabled = !dndEnabled;
      await onToggleDnd?.(enabled);
      dndEnabled = enabled;
    });
  }
  function markSingleRead(item: NotificationItem) {
    return runOperation(`read:${item.id}`, async () => {
      const updated = { ...item, read: true };
      await onItemClick?.(updated);
      // 不修改调用方传入对象，允许冻结快照和受控 props。
      items = items.map(current => current.id === item.id ? { ...current, read: true } : current);
    });
  }
  function handleActionClick(action: NotificationAction, item: NotificationItem) {
    return runOperation(`action:${item.id}:${action.id}`, async () => {
      if (action.onClick) await action.onClick(item);
      else await onAction?.(action.id, item);
    });
  }
  function handleClose() {
    try { void Promise.resolve(onClose?.()).catch(reportError); } catch (error) { reportError(error); }
  }
</script>

<Sheet
  bind:open
  onClose={handleClose}
  closeLabel="Close notification drawer"
  class="svadmin-notification-drawer {className}"
  data-svadmin-component="NotificationDrawer"
  data-dnd-enabled={dndEnabled}
  role="dialog"
  aria-modal="true"
  aria-label="Notification Center Drawer"
>
  <header class="notification-header">
    <div>
      <h2>Notification Center</h2>
      <p>{unreadCounts.ALL} unread notification{unreadCounts.ALL === 1 ? '' : 's'}</p>
    </div>
    <button class="notification-dnd" type="button" aria-pressed={dndEnabled} disabled={pendingOperation !== null}
      title="Quiet mode preference" onclick={toggleDndMode}>
      {dndEnabled ? 'DND On' : 'DND'}
    </button>
  </header>

  {#if dndEnabled}
    <p class="notification-quiet-status" role="status">Quiet mode is on. Security alerts remain visible.</p>
  {/if}
  <nav class="notification-categories" aria-label="Notification categories">
    {#each categories as category (category.key)}
      <button type="button" aria-pressed={activeTab === category.key} onclick={() => (activeTab = category.key)}>
        {category.label}
        {#if unreadCounts[category.key] > 0}
          <span class="notification-count" data-security={category.key === 'SECURITY_ALERTS'} data-muted={dndEnabled && category.key !== 'SECURITY_ALERTS'}>
            {unreadCounts[category.key] > 99 ? '99+' : unreadCounts[category.key]}
          </span>
        {/if}
      </button>
    {/each}
  </nav>
  <div class="notification-toolbar">
    <span>{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}</span>
    <button type="button" disabled={pendingOperation !== null || unreadCounts.ALL === 0} onclick={handleMarkAllAsRead}>Mark all as read</button>
    <button type="button" disabled={pendingOperation !== null || !items.some(item => item.read)} onclick={handleClearRead}>Clear read</button>
  </div>
  {#if errorMessage}<p class="notification-error" role="alert">{errorMessage}</p>{/if}
  <div class="notification-list" aria-busy={pendingOperation !== null}>
    {#if filteredItems.length === 0}
      <p class="notification-empty">No notifications in this category</p>
    {:else}
      {#each filteredItems as item, index (item.id)}
        {#if customItem}
          {@render customItem({ item, index })}
        {:else}
          <article class="notification-item" data-read={item.read} data-security={item.category === 'SECURITY_ALERTS'}>
            <button class="notification-item-open" type="button" disabled={pendingOperation !== null} onclick={() => markSingleRead(item)}>
              <span class="notification-dot" data-read={item.read} data-muted={dndEnabled && item.category !== 'SECURITY_ALERTS'} data-security={item.category === 'SECURITY_ALERTS'} aria-hidden="true"></span>
              <span class="notification-copy">
                <strong>{item.title}</strong>
                {#if item.description}<span>{item.description}</span>{/if}
                <time>{item.createdAt}</time>
              </span>
              {#if item.badge}<span class="notification-badge">{item.badge}</span>{/if}
            </button>
            {#if item.actions && item.actions.length > 0}
              <div class="notification-actions">
                {#each item.actions as action (action.id)}
                  <button type="button" data-variant={action.variant ?? 'default'} disabled={pendingOperation !== null}
                    onclick={() => handleActionClick(action, item)}>
                    {pendingOperation === `action:${item.id}:${action.id}` ? 'Working…' : action.label}
                  </button>
                {/each}
              </div>
            {/if}
          </article>
        {/if}
      {/each}
    {/if}
  </div>
</Sheet>

<style>
  :global(.svadmin-notification-drawer) {
    display: flex;
    flex-direction: column;
    width: min(30rem, 100vw);
    max-width: 100vw;
    padding: 0;
    color: var(--foreground);
    background: var(--card);
  }
  .notification-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 3rem 1rem 1rem; border-bottom: 1px solid var(--border); }
  .notification-header h2 { margin: 0; font-size: var(--svadmin-text-section); font-weight: 500; }
  .notification-header p { margin: 0.25rem 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  button { font: inherit; cursor: pointer; }
  button:disabled { cursor: default; opacity: 0.5; }
  button:focus-visible { outline: var(--svadmin-focus-width) solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
  .notification-dnd { padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--background); color: var(--muted-foreground); font-size: var(--svadmin-text-caption); white-space: nowrap; }
  .notification-dnd[aria-pressed='true'] { color: var(--primary); background: var(--accent); }
  .notification-categories { display: flex; flex-wrap: wrap; padding: 0.5rem; gap: 0.25rem; border-bottom: 1px solid var(--border); }
  .notification-categories > button { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 0; border-radius: var(--radius); background: transparent; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .notification-categories > button[aria-pressed='true'] { color: var(--primary); background: var(--accent); }
  .notification-count { display: inline-grid; place-items: center; min-width: 1rem; padding: 0.125rem 0.25rem; border-radius: 1rem; background: var(--primary); color: var(--primary-foreground); font-size: var(--svadmin-text-caption); }
  .notification-count[data-muted='true'] { background: var(--muted); color: var(--muted-foreground); }
  .notification-count[data-security='true'] { background: var(--destructive); color: var(--destructive-foreground); }
  .notification-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: var(--svadmin-text-caption); }
  .notification-toolbar > span { margin-right: auto; color: var(--muted-foreground); }
  .notification-toolbar > button { padding: 0; border: 0; background: transparent; color: var(--primary); }
  .notification-list { flex: 1; overflow-y: auto; padding: 0.5rem; min-height: 0; }
  .notification-item { border-bottom: 1px solid var(--border); padding: 0.75rem 0.5rem; }
  .notification-item-open { display: flex; gap: 0.5rem; width: 100%; padding: 0.25rem; border: 0; text-align: start; background: transparent; color: var(--foreground); }
  .notification-item-open:hover { background: var(--accent); }
  .notification-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 0.375rem; font-size: var(--svadmin-text-label); }
  .notification-copy strong { font-weight: 600; }
  .notification-copy > span, .notification-copy time { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); line-height: 1.5; overflow-wrap: anywhere; }
  .notification-dot { width: 0.5rem; height: 0.5rem; margin-top: 0.375rem; border-radius: 50%; flex-shrink: 0; background: var(--primary); }
  .notification-dot[data-muted='true'] { background: var(--muted-foreground); }
  .notification-dot[data-security='true'] { background: var(--destructive); }
  .notification-dot[data-read='true'] { background: transparent; }
  .notification-badge { align-self: flex-start; border: 1px solid var(--border); border-radius: var(--radius); padding: 0.125rem 0.25rem; font-size: var(--svadmin-text-caption); }
  .notification-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.5rem 0 0 1rem; }
  .notification-actions button { padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--background); color: var(--foreground); font-size: var(--svadmin-text-caption); }
  .notification-actions button[data-variant='primary'] { background: var(--primary); border-color: var(--primary); color: var(--primary-foreground); }
  .notification-actions button[data-variant='destructive'] { color: var(--destructive); border-color: var(--destructive); }
  .notification-error { margin: 0; padding: 0.75rem 1rem; color: var(--destructive); background: var(--card); font-size: var(--svadmin-text-label); }
  .notification-empty { padding: 3rem 1rem; margin: 0; color: var(--muted-foreground); text-align: center; font-size: var(--svadmin-text-label); }
  .notification-quiet-status { margin: 0; padding: 0.75rem 1rem; color: var(--muted-foreground); background: var(--muted); font-size: var(--svadmin-text-caption); }
</style>
