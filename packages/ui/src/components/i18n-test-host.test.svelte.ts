import { fireEvent, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
import AsyncTranslationLeaf from '../../test/fixtures/AsyncTranslationLeaf.svelte';
import FilterBuilderLocale from './FilterBuilderLocale.test.svelte';

describe('test i18n scope host', () => {
  it('isolates initial and changed locales across simultaneous trees and deferred callbacks', async () => {
    const english = renderWithI18n(AsyncTranslationLeaf, { instance: 'english' });
    const chinese = renderWithI18n(AsyncTranslationLeaf, { instance: 'chinese' }, 'zh-CN');
    const first = within(english.container);
    const second = within(chinese.container);

    await fireEvent.click(first.getByTestId('english-translate'));
    await fireEvent.click(second.getByTestId('chinese-translate'));
    expect(first.getByTestId('english-translation').textContent).toBe('Save');
    expect(second.getByTestId('chinese-translation').textContent).toBe('保存');

    await english.wrapper.setLocale('zh-CN');
    await fireEvent.click(first.getByTestId('english-translate'));
    expect(first.getByTestId('english-translation').textContent).toBe('保存');
    await chinese.wrapper.setLocale('en');
    await fireEvent.click(second.getByTestId('chinese-translate'));
    expect(second.getByTestId('chinese-translation').textContent).toBe('Save');
    expect(first.getByTestId('english-translation').textContent).toBe('保存');
  });

  it('preserves the scope and component state on rerender and does not leak locale after unmount', async () => {
    const view = renderWithI18n(AsyncTranslationLeaf, { instance: 'first' }, 'zh-CN');
    await fireEvent.click(view.getByTestId('first-translate'));
    await view.rerender({ instance: 'renamed' });
    expect(view.getByTestId('renamed-translation').textContent).toBe('保存');
    await fireEvent.click(view.getByTestId('renamed-translate'));
    expect(view.getByTestId('renamed-translation').textContent).toBe('保存');
    view.unmount();

    const fresh = renderWithI18n(AsyncTranslationLeaf, { instance: 'fresh' });
    await fireEvent.click(fresh.getByTestId('fresh-translate'));
    expect(fresh.getByTestId('fresh-translation').textContent).toBe('Save');
  });

  it('respects an explicitly provided descendant scope', async () => {
    const view = renderWithI18n(FilterBuilderLocale, { locale: 'zh-CN', fields: [] });
    expect(view.container.textContent).toContain('暂无筛选条件');
    await view.wrapper.setLocale('en');
    expect(view.container.textContent).toContain('暂无筛选条件');
  });
});
