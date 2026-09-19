---
title: 企业组件升级迁移
description: 企业组件数据契约与异步关系选择器的升级说明。
---

本页记录企业组件的破坏性升级。升级后请先完成数据契约迁移，再替换组件版本。

## FilterBuilder

`FilterBuilder` 现在只接受递归的 `Filter[]` 条件树。逻辑组通过
`{ operator: 'and' | 'or', value: Filter[] }` 表示，字段条件仍使用
`{ field, operator, value }`。

旧的 `logicalOperator` 属性已移除。原先的平铺条件：

```ts
[
  { field: 'status', operator: 'eq', value: 'published' },
  { field: 'views', operator: 'gte', value: 100 },
]
```

如果业务语义是 OR，需要显式改为：

```ts
[
  {
    operator: 'or',
    value: [
      { field: 'status', operator: 'eq', value: 'published' },
      { field: 'views', operator: 'gte', value: 100 },
    ],
  },
]
```

嵌套条件不再被展平。服务端序列化、URL 查询参数和保存视图应直接保存完整
`Filter` 树，并在读回后验证序列化往返不改变逻辑结构。

`@svadmin/lite` 的 `LiteFilterBuilder` 也已移除 `logicalOperator`，使用
`filters[0][operator]`、`filters[0.value.0][field]` 这类嵌套字段名提交条件树。
Lite Server Adapter 会把这些字段还原为同样的 `Filter` 树；自定义 SvelteKit
action 仍需保留这些字段，不要再按旧的 `filter_field_0` 平铺协议解析。

## JsonSchemaForm

`JsonSchemaForm` 现在递归处理 `object` 和 `array`，并在组件初始化时把 Schema
中的 `default` 写入绑定值。因此提交回调收到的是完整的有效值，而不是只包含用户
实际触碰过的字段。

枚举值会按 Schema 中的原始类型回写。例如数字枚举 `1 | 2` 不再因为经过
`<select>` 变成字符串 `"1"`。数值输入为空时回写 `undefined`，不会伪造为 `0`。

迁移时请检查：

- `onsubmit` 是否允许嵌套对象和数组；
- 后端是否区分缺失字段、`undefined`、`null` 和空字符串；
- 业务默认值是否应覆盖调用方传入值。调用方传入值优先于 Schema 默认值；
- 是否需要在提交前对数组长度和嵌套字段做服务端校验。

`LiteJsonSchemaForm` 使用相同的递归 Schema 契约。Lite 版本仍采用原生表单提交，
但绑定值、默认值、枚举原始类型和空数值规则保持一致；不再把未填写的数字字段
序列化为 `0`。

## SpreadsheetView

公式不再通过 `new Function()` 执行。当前解析器支持数字、单元格引用、
`+ - * /`、括号以及 `SUM`、`AVG`、`COUNT` 的单元格范围。

公式错误的显示值：

- `#CYCLE!`：公式引用形成循环；
- `#VALUE!`：公式语法、单元格引用或除零错误。

不再支持任意 JavaScript 表达式。调用方如果依赖自定义函数或脚本，应迁移到
受控的服务端计算或单独的公式扩展协议，不要要求消费者放开 CSP 的
`unsafe-eval`。

## TreeSelect

多选模式采用级联叶子值语义：选择一个父节点会选中其所有可选叶子节点，
取消父节点会移除这些叶子值。绑定值只保存叶子节点，不再保存父节点和子节点
的混合列表。父节点的全选和半选状态由当前叶子值自动推导。

```svelte
<TreeSelect
  multiple
  options={departments}
  value={selectedTeamIds}
  onchange={(next) => selectedTeamIds = next}
/>
```

需要懒加载的节点使用 `hasChildren: true`，并提供 `loadChildren`。组件会在首次
展开节点时请求子节点，并在请求期间保持展开控件忙碌状态：

```svelte
<TreeSelect
  options={departmentRoots}
  loadChildren={async (node) => fetchTeams(node.value)}
/>
```

迁移时请检查：

- 后端筛选参数是否期待父节点值；如需要父节点语义，应在提交边界显式聚合；
- 是否将 `value` 中的父节点当作已选项保存；
- 懒加载失败时是否由调用方记录错误并提供重试；
- 自定义包装器是否保留 `Arrow`、`Home`、`End` 键盘路径和 `aria-checked="mixed"`。

## NumericInput

新增 `NumberInput`、`MoneyInput` 和 `PercentInput`，并已接入
`FieldRenderer` 的 `number`、`currency`、`percent` 字段。

数值组件的绑定值统一为 `number | null`：空输入回传 `null`，输入 `0` 保持为
数字零，不再用字符串或 `0` 伪造空值。可通过字段定义传递：

```ts
{
  key: 'completion',
  label: '完成率',
  type: 'percent',
  scale: '1',
  min: 0,
  max: 1,
  step: 0.01,
  precision: 1,
}
```

`PercentInput` 的 `scale: '1'` 表示绑定值使用 `0..1`，界面显示
`0..100%`；`scale: '100'` 表示绑定值本身使用百分数。`MoneyInput` 的
`currency` 只负责输入上下文和展示标识，不改变金额的数值单位。

迁移时请检查：

- 是否仍把空数值解析为 `0` 或空字符串；
- `min`/`max`/`step` 使用的是存储单位还是显示单位；
- 百分比字段是否统一选择 `scale: '1'` 或 `scale: '100'`；
- 服务端 Schema 是否接受 `null`，以及是否需要将空值转换为缺失字段。

## DateTimeInput

新增 `DateTimeInput` 和 `DateRangeInput`，并已接入 `FieldRenderer` 的
`date`、`time`、`datetime`、`daterange` 字段。

当前输入契约使用浏览器原生值：

- `date`：`YYYY-MM-DD`；
- `time`：浏览器时间输入值；
- `datetime`：本地 `datetime-local` 值，不自动转换时区；
- `daterange`：`{ start: string | null, end: string | null }`，允许半开放范围。

```ts
{
  key: 'activePeriod',
  label: '生效区间',
  type: 'daterange',
}
```

当前版本不提供快捷范围、禁用日期规则、时区转换或复杂日历面板。业务需要这些
能力时，应在明确的日期策略和服务端存储格式基础上扩展，而不是把本地
`datetime-local` 值直接当作 UTC 时间。

迁移时请检查：

- 后端是否将 `datetime-local` 明确解释为租户时区或用户时区；
- 半开放范围是否允许只有开始或只有结束；
- 纯日期是否禁止在序列化时附加午夜时区；
- 表单回显是否保留浏览器控件要求的字符串格式。

## ComboboxField

`ComboboxField` 现在支持 `multiple` 受控多选。多选时绑定值必须是
`(string | number)[]`，清空回传空数组；单选仍使用标量值，清空回传 `null`。
不要在同一个字段中混用两种值形状。

```svelte
<ComboboxField
  resource="users"
  multiple
  value={memberIds}
  onchange={(next) => memberIds = next as (string | number)[]}
/>
```

已选值会通过 `getMany` 单独回显，因此当前搜索结果不包含已选记录时仍能显示。
Provider 必须实现 `getMany`，并返回请求的全部 ID；缺失或重复 ID 会被视为无效响应，
不会静默把已选值改成错误记录。租户、Provider 或资源作用域变化时，旧请求结果会被丢弃。

迁移时请检查：

- `multiple` 关系字段是否把默认值从标量改成数组；
- 清空逻辑是否从 `null` 改为 `[]`；
- 表单提交是否按数组生成重复的字段值，而不是提交 JavaScript 数组字符串；
- Provider 的 `getMany` 是否支持跨页已选项回显，并保持租户权限边界。

## FileUpload

新增 `FileUpload` 作为文件字段的统一上传外壳。组件只接收文件和
`AbortSignal`，上传 URL、签名、租户凭据和存储授权必须由调用方的
`upload(file, { signal, onProgress })` 会话回调处理，浏览器不会接触 service role
或管理 token。

组件内置类型/大小/数量预校验、拖放、多文件、进度、取消、失败重试和错误状态。
旧的原生文件输入可以迁移为：

```svelte
<FileUpload
  name="attachment"
  accept="application/pdf"
  upload={uploadWithSignedSession}
  onChange={(items) => files = items}
/>
```

迁移时请检查：

- 是否把存储凭据写入浏览器或组件 Props；
- 上传取消后是否由服务端会话安全回收未完成对象；
- 重试是否具备幂等键，不能把同一文件重复写成多个业务附件；
- 表单是否在成功回调后保存服务端返回的资源 URL，而不是本地文件名。

### Lite 原生上传

SSR 页面使用 `@svadmin/lite` 导出的 `LiteFileUpload`。它提供可见原生文件输入，
不需要 hydration，也不包含内层 `<form>`；外层表单必须使用 POST 和 multipart 编码：

```svelte
<script lang="ts">
  import { LiteFileUpload } from '@svadmin/lite';
  let { form } = $props();
</script>

<form method="POST" action="?/upload" enctype="multipart/form-data">
  <LiteFileUpload
    name="attachments"
    label="附件"
    accept="application/pdf"
    multiple
    required
    error={form?.uploadError}
  />
  <button type="submit">上传</button>
</form>
```

调用方必须实现 `upload` 服务端 action，使用
`(await request.formData()).getAll('attachments')` 读取多文件。
`accept` 只是浏览器选择提示，不是安全校验。服务端必须重新检查必填、文件内容类型、
大小、数量及当前用户和租户权限，并通过受控存储服务持久化文件。
`createCrudActions` 不会自动提供这个自定义上传 action。

Lite 不接受 SPA 的 `upload`、`onChange`、`maxFiles` 或 `maxSize` 属性；
限制应配置在服务端，失败信息通过 `error` 回显。失败后用户需要重新选择文件提交，
不承诺客户端进度、取消、拖放队列或自动重试。原有 `LiteFileInput` 可以继续使用；
需要无脚本文件选择状态时，改用这里的可见原生输入。此能力在矩阵中标记为
`fallback`，不是完整行为对齐。

## ImportWizard

导入向导将原始 CSV/JSON 文件和字段映射交给核心 `useImport`：
所有行通过资源 `create` Schema 预校验后才开始写入，并校验 Provider 回执。
不要再依赖缺失 Schema 时仍能写入的行为。

迁移时请检查：

- 空文件、非记录数组 JSON、重复 CSV 表头和列数错误会阻止继续操作。
- JSON 数组、对象、布尔值和 `null` 保留原始类型，不再转成字符串。
- 空数值字段视为缺失值，不再变为 `0`；必填数值因此会在写入前报错。
- 布尔字符串只转换明确的真/假值，未知字符串不会静默转成 `false`。
- 映射不得把多列写入同一个目标字段，也不得把所有列都忽略。
- `onSuccess` 仅在取得当前作用域的完整处理结果后触发，可能包含部分失败；
  调用方必须检查 `failed`。解析失败、预校验失败及作用域失效不会触发该回调。
- 关闭弹窗或切换资源、租户、Provider、认证会话、权限会清空预览及结果。
  已发出的写入不保证回滚；重新导入前，应查询服务端记录并确认幂等策略。
- 向导使用 `import` 权限和资源 `canCreate` 控制入口，但后端仍必须独立授权。

失败 CSV 只包含失败的提交记录及核心清理过的错误消息，不回显 Provider 的私有异常。
下载失败记录后，先核对服务端是否已写入，不能把网络错误直接当作可安全重试。

## 升级检查

1. 更新调用方的 `FilterBuilder` 数据，移除 `logicalOperator`。
2. 为 Schema 表单补充嵌套对象、数组和枚举类型测试。
3. 扫描电子表格公式，移除自定义 JavaScript 表达式。
4. 检查 `TreeSelect` 多选值是否只包含叶子节点。
5. 检查数值字段的空值、零值和百分比缩放契约。
6. 检查日期、时间和日期范围的时区与半开放范围策略。
7. 检查关系多选的数组值、`getMany` 回显和清空契约。
8. 验证保存视图、URL 查询和服务端请求的条件树往返。
9. 在真实消费者中执行严格类型检查和浏览器挂载验证。
10. Lite 文件上传改用 multipart POST，补齐服务端文件校验、授权和错误回显。
