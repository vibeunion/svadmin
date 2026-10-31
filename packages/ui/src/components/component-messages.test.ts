import { describe, expect, it } from 'vitest';
import { componentText, resolveComponentLocale, weekdayLabels } from './component-messages.js';

describe('component messages', () => {
  it('resolves locale from the component, then the provider, then i18n', () => {
    expect(resolveComponentLocale({ explicit: 'zh-CN', configLocale: 'en', i18nLocale: 'en' })).toBe('zh-CN');
    expect(resolveComponentLocale({ explicit: '  ', configLocale: 'zh-Hans', i18nLocale: 'en' })).toBe('zh-Hans');
    expect(resolveComponentLocale({ configLocale: undefined, i18nLocale: 'zh-CN' })).toBe('zh-CN');
    expect(resolveComponentLocale({})).toBe('en');
  });

  it('uses host translations before the built-in Chinese and English catalog', () => {
    const host = { t: (key: string) => key === 'datePicker.clear' ? '清空日期' : key };
    expect(componentText(host, 'en', 'datePicker.clear')).toBe('清空日期');
    expect(componentText({ t: (key) => key }, 'zh-CN', 'datePicker.clear')).toBe('清除');
    expect(componentText({ t: (key) => key }, 'en-US', 'datePicker.previous')).toBe('Previous');
  });

  it('labels weekdays from Monday for both locales', () => {
    expect(weekdayLabels('en')[0]).toBe('Mon');
    expect(weekdayLabels('zh-CN')[0]).toBe('周一');
    expect(weekdayLabels('zh-CN')).toHaveLength(7);
  });
});
