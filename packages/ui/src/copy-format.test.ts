import { describe, expect, it } from 'vitest';
import { formatAdminCopy, formatAdminCurrency, formatAdminDate, formatAdminEllipsis, formatAdminEmDash, formatAdminEnglishPunctuation, formatAdminLessThanOrEqual, formatAdminNumber, formatAdminNumericRange, formatAdminPercent, formatAdminTime, spaceCjkLatin } from './copy-format';

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

  it('formats currency without a space after the symbol and keeps locale decimals', () => {
    expect(formatAdminCurrency(1234, { locale: 'en-US', currency: 'USD', maximumFractionDigits: 0 })).toBe('$1,234');
    expect(formatAdminCurrency(1234.5, { locale: 'de-DE', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 2 })).toMatch(/1\.234,50/);
    expect(formatAdminCurrency(1234, 'zh-CN')).not.toMatch(/^[^\d\s]\s+\d/);
  });

  it('formats percents without a space before the sign', () => {
    expect(formatAdminPercent(0.12, { locale: 'en-US', maximumFractionDigits: 0 })).toBe('12%');
    expect(formatAdminPercent(12.5, { locale: 'zh-CN', scale: 'points', maximumFractionDigits: 1 })).toBe('12.5%');
    expect(formatAdminPercent(0.125, 'fr-FR')).not.toMatch(/\s%/);
  });

  it('formats a calendar date without a clock time', () => {
    const formatted = formatAdminDate(new Date(2026, 0, 2, 15, 4, 5), { locale: 'en-US', dateStyle: 'medium' });
    expect(formatted).toContain('2026');
    expect(formatted).not.toMatch(/15:04|3:04|PM|pm/);
  });

  it('formats em dashes, comparisons, numeric ranges and English punctuation', () => {
    expect(formatAdminEmDash('说明--补充')).toBe('说明——补充');
    expect(formatAdminEmDash('说明—补充')).toBe('说明——补充');
    expect(formatAdminEmDash('说明——补充')).toBe('说明——补充');
    expect(formatAdminLessThanOrEqual('数量<=10')).toBe('数量≤10');
    expect(formatAdminNumericRange('1-10 和 20—30')).toBe('1~10 和 20~30');
    expect(formatAdminNumericRange('1~10')).toBe('1~10');
    expect(formatAdminEnglishPunctuation('Hello,world. Next')).toBe('Hello, world. Next');
    expect(formatAdminCopy('保存Success...')).toBe('保存 Success…');
  });

  it('uses the single-character ellipsis on shared copy', () => {
    expect(formatAdminEllipsis('加载中' + '...')).toBe('加载中…');
    expect(formatAdminCopy('保存Success...')).toBe('保存 Success…');
    expect(formatAdminEllipsis('1.25')).toBe('1.25');
  });
});
