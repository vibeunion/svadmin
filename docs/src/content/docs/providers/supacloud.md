---
title: SupaCloud
description: Optional task orchestration enhancements for @svadmin/supabase
---

`@svadmin/supabase` keeps the official Supabase adapters focused on data, auth, audit, and realtime. The optional `@svadmin/supabase/supacloud` subpath adds task-oriented platform APIs on top of a normal `@supabase/supabase-js` client.

## Why a Separate Entry?

`@supacloud/js` does not replace `@supabase/supabase-js`. It wraps an existing Supabase client and adds platform semantics such as:

- task submission
- task polling / waiting
- dead-letter queue inspection
- cancel / retry helpers
- task status subscription

Keeping these APIs under `@svadmin/supabase/supacloud` avoids breaking the existing `createSupabaseAuthProvider`, `createSupabaseLiveProvider`, and `createSupabaseAuditHandler` signatures, while also keeping `@supacloud/js` optional for projects that only need plain Supabase.

## Installation

```bash
bun add @svadmin/supabase @supabase/supabase-js @supacloud/js
```

## Create the Clients

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

## Task Provider

Use `createSupaCloudTaskProvider()` when you want a thin, task-focused API surface without changing your existing svadmin providers.

```ts
import { createSupaCloudTaskProvider } from '@svadmin/supabase/supacloud';

const taskProvider = createSupaCloudTaskProvider({ supacloud });
```

### Supported Methods

- `submit(taskName, options)`
- `get(taskId)`
- `list(params?)`
- `listDlq(params?)`
- `cancel(taskId)`
- `retry(taskId)`
- `subscribe(taskId, callback)`

### Submit a Task

```ts
const task = await taskProvider.submit('aorist-ai/generate/crop', {
  body: { image_id: 'img_123' },
  idempotencyKey: 'crop-img_123-v1',
});

const finalState = await task.wait();
console.log(finalState.status);
```

### Query Existing Tasks

```ts
const latest = await taskProvider.get('task_123');
const recent = await taskProvider.list({ limit: 20 });
const dlq = await taskProvider.listDlq({ limit: 20 });
```

### Cancel or Retry

```ts
await taskProvider.cancel('task_123');
await taskProvider.retry('task_123');
```

## Task Live Provider

Use `createSupaCloudTaskLiveProvider()` when you want to bridge `tasks.subscribe()` into svadmin's `LiveProvider` contract.

```ts
import { createSupaCloudTaskLiveProvider } from '@svadmin/supabase/supacloud';

const taskLiveProvider = createSupaCloudTaskLiveProvider({ supacloud });
```

This provider expects `liveParams.taskId` when subscribing:

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

By default, task updates are mapped to:

```ts
{
  type: 'UPDATE',
  resource: 'tasks',
  payload: task,
}
```

You can override this behavior with `mapTaskToEvent`:

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

## With Existing Supabase Providers

The recommended pattern is composition:

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

Use the standard providers for your admin CRUD flows, and use the SupaCloud helpers only where you need platform task semantics.
