import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CheckCard from './CheckCard.svelte';

describe('CheckCard Component', () => {
  it('renders check card with title, description, and component marker', () => {
    const { container } = render(CheckCard, {
      props: {
        title: '专业企业版',
        description: '适合 50 人以上规模团队，支持无限自动化工作流与多租户隔离',
        checked: false,
      },
    });

    const root = container.querySelector('[data-svadmin-component="CheckCard"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('专业企业版');
    expect(container.textContent).toContain('适合 50 人以上规模团队');
    expect(root?.getAttribute('aria-checked')).toBe('false');
  });

  it('triggers onchange when clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckCard, {
      props: {
        title: '选择卡片测试',
        checked: false,
        onchange,
      },
    });

    const root = container.querySelector('[data-svadmin-component="CheckCard"]');
    expect(root).toBeTruthy();
    if (root) {
      await fireEvent.click(root);
      expect(onchange).toHaveBeenCalledWith(true);
    }
  });

  it('does not toggle when disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckCard, {
      props: {
        title: '禁用卡片',
        disabled: true,
        checked: false,
        onchange,
      },
    });

    const root = container.querySelector('[data-svadmin-component="CheckCard"]');
    if (root) {
      await fireEvent.click(root);
      expect(onchange).not.toHaveBeenCalled();
    }
  });
});
