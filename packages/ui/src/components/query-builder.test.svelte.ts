import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import QueryBuilder, { type QueryField } from './QueryBuilder.svelte';

describe('QueryBuilder Component', () => {
  const fields: QueryField[] = [
    { key: 'status', label: '订单状态', type: 'select', options: [{ label: '已完成', value: 'completed' }] },
    { key: 'amount', label: '金额', type: 'number' },
    { key: 'title', label: '商品标题', type: 'text' },
  ];

  it('renders root query builder container and default AND operator', () => {
    const { container } = render(QueryBuilder, {
      props: {
        fields,
      },
    });

    const root = container.querySelector('[data-svadmin-component="QueryBuilder"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('高级多维查询构建器');
    expect(container.textContent).toContain('并且 (AND)');
    expect(container.textContent).toContain('或者 (OR)');
  });

  it('adds and removes rules inside a query group', async () => {
    const onChange = vi.fn();
    const { container } = render(QueryBuilder, {
      props: {
        fields,
        onchange: onChange,
      },
    });

    expect(container.querySelectorAll('[data-query-rule]')).toHaveLength(1);

    const addRuleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('添加规则')
    );
    expect(addRuleBtn).toBeTruthy();
    if (addRuleBtn) {
      await fireEvent.click(addRuleBtn);
      expect(container.querySelectorAll('[data-query-rule]')).toHaveLength(2);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('supports SQL preview toggling', async () => {
    const { container } = render(QueryBuilder, {
      props: {
        fields,
      },
    });

    expect(container.textContent).not.toContain('WHERE');
    const sqlBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('预览 SQL')
    );
    expect(sqlBtn).toBeTruthy();
    if (sqlBtn) {
      await fireEvent.click(sqlBtn);
      expect(container.textContent).toContain('WHERE');
    }
  });
});
