import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../test/legacy-locale';
import ExcelImportWizard, { type ExcelImportField } from './ExcelImportWizard.svelte';
import ExcelExportButton from './ExcelExportButton.svelte';

beforeEach(() => {
  setLocale('zh-CN');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const sampleFields: ExcelImportField[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'age', label: '年龄', type: 'number' },
  { name: 'email', label: '邮箱' },
];

describe('ExcelSuite', () => {
  describe('ExcelImportWizard', () => {
    it('renders initial upload step and loads sample data', async () => {
      const { container } = render(ExcelImportWizard, {
        fields: sampleFields,
      });

      const root = container.querySelector('[data-svadmin-component="ExcelImportWizard"]');
      expect(root).toBeTruthy();
      expect(screen.getByText('拖拽 CSV 文件至此处，或点击选择文件')).toBeTruthy();

      const sampleBtn = screen.getByText('载入测试样本数据');
      await fireEvent.click(sampleBtn);

      // 进入步骤 2: 字段映射
      expect(screen.getByText(/已解析文件：/)).toBeTruthy();
      expect(screen.getByText('自动匹配')).toBeTruthy();
      expect(screen.getByText('下一步：校验预览')).toBeTruthy();
    });

    it('advances through steps to validation and import submission', async () => {
      const onimport = vi.fn().mockResolvedValue(undefined);
      render(ExcelImportWizard, {
        fields: sampleFields,
        onimport,
      });

      // 载入样本
      const sampleBtn = screen.getByText('载入测试样本数据');
      await fireEvent.click(sampleBtn);

      // 下一步到校验预览
      const nextBtn = screen.getByText('下一步：校验预览');
      await fireEvent.click(nextBtn);

      expect(screen.getByText(/校验通过/)).toBeTruthy();

      // 点击确认导入按钮
      const importBtns = screen.getAllByText('确认导入');
      const submitBtn = importBtns[importBtns.length - 1];
      if (submitBtn) {
        await fireEvent.click(submitBtn);
      }

      expect(onimport).toHaveBeenCalledTimes(1);
    });
  });

  describe('ExcelExportButton', () => {
    it('renders export button with icon and default text', () => {
      const { container } = render(ExcelExportButton, {
        columns: [
          { key: 'name', label: '姓名' },
          { key: 'score', label: '分数' },
        ],
        dataSource: [{ name: '小明', score: 100 }],
      });

      const btn = container.querySelector('[data-svadmin-component="ExcelExportButton"]');
      expect(btn).toBeTruthy();
      expect(screen.getByText('导出数据')).toBeTruthy();
    });

    it('triggers blob download and onexport callback on click', async () => {
      const onexport = vi.fn();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const { container } = render(ExcelExportButton, {
        columns: [
          { key: 'name', label: '姓名' },
          { key: 'score', label: '分数' },
        ],
        dataSource: [{ name: '小明', score: 100 }],
        filename: 'scores.csv',
        onexport,
      });

      const btn = container.querySelector('button');
      if (btn) {
        await fireEvent.click(btn);
        expect(createObjectURLMock).toHaveBeenCalled();
        expect(onexport).toHaveBeenCalledWith(1);
      }
    });
  });
});
