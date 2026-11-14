import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RateLimitPolicyPanel from './RateLimitPolicyPanel.svelte';

describe('RateLimitPolicyPanel', () => {
  it('renders rate limit parameters and circuit breaker state', () => {
    render(RateLimitPolicyPanel, {
      props: {
        title: 'API 限流熔断与自愈治理看板',
        config: {
          qps: 600,
          burst: 1200,
          circuitBreakerState: 'closed',
          failureRateThreshold: 45,
        },
      },
    });

    expect(screen.getByText('API 限流熔断与自愈治理看板')).toBeInTheDocument();
    expect(screen.getByText('熔断器状态：CLOSED (闭合通行)')).toBeInTheDocument();
    expect(screen.getByText('600 次/秒')).toBeInTheDocument();
    expect(screen.getByText('1200 并发令牌')).toBeInTheDocument();
  });

  it('displays warning style when circuit breaker state is open or half_open', () => {
    render(RateLimitPolicyPanel, {
      props: {
        config: {
          circuitBreakerState: 'open',
        },
      },
    });

    expect(screen.getByText('熔断器状态：OPEN (阻断降级中)')).toBeInTheDocument();
  });

  it('resets circuit breaker state when reset button is clicked', async () => {
    const onreset = vi.fn();

    render(RateLimitPolicyPanel, {
      props: {
        config: {
          circuitBreakerState: 'open',
        },
        onresetCircuitBreaker: onreset,
      },
    });

    const resetBtn = screen.getByRole('button', { name: /复位熔断器状态/ });
    await fireEvent.click(resetBtn);

    expect(onreset).toHaveBeenCalled();
    expect(screen.getByText('熔断器状态：CLOSED (闭合通行)')).toBeInTheDocument();
  });

  it('triggers onsave callback when saving configuration', async () => {
    const onsave = vi.fn();

    render(RateLimitPolicyPanel, {
      props: {
        onsave,
        config: {
          qps: 800,
        },
      },
    });

    const saveBtn = screen.getByRole('button', { name: /保存限流策略/ });
    await fireEvent.click(saveBtn);

    expect(onsave).toHaveBeenCalled();
  });
});
