import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import NotificationCenter from './NotificationCenter.svelte';
import NotificationDrawer, { type NotificationItem as DrawerItem } from './NotificationDrawer.svelte';

const testItems = [
  {
    id: 'n1',
    title: 'Weekly Financial Report Ready',
    description: 'Q3 financial report is generated and ready to download.',
    category: 'announcements',
    read: false,
    time: '10m ago',
  },
  {
    id: 'n2',
    title: 'Pending Budget Approval',
    description: 'Marketing team requested 5,000 USD budget.',
    category: 'tasks',
    read: false,
    time: '1h ago',
  },
  {
    id: 'n3',
    title: 'Suspicious IP Login Detected',
    description: 'Login from new location: 198.51.100.4',
    category: 'security',
    read: true,
    time: '2h ago',
  },
];

const drawerItems: DrawerItem[] = [
  {
    id: 'd1',
    title: 'Quarterly Audit Review',
    description: 'Compliance audit requires signoff.',
    category: 'TASKS',
    read: false,
    createdAt: '15m ago',
    actions: [
      { id: 'sign', label: 'Sign Document', variant: 'primary' },
      { id: 'reject', label: 'Reject', variant: 'destructive' },
    ],
  },
  {
    id: 'd2',
    title: 'System Maintenance Window',
    description: 'Database maintenance scheduled for 02:00 UTC.',
    category: 'ANNOUNCEMENTS',
    read: false,
    createdAt: '2h ago',
  },
  {
    id: 'd3',
    title: 'Brute-force attack blocked',
    description: 'Firewall dropped 45 failed SSH login attempts.',
    category: 'SECURITY_ALERTS',
    read: true,
    createdAt: '1d ago',
  },
];

describe('NotificationCenter Component', () => {
  it('renders trigger button and badge count with data-svadmin-component', () => {
    const { container } = render(NotificationCenter, {
      items: testItems,
    });
    const root = container.querySelector('[data-svadmin-component="NotificationCenter"]');
    expect(root).not.toBeNull();
    // 2 unread items (n1 and n2)
    expect(screen.getByText('2')).toBeDefined();
  });

  it('triggers onopendrawer callback when drawer button clicked', async () => {
    let drawerOpened = false;
    render(NotificationCenter, {
      items: testItems,
      open: true,
      showDrawerButton: true,
      onopendrawer: () => {
        drawerOpened = true;
      },
    });

    const openDrawerBtn = screen.getByRole('button', { name: /open full drawer/i });
    await fireEvent.click(openDrawerBtn);
    expect(drawerOpened).toBe(true);
  });
});

describe('NotificationDrawer Component', () => {
  it('renders categorized tabs and items with data-svadmin-component', () => {
    render(NotificationDrawer, {
      open: true,
      items: drawerItems,
    });
    const drawer = screen.getByRole('dialog', { name: 'Notification Center Drawer' });
    expect(drawer).not.toBeNull();
    expect(screen.getByText('Quarterly Audit Review')).toBeDefined();
    expect(screen.getByText('System Maintenance Window')).toBeDefined();
    expect(screen.getByText('Brute-force attack blocked')).toBeDefined();
  });

  it('filters notifications when clicking category tabs', async () => {
    render(NotificationDrawer, {
      open: true,
      items: drawerItems,
    });

    const tasksTab = screen.getByRole('button', { name: /^tasks/i });
    await fireEvent.click(tasksTab);

    expect(screen.getByText('Quarterly Audit Review')).toBeDefined();
    expect(screen.queryByText('System Maintenance Window')).toBeNull();
  });

  it('executes quick action callback on button click', async () => {
    let triggeredAction = '';
    render(NotificationDrawer, {
      open: true,
      items: drawerItems,
      onAction: (actionId) => {
        triggeredAction = actionId;
      },
    });

    const signBtn = screen.getByRole('button', { name: 'Sign Document' });
    await fireEvent.click(signBtn);

    expect(triggeredAction).toBe('sign');
  });
  it('adds unread filtering and reacts when parent data changes', async () => {
    const view = render(NotificationDrawer, { open: true, items: drawerItems });
    await fireEvent.click(screen.getByRole('button', { name: /^Unread/ }));
    expect(screen.queryByText('Brute-force attack blocked')).toBeNull();
    await view.rerender({ items: [...drawerItems, { id: 'd4', title: 'New Task', category: 'TASKS', read: false, createdAt: 'now' }] });
    expect(screen.getByText('New Task')).toBeDefined();
    expect(screen.getByText('3 unread notifications')).toBeDefined();
  });

  it('marks a frozen notification without mutating caller data', async () => {
    const firstItem = drawerItems[0];
    if (!firstItem) throw new Error('Missing notification fixture');
    const source = Object.freeze({ ...firstItem });
    const onItemClick = vi.fn();
    render(NotificationDrawer, { open: true, items: [source], onItemClick });
    await fireEvent.click(screen.getByRole('button', { name: /Quarterly Audit Review/ }));
    await waitFor(() => expect(screen.getByText('0 unread notifications')).toBeDefined());
    expect(source.read).toBe(false);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', read: true }));
  });

  it('keeps failed operations visible and prevents duplicate quick actions', async () => {
    let rejectOperation: (error: Error) => void = () => {};
    const task = new Promise<void>((_resolve, reject) => { rejectOperation = reject; });
    const onAction = vi.fn(() => task);
    const onError = vi.fn();
    render(NotificationDrawer, { open: true, items: drawerItems, onAction, onError });
    const sign = screen.getByRole('button', { name: 'Sign Document' });
    await fireEvent.click(sign);
    await fireEvent.click(sign);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(sign.hasAttribute('disabled')).toBe(true);
    rejectOperation(new Error('Approval service unavailable'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Approval service unavailable'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(sign.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('2 unread notifications')).toBeDefined();
  });

  it('runs an item-specific action once instead of also dispatching the global handler', async () => {
    const ownAction = vi.fn(); const globalAction = vi.fn();
    const firstItem = drawerItems[0];
    if (!firstItem) throw new Error('Missing notification fixture');
    render(NotificationDrawer, { open: true, items: [{ ...firstItem, actions: [{ id: 'sign', label: 'Sign Document', onClick: ownAction }] }], onAction: globalAction });
    await fireEvent.click(screen.getByRole('button', { name: 'Sign Document' }));
    await waitFor(() => expect(ownAction).toHaveBeenCalledTimes(1));
    expect(globalAction).not.toHaveBeenCalled();
  });

  it('does not mark items as read when the persistence callback rejects', async () => {
    render(NotificationDrawer, { open: true, items: drawerItems, onMarkAllRead: async () => { throw new Error('Save failed'); } });
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Save failed'));
    expect(screen.getByText('2 unread notifications')).toBeDefined();
  });

  it('applies global mark/read/clear controls even when a category is selected', async () => {
    const onClearRead = vi.fn();
    render(NotificationDrawer, { open: true, items: drawerItems, onClearRead });
    await fireEvent.click(screen.getByRole('button', { name: /^Tasks/ }));
    const clearRead = screen.getByRole('button', { name: 'Clear read' });
    expect(clearRead.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(clearRead);
    await waitFor(() => expect(onClearRead).toHaveBeenCalledTimes(1));
    await fireEvent.click(screen.getByRole('button', { name: /^Security/ }));
    expect(screen.queryByText('Brute-force attack blocked')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getByText('0 unread notifications')).toBeDefined());
  });

  it('does not mark newly received messages while a bulk save is in flight', async () => {
    let finish: () => void = () => {};
    const task = new Promise<void>(resolve => { finish = resolve; });
    const view = render(NotificationDrawer, { open: true, items: drawerItems, onMarkAllRead: () => task });
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await view.rerender({ items: [...drawerItems, { id: 'new', title: 'New arrival', category: 'TASKS', read: false, createdAt: 'now' }] });
    finish();
    await waitFor(() => expect(screen.getByText('1 unread notification')).toBeDefined());
    await fireEvent.click(screen.getByRole('button', { name: /^Unread/ }));
    expect(screen.getByText('New arrival')).toBeDefined();
    expect(screen.queryByText('Quarterly Audit Review')).toBeNull();
  });

  it('preserves security alert visibility and tone when quiet mode is enabled', async () => {
    const onToggleDnd = vi.fn();
    const items: DrawerItem[] = drawerItems.map(item => ({ ...item, read: false }));
    render(NotificationDrawer, { open: true, items, onToggleDnd });
    await fireEvent.click(screen.getByRole('button', { name: 'DND' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'DND On' }).getAttribute('aria-pressed')).toBe('true'));
    expect(onToggleDnd).toHaveBeenCalledWith(true);
    expect(screen.getByText('Brute-force attack blocked')).toBeDefined();
    const securityButton = screen.getByRole('button', { name: /^Security/ });
    expect(securityButton.querySelector('[data-security="true"]')?.getAttribute('data-muted')).toBe('false');
  });

  it('closes with Escape, traps Tab focus, and restores the opener', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open notifications';
    document.body.append(opener); opener.focus();
    const onClose = vi.fn();
    const view = render(NotificationDrawer, { open: true, items: drawerItems, onClose });
    try {
      const drawer = screen.getByRole('dialog');
      await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
      const first = screen.getByRole('button', { name: 'DND' });
      first.focus();
      await fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close notification drawer' }));
      await fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(opener);
    } finally { view.unmount(); opener.remove(); }
  });

});
