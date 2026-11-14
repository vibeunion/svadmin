import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ContractClauseDiffViewer, {
  type ContractClause
} from './ContractClauseDiffViewer.svelte';

const mockClauses: ContractClause[] = [
  {
    id: 'clause-1',
    clauseNumber: '3.1',
    title: '付款期限与结算周期',
    changeType: 'modified',
    riskLevel: 'high',
    originalContent: '买方应在收到发票后 30 个工作日内支付全部款项。',
    proposedContent: '买方应在收到发票并完成现场验收后 60 个工作日内支付首期款 70%。',
    annotations: [
      {
        id: 'anno-1',
        author: '王法务',
        role: '法务专员',
        timestamp: '2026-11-14 10:00',
        content: '账期延长至 60 天存在资金回笼风险，建议维持 30 天或增加逾期违约金。'
      }
    ],
    decision: 'pending'
  },
  {
    id: 'clause-2',
    clauseNumber: '4.2',
    title: '知识产权与代码归属',
    changeType: 'added',
    riskLevel: 'medium',
    proposedContent: '项目实施过程中产生的所有衍生软件著作权归属于买方独家所有。',
    decision: 'accepted'
  },
  {
    id: 'clause-3',
    clauseNumber: '8.1',
    title: '保密协议有效期',
    changeType: 'unchanged',
    riskLevel: 'low',
    originalContent: '双方保密义务自本合同签署之日起生效，有效期三年。',
    proposedContent: '双方保密义务自本合同签署之日起生效，有效期三年。',
    decision: 'pending'
  }
];

describe('ContractClauseDiffViewer Component', () => {
  it('renders root container and clause outline', () => {
    const { container } = render(ContractClauseDiffViewer, {
      props: {
        clauses: mockClauses,
        originalVersionLabel: '基线版本 v1.0',
        proposedVersionLabel: '修订版本 v2.0'
      }
    });

    const root = container.querySelector('[data-svadmin-component="ContractClauseDiffViewer"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('合同条款版本对比与法务决策');
    expect(container.textContent).toContain('3.1 付款期限与结算周期');
    expect(container.textContent).toContain('4.2 知识产权与代码归属');
    expect(container.textContent).toContain('8.1 保密协议有效期');
  });

  it('handles decision callback when clicking accept or reject', async () => {
    const onDecisionChange = vi.fn();
    const { container } = render(ContractClauseDiffViewer, {
      props: {
        clauses: mockClauses,
        onDecisionChange
      }
    });

    const buttons = container.querySelectorAll('button');
    let acceptBtn: HTMLButtonElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('采纳') && !btn.textContent?.includes('一键')) {
        acceptBtn = btn as HTMLButtonElement;
      }
    });

    expect(acceptBtn).toBeTruthy();
    if (acceptBtn) {
      await fireEvent.click(acceptBtn);
      expect(onDecisionChange).toHaveBeenCalledWith('clause-1', 'accepted');
    }
  });

  it('supports batch accept and batch reject triggers', async () => {
    const onBatchDecision = vi.fn();
    const { container } = render(ContractClauseDiffViewer, {
      props: {
        clauses: mockClauses,
        onBatchDecision
      }
    });

    const batchAccept = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('一键全采纳')
    );
    expect(batchAccept).toBeTruthy();
    if (batchAccept) {
      await fireEvent.click(batchAccept);
      expect(onBatchDecision).toHaveBeenCalledWith('accepted');
    }
  });

  it('filters clauses by change status', async () => {
    const { container } = render(ContractClauseDiffViewer, {
      props: {
        clauses: mockClauses,
        filter: 'changed'
      }
    });

    // Clause 3 is unchanged, should not appear in outline
    expect(container.textContent).toContain('3.1 付款期限与结算周期');
    expect(container.textContent).toContain('4.2 知识产权与代码归属');
    expect(container.textContent).not.toContain('8.1 保密协议有效期');
  });
});
