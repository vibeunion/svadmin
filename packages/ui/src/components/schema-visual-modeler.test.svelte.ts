import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SchemaVisualModeler from './SchemaVisualModeler.svelte';

describe('SchemaVisualModeler suite', () => {
  it('renders SchemaVisualModeler, adds fields, and generates code', async () => {
    const view = render(SchemaVisualModeler, {
      resourceName: 'Product',
      initialFields: [
        { key: 'id', label: 'ID', type: 'number', required: true, filterable: true, sortable: true },
      ],
    });

    expect(view.container.textContent).toContain('Resource Schema Modeler');
    expect(view.container.querySelectorAll('tbody tr').length).toBe(1);

    // Add field
    const addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('添加字段') || b.textContent?.includes('Add Field'),
    );
    expect(addBtn).toBeTruthy();
    if (addBtn) {
      await fireEvent.click(addBtn);
      expect(view.container.querySelectorAll('tbody tr').length).toBe(2);
    }

    // Switch to code tab
    const codeTab = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('生成的代码') || b.textContent?.includes('Code'),
    );
    expect(codeTab).toBeTruthy();
    if (codeTab) {
      await fireEvent.click(codeTab);
      expect(view.container.textContent).toContain('defineResource');
      expect(view.container.textContent).toContain("name: 'product'");
    }
  });
});
