import { builtinDisplayComponents, getDisplayComponent, hasDisplayComponent } from '../fieldComponentMap.js';
import TextField from './TextField.svelte';
import MarkdownField from './MarkdownField.svelte';
import CurrencyField from './CurrencyField.svelte';
import PhoneField from './PhoneField.svelte';
import CodeField from './CodeField.svelte';
import PercentField from './PercentField.svelte';
import RatingField from './RatingField.svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import TagField from './TagField.svelte';
import BooleanField from './BooleanField.svelte';
import DateField from './DateField.svelte';
import NumberField from './NumberField.svelte';
import UrlField from './UrlField.svelte';
import DateRangeField from './DateRangeField.svelte';
import CopyField from './CopyField.svelte';
import AvatarField from './AvatarField.svelte';

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

describe('TagField enterprise capabilities', () => {
  it('renders single string and array tags', () => {
    const view = render(TagField, { value: ['alpha', 'beta'] });
    expect(view.container.textContent).toContain('alpha');
    expect(view.container.textContent).toContain('beta');
  });

  it('renders empty fallback when null or empty', () => {
    const view = render(TagField, { value: null, nullLabel: 'None' });
    expect(view.container.textContent).toContain('None');
  });

  it('applies semantic colorMap tones to badges', () => {
    const view = render(TagField, {
      value: ['approved', 'rejected'],
      colorMap: { approved: 'success', rejected: 'danger' },
    });
    const approved = view.container.querySelector('.text-success');
    const rejected = view.container.querySelector('.text-destructive');
    expect(approved).not.toBeNull();
    expect(rejected).not.toBeNull();
  });

  it('supports compact size="sm"', () => {
    const view = render(TagField, { value: 'compact-tag', size: 'sm' });
    expect(view.container.querySelector('.text-\\[11px\\]')).not.toBeNull();
  });
});

describe('BooleanField enterprise capabilities', () => {
  it('renders icon mode by default', () => {
    const view = render(BooleanField, { value: true });
    expect(view.container.textContent).toContain('✓');
  });

  it('renders nullLabel when value is null or undefined', () => {
    const view = render(BooleanField, { value: null, nullLabel: 'N/A' });
    expect(view.container.textContent).toContain('N/A');
    expect(view.container.textContent).not.toContain('✗');
  });

  it('renders badge mode with customizable labels and tones', () => {
    const view = render(BooleanField, {
      value: true,
      mode: 'badge',
      trueLabel: 'Active',
      trueTone: 'success',
    });
    expect(view.container.textContent).toContain('Active');
    expect(view.container.querySelector('.text-success')).not.toBeNull();
  });

  it('renders badge mode false state', () => {
    const view = render(BooleanField, {
      value: false,
      mode: 'badge',
      falseLabel: 'Disabled',
      falseTone: 'danger',
    });
    expect(view.container.textContent).toContain('Disabled');
    expect(view.container.querySelector('.text-destructive')).not.toBeNull();
  });
});

describe('DateField enterprise capabilities', () => {
  it('formats standard date string safely', () => {
    const view = render(DateField, { value: '2026-08-27T08:00:00Z', locale: 'en-US' });
    expect(view.container.textContent).not.toBe('—');
    expect(view.container.textContent).toContain('2026');
  });

  it('returns nullLabel on invalid date string without throwing', () => {
    const view = render(DateField, { value: 'not-a-valid-date', nullLabel: 'Invalid' });
    expect(view.container.textContent).toContain('Invalid');
  });

  it('renders iso format', () => {
    const view = render(DateField, { value: '2026-08-27T00:00:00.000Z', format: 'iso' });
    expect(view.container.textContent).toContain('2026-08-27T00:00:00.000Z');
  });
});

describe('NumberField enterprise capabilities', () => {
  it('formats currency and precision', () => {
    const view = render(NumberField, {
      value: 123456.789,
      currency: 'USD',
      precision: 2,
      locale: 'en-US',
    });
    expect(view.container.textContent).toContain('$123,456.79');
  });

  it('formats tabular numbers with unit and prefix', () => {
    const view = render(NumberField, {
      value: 50,
      prefix: '≥ ',
      unit: 'kg',
      tabular: true,
    });
    expect(view.container.textContent).toContain('≥ 50 kg');
    expect(view.container.querySelector('.tabular-nums')).not.toBeNull();
  });

  it('renders nullLabel when value is empty or invalid', () => {
    const view = render(NumberField, { value: null, nullLabel: '—' });
    expect(view.container.textContent).toContain('—');
  });
});

describe('UrlField enterprise capabilities', () => {
  it('renders external link with label and icon', () => {
    const view = render(UrlField, {
      value: 'https://example.com/spec',
      label: 'View Specification',
      showIcon: true,
    });
    const link = view.container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com/spec');
    expect(link?.textContent).toContain('View Specification');
  });
});

describe('DateRangeField enterprise capabilities', () => {
  it('formats array range [start, end]', () => {
    const view = render(DateRangeField, {
      value: ['2026-08-01T00:00:00Z', '2026-08-15T00:00:00Z'],
      separator: '至',
      locale: 'en-US',
    });
    expect(view.container.textContent).toContain('至');
    expect(view.container.textContent).toContain('2026');
  });

  it('formats object range with start and end', () => {
    const view = render(DateRangeField, {
      value: { start: '2026-01-01T00:00:00Z', end: '2026-01-31T00:00:00Z' },
      separator: '→',
    });
    expect(view.container.textContent).toContain('→');
  });

  it('handles half-open range safely', () => {
    const view = render(DateRangeField, {
      startDate: '2026-08-01T00:00:00Z',
      endDate: null,
      nullLabel: 'Open',
      separator: '~',
    });
    expect(view.container.textContent).toContain('~');
    expect(view.container.textContent).toContain('Open');
  });

  it('returns nullLabel when both dates are empty', () => {
    const view = render(DateRangeField, {
      value: null,
      nullLabel: 'No Date Range',
    });
    expect(view.container.textContent).toContain('No Date Range');
  });
});

describe('CopyField enterprise capabilities', () => {
  it('renders copyable text and copy button', () => {
    const view = render(CopyField, { value: 'tracking-123456789' });
    expect(view.container.textContent).toContain('tracking-123456789');
    expect(view.container.querySelector('button')).not.toBeNull();
  });

  it('renders masked text when masked=true', () => {
    const view = render(CopyField, { value: 'reference-secret-value-9999', masked: true });
    expect(view.container.textContent).toContain('refe...9999');
  });

  it('reports success only after the clipboard write resolves', async () => {
    const writeText = vi.fn(async () => undefined);
    const oncopy = vi.fn();
    setClipboard(writeText);
    const view = render(CopyField, { value: 'record-42', oncopy });

    const button = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy"]');
    expect(button).not.toBeNull();
    if (button) await fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('record-42'));
    expect(oncopy).toHaveBeenCalledWith('record-42');
    expect(button?.getAttribute('aria-label')).toBe('Copied!');
  });

  it('does not report success when the clipboard write fails', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('clipboard unavailable');
    });
    const oncopy = vi.fn();
    setClipboard(writeText);
    const view = render(CopyField, { value: 'record-42', oncopy });

    const button = view.container.querySelector<HTMLButtonElement>('[aria-label="Copy"]');
    expect(button).not.toBeNull();
    if (button) await fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('record-42'));
    expect(oncopy).not.toHaveBeenCalled();
    expect(button?.getAttribute('aria-label')).toBe('Copy');
  });

  it('renders fallback when value is empty', () => {
    const view = render(CopyField, { value: null, nullLabel: 'No Value' });
    expect(view.container.textContent).toContain('No Value');
  });
});

describe('AvatarField enterprise capabilities', () => {
  it('renders name initials when src is not provided', () => {
    const view = render(AvatarField, { name: 'John Doe' });
    expect(view.container.textContent).toContain('JD');
  });

  it('uses first and last names for multi-part initials', () => {
    const view = render(AvatarField, { name: 'Ada Lovelace Byron' });
    expect(view.container.textContent).toContain('AB');
  });

  it('retries image rendering after src changes', async () => {
    const view = render(AvatarField, { src: '/broken.png', name: 'John Doe' });
    const initialImage = view.container.querySelector('img');
    expect(initialImage).not.toBeNull();
    if (initialImage) await fireEvent.error(initialImage);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.textContent).toContain('JD');

    await view.rerender({ src: '/working.png', name: 'John Doe' });
    await waitFor(() => {
      expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/working.png');
    });
  });

  it('renders status dot badge with an accessible label', () => {
    const view = render(AvatarField, { name: 'Alice', status: 'online' });
    expect(view.container.querySelector('.bg-emerald-500')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Status: online"]')).not.toBeNull();
  });

  it('renders label and subtitle when showName is true', () => {
    const view = render(AvatarField, {
      name: 'Bob Smith',
      subtitle: 'Administrator',
      showName: true,
    });
    expect(view.container.textContent).toContain('Bob Smith');
    expect(view.container.textContent).toContain('Administrator');
  });

  it('renders fallback when no meaningful name or src is given', () => {
    const view = render(AvatarField, { name: '   ', nullLabel: 'Unknown User' });
    expect(view.container.textContent).toContain('Unknown User');
  });
});

describe('builtinDisplayComponents field registry mappings', () => {
  it('maps enterprise and built-in field types correctly', () => {
    expect(getDisplayComponent('text')).toBe(TextField);
    expect(getDisplayComponent('string')).toBe(TextField);
    expect(getDisplayComponent('markdown')).toBe(MarkdownField);
    expect(getDisplayComponent('currency')).toBe(CurrencyField);
    expect(getDisplayComponent('phone')).toBe(PhoneField);
    expect(getDisplayComponent('code')).toBe(CodeField);
    expect(getDisplayComponent('percent')).toBe(PercentField);
    expect(getDisplayComponent('rating')).toBe(RatingField);
    expect(hasDisplayComponent('markdown')).toBe(true);
    expect(hasDisplayComponent('text')).toBe(true);
    expect(hasDisplayComponent('nonexistent_type')).toBe(false);
  });
});
