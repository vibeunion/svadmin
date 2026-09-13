---
title: 资源契约
description: 由 Schema 驱动查询、写入、表单和自定义命令
---

`@svadmin/core` 默认 CRUD Hook 必须接收显式资源契约，不再接受字符串资源名、
隐式路由资源或调用方指定的数据泛型。同一份 Schema 同时负责类型推断和实际
Provider 请求、响应的运行时校验。

## 定义一次

```typescript
import { Type } from '@sinclair/typebox';
import { defineResource, useList, useUpdate, useForm } from '@svadmin/core';

export const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
  update: Type.Object({ title: Type.Optional(Type.String()) }),
  delete: Type.Object({ reason: Type.String() }),
});

const list = useList({
  resource: posts,
  sorters: [{ field: 'title', order: 'asc' }],
  filters: [{ field: 'title', operator: 'contains', value: '草稿' }],
});
const update = useUpdate({ resource: posts, id: 1 });
await update.mutation.mutateAsync({ variables: { title: '已更新' } });
const form = useForm({
  resource: posts, action: 'create', defaultValues: { title: '' },
});
form.setFieldValue('title', '你好');
```

在模块顶层定义契约，不要在每次渲染中重新创建。契约身份用于缓存隔离。
不再需要声明合并，也不需要单独维护读写类型注册表。

记录必须有必填的字符串或数字 `id`。缺少 create/update Schema 即禁用对应操作，
空批量也不能绕过。缺少 delete Schema 时只允许无请求体删除。

目前支持闭合的 JSON Schema 子集：对象、数组、元组、联合、字符串、数字、
整数、布尔值、字面量、null 和 never。对象递归关闭额外字段；额外数据会被拒绝，
不会被静默删除或强制转换。`Any`、`Unknown`、开放字典、引用、转换器及其他
不支持的 Schema 会被拒绝。应描述完整响应，包括嵌套对象。创建契约时会复制 Schema。

## Hook 规则

- `useList`、`useOne`、`useShow`、`useMany` 和 `useTable` 支持 getter 形式的响应式参数。
- `useInfiniteList` 和 `useSelect` 使用对象参数；选择查询须显式提供 `optionLabel` 和 `optionValue`。
- 字段名、过滤值与操作符、ID、写入变量和返回记录由契约推断。
- `useUpdate`、`useDelete` 创建时必须绑定 ID。单次写入不能改换资源、ID 或提交模式。
- 严格更新与删除固定使用悲观提交，避免未经校验的乐观值成为成功数据。
- 批量回退在第一次写入前检查全部输入与 ID；部分删除失败分别报告成功和失败 ID。
- 传输错误保持 `unknown`，读取属性前须进行收窄。
- 表单绑定固定的 create/edit 操作和对象输入 Schema。默认值服从操作 Schema；回填排除只读字段，不匹配时显示表单错误。
- 契约缓存保留租户和 Provider 隔离，非安全 Hook 不会匹配契约缓存。
- 写入响应异常包含 `details.writeMayHaveSucceeded`，重试前应先确认服务端状态。

## 自定义命令

```typescript
import { defineCommand, useCustom } from '@svadmin/core';

const report = defineCommand('report', {
  url: '/reports',
  method: 'get',
  input: Type.Object({ year: Type.Number() }),
  output: Type.Object({ count: Type.Number() }),
});
const result = useCustom({ command: report, input: { year: 2026 } });
```

`useCustom` 只接受 GET 命令。`useCustomMutation({ command })` 的
`mutation.mutateAsync(input)` 直接接收 Schema 对应输入。
GET 输入映射为查询参数，其他方法映射为请求体；输入和响应都必须校验。
调用时不能覆盖命令地址或方法。

## 明确的例外

`@svadmin/core/unsafe` 集中了元数据驱动的通用辅助函数，以及字符串和手动泛型形式的
CRUD Hook。它是显式非安全入口，不是默认接口遇到类型错误时的兜底重载。
无法得知应用 Schema 的通用 UI 组件仍使用该入口。
例外及原因记录在 `scripts/unsafe-boundaries.json`；`bun run check` 阻止新增未登记导入。
脚手架和展示页面均使用严格的默认入口。展示页面与种子数据、存储校验共用闭合的
Schema；动态查询保留字段的 unknown 类型，但仍按选中的 Schema 校验。
未知资源和不合法的存储数据会明确失败。

`bun run check:types` 还会独立检查核心契约模块和示例 Schema/存储模块，启用
`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、
`noPropertyAccessFromIndexSignature`、`noFallthroughCasesInSwitch` 和
`skipLibCheck: false`。更大范围的应用检查仍继承仓库配置，不能据此宣称全仓达标。

Provider 构造、上下文访问、认证、任务 API、任意存储及底层工具仍有独立契约。
本次改造不能替代权限校验，也不能保证任意强制断言安全。
存在非安全例外时，不应宣称全仓“100% 类型安全”。

## 验收场景

```gherkin
Scenario: 禁止隐式契约
  Given 默认 CRUD Hook
  When 传入字符串资源名或替代数据泛型
  Then 消费端编译必须失败

Scenario: 批量写入前完整校验
  Given Provider 只实现单条写入
  When 批量中任意输入或 ID 不符合契约
  Then 不得写入任何记录

Scenario: 拒绝错误外部响应
  Given 查询或命令已绑定契约
  When 响应字段或结构错误
  Then 操作失败而不是发布带类型的成功数据

Scenario: 非安全边界可审查
  Given 非安全导入清单已经过审查
  When 新页面未经登记导入 @svadmin/core/unsafe
  Then 本地检查失败
```
