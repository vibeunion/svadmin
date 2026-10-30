import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteAffix from './LiteAffix.svelte';
import LiteAnchor from './LiteAnchor.svelte';
import LiteAutoComplete from './LiteAutoComplete.svelte';
import LiteBackTop from './LiteBackTop.svelte';
import LiteCalendar from './LiteCalendar.svelte';
import LiteCarousel from './LiteCarousel.svelte';
import LiteCollapse from './LiteCollapse.svelte';
import LiteCountdown from './LiteCountdown.svelte';
import LiteDetailDrawer from './LiteDetailDrawer.svelte';
import LiteFloatButton from './LiteFloatButton.svelte';
import LiteGrid from './LiteGrid.svelte';
import LiteImagePreview from './LiteImagePreview.svelte';
import LiteLink from './LiteLink.svelte';
import LiteMenu from './LiteMenu.svelte';
import LiteOtpInput from './LiteOtpInput.svelte';
import LitePageHeader from './LitePageHeader.svelte';
import LitePopconfirm from './LitePopconfirm.svelte';
import LiteResizeBox from './LiteResizeBox.svelte';
import LiteRowActions from './LiteRowActions.svelte';
import LiteSpace from './LiteSpace.svelte';
import LiteTour from './LiteTour.svelte';
import LiteTree from './LiteTree.svelte';
import LiteTwoFactorStepper from './LiteTwoFactorStepper.svelte';
import LiteVideoPlayer from './LiteVideoPlayer.svelte';

afterEach(() => cleanup());

function snippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('Lite navigation primitives', () => {
  it('exposes menu roles, selection, badges and nested groups', () => {
    const view = render(LiteMenu, {
      mode: 'horizontal',
      selected: 'orders',
      label: 'Main',
      items: [
        { id: 'orders', label: 'Orders', href: '/lite/orders', badge: 3 },
        { id: 'reports', label: 'Reports', href: '/lite/reports', children: [{ id: 'daily', label: 'Daily', href: '/lite/reports/daily' }] },
        { id: 'billing', label: 'Billing', disabled: true },
      ],
    });

    const nav = view.getByRole('navigation', { name: 'Main' });
    expect(nav.getAttribute('data-mode')).toBe('horizontal');
    expect(nav.querySelector('ul')?.getAttribute('role')).toBe('menu');

    const current = nav.querySelector('a[aria-current="page"]');
    expect(current?.textContent).toContain('Orders');
    expect(current?.textContent).toContain('3');

    const nested = nav.querySelector('ul ul');
    expect(nested?.getAttribute('role')).toBe('group');
    expect(nested?.querySelector('a[href="/lite/reports/daily"]')).toBeTruthy();

    const disabled = nav.querySelector('li[data-disabled="true"]');
    expect(disabled?.querySelector('[role="menuitem"]')?.getAttribute('aria-disabled')).toBe('true');
    expect(disabled?.querySelector('a')).toBeNull();
  });

  it('renders anchor links with level indentation', () => {
    const view = render(LiteAnchor, {
      label: 'Contents',
      items: [
        { id: 'intro', label: 'Intro' },
        { id: 'usage', label: 'Usage', level: 2 },
      ],
    });

    const nav = view.getByRole('navigation', { name: 'Contents' });
    expect(nav.querySelector('.lite-anchor__title')?.textContent).toBe('Contents');
    expect(nav.querySelector('a[href="#intro"]')?.textContent).toBe('Intro');
    const items = Array.from(nav.querySelectorAll('li'));
    expect(items[0]?.getAttribute('style')).toMatch(/padding-left:\s*0px/);
    expect(items[1]?.getAttribute('style')).toMatch(/padding-left:\s*12px/);
  });

  it('renders tree semantics with selection, disabled nodes and children', () => {
    const view = render(LiteTree, {
      label: 'Folders',
      selected: 'inbox',
      nodes: [
        {
          id: 'root',
          label: 'Root',
          children: [
            { id: 'inbox', label: 'Inbox', href: '/lite/mail/inbox' },
            { id: 'archive', label: 'Archive', disabled: true },
          ],
        },
      ],
    });

    const nav = view.getByRole('navigation', { name: 'Folders' });
    expect(nav.querySelector('ul')?.getAttribute('role')).toBe('tree');
    const items = Array.from(nav.querySelectorAll('[role="treeitem"]'));
    expect(items).toHaveLength(3);
    expect(items[1]?.getAttribute('aria-selected')).toBe('true');
    expect(items[1]?.querySelector('a')?.className).toContain('active');
    expect(items[2]?.getAttribute('aria-disabled')).toBe('true');
    expect(nav.querySelector('ul ul')?.getAttribute('role')).toBe('group');
  });

  it('renders page header hierarchy with actions', () => {
    const view = render(LitePageHeader, {
      eyebrow: 'Operations',
      title: 'Orders',
      description: 'All orders across regions',
      actions: snippet('<a class="lite-btn" href="/lite/orders/new">New order</a>'),
    });

    expect(view.getByText('Operations')).toBeTruthy();
    expect(view.getByRole('heading', { level: 1, name: 'Orders' })).toBeTruthy();
    expect(view.getByText('All orders across regions')).toBeTruthy();
    expect(view.getByRole('link', { name: 'New order' }).getAttribute('href')).toBe('/lite/orders/new');
  });

  it('marks external and disabled links correctly', () => {
    const external = render(LiteLink, {
      href: 'https://example.com',
      external: true,
      underline: true,
      children: snippet('Docs'),
    });
    const link = external.getByRole('link', { name: 'Docs' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
    expect(link.className).toContain('lite-link-underline');

    const disabled = render(LiteLink, {
      href: '/lite/blocked',
      disabled: true,
      children: snippet('Blocked'),
    });
    expect(disabled.container.querySelector('a')).toBeNull();
    expect(disabled.getByText('Blocked').getAttribute('aria-disabled')).toBe('true');
  });

  it('renders row actions as links, forms and disabled states', () => {
    const view = render(LiteRowActions, {
      label: 'Row actions',
      actions: [
        { id: 'view', label: 'View', href: '/lite/orders/1' },
        { id: 'delete', label: 'Delete', action: '/lite/orders/1/delete', method: 'POST', danger: true },
        { id: 'edit', label: 'Edit', disabled: true },
      ],
    });

    const group = view.getByRole('group', { name: 'Row actions' });
    expect(group.querySelector('a[href="/lite/orders/1"]')?.textContent).toBe('View');
    const form = group.querySelector('form');
    expect(form?.getAttribute('method')).toBe('POST');
    expect(form?.getAttribute('action')).toBe('/lite/orders/1/delete');
    expect(form?.querySelector('button')?.className).toContain('lite-btn-danger');
    const disabled = Array.from(group.querySelectorAll('[aria-disabled="true"]'));
    expect(disabled.map((node) => node.textContent)).toEqual(['Edit']);
  });

  it('renders back-to-top and float button affordances', () => {
    const backTop = render(LiteBackTop, { href: '#content', label: 'Back to top', thresholdText: 'Top' });
    const anchor = backTop.getByRole('link', { name: 'Back to top' });
    expect(anchor.getAttribute('href')).toBe('#content');
    expect(anchor.textContent).toBe('Top');

    const float = render(LiteFloatButton, {
      props: {
        href: '/lite/support',
        label: 'Support',
        description: 'Chat with us',
        icon: '?',
        badge: 2,
        position: 'bottom-left',
        target: '_blank',
      },
    });
    const control = float.getByRole('link', { name: 'Support' });
    expect(control.getAttribute('href')).toBe('/lite/support');
    expect(control.getAttribute('target')).toBe('_blank');
    expect(control.textContent).toContain('Chat with us');
    expect(control.querySelector('.lite-badge')?.textContent).toBe('2');
    expect(float.container.querySelector('.lite-float-button')?.getAttribute('data-position')).toBe('bottom-left');

    const passive = render(LiteFloatButton, { label: 'Help' });
    expect(passive.getByRole('note', { name: 'Help' })).toBeTruthy();
  });

  it('keeps layout helpers declarative through data attributes', () => {
    const affix = render(LiteAffix, {
      top: 24,
      zIndex: 40,
      label: 'Sticky toolbar',
      children: snippet('<button type="button">Save</button>'),
    });
    const affixBox = affix.getByLabelText('Sticky toolbar');
    expect(affixBox.getAttribute('style')).toMatch(/top:\s*24px/);
    expect(affixBox.getAttribute('style')).toMatch(/z-index:\s*40/);
    expect(affix.getByRole('button', { name: 'Save' })).toBeTruthy();

    const bottom = render(LiteAffix, { bottom: 8, children: snippet('<span>Footer</span>') });
    expect(bottom.container.querySelector('.lite-affix')?.getAttribute('style')).toMatch(/bottom:\s*8px/);

    const grid = render(LiteGrid, { columns: 9, gap: 'lg', children: snippet('<div>Cell</div>') });
    const gridBox = grid.container.querySelector('.lite-grid');
    expect(gridBox?.getAttribute('data-columns')).toBe('4');
    expect(gridBox?.getAttribute('data-gap')).toBe('lg');

    const space = render(LiteSpace, {
      direction: 'vertical',
      size: 'sm',
      wrap: true,
      children: snippet('<span>A</span><span>B</span>'),
    });
    const spaceBox = space.container.querySelector('.lite-space');
    expect(spaceBox?.getAttribute('data-direction')).toBe('vertical');
    expect(spaceBox?.getAttribute('data-size')).toBe('sm');
    expect(spaceBox?.getAttribute('data-wrap')).toBe('true');

    const resize = render(LiteResizeBox, {
      width: '320px',
      height: '180px',
      minWidth: '200px',
      minHeight: '120px',
      label: 'Resizable panel',
      children: snippet('<p>Panel body</p>'),
    });
    const resizeBox = resize.getByRole('group', { name: 'Resizable panel' });
    expect(resizeBox.getAttribute('style')).toMatch(/width:\s*320px/);
    expect(resizeBox.getAttribute('style')).toMatch(/min-height:\s*120px/);
    expect(resize.getByText('Panel body')).toBeTruthy();
  });

  it('renders drawer and popconfirm targets without client state', () => {
    const drawer = render(LiteDetailDrawer, {
      id: 'order-detail',
      title: 'Order detail',
      description: 'Read-only view',
      open: true,
      closeHref: '#close',
      children: snippet('<p>Total: 120</p>'),
    });
    expect(drawer.getByRole('complementary', { name: 'Order detail' })).toBeTruthy();
    expect(drawer.container.querySelector('.lite-detail-drawer')?.getAttribute('data-open')).toBe('true');
    expect(drawer.getByRole('link', { name: 'Close details' }).getAttribute('href')).toBe('#close');
    expect(drawer.getByText('Total: 120')).toBeTruthy();

    const popconfirm = render(LitePopconfirm, {
      id: 'delete-order',
      title: 'Delete order?',
      description: 'This cannot be undone',
      action: '/lite/orders/1/delete',
      method: 'POST',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    expect(popconfirm.container.querySelector('.lite-popconfirm > a')?.getAttribute('href')).toBe('#delete-order');
    const dialog = popconfirm.getByRole('dialog', { name: 'Delete order?' });
    expect(dialog.textContent).toContain('This cannot be undone');
    expect(dialog.querySelector('form')?.getAttribute('action')).toBe('/lite/orders/1/delete');
    expect(dialog.querySelector('form')?.getAttribute('method')).toBe('POST');
    expect(popconfirm.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('#');

    const linked = render(LitePopconfirm, {
      id: 'export',
      title: 'Export?',
      href: '/lite/export',
      confirmLabel: 'Export',
      cancelLabel: 'Dismiss',
    });
    expect(linked.getByRole('link', { name: 'Export' }).getAttribute('href')).toBe('/lite/export');
  });

  it('renders tours, carousels and image galleries with accessible names', () => {
    const tour = render(LiteTour, {
      title: 'Getting started',
      current: 1,
      dismissHref: '#dismiss',
      label: 'Product tour',
      steps: [
        { title: 'Create', description: 'Add the first record' },
        { title: 'Review', href: '/lite/review' },
      ],
    });
    expect(tour.getByRole('heading', { name: 'Getting started' })).toBeTruthy();
    const steps = Array.from(tour.getByRole('region', { name: 'Product tour' }).querySelectorAll('li'));
    expect(steps[0]?.getAttribute('data-active')).toBeNull();
    expect(steps[1]?.getAttribute('data-active')).toBe('true');
    expect(tour.getByRole('link', { name: 'View step' }).getAttribute('href')).toBe('/lite/review');
    expect(tour.getByRole('link', { name: 'Dismiss tour' })).toBeTruthy();

    const carousel = render(LiteCarousel, { count: 2, label: 'Highlights', id: 'hl' });
    const region = carousel.getByRole('region', { name: 'Highlights' });
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = Array.from(region.querySelectorAll('[aria-roledescription="slide"]'));
    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual(['1 / 2', '2 / 2']);
    expect(slides[0]?.textContent).toContain('Slide 1');
    expect(carousel.getByRole('link', { name: 'Go to slide 2' }).getAttribute('href')).toBe('#hl-2');

    const gallery = render(LiteImagePreview, {
      src: '/shot.png',
      alt: 'Dashboard',
      downloadLabel: 'Download screenshot',
      images: [
        { src: '/a.png', alt: 'Alpha' },
        { src: '/b.png', alt: 'Beta' },
      ],
    });
    expect(gallery.getByRole('group', { name: 'Image gallery' })).toBeTruthy();
    expect(gallery.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual(['Alpha', 'Beta']);
    expect(gallery.getByRole('link', { name: 'Open Alpha' }).getAttribute('href')).toBe('/a.png');
    const download = gallery.getByRole('link', { name: 'Download screenshot' });
    expect(download.getAttribute('href')).toBe('/shot.png');
    expect(download.hasAttribute('download')).toBe(true);
  });

  it('renders calendar days, selection, disabled ranges and events', () => {
    const view = render(LiteCalendar, {
      props: {
        value: '2024-03-15',
        locale: 'en-US',
        weekStartsOn: 1,
        min: '2024-03-10',
        hrefFor: (iso: string) => `/lite/day/${iso}`,
        events: [
          { id: 'e1', date: '2024-03-15', label: 'Sprint review', href: '/lite/reviews/1', tone: 'info' },
          { id: 'e2', date: '2024-03-20', label: 'Retro' },
        ],
      },
    });

    const section = view.getByRole('region', { name: 'March 2024' });
    expect(view.getByRole('heading', { name: 'March 2024' })).toBeTruthy();
    expect(section.querySelectorAll('th')).toHaveLength(7);
    const selected = section.querySelector('td[data-selected="true"]');
    expect(selected?.textContent?.trim()).toBe('15');
    expect(selected?.querySelector('[aria-current="date"]')).toBeTruthy();
    expect(section.querySelector('a[href="/lite/day/2024-03-15"]')).toBeTruthy();

    const disabled = Array.from(section.querySelectorAll('td[data-disabled="true"]'));
    expect(disabled.length).toBeGreaterThan(0);
    expect(disabled.every((cell) => cell.querySelector('a') === null)).toBe(true);

    const events = Array.from(section.querySelectorAll('.lite-calendar__events li'));
    expect(events[0]?.getAttribute('data-tone')).toBe('info');
    expect(events[0]?.querySelector('a')?.getAttribute('href')).toBe('/lite/reviews/1');
    expect(events[1]?.textContent).toContain('Retro');
  });

  it('renders countdown values from a fixed duration', () => {
    const view = render(LiteCountdown, {
      duration: 3661,
      title: 'Session expires in',
      format: 'clock',
      refreshHref: '/lite/session',
    });

    const time = view.container.querySelector('time');
    expect(time?.textContent).toBe('01:01:01');
    expect(view.getByText('Session expires in')).toBeTruthy();
    expect(view.getByRole('link', { name: 'Refresh' }).getAttribute('href')).toBe('/lite/session');

    const finished = render(LiteCountdown, { duration: 0 });
    expect(finished.container.querySelector('.lite-countdown')?.getAttribute('data-finished')).toBe('true');
    expect(finished.container.querySelector('time')?.textContent).toBe('00:00:00');
  });
});

describe('Lite form and media primitives', () => {
  it('wires autocomplete input to its datalist', () => {
    const view = render(LiteAutoComplete, {
      name: 'customer',
      label: 'Customer',
      options: ['Ada', 'Lin'],
      value: 'Ada',
      required: true,
      placeholder: 'Pick a customer',
      disabled: true,
    });

    const input = view.getByLabelText('Customer') as HTMLInputElement;
    expect(input.getAttribute('name')).toBe('customer');
    expect(input.getAttribute('list')).toBe('customer-options');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.placeholder).toBe('Pick a customer');
    expect(view.container.querySelector('datalist#customer-options')?.querySelectorAll('option')).toHaveLength(2);
  });

  it('renders OTP inputs with pattern, length and hint', () => {
    const view = render(LiteOtpInput, {
      name: 'code',
      label: 'Verification code',
      length: 6,
      required: true,
      autocomplete: 'one-time-code',
    });

    const input = view.container.querySelector('input[name="code"]') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('pattern')).toBe('[0-9]{6}');
    expect(input.getAttribute('maxlength')).toBe('6');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('aria-describedby')).toBe('code-hint');
    expect(view.getByText('6-digit code')).toBeTruthy();
    expect(input.required).toBe(true);
  });

  it('composes the two-factor stepper from steps, OTP input and form', () => {
    const view = render(LiteTwoFactorStepper, {
      current: 1,
      action: '/lite/2fa',
      codeName: 'otp',
      title: 'Two-factor authentication',
      submitLabel: 'Verify',
    });

    expect(view.getByRole('heading', { name: 'Two-factor authentication' })).toBeTruthy();
    expect(view.container.querySelectorAll('.lite-steps__item')).toHaveLength(3);
    const otp = view.container.querySelector('input[name="otp"]') as HTMLInputElement;
    expect(otp).toBeTruthy();
    const form = view.container.querySelector('form');
    expect(form?.getAttribute('action')).toBe('/lite/2fa');
    expect(form?.querySelector('button')?.textContent).toBe('Verify');
    expect(view.getByText(/Recovery codes/)).toBeTruthy();
  });

  it('renders collapse items with open and disabled state', () => {
    const view = render(LiteCollapse, {
      label: 'FAQ',
      items: [
        { id: 'q1', title: 'Refunds', description: '30 days', content: 'Full refund', open: true },
        { id: 'q2', title: 'Shipping', content: 'Two days', disabled: true },
      ],
    });

    const group = view.getByRole('group', { name: 'FAQ' });
    const items = Array.from(group.querySelectorAll('.lite-collapse__item'));
    expect(items[0]?.getAttribute('data-open')).toBe('true');
    expect(items[0]?.querySelector('.lite-collapse__trigger')?.getAttribute('href')).toBe('#q1');
    expect(items[0]?.textContent).toContain('30 days');
    expect(group.querySelector('#q1')?.textContent).toBe('Full refund');
    expect(items[1]?.getAttribute('data-disabled')).toBe('true');
  });

  it('renders audio players with tracks and download links', () => {
    const view = render(LiteVideoPlayer, {
      src: '/episode.mp3',
      media: 'audio',
      title: 'Episode 1',
      downloadLabel: 'Download episode',
      tracks: [{ src: '/episode.vtt', kind: 'captions', label: 'English', language: 'en', default: true }],
    });

    const audio = view.container.querySelector('audio');
    expect(audio?.getAttribute('aria-label')).toBe('Episode 1');
    expect(audio?.getAttribute('controls')).not.toBeNull();
    const track = audio?.querySelector('track');
    expect(track?.getAttribute('srclang')).toBe('en');
    expect(track?.getAttribute('src')).toBe('/episode.vtt');
    const downloads = view.getAllByRole('link', { name: 'Download episode' });
    expect(downloads.every((link) => link.getAttribute('href') === '/episode.mp3')).toBe(true);
    expect(downloads.some((link) => link.hasAttribute('download'))).toBe(true);
  });
});