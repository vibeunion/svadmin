import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearNotifications, closeNotification, getNotifications, notification } from './notifications.svelte.js';

afterEach(() => {
  clearNotifications();
  vi.useRealTimers();
});

describe('notification service', () => {
  it('opens, replaces by key, closes and expires records', () => {
    vi.useFakeTimers();
    const action = vi.fn();
    notification.success('Saved', 'Workspace updated', { key: 'save', duration: 1000, actionLabel: 'Undo', onAction: action });
    expect(getNotifications()).toHaveLength(1);
    expect(getNotifications()[0]).toMatchObject({ title: 'Saved', tone: 'success', description: 'Workspace updated' });

    notification.danger('Save failed', undefined, { key: 'save' });
    expect(getNotifications()).toHaveLength(1);
    expect(getNotifications()[0]?.tone).toBe('danger');

    const active = getNotifications()[0];
    expect(active).toBeDefined();
    closeNotification(active?.id ?? -1);
    expect(getNotifications()).toEqual([]);

    notification.info('Reminder', 'One minute');
    expect(getNotifications()[0]?.duration).toBe(3000);
    vi.advanceTimersByTime(2999);
    expect(getNotifications()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getNotifications()).toEqual([]);
  });
});
