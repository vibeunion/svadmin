import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from 'svelte/compiler';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import GatewayRouteEditor, { type GatewayRouteConfig } from './GatewayRouteEditor.svelte';
import RateLimitPolicyPanel, { type RateLimitPolicyConfig } from './RateLimitPolicyPanel.svelte';

const route: GatewayRouteConfig = {
  id: 'first', name: '第一条路由', enabled: true, pathPattern: '/api', matchType: 'prefix',
  methods: ['GET'], headers: [{ id: 'h', name: 'X-Tenant', value: 'first', op: 'exact' }],
  upstreamUrl: 'https://example.test', stripPrefix: false, canaryEnabled: false, canaryWeight: 0,
};

describe('网关与限流审查回归', () => {
  it('父层替换路由后编辑并保存新记录', async () => {
    const onsave = vi.fn();
    const { getByLabelText, getByRole, rerender } = render(GatewayRouteEditor, { route, onsave });
    await rerender({ route: { ...route, id: 'second', name: '第二条路由' } });
    expect((getByLabelText('路由名称') as HTMLInputElement).value).toBe('第二条路由');
    await fireEvent.click(getByRole('button', { name: '保存路由配置' }));
    expect(onsave.mock.calls[0]?.[0].id).toBe('second');
  });

  it('编辑嵌套请求头不改变传入数据，保存结果不随继续编辑改变', async () => {
    const onsave = vi.fn<(value: GatewayRouteConfig) => void>();
    const input = structuredClone(route);
    const { getByPlaceholderText, getByRole } = render(GatewayRouteEditor, { route: input, onsave });
    const header = getByPlaceholderText('匹配值');
    await fireEvent.input(header, { target: { value: 'saved' } });
    expect(input.headers[0]?.value).toBe('first');
    await fireEvent.click(getByRole('button', { name: '保存路由配置' }));
    const saved = onsave.mock.calls[0]?.[0];
    await fireEvent.input(header, { target: { value: 'draft' } });
    expect(saved?.headers[0]?.value).toBe('saved');
    expect(getByRole('button', { name: '保存路由配置' })).toBeTruthy();
  });

  it('非法正则与测试服务拒绝显示错误，并恢复按钮', async () => {
    const { getByRole, getByText, rerender } = render(GatewayRouteEditor, { route: { ...route, matchType: 'regex', pathPattern: '[' } });
    await fireEvent.click(getByRole('button', { name: /执行推演/ }));
    expect(getByText(/路由测试失败/)).toBeTruthy();
    await rerender({ route, ontest: vi.fn().mockRejectedValue(new Error('offline')) });
    await fireEvent.click(getByRole('button', { name: /执行推演/ }));
    await waitFor(() => expect(getByText(/路由测试失败/)).toBeTruthy());
    expect((getByRole('button', { name: /执行推演/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('父层替换限流策略后显示新值，保存结果与后续草稿隔离', async () => {
    const onsave = vi.fn<(value: RateLimitPolicyConfig) => void>();
    const { getByLabelText, getByRole, rerender } = render(RateLimitPolicyPanel, { config: { id: 'first', limitExceededStatusCode: 429 }, onsave });
    await rerender({ config: { id: 'second', limitExceededStatusCode: 503 } });
    const input = getByLabelText('超限拦截状态码') as HTMLInputElement;
    expect(input.value).toBe('503');
    await fireEvent.click(getByRole('button', { name: '保存限流策略' }));
    const saved = onsave.mock.calls[0]?.[0];
    expect(saved?.id).toBe('second');
    await fireEvent.input(input, { target: { value: '429' } });
    expect(saved?.limitExceededStatusCode).toBe(503);
    expect(getByRole('button', { name: '保存限流策略' })).toBeTruthy();
  });

  for (const [name, mount, buttonName] of [
    ['路由', (onsave: () => Promise<void>) => render(GatewayRouteEditor, { onsave }), '保存路由配置'],
    ['策略', (onsave: () => Promise<void>) => render(RateLimitPolicyPanel, { onsave }), '保存限流策略'],
  ] as const) {
    it(`${name}保存等待实际完成，失败可见且可以重试`, async () => {
      let rejectSave: ((error: Error) => void) | undefined;
      const onsave = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
      const { getByRole } = mount(onsave);
      const button = getByRole('button', { name: buttonName }) as HTMLButtonElement;
      await fireEvent.click(button);
      expect(button.disabled).toBe(true);
      rejectSave?.(new Error('offline'));
      await waitFor(() => expect(getByRole('alert').textContent).toContain('保存失败'));
      expect(button.disabled).toBe(false);
    });
  }

  for (const locale of ['', 'zh-cn/']) {
    it(`${locale || 'en'} 文档示例完整且使用保存回调更新数据`, () => {
      const source = readFileSync(resolve(process.cwd(), `../../docs/src/content/docs/${locale}components/enterprise.md`), 'utf8');
      const examples = [...source.matchAll(/```svelte\n([\s\S]*?)\n```/g)]
        .map((match) => match[1] ?? '')
        .filter((code) => /import.*\b(?:GatewayRouteEditor|RateLimitPolicyPanel|StepUpAuthModal|AuditSnapshotCapture|CannedResponsePicker)\b/.test(code));
      expect(examples).toHaveLength(5);
      for (const example of examples) {
        expect(() => compile(example, { generate: 'client' })).not.toThrow();
        expect(example).not.toContain('bind:route');
      }
    });
  }
});
