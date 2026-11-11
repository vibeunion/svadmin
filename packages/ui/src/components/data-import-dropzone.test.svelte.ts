import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataImportDropzone from './DataImportDropzone.svelte';

describe('DataImportDropzone Component', () => {
  it('renders dropzone title, extension tips and template button', () => {
    const onDownload = vi.fn();
    const { container } = render(DataImportDropzone, {
      props: {
        resourceName: '用户清单',
        templateName: '用户模板.xlsx',
        ondownloadtemplate: onDownload,
      },
    });

    const root = container.querySelector('[data-svadmin-component="DataImportDropzone"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('导入 用户清单');
    expect(container.textContent).toContain('下载导入模板 (用户模板.xlsx)');
    expect(container.textContent).toContain('.xlsx / .xls / .csv');
  });

  it('validates file extension against acceptExtensions whitelist', async () => {
    const onSelect = vi.fn();
    const { container } = render(DataImportDropzone, {
      props: {
        acceptExtensions: ['.xlsx', '.csv'],
        onfileselect: onSelect,
      },
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    if (input) {
      // Simulate illegal file (.pdf)
      const invalidFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      await fireEvent.change(input, { target: { files: [invalidFile] } });
      expect(container.textContent).toContain('文件格式不正确');
      expect(onSelect).not.toHaveBeenCalled();

      // Simulate valid file (.xlsx)
      const validFile = new File(['dummy content'], 'orders.xlsx', { type: 'application/vnd.ms-excel' });
      await fireEvent.change(input, { target: { files: [validFile] } });
      expect(container.textContent).toContain('orders.xlsx');
      expect(container.textContent).toContain('已就绪');
      expect(onSelect).toHaveBeenCalledWith(validFile);
    }
  });
});
