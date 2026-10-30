import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import NotificationHost from './NotificationHost.svelte';
import { clearNotifications, notification } from '../notifications.svelte.js';

afterEach(() => {
  cleanup();
  clearNotifications();
});

describe('NotificationHost', () => {
  it('renders notifications in their requested placement', () => {
    notification.success('Saved', undefined, { placement: 'bottom-left', key: 'saved' });
    notification.warning('Review', undefined, { placement: 'top-right', key: 'review' });
    render(NotificationHost);

    expect(screen.getByLabelText('Notifications').textContent).toContain('Review');
    expect(screen.getByLabelText('Notifications bottom-left').textContent).toContain('Saved');
  });
});
