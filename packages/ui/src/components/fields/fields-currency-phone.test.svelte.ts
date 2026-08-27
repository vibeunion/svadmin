import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import CurrencyField from './CurrencyField.svelte';
import PhoneField from './PhoneField.svelte';

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');

function setClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
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

  it('renders nullLabel when value is empty or invalid', () => {
    const view = render(CurrencyField, { value: null, nullLabel: 'N/A' });
    expect(view.container.textContent).toContain('N/A');
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

  it('supports copy action when copyable=true', async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard(writeText);
    const view = render(PhoneField, { value: '18600001111', copyable: true });

    const copyBtn = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy phone number"]');
    expect(copyBtn).not.toBeNull();
    if (copyBtn) await fireEvent.click(copyBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('18600001111'));
  });

  it('renders nullLabel when value is empty', () => {
    const view = render(PhoneField, { value: '', nullLabel: 'No Phone' });
    expect(view.container.textContent).toContain('No Phone');
  });
});
