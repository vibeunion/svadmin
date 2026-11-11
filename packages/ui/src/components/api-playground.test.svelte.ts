import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ApiPlayground from './ApiPlayground.svelte';

describe('ApiPlayground Component', () => {
  it('renders method selector, url bar and generated cURL preview', () => {
    const { container } = render(ApiPlayground, {
      props: {
        defaultMethod: 'GET',
        defaultUrl: '/api/v1/orders',
      },
    });

    const root = container.querySelector('[data-svadmin-component="ApiPlayground"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('API 快捷调试工作台');
    expect(container.textContent).toContain('curl -X GET "/api/v1/orders"');
  });

  it('triggers onrequest callback and displays formatted response', async () => {
    const onRequest = vi.fn().mockResolvedValue({
      status: 200,
      durationMs: 45,
      sizeBytes: 88,
      data: { status: 'healthy', version: '2.4.0' },
    });

    const { container } = render(ApiPlayground, {
      props: {
        defaultUrl: '/health',
        onrequest: onRequest,
      },
    });

    const sendBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('发送请求')
    );
    expect(sendBtn).toBeTruthy();
    if (sendBtn) {
      await fireEvent.click(sendBtn);
      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain('HTTP 200 OK');
      expect(container.textContent).toContain('healthy');
    }
  });
});
