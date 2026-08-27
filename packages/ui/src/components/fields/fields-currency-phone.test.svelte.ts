import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import CurrencyField from './CurrencyField.svelte';
import PhoneField from './PhoneField.svelte';

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');

function setClipboard(writeText?: (value: string) => Promise<void>): void {
  if (writeText) {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  } else {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalClipboard) {
    Object.defineProperty(globalThis.navigator, 'clipboard', originalClipboard);
  } else {
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  }
});

describe('CurrencyField enterprise capabilities', () => {
  it('formats standard currency with USD default', () => {
    const view = render(CurrencyField, { value: 1234.56, locale: 'en-US' });
    expect(view.container.textContent).toContain('$1,234.56');
    expect(view.container.querySelector('.tabular-nums')).not.toBeNull();
  });

  it('formats CNY currency with custom precision', () => {
    const view = render(CurrencyField, {
      value: 99800,
      currency: 'CNY',
      locale: 'zh-CN',
      precision: 0,
    });
    expect(view.container.textContent).toMatch(/¥|CN¥/);
    expect(view.container.textContent).toContain('99,800');
  });

  it('formats custom currency symbol override', () => {
    const view = render(CurrencyField, {
      value: 450.5,
      symbol: '€',
      locale: 'en-US',
    });
    expect(view.container.textContent).toContain('€450.50');
  });

  it('applies positive and negative colors when colored=true', () => {
    const posView = render(CurrencyField, { value: 500, colored: true });
    expect(posView.container.querySelector('.text-success')).not.toBeNull();

    const negView = render(CurrencyField, { value: -250, colored: true });
    expect(negView.container.querySelector('.text-destructive')).not.toBeNull();
  });

  it('infers positive and negative colors when tone=auto', () => {
    const posView = render(CurrencyField, { value: 500, tone: 'auto' });
    expect(posView.container.querySelector('.text-success')).not.toBeNull();

    const negView = render(CurrencyField, { value: -250, tone: 'auto' });
    expect(negView.container.querySelector('.text-destructive')).not.toBeNull();

    const zeroView = render(CurrencyField, { value: 0, tone: 'auto' });
    expect(zeroView.container.querySelector('.text-success')).toBeNull();
    expect(zeroView.container.querySelector('.text-destructive')).toBeNull();
  });

  it('handles whitespace, NaN, and non-finite values by falling back to nullLabel', () => {
    const nullView = render(CurrencyField, { value: null, nullLabel: 'N/A' });
    expect(nullView.container.textContent).toContain('N/A');

    const spaceView = render(CurrencyField, { value: '   ', nullLabel: 'Empty' });
    expect(spaceView.container.textContent).toContain('Empty');

    const infView = render(CurrencyField, { value: Infinity, nullLabel: 'Unbounded' });
    expect(infView.container.textContent).toContain('Unbounded');
  });

  it('bounds extreme precision safely without throwing', () => {
    const negPrecView = render(CurrencyField, { value: 42.5, precision: -3, locale: 'en-US' });
    expect(negPrecView.container.textContent).toContain('$43');

    const largePrecView = render(CurrencyField, { value: 42.5, precision: 99, locale: 'en-US' });
    expect(largePrecView.container.textContent).toContain('$42.50');
  });
});

describe('PhoneField enterprise capabilities', () => {
  it('renders phone link with tel: href and icon', () => {
    const view = render(PhoneField, { value: '+86 138 0000 0000' });
    expect(view.container.textContent).toContain('+86 138 0000 0000');
    const link = view.container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('tel:+8613800000000');
    expect(view.container.querySelector('svg')).not.toBeNull();
  });

  it('renders non-clickable text when clickable=false', () => {
    const view = render(PhoneField, { value: '010-88888888', clickable: false });
    expect(view.container.querySelector('a')).toBeNull();
    expect(view.container.textContent).toContain('010-88888888');
  });

  it('supports copy action and triggers oncopy callback', async () => {
    const writeText = vi.fn(async () => undefined);
    const oncopy = vi.fn();
    setClipboard(writeText);
    const view = render(PhoneField, { value: '18600001111', copyable: true, oncopy });

    const copyBtn = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy phone number"]');
    expect(copyBtn).not.toBeNull();
    if (copyBtn) await fireEvent.click(copyBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('18600001111'));
    expect(oncopy).toHaveBeenCalledWith('18600001111');
    expect(copyBtn?.getAttribute('aria-label')).toBe('Copied');
  });

  it('does not set copied state when clipboard write fails', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('clipboard failure');
    });
    const oncopy = vi.fn();
    setClipboard(writeText);
    const view = render(PhoneField, { value: '18600001111', copyable: true, oncopy });

    const copyBtn = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy phone number"]');
    expect(copyBtn).not.toBeNull();
    if (copyBtn) await fireEvent.click(copyBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('18600001111'));
    expect(oncopy).not.toHaveBeenCalled();
    expect(copyBtn?.getAttribute('aria-label')).toBe('Copy phone number');
  });

  it('safely handles missing clipboard in SSR environment', async () => {
    setClipboard(undefined);
    const oncopy = vi.fn();
    const view = render(PhoneField, { value: '18600001111', copyable: true, oncopy });

    const copyBtn = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy phone number"]');
    expect(copyBtn).not.toBeNull();
    if (copyBtn) await fireEvent.click(copyBtn);

    expect(oncopy).not.toHaveBeenCalled();
    expect(copyBtn?.getAttribute('aria-label')).toBe('Copy phone number');
  });

  it('renders nullLabel when value is empty', () => {
    const view = render(PhoneField, { value: '', nullLabel: 'No Phone' });
    expect(view.container.textContent).toContain('No Phone');
  });

  it('does not create an invalid tel link for non-numeric values', () => {
    const view = render(PhoneField, { value: 'extension abc' });
    expect(view.container.querySelector('a')).toBeNull();
  });

  it('normalizes a custom phone href and rejects non-tel schemes', () => {
    const telView = render(PhoneField, { value: 'Support', href: 'tel:+1 (212) 555-0142' });
    expect(telView.container.querySelector('a')?.getAttribute('href')).toBe('tel:+12125550142');

    const unsafeView = render(PhoneField, { value: 'Support', href: 'javascript:alert(1)' });
    expect(unsafeView.container.querySelector('a')).toBeNull();
  });
});
