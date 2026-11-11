import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SensitiveDataMask from './SensitiveDataMask.svelte';

describe('SensitiveDataMask Component', () => {
  it('masks phone number by default', () => {
    const view = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'phone',
    });
    expect(view.container.textContent).toContain('138****5678');
  });

  it('supports mobile alias for phone masking', () => {
    const view = render(SensitiveDataMask, {
      value: '13987654321',
      type: 'mobile',
    });
    expect(view.container.textContent).toContain('139****4321');
  });

  it('masks ID card correctly with idCard alias', () => {
    const view = render(SensitiveDataMask, {
      value: '110101199001011234',
      type: 'idCard',
    });
    expect(view.container.textContent).toContain('110101********1234');
  });

  it('masks bank card correctly with bankCard alias', () => {
    const view = render(SensitiveDataMask, {
      value: '6222021234567890',
      type: 'bankCard',
    });
    expect(view.container.textContent).toContain('6222 **** **** 7890');
  });

  it('masks Chinese and Western names correctly', () => {
    const v1 = render(SensitiveDataMask, {
      value: '张三',
      type: 'name',
    });
    expect(v1.container.textContent).toContain('张*');

    const v2 = render(SensitiveDataMask, {
      value: '诸葛孔明',
      type: 'name',
    });
    expect(v2.container.textContent).toContain('诸**明');

    const v3 = render(SensitiveDataMask, {
      value: 'John Doe',
      type: 'name',
    });
    expect(v3.container.textContent).toContain('J**n D*e');
  });

  it('masks email correctly', () => {
    const view = render(SensitiveDataMask, {
      value: 'alex.smith@example.com',
      type: 'email',
    });
    expect(view.container.textContent).toContain('a***h@example.com');
  });

  it('unmasks value when eye button is clicked', async () => {
    const view = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'phone',
      allowUnmask: true,
    });
    expect(view.container.textContent).toContain('138****5678');

    const toggleBtn = view.container.querySelector('button[aria-label="Reveal sensitive data"]');
    if (toggleBtn) {
      await fireEvent.click(toggleBtn);
      expect(view.container.textContent).toContain('13812345678');
    }
  });

  it('guards unmasking with onReveal permission check', async () => {
    const onRevealReject = vi.fn().mockResolvedValue(false);
    const view1 = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'mobile',
      allowUnmask: true,
      onReveal: onRevealReject,
    });

    const toggleBtn1 = view1.container.querySelector('button[aria-label="Reveal sensitive data"]');
    expect(toggleBtn1).toBeTruthy();
    if (toggleBtn1) {
      await fireEvent.click(toggleBtn1);
      expect(onRevealReject).toHaveBeenCalled();
      expect(view1.container.textContent).toContain('138****5678');
    }

    const onRevealAccept = vi.fn().mockResolvedValue(true);
    const view2 = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'mobile',
      allowUnmask: true,
      onReveal: onRevealAccept,
    });

    const toggleBtn2 = view2.container.querySelector('button[aria-label="Reveal sensitive data"]');
    if (toggleBtn2) {
      await fireEvent.click(toggleBtn2);
      expect(onRevealAccept).toHaveBeenCalled();
      expect(view2.container.textContent).toContain('13812345678');
    }
  });

  it('supports safe copy protection with copyMode="masked"', async () => {
    let copiedResult = '';
    const onCopy = vi.fn((text: string) => {
      copiedResult = text;
    });

    const writeTextMock = vi.fn().mockImplementation((text: string) => {
      copiedResult = text;
      return Promise.resolve();
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const view = render(SensitiveDataMask, {
      value: '13812345678',
      type: 'mobile',
      copyMode: 'masked',
      onCopy,
    });

    const copyBtn = view.container.querySelector('button[aria-label="Copy to clipboard"]');
    expect(copyBtn).toBeTruthy();
    if (copyBtn) {
      await fireEvent.click(copyBtn);
      expect(onCopy).toHaveBeenCalledWith('138****5678');
      expect(copiedResult).toBe('138****5678');
    }
  });
});
