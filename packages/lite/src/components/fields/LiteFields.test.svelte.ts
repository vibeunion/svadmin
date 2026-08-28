import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteAvatarField from './LiteAvatarField.svelte';
import LiteCodeField from './LiteCodeField.svelte';
import LiteCopyField from './LiteCopyField.svelte';
import LiteCurrencyField from './LiteCurrencyField.svelte';
import LiteDateRangeField from './LiteDateRangeField.svelte';
import LitePercentField from './LitePercentField.svelte';
import LitePhoneField from './LitePhoneField.svelte';
import LiteRatingField from './LiteRatingField.svelte';

describe('Lite Fields SSR rendering', () => {
  it('renders LiteAvatarField with image or initials fallback and status dot', () => {
    const withImg = render(LiteAvatarField, {
      src: 'https://example.com/avatar.png',
      name: 'Alice Johnson',
      status: 'online',
      showName: true,
      subtitle: 'Admin',
    });
    expect(withImg.container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.png');
    expect(withImg.container.querySelector('.lite-avatar-dot-sm')).toBeTruthy();
    expect(withImg.container.textContent).toContain('Alice Johnson');
    expect(withImg.container.textContent).toContain('Admin');
    withImg.unmount();

    const withInitials = render(LiteAvatarField, {
      name: 'Bob Smith',
      showName: false,
    });
    expect(withInitials.container.querySelector('img')).toBeNull();
    expect(withInitials.container.querySelector('.lite-avatar-initials')?.textContent).toBe('BS');
  });

  it('renders LiteCodeField with language badge and pre block in show and edit mode', () => {
    const showView = render(LiteCodeField, {
      value: 'console.log("hello");',
      language: 'javascript',
      mode: 'show',
    });
    expect(showView.container.querySelector('.lite-badge')?.textContent).toBe('JAVASCRIPT');
    expect(showView.container.querySelector('pre')?.textContent).toContain('console.log("hello");');
    showView.unmount();

    const editView = render(LiteCodeField, {
      value: 'const x = 1;',
      mode: 'edit',
    });
    expect(editView.container.querySelector('textarea')?.value).toBe('const x = 1;');
  });

  it('renders LiteCopyField with raw text or masked display', () => {
    const showView = render(LiteCopyField, {
      value: 'secret-api-key-12345678',
      masked: true,
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('secr...5678');
    showView.unmount();

    const editView = render(LiteCopyField, {
      value: 'plain-token',
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('plain-token');
  });

  it('renders LiteCurrencyField with formatting and tone colors', () => {
    const showView = render(LiteCurrencyField, {
      value: 1250.5,
      currency: 'USD',
      locale: 'en-US',
      colored: true,
      tone: 'auto',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('$1,250.50');
    expect(showView.container.querySelector('.lite-text-success')).toBeTruthy();
    showView.unmount();

    const editView = render(LiteCurrencyField, {
      value: 99.9,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('99.9');
  });

  it('renders LiteDateRangeField formatted in show mode and two date inputs in edit mode', () => {
    const showView = render(LiteDateRangeField, {
      startDate: '2026-08-01',
      endDate: '2026-08-29',
      separator: '~',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('~');
    showView.unmount();

    const editView = render(LiteDateRangeField, {
      startDate: '2026-08-01',
      endDate: '2026-08-29',
      mode: 'edit',
    });
    const inputs = editView.container.querySelectorAll('input[type="date"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('2026-08-01');
    expect((inputs[1] as HTMLInputElement).value).toBe('2026-08-29');
  });

  it('renders LitePercentField with precision and optional progress bar', () => {
    const showView = render(LitePercentField, {
      value: 0.854,
      scale: '1',
      precision: 1,
      showProgress: true,
      tone: 'auto',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('85.4%');
    expect(showView.container.querySelector('.lite-progress-track')).toBeTruthy();
    showView.unmount();

    const editView = render(LitePercentField, {
      value: 75,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('75');
  });

  it('renders LitePhoneField with tel link in show mode and tel input in edit mode', () => {
    const showView = render(LitePhoneField, {
      value: '+1 (555) 234-5678',
      showIcon: true,
      clickable: true,
      mode: 'show',
    });
    expect(showView.container.querySelector('a')?.getAttribute('href')).toBe('tel:+15552345678');
    expect(showView.container.textContent).toContain('📞');
    showView.unmount();

    const editView = render(LitePhoneField, {
      value: '+15552345678',
      mode: 'edit',
    });
    expect((editView.container.querySelector('input[type="tel"]') as HTMLInputElement)?.value).toBe('+15552345678');
  });

  it('renders LiteRatingField with star symbols in show mode and number input in edit mode', () => {
    const showView = render(LiteRatingField, {
      value: 4.5,
      max: 5,
      showValue: true,
      mode: 'show',
    });
    expect(showView.container.querySelectorAll('.lite-rating-star-full')).toHaveLength(4);
    expect(showView.container.querySelectorAll('.lite-rating-star-half')).toHaveLength(1);
    expect(showView.container.textContent).toContain('4.5');
    showView.unmount();

    const editView = render(LiteRatingField, {
      value: 4,
      max: 5,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('4');
  });
});
