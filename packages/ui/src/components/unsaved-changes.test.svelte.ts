import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from './useUnsavedChanges.svelte.js';
import UnsavedChangesGuard from './UnsavedChangesGuard.svelte';

describe('useUnsavedChanges', () => {
  it('manages dirty state and triggers beforeunload warning', () => {
    const guard = useUnsavedChanges({ isDirty: false });
    expect(guard.isDirty).toBe(false);
    expect(guard.isBlocked).toBe(false);

    guard.setDirty(true);
    expect(guard.isDirty).toBe(true);

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);
    expect(guard.isDirty).toBe(true);

    guard.destroy();
  });

  it('handles proceed and cancel callbacks', () => {
    const onLeaveMock = vi.fn();
    const onStayMock = vi.fn();

    const guard = useUnsavedChanges({
      isDirty: true,
      onLeave: onLeaveMock,
      onStay: onStayMock,
    });

    guard.setBlocked(true);
    expect(guard.isBlocked).toBe(true);

    guard.cancel();
    expect(guard.isBlocked).toBe(false);
    expect(onStayMock).toHaveBeenCalled();

    guard.setBlocked(true);
    guard.proceed();
    expect(guard.isBlocked).toBe(false);
    expect(guard.isDirty).toBe(false);
    expect(onLeaveMock).toHaveBeenCalled();

    guard.destroy();
  });

  it('does not prompt again after proceeding with callback-based dirty state', async () => {
    const guard = useUnsavedChanges({ isDirty: () => true });
    guard.proceed();

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    guard.destroy();
  });

  it('ignores modified link clicks while dirty', () => {
    const guard = useUnsavedChanges({ isDirty: true });
    const link = document.createElement('a');
    link.href = '/dashboard/other';
    document.body.appendChild(link);

    fireEvent.click(link, { metaKey: true });
    expect(guard.isBlocked).toBe(false);

    link.remove();
    guard.destroy();
  });
});

describe('UnsavedChangesGuard', () => {
  it('renders guard container with component data attribute', () => {
    const { container } = render(UnsavedChangesGuard, {
      props: {
        isDirty: true,
        title: 'Unsaved Form Data',
        message: 'Modifications will be discarded if you navigate away.',
      },
    });

    const root = container.querySelector('[data-svadmin-component="UnsavedChangesGuard"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-dirty')).toBe('true');
  });

  it('intercepts link clicks when dirty and displays alertdialog', async () => {
    const onleaveMock = vi.fn();
    const onstayMock = vi.fn();

    const { container } = render(UnsavedChangesGuard, {
      props: {
        isDirty: true,
        title: 'Discard Changes?',
        message: 'All form edits will be lost.',
        stayText: 'Keep Editing',
        leaveText: 'Discard Now',
        onleave: onleaveMock,
        onstay: onstayMock,
      },
    });

    // Create a mock link inside document and click it
    const link = document.createElement('a');
    link.href = '/dashboard/settings';
    link.textContent = 'Settings Page';
    container.appendChild(link);

    await fireEvent.click(link);

    // Alert dialog should now appear
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).not.toBeNull();
    expect(container.textContent).toContain('Discard Changes?');
    expect(container.textContent).toContain('All form edits will be lost.');

    // Click stay button
    const stayBtn = screen.getByText('Keep Editing');
    await fireEvent.click(stayBtn);
    expect(onstayMock).toHaveBeenCalled();
  });
});
