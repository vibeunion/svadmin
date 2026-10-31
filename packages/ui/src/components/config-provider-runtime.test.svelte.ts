import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { addTranslations, resetI18n } from '@svadmin/core/i18n';
import { setLocale } from '../../test/legacy-locale';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from './DatePicker.svelte';
import RuntimeHost from './config-provider-runtime.test-host.svelte';

afterEach(() => {
  cleanup();
  resetI18n();
});

describe('ConfigProvider runtime updates', () => {
  it('pushes size, density and locale changes into consumers', async () => {
    const view = render(RuntimeHost, { componentSize: 'md', density: 'default', locale: 'en' });
    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-size')).toBe('default');
    expect(screen.getByRole('button', { name: 'Pinned' }).getAttribute('data-size')).toBe('lg');
    expect(screen.getByRole('textbox', { name: 'Name' }).getAttribute('data-size')).toBe('default');
    expect(screen.getByRole('combobox', { name: 'Choice' }).getAttribute('data-size')).toBe('default');
    expect(sized('Status').getAttribute('data-size')).toBe('default');
    expect(sized('Label').getAttribute('data-size')).toBe('default');
    expect(screen.getByRole('button', { name: 'Next month' })).toBeTruthy();
    expect(view.container.querySelector('.svadmin-config-provider')?.getAttribute('lang')).toBe('en');

    await view.rerender({ componentSize: 'sm', density: 'compact', locale: 'zh-CN' });

    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-size')).toBe('sm');
    expect(screen.getByRole('button', { name: 'Pinned' }).getAttribute('data-size')).toBe('lg');
    expect(screen.getByRole('textbox', { name: 'Name' }).getAttribute('data-size')).toBe('compact');
    expect(screen.getByRole('combobox', { name: 'Choice' }).getAttribute('data-size')).toBe('compact');
    expect(sized('Status').getAttribute('data-size')).toBe('compact');
    expect(sized('Label').getAttribute('data-size')).toBe('compact');
    expect(screen.getByRole('button', { name: '下个月' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull();
    expect(view.container.querySelector('.svadmin-config-provider')?.getAttribute('lang')).toBe('zh-CN');

    await fireEvent.click(screen.getByRole('button', { name: '2026-09-20' }));
    expect(screen.getByRole('button', { name: '上一个' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '下一个' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '清除' })).toBeTruthy();
    expect(panelText()).toContain('周一');
  });

  it('lets a DatePicker locale prop override the provider', async () => {
    render(RuntimeHost, { locale: 'en', dateLocale: 'zh-CN' });
    await fireEvent.click(screen.getByRole('button', { name: '2026-09-20' }));
    expect(screen.getByRole('button', { name: '清除' })).toBeTruthy();
    expect(panelText()).toContain('周一');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});

describe('DatePicker locale', () => {
  it('keeps English copy for the default locale and an explicit placeholder', async () => {
    setLocale('en');
    const view = render(DatePicker, { panel: true, placeholder: 'Pick a day' });
    expect(view.getByRole('button', { name: 'Pick a day' })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: 'Pick a day' }));
    expect(view.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(panelText()).toContain('Mon');
  });

  it('follows i18n when no provider is present, including host overrides', async () => {
    setLocale('zh-CN');
    addTranslations('zh-CN', { 'datePicker.clear': '清空日期' });
    const view = render(DatePicker, { panel: true, value: '2026-09-20' });
    await fireEvent.click(view.getByRole('button', { name: '2026-09-20' }));
    expect(view.getByRole('button', { name: '上一个' })).toBeTruthy();
    expect(view.getByRole('button', { name: '清空日期' })).toBeTruthy();
    expect(panelText()).toContain('周一');

    cleanup();
    setLocale('en');
    const english = render(DatePicker, { panel: true });
    expect(english.getByRole('button', { name: 'Select date' })).toBeTruthy();
  });

  it('updates panel copy when the provider locale changes while the panel is open', async () => {
    const view = render(RuntimeHost, { locale: 'en' });
    await fireEvent.click(screen.getByRole('button', { name: '2026-09-20' }));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(panelText()).toContain('Mon');

    await view.rerender({ locale: 'zh-CN' });
    expect(screen.getByRole('button', { name: '上一个' })).toBeTruthy();
    expect(panelText()).toContain('周一');
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
  });
});

function sized(text: string): HTMLElement {
  const node = screen.getByText(text);
  return (node.closest('[data-size]') ?? node) as HTMLElement;
}

function panelText(): string {
  return document.querySelector('.svadmin-date-picker-panel')?.textContent ?? '';
}
