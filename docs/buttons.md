# CRUD Buttons

Standalone navigation and action buttons for resource CRUD operations. Each button handles routing, access control, and i18n automatically.

## Common Props

All buttons share these optional props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resource` | `string` | — | Resource name |
| `hideText` | `boolean` | `false` | Show icon only |
| `class` | `string` | `''` | Additional CSS classes |
| `accessControl` | `{ enabled?, hideIfUnauthorized? }` | — | Permission checks |

## Buttons

### CreateButton

Navigate to the create page for a resource.

```svelte
<CreateButton resource="posts" />
<CreateButton resource="posts" hideText />
<CreateButton resource="posts" accessControl={{ enabled: true, hideIfUnauthorized: true }} />
```

### EditButton

Navigate to the edit page for a specific record.

```svelte
<EditButton resource="posts" recordItemId={42} />
```

### DeleteButton

Delete a record with inline confirmation.

```svelte
<DeleteButton resource="posts" recordItemId={42} />
<DeleteButton resource="posts" recordItemId={42} undoable />
<DeleteButton resource="posts" recordItemId={42} onSuccess={() => console.log('deleted')} />
```

### ShowButton

Navigate to the detail/show page for a record.

```svelte
<ShowButton resource="posts" recordItemId={42} />
```

### ListButton

Navigate back to the list page for a resource.

```svelte
<ListButton resource="posts" />
```

### RefreshButton

Refresh list and many-query caches for a resource with a registered
`ResourceDefinition.contract`. The button waits for all selected refetches,
disables repeated clicks while pending, and permits retry after a failure.

```svelte
<RefreshButton resource="posts" />
```

For programmatic refresh, initialize
`const invalidate = useInvalidate({ resource: postsContract })` during component
setup, then call `await invalidate({ invalidates: ['list', 'many'] })`.
The hook returns `Promise<void>`, validates the scopes and record ID, and rejects
refresh failures. Empty scopes and `false` are no-ops. Cache matching retains the
current resource contract, tenant and named-provider route.

### ExportButton

Export all records to CSV using the built-in `useExport` hook.
The named resource must have a genuine `ResourceDefinition.contract` created
with `defineResource`; every returned page is checked against it. Invalid data
shows an error and does not create a partial download. Changing resource, tenant
or provider cancels a pending export.

```svelte
<ExportButton resource="posts" />
```

For programmatic exports, import `useExport` from `@svadmin/core` and pass
`{ resource: postsContract }`, not a resource-name string. `triggerExport()`
rejects on failure even when `onError` is provided. The unsafe entry point no
longer exports this hook.

### ImportButton

Import CSV or JSON records into a resource with a registered contract and create
schema. Every mapped row is validated before any write. CSV values stay strings;
use `mapData` for explicit conversions when the create schema requires numbers
or other business types.

```svelte
<ImportButton resource="posts" onFinish={({ succeeded, errored }) => console.log(succeeded, errored)} />
```

`succeeded` contains checked records, not raw provider envelopes. Each `errored`
entry contains a one-based data-row number, the validated request and a sanitized
error. A partial failure is not transactional rollback, and uncertain writes are
never automatically retried. Re-selecting a file is an explicit new import.
The button respects import permission and `canCreate`; scope changes stop further
writes and suppress stale completion callbacks.

For programmatic import, initialize `useImport({ resource: postsContract })`
from `@svadmin/core`, then await `handleChange({ file })`. The promise returns
the same result shape after captured list caches finish refreshing. File/input
failures and cancellation reject. `batchSize` uses `createMany` when available,
otherwise writes sequentially. The unsafe import entry point has been removed.

### SaveButton

Submit a form. Shows a loading spinner while saving.

```svelte
<SaveButton />
<SaveButton loading={true} />
<SaveButton type="button" />
```

### CloneButton

Navigate to the create page with data prefilled from an existing record.

```svelte
<CloneButton resource="posts" recordItemId={42} />
```

## Access Control

Buttons integrate with the permission system:

```svelte
<CreateButton
  resource="posts"
  accessControl={{
    enabled: true,
    hideIfUnauthorized: true  // hides button if user lacks permission
  }}
/>
```
