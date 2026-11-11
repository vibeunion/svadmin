import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { applyLocalePatch, getLocalePatch, clearLocalePatches, translateDynamic } from './useDynamicLocale.svelte.js';
import I18nLanguagePackEditor from './I18nLanguagePackEditor.svelte';

describe('useDynamicLocale and I18nLanguagePackEditor suite', () => {
  it('applies runtime patches and translates dynamically', () => {
    clearLocalePatches();
    applyLocalePatch('en', { 'custom.greeting': 'Welcome aboard!' });

    expect(translateDynamic('custom.greeting', 'en')).toBe('Welcome aboard!');
    expect(translateDynamic('unknown.key', 'en', 'Fallback')).toBe('Fallback');
    expect(getLocalePatch('en')['custom.greeting']).toBe('Welcome aboard!');
  });

  it('renders I18nLanguagePackEditor and saves patch on publish', async () => {
    const onSavePatch = vi.fn();
    const view = render(I18nLanguagePackEditor, {
      targetLocale: 'zh-CN',
      onSavePatch,
    });

    expect(view.container.textContent).toContain('common.save');
    expect(view.container.textContent).toContain('common.cancel');

    const publishBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('发布热补丁') || b.textContent?.includes('Publish'),
    );
    expect(publishBtn).toBeTruthy();
    if (publishBtn) {
      await fireEvent.click(publishBtn);
      expect(onSavePatch).toHaveBeenCalledWith(
        'zh-CN',
        expect.objectContaining({ 'common.save': '保存' }),
      );
    }
  });
});
