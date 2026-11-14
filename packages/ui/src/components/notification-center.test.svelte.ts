import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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
    const { container } = render(NotificationDrawer, {
      open: true,
      items: drawerItems,
    });
    const drawer = container.querySelector('[data-svadmin-component="NotificationDrawer"]');
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
});
