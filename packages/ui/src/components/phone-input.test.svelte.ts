import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PhoneInput from './PhoneInput.svelte';
import {
  findDialCodeByCountry,
  formatNationalNumber,
  splitE164,
  toE164,
} from './phone-dial-codes.js';
import { requireValue } from '../../../../scripts/test-assertions';

afterEach(() => cleanup());

describe('phone dial code helpers', () => {
  it('resolves countries case-insensitively', () => {
    expect(findDialCodeByCountry('us')?.dial).toBe('1');
    expect(findDialCodeByCountry('CN')?.dial).toBe('86');
    expect(findDialCodeByCountry('ZZ')).toBeUndefined();
  });

  it('builds E.164 values and strips national trunk prefixes', () => {
    expect(toE164('CN', '13800138000')).toBe('+8613800138000');
    expect(toE164('GB', '020 7946 0958')).toBe('+442079460958');
    expect(toE164('CN', '')).toBe('');
    expect(toE164('ZZ', '123')).toBe('+123');
  });

  it('splits E.164 with longest-prefix matching', () => {
    expect(splitE164('+380671234567')).toEqual({ country: 'UA', nationalNumber: '671234567' });
    expect(splitE164('+14155552671')).toEqual({ country: 'CA', nationalNumber: '4155552671' });
    expect(splitE164('', 'DE')).toEqual({ country: 'DE', nationalNumber: '' });
  });

  it('formats national numbers in readable groups', () => {
    expect(formatNationalNumber('13800138000')).toBe('1380 0138 000');
    expect(formatNationalNumber('123')).toBe('123');
  });
});

describe('PhoneInput', () => {
  it('shows the selected dial prefix and emits E.164 on input', async () => {
    const onchange = vi.fn();
    const view = render(PhoneInput, {
      country: 'CN',
      nationalNumber: '',
      ariaLabel: 'Contact phone',
      onchange,
    });

    expect(view.getByText('+86')).not.toBeNull();

    const field = requireValue(view.getByRole('textbox', { name: 'Contact phone' })) as HTMLInputElement;
    await fireEvent.input(field, { target: { value: '13800138000' } });

    expect(onchange).toHaveBeenLastCalledWith({
      country: 'CN',
      nationalNumber: '13800138000',
      e164: '+8613800138000',
    });
  });

  it('renders the country selector and marks invalid state', () => {
    const view = render(PhoneInput, {
      country: 'US',
      nationalNumber: '4155552671',
      invalid: true,
      describedby: 'phone-error',
    });
    const root = view.container.querySelector('.svadmin-phone-input');
    expect(root?.getAttribute('data-invalid')).toBe('true');
    const select = requireValue(view.getByRole('combobox')) as HTMLSelectElement;
    expect(select.value).toBe('US');
    expect(select.options.length).toBeGreaterThan(50);
    const field = requireValue(view.getByRole('textbox')) as HTMLInputElement;
    expect(field.getAttribute('aria-describedby')).toBe('phone-error');
    expect(field.getAttribute('aria-invalid')).toBe('true');
  });

  it('can be disabled', () => {
    const view = render(PhoneInput, { country: 'GB', nationalNumber: '2079460958', disabled: true });
    const root = view.container.querySelector('.svadmin-phone-input');
    expect(root?.getAttribute('data-disabled')).toBe('true');
    expect((requireValue(view.getByRole('textbox')) as HTMLInputElement).disabled).toBe(true);
  });
});