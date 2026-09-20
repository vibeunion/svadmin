# Nested form drafts and submission ownership

This continues #441/#444 without replacing the current nested JsonSchemaForm with
the scalar-only implementation in #434. It does not overwrite the product
recipes, layouts or async resource work being integrated separately in #443.

## Runtime changes

- Defaults are applied only to missing object keys. Explicit `undefined`, `null`,
  `false`, `0` and empty strings are not refilled. The wire snapshot omits only
  undefined object fields; an undefined/sparse array element is rejected, not
  silently converted to null. Nested object/array defaults remain supported.
- New object array entries initialize nested defaults and untouched required
  false booleans. Numeric entries start empty, never guessed as zero.
- Select values use choice indices internally, preserving the identity of
  numbers, strings, booleans and null. Display labels remain the original values.
- The submit handler receives an independent, bounded JSON copy, not live Svelte
  state. Cycles, non-finite numbers, functions, exotic objects, getters, symbol
  fields, unsafe property names and incomplete arrays fail before dispatch.
- All fields and array mutations are disabled during submission and in explicit
  `disabled`/`readonly` mode. Synchronous/reentrant submit is guarded in code.
  Ancestor disabled fieldsets are respected even for synthetic submit events.
- A rejected callback preserves the draft and exposes a localized generic alert
  plus optional `onerror`. Retry requires another explicit user submission. Late
  errors from replaced/disabled/unmounted contexts do not notify the new context.
  An already dispatched callback is NOT cancelled or undone by these UI guards.
- Default field IDs use Svelte's instance identity; explicit `idPrefix` is still
  honored. Optional `locale` scopes array/error labels to one form; Surface passes
  its trusted locale rather than relying on the global language singleton.

The fieldset wrapper retains the previous field/action spacing. Existing public
classes and components remain; this is not a visual redesign or the completion
of semantic recipes for every form component. English Surface fixtures now show
English array-action labels intentionally. Fresh browser evidence is required.

## Boundaries and verification

The internal helper is a draft/JSON transport contract, NOT a new JSON Schema
validator. Native required/number checks remain and Surface still validates the
registered TypeBox input schema on client and server. Additional JSON Schema
assertions in the generic form are not claimed newly supported. Server approval,
idempotency, scope authorization and audit are unchanged. A failed business
response may still need inspection/reconciliation instead of blind resubmission.

Limits are 32 traversal levels, 10,000 visited nodes and 1 Mi characters in a JSON
copy. Surface may enforce stricter limits. These are conservative UI safeguards,
not a replacement for API request limits or backend field authorization.

`node --test packages/ui/scripts/schema-form-state.test.mjs` runs actual helper
contracts. `json-schema-form-lifecycle.test.svelte.ts` exercises the actual Svelte
component; Surface's existing real parser/browser workflow exercises proposal,
approval and execution. The workflow explicitly runs all three layers and packed
consumer checks. A local source-only result is not a substitute for current-head
CI or browser evidence. #434's spreadsheet/filter changes, generic full-schema
validation, table lifetime warnings and final Figma acceptance remain separate.
