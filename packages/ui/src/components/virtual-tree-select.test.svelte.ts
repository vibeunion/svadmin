import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import VirtualTreeSelect, { type VirtualTreeNode } from './VirtualTreeSelect.svelte';

const testNodes: VirtualTreeNode[] = [
  {
    value: 'dept-1',
    label: 'Headquarters',
    children: [
      {
        value: 'dept-1-1',
        label: 'Engineering',
        children: [
          { value: 'team-frontend', label: 'Frontend Team' },
          { value: 'team-backend', label: 'Backend Team' },
        ],
      },
      {
        value: 'dept-1-2',
        label: 'Operations',
      },
    ],
  },
  {
    value: 'dept-2',
    label: 'Sales Division',
    children: [
      { value: 'team-domestic', label: 'Domestic Sales' },
      { value: 'team-overseas', label: 'Overseas Sales' },
    ],
  },
];

describe('VirtualTreeSelect Component', () => {
  it('renders trigger button and placeholder', () => {
    const { container } = render(VirtualTreeSelect, {
      props: {
        options: testNodes,
        placeholder: 'Select a department...',
      },
    });

    const root = container.querySelector('[data-svadmin-component="VirtualTreeSelect"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('Select a department...');
  });

  it('opens dropdown and displays root nodes on trigger click', async () => {
    const { container } = render(VirtualTreeSelect, {
      props: {
        options: testNodes,
      },
    });

    const triggerBtn = container.querySelector('button');
    if (!triggerBtn) throw new Error('Trigger button not found');

    await fireEvent.click(triggerBtn);

    expect(container.textContent).toContain('Headquarters');
    expect(container.textContent).toContain('Sales Division');
  });

  it('selects single node and triggers onchange', async () => {
    const onchangeMock = vi.fn();
    const { container } = render(VirtualTreeSelect, {
      props: {
        options: testNodes,
        onchange: onchangeMock,
      },
    });

    const triggerBtn = container.querySelector('button');
    if (!triggerBtn) throw new Error('Trigger button not found');
    await fireEvent.click(triggerBtn);

    const nodeItem = Array.from(container.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent?.includes('Sales Division')
    );
    expect(nodeItem).toBeDefined();

    if (nodeItem) {
      await fireEvent.click(nodeItem);
      expect(onchangeMock).toHaveBeenCalledWith('dept-2');
    }
  });

  it('handles multiple selection and tags display', async () => {
    const onchangeMock = vi.fn();
    const { container } = render(VirtualTreeSelect, {
      props: {
        options: testNodes,
        multiple: true,
        value: ['team-frontend', 'team-backend'],
        onchange: onchangeMock,
      },
    });

    expect(container.textContent).toContain('Frontend Team');
    expect(container.textContent).toContain('Backend Team');
  });
});
