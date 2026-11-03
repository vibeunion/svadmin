<!-- component-docs:start -->
# Generated component reference

Generated from `packages/ui/src/component-registry.ts` and `packages/ui/src/design-contract.ts`.
Do not edit by hand. Refresh with `bun scripts/component-docs.ts --write`.

## Design contract

| Contract | svadmin/design-v1 |
| Page families | list, form, detail, workspace, dashboard |
| Page states | ready, loading, empty, filtered-empty, error, forbidden |
| Metric tones | neutral, success, warning, danger, info |

## PagePattern

`@svadmin/ui/components/PagePattern.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| kind | enum | yes |  | list, form, detail, workspace, dashboard |  |
| title | string | yes |  |  |  |
| description | string |  |  |  |  |
| eyebrow | string |  |  |  |  |
| pageId | string |  |  |  |  |
| width | enum |  | default | narrow, default, wide |  |
| density | enum |  | comfortable | comfortable, compact | Deprecated compatibility prop; use the shared baseline. |
| state | enum |  | ready | ready, loading, empty, filtered-empty, error, forbidden |  |
| stateTitle | string |  |  |  |  |
| stateDescription | string |  |  |  |  |
| retry | callback |  |  |  | Use an error-state retry callback. |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| ready | page-pattern |
| loading | page-pattern |
| empty | page-pattern |
| filtered-empty | page-pattern |
| error | page-pattern |
| forbidden | page-pattern |

### Copy as Svelte

```svelte
<PagePattern
  kind="list"
  title="Title"
  width="default"
  density="comfortable"
  state="ready"
>
  {#snippet children()}
  {/snippet}
  {#snippet actions()}
  {/snippet}
  {#snippet toolbar()}
  {/snippet}
  {#snippet metrics()}
  {/snippet}
  {#snippet secondary()}
  {/snippet}
  {#snippet footer()}
  {/snippet}
  {#snippet stateAction()}
  {/snippet}
</PagePattern>
```
## ContentPageShell

`@svadmin/ui/components/content/ContentPageShell.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| title | string |  |  |  |  |
| eyebrow | string |  |  |  |  |
| description | string |  |  |  |  |
| pageId | string |  |  |  |  |
| width | enum |  | default | narrow, default, wide |  |
| density | enum |  | comfortable | comfortable, compact | Deprecated compatibility prop; use the shared baseline. |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | content-page-shell |

### Copy as Svelte

```svelte
<ContentPageShell
  width="default"
  density="comfortable"
>
  {#snippet children()}
  {/snippet}
  {#snippet actions()}
  {/snippet}
</ContentPageShell>
```
## ContentPageHeader

`@svadmin/ui/components/content/ContentPageHeader.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| title | string | yes |  |  |  |
| eyebrow | string |  |  |  |  |
| description | string |  |  |  |  |
| breadcrumbs | string[] |  |  |  |  |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | content-page-header |

### Copy as Svelte

```svelte
<ContentPageHeader
  title="Title"
>
  {#snippet actions()}
  {/snippet}
</ContentPageHeader>
```
## MetricBlock

`@svadmin/ui/components/content/MetricBlock.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | yes |  |  |  |
| value | string | number | yes |  |  |  |
| detail | string |  |  |  |  |
| trend | string |  |  |  |  |
| trendTone | enum |  | neutral | positive, negative, warning, neutral |  |
| loading | boolean |  | false |  |  |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | metric-block |
| loading | metric-block |

### Copy as Svelte

```svelte
<MetricBlock
  label="Title"
  value={0}
  trendTone="neutral"
  loading={false}
>
  {#snippet icon()}
  {/snippet}
</MetricBlock>
```
## SettingsFieldRow

`@svadmin/ui/components/content/SettingsFieldRow.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| label | string | yes |  |  |  |
| description | string |  |  |  |  |
| separated | boolean |  | false |  |  |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | settings-field-row |
| separated | settings-field-row |

### Copy as Svelte

```svelte
<SettingsFieldRow
  label="Title"
  separated={false}
>
  {#snippet control()}
  {/snippet}
</SettingsFieldRow>
```
## SettingsGroup

`@svadmin/ui/components/content/SettingsGroup.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| title | string | yes |  |  |  |
| description | string |  |  |  |  |
| class | string |  |  |  |  |
| bodyClass | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | settings-group |

### Copy as Svelte

```svelte
<SettingsGroup
  title="Title"
>
  {#snippet children()}
  {/snippet}
  {#snippet actions()}
  {/snippet}
</SettingsGroup>
```
## WorkspaceLayout

`@svadmin/ui/components/content/WorkspaceLayout.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| secondaryWidth | string |  | 22rem |  |  |
| secondaryCollapsed | boolean |  | false |  |  |
| secondaryCollapsedWidth | string |  | 3rem |  |  |
| mobileOrder | enum |  | primary-first | primary-first, secondary-first |  |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | workspace-layout |
| secondary-collapsed | workspace-layout |

### Copy as Svelte

```svelte
<WorkspaceLayout
  secondaryWidth="22rem"
  secondaryCollapsed={false}
  secondaryCollapsedWidth="3rem"
  mobileOrder="primary-first"
>
  {#snippet primary()}
  {/snippet}
  {#snippet summary()}
  {/snippet}
  {#snippet secondary()}
  {/snippet}
</WorkspaceLayout>
```
## button

`@svadmin/ui/components/ui/button/button.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| variant | enum |  | default | default, outline, secondary, ghost, destructive, link, dashed, text |  |
| size | enum |  | default | default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg |  |
| disabled | boolean |  | false |  |  |
| disabledReason | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | button |
| disabled | button |
| focus-visible | button |

### Copy as Svelte

```svelte
<button
  variant="default"
  size="default"
  disabled={false}
>
  {#snippet children()}
  {/snippet}
</button>
```
## badge

`@svadmin/ui/components/ui/badge/badge.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| variant | enum |  | default | default, secondary, destructive, subtle, subtle-success, subtle-warning, subtle-destructive, subtle-pill, outline, ghost, link |  |
| size | enum |  | default | default, compact |  |

### State matrix

| State | Component |
| --- | --- |
| default | badge |

### Copy as Svelte

```svelte
<badge
  variant="default"
  size="default"
>
  {#snippet children()}
  {/snippet}
</badge>
```
## textarea

`@svadmin/ui/components/ui/textarea/textarea.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |

### State matrix

| State | Component |
| --- | --- |
| default | textarea |
| disabled | textarea |
| focus-visible | textarea |
| aria-invalid | textarea |

### Copy as Svelte

```svelte
<textarea />
```
## SectionHeader

`@svadmin/ui/components/content/SectionHeader.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| title | string | yes |  |  |  |
| description | string |  |  |  |  |
| id | string |  |  |  |  |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | section-header |

### Copy as Svelte

```svelte
<SectionHeader
  title="Title"
>
  {#snippet actions()}
  {/snippet}
</SectionHeader>
```
## PageToolbar

`@svadmin/ui/components/content/PageToolbar.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | page-toolbar |

### Copy as Svelte

```svelte
<PageToolbar>
  {#snippet leading()}
  {/snippet}
  {#snippet trailing()}
  {/snippet}
  {#snippet children()}
  {/snippet}
</PageToolbar>
```
## StatusBadge

`@svadmin/ui/components/content/StatusBadge.svelte`

### Props

| Prop | Kind | Required | Default | Values | Description |
| --- | --- | --- | --- | --- | --- |
| status | enum | yes |  | success, warning, danger, info, neutral |  |
| label | string |  |  |  | Defaults to status |
| class | string |  |  |  |  |

### State matrix

| State | Component |
| --- | --- |
| default | status-badge |

### Copy as Svelte

```svelte
<StatusBadge
  status="success"
 />
```
<!-- component-docs:end -->
