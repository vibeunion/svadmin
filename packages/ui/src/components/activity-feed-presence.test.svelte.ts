import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ActivityFeed from './ActivityFeed.svelte';
import PresenceAvatarGroup from './PresenceAvatarGroup.svelte';

describe('ActivityFeed and PresenceAvatarGroup', () => {
  it('renders ActivityFeed items and timeline', () => {
    const activities = [
      { id: '1', user: { name: 'Alice' }, action: 'submitted invoice', timestamp: '10:30 AM' },
    ];

    const view = render(ActivityFeed, {
      activities,
    });

    expect(view.container.textContent).toContain('Alice');
    expect(view.container.textContent).toContain('submitted invoice');
  });

  it('renders PresenceAvatarGroup with user avatars', () => {
    const users = [
      { id: '1', name: 'Bob Smith', status: 'online' as const },
      { id: '2', name: 'Carol Danvers', status: 'editing' as const },
    ];

    const view = render(PresenceAvatarGroup, {
      users,
      label: 'Currently editing',
    });

    expect(view.container.textContent).toContain('Currently editing');
    expect(view.container.textContent).toContain('BS');
    expect(view.container.textContent).toContain('CD');
  });
});
