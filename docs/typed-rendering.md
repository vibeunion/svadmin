# 类型化原生 Svelte 渲染 / Typed native Svelte rendering

`@svadmin/ui/rendering` 为现有 `AutoTable`、`AutoForm` snippets 提供可选的类型化适配器。它复用 `defineResource` 的私有运行时契约快照，不引入 TSX、React、另一套响应式运行时或样式依赖。未采用适配器的动态调用保持原样；现有组件属性并没有自动变成泛型属性。

## 1. 定义并注册同一份资源契约

```ts
// orders.ts
import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core';
import { createResourceRenderers } from '@svadmin/ui/rendering';

const status = Type.Union([Type.Literal('paid'), Type.Literal('pending')]);
export const orders = defineResource('orders', {
  record: Type.Object({ id: Type.Number(), status, amount: Type.Number() }),
  create: Type.Object({ status, amount: Type.Number({ minimum: 0 }) }),
  update: Type.Object({ status: Type.Optional(status) }),
});
export const orderUI = createResourceRenderers(orders);
```

宿主资源定义的 `contract` 必须使用同一个 `orders`，`resourceName` 使用 `orders.name`。渲染适配器不负责资源注册、请求、权限或租户选择。动态切换资源时，也必须同步切换适配器，不能只改 `resourceName`。

## 2. 类型化单元格，同时保留旧 columns 接口

```svelte
<script lang="ts">
  import { AutoTable } from '@svadmin/ui';
  import type { CellInput } from '@svadmin/ui/rendering';
  import { orders, orderUI } from './orders';
</script>

{#snippet amountCell(input: CellInput)}
  {@const cell = orderUI.cell('amount', input)}
  <span>{cell.value.toFixed(2)}</span>
{/snippet}

<AutoTable
  resourceName={orders.name}
  columns={orderUI.columns({ amount: amountCell })}
/>
```

`cell.value` 的类型来自 `orders.record.amount`，不是人为断言。错误字段名、错误值方法以及列映射中的额外字段会被类型测试拦截。`columns` 也会在运行时校验自有字段，拒绝 getter 和非函数值。运行时不能辨认任意函数是否由 Svelte 编译，因此 snippets 必须来自可信宿主代码。

原始 `input` 保持动态组件的真实类型。`cell()` 校验完整记录并返回独立快照，值从记录取出；不会相信一个与记录脱离的 `input.value`。验证失败会抛错，宿主可以用原生 Svelte 错误边界呈现统一错误状态，不能静默把错误数据转成业务类型。

| 扩展点 | 适配方式 |
| --- | --- |
| `columns` / `defaultCellRenderer` | `orderUI.cell('amount', input)` |
| `rowActions` | `orderUI.row(input)`，同时验证记录与 id 一致 |
| `expandedRowRender` | `orderUI.record(input.record)` |
| `summary` | `orderUI.summary(input)`，逐条验证记录 |
| `headerActions` / `emptyState` / `batchActions` | 保留现有原生 snippets；不增加无必要包装 |

每次 `cell()` 都验证记录，不按对象身份缓存可变数据。自定义整行渲染时可以调用一次 `record()`，然后复用该快照。这里没有声称验证零开销，也没有改变 AutoTable 的数据加载或更新策略。

## 3. 字段类型必须区分 create、edit、clone 和 show

```svelte
<script lang="ts">
  import { AutoForm, FieldRenderer } from '@svadmin/ui';
  import type { FieldInput } from '@svadmin/ui/rendering';
  import { orders, orderUI } from './orders';
</script>

{#snippet editField(input: FieldInput)}
  {#if input.field.key === 'status'}
    {@const field = orderUI.field('edit', 'status', input)}
    <button type="button" onclick={() => field.onchange('paid')}>
      {field.state.valid ? field.state.value ?? '未设置' : '输入尚未通过校验'}
    </button>
  {:else}
    <FieldRenderer field={input.field} value={input.value} onchange={input.onchange} />
  {/if}
{/snippet}

<AutoForm resourceName={orders.name} mode="edit" id={1} fieldRenderer={editField} />
```

传入 `field()` 的操作必须与当前 AutoForm `mode` 一致。`edit` 使用更新契约，所以本例允许 status 为 undefined，但不允许编辑 amount。`clone` 使用创建契约。`show` 使用记录契约，并在运行时禁止下面两条更新路径。

`field.state` 是可辨别联合：只有 `valid: true` 时才存在带业务类型的 `value`。这是**当前字段**的校验结果，不代表完整表单可以提交。缺失的其他必填字段仍由现有 AutoForm / useForm 的提交边界检查。

`field.onchange(value)` 的参数具有当前字段类型，而且运行时会再次校验后才调用宿主回调。`field.onDraftChange(value)` 则接受 `unknown`，用于输入过程中的不完整字符串等普通数据；函数、Date、循环对象等无法通过普通数据快照的值会被拒绝。不要把这个草稿路径当作提交 API。

适配器保留宿主提供的回调，而不直接访问 provider。租户、会话、只读、权限与完整请求授权仍属于原组件和后端；前端字段类型不能替代授权。

## 4. 普通 TypeScript 中配置组件，不需要 TSX

```ts
// status-view.ts
import { componentView } from '@svadmin/ui/rendering';
import StatusBadge from './StatusBadge.svelte';

export function statusView(status: 'paid' | 'pending') {
  return componentView(StatusBadge, { status });
}
```

```svelte
<script lang="ts">
  import { statusView } from './status-view';
  let { status }: { status: 'paid' | 'pending' } = $props();
  const view = $derived(statusView(status));
</script>

<view.component {...view.props} />
```

`StatusBadge.svelte` 必须声明匹配的 `status` 属性。组件类型决定 props，props 不能反向拓宽组件的联合类型。使用原生组件语义和响应式更新；这不是任意 JSX 节点树、跨框架组件适配器或远程组件执行器。组件和 snippets 都必须来自可信宿主代码，不能放进 Surface JSON。

## 验证与边界

专项工作流 `Typed renderer contracts` 执行运行时回归、原生 Svelte snippets / 动态组件更新、正反 TypeScript 契约和真实 AutoTable / AutoForm 消费端编译。DOM 回归使用 happy-dom，不冒充真实浏览器端到端或视觉对比结果。

```sh
bun run --cwd packages/ui test src/rendering
node node_modules/@typescript/native/bin/tsc --noEmit -p scripts/fixtures/ui-rendering/tsconfig.json
bun run svelte-check --tsgo-experimental-api --tsconfig scripts/fixtures/ui-rendering/tsconfig.svelte.json --fail-on-warnings
```

适配器本身保持增量 API；示例应用的所有业务页面调用点已统一接入，详见 [迁移清单](./typed-rendering-migration.md)。不替换 AutoTable / AutoForm，不改变 Panda recipes，不合并并行样式或 SVAR 工作，也不扩展 Surface 的读写协议。TSX 将来仍可按明确需求单独试验，但不是当前组件主线依赖。


## 页面级接入

`createResourceRenderers` 还提供 `records(values)`、`draftValue(mode, key, value)` 和只读 `resource`。为 `AutoTable`、`AutoForm`、`ShowPage`、`ResourceOperationsPage` 传入可选的 `rendering`，可以把数据校验接入原生组件而不替换默认单元格或字段模板。组件会在使用资源绑定前验证 `rendering.resource` 与宿主资源的契约是同一个实例；相同名称但不同契约也会拒绝。

```svelte
<AutoTable resourceName={orders.name} rendering={orderUI} />
<AutoForm resourceName={orders.name} rendering={orderUI} mode="create" />
<ShowPage resourceName={orders.name} rendering={orderUI} id={1} />
```

不要用 `defaultCellRenderer` 全面替代默认渲染来实现这项迁移：那会绕过原有 `InlineEdit` 分支。页面级 `rendering` 保留行内编辑、表单错误关联、密度与禁用状态。表单回调会捕获契约/模式/租户/会话所属作用域，过期作用域和 show 模式不会写入草稿。组件输出 `data-svadmin-rendering-resource` 供集成测试核对实际接入点，此标记不是授权凭证。


## 业务页面接入

纯记录/表单草稿视图使用轻量 `createResourceRendering(contract)`，需要自定义单元格或字段 snippet 时使用 `createResourceRenderers(contract)`。二者共用相同的校验实现，并提供 `resource`、`record`、`records`、`draft`。具体业务类型来自实际契约；通用路由只通过 `ResourceRendering` 擦除类型，不假定某个运行时资源名必然对应某个静态类型。

将适配器通过 `rendering` 传入 `AutoTable`、`AutoForm`、`ShowPage`；框架也会继续传递到快速编辑和详情抽屉。`bindResourceRendering` 使用契约对象身份校验绑定，不能只用名称相同的另一个契约。旧的未传入 `rendering` 的第三方调用继续工作。全部示例业务页面与路由的覆盖清单见 [业务迁移记录](./typed-rendering-migration.md)。
