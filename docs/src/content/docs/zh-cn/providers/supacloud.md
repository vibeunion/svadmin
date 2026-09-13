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
- `subscribe(taskId, callback)`

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
