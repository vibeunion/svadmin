import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteCommentThread from './LiteCommentThread.svelte';
import LiteInsightCard from './widgets/LiteInsightCard.svelte';
import LiteActivityFeed from './LiteActivityFeed.svelte';
import LiteItemList from './LiteItemList.svelte';
import LiteNotificationCenter from './LiteNotificationCenter.svelte';
import LiteProgress from './LiteProgress.svelte';
import LiteResult from './LiteResult.svelte';
import LiteSkeleton from './LiteSkeleton.svelte';
import LiteSpin from './LiteSpin.svelte';
import LiteStatistic from './LiteStatistic.svelte';
import LiteStatusBadge from './LiteStatusBadge.svelte';
import LiteStatusTabs from './LiteStatusTabs.svelte';
import LiteSteps from './LiteSteps.svelte';
import LiteTimeline from './LiteTimeline.svelte';

afterEach(() => cleanup());

function snippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('Lite data display primitives', () => {
  it('formats statistics with precision, prefix, suffix and trend direction', () => {
    const view = render(LiteStatistic, {
      title: 'Revenue',
      value: 12,
      precision: 2,
      prefix: '$',
      suffix: '/mo',
      trend: 'up',
      trendLabel: 'vs last month',
    });

    expect(view.getByText('Revenue')).toBeTruthy();
    const value = view.container.querySelector('.lite-statistic__value')?.textContent ?? '';
    expect(value).toContain('12.00');
    expect(value).toContain('$');
    expect(value).toContain('/mo');

    const trend = view.container.querySelector('.lite-statistic__trend');
    expect(trend?.getAttribute('data-trend')).toBe('up');
    expect(trend?.textContent).toContain('↑');
    expect(trend?.textContent).toContain('vs last month');
  });

  it('keeps statistics busy while loading and still exposes the value to assistive tech', () => {
    const view = render(LiteStatistic, { value: 987, loading: true });

    expect(view.container.querySelector('.lite-statistic')?.getAttribute('aria-busy')).toBe('true');
    expect(view.container.querySelector('.lite-statistic__skeleton')).toBeTruthy();
    expect(view.container.querySelector('.lite-statistic__sr')?.textContent).toBe('987');
  });

  it('clamps progress values and reports the rounded percentage', () => {
    const view = render(LiteProgress, { value: 150, max: 200, label: 'Upload', tone: 'warning' });

    const progress = view.container.querySelector('progress');
    expect(progress?.getAttribute('value')).toBe('150');
    expect(progress?.getAttribute('max')).toBe('200');
    expect(view.getByText('Upload')).toBeTruthy();
    expect(view.getAllByText('75%').length).toBeGreaterThan(0);
    expect(view.container.querySelector('.lite-progress')?.getAttribute('data-tone')).toBe('warning');

    const clamped = render(LiteProgress, { value: -5, showValue: true });
    expect(clamped.container.querySelector('progress')?.getAttribute('value')).toBe('0');
    expect(clamped.getAllByText('0%').length).toBeGreaterThan(0);
    expect(clamped.container.querySelector('.lite-progress__meta')).toBeTruthy();
  });

  it('hides progress meta when neither label nor value is requested', () => {
    const view = render(LiteProgress, { value: 40, showValue: false });

    expect(view.container.querySelector('.lite-progress__meta')).toBeNull();
    expect(view.container.querySelector('progress')?.textContent).toBe('40%');
  });

  it('derives status badge tone from the status name and honours label overrides', () => {
    const pending = render(LiteStatusBadge, { status: 'pending', label: 'Pending review' });
    expect(pending.container.querySelector('.lite-badge')?.className).toContain('lite-badge-warning');
    expect(pending.container.textContent).toContain('Pending review');

    const linked = render(LiteStatusBadge, {
      status: 'active',
      label: 'Enabled now',
      href: '/lite/accounts/1',
    });
    const anchor = linked.getByRole('link');
    expect(anchor.getAttribute('href')).toBe('/lite/accounts/1');
    expect(anchor.textContent).toContain('Enabled now');
    expect(anchor.querySelector('.lite-badge')?.className).toContain('lite-badge-success');

    const explicit = render(LiteStatusBadge, { status: 'active', tone: 'info' });
    expect(explicit.container.querySelector('.lite-badge')?.className).toContain('lite-badge-info');
  });

  it('marks the active status tab and keeps counts in the link label', () => {
    const view = render(LiteStatusTabs, {
      label: 'Order states',
      tabs: [
        { id: 'open', label: 'Open', href: '/lite/orders?state=open', count: 4, active: true },
        { id: 'closed', label: 'Closed', href: '/lite/orders?state=closed' },
      ],
    });

    const nav = view.getByRole('navigation', { name: 'Order states' });
    const active = nav.querySelector('a[aria-current="page"]');
    expect(active?.textContent).toContain('Open');
    expect(active?.textContent).toContain('4');
    expect(nav.querySelector('a[href="/lite/orders?state=closed"]')).toBeTruthy();
    expect(nav.querySelectorAll('a[aria-current]')).toHaveLength(1);
  });

  it('derives step states from the current index and status', () => {
    const view = render(LiteSteps, {
      current: 1,
      status: 'error',
      direction: 'vertical',
      label: 'Checkout',
      items: [
        { title: 'Cart' },
        { title: 'Payment' },
        { title: 'Review', disabled: true },
        { title: 'Done', href: '/lite/done' },
      ],
    });

    const list = view.getByRole('list', { name: 'Checkout' });
    expect(list.getAttribute('data-direction')).toBe('vertical');
    const states = Array.from(list.querySelectorAll('li')).map((item) =>
      item.getAttribute('data-status'),
    );
    expect(states).toEqual(['finish', 'error', 'wait', 'wait']);
    expect(list.querySelectorAll('li')[0]?.textContent).toContain('✓');
    expect(list.querySelectorAll('li')[1]?.textContent).toContain('!');
    expect(list.querySelector('a[href="/lite/done"]')).toBeTruthy();
    expect(list.querySelectorAll('li')[2]?.getAttribute('data-disabled')).toBe('true');
    expect(list.querySelectorAll('li')[2]?.querySelector('a')).toBeNull();
  });

  it('renders timeline entries with tone, active marker and timestamps', () => {
    const view = render(LiteTimeline, {
      label: 'Activity',
      items: [
        { id: '1', title: 'Created', time: '09:00', description: 'by Ada', tone: 'success' },
        { id: '2', title: 'Approved', active: true },
      ],
    });

    const list = view.getByRole('list', { name: 'Activity' });
    const entries = Array.from(list.querySelectorAll('li'));
    expect(entries[0]?.getAttribute('data-tone')).toBe('success');
    expect(entries[0]?.textContent).toContain('09:00');
    expect(entries[0]?.textContent).toContain('by Ada');
    expect(entries[1]?.getAttribute('data-active')).toBe('true');
    expect(entries[1]?.getAttribute('data-tone')).toBe('neutral');
  });

  it('renders item lists with links, metadata and an empty state', () => {
    const view = render(LiteItemList, {
      title: 'Recent invoices',
      emptyText: 'No invoices yet',
      items: [
        { id: 'inv-1', title: 'INV-1', href: '/lite/invoices/1', meta: '$120', description: 'Paid' },
        { id: 'inv-2', title: 'INV-2' },
      ],
    });

    expect(view.getByRole('heading', { name: 'Recent invoices' })).toBeTruthy();
    expect(view.getByRole('link', { name: 'INV-1' }).getAttribute('href')).toBe('/lite/invoices/1');
    expect(view.getByText('$120')).toBeTruthy();
    expect(view.getByText('Paid')).toBeTruthy();
    expect(view.getByText('INV-2').tagName).toBe('STRONG');

    const empty = render(LiteItemList, { items: [], emptyText: 'No invoices yet' });
    expect(empty.getByText('No invoices yet')).toBeTruthy();
    expect(empty.container.querySelector('ul')).toBeNull();
  });

  it('renders notification state, tone and bulk action', () => {
    const view = render(LiteNotificationCenter, {
      title: 'Inbox',
      markAllHref: '/lite/notifications/read-all',
      emptyText: 'Nothing new',
      items: [
        { id: 'n1', title: 'Invoice overdue', href: '/lite/invoices/1', tone: 'danger', time: '2h' },
        { id: 'n2', title: 'Imported', read: true },
      ],
    });

    expect(view.getByRole('heading', { name: 'Inbox' })).toBeTruthy();
    expect(view.getByRole('link', { name: 'Mark all read' }).getAttribute('href')).toBe(
      '/lite/notifications/read-all',
    );
    const items = Array.from(view.container.querySelectorAll('li'));
    expect(items[0]?.getAttribute('data-tone')).toBe('danger');
    expect(items[0]?.querySelector('a')?.getAttribute('href')).toBe('/lite/invoices/1');
    expect(items[0]?.querySelector('time')?.textContent).toBe('2h');
    expect(items[1]?.getAttribute('data-read')).toBe('true');

    const empty = render(LiteNotificationCenter, { title: 'Inbox', items: [], emptyText: 'Nothing new' });
    expect(empty.getByText('Nothing new')).toBeTruthy();
  });

  it('renders comment threads with replies, initials and a reply form', () => {
    const view = render(LiteCommentThread, {
      label: 'Discussion',
      action: '/lite/tickets/1/comments',
      name: 'comment',
      emptyText: 'No comments',
      comments: [
        {
          id: 'c1',
          author: 'Ada',
          content: 'Looks good',
          time: '10:00',
          replies: [{ id: 'r1', author: 'Lin', content: 'Agreed' }],
        },
      ],
    });

    const section = view.getByRole('region', { name: 'Discussion' });
    expect(Array.from(section.querySelectorAll('.lite-comments__avatar')).map((node) => node.textContent)).toEqual(['A']);
    expect(view.getByText('Looks good')).toBeTruthy();
    expect(view.getByText('Agreed')).toBeTruthy();

    const form = view.container.querySelector('form');
    expect(form?.getAttribute('method')).toBe('POST');
    expect(form?.getAttribute('action')).toBe('/lite/tickets/1/comments');
    expect(view.container.querySelector('textarea')?.getAttribute('name')).toBe('comment');

    const empty = render(LiteCommentThread, { comments: [], emptyText: 'No comments' });
    expect(empty.getByText('No comments')).toBeTruthy();
    expect(empty.container.querySelector('ol.lite-comments__list')).toBeNull();
  });

  it('renders skeleton lines, circle mode and its screen-reader label', () => {
    const view = render(LiteSkeleton, { lines: 3, width: '80%', height: '8px', label: 'Loading rows' });

    const status = view.getByRole('status', { name: 'Loading rows' });
    expect(status.getAttribute('aria-busy')).toBe('true');
    const lines = Array.from(status.querySelectorAll('.lite-skeleton__line'));
    expect(lines).toHaveLength(3);
    expect(lines[2]?.getAttribute('style')).toMatch(/65%/);
    expect(lines[0]?.getAttribute('style')).toMatch(/height:\s*8px/);

    const circle = render(LiteSkeleton, { circle: true, label: 'Loading avatar' });
    expect(circle.container.querySelector('.lite-skeleton__circle')).toBeTruthy();
    expect(circle.container.querySelector('.lite-skeleton__line')).toBeNull();
  });

  it('keeps spin busy state separate from its children', () => {
    const idle = render(LiteSpin, { spinning: false, children: snippet('<p>Ready content</p>') });
    expect(idle.container.querySelector('.lite-spin')?.getAttribute('aria-busy')).toBeNull();
    expect(idle.getByText('Ready content')).toBeTruthy();
    expect(idle.queryByRole('status')).toBeNull();

    const busy = render(LiteSpin, { spinning: true, label: 'Saving', children: snippet('<p>Ready content</p>') });
    expect(busy.container.querySelector('.lite-spin')?.getAttribute('aria-busy')).toBe('true');
    expect(busy.getByRole('status', { name: 'Saving' })).toBeTruthy();
    expect(busy.getAllByText('Ready content').length).toBeGreaterThan(0);
  });

  it('renders result status, actions and custom content', () => {
    const view = render(LiteResult, {
      status: 'error',
      title: 'Payment failed',
      description: 'Try another card',
      actionHref: '/lite/retry',
      secondaryHref: '/lite/orders',
      secondaryLabel: 'Orders',
      children: snippet('<p>Reference: TX-9</p>'),
    });

    const status = view.getByRole('status');
    expect(status.getAttribute('data-status')).toBe('error');
    expect(view.getByRole('heading', { name: 'Payment failed' })).toBeTruthy();
    expect(view.getByText('Try another card')).toBeTruthy();
    expect(view.getByText('Reference: TX-9')).toBeTruthy();
    expect(view.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe('/lite/retry');
    expect(view.getByRole('link', { name: 'Orders' }).getAttribute('href')).toBe('/lite/orders');
  });
});

describe('Lite rich content display surfaces', () => {
  it('renders insight content as server-side Markdown with safe links', () => {
    const view = render(LiteInsightCard, {
      title: 'Revenue insight',
      content: [
        '## Weekly change',
        '',
        '- **+12%** from renewals',
        '- see [report](https://example.test/report)',
        '',
        '```ts',
        'const delta = 12;',
        '```',
      ].join('\n'),
    });

    expect(view.getByText('Revenue insight')).toBeTruthy();
    const content = view.container.querySelector('.lite-insight-content');
    expect(content?.querySelector('h2')?.textContent).toBe('Weekly change');
    expect(content?.querySelectorAll('li')).toHaveLength(2);
    expect(content?.querySelector('strong')?.textContent).toBe('+12%');
    expect(content?.querySelector('a')?.getAttribute('href')).toBe('https://example.test/report');
    expect(content?.querySelector('pre code')?.textContent).toContain('const delta = 12;');
  });

  it('never lets raw HTML through the insight card', () => {
    const view = render(LiteInsightCard, {
      content: 'Plain sentence about **markup** <script>alert(1)</script>',
    });
    const content = view.container.querySelector('.lite-insight-content');

    // A value that contains HTML-shaped tags takes the sanitizer path, so the
    // script is deleted with its content and Markdown syntax stays literal.
    expect(view.container.querySelector('script')).toBeNull();
    expect(content?.innerHTML).not.toContain('<script');
    expect(content?.textContent).toContain('**markup**');
    expect(content?.textContent).toContain('Plain sentence about');
  });

  it('keeps comment bodies literal by default and renders them on request', () => {
    const comments = [
      { id: 'c1', author: 'Ada', content: '**bold** note', replies: [{ id: 'r1', author: 'Lin', content: '*reply*' }] },
    ];

    const literal = render(LiteCommentThread, { comments });
    expect(literal.container.querySelector('.lite-comments__rich')).toBeNull();
    expect(literal.getByText('**bold** note')).toBeTruthy();

    const rich = render(LiteCommentThread, { comments, richContent: true });
    const body = rich.container.querySelector('.lite-comments__rich');
    expect(body?.querySelector('strong')?.textContent).toBe('bold');
    expect(body?.querySelector('em')?.textContent ?? rich.container.querySelector('em')?.textContent).toBe('reply');
  });
});

describe('Lite opt-in rich text lists', () => {
  it('keeps notification descriptions literal by default and renders them on request', () => {
    const items = [
      { id: 'n1', title: 'Invoice overdue', description: '**Urgent** — [open](/lite/invoices/1)' },
    ];

    const literal = render(LiteNotificationCenter, { items });
    expect(literal.container.querySelector('.lite-notification-center__rich')).toBeNull();
    expect(literal.getByText('**Urgent** — [open](/lite/invoices/1)')).toBeTruthy();

    const rich = render(LiteNotificationCenter, { items, richContent: true });
    const body = rich.container.querySelector('.lite-notification-center__rich');
    expect(body?.querySelector('strong')?.textContent).toBe('Urgent');
    expect(body?.querySelector('a')?.getAttribute('href')).toBe('/lite/invoices/1');
  });

  it('keeps activity notes literal by default and renders them on request', () => {
    const activities = [
      { id: 'a1', user: { name: 'Ada' }, action: 'approved', timestamp: '09:00', comment: 'LGTM *ship it*' },
    ];

    const literal = render(LiteActivityFeed, { activities });
    expect(literal.container.querySelector('.lite-activity-rich')).toBeNull();
    expect(literal.getByText('LGTM *ship it*')).toBeTruthy();

    const rich = render(LiteActivityFeed, { activities, richContent: true });
    expect(rich.container.querySelector('.lite-activity-rich em')?.textContent).toBe('ship it');
  });

  it('sanitizes rich list content instead of trusting it', () => {
    const items = [{ id: 'n1', title: 'Ping', description: '<img src=x onerror="alert(1)">ok' }];
    const view = render(LiteNotificationCenter, { items, richContent: true });

    expect(view.container.querySelector('[onerror]')).toBeNull();
    expect(view.container.querySelector('.lite-notification-center__rich')?.textContent).toContain('ok');
  });
});
