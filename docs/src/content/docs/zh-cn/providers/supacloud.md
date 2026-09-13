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
bun add @svadmin/supabase @supabase/supabase-js @supacloud/js
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
已安装的 `@supacloud/js` 0.23.1 契约通过了注入 HTTP 和实时传输的测试；
这些测试不代表真实部署环境已经验收。

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
