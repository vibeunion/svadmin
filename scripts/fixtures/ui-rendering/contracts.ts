import type { Component, Snippet } from 'svelte';
import { componentView, createResourceRenderers, type CellInput, type FieldInput } from '../../../packages/ui/src/rendering/index.js';
import { orders } from './resource.js';

export function verifyTypes(raw: CellInput, input: FieldInput, snippet: Snippet<[CellInput]>, Status: Component<{ status: 'paid' | 'pending' }>) {
  const ui = createResourceRenderers(orders);
  ui.cell('amount', raw).value.toFixed(2);
  ui.cell('note', raw).value?.toUpperCase();
  ui.record(raw.record).id.toFixed();
  ui.row({ record: raw.record, id: 1 }).id.toFixed();
  ui.summary({ data: [raw.record], total: 1, visibleColumnsCount: 3 }).data[0]?.amount.toFixed();
  ui.columns({ status: snippet, amount: snippet });
  const amount = ui.field('create', 'amount', input);
  if (amount.state.valid) amount.state.value.toFixed();
  amount.onchange(10);
  amount.onDraftChange('unfinished input');
  ui.field('edit', 'status', input).onchange(undefined);
  ui.field('clone', 'amount', input).onchange(2);
  componentView(Status, { status: 'paid' });

  // @ts-expect-error 字段拼写必须来自记录契约。
  ui.cell('ammount', raw);
  // @ts-expect-error number 不应退化为 any 或 string。
  ui.cell('amount', raw).value.toUpperCase();
  // @ts-expect-error 可选字段必须处理 undefined。
  ui.cell('note', raw).value.toUpperCase();
  // @ts-expect-error 创建字段的更新值必须保持 number。
  amount.onchange('10');
  // @ts-expect-error 校验前不存在业务 value。
  amount.state.value.toFixed();
  // @ts-expect-error 更新契约不允许修改 amount。
  ui.field('edit', 'amount', input);
  // @ts-expect-error clone 使用创建契约，不能设置 undefined。
  ui.field('clone', 'status', input).onchange(undefined);
  // @ts-expect-error 创建契约不包含只读 id。
  ui.field('create', 'id', input);
  // @ts-expect-error 列映射的字段必须真实存在于资源记录契约。
  ui.columns({ typo: snippet });
  const extraColumns = { status: snippet, typo: snippet };
  // @ts-expect-error 变量形式的多余字段也必须被拒绝。
  ui.columns(extraColumns);
  // @ts-expect-error props 不能反向拓宽组件声明的联合类型。
  componentView(Status, { status: 'cancelled' });
  // @ts-expect-error 必填组件属性不能省略。
  componentView(Status, {});
}
