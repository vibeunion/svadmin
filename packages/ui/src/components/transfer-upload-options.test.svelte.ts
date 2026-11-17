import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Transfer from './Transfer.svelte';
import FileUpload from './FileUpload.svelte';

describe('Transfer and FileUpload option parity', () => {
  it('renders Transfer with data, titleText, and value/label items', () => {
    const testData = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
      { value: 'opt3', label: 'Option 3' },
    ];

    const view = render(Transfer, {
      data: testData,
      titleText: ['Source Title', 'Target Title'],
      targetKeys: ['opt3'],
      showSearch: true,
    });

    expect(view.container.textContent).toContain('Source Title');
    expect(view.container.textContent).toContain('Target Title');
    expect(view.container.textContent).toContain('Option 1');
    expect(view.container.textContent).toContain('Option 2');
    expect(view.container.textContent).toContain('Option 3');
  });

  it('hides left transfer buttons when oneWay is true', () => {
    const viewStandard = render(Transfer, {
      dataSource: [{ key: '1', title: 'Item 1' }],
      oneWay: false,
    });
    expect(viewStandard.container.querySelector('button[title="移除所选项"]')).not.toBeNull();
    expect(viewStandard.container.querySelector('button[title="全部移除"]')).not.toBeNull();

    const viewOneWay = render(Transfer, {
      dataSource: [{ key: '1', title: 'Item 1' }],
      oneWay: true,
    });
    expect(viewOneWay.container.querySelector('button[title="移除所选项"]')).toBeNull();
    expect(viewOneWay.container.querySelector('button[title="全部移除"]')).toBeNull();
    expect(viewOneWay.container.querySelector('button[title="转移所选项"]')).not.toBeNull();
  });

  it('respects showSearch={false} in Transfer', () => {
    const view = render(Transfer, {
      dataSource: [{ key: '1', title: 'Item 1' }],
      showSearch: false,
    });
    expect(view.container.querySelector('input[type="text"]')).toBeNull();
  });

  it('respects limit and showUploadList={false} in FileUpload', async () => {
    const view = render(FileUpload, {
      multiple: true,
      limit: 2,
      showUploadList: false,
    });

    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    const file1 = new File(['1'], 'test1.txt', { type: 'text/plain' });
    await fireEvent.change(input, { target: { files: [file1] } });

    expect(view.container.querySelector('.svadmin-file-upload-list')).toBeNull();
  });
});
