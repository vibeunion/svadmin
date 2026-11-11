import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import RuleExpressionBuilder from './RuleExpressionBuilder.svelte';

describe('RuleExpressionBuilder suite', () => {
  it('renders expression preview and root combinator', () => {
    const view = render(RuleExpressionBuilder);
    expect(view.container.textContent).toContain('5000');
    expect(view.container.textContent).toContain('VIP, SVIP');
    expect(view.container.textContent).toContain('AND');
  });

  it('adds a leaf rule and notifies change', async () => {
    const onChange = vi.fn();
    const view = render(RuleExpressionBuilder, {
      onChange,
    });

    const addRuleBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('添加规则') || b.textContent?.includes('Add Rule'),
    );
    expect(addRuleBtn).toBeTruthy();
    if (addRuleBtn) {
      await fireEvent.click(addRuleBtn);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
