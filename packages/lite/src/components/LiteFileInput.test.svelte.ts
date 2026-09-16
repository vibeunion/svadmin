import { fireEvent, render, screen } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import { afterEach, describe, expect, it } from 'vitest';
import LiteFileInput from './LiteFileInput.svelte';

afterEach(() => {
  setLocale('en');
});

describe('LiteFileInput', () => {
  it('renders application-localized file picker copy while retaining native form attributes', () => {
    setLocale('zh-CN');
    render(LiteFileInput, {
      id: 'attachment',
      name: 'attachment',
      accept: '.csv',
      required: true,
      multiple: true,
      'aria-label': '附件',
    });

    const input = screen.getByLabelText<HTMLInputElement>('附件');
    expect(input.type).toBe('file');
    expect(input.name).toBe('attachment');
    expect(input.accept).toBe('.csv');
    expect(input.required).toBe(true);
    expect(input.multiple).toBe(true);
    expect(screen.getByText('选择文件')).toBeTruthy();
    expect(screen.getByText('未选择文件')).toBeTruthy();
  });

  it('shows the selected filename and translated multiple-file count', async () => {
    setLocale('zh-CN');
    render(LiteFileInput, { multiple: true, 'aria-label': '附件' });

    const input = screen.getByLabelText<HTMLInputElement>('附件');
    const files = new DataTransfer();
    files.items.add(new File(['first'], 'first.csv'));
    await fireEvent.change(input, { target: { files: files.files } });
    expect(screen.getByText('first.csv')).toBeTruthy();

    files.items.add(new File(['second'], 'second.csv'));
    await fireEvent.change(input, { target: { files: files.files } });
    expect(screen.getByText('已选择 2 个文件')).toBeTruthy();
  });
});
