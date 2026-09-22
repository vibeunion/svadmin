---
title: 零 any 类型迁移
description: 从历史 any 边界迁移到 unknown、具体类型和显式泛型的破坏性升级说明。
---

本次类型清理移除了仓库源码和测试代码中的历史显式 `any`。这是一次**允许破坏源码兼容性**
的类型升级：运行时数据 Provider 的核心方法没有新增兼容分支，消费者需要按新的类型边界
修正自己的调用代码。

## 影响范围

- 动态 Provider 初始化参数从 `any[]` 改为 `unknown[]`。
- `@svadmin/graphql` 的 `GraphQLDataProviderOptions` 不再等同于 `any`，改为
  `unknown`。
- Firebase、Hasura 等外部 SDK 或 Provider 入口参数改为 `unknown`，需要在宿主代码中先
  完成类型收窄。
- Rich Text Editor 注册接口从 `Component<any>` 改为
  `Component<Record<string, unknown>>`。
- UI 事件、属性合并和测试 mock 不再允许通过 `any` 绕过类型检查。

这不会改变正常 Provider 的运行时调用顺序，也不会把 `unknown` 自动转换成可调用对象。
动态入口仍会在运行时验证 Provider 初始化器和必需方法；缺失初始化器或 Provider 方法时，
仍然抛出错误。

## 迁移步骤

### 1. 给动态 Provider 参数补充调用方类型

旧代码可能依赖 `any[]` 接受任意参数：

```ts
await createGraphQLDataProvider(client, options);
```

如果 `client` 或 `options` 来自动态配置，先在宿主侧声明或验证类型：

```ts
type GraphQLProviderOptions = {
  url: string;
  headers?: Record<string, string>;
};

const options: GraphQLProviderOptions = loadGraphQLOptions();
await createGraphQLDataProvider(client, options);
```

不要把 `unknown` 改回 `any`。如果配置来自 JSON、环境变量或用户输入，应先解析、
校验，再传给 Provider。

### 2. 处理外部 SDK 参数

Hasura、Firebase 等入口现在接受 `unknown`。如果宿主需要访问 SDK 的具体属性，应在边界
处使用 SDK 官方类型：

```ts
import type { GraphQLClient } from 'graphql-request';

function createProvider(client: GraphQLClient) {
  return createHasuraDataProvider(client);
}
```

当 SDK 类型无法表达实际运行时对象时，使用局部类型守卫或最小接口，不要把整个对象
断言为 `any`：

```ts
type ProviderLike = {
  getList: (...args: never[]) => unknown;
  getOne: (...args: never[]) => unknown;
};

function isProviderLike(value: unknown): value is ProviderLike {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Record<string, unknown>).getList === 'function'
    && typeof (value as Record<string, unknown>).getOne === 'function';
}
```

### 3. 迁移 Rich Text Editor 泛型

旧写法：

```ts
setRichTextEditor(Editor as Component<any>);
```

新写法要求编辑器组件的 props 至少是可枚举的未知属性：

```ts
import type { Component } from 'svelte';

type EditorProps = Record<string, unknown>;

setRichTextEditor(Editor as Component<EditorProps>);
```

如果编辑器有明确 props，应优先使用真实 props 类型：

```ts
setRichTextEditor(Editor as Component<EditorPropsFromEditorPackage>);
```

### 4. 迁移 UI 属性和事件桥接

`Record<string, any>` 改为 `Record<string, unknown>` 后，读取属性必须先收窄：

```ts
const label = typeof props['aria-label'] === 'string'
  ? props['aria-label']
  : undefined;
```

事件回调应使用 Svelte 元素属性提供的参数类型；如果两个组件的事件类型不同，
请在桥接函数处转换为目标事件类型，不要使用 `as any`。

### 5. 迁移测试 mock

测试 mock 不再允许用 `any` 隐藏 Provider 契约错误。建议为 mock 定义最小接口：

```ts
type MockCreateParams = {
  variables: Record<string, unknown>;
};

const mockProvider = {
  create: async ({ variables }: MockCreateParams) => ({
    data: { id: 'new-record', ...variables },
  }),
};
```

对于动态响应，使用具体响应类型、`unknown`，或在断言点使用结构化类型：

```ts
expect(result.data as { fnName: string }).fnName
  .toBe('calculate_order_stats');
```

不要用 `as unknown as T` 批量替代所有断言；它只适合明确知道运行时形状、但第三方
声明暂时无法表达的单个边界。

## 升级检查

升级后至少执行：

```sh
bun run check:type-boundaries
bun test packages/firebase/src/firebase.test.ts
bun test packages/appwrite/src/appwrite.test.ts
bun test packages/supabase/src/supabase.test.ts
bun test packages/core/src/router-provider.test.ts
git diff --check
```

还应在消费者项目中搜索以下模式，并逐项迁移：

```text
: any
as any
<any>
Record<..., any>
Promise<any>
```

`expect.any(...)` 是测试框架的运行时匹配器，不属于 TypeScript 类型 `any`，不需要替换。

## 兼容性边界

本次升级不提供旧 `any` 签名的兼容别名，也不提供运行时适配层来恢复宽泛类型。
这样做是有意的：调用方必须在外部系统、JSON、SDK 和 UI 事件进入 svadmin 的边界处完成
类型验证。若暂时无法迁移，应该固定在旧版本，而不是在新版本重新引入全局 `any`。
