import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from 'svelte/compiler';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/svelte';
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

    await waitFor(() => expect(container.textContent).toContain('dashboard.metrics.revenue'));
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

  it('父层切换目标语言时保留其他语言草稿', async () => {
    const { getByDisplayValue, rerender } = render(I18nStudio, { dictionaries: initialDictionaries });
    await fireEvent.input(getByDisplayValue('OK'), { target: { value: 'English draft' } });
    await rerender({ targetLocale: 'ja-JP' });
    await rerender({ targetLocale: 'en-US' });
    expect(getByDisplayValue('English draft')).toBeTruthy();
  });

  it('下拉切换语言使用该语言基线，父层仍可接管目标语言', async () => {
    const dictionaries = { ...initialDictionaries, 'ja-JP': { ...initialDictionaries['en-US'], 'common.ok': '了解' } };
    const { getAllByRole, getByRole, getByText, getByDisplayValue, rerender } = render(I18nStudio, { dictionaries });
    const target = getAllByRole('combobox')[1];
    expect(target).toBeTruthy();
    if (!target) throw new Error('缺少目标语言选择框');
    await fireEvent.change(target, { target: { value: 'ja-JP' } });
    await fireEvent.click(getByRole('button', { name: 'Modified' }));
    expect(getByText('No translation keys match the selected filters.')).toBeTruthy();
    await rerender({ targetLocale: 'fr-FR' });
    await fireEvent.click(getByRole('button', { name: 'All', exact: true }));
    expect(getAllByRole('columnheader').some((cell) => cell.textContent === 'Target: fr-FR')).toBe(true);
    await rerender({ targetLocale: 'en-US' });
    expect(getByDisplayValue('OK')).toBeTruthy();
  });

  it('保存更新基线，继续编辑不改变已保存字典', async () => {
    const onSave = vi.fn<(value: Record<string, Record<string, string>>) => void>();
    const { getByDisplayValue, getByRole, getByText } = render(I18nStudio, { dictionaries: initialDictionaries, onSave });
    await fireEvent.input(getByDisplayValue('OK'), { target: { value: 'Saved OK' } });
    await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
    const saved = onSave.mock.calls[0]?.[0];
    await fireEvent.click(getByRole('button', { name: 'Modified' }));
    expect(getByText('No translation keys match the selected filters.')).toBeTruthy();
    await fireEvent.click(getByRole('button', { name: 'All', exact: true }));
    await fireEvent.input(getByDisplayValue('Saved OK'), { target: { value: 'Next draft' } });
    expect(saved?.['en-US']?.['common.ok']).toBe('Saved OK');
    expect(initialDictionaries['en-US']['common.ok']).toBe('OK');
  });

  it('异步保存失败时显示错误并保留草稿', async () => {
    let rejectSave: ((error: Error) => void) | undefined;
    const onSave = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
    const { getByRole, getByDisplayValue, queryByRole } = render(I18nStudio, { dictionaries: initialDictionaries, onSave });
    const button = getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement;
    await fireEvent.input(getByDisplayValue('OK'), { target: { value: 'Retained draft' } });
    await fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(queryByRole('status')).toBeNull();
    rejectSave?.(new Error('offline'));
    await waitFor(() => expect(getByRole('alert').textContent).toContain('save failed'));
    expect(button.disabled).toBe(false);
    expect(getByDisplayValue('Retained draft')).toBeTruthy();
  });

  it.each(['resolve', 'reject'])('字典换入后忽略旧保存的 %s 结果', async (result) => {
    let finish: (() => void) | undefined;
    let fail: ((error: Error) => void) | undefined;
    const onSave = vi.fn(() => new Promise<void>((resolve, reject) => { finish = resolve; fail = reject; }));
    const { getByRole, queryByRole, getByText, rerender } = render(I18nStudio, { dictionaries: initialDictionaries, onSave });
    await fireEvent.click(getByRole('button', { name: 'Save Changes' }));
    await rerender({ dictionaries: { 'zh-CN': { 'common.ok': '确定' }, 'en-US': { 'common.ok': 'New data' } } });
    await act(() => {
      if (result === 'resolve') finish?.();
      else fail?.(new Error('old request failed'));
    });
    await fireEvent.click(getByRole('button', { name: 'Modified' }));
    expect(getByText('No translation keys match the selected filters.')).toBeTruthy();
    expect(queryByRole('status')).toBeNull();
    expect(queryByRole('alert')).toBeNull();
  });

  it.each(['["bad"]', '{"valid":"text","invalid":5}', '{"nested":{"key":"value"}}', 'null'])(
    '拒绝非扁平字符串字典 %s，且不部分导入', async (json) => {
      const onImport = vi.fn();
      const { getByRole, getByPlaceholderText, getByDisplayValue } = render(I18nStudio, { dictionaries: initialDictionaries, onImport });
      await fireEvent.click(getByRole('button', { name: 'Import JSON' }));
      await fireEvent.input(getByPlaceholderText(/"common.ok"/), { target: { value: json } });
      await fireEvent.click(getByRole('button', { name: 'Merge Import' }));
      expect(getByRole('alert').textContent).toContain('import failed');
      expect(onImport).not.toHaveBeenCalled();
      expect(getByDisplayValue('OK')).toBeTruthy();
    }
  );

  it('导入字符串字典并保持回调数据隔离', async () => {
    const onImport = vi.fn<(locale: string, value: Record<string, string>) => void>();
    const { getByRole, getByPlaceholderText, getByDisplayValue } = render(I18nStudio, { dictionaries: initialDictionaries, onImport });
    await fireEvent.click(getByRole('button', { name: 'Import JSON' }));
    await fireEvent.input(getByPlaceholderText(/"common.ok"/), { target: { value: '{"common.ok":"Imported"}' } });
    await fireEvent.click(getByRole('button', { name: 'Merge Import' }));
    await fireEvent.input(getByDisplayValue('Imported'), { target: { value: 'Next draft' } });
    expect(onImport.mock.calls[0]?.[1]['common.ok']).toBe('Imported');
  });

  for (const locale of ['', 'zh-cn/']) {
    it(`${locale || 'en'} 新增及相邻文档示例均可编译`, () => {
      const source = readFileSync(resolve(process.cwd(), `../../docs/src/content/docs/${locale}components/enterprise.md`), 'utf8');
      const examples = [...source.matchAll(/```svelte\n([\s\S]*?)\n```/g)]
        .map((match) => match[1] ?? '')
        .filter((code) => /import.*\b(?:I18nStudio|StepUpAuthModal|AuditSnapshotCapture|CannedResponsePicker)\b/.test(code));
      expect(examples).toHaveLength(4);
      for (const example of examples) expect(() => compile(example, { generate: 'client' })).not.toThrow();
    });
  }
});
