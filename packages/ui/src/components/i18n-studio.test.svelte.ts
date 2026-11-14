import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import I18nStudio from './I18nStudio.svelte';

describe('I18nStudio component', () => {
  const initialDictionaries = {
    'zh-CN': {
      'auth.login.title': '欢迎登录',
      'auth.login.submit': '登录',
      'dashboard.metrics.revenue': '总营收',
      'common.ok': '确定',
    },
    'en-US': {
      'auth.login.title': 'Welcome Back',
      'auth.login.submit': 'Sign In',
      'common.ok': 'OK',
      // 'dashboard.metrics.revenue' is deliberately missing
    },
  };

  it('renders I18nStudio with component data tag and stats', () => {
    const { container } = render(I18nStudio, {
      props: {
        dictionaries: initialDictionaries,
        sourceLocale: 'zh-CN',
        targetLocale: 'en-US',
      },
    });

    const root = container.querySelector('[data-svadmin-component="I18nStudio"]');
    expect(root).not.toBeNull();
    // 3 out of 4 keys translated = 75%
    expect(container.textContent).toContain('75% Translated');
    expect(container.textContent).toContain('3 / 4 keys completed');
    expect(container.textContent).toContain('auth.login.title');
    expect(container.textContent).toContain('dashboard.metrics.revenue');
  });

  it('filters keys by search query and namespace', async () => {
    const { container } = render(I18nStudio, {
      props: {
        dictionaries: initialDictionaries,
      },
    });

    const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Type 'revenue'
    searchInput.value = 'revenue';
    searchInput.dispatchEvent(new Event('input'));

    expect(container.textContent).toContain('dashboard.metrics.revenue');
    expect(container.textContent).not.toContain('auth.login.title');
  });

  it('identifies missing translations', () => {
    const { container } = render(I18nStudio, {
      props: {
        dictionaries: initialDictionaries,
      },
    });

    // Should contain a Missing tag for dashboard.metrics.revenue
    expect(container.textContent).toContain('Missing');
  });

  it('triggers onSave callback when Save button is clicked', async () => {
    let savedDict: Record<string, Record<string, string>> | null = null;
    const { container } = render(I18nStudio, {
      props: {
        dictionaries: initialDictionaries,
        onSave: (dicts) => {
          savedDict = dicts;
        },
      },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const saveBtn = buttons.find((b) => b.textContent?.includes('Save Changes'));
    expect(saveBtn).toBeDefined();

    saveBtn?.click();
    expect(savedDict).not.toBeNull();
    expect(savedDict?.['zh-CN']?.['common.ok']).toBe('确定');
  });

  it('triggers onApplyLive for runtime hot reloading', async () => {
    let liveLocale = '';
    let liveDict: Record<string, string> = {};

    const { container } = render(I18nStudio, {
      props: {
        dictionaries: initialDictionaries,
        onApplyLive: (loc, dict) => {
          liveLocale = loc;
          liveDict = dict;
        },
      },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const reloadBtn = buttons.find((b) => b.textContent?.includes('Hot Reload'));
    expect(reloadBtn).toBeDefined();

    reloadBtn?.click();
    expect(liveLocale).toBe('en-US');
    expect(liveDict['common.ok']).toBe('OK');
  });
});
