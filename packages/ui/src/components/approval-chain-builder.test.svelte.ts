import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ApprovalChainBuilder from './ApprovalChainBuilder.svelte';

describe('ApprovalChainBuilder suite', () => {
  it('renders approval flow nodes and allows node selection', async () => {
    const onChange = vi.fn();
    const view = render(ApprovalChainBuilder, {
      onChange,
    });

    expect(view.container.textContent).toContain('发起人');
    expect(view.container.textContent).toContain('直属部门主管');
    expect(view.container.textContent).toContain('财务复核');

    const approverCard = Array.from(view.container.querySelectorAll('[role="button"]')).find((b) =>
      b.textContent?.includes('直属部门主管'),
    );
    expect(approverCard).toBeTruthy();
    if (approverCard) {
      await fireEvent.click(approverCard);
      expect(view.container.textContent).toContain('Node Properties');
    }
  });
});
