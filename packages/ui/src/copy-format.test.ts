import { describe, expect, it } from 'vitest';
import { formatAdminNumber, formatAdminTime, spaceCjkLatin } from './copy-format';

describe('admin copy format', () => {
  it('formats clock time on a 24-hour cycle', () => {
    const formatted = formatAdminTime(new Date(2026, 0, 2, 15, 4, 5), { locale: 'en-US' });
    expect(formatted).toContain('15');
    expect(formatted).toContain('04');
    expect(formatted).toContain('05');
    expect(formatted.toLowerCase()).not.toContain('pm');
  });

  it('groups integers past four digits and leaves the fraction ungrouped', () => {
    expect(formatAdminNumber(1234567.89, 'en-US')).toBe('1,234,567.89');
    expect(formatAdminNumber(9999, 'en-US')).toBe('9,999');
  });

  it('inserts a space between CJK and Latin or digits', () => {
    expect(spaceCjkLatin('保存Success共12项')).toBe('保存 Success 共 12 项');
    expect(spaceCjkLatin('已经对齐')).toBe('已经对齐');
  });
});
