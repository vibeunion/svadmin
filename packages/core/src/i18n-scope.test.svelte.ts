import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import I18nScopeTestHost from './i18n-scope.test-host.svelte';
import {
  createI18nScope,
  getLocale,
  resetI18n,
  setLocale,
  type I18nProvider,
} from './i18n.svelte';

function createProvider(name: string, initialLocale: string): I18nProvider {
  let locale = initialLocale;

  return {
    translate: (key) => `${name}:${locale}:${key}`,
    getLocale: () => locale,
    setLocale: vi.fn((nextLocale: string) => {
      locale = nextLocale;
    }),
    getAvailableLocales: () => ['en', 'zh-CN'],
  };
}

beforeEach(() => {
  resetI18n();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('I18nScope', () => {
  it('provides a translated dashboard document title in both built-in locales', () => {
    expect(createI18nScope({ locale: 'en' }).translate('common.dashboard')).toBe('Dashboard');
    expect(createI18nScope({ locale: 'zh-CN' }).translate('common.dashboard')).toBe('工作台');
  });
  it('isolates locale and provider state across component trees', async () => {
    const firstProvider = createProvider('first', 'en');
    const secondProvider = createProvider('second', 'zh-CN');
    const firstChange = vi.fn();
    const secondChange = vi.fn();

    setLocale('zh-CN');

    render(I18nScopeTestHost, {
      props: {
        instance: 'first',
        locale: 'en',
        provider: firstProvider,
        nextLocale: 'zh-CN',
        onLocaleChange: firstChange,
      },
    });
    render(I18nScopeTestHost, {
      props: {
        instance: 'second',
        locale: 'zh-CN',
        provider: secondProvider,
        nextLocale: 'en',
        onLocaleChange: secondChange,
      },
    });

    expect(screen.getByTestId('first-direct').textContent).toBe('en|first:en:common.save');
    expect(screen.getByTestId('first-captured').textContent).toBe('en|first:en:common.save');
    expect(screen.getByTestId('second-direct').textContent).toBe('zh-CN|second:zh-CN:common.save');

    await fireEvent.click(screen.getByTestId('first-change'));

    await waitFor(() => {
      expect(screen.getByTestId('first-direct').textContent).toBe('zh-CN|first:zh-CN:common.save');
      expect(screen.getByTestId('second-direct').textContent).toBe('zh-CN|second:zh-CN:common.save');
      expect(firstChange).toHaveBeenCalledWith('zh-CN');
      expect(secondChange).not.toHaveBeenCalled();
    });

    expect(getLocale()).toBe('zh-CN');
  });

  it('keeps async callbacks bound to the scope captured during initialization', async () => {
    const firstProvider = createProvider('first', 'en');
    const secondProvider = createProvider('second', 'zh-CN');

    render(I18nScopeTestHost, {
      props: {
        instance: 'first',
        locale: 'en',
        provider: firstProvider,
        nextLocale: 'zh-CN',
      },
    });
    render(I18nScopeTestHost, {
      props: {
        instance: 'second',
        locale: 'zh-CN',
        provider: secondProvider,
        nextLocale: 'en',
      },
    });

    await fireEvent.click(screen.getByTestId('second-change-later'));

    await waitFor(() => {
      expect(screen.getByTestId('second-captured').textContent).toBe('en|second:en:common.save');
      expect(screen.getByTestId('first-captured').textContent).toBe('en|first:en:common.save');
    });
  });

  it('auto-detects the browser locale for every unconfigured tree without reading legacy state', () => {
    const browserLanguage = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
    setLocale('en');

    render(I18nScopeTestHost, {
      props: { instance: 'detected-first', nextLocale: 'en' },
    });
    browserLanguage.mockReturnValue('en-US');
    render(I18nScopeTestHost, {
      props: { instance: 'detected-second', nextLocale: 'en' },
    });

    expect(screen.getByTestId('detected-first-direct').textContent).toBe('zh-CN|保存');
    expect(screen.getByTestId('detected-second-direct').textContent).toBe('en|Save');
    expect(getLocale()).toBe('en');
  });

  it('uses explicit locale and provider locale before browser detection', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
    const provider = createProvider('provider', 'en');

    render(I18nScopeTestHost, {
      props: { instance: 'provider-default', provider },
    });
    render(I18nScopeTestHost, {
      props: { instance: 'explicit', locale: 'en' },
    });

    expect(screen.getByTestId('provider-default-direct').textContent).toBe('en|provider:en:common.save');
    expect(screen.getByTestId('explicit-direct').textContent).toBe('en|Save');
  });

  it('defaults an unconfigured server scope to English without reading legacy locale state', () => {
    setLocale('zh-CN');
    vi.stubGlobal('navigator', undefined);

    const scope = createI18nScope();

    expect(scope.locale).toBe('en');
    expect(scope.translate('common.save')).toBe('Save');
    expect(getLocale()).toBe('zh-CN');
  });

  it('uses the detected browser locale and treats owner updates differently from tree changes', async () => {
    const onLocaleChange = vi.fn();
    const provider = createProvider('owner', 'en');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US']);

    const defaultView = render(I18nScopeTestHost, {
      props: { instance: 'default' },
    });
    expect(screen.getByTestId('default-direct').textContent).toBe('en|Save');
    defaultView.unmount();

    const view = render(I18nScopeTestHost, {
      props: {
        instance: 'owner',
        locale: 'en',
        provider,
        nextLocale: 'en',
        onLocaleChange,
      },
    });

    await view.rerender({
      instance: 'owner',
      locale: 'zh-CN',
      provider,
      nextLocale: 'en',
      onLocaleChange,
    });

    await waitFor(() => {
      expect(screen.getByTestId('owner-direct').textContent).toBe('zh-CN|owner:zh-CN:common.save');
    });
    expect(onLocaleChange).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId('owner-change'));

    await waitFor(() => {
      expect(screen.getByTestId('owner-direct').textContent).toBe('en|owner:en:common.save');
      expect(onLocaleChange).toHaveBeenCalledWith('en');
    });
  });

  it('resets a cleared controlled locale to the browser locale without emitting a tree change', async () => {
    const onLocaleChange = vi.fn();
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
    const view = render(I18nScopeTestHost, {
      props: {
        instance: 'cleared',
        locale: 'zh-CN',
        onLocaleChange,
      },
    });

    expect(screen.getByTestId('cleared-direct').textContent).toBe('zh-CN|保存');

    await view.rerender({
      instance: 'cleared',
      locale: undefined,
      onLocaleChange,
    });

    await waitFor(() => {
      expect(screen.getByTestId('cleared-direct').textContent).toBe('zh-CN|保存');
    });
    expect(onLocaleChange).not.toHaveBeenCalled();
  });
});
