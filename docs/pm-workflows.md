# Operational Workflow Defaults

## Scope

The operations dashboard prioritizes stock risk, pending work, and data status.
Resource totals are collapsed by default. Metrics must describe their actual
data source; unavailable data is not a successful zero.

Role summaries use compact rows and an unframed permission panel.
Each page has one create entry in its header.

## Lists And Editing

- Default rows expose detail directly. Quick edit, full-page edit, and delete
  live in the action menu. Custom `rowActions` snippets remain unchanged.
- Quick edit uses the existing resource contract, permissions, validation,
  mutation feedback, and query invalidation. It does not navigate away.
- Escape, backdrop, close, and cancel respect unsaved changes. Closing is
  blocked during submission.
- Full-page editing remains available for complex workflows.
- `AutoForm` defaults to `redirect="list"`. Embedded consumers may explicitly
  set `redirect={false}` and provide `onCancel`.
- Empty results offer clear-all when search or filters are active; otherwise
  authorized users can create a record. Custom empty snippets retain control.

## Detail Information

Existing `FieldDefinition.group` values define detail sections. Ungrouped fields
remain visible; the first named section opens when it is the first section.
Subsequent named groups start collapsed. Use groups such as `Audit` for technical
metadata, but do not infer field importance from names or silently hide fields.
`showInShow: false` continues to exclude fields entirely.

## Acceptance

```gherkin
Scenario: Review the operations dashboard
  Given operational data is available
  When the dashboard opens
  Then three decision metrics are visible and resource totals are collapsed

Scenario: Quickly update a record
  Given a filtered list with selected records
  When an authorized user saves a quick edit
  Then the drawer closes without navigation and list context is retained

Scenario: Protect a draft
  Given a quick edit has unsaved changes
  When the user dismisses the drawer
  Then the user can keep editing or confirm discarding the draft

Scenario: Recover from an empty search
  Given a search returns no records
  When the user clears all criteria
  Then both search and filters are cleared

Scenario: Prevent accidental deletion
  Given a record permits deletion
  When the user selects Delete from its action menu
  Then confirmation is required before any delete request
```
