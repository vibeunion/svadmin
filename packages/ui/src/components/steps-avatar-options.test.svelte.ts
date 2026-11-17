import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Steps from './Steps.svelte';
import Avatar from './ui/avatar/avatar.svelte';
import PresenceAvatarGroup from './PresenceAvatarGroup.svelte';

describe('Steps subTitle and size options', () => {
  it('renders subTitle and subtitle in the step title', () => {
    const { container } = render(Steps, {
      props: {
        current: 1,
        items: [
          { title: 'Step 1', subTitle: 'Done', description: 'First step description' },
          { title: 'Step 2', subtitle: 'Pending', description: 'Second step description' },
          { title: 'Step 3' },
        ],
      },
    });

    const subtitles = container.querySelectorAll('.svadmin-steps__subtitle');
    expect(subtitles.length).toBe(2);
    expect(subtitles[0].textContent?.trim()).toBe('Done');
    expect(subtitles[1].textContent?.trim()).toBe('Pending');
  });

  it('supports size="mini" and size="small"', () => {
    const { container } = render(Steps, {
      props: {
        size: 'mini',
        items: [{ title: 'First' }, { title: 'Second' }],
      },
    });
    const steps = container.querySelector('.svadmin-steps');
    expect(steps?.getAttribute('data-size')).toBe('mini');
  });
});

describe('Avatar size options and numeric size', () => {
  it('supports mini, small, and large size aliases', () => {
    const { container: miniContainer } = render(Avatar, {
      props: { size: 'mini', fallback: 'A' },
    });
    const mini = miniContainer.querySelector('.svadmin-avatar');
    expect(mini?.getAttribute('data-size')).toBe('mini');
    expect(mini?.className).toContain('svadmin-avatar-size--mini');

    const { container: smallContainer } = render(Avatar, {
      props: { size: 'small', fallback: 'B' },
    });
    const small = smallContainer.querySelector('.svadmin-avatar');
    expect(small?.getAttribute('data-size')).toBe('small');
    expect(small?.className).toContain('svadmin-avatar-size--sm');

    const { container: largeContainer } = render(Avatar, {
      props: { size: 'large', fallback: 'C' },
    });
    const large = largeContainer.querySelector('.svadmin-avatar');
    expect(large?.getAttribute('data-size')).toBe('large');
    expect(large?.className).toContain('svadmin-avatar-size--lg');
  });

  it('supports numeric size with inline pixel styles and auto font size', () => {
    const { container } = render(Avatar, {
      props: { size: 36, fallback: 'D' },
    });
    const avatar = container.querySelector('.svadmin-avatar') as HTMLElement;
    expect(avatar.getAttribute('data-size')).toBe('custom');
    expect(avatar.style.width).toBe('36px');
    expect(avatar.style.height).toBe('36px');
    expect(avatar.style.fontSize).toBe('18px');
  });
});

describe('PresenceAvatarGroup size aliases', () => {
  it('accepts mini and small size aliases without throwing', () => {
    const users = [
      { id: '1', name: 'Alice', status: 'online' as const },
      { id: '2', name: 'Bob', status: 'idle' as const },
    ];
    const { container } = render(PresenceAvatarGroup, {
      props: { users, size: 'small' },
    });
    const avatarButtons = container.querySelectorAll('[data-svadmin-presence-user]');
    expect(avatarButtons.length).toBe(2);
  });
});
