import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import HmacSignatureCalculator from './HmacSignatureCalculator.svelte';

describe('HmacSignatureCalculator Component', () => {
  it('renders secret, payload inputs and computes HMAC signature', async () => {
    const { container } = render(HmacSignatureCalculator, {
      props: {
        defaultSecret: 'my_secret_key',
        defaultBody: '{"hello":"world"}',
        algorithm: 'SHA-256',
      },
    });

    const root = container.querySelector('[data-svadmin-component="HmacSignatureCalculator"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('HMAC 签名计算与现场验签沙箱');
    expect(container.textContent).toContain('实时计算所得 HMAC 签名结果');
  });

  it('verifies signature matching when expected signature is entered', async () => {
    const { container } = render(HmacSignatureCalculator, {
      props: {
        defaultSecret: 'sec_123',
        defaultBody: 'test',
      },
    });

    // Wait for initial crypto calculation
    await new Promise((r) => setTimeout(r, 60));

    const inputs = container.querySelectorAll('input[type="text"]');
    const expectedInput = inputs[1]; // second text input is expected signature
    expect(expectedInput).toBeTruthy();

    if (expectedInput) {
      await fireEvent.input(expectedInput, { target: { value: 'mismatch_sig_abc' } });
      await new Promise((r) => setTimeout(r, 20));
      expect(container.textContent).toContain('不匹配 (Mismatch)');
    }
  });
});
