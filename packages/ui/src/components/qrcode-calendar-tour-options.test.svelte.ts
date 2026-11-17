import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import QRCode from './QRCode.svelte';
import Calendar from './Calendar.svelte';
import Tour from './Tour.svelte';

describe('QRCode, Calendar, and Tour option parity', () => {
  it('renders QRCode with bordered={false} and center icon', () => {
    const view = render(QRCode, {
      value: 'https://example.com',
      bordered: false,
      icon: 'https://example.com/logo.png',
      iconSize: 32,
    });

    const figure = view.container.querySelector('figure[data-slot="qr-code"]');
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute('data-bordered')).toBe('false');
    expect(figure?.classList.contains('border-0')).toBe(true);
    const img = view.container.querySelector('img[src="https://example.com/logo.png"]');
    expect(img).not.toBeNull();
  });

  it('renders Calendar with panel alias', () => {
    const view = render(Calendar, {
      value: '2026-11-17',
      panel: true,
    });

    const calendar = view.container.querySelector('.svadmin-calendar');
    expect(calendar?.getAttribute('data-card')).toBe('true');
    expect(calendar?.classList.contains('svadmin-calendar--card')).toBe(true);
  });

  it('renders Tour with mask={false} and defaultCurrent', () => {
    const steps = [
      { title: '步骤 1', description: '第一步说明' },
      { title: '步骤 2', description: '第二步说明' },
    ];

    const view = render(Tour, {
      steps,
      open: true,
      mask: false,
      defaultCurrent: 1,
    });

    const tour = view.container.querySelector('[data-svadmin-component="TourGuide"]');
    expect(tour).not.toBeNull();
    expect(tour?.getAttribute('data-mask')).toBe('false');
    expect(view.container.querySelector('.svadmin-tour__dismiss')).toBeNull();
    expect(view.container.textContent).toContain('步骤 2');
  });
});
