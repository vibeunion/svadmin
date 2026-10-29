---
title: Form & Table Hooks
description: useForm, useTable, useStepsForm, useModal, useDrawer
---

## `useForm`

Full-featured form hook with auto-save, validation, and route auto-derivation.

### Basic Usage

```typescript
const form = useForm({ resource: 'posts', action: 'create' });
```

`resource`, `action`, and `id` are explicit contract inputs. Route ownership stays in
the host: parse the route and pass the resolved values to `useForm`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resource` | `string?` | auto | Resource name (auto from route) |
| `action` | `'create' \| 'edit' \| 'clone'` | auto | Form action |
| `id` | `string \| number` | auto | Record ID for edit/clone |
| `redirect` | `'list' \| 'edit' \| 'show' \| false` | `'list'` | Where to go after submit |
| `validate` | `(values) => errors \| null` | — | Client-side validation |
| `autoSave` | `{ enabled, debounce? }` | — | Auto-save dirty fields for **edit** forms; create/clone forms stay manual |
| `warnWhenUnsavedChanges` | `boolean` | global option | Browser before-unload guard for dirty forms |
| `successNotification` | `string \| false` | generated message | Set `false` when the page renders the completed state |
| `errorNotification` | `string \| false` | provider error | Override or disable the global error notification |

### Return Value

```typescript
const {
  // Form values (single source of truth)
  values,         // TVariables (reactive)
  setFieldValue,  // (field, value, opts?) => void
  setValues,      // (newValues, opts?) => void

  // Tainted (dirty) state
  tainted,        // Record<string, boolean> (reactive)
  isTainted,      // (field?) => boolean

  // Errors
  errors,         // Record<string, string> (reactive)
  setFieldError,  // (field, message) => void
  clearFieldError, // (field) => void
  clearErrors,    // () => void
  validateField,  // (field) => string | null

  // Submission
  submit,         // (overrides?) => Promise<void> — validates + submits
  reset,          // () => void — reset to initial values

  // State
  loading,        // boolean — query loading (edit/clone)
  submitting,     // boolean — mutation in progress
  resource,       // string
  action,         // 'create' | 'edit' | 'clone'
  id,             // string | number | undefined
  setId,          // (newId) => void

  // AutoSave
  triggerAutoSave, // () => void — save immediately even before the debounce elapses
  autoSave,       // { status: 'idle' | 'saving' | 'saved' | 'error', data, error }

  // Read-only query view (edit/clone mode)
  query,          // { data, error, isPending, isError, isSuccess, refetch }
  ready,          // boolean — hydrated and scoped to the current target
  isDirty,        // boolean — alias of isTainted()
} = useForm();
```

### HttpError Integration

When your DataProvider throws `HttpError`, validation errors are automatically mapped to form fields:

```typescript
// In your DataProvider:
throw new HttpError('Validation Failed', 422, {
  email: ['Email is required'],
  name: 'Name is too short',
});
// → form.errors = { email: 'Email is required', name: 'Name is too short' }
```

## `useStepsForm`

Multi-step wizard form with step navigation and per-step validation.

### Basic Usage

```svelte
<script lang="ts">
  import { defineResource, useStepsForm } from '@svadmin/core';
  import { Type } from 'typebox';

  const products = defineResource('products', {
    record: Type.Object({ id: Type.Number(), name: Type.String(), price: Type.Number() }),
    create: Type.Object({ name: Type.String({ minLength: 1 }), price: Type.Number({ minimum: 0 }) }),
  });
  const form = useStepsForm({
    resource: products,
    action: 'create',
    steps: [{ fields: ['name'] }, { fields: ['price'] }, { fields: [] }],
  });
  async function save() {
    try { await form.submit(); }
    catch { /* Render the checked form errors below. */ }
  }
</script>

{#if form.steps.currentStep === 0}
  <input aria-label="Name" value={typeof form.values.name === 'string' ? form.values.name : ''}
    oninput={(event) => form.setFieldValue('name', event.currentTarget.value)} />
{:else if form.steps.currentStep === 1}
  <input aria-label="Price" type="number" value={typeof form.values.price === 'number' ? form.values.price : ''}
    oninput={(event) => {
      const value = event.currentTarget.valueAsNumber;
      form.setFieldValue('price', Number.isFinite(value) ? value : undefined);
    }} />
{:else}
  <p>Review and submit</p>
  <button onclick={save} disabled={!form.ready || form.submitting}>Save</button>
{/if}

{#each Object.values(form.errors) as message}
  <p role="alert">{message}</p>
{/each}
{#if form.error}<p role="alert">{form.error.message}</p>{/if}
<button onclick={() => form.steps.prevStep()} disabled={!form.steps.canGoPrev}>Back</button>
<button onclick={() => form.steps.nextStep()} disabled={!form.steps.canGoNext}>Next</button>
```

Use this hook inside an admin and query-client context. Edit forms require an
explicit contract-typed `id`. `steps` replaces `stepsCount`; field names derive
from the operation schema. Forward jumps validate all preceding steps, while
`isBackValidate: true` also validates the current step before going backward.
`defaultStep` must be an in-range integer. Changing the step layout resets the
workflow and cancels stale completion effects. Draft reads remain unknown until
validated; `submit()` checks the entire payload and receipt and rejects failure.

### Return Value

Extends `useForm` return with a `steps` object:

| Property | Type | Description |
|----------|------|-------------|
| `currentStep` | `number` | Current step index (0-based) |
| `totalSteps` | `number` | Total number of steps |
| `gotoStep` | `(step: number) => boolean` | Validate and navigate; rejects invalid indexes |
| `nextStep` | `() => boolean` | Advance after validating all preceding steps |
| `prevStep` | `() => boolean` | Go back, optionally validating the current step |
| `canGoNext` | `boolean` | Whether next step is available |
| `canGoPrev` | `boolean` | Whether previous step is available |

## Modal and drawer forms

`useModalForm` / `useDrawerForm` are retired. Compose the disclosure primitive with
`useForm` (or `<AutoForm>`) instead; this keeps one form contract and optional URL
restoration.

```svelte
<script lang="ts">
  import { useModal, useForm } from '@svadmin/core';
  const modal = useModal({ syncWithLocation: true });
  // useForm still receives the explicit resource/action and optional id.
</script>

<button onclick={modal.show}>Create post</button>
{#if modal.visible}
  <dialog open>
    <AutoForm resourceName="posts" mode="create" onSuccess={modal.close} />
    <button type="button" onclick={modal.close}>Cancel</button>
  </dialog>
{/if}
```

- `useModal()` → `{ visible, show, close, toggle }`
- `useDrawer()` → identical shape, URL parameter defaults to `drawer`
- `syncWithLocation` keeps the open state in the current route query so refresh and
  back/forward restore it; `param` overrides the query parameter name.

For route-driven edit pages keep using `<AutoForm mode="edit" id={...}>`; the route
already carries the record identity.

## `useTable`

Table hook with pagination, sorting, filtering, and URL sync.

### Basic Usage

```typescript
const table = useTable({ resource: 'posts' });
```

### Route Auto-Derivation

```typescript
const table = useTable(); // auto-derives resource from route
```

### Options

| Option | Type | Default |
|--------|------|---------|
| `resource` | `string?` | auto |
| `pagination` | `Pagination` | `{ current: 1, pageSize: 10 }` |
| `sorters` | `Sort[]` | `[]` |
| `filters` | `Filter[]` | `[]` |
| `syncWithLocation` | `boolean` | `false` |

### Return Value

```typescript
const {
  query,         // TanStack query result
  pagination,    // { current, pageSize } — reactive $state
  sorters,       // Sort[] — reactive $state
  filters,       // Filter[] — reactive $state
  setCurrent,    // (page) => void
  setPageSize,   // (size) => void
  setSorters,    // (sorters) => void
  setFilters,    // (filters) => void
} = useTable();
```
