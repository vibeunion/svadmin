---
title: SupaCloud
description: 为 @svadmin/supabase 提供可选的任务编排增强
---

`@svadmin/supabase` 会继续把官方 Supabase 适配器聚焦在数据、认证、审计和实时能力上。可选子路径 `@svadmin/supabase/supacloud` 则是在普通 `@supabase/supabase-js` 客户端之上，补充面向任务的平台能力。

## 为什么是独立入口？

`@supacloud/js` 不是 `@supabase/supabase-js` 的替代品，而是对现有 Supabase 客户端的增强封装，补充了这些平台语义：

- 任务提交
- 任务轮询 / 等待完成
- 死信队列查询
- 取消 / 重试
- 任务状态订阅

把这些 API 放在 `@svadmin/supabase/supacloud` 下，有几个好处：

- 不破坏现有 `createSupabaseAuthProvider`、`createSupabaseLiveProvider`、`createSupabaseAuditHandler` 的签名
- 纯 Supabase 项目不需要安装 `@supacloud/js`
- 任务语义不会污染现有通用 Provider 抽象

## 安装

```bash
bun add @svadmin/supabase @supabase/supabase-js@^2.115.0 @supacloud/js@^0.33.0
```

## 创建客户端

```ts
import { createClient } from '@supabase/supabase-js';
import { createSupaCloudClient } from '@supacloud/js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const supacloud = createSupaCloudClient({
  supabase,
  managementApiUrl: import.meta.env.VITE_SUPACLOUD_API_URL,
  projectRef: import.meta.env.VITE_SUPACLOUD_PROJECT_REF,
});
```

## 任务 Provider

当你希望以一个轻量、专注任务的 API 使用 SupaCloud 时，可以使用 `createSupaCloudTaskProvider()`：

```ts
import { createSupaCloudTaskProvider } from '@svadmin/supabase/supacloud';

const taskProvider = createSupaCloudTaskProvider({ supacloud });
```

### 订阅传输

SDK `0.33.0` 默认轮询 Management API，不再假设存在 `public.tasks` Realtime 表。
通过工厂的 `subscription` 配置轮询参数，或显式订阅应用自己的已发布任务表：

```ts
const subscription = {
  pollingIntervalMs: 2_000,
  realtime: { schema: 'public', table: 'business_tasks' },
  realtimeTimeoutMs: 10_000,
  reconcileIntervalMs: 30_000,
  stopOnTerminal: true,
};

const taskProvider = createSupaCloudTaskProvider({ supacloud, subscription });
```

省略 `realtime` 即只使用轮询。Realtime 行必须符合 SDK 的任务契约，包括匹配的
`id` 和 `project_ref`；由应用自行发布任务表并设置授权，不应暴露平台内部任务表。
`createSupaCloudTaskLiveProvider` 支持同一工厂选项，提交后任务句柄的订阅也会使用它。

工厂创建时会校验并快照配置。轮询间隔必须为正整数，超时与对账间隔还可以为零；
所有间隔最多为 `2_147_483_647` 毫秒。schema/table 使用不超过 63 个字符的 ASCII 标识符。
用户回调仍通过 `subscribe` 或工厂的 `onError` 提供，不能塞进 `subscription` 覆盖校验逻辑。

保留返回的清理函数，并在视图或目标变化时调用。退订会中止正在进行的轮询读取，
并阻止迟到回调，但不会取消服务端任务，也不能证明写操作已经回滚。

### 支持的方法

- `submit(taskName, options)`
- `get(taskId)`
- `list(params?)`
- `listDlq(params?)`
- `cancel(taskId)`
- `retry(taskId)`
- `subscribe(taskId, callback, onError?)`

### 经校验的契约

仅接受现代 `{ tasks: ... }` 客户端，不再支持旧版裸任务客户端或由调用方任意指定结果类型的泛型。
已安装的 `@supacloud/js` 0.33.0 与 `@supabase/supabase-js` 2.117.1 契约通过了
注入 HTTP、轮询和实时传输的测试；这些测试不代表真实部署环境已经验收。
可选 SDK peer 范围现在是 `^0.33.0`，不再是 `^0.23.1`，请同时升级 SDK 与适配器。
SDK 要求任务提交返回 HTTP 202，任务回执带上匹配配置的 `project_ref`。
死信队列使用任务列表端点的 `dlq=true` 参数，不再调用独立的 `/tasks/dlq` 路由。

本次迁移尚未增加浏览器业务命令适配器。已发布的 SDK 0.33.0 不导出
`@supacloud/js/contracts`，需要上游浏览器入口发布并验证后再通过后续改动接入。
不能把仅限 service-role 的 `supacloud.commands` 命名空间接成浏览器操作。

所有 SDK 回执先视为 `unknown`，任务记录、列表、提交句柄、订阅摘要和自定义实时事件
均在使用前校验。`payload`、`result` 和扩展字段仍为 `unknown`，
业务代码必须先通过自己的 schema 校验再读取字段。任务日期只接受 JSON 字符串或
`null`，不接受原生 `Date`；通用任务契约检查其形状，但不保证 ISO 日期语义。

提交的正文和元数据必须是 JSON 对象。`meta` 映射到 SDK 的 `metadata`，
不能通过保留的元数据或幂等请求头覆盖这些值。
列表筛选仅接受 `status`、`taskType`、`functionSlug`、`dlq` 和 `limit`；
DLQ 参数仅接受 `limit`。非法输入在请求发出前被拒绝。

提交句柄必须有 `id`，`wait()` 返回 ID 匹配的终态记录。
取消和重试返回 ID 匹配的当前记录，不虚构终态：
请求取消一个运行中的任务，回执仍可能是 `running`。

失败使用脱敏的 `TaskError` 错误码。`writeMayHaveSucceeded: true`
表示写入已经尝试、但结果尚未确认，不表示已经回滚。
通过工厂的 `onError` 或单次订阅的可选错误回调处理异步失败。
非法订阅数据会终止订阅；清理完成后，后续 SDK 更新不会再进入应用。

核心任务钩子和任务操作按钮同样校验自定义 `TaskProvider` 的回执。
直接使用自定义提供方时，可通过 `@svadmin/core` 的 `withValidatedTaskProvider`
包装传输层。传输方法返回 `unknown`，调用方不能通过钩子泛型任意指定结果类型。

### 提交任务

```ts
const task = await taskProvider.submit('aorist-ai/generate/crop', {
  body: { image_id: 'img_123' },
  idempotencyKey: 'crop-img_123-v1',
});

const finalState = await task.wait();
console.log(finalState.status);
```

### 查询任务

```ts
const latest = await taskProvider.get('task_123');
const recent = await taskProvider.list({ limit: 20 });
const dlq = await taskProvider.listDlq({ limit: 20 });
```

### 取消与重试

```ts
await taskProvider.cancel('task_123');
await taskProvider.retry('task_123');
```

## 任务 Live Provider

如果你想把 `tasks.subscribe()` 接入 svadmin 的 `LiveProvider` 体系，可以使用 `createSupaCloudTaskLiveProvider()`：

```ts
import { createSupaCloudTaskLiveProvider } from '@svadmin/supabase/supacloud';

const taskLiveProvider = createSupaCloudTaskLiveProvider({ supacloud });
```

这个 provider 在订阅时要求提供 `liveParams.taskId`：

```ts
const stop = taskLiveProvider.subscribe({
  resource: 'tasks',
  liveParams: { taskId: 'task_123' },
  callback: (event) => {
    console.log(event.type);
    console.log(event.payload);
  },
});

stop();
```

默认情况下，任务状态更新会被映射成：

```ts
{
  type: 'UPDATE',
  resource: 'tasks',
  payload: task,
}
```

如果你需要自定义映射逻辑，可以使用 `mapTaskToEvent`：

```ts
const taskLiveProvider = createSupaCloudTaskLiveProvider({
  supacloud,
  resource: 'jobs',
  mapTaskToEvent: (task, resource) => ({
    type: task.status === 'queued' ? 'INSERT' : 'UPDATE',
    resource,
    payload: task,
  }),
});
```

## 与现有 Supabase Provider 组合使用

推荐方式是组合，而不是替代：

```ts
import {
  createSupabaseAuthProvider,
  createSupabaseDataProvider,
  createSupabaseLiveProvider,
} from '@svadmin/supabase';
import {
  createSupaCloudTaskProvider,
  createSupaCloudTaskLiveProvider,
} from '@svadmin/supabase/supacloud';

const dataProvider = createSupabaseDataProvider(supabase);
const authProvider = createSupabaseAuthProvider(supabase);
const liveProvider = createSupabaseLiveProvider(supabase);

const taskProvider = createSupaCloudTaskProvider({ supacloud });
const taskLiveProvider = createSupaCloudTaskLiveProvider({ supacloud });
```

日常管理后台 CRUD 继续走标准 Supabase Provider；只有在需要平台任务语义时，再使用 SupaCloud 这层增强。
