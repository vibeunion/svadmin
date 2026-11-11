import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SqlConsole from './SqlConsole.svelte';

describe('SqlConsole suite', () => {
  it('renders SQL query and results table', () => {
    const view = render(SqlConsole, {
      initialSql: 'SELECT * FROM orders;',
    });

    expect(view.container.textContent).toContain('SELECT');
    expect(view.container.textContent).toContain('ORD-2026-901');
    expect(view.container.textContent).toContain('4850');
  });

  it('blocks destructive SQL operations such as DROP and DELETE', async () => {
    const onExecuteQuery = vi.fn();
    const view = render(SqlConsole, {
      initialSql: 'DROP TABLE users;',
      onExecuteQuery,
    });

    // Alert message should appear
    expect(view.container.textContent).toContain('Safety Block');
    const runBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('执行查询') || b.textContent?.includes('Run Query'),
    );
    expect(runBtn).toBeTruthy();
    expect(runBtn?.disabled).toBe(true);

    if (runBtn) {
      await fireEvent.click(runBtn);
      expect(onExecuteQuery).not.toHaveBeenCalled();
    }
  });
});
