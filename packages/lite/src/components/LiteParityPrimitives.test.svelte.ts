import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteImage from './LiteImage.svelte';
import LiteVideoPlayer from './LiteVideoPlayer.svelte';
import LiteQRCode from './LiteQRCode.svelte';
import LiteCalendar from './LiteCalendar.svelte';
import LiteCollapse from './LiteCollapse.svelte';
import LiteCommentThread from './LiteCommentThread.svelte';
import LiteMenu from './LiteMenu.svelte';
import LiteSteps from './LiteSteps.svelte';
import LiteTimeline from './LiteTimeline.svelte';
import LiteProgress from './LiteProgress.svelte';
import LiteNotificationCenter from './LiteNotificationCenter.svelte';
import LiteOtpInput from './LiteOtpInput.svelte';
import LitePopconfirm from './LitePopconfirm.svelte';
import LiteStatusBadge from './LiteStatusBadge.svelte';
import LiteRowActions from './LiteRowActions.svelte';
import LiteTwoFactorStepper from './LiteTwoFactorStepper.svelte';
import LiteTour from './LiteTour.svelte';
import LitePageHeader from './LitePageHeader.svelte';
import LiteAreaChart from './widgets/LiteAreaChart.svelte';

afterEach(() => cleanup());

describe('Lite parity primitives', () => {
  it('renders image fallback and link without client handlers', () => {
    const fallback = render(LiteImage, { fallback: 'No preview' });
    expect(fallback.getByRole('img', { name: 'No preview' }).textContent).toBe('No preview');

    const linked = render(LiteImage, { src: '/logo.png', alt: 'Logo', href: '/assets' });
    expect(linked.getByRole('link', { name: 'Open Logo' }).getAttribute('href')).toBe('/assets');
  });

  it('renders native video controls and subtitle tracks', () => {
    const view = render(LiteVideoPlayer, {
      src: '/clip.mp4',
      poster: '/poster.jpg',
      title: 'Demo clip',
      tracks: [{ src: '/captions.vtt', kind: 'captions', label: 'English', language: 'en', default: true }],
    });
    const video = view.container.querySelector('video');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.querySelector('track')?.getAttribute('srclang')).toBe('en');
  });

  it('renders a static QR code with accessible label', () => {
    const view = render(LiteQRCode, { value: 'https://example.com', ariaLabel: 'Example QR' });
    expect(view.getByRole('img', { name: 'Example QR' }).querySelector('path')).toBeTruthy();
  });

  it('renders a month calendar with event links', () => {
    const view = render(LiteCalendar, {
      props: {
        value: '2026-10-30',
        events: [{ id: 'launch', date: '2026-10-30', label: 'Release', href: '/releases/1' }],
        hrefFor: (iso: string) => `/calendar/${iso}`,
      },
    });
    expect(view.container.querySelector('table')).toBeTruthy();
    expect(view.getByRole('link', { name: 'Release' }).getAttribute('href')).toBe('/releases/1');
    expect(view.getAllByRole('link', { name: '30' }).some((link) => link.getAttribute('href') === '/calendar/2026-10-30')).toBe(true);
  });

  it('renders collapse, comments and nested menu semantics', () => {
    const collapse = render(LiteCollapse, {
      items: [{ id: 'details', title: 'Details', content: 'Server rendered body', open: true }],
    });
    expect(collapse.container.querySelector('[data-open]')).toBeTruthy();
expect(collapse.container.querySelector('#details')?.textContent).toBe('Server rendered body');

    const comments = render(LiteCommentThread, {
      comments: [{ id: 'c1', author: 'Ada', content: 'Looks good', replies: [{ id: 'r1', author: 'Lin', content: 'Agreed' }] }],
    });
    expect(comments.getByText('Looks good')).toBeTruthy();
    expect(comments.getByText('Agreed')).toBeTruthy();

    const menu = render(LiteMenu, {
      items: [{ id: 'settings', label: 'Settings', children: [{ id: 'team', label: 'Team', href: '/team' }] }],
    });
    expect(menu.getByRole('menuitem', { name: 'Team' }).getAttribute('href')).toBe('/team');
  });

  it('renders progress steps and timeline states', () => {
    const steps = render(LiteSteps, {
      current: 1,
      status: 'error',
      items: [{ title: 'Account' }, { title: 'Verify' }, { title: 'Finish' }],
    });
    expect(steps.container.querySelector('[data-status="error"]')?.textContent).toContain('Verify');

    const timeline = render(LiteTimeline, {
      items: [{ id: 't1', title: 'Deployed', tone: 'success', active: true }],
    });
    expect(timeline.container.querySelector('[data-tone="success"]')).toBeTruthy();

    const progress = render(LiteProgress, { value: 42, label: 'Upload' });
    expect(progress.container.querySelector('progress')?.getAttribute('value')).toBe('42');
  });

  it('renders notification center, OTP and confirmation forms', () => {
    const notifications = render(LiteNotificationCenter, {
      items: [{ id: 'n1', title: 'Build complete', href: '/builds/1' }],
    });
    expect(notifications.getByRole('link', { name: 'Build complete' })).toBeTruthy();

    const otp = render(LiteOtpInput, { name: 'code', length: 6 });
    expect(otp.container.querySelector('input')?.getAttribute('pattern')).toBe('[0-9]{6}');

    const confirm = render(LitePopconfirm, {
      id: 'delete-1',
      title: 'Delete',
      action: '/items/1/delete',
      confirmLabel: 'Delete item',
    });
    expect(confirm.getByRole('dialog', { name: 'Delete' })).toBeTruthy();
    expect(confirm.getByRole('button', { name: 'Delete item' })).toBeTruthy();
  });

  it('uses a styled destructive badge for failed statuses and preserves explicit tones', () => {
    const failed = render(LiteStatusBadge, { status: 'Failed' });
    expect(failed.container.querySelector('.lite-badge-destructive')?.textContent).toBe('Failed');

    const linked = render(LiteStatusBadge, { status: 'Rejected', href: '/requests/1' });
    expect(linked.getByRole('link', { name: 'Rejected' }).querySelector('.lite-badge-destructive')).toBeTruthy();

    const override = render(LiteStatusBadge, { status: 'Failed', tone: 'warning' });
    expect(override.container.querySelector('.lite-badge-warning')?.textContent).toBe('Failed');
  });

  it('preserves native form submission and OTP autofill attributes', () => {
    const actions = render(LiteRowActions, {
      actions: [{ id: 'archive', label: 'Archive', action: '/items/1/archive', method: 'POST' }],
    });
    expect(actions.container.querySelector('form')?.getAttribute('method')).toBe('POST');
    expect(actions.container.querySelector('form')?.getAttribute('action')).toBe('/items/1/archive');

    const stepper = render(LiteTwoFactorStepper, { action: '/verify', codeName: 'otp' });
    const form = stepper.container.querySelector('form');
    expect(form?.getAttribute('method')).toBe('POST');
    expect(form?.getAttribute('action')).toBe('/verify');
    expect(form?.querySelector('input')?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(form?.querySelector('input')?.getAttribute('name')).toBe('otp');
  });

  it('renders tour and page header content server-side', () => {
    const tour = render(LiteTour, {
      steps: [{ title: 'Open settings', description: 'Choose a resource', href: '/settings' }],
    });
    expect(tour.getByText('Open settings')).toBeTruthy();

    const header = render(LitePageHeader, { title: 'Orders', description: 'All customer orders' });
    expect(header.getByRole('heading', { name: 'Orders' })).toBeTruthy();
  });

  it('renders advanced chart data as a bounded table fallback', () => {
    const view = render(LiteAreaChart, {
      title: 'Revenue',
      data: [{ label: 'Jan', value: 12 }, { label: 'Feb', value: 18 }],
    });
    expect(view.getByRole('heading', { name: 'Revenue' })).toBeTruthy();
    expect(view.container.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});
