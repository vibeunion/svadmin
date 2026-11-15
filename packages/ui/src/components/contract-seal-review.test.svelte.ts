import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from 'svelte/compiler';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import ContractClauseDiffViewer, { type ContractClause } from './ContractClauseDiffViewer.svelte';
import ElectronicSealInspector, { type ElectronicSealInfo } from './ElectronicSealInspector.svelte';

const clauses: ContractClause[] = [
  { id: 'low', clauseNumber: '1', title: '普通条款', changeType: 'unchanged', riskLevel: 'low', originalContent: '普通内容' },
  { id: 'high', clauseNumber: '2', title: '风险条款', changeType: 'modified', riskLevel: 'high', proposedContent: '风险内容' },
];

const seal: ElectronicSealInfo = {
  id: 'seal', sealName: '测试印章', sealType: 'contract', enterpriseName: '测试企业', creditCode: 'test',
  status: 'valid', documentHashMatch: true,
  certificate: { issuer: 'CA', subject: '企业', serialNumber: '1', algorithm: 'SM2', validFrom: '2026-01-01', validTo: '2027-01-01', fingerprintSha256: 'test' },
  timestamp: { tsaName: 'TSA', stampedAt: '2026-11-14', timestampTokenId: 'test', verified: true },
};

describe('合同与印章审查回归', () => {
  it('切换过滤器后显示匹配条款详情', async () => {
    const { container, getByRole } = render(ContractClauseDiffViewer, { clauses });
    await fireEvent.click(getByRole('button', { name: '高风险条款' }));
    expect(container.querySelector('article')?.textContent).toContain('风险内容');
  });

  it('替换条款列表后恢复有效选择，并响应外部选择', async () => {
    const { container, rerender } = render(ContractClauseDiffViewer, { clauses, selectedClauseId: 'low' });
    await rerender({ clauses: clauses.slice(1) });
    expect(container.querySelector('article')?.textContent).toContain('风险内容');
    await rerender({ clauses, selectedClauseId: 'low' });
    expect(container.querySelector('article')?.textContent).toContain('普通内容');
  });

  it('验真请求完成前保持禁用，完成后恢复', async () => {
    let finish: (() => void) | undefined;
    const onRevalidate = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { getByRole } = render(ElectronicSealInspector, { seal, onRevalidate });
    const button = getByRole('button', { name: '重新验真' }) as HTMLButtonElement;
    await fireEvent.click(button);
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(button.disabled).toBe(true);
    expect(onRevalidate).toHaveBeenCalledTimes(1);
    finish?.();
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it('验真失败后显示错误并允许重试', async () => {
    const onRevalidate = vi.fn().mockRejectedValue(new Error('服务不可用'));
    const { getByRole } = render(ElectronicSealInspector, { seal, onRevalidate });
    const button = getByRole('button', { name: '重新验真' }) as HTMLButtonElement;
    await fireEvent.click(button);
    await waitFor(() => expect(getByRole('alert').textContent).toContain('验真失败'));
    expect(button.disabled).toBe(false);
  });

  it('没有验真服务时禁用重新验真', () => {
    const { getByRole } = render(ElectronicSealInspector, { seal });
    expect((getByRole('button', { name: '重新验真' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('时间戳校验失败时不显示验真通过', () => {
    const { container } = render(ElectronicSealInspector, { seal: { ...seal, timestamp: { ...seal.timestamp, verified: false } } });
    expect(container.textContent).not.toContain('验真通过 · 真实有效');
    expect(container.textContent).toContain('时间戳校验未通过');
  });

  it('相同印章的多个实例使用独立 SVG 路径', () => {
    const first = render(ElectronicSealInspector, { seal });
    const second = render(ElectronicSealInspector, { seal });
    const pathId = first.container.querySelector('path[id]')?.id;
    const secondId = second.container.querySelector('path[id]')?.id;
    expect(pathId).toBeTruthy();
    expect(secondId).not.toBe(pathId);
    expect(first.container.querySelector('textPath')?.getAttribute('href')).toBe(`#${pathId}`);
    expect(second.container.querySelector('textPath')?.getAttribute('href')).toBe(`#${secondId}`);
  });

  for (const locale of ['', 'zh-cn/']) {
    it(`${locale || 'en'} 文档中的新增及相邻示例可独立编译`, () => {
      const source = readFileSync(resolve(process.cwd(), `../../docs/src/content/docs/${locale}components/enterprise.md`), 'utf8');
      const examples = [...source.matchAll(/```svelte\n([\s\S]*?)\n```/g)]
        .map((match) => match[1] ?? '')
        .filter((code) => /import.*\b(?:ContractClauseDiffViewer|ElectronicSealInspector|StepUpAuthModal|AuditSnapshotCapture|CannedResponsePicker)\b/.test(code));
      expect(examples).toHaveLength(5);
      for (const example of examples) {
        expect(() => compile(example, { generate: 'client' })).not.toThrow();
      }
    });
  }
});
