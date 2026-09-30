import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ConfigurationPage from './ConfigurationPage.svelte';
import ConfigurationExample from '../../stories/ConfigurationExample.svelte';

describe('ConfigurationPage', () => {
  it('renders one page heading and no empty footer', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Settings</p>' }));
    const { container } = render(ConfigurationPage, { title: 'Configuration', children });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Configuration');
    expect(container.querySelector('footer')).toBeNull();
  });

  it('preserves edits until saved and allows reverting to the saved values', async () => {
    render(ConfigurationExample);
    const reviewer = screen.getByRole('combobox', { name: '审核人' }) as HTMLSelectElement;
    const save = screen.getByRole('button', { name: '保存签名配置' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await userEvent.selectOptions(reviewer, '乙');
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('有未保存的修改'));
    expect(save.disabled).toBe(false);
    await fireEvent.click(save);
    expect(screen.getByRole('status').textContent).toBe('已保存至本次演示');
    await userEvent.selectOptions(reviewer, '甲');
    await fireEvent.click(screen.getByRole('button', { name: '撤销修改' }));
    expect(reviewer.value).toBe('乙');
    expect(save.disabled).toBe(true);
  });
});
