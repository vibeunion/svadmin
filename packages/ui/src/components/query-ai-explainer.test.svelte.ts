import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import QueryAiExplainer from './QueryAiExplainer.svelte';

describe('QueryAiExplainer Component', () => {
  const sampleQuery = "WHERE region = 'East' AND amount >= 50000";

  it('renders raw query text and default plain language explanation', () => {
    const { container } = render(QueryAiExplainer, {
      props: {
        queryText: sampleQuery,
        contextName: '大额核销清单',
      },
    });

    const root = container.querySelector('[data-svadmin-component="QueryAiExplainer"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('AI 规则语义解释卡片');
    expect(container.textContent).toContain("region = 'East'");
    expect(container.textContent).toContain('大额核销清单');
  });

  it('triggers onexplain callback when refresh is clicked', async () => {
    const onExplain = vi.fn().mockResolvedValue('核心口径：仅针对华东大区且金额不低于5万元的单据。');
    const { container } = render(QueryAiExplainer, {
      props: {
        queryText: sampleQuery,
        onexplain: onExplain,
      },
    });

    const explainBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('重新解析')
    );
    expect(explainBtn).toBeTruthy();
    if (explainBtn) {
      await fireEvent.click(explainBtn);
      expect(onExplain).toHaveBeenCalledWith(sampleQuery);
    }
  });
});
