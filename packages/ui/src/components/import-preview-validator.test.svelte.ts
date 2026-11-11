import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ImportPreviewValidator, { type RowValidationError } from './ImportPreviewValidator.svelte';

describe('ImportPreviewValidator Component', () => {
  const columns = [
    { key: 'name', label: '姓名' },
    { key: 'email', label: '邮箱' },
  ];

  const rows = [
    { name: '张三', email: 'zhang@example.com' },
    { name: '李四', email: 'invalid-email' },
  ];

  const errors: RowValidationError[] = [
    { rowIndex: 1, field: 'email', message: '邮箱格式不正确' },
  ];

  it('renders summary stats and highlights error cells', () => {
    const { container } = render(ImportPreviewValidator, {
      props: {
        columns,
        rows,
        errors,
      },
    });

    const root = container.querySelector('[data-svadmin-component="ImportPreviewValidator"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('总待导入: 2 行');
    expect(container.textContent).toContain('1 行正常');
    expect(container.textContent).toContain('1 行格式异常');
    expect(container.textContent).toContain('邮箱格式不正确');
  });

  it('triggers onrowchange when user edits an invalid cell inline', async () => {
    const onRowChange = vi.fn();
    const { container } = render(ImportPreviewValidator, {
      props: {
        columns,
        rows,
        errors,
        onrowchange: onRowChange,
      },
    });

    const inputs = container.querySelectorAll('table input[type="text"]');
    const targetInput = inputs[3]; // second row, email column
    if (targetInput) {
      await fireEvent.change(targetInput, { target: { value: 'lisi@example.com' } });
      expect(onRowChange).toHaveBeenCalledWith(1, 'email', 'lisi@example.com');
    }
  });

  it('submits only valid rows when submit button is clicked', async () => {
    const onSubmit = vi.fn();
    const { container } = render(ImportPreviewValidator, {
      props: {
        columns,
        rows,
        errors,
        onsubmit: onSubmit,
      },
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('确认导入')
    );
    expect(submitBtn).toBeTruthy();
    if (submitBtn) {
      await fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledWith([rows[0]]);
    }
  });
});
