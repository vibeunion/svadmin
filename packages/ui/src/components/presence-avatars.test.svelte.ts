import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PresenceAvatarGroup, { type PresenceUser } from './PresenceAvatarGroup.svelte';

describe('PresenceAvatarGroup Component', () => {
  const users: PresenceUser[] = [
    { id: 'u1', name: 'Alice Guo', role: 'Architect', status: 'editing' },
    { id: 'u2', name: 'Bob Smith', role: 'Developer', status: 'viewing' },
    { id: 'u3', name: 'Charlie Liu', role: 'Product Owner', status: 'idle' },
    { id: 'u4', name: 'Diana Prince', role: 'Tester' },
    { id: 'u5', name: 'Evan Wright', role: 'Viewer' },
  ];

  it('renders visible users with initials and status indicators', () => {
    const { container } = render(PresenceAvatarGroup, {
      props: {
        users,
        maxCount: 3,
      },
    });

    const root = container.querySelector('[data-svadmin-component="PresenceAvatarGroup"]');
    expect(root).not.toBeNull();

    // 检查前 3 位可见用户
    expect(container.textContent).toContain('AG');
    expect(container.textContent).toContain('BS');
    expect(container.textContent).toContain('CL');

    // 检查折叠徽标 +2
    const overflow = container.querySelector('[data-svadmin-presence-overflow="2"]');
    expect(overflow).not.toBeNull();
    expect(overflow?.textContent).toContain('+2');
  });

  it('triggers onuserclick when clicking on a user avatar', async () => {
    const onuserclickMock = vi.fn();
    const { container } = render(PresenceAvatarGroup, {
      props: {
        users,
        onuserclick: onuserclickMock,
      },
    });

    const userBtn = container.querySelector('[data-svadmin-presence-user="u1"]');
    expect(userBtn).not.toBeNull();
    if (userBtn) {
      await fireEvent.click(userBtn);
      expect(onuserclickMock).toHaveBeenCalledWith(users[0]);
    }
  });
});
