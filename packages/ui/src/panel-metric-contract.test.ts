import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function block(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf('}', start));
}

describe('Official panel metrics for calendar, date, image, and QR status', () => {
  it('uses the calendar panel circle, today dot, and text-4 disabled day', () => {
    const source = read('components/Calendar.svelte');
    expect(block(source, '.svadmin-calendar--card {')).toContain('16.5625rem');
    expect(block(source, '.svadmin-calendar__date {')).toContain('min-width: 24px');
    expect(block(source, '.svadmin-calendar__date {')).toContain('height: 24px');
    expect(block(source, '.svadmin-calendar__day.is-today::after {')).toContain('width: 4px');
    expect(block(source, '.svadmin-calendar__day:disabled {')).toContain('opacity: 1');
    expect(block(source, '.svadmin-calendar__day:disabled .svadmin-calendar__date {')).toContain('--svadmin-text-4');
    expect(source).not.toContain('opacity: 0.4');
    expect(source).not.toContain('opacity: 0.65');
    expect(block(source, '.svadmin-calendar__header strong {')).toContain('font-weight: 500');
    expect(block(source, '.svadmin-calendar__header strong {')).toContain('--svadmin-text-body');
  });

  it('uses the date panel day circle and a 32px trigger', () => {
    const source = read('components/DatePicker.svelte');
    expect(source).not.toContain('text-[0.6875rem]');
    expect(source).not.toContain('opacity: 0.35');
    expect(source).not.toContain('opacity: 0.55');
    expect(block(source, '.svadmin-date-picker__trigger {')).toContain('min-height: var(--svadmin-control-h)');
    expect(block(source, '.svadmin-date-picker__trigger {')).toContain('--border-radius-small');
    expect(block(source, '.svadmin-date-picker__trigger:disabled {')).toContain('opacity: 1');
    expect(block(source, '.svadmin-date-picker__day > span {')).toContain('height: 24px');
    expect(block(source, '.svadmin-date-picker__weekdays span {')).toContain('--svadmin-text-body');
    expect(block(source, '.svadmin-date-picker__day:disabled > span {')).toContain('--svadmin-text-4');
  });

  it('uses the outer image caption sizes and the shared mask', () => {
    const source = read('components/Image.svelte');
    expect(block(source, '.svadmin-image__title {')).toContain('--svadmin-text-section');
    expect(block(source, '.svadmin-image__title {')).toContain('font-weight: 500');
    expect(block(source, '.svadmin-image__description {')).toContain('--svadmin-text-body');
    expect(block(source, '.svadmin-image__caption {')).toContain('margin-top: 4px');
    expect(block(source, '.svadmin-image__overlay {')).toContain('--svadmin-mask');
    expect(source).not.toContain('0.75rem');
  });

  it('keeps QR status copy on tokens and the locale catalog', () => {
    const source = read('components/QRCode.svelte');
    expect(source).not.toContain('0.8125rem');
    expect(source).not.toContain('二维码已失效');
    expect(source).toContain('qrCode.expired');
    expect(block(source, '.svadmin-qr-code__empty {')).toContain('--svadmin-text-body');
    expect(block(source, '.svadmin-qr-code__status-text {')).toContain('--svadmin-text-caption');
    expect(source).not.toContain('backdrop-filter');
  });
});
