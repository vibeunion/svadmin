# svadmin UI Generation Rules

Read `DESIGN.md` before creating, revising, or reviewing any UI. It is the
authority for visual language, page hierarchy, feedback ownership, and
acceptance checks in this project.

## Required workflow

1. Name the page's single primary workflow and dominant next action.
2. Inventory every heading, description, notice, metric, badge, and data view.
3. Assign each fact and event to one primary UI surface.
4. Reuse `@svadmin/ui` components and semantic Tailwind tokens before writing
   custom markup or raw colors.
5. Verify loading, empty, partial, error, permission, success, and mobile states.

## Type-safe AI development

- Read the actual provider API and resource models before generating a page.
  Do not invent fields or duplicate server/schema types.
- Define module-level contracts with `defineResource(name, schemas)` and derive
  models from TypeBox `Static<typeof Schema>`. Do not duplicate models or use
  declaration merging as proof of runtime validation.
- Use `useList`, `useOne`, `useShow`, and `useMany` with a resource contract.
  `useTable` also infers query rows and `clientData`; `useInfiniteList` and `useSelect`
  use the same contract. String resources, implicit routes, and data generics are
  rejected by the default entry point. Use getters for reactive query inputs.
- Treat network responses, storage contents, and AI tool arguments as `unknown`
  until validated at their boundary. Resource contracts validate CRUD requests
  and responses automatically, but they do not authorize a mutation.
- Provide the full closed record schema with a required string/number `id`.
  Supply create and update schemas explicitly; missing schemas disable writes.
  Extra fields, nested `any`, open dictionaries, and unsupported schema kinds
  are rejected. Do not coerce values or silently remove unexpected fields.
- Define custom calls with `defineCommand` and use `useCustom` or
  `useCustomMutation`. Inputs and outputs must have schemas; URLs and methods
  cannot be overridden by individual calls.
- Bind `useCreate`, `useUpdate`, `useDelete`, and their `Many` variants to an
  explicit contract to infer mutation inputs and results. A bound mutation
  cannot target another resource. `useUpdate` and `useDelete` require an ID.
- Keep required delete variables in `useDeleteMany` calls; both native batch
  providers and single-record fallbacks receive them.
- Bind forms to a contract and a fixed create/edit action. `defaultValues` and
  `setFieldValue` follow the operation schema, including required fields.
  Edit backfill excludes record-only fields.
- Do not import `@svadmin/core/unsafe` in new application pages. It is reserved
  for reviewed metadata-driven framework boundaries, not compatibility fallback.
- Do not automatically retry an invalid write response: inspect the structured
  `writeMayHaveSucceeded` diagnostic and read back the server state first.
- Never silence a mismatch with `any`, double assertions, `@ts-ignore`, or a
  broader index signature. Fix the source contract or validate and narrow it.
- Run the generated project's `bun run check` and focused tests after each
  change. Cover invalid fields and payloads as well as successful paths.
  Passing runtime tests alone does not prove compile-time type safety.

## Feedback invariant

`one event -> one primary feedback surface`

- Field errors are inline.
- Routine success is a 3-second Toast.
- If success changes the page into a completed state, render that state and set
  `successNotification: false` on the hook or form.
- Persistent notices are only for unresolved context, required action, blocking
  failures, or risk. Use `FeedbackNotice`; it has no success variant.
- The first viewport may contain at most one full-width high-emphasis notice.
- A count or status already shown in a badge, table, progress state, or filename
  must not be repeated in a banner or explanatory paragraph.
- Toasts are keyed by event identity when duplicate delivery is possible. Do not
  deduplicate globally by message text.

## Reject generated UI when

- success appears simultaneously in a Toast, heading, description, Alert, badge,
  or result summary;
- the page contains decorative explanation panels or nested cards;
- copy only describes the controls or data immediately below it;
- a resolved success banner remains in the normal reading flow;
- desktop or mobile output overlaps, clips, scrolls horizontally, or pushes the
  primary action out of view.
