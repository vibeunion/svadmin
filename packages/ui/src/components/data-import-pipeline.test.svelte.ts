import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DataImportPipeline from './DataImportPipeline.svelte';

describe('DataImportPipeline', () => {
  const targetFields = [
    { name: 'name', label: '姓名', required: true },
    { name: 'email', label: '邮箱', required: true },
    { name: 'score', label: '积分', required: false },
  ];

  const sampleInitialRows = [
    { name: '张三', email: 'zhangsan@test.com', score: '95' },
    { name: '', email: 'lisi@test.com', score: '88' },
  ];

  it('renders initial step 1 with paste area when no initialRows provided', () => {
    render(DataImportPipeline, {
      props: {
        targetFields,
      },
    });

    expect(screen.getByText('批量数据智能导入流水线')).toBeTruthy();
    expect(screen.getByText('粘贴 CSV 文本或选择文件')).toBeTruthy();
  });

  it('steps directly to mapping or validation when initialRows provided', () => {
    render(DataImportPipeline, {
      props: {
        targetFields,
        initialRows: sampleInitialRows,
      },
    });

    expect(screen.getByText('进入数据质检与纠错 (2 条)')).toBeTruthy();
  });

  it('allows navigation from mapping to validation and displays error stats', async () => {
    render(DataImportPipeline, {
      props: {
        targetFields,
        initialRows: sampleInitialRows,
      },
    });

    const proceedBtn = screen.getByText('进入数据质检与纠错 (2 条)');
    await fireEvent.click(proceedBtn);

    expect(screen.getByText('总导入记录')).toBeTruthy();
    expect(screen.getByText('仅看异常 (1)')).toBeTruthy();
  });

  it('executes import callback when confirming valid rows', async () => {
    const onimport = vi.fn().mockResolvedValue({ successCount: 1, failCount: 0 });
    const cleanRows = [
      { name: '王五', email: 'wangwu@test.com', score: '100' },
    ];

    render(DataImportPipeline, {
      props: {
        targetFields,
        initialRows: cleanRows,
        onimport,
      },
    });

    const proceedBtn = screen.getByText('进入数据质检与纠错 (1 条)');
    await fireEvent.click(proceedBtn);

    const importBtn = screen.getByText('确认导入全部合规数据 (1 条)');
    await fireEvent.click(importBtn);

    expect(onimport).toHaveBeenCalled();
  });
});
