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
bun add @svadmin/supabase @supabase/supabase-js@^2.115.0 @supacloud/js@^0.33.0
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

### Subscription Transport

SDK `0.33.0` polls the Management API by default. It does not assume a
`public.tasks` Realtime table exists. Set `subscription` on the factory to
configure polling or explicitly subscribe to your own published task table:

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

Omit `realtime` to use polling only. Realtime rows must satisfy the SDK task
contract, including the matching `id` and `project_ref`; publish and authorize the
application-owned table yourself. Do not expose platform-internal task tables.
The same factory option is supported by `createSupaCloudTaskLiveProvider` and
applies to subscriptions made through submitted task handles.

Options are validated and captured when the provider is created. Poll intervals
must be positive integers; timeout/reconciliation intervals also accept zero.
All intervals are limited to `2_147_483_647` milliseconds. Schema/table names use
ASCII identifiers up to 63 characters. User callbacks belong in `subscribe` or
the factory's `onError`, not in `subscription`.

Keep the returned cleanup function and call it when the view or target changes.
Cleanup aborts an active polling read and suppresses late callbacks; it does not
cancel the server task or prove that a write was rolled back.

### Supported Methods

- `submit(taskName, options)`
- `get(taskId)`
- `list(params?)`
- `listDlq(params?)`
- `cancel(taskId)`
- `retry(taskId)`
- `subscribe(taskId, callback, onError?)`

### Validated Contract

Only the modern `{ tasks: ... }` client is accepted. Bare legacy task clients and
caller-selected result generics are removed. The installed SDK contract is tested
with `@supacloud/js` 0.33.0 and `@supabase/supabase-js` 2.117.1; these tests use
injected HTTP, polling and realtime transports, not a hosted deployment.
The optional SDK peer range is now `^0.33.0`, not `^0.23.1`. Upgrade the SDK and
adapter together. SDK task submission expects HTTP 202, and task responses must
carry the configured `project_ref`. The DLQ uses the task-list endpoint with
`dlq=true`, not a separate `/tasks/dlq` route.

This migration does not add a browser business-command adapter. The published
SDK 0.33.0 does not export `@supacloud/js/contracts`; the upstream browser entry
must be released and validated before a follow-up can depend on it. Never wire
the service-role-only `supacloud.commands` namespace into a browser action.

All SDK responses enter as `unknown`. Records, list results, submit handles,
subscription snapshots, and custom live events are validated before use.
`payload`, `result`, and extension fields remain `unknown`; validate a business
schema before reading their fields. Task dates are JSON strings or `null`, not
`Date` objects. Their shape is checked, but the generic task contract does not
promise ISO timestamp semantics.

Submission bodies and metadata must be JSON objects. `meta` maps to the SDK's
`metadata`; reserved metadata/idempotency headers cannot override these values.
List filters accept only `status`, `taskType`, `functionSlug`, `dlq`, and `limit`;
DLQ parameters accept only `limit`. Invalid input is rejected before dispatch.

Every submitted handle has an `id`. `wait()` returns a matching terminal record.
Cancel and retry return the matching current record, not a fabricated terminal
state: cancellation of a running task can still return `running`.

Failures use sanitized `TaskError` codes. `writeMayHaveSucceeded: true` means a
write was attempted but its outcome could not be confirmed; it does not mean the
write was rolled back. Use the factory's `onError` or the subscription's optional
error callback to handle asynchronous failures. Invalid subscription data stops
the subscription, and cleanup suppresses subsequent SDK updates.

Core task hooks and task action buttons also validate custom `TaskProvider`
responses. For direct custom-provider use, wrap the transport with
`withValidatedTaskProvider` from `@svadmin/core`. Its transport methods return
`unknown`; callers cannot select an arbitrary result type through a hook generic.

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
