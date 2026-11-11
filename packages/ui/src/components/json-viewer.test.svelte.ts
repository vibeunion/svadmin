import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import JsonViewer from './JsonViewer.svelte';

describe('JsonViewer Component', () => {
  it('renders JSON object with highlighted keys and values', () => {
    const payload = {
      orderId: 'ORD-98213',
      amount: 450.8,
      isPaid: true,
      notes: null,
    };

    const { container } = render(JsonViewer, {
      props: {
        data: payload,
      },
    });

    const root = container.querySelector('[data-svadmin-component="JsonViewer"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('"orderId"');
    expect(container.textContent).toContain('"ORD-98213"');
    expect(container.textContent).toContain('450.8');
    expect(container.textContent).toContain('true');
    expect(container.textContent).toContain('null');
  });

  it('parses valid json string input automatically', () => {
    const jsonStr = '{"service": "auth-api", "status": "healthy", "port": 8080}';

    const { container } = render(JsonViewer, {
      props: {
        data: jsonStr,
      },
    });

    expect(container.textContent).toContain('"service"');
    expect(container.textContent).toContain('"auth-api"');
    expect(container.textContent).toContain('8080');
  });

  it('renders search bar and copy button', () => {
    const { container } = render(JsonViewer, {
      props: {
        data: { a: 1 },
        searchable: true,
        copyable: true,
      },
    });

    const searchInput = container.querySelector('input[type="text"]');
    expect(searchInput).toBeTruthy();
    expect(container.textContent).toContain('复制 JSON');
  });
});
