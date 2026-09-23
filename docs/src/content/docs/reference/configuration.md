---
title: Configuration
description: Complete configuration reference for svadmin
---

## AdminApp Props

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `dataProvider` | `DataProvider \| Record<string, DataProvider>` | ✅ | — |
| `providerBundle` | `ProviderBundle` | — | — |
| `authProvider` | `AuthProvider` | — | — |
| `accessControlProvider` | `AccessControlProvider` | — | — |
| `auditLogProvider` | `AuditLogProvider` | — | — |
| `organizationProvider` | `OrganizationProvider` | — | — |
| `identityGovernanceProvider` | `IdentityGovernanceProvider` | — | — |
| `sessionProvider` | `SessionProvider` | — | — |
| `credentialProvider` | `CredentialProvider` | — | — |
| `resources` | `ResourceDefinition[]` | ✅ | — |
| `routerProvider` | `RouterProvider` | — | Hash router |
| `title` | `string` | — | `'Admin'` |
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | — | `'system'` |
| `themeConfig` | `ThemeConfig` | — | — |

`providerBundle.dataProvider` satisfies the required data provider when the top-level `dataProvider` prop is omitted. For incremental migration, top-level provider props override fields with the same name in `providerBundle`. Enterprise providers are tree-scoped; missing providers leave the corresponding built-in settings controls unavailable rather than using demo persistence.

Provider contracts define the UI/backend boundary. The backend must still enforce authorization and tenant scope for every call. Sensitive mutations should implement business persistence and audit persistence atomically on the server; calling `writeAuditEntry()` separately from a remote mutation does not create a distributed transaction.

Enterprise provider methods receive `EnterpriseRequestContext` from the active `AdminApp` tree. `writeAuditEntry()` is fail-closed and requires an `AuditLogProvider`; it is not a replacement for a backend transaction that commits the sensitive mutation and its audit record together.

## Validated Audit Contracts

Wrap remote audit implementations with `withValidatedAuditProvider(transport)`.
`AuditLogTransport.create` and `get` return `Promise<unknown>`; the wrapper
validates input and returned records before exposing `AuditLogProvider`.
Global registration also installs this wrapper. Audit records are append-only:
the old `update` method is removed.

`writeAuditEntry` accepts `AuditDraft`, without caller-supplied `id` or
`timestamp`. It creates a canonical UTC timestamp, snapshots plain JSON data,
waits for the handler, and checks the persistent provider's receipt against the
original input. A provider may add server-generated fields but must preserve
submitted values. Invalid or unconfirmed writes reject with a sanitized
`AuditError`; `writeMayHaveSucceeded` warns against assuming rollback or blindly
retrying. The best-effort `audit` helper logs sanitized failures instead of
providing durable-write acknowledgement.

Migration changes:

- `resource` is optional for login/logout events, not an empty string.
- `tenantId`, `requestId`, `traceId`, `mutationId`, and `outcome` remain explicit
  event fields. `details` is no longer renamed to `data`.
- Optional fields must be omitted, not explicitly set to `undefined`. Nested
  values must be plain JSON; dates, accessors, cycles and nonfinite numbers fail.
- Supabase's audit handler stores the entire validated event in `audit_log.details`,
  alongside the indexed `action`, `resource`, `record_id`, `user_id`, and
  `created_at` columns. Numeric record ID `0` remains `"0"`. Readers of the old
  details-only storage format must migrate; the adapter does not rewrite history.
- Supabase database rejection is not successful delivery. Validated rejections
  produce `WRITE_REJECTED`; malformed receipts, timeouts, and transport failures
  produce `WRITE_OUTCOME_UNKNOWN`.

These checks validate data contracts, not backend authorization, retention,
append-only database enforcement, or atomic business/audit persistence.

## Resource Definition

```typescript
interface ResourceDefinition {
  name: string;               // URL segment (e.g. 'posts')
  label: string;              // Display name (e.g. 'Blog Posts')
  icon?: string;              // Sidebar icon
  primaryKey?: string;        // Default: 'id'
  fields: FieldDefinition[];
  defaultSort?: Sort;
  pageSize?: number;          // Default: 10
  canCreate?: boolean;        // Default: true
  canEdit?: boolean;
  canDelete?: boolean;
  canShow?: boolean;
  meta?: Record<string, unknown> & {
    dataProviderName?: string;  // For multi-provider setups
  };
}
```

## Field Definition

```typescript
interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect'
    | 'tags' | 'textarea' | 'richtext' | 'image' | 'images' | 'json'
    | 'relation' | 'color' | 'url' | 'email' | 'phone';
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  width?: string;
  showInList?: boolean;
  showInForm?: boolean;
  showInCreate?: boolean;
  showInEdit?: boolean;
  showInShow?: boolean;
  options?: { label: string; value: string | number }[];
  defaultValue?: unknown;
  resource?: string;       // Related resource (relations)
  optionLabel?: string;
  optionValue?: string;
  validate?: (value: unknown) => string | null;
}
```

## Theme Configuration

Use `themeConfig` to select the color preset and layout style. The default
layout is `default`; `clean-flat` enables the restrained, high-contrast panel
layout used by the Stripe-inspired example.

```svelte
<AdminApp
  {dataProvider}
  {resources}
  defaultTheme="system"
  themeConfig={{
    colorPreset: 'stripe',
    layoutPreset: 'clean-flat',
  }}
/>
```

`ThemeConfig` supports the following options:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `strategy` | `'standard' \| 'dark-first'` | `'standard'` | Controls whether dark mode adds `.dark` or light mode adds `.light` |
| `colorPreset` | `ColorPreset \| string` | `'stripe'` | Built-in or registered color preset; persisted or explicit selections still take precedence |
| `layoutPreset` | `'default' \| 'clean-flat'` | `'default'` | Layout treatment for the application shell |
| `cssOverrides` | `Record<string, string>` | — | CSS variables injected on `<html>` |
| `disableColorScheme` | `boolean` | `false` | Skip the built-in `color-scheme` attribute |

Eight color presets are built in:

| Theme | ID | Preview color |
|-------|----|---------------|
| Neutral | `neutral` | `#71717a` |
| Indigo | `indigo` | `#4f46e5` |
| Blue | `blue` | `#3b82f6` |
| Green | `green` | `#22c55e` |
| Rose | `rose` | `#f43f5e` |
| Orange | `orange` | `#f97316` |
| Violet | `violet` | `#8b5cf6` |
| Stripe | `stripe` | `#635bff` |

Use `registerColorPreset()` to add a custom preset, or use
`setColorTheme()`/`getColorThemes()` for runtime selection.

## Internationalization (I18n)

`@svadmin/core` includes a lightweight internationalization system via the `useTranslation` hook. In components, keep the returned object intact and access its properties in markup so Svelte reads the latest values during render:

```svelte
<script>
  import { useTranslation, addTranslations } from '@svadmin/core';

  const i18n = useTranslation();

  addTranslations('ja-JP', { 'common.test': 'テスト' });
</script>

<h1>{i18n.t('common.save')}</h1>
<p>Current language: {i18n.locale}</p>
<button onclick={() => i18n.setLocale('ja-JP')}>Switch to Japanese</button>
```
