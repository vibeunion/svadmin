import { render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import SvarGridWidget from './components/SvarGridWidget.svelte';
import { resolveSurfaceMessages, type SurfaceMessages } from './localization.js';
import { SVAR_SURFACE_CONTEXT, type SvarSurfaceContext } from './svar-context.js';
import type { SurfaceDataError, SurfaceWidgetDataState } from './types.js';

const props = {
  title: 'Products',
  columns: [{ field: 'name', label: 'Product' }],
};

function failure(code: SurfaceDataError['code']): SurfaceWidgetDataState {
  return {
    status: 'error', sourceId: 'products',
    error: { code, sourceId: 'products', message: 'PRIVATE grid diagnostic' },
  };
}

function host() {
  // 错误分支不应挂载引擎；替身被调用会使测试直接失败。
  const Grid = vi.fn<SvarSurfaceContext['Grid']>(() => { throw new Error('Grid mounted during failure'); });
  const Theme = vi.fn<SvarSurfaceContext['Theme']>(() => { throw new Error('Theme mounted during failure'); });
  const context = new Map([[SVAR_SURFACE_CONTEXT, { Grid, Theme, scopeKey: 0 } satisfies SvarSurfaceContext]]);
  return { context, Grid, Theme };
}

const cases = [
  { code: 'access_denied', message: 'accessDenied' },
  { code: 'access_check_failed', message: 'tableUnavailable' },
  { code: 'provider_failed', message: 'tableUnavailable' },
  { code: 'provider_result_not_json', message: 'tableInvalidData' },
  { code: 'binding_pointer_not_found', message: 'tableInvalidData' },
] as const;

describe.each([
  { locale: 'en', denied: 'Access denied', unavailable: 'Table data is unavailable', invalid: 'Table data is invalid' },
  { locale: 'zh-CN', denied: '无权访问', unavailable: '表格数据不可用', invalid: '表格数据无效' },
])('SvarGridWidget error feedback in $locale', ({ locale, denied, unavailable, invalid }) => {
  test.each(cases)('renders safe $code feedback without mounting the engine', ({ code, message }) => {
    const h = host();
    const expected = { accessDenied: denied, tableUnavailable: unavailable, tableInvalidData: invalid };
    render(SvarGridWidget, {
      props: { widgetId: 'products', props, data: failure(code), locale },
      context: h.context,
    });

    expect(screen.getByRole('alert').textContent).toBe(expected[message]);
    expect(document.body.innerHTML).not.toContain('PRIVATE grid diagnostic');
    expect(h.Grid).not.toHaveBeenCalled();
    expect(h.Theme).not.toHaveBeenCalled();
  });

  test('accepts legacy complete messages without the new permission label', () => {
    const { accessDenied, ...legacyMessages } = resolveSurfaceMessages(locale);
    const messages: SurfaceMessages = legacyMessages;
    const h = host();
    render(SvarGridWidget, {
      props: { widgetId: 'products', props, data: failure('access_denied'), locale, messages },
      context: h.context,
    });
    expect(accessDenied).toBe(denied);
    expect(screen.getByRole('alert').textContent).toBe(denied);
  });

  test('uses host messages and updates feedback when the error changes', async () => {
    const h = host();
    const messages = resolveSurfaceMessages(locale, {
      accessDenied: 'Request access from your administrator',
      tableUnavailable: 'Try loading the table again',
      tableInvalidData: 'Contact support about this table',
    });
    const view = render(SvarGridWidget, {
      props: { widgetId: 'products', props, data: failure('access_denied'), locale, messages },
      context: h.context,
    });
    expect(screen.getByRole('alert').textContent).toBe(messages.accessDenied);
    await view.rerender({ data: failure('provider_failed') });
    expect(screen.getByRole('alert').textContent).toBe(messages.tableUnavailable);
    await view.rerender({ data: failure('binding_pointer_not_found') });
    expect(screen.getByRole('alert').textContent).toBe(messages.tableInvalidData);
    expect(document.body.innerHTML).not.toContain('PRIVATE grid diagnostic');
    expect(h.Grid).not.toHaveBeenCalled();
    expect(h.Theme).not.toHaveBeenCalled();
  });

  test('keeps missing engine configuration separate from data failures', () => {
    render(SvarGridWidget, { props: { widgetId: 'products', props, data: failure('access_denied'), locale } });
    expect(screen.getByRole('alert').textContent).toBe(locale === 'en'
      ? 'The host has not configured the SVAR engine'
      : '宿主尚未配置 SVAR 引擎');
    expect(document.body.innerHTML).not.toContain('PRIVATE grid diagnostic');
  });
});
