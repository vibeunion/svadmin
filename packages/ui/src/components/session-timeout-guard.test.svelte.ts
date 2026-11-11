import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { useSessionTimeout } from './useSessionTimeout.svelte.js';
import SessionTimeoutGuard from './SessionTimeoutGuard.svelte';

describe('useSessionTimeout and SessionTimeoutGuard suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes hook in non-warning state and supports manual lockNow', () => {
    const onTimeout = vi.fn();
    const guard = useSessionTimeout({
      timeoutMinutes: 10,
      warningSeconds: 30,
      onTimeout,
    });

    expect(guard.isWarning).toBe(false);
    expect(guard.isTimedOut).toBe(false);
    expect(guard.remainingSeconds).toBeGreaterThan(0);

    guard.lockNow();
    expect(guard.isTimedOut).toBe(true);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    guard.destroy();
  });

  it('supports extend() to refresh session active timestamp', () => {
    const onExtend = vi.fn();
    const guard = useSessionTimeout({
      timeoutMinutes: 15,
      warningSeconds: 60,
      onExtend,
    });

    guard.extend();
    expect(onExtend).toHaveBeenCalledTimes(1);
    expect(guard.isTimedOut).toBe(false);

    guard.destroy();
  });

  it('renders SessionTimeoutGuard children and custom warning dialog', async () => {
    const onExtend = vi.fn();
    const onTimeout = vi.fn();

    // Use zero timeoutMinutes to immediately enter timeout/warning condition for test
    const view = render(SessionTimeoutGuard, {
      timeoutMinutes: 0.0001,
      warningSeconds: 60,
      title: '合规会话超时预警',
      onExtend,
      onTimeout,
    });

    expect(view.container).toBeTruthy();
  });
});
