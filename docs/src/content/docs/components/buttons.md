---
title: CRUD Buttons
description: 10 pre-built action buttons for admin operations
---

svadmin includes 10 action buttons that integrate with data hooks and routing.

## Available Buttons

| Button | Description | Key Action |
|--------|-------------|------------|
| `CreateButton` | Navigate to create form | `navigate('/{resource}/create')` |
| `EditButton` | Navigate to edit form | `navigate('/{resource}/edit/{id}')` |
| `DeleteButton` | Delete with confirmation | `useDelete().mutate()` |
| `ShowButton` | Navigate to detail view | `navigate('/{resource}/show/{id}')` |
| `ListButton` | Navigate to list | `navigate('/{resource}')` |
| `RefreshButton` | Refresh scoped data queries | `useInvalidate({ resource: contract })` |
| `ExportButton` | Export validated data as CSV | `useExport({ resource: contract })` |
| `ImportButton` | Import validated CSV or JSON | `useImport({ resource: contract })` |
| `SaveButton` | Submit form | Triggers `submit()` |
| `CloneButton` | Clone existing record | `navigate('/{resource}/create?clone={id}')` |

## Usage

```svelte
<script>
  import { EditButton, DeleteButton } from '@svadmin/ui';
</script>

<EditButton resource="posts" id={record.id} />
<DeleteButton resource="posts" id={record.id} onSuccess={() => refetch()} />
```

## Export Contracts

`ExportButton resource="posts"` requires that resource's metadata to include a
genuine `contract` created with `defineResource`. All pages are checked against
the business schema before download; display fields are not a schema.

For programmatic exports, use the public `useExport({ resource: postsContract })`.
The result and mapper input are inferred from the contract. The old resource-name
API and unsafe export are removed. Failures reject even with `onError`; changing
resource, tenant or provider cancels pending downloads. The button disables while
busy and displays a sanitized error on failure, after which it can be retried.

## Import Contracts

`ImportButton resource="posts"` requires a registered `contract` with a create
schema. All parsed/mapped rows are validated before the first write. CSV values
remain strings; supply `mapData` for explicit business conversions. Malformed
CSV and schema-invalid input fail without writing rows.

```svelte
<ImportButton resource="posts" onFinish={({ succeeded, errored }) => console.log(succeeded, errored)} />
```

Successful entries are checked records. Failed entries contain `row` (a one-based
data-row index), `request` and a sanitized `error`. Partially completed imports
are not rolled back and uncertain writes are not automatically retried.
The button respects import permission and `canCreate`, prevents duplicate events
and allows explicit file re-selection after failure.

Use the public `useImport({ resource: postsContract })` and await
`handleChange({ file })` for programmatic import. Completion waits for the captured
source's related caches to finish refreshing. File/input failures and cancellation
reject; changing scope stops subsequent writes without undoing dispatched requests.
The unsafe importer and old resource-name API have been removed.

## Refresh Contracts

`RefreshButton` also requires the named resource's registered `contract`. It
refreshes list and many-query caches in that contract, resource, tenant and
named-provider route, waiting for all selected queries to settle. Busy state
prevents repeated clicks; failure displays a sanitized error and permits retry.

For programmatic refresh, initialize `const invalidate = useInvalidate({
resource: postsContract })` during component setup, then call
`await invalidate({ invalidates: ['list', 'many'] })`. Its return type is
`Promise<void>`; failures reject. Empty scope arrays and `false` are no-ops, and
record IDs must match the bound schema. Instance isolation covers queries from
`useList`, `useOne`, `useMany`, `useInfiniteList`, and their table/show consumers.
Form-specific and selector queries still require instance-key migration.
