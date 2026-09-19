import type { Component, Snippet } from 'svelte';
import {
  componentView, createResourceRendering, createResourceRenderers, type CellInput, type FieldInput,
} from '@svadmin/ui/rendering';
import { orders } from '../resource.js';

// 只从公开构建入口导入，确保声明生成没有丢失字段/值关联。
export function verifyPublishedTypes(input: CellInput, field: FieldInput, snippet: Snippet<[CellInput]>, Status: Component<{ status: 'paid' | 'pending' }>) {
  const ui = createResourceRenderers(orders);
  ui.cell('amount', input).value.toFixed(2);
  ui.cell('note', input).value?.toUpperCase();
  ui.columns({ status: snippet });
  const state = ui.field('create', 'status', field);
  if (state.state.valid) {
    const status: 'paid' | 'pending' = state.state.value;
    componentView(Status, { status });
  }
  state.onchange('pending');
  ui.field('edit', 'status', field).onchange(undefined);
  // @ts-expect-error 公开声明必须拒绝不存在的记录字段。
  ui.cell('missing', input);
  // @ts-expect-error 数值字段不能在声明生成后退化为 any。
  ui.cell('amount', input).value.toUpperCase();
  // @ts-expect-error 可选字段在公开入口仍需要处理 undefined。
  ui.cell('note', input).value.toUpperCase();
  // @ts-expect-error 公开声明必须保留字段的字面量联合类型。
  state.onchange('cancelled');
  // @ts-expect-error 操作特定契约不能被记录字段覆盖。
  ui.field('edit', 'amount', field);
  // @ts-expect-error 未校验的草稿不提供业务类型的 value。
  state.state.value.toUpperCase();
  // @ts-expect-error 公开列配置也必须拒绝额外字段。
  ui.columns({ missing: snippet });
  // @ts-expect-error props 不能通过公开声明反向拓宽组件类型。
  componentView(Status, { status: 'cancelled' });
}


export function verifyPublishedBusinessBoundary(input: unknown) {
  const business = createResourceRendering(orders);
  business.records(input)[0]?.amount.toFixed(2);
  business.record(input).status.toUpperCase();
  const draft = business.draft('edit', input);
  // @ts-expect-error 记录数组的公开声明必须保留金额的 number 类型。
  business.records(input)[0]?.amount.toUpperCase();
  // @ts-expect-error 更新草稿只包含该操作允许的字段。
  void draft.amount;
  // @ts-expect-error 草稿尚未通过完整输入校验，不得假定状态是 string。
  draft.status.toUpperCase();
}
