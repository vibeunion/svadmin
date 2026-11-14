<script lang="ts">
  import NotificationDrawer, { type NotificationItem } from '../../../packages/ui/src/components/NotificationDrawer.svelte';
  import NotificationCenter from '../../../packages/ui/src/components/NotificationCenter.svelte';

  let drawerOpen = $state(false);
  let quietMode = $state(false);
  let lastAction = $state('No actions taken');
  let items = $state<NotificationItem[]>([
    { id: 'audit', title: 'Quarterly audit review', description: 'The compliance package is ready for your signoff.', category: 'TASKS', read: false, createdAt: '15 minutes ago', badge: 'Finance', actions: [{ id: 'approve', label: 'Approve', variant: 'primary' }, { id: 'reject', label: 'Reject', variant: 'destructive' }] },
    { id: 'login', title: 'New device login detected', description: 'A new sign-in needs review. Security alerts remain visible during quiet mode.', category: 'SECURITY_ALERTS', read: false, createdAt: '30 minutes ago', actions: [{ id: 'review', label: 'Review sign-in' }] },
    { id: 'maintenance', title: 'Scheduled maintenance', description: 'A maintenance window is planned for Saturday at 02:00 UTC.', category: 'ANNOUNCEMENTS', read: false, createdAt: '2 hours ago' },
    { id: 'export', title: 'Monthly export ready', description: 'The report export completed successfully.', category: 'TASKS', read: true, createdAt: 'Yesterday', actions: [{ id: 'download', label: 'Download' }] },
  ]);
</script>

<main>
  <header>
    <div><p class="eyebrow">Workspace</p><h1>Notification workspace</h1><p>Review tasks, announcements and account security updates.</p></div>
    <NotificationCenter items={items.map(item => ({ ...item, time: item.createdAt }))} showDrawerButton onopendrawer={() => { drawerOpen = true; }} />
  </header>
  <section class="summary" aria-label="Inbox summary">
    <article><span>Unread updates</span><strong>{items.filter(item => !item.read).length}</strong></article>
    <article><span>Pending tasks</span><strong>{items.filter(item => item.category === 'TASKS' && !item.read).length}</strong></article>
    <article><span>Security alerts</span><strong>{items.filter(item => item.category === 'SECURITY_ALERTS' && !item.read).length}</strong></article>
  </section>
  <section class="inbox">
    <h2>Team inbox</h2>
    <p>Open the drawer to filter updates, manage read status and complete an action.</p>
    <button type="button" onclick={() => { drawerOpen = true; }}>Open notification drawer</button>
    <p class="preference">Quiet mode: <strong>{quietMode ? 'On' : 'Off'}</strong></p>
    <p role="status">{lastAction}</p>
  </section>
</main>
<NotificationDrawer bind:open={drawerOpen} bind:items bind:dndEnabled={quietMode}
  onAction={(id, item) => { lastAction = `${id}: ${item.title}`; }}
  onMarkAllRead={() => { lastAction = 'All notifications marked as read'; }}
  onClearRead={() => { lastAction = 'Read notifications cleared'; }}
/>

<style>
  :global(body) { margin: 0; background: var(--background); color: var(--foreground); font-family: system-ui, sans-serif; }
  main { max-width: 76rem; margin: 0 auto; padding: 3rem 2rem; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
  h1 { margin: 0 0 0.5rem; font-size: 2rem; font-weight: 500; }
  p { color: var(--muted-foreground); line-height: 1.5; }
  .eyebrow { margin: 0 0 0.5rem; color: var(--primary); font-size: 0.875rem; }
  .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 2rem 0; }
  article { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); }
  article span { color: var(--muted-foreground); font-size: 0.875rem; }
  article strong { font-weight: 500; font-size: 1.75rem; }
  .inbox { border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; background: var(--card); }
  h2 { margin-top: 0; font-size: 1.25rem; font-weight: 500; }
  .inbox button { border: 1px solid var(--primary); border-radius: var(--radius); background: var(--primary); color: var(--primary-foreground); font: inherit; font-size: 0.875rem; padding: 0.625rem 1rem; cursor: pointer; }
  .preference { margin-top: 2rem; }
</style>
