import { describe, expect, it } from 'vitest';
import { formatAdminCopy, formatAdminEllipsis, formatAdminNumber, formatAdminTime, spaceCjkLatin } from './copy-format';

describe('admin copy format', () => {
  it('formats clock time on a 24-hour cycle', () => {
    const formatted = formatAdminTime(new Date(2026, 0, 2, 15, 4, 5), { locale: 'en-US' });
    expect(formatted).toContain('15');
    expect(formatted).toContain('04');
    expect(formatted).toContain('05');
    expect(formatted.toLowerCase()).not.toContain('pm');
  });

  it('keeps a 24-hour clock when a date style is requested', () => {
    const formatted = formatAdminTime(new Date(2026, 0, 2, 15, 4, 5), { locale: 'en-US', dateStyle: 'medium' });
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
    expect(formatted.toLowerCase()).not.toContain('pm');
  });

  it('can omit seconds without falling back to a 12-hour clock', () => {
    const formatted = formatAdminTime(new Date(2026, 0, 2, 15, 4, 5), { locale: 'en-US', seconds: false });
    expect(formatted).toContain('15');
    expect(formatted).toContain('04');
    expect(formatted).not.toMatch(/:05/);
    expect(formatted.toLowerCase()).not.toContain('pm');
  });

  it('groups integers past four digits and keeps locale grouping at four digits', () => {
    expect(formatAdminNumber(1234567.89, 'en-US')).toBe('1,234,567.89');
    expect(formatAdminNumber(10000, 'en-US')).toBe('10,000');
    expect(formatAdminNumber(9999, 'en-US')).toBe('9,999');
    expect(formatAdminNumber(9999.5, 'en-US')).toBe('9,999.5');
    expect(formatAdminNumber(1234.5, 'de-DE')).toBe('1.234,5');
  });

  it('inserts a space between CJK and Latin or digits, except non-quantity tokens', () => {
    expect(spaceCjkLatin('保存Success共12项')).toBe('保存 Success 共 12 项');
    expect(spaceCjkLatin('已经对齐')).toBe('已经对齐');
    expect(spaceCjkLatin('7号线')).toBe('7号线');
    expect(spaceCjkLatin('坐7号线')).toBe('坐7号线');
    expect(spaceCjkLatin('3D打印')).toBe('3D打印');
    expect(spaceCjkLatin('HTML5发布')).toBe('HTML5发布');
    expect(spaceCjkLatin('共 12 项')).toBe('共 12 项');
  });

  it('uses the single-character ellipsis on shared copy', () => {
    expect(formatAdminEllipsis('加载中' + '...')).toBe('加载中…');
    expect(formatAdminCopy('保存Success...')).toBe('保存 Success…');
    expect(formatAdminEllipsis('1.25')).toBe('1.25');
  });
});
