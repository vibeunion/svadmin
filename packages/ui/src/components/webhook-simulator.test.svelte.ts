import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WebhookSimulator from './WebhookSimulator.svelte';

describe('WebhookSimulator Component', () => {
  it('renders default endpoint, event selector and payload editor', () => {
    const { container } = render(WebhookSimulator, {
      props: {
        defaultEndpoint: 'https://webhook.example.test/receiver',
      },
    });

    const root = container.querySelector('[data-svadmin-component="WebhookSimulator"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('Webhook 投递模拟与回放沙箱');
    expect(container.textContent).toContain('order.payment_succeeded');

    const input = container.querySelector<HTMLInputElement>('#webhook-endpoint');
    expect(input?.value).toBe('https://webhook.example.test/receiver');
  });

  it('triggers ondeliver handler and renders HTTP response status', async () => {
    const onDeliver = vi.fn().mockResolvedValue({
      statusCode: 200,
      durationMs: 95,
      responseBody: '{"received": true}',
    });

    const { container } = render(WebhookSimulator, {
      props: {
        defaultEndpoint: 'https://webhook.example.test/receiver',
        ondeliver: onDeliver,
      },
    });

    const sendBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('发起模拟投递测试')
    );
    expect(sendBtn).toBeTruthy();
    if (sendBtn) {
      await fireEvent.click(sendBtn);
      expect(onDeliver).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain('HTTP 200 OK');
      expect(container.textContent).toContain('{"received": true}');
    }
  });
});
