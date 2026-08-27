import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import TagField from './TagField.svelte';
import BooleanField from './BooleanField.svelte';
import DateField from './DateField.svelte';
import NumberField from './NumberField.svelte';
import UrlField from './UrlField.svelte';

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
