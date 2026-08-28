import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteCurrencyField from './LiteCurrencyField.svelte';
import LitePercentField from './LitePercentField.svelte';
import LiteRatingField from './LiteRatingField.svelte';
import LitePhoneField from './LitePhoneField.svelte';
import LiteCodeField from './LiteCodeField.svelte';
import LiteAvatarField from './LiteAvatarField.svelte';
import LiteCopyField from './LiteCopyField.svelte';
import LiteDateRangeField from './LiteDateRangeField.svelte';
import LiteShowField from '../LiteShowField.svelte';
import LiteTable from '../LiteTable.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  t: (key: string) => key,
}));

describe('LiteCurrencyField', () => {
  it('formats numeric values in show mode', () => {
    const { container } = render(LiteCurrencyField, {
      field: { key: 'amount', label: 'Amount', type: 'currency' },
      value: 1234.56,
      currency: 'USD',
      locale: 'en-US',
      mode: 'show',
    });
    expect(container.textContent).toContain('$1,234.56');
    expect(container.querySelector('.lite-currency')).toBeTruthy();
  });

  it('renders input in edit mode with error states', () => {
    const { container } = render(LiteCurrencyField, {
      field: { key: 'amount', label: 'Amount', type: 'currency', required: true },
      value: '$50.00',
      error: ['Invalid amount'],
      mode: 'edit',
    });
    const input = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input?.value).toBe('50');
    expect(input?.required).toBe(true);
    expect(input?.classList.contains('lite-input-error')).toBe(true);
    expect(container.querySelector('.lite-error-text')?.textContent).toBe('Invalid amount');
  });
});

describe('LitePercentField', () => {
  it('formats percentage and renders progress bar in show mode', () => {
    const { container } = render(LitePercentField, {
      field: { key: 'growth', label: 'Growth', type: 'percent' },
      value: 75.5,
      showProgress: true,
      mode: 'show',
    });
    expect(container.textContent).toContain('75.5%');
    expect(container.querySelector('.lite-progress-bar')).toBeTruthy();
    expect(container.querySelector<HTMLElement>('.lite-progress-fill')?.style.width).toBe('75.5%');
  });

  it('renders numeric input in create mode', () => {
    const { container } = render(LitePercentField, {
      field: { key: 'growth', label: 'Growth', type: 'percent' },
      value: '80%',
      mode: 'create',
    });
    const input = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input?.value).toBe('80');
  });
});

describe('LiteRatingField', () => {
  it('renders star ratings and value in show mode', () => {
    const { container } = render(LiteRatingField, {
      field: { key: 'score', label: 'Score', type: 'rating' },
      value: 4,
      max: 5,
      showValue: true,
      mode: 'show',
    });
    expect(container.textContent).toContain('★★★★☆');
    expect(container.textContent).toContain('(4)');
  });

  it('renders bounded number input in edit mode', () => {
    const { container } = render(LiteRatingField, {
      field: { key: 'score', label: 'Score', type: 'rating' },
      value: 3.5,
      max: 5,
      mode: 'edit',
    });
    const input = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input?.value).toBe('3.5');
    expect(input?.min).toBe('0');
    expect(input?.max).toBe('5');
  });
});

describe('LitePhoneField', () => {
  it('renders telephone link in show mode', () => {
    const { container } = render(LitePhoneField, {
      field: { key: 'tel', label: 'Telephone', type: 'phone' },
      value: '+1 (555) 123-4567',
      mode: 'show',
    });
    const link = container.querySelector<HTMLAnchorElement>('a.lite-phone-link');
    expect(link?.href).toBe('tel:+15551234567');
    expect(link?.textContent).toBe('+1 (555) 123-4567');
  });

  it('renders tel input in edit mode', () => {
    const { container } = render(LitePhoneField, {
      field: { key: 'tel', label: 'Telephone', type: 'phone' },
      value: '+1 555 123 4567',
      mode: 'edit',
    });
    const input = container.querySelector<HTMLInputElement>('input[type="tel"]');
    expect(input?.value).toBe('+1 555 123 4567');
  });
});

describe('LiteCodeField', () => {
  it('renders preformatted code in show mode', () => {
    const { container } = render(LiteCodeField, {
      field: { key: 'config', label: 'Config', type: 'code' },
      value: { debug: true, port: 8080 },
      mode: 'show',
    });
    expect(container.querySelector('pre.lite-code')?.textContent).toContain('"debug": true');
  });

  it('renders textarea in edit mode', () => {
    const { container } = render(LiteCodeField, {
      field: { key: 'snippet', label: 'Snippet', type: 'code' },
      value: 'console.log("hello");',
      mode: 'edit',
    });
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea?.value).toBe('console.log("hello");');
  });
});

describe('LiteAvatarField', () => {
  it('renders image avatar when src is provided', () => {
    const { container } = render(LiteAvatarField, {
      field: { key: 'avatar', label: 'Avatar', type: 'avatar' },
      src: 'https://example.com/avatar.jpg',
      name: 'John Doe',
      mode: 'show',
    });
    const img = container.querySelector<HTMLImageElement>('.lite-avatar img');
    expect(img?.src).toBe('https://example.com/avatar.jpg');
    expect(img?.alt).toBe('John Doe');
  });

  it('renders initials when no image src is provided', () => {
    const { container } = render(LiteAvatarField, {
      field: { key: 'avatar', label: 'Avatar', type: 'avatar' },
      name: 'Jane Smith',
      mode: 'show',
    });
    expect(container.querySelector('.lite-avatar-text')?.textContent).toBe('JS');
  });
});

describe('LiteCopyField', () => {
  it('renders monospaced text in show mode', () => {
    const { container } = render(LiteCopyField, {
      field: { key: 'apiKey', label: 'API Key', type: 'copy' },
      value: 'sk_live_123456789',
      mode: 'show',
    });
    expect(container.querySelector('.lite-copy.lite-mono')?.textContent).toBe('sk_live_123456789');
  });
});

describe('LiteDateRangeField', () => {
  it('renders formatted start and end dates', () => {
    const { container } = render(LiteDateRangeField, {
      field: { key: 'range', label: 'Date Range', type: 'daterange' },
      value: ['2026-08-01', '2026-08-28'],
      separator: '~',
      mode: 'show',
    });
    expect(container.textContent).toContain('~');
    expect(container.textContent).not.toBe('—');
  });
});

describe('LiteShowField with enterprise types', () => {
  it('renders currency, percent, phone, rating, code, avatar', () => {
    const currencyRender = render(LiteShowField, {
      field: { key: 'revenue', label: 'Revenue', type: 'currency' },
      value: 9999.99,
    });
    expect(currencyRender.container.textContent).toContain('$9,999.99');
    currencyRender.unmount();

    const percentRender = render(LiteShowField, {
      field: { key: 'margin', label: 'Margin', type: 'percent' },
      value: 42.8,
    });
    expect(percentRender.container.textContent).toContain('42.8%');
    percentRender.unmount();

    const ratingRender = render(LiteShowField, {
      field: { key: 'stars', label: 'Stars', type: 'rating' },
      value: 5,
    });
    expect(ratingRender.container.textContent).toContain('★★★★★');
    ratingRender.unmount();

    const phoneRender = render(LiteShowField, {
      field: { key: 'support', label: 'Support', type: 'phone' },
      value: '+1-800-555-0199',
    });
    expect(phoneRender.container.querySelector('a')?.href).toBe('tel:+18005550199');
    phoneRender.unmount();
  });
});

import type { ResourceDefinition } from '@svadmin/core';

describe('LiteTable with enterprise types', () => {
  it('renders currency and rating columns in table rows', () => {
    const resource: ResourceDefinition = {
      name: 'products',
      label: 'Products',
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'price', label: 'Price', type: 'currency' },
        { key: 'score', label: 'Score', type: 'rating' },
      ],
    };
    const { container } = render(LiteTable, {
      resource,
      records: [
        { id: 1, title: 'Item 1', price: 29.99, score: 4 },
      ],
    });
    expect(container.textContent).toContain('Item 1');
    expect(container.textContent).toContain('$29.99');
    expect(container.textContent).toContain('★★★★☆');
  });
});
