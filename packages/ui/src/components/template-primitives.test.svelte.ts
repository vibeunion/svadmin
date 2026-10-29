import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Calendar from './Calendar.svelte';
import Carousel from './Carousel.svelte';
import Collapse from './Collapse.svelte';
import CommentThread from './CommentThread.svelte';
import NotificationCenter from './NotificationCenter.svelte';

afterEach(() => cleanup());

describe('template primitives', () => {
  it('renders a calendar and moves between months', async () => {
    render(Calendar, { props: { value: '2026-10-15', locale: 'en-US', events: [{ id: '1', date: '2026-10-15', label: 'Review' }] } });
    expect(screen.getByRole('button', { name: '2026-10-15' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('region', { name: /November 2026/i })).toBeTruthy();
  });

  it('navigates calendar years and dates from the keyboard', async () => {
    render(Calendar, { props: { value: '2026-10-15', locale: 'en-US' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByRole('region', { name: /October 2027/i })).toBeTruthy();
    const selected = screen.getByRole('button', { name: '2027-10-15' });
    selected.focus();
    await fireEvent.keyDown(selected, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2027-10-16' }));
    await fireEvent.keyDown(screen.getByRole('button', { name: '2027-10-16' }), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2027-10-23' }));
  });

  it('renders carousel controls and switches slides', async () => {
    render(Carousel, { props: { count: 2 } });
    expect(screen.getByRole('tab', { name: 'Go to slide 1' }).getAttribute('aria-selected')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('tab', { name: 'Go to slide 2' }).getAttribute('aria-selected')).toBe('true');
  });

  it('expands and collapses controlled content', async () => {
    const content = createRawSnippet(() => ({ render: () => '<span>Body</span>' }));
    render(Collapse, {
      props: { items: [{ id: 'one', title: 'One', content }] },
    });
    const trigger = screen.getByRole('button', { name: /One/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('supports borderless, left icon, lazyload, and destroy-on-hide', async () => {
    const content = createRawSnippet(() => ({ render: () => '<span>Body</span>' }));
    const view = render(Collapse, {
      props: {
        bordered: false,
        expandIconPosition: 'left',
        lazyload: true,
        destroyOnHide: true,
        items: [{ id: 'one', title: 'One', content }],
      },
    });
    expect(view.container.querySelector('[data-bordered="false"]')).toBeTruthy();
    expect(view.container.querySelector('[data-expand-icon-position="left"]')).toBeTruthy();
    expect(screen.queryByText('Body')).toBeNull();

    const trigger = screen.getByRole('button', { name: /One/ });
    await fireEvent.click(trigger);
    expect(await screen.findByText('Body')).toBeTruthy();

    await fireEvent.click(trigger);
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('renders an empty comment state and unread notification trigger', () => {
    render(CommentThread, { props: { comments: [] } });
    expect(screen.getByText('No comments yet')).toBeTruthy();
    render(NotificationCenter, { props: { items: [{ id: 'n1', title: 'New task' }] } });
    expect(screen.getByRole('button', { name: /Notifications, 1 unread/ })).toBeTruthy();
  });
});
