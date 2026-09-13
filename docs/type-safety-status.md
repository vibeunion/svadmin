# Type Safety Acceptance

Type safety is an acceptance requirement, not a promise that TypeScript proves
every runtime behavior. Backward compatibility does not justify unchecked APIs.

## Checks

- `bun run check`: strict core/schema projects, type-contract rejection fixtures,
  runtime-separated workspace TypeScript/Svelte sources, and the Surface and
  Flow projects, plus the example's standalone browser and Bun programs. The
  root default is now `skipLibCheck: false`.
- `example/tsconfig.json` checks example browser sources and Vite configuration.
  `example/tsconfig.bun-tests.json` checks its Bun tests separately. The example's
  `check` command runs both and is included in the root check; neither program
  disables dependency declarations or inherits the wrong runtime's globals.
- `tsconfig.browser.json` and `tsconfig.bun-tests.json` check the original root
  source inventory in separate browser/Node and Bun programs. Drizzle sources
  belong to the Bun program because their driver graph imports Bun declarations.
  `scripts/check-type-coverage.ts` rejects missing roots and direct imports from
  the wrong runtime. This covers the root inventory, not every file in the repo.
  Use the checking scripts rather than compiling the mixed-runtime inventory
  in `tsconfig.json` as one program.
- `packages/lite/tsconfig.server-tests.json`: all strict flags and declarations
  for the server-adapter tests and their standalone Node/Vitest configuration.
  Request-event/provider fixtures are complete typed objects, not assertions.
- `packages/core/tsconfig.providers.json`: all strict flags, including
  `skipLibCheck: false`, for the migrated Refine, Elysia, Directus, PocketBase,
  Sanity, and Supabase data adapters, the standalone Supabase RPC helper, and
  Supabase's auth/realtime/audit adapters and their boundary regression tests, plus Drizzle's
  column-metadata decoder and rejection tests. It runs as part of `check:types`; it does not
  cover every file in those packages.
- `packages/pocketbase/tsconfig.json`: every PocketBase source/test file with all
  strict flags and dependency declarations. It and the new PocketBase and
  Supabase auth/realtime negative type fixtures run from the root checking entrypoint.
  The new fixtures also pass under the installed TypeScript 6 compiler.
- `packages/drizzle/tsconfig.json`: inherits every root strict flag and enables
  `skipLibCheck: false` for all Drizzle source/tests. It passes and now runs in
  `check:types`, together with `scripts/fixtures/drizzle-types/tsconfig.json`.
- `packages/flow/tsconfig.json`: all strict flags and dependency declarations
  for Flow sources and tests. Flow's test setup/configuration also have a
  strict tooling project; its negative type fixtures use ES2022 without Bun
  ambient types. Both run from the root checking entrypoint.
- `packages/elysia/tsconfig.json`: all strict flags and dependency declarations
  for every Elysia source/test file and the standalone Node CommonJS fixture.
  Its type-contract fixtures and the dependency's new CommonJS parsing helper
  also have strict checks in `scripts/fixtures/elysia-types`. All three projects
  run from the root checking entrypoint.
- `packages/core/tsconfig.tooling.json`: strict coverage for the scaffold
  compatibility checker, the updated scaffold/style contract tests, and the
  type-check entrypoint itself, including its imported boundary scanner.
- `bun run build:packages`: regenerate the declarations consumed through package
  exports before auditing those declarations.
- `bun run check:types:dependencies`: independently recheck coverage and both
  runtime programs without skipping dependency declarations. This gate is also
  part of `bun run verify`.
- `bun run lint` and focused runtime tests: validate the changed code and its
  behavior. A successful build alone is not type-safety evidence.
- Every registered TypeScript checking project now verifies its effective,
  inherited strict flags before compilation, including explicit overrides of
  strict subflags. Disabling declaration checks, null checks, or implicit-any
  diagnostics fails the gate even when the source would otherwise compile.
- The independent defaults for Airtable, Hasura, Nestjsx CRUD, Refine adapter,
  Strapi, SvelteKit, create-svadmin, Firebase, Directus, Nestjs Query, Medusa, and
  Sanity inherit the strict baseline and run from `check:types`. Optional Refine
  declarations remain an explicitly documented limitation, not real-SDK evidence.
- The Lite SSR example now runs from the root `check` command, with strict
  Svelte/browser and separate Bun test programs. Its post provider validates
  inputs and detached records from shared schemas; dashboard order data reuses
  the main example's order schema instead of a caller-selected return type.

## Remaining Gaps

The root default and both workspace checking programs use `skipLibCheck: false`.
Their declaration diagnostics are now zero, but declaration compatibility is
not proof that a dependency's broader SDK or every dynamic application boundary
is safe. The remaining explicit `skipLibCheck: true` overrides found in maintained
configuration files have been removed, including five compact adapter configs
and the nested Lite example that the earlier inventory missed. This does not
establish complete repository coverage: unregistered tooling, examples, and
generated programs still require a separate inventory audit.

The declared boundary inventory now contains only the negative type fixture;
AutoTable was the final listed UI consumer of `@svadmin/core/unsafe`.
An empty application exception list is not a repository-wide safety audit.
This inventory is not an
approval to retain unchecked application boundaries. Public
`DataProvider` methods and dynamic hooks no longer let callers select arbitrary
response or error types. Single-record create/update/delete hooks now validate
receipts and optimistic cache records, and preserve their execution scope across
awaits. However, other adapter implementations, bulk/form cache helpers,
other live modules, and existing test fixtures
still contain unchecked assertions or broad SDK types.
They must migrate to validated contracts, not merely be renamed or hidden behind
assertions. The permission-hint hook no longer accepts arbitrary return generics
or truthy objects. Core auth query, mutation, and error-handler boundaries now
validate shared schemas and isolate their asynchronous lifecycle; provider-specific
credential business schemas still belong to each provider. Errors arriving from
older data-hook operations still require an operation-scope audit before delegation,
and the shared data-hook delegate has no query-cache handle of its own.
PocketBase's auth/live adapters and Supabase's auth/realtime adapters
now validate their input and SDK boundaries.
Supabase's task bridge now validates the modern SDK contract without legacy
client assertions. Its generic task date fields validate JSON string/null shape,
not ISO timestamp semantics; business task payload/results remain unknown until
validated against a business schema. Drizzle's configuration and
utility re-exports still inherit broad
SDK types, even though its returned data now crosses a validated boundary.
Some optional Refine initializers still rely on local `unknown`
module declarations when peer packages are absent; the boundary tests use
protocol doubles and do not establish real-SDK or hosted-service compatibility.

Some maintained tooling, documentation, standalone examples, and generated
scaffold sources have separate or incomplete checking coverage. Those programs
must have their own strict checks before claiming repository-wide coverage.

Full acceptance requires all relevant programs, dependency declarations, schema
rejection tests, runtime regressions, and build gates to pass without unchecked
assertions, `any`, suppressed diagnostics, or unapproved exceptions. Existing
failures from other working-tree changes must be reported separately.

## Auth Boundary Checkpoint: 2026-09-09

Identity, check, action, and error-handler result types now derive from their
runtime schemas. Core hooks reject malformed values, present `undefined`,
contradictory success/error state, nonlocal redirects, and unknown receipt
fields before using them. Query failures and action failures have fixed,
non-sensitive errors; a provider exception cannot choose a decoder failure code.

Mutation dispatch uses a finite action-method union and the selected method's
parameter tuple instead of a `keyof AuthProvider` function assertion. Except for
logout, inputs are required. Plain inputs and nested credential data are copied
before invocation; identity/profile fields are checked, and profile avatars
preserve `File` uploads. Credential field names and business validation remain
provider-owned rather than pretending every provider uses email/password.

Auth hooks capture provider, tenant, request sequence, and per-provider session
revision. Session-changing actions are ordered by invocation intent, so an older
login completion cannot cancel a newer logout. Distinct providers do not cancel
each other's requests. Queries immediately withdraw stale values on refresh and
scope changes. Logout revokes identity and permission hints without reloading
the old session; successful hook-driven login refreshes them.

Both `useOnError` and the shared data-hook delegate validate provider instructions
and logout receipts. The hook clears its available query cache only after
confirmed logout. The shared delegate does not make a data-error effect depend
on later session revisions. Captured navigation rechecks scope after awaiting
route guards. Presentation failures never change a confirmed server action into
an apparent failed write. Discarding an obsolete receipt does not cancel or
roll back external provider operations.

Remaining authentication work includes schema-bound, provider-specific credential
types, direct provider consumers outside these hooks, and the originating
operation scope/cache ownership of older data-hook error callers. This checkpoint
does not establish full repository type safety or real hosted-service acceptance.

Verification for this checkpoint:

- The final full `bun run check` passes, including all strict configuration
  guards, independent programs, and every Svelte program with zero errors and
  zero warnings. Root coverage is 1,614 sources: 1,525 browser/Node and 90 Bun
  roots, with one shared declaration.
- Full lint and the last focused lint pass. No compiler flags, exclusions,
  declaration checks, lint suppressions, or test timeouts were weakened.
- The strict public resource/auth fixture also passes under the installed
  TypeScript 6 compiler, in addition to the TypeScript 7 checking entrypoint.
- The complete test runner passes 1,101 Bun tests across 107 files and 1,210
  Vitest tests across all 15 configurations. After the final two lifecycle
  regressions were added, the entire Core suite was rerun and passes 307 tests
  (the complete-run checkpoint had 305). All 479 UI cases and 31 extra UI
  integration/SSR cases passed in the complete runner.
- Pure auth boundary tests pass 63 cases. The mock-only auth tests were replaced
  with real rejection and mounted-component coverage. The final Core rerun
  includes both invocation-order and reactive-error-replay regressions.
- The complete production build and unchanged bundle gate pass: 1,280,116
  initial bytes against 1,300,000; 348,726 gzip bytes against 375,000; largest
  chunk 1,101,982 bytes against 1,250,000. Existing package portability and
  ordinary chunk-size advisories remain.
- The post-build dependency declaration gate passes with zero errors and zero
  warnings. No commit, push, merge, release, or deployment was performed.
- This is local compiler, component/SSR, and production-build evidence, not a
  hosted authentication service test or full browser end-to-end acceptance.

The old mock-only `auth-hooks.test.ts` was replaced by pure boundary rejection
tests and real mounted-hook tests, not removed merely to make a gate pass.
Their acceptance scenarios include:

```gherkin
Scenario: Invalid authentication receipt
  Given an authentication provider returning an unchecked payload
  When a result has invalid fields or an external redirect
  Then the hook rejects it without navigation or raw diagnostic disclosure

Scenario: Refresh failure
  Given a rendered identity and authenticated state
  When a refresh starts and then fails
  Then both old values stay withdrawn and a sanitized error is exposed

Scenario: Out-of-order authentication
  Given an earlier login and a later logout
  When login completes before the pending logout
  Then the old login cannot cancel logout or restore the previous view

Scenario: Independent provider trees
  Given two mounted trees with distinct authentication providers
  When one tree logs out
  Then the other tree retains its own pending request and identity

Scenario: Suspended navigation
  Given authentication navigation waiting for a route guard
  When its tenant or session becomes inactive before the guard resolves
  Then the captured router does not dispatch the obsolete navigation
```

## Previous Checkpoint: 2026-09-09

- Mutation/cache checkpoint: JSON snapshots, record/schema/ID checks, custom
  updater validation, nonnegative totals, and all-entry validation precede
  optimistic publication. Partial write failure rolls back earlier entries;
  rollback preserves later writes and skips failed optimistic ancestors.
  Each mutation captures its provider, tenant metadata, resource, decoder, ID,
  and wire payload before asynchronous callbacks. Reused params objects do not
  share execution state. Replacement providers do not receive an older write
  or have their caches changed by its completion. Public per-call callbacks and
  reactive context expose the user's context, not internal rollback state.
- Permission-hint checkpoint: arrays, boolean maps, and `null` cross one
  schema-derived immutable boundary. Malformed values, accessors, inherited
  grants, stale requests, refresh errors, logout, and unmount are covered.
  Provider exceptions are normalized independently of decoder errors; no
  provider exception or payload is copied into the public error.
  The hook remains a UI hint, not backend authorization.
- Focused checks at this checkpoint: 19 Bun tests cover cache/schema boundaries,
  strict-configuration regression checks, and the Lite post provider. The full
  core suite includes 31 real-query/component cases for mutation execution,
  invalidation, permission hints, and rollback. The legacy mutation and strict-hook
  tests no longer use unchecked assertions or untyped callback mocks.
- The full root `bun run check` passes with zero errors and zero warnings in
  every Svelte program. The root inventory has 1,606 sources: 1,518 browser/Node
  and 89 Bun roots with one shared declaration. Independent package programs,
  the nested Lite example, and strict-flag guards are also checked. The public
  negative type fixture passes under both installed TypeScript compilers.
  The final edited component-test project recheck passes.
- Full lint and the final focused lint pass. Frozen-lockfile installation
  succeeds without lockfile changes. The post-build dependency declaration gate
  reports zero errors and zero warnings.
- The complete test runner passes 1,060 Bun tests across 106 files and 1,162
  Vitest tests across all 15 default/custom configurations. This includes 257
  core cases, all 479 UI cases, and all 31 additional UI integration/SSR cases.
  No test was removed or given a longer timeout to obtain these results.
- The full production build and unchanged bundle budget gate pass:
  1,273,536 initial bytes against 1,300,000; 346,994 gzip bytes against 375,000;
  and a largest chunk of 1,101,982 bytes against 1,250,000. Existing package
  portability and large-chunk advisories remain; no warning budget was increased.
- The Lite SSR example builds and verifies 211 HTTP-rendered HTML routes with
  native form markup and no hydration scripts. This is local rendering and
  provider-boundary verification, not a deployed service or full browser-driven
  CRUD acceptance. The example still has no production deployment adapter.
- No commit, push, publication, merge, or deployment was performed.

## Earlier Checkpoints: 2026-09-09

These records describe earlier working-tree states, not the current gate results.

- Task checkpoint: the modern SupaCloud bridge and core provider wrapper validate
  input, record/list responses, submit handles, mutation receipts, and subscription
  snapshots. Core hooks no longer expose caller-selected task/error generics.
  Query keys isolate providers; in-flight submissions and button actions retain
  their original tenant/task scope. Disabled queries can initialize without a
  provider and become active after one is configured. Task UI validates direct
  record props and JSON submission input. Legacy task-client compatibility is
  removed.
- Focused task checks: 36 Bun boundary tests and 14 real-query component tests
  pass (10 task-hook cases plus 4 provider-bundle cases). Regressions cover malformed
  clients and accessors, receiver preservation, input rejection, receipt identity,
  SDK HTTP/realtime behavior, write uncertainty, subscription cleanup, rejected
  callback/registration promises, malformed live mapping, and tenant/provider
  isolation. Negative type fixtures also pass under the installed TypeScript 6
  compiler. The final full root check reports zero errors and zero warnings;
  its inventory has 1,593 roots: 1,507 browser/Node and 87 Bun roots, with one
  shared declaration. Full lint and the final fixture-only lint recheck pass.
  The dependency declaration gate and frozen-lockfile installation also pass.
- The default task center is dynamically loaded when its layout slot mounts.
  Its fallback preserves the trigger size and supplies a retry action on load
  failure; the loaded drawer retains its props and bindable open state.
  The final full build passes at 1,270,039 initial bytes (345,460 gzip), with the
  largest chunk at 1,101,982 bytes. Limits remain 1,300,000 initial bytes,
  375,000 gzip bytes, and 1,250,000 bytes per chunk.
- The full test runner passed 1,044 Bun tests and the example, AI elements
  (including SSR), core, Flow, Lite (including both custom suites), and Surface
  suites. Its default UI run passed 477 of 479 tests; two existing table cases
  exceeded their unchanged 5-second timeout. The complete UI rerun with two
  workers passes all 479 tests across 85 files, without removing tests or extending
  timeouts. All five separate
  UI integration/SSR suites pass (31 tests). The final 36-test task boundary and
  14-test task/provider component runs supplement the earlier full-run snapshot.
- Audit checkpoint: 30 focused Bun tests and 13 focused component tests pass.
  Coverage includes input rejection, immutable expected-write snapshots,
  receipt mismatch, sanitized write uncertainty, SDK HTTP serialization and
  nullable database error fields, invalid UI records, and provider/tenant scope.
  The audit negative fixture accepts both ordinary and database-parameterized
  Supabase clients without assertions. The full root `check` and full lint pass.
  The strict audit fixture also passes under the installed TypeScript 6 compiler.
  Full regression and final build results are recorded separately below.
- Supabase authentication checkpoint: the full root `check`,
  dependency declaration gate, full lint, and frozen-lockfile installation pass.
  Both workspace programs report zero errors and zero warnings. The new strict
  source checks and rejection fixtures pass under both installed compilers.
- Focused PocketBase/Supabase suites: 139 tests passed, including 27 new Supabase
  authentication regressions and a PocketBase form-contract regression. The
  shared plain-data snapshot tests also pass. Actual SDK coverage includes
  PocketBase 0.28.0 auth-store/HTTP/subscription behavior and installed Supabase
  login storage, verified user requests, password update/recovery, logout
  read-back, channel bindings/removal, and publish-only HTTP serialization.
  These tests inject transport responses; they do not prove hosted acceptance.
- Seven real form-component tests pass: login, registration, and password recovery
  for both providers, plus Supabase password updates. They submit the maintained
  pages through the actual auth hooks, not duplicated request objects alone.
  PocketBase accepts a matching form `username` and maps `confirmPassword` to the
  SDK's `passwordConfirm` argument; unsupported or conflicting fields are rejected.
- Ordinary `check`, all strict contract/provider/tooling projects, and full lint
  pass. Negative type fixtures also reject arbitrary RPC return generics and
  mutation options that replace the form's validation callbacks.
- Focused Supabase data/RPC tests: 45 passed.
- Focused Drizzle/Refine tests: 40 passed, including 22 new regressions for
  metadata validation, real schema inference, snapshot isolation, and restored
  dependency declarations, plus PostgreSQL transaction dispatch in both module
  formats. Drizzle's negative type fixtures pass without skipping dependency
  declarations.
- Focused Flow tests: 30 passed, including schema rejection, snapshot isolation,
  exact optional properties, a missing native Promise resolver, and empty-canvas
  fitting followed by reactive node insertion. Flow's strict checks, tooling
  project, and negative type fixtures pass without skipping declarations.
- Focused Elysia tests: 76 passed, including actual Elysia/TypeBox/Zod runtime
  contracts, malformed Standard Schema issue rejection, model references and
  mapping, macro context, registered errors, and a standalone Node CommonJS
  fixture. All Elysia sources/tests and both new strict fixture projects pass.
- Bits UI and Svelte Toolbelt browser-only negative fixtures pass under both
  installed TypeScript compilers without Bun or Node ambient declarations.
  They retain button/calendar unions, allowed bindings, readonly projections,
  boxed value types, and the browser timer return type.
- WebAuthn regressions: 14 passed across the SDK's ESM and CommonJS bundles under
  Bun. Negative fixtures pass under both TypeScript compilers. The extension
  serializer source has a strict project; the edited SDK serialization functions
  also have an isolated strict source check against shipped SDK declarations.
  These are not real-browser credential-ceremony or hosted-auth acceptance tests.
- Coverage regressions: four passed. All 1,583 files in the root inventory are
  assigned to strict programs: 1,500 browser/Node roots and 84 Bun roots, with
  one shared declaration. Tooling/docs/scaffolds outside this inventory still
  need their separate coverage audit.
- Lite server-adapter regressions: 30 passed in Node/Vitest. The migrated tests
  contain no type assertions; file/record observations are checked before use.
- Core runtime tests: 225 passed; UI runtime tests: 466 passed.
- All package builds, example production compilation, and the full
  `bun run build` command now pass. Initial JavaScript is 1,296,438 bytes
  (350,659 gzip); limits remain 1,300,000 and 375,000 bytes. The largest chunk
  is 1,101,982 bytes against the unchanged 1,250,000-byte limit. Editor
  dependencies remain outside the initial graph. Removing forced icon and UI
  primitive groups lets the bundler keep late-page dependencies out of the
  initial graph; no code, type checks, or budgets were disabled.
- The built example passed a Chromium smoke check: demo login, dashboard,
  lazy account settings, and 1440x1000/390x844 viewports. Icons render and the
  browser reported no console messages. This is local demo acceptance, not
  hosted-backend authentication or a full browser regression suite.
- The full root test command passes: 1,016 Bun tests and all 15 detected Vitest
  configurations (including integration/SSR configurations). The three stale
  scaffold/style expectations were replaced with current contract checks.
  A new regression rejects reintroducing Tailwind build dependencies into the
  precompiled-CSS scaffold. Thirty existing Lite tests moved from Bun to
  Node/Vitest; the WebAuthn and coverage tests add 18 tests.
  The auth/realtime checkpoint adds 27 PocketBase, 16 Supabase realtime, and five
  shared snapshot tests; two old assertion-based realtime tests were replaced.
  The next authentication checkpoint adds 27 Supabase regressions and one
  PocketBase form-contract regression, replacing 14 old auth tests. Seven real
  form tests were added to the UI Vitest suite.
- The dependency declaration gate now reports zero errors and zero warnings.
  The original baseline was 233 errors in 77 files; preceding checkpoints were
  120 errors in 14 files and 16 errors in seven files. Bits UI declarations,
  Supabase serialization, and runtime-separated programs resolved the last 16
  errors. An additional Svelte Toolbelt missing import was uncovered by isolated
  browser checking and repaired. No compiler diagnostics were disabled.
- Frozen-lockfile installation succeeds with all persisted dependency patches.
- The migrated-file whitespace check passes. A repository-wide whitespace
  check still reports unrelated existing working-tree issues.

## PocketBase Authentication And Realtime

PocketBase clients now have explicit structural contracts rather than unchecked
client assertions. Authentication uses the SDK's `authStore.record`, not its
legacy `model` alias. Login, registration, reset requests, session state, returned
records/tokens, and reset receipts are validated. Optional registration fields
are omitted rather than passed as `undefined`; mismatched passwords fail before
dispatch. Invalid login responses clear partially saved authentication state.
Expired sessions do not expose retained identities, and identity projection
only admits validated string fields.

SDK exception messages are not forwarded. HTTP error handling projects the
numeric own `status` field, without trusting a message containing `401` or
executing accessors; uninspectable error proxies are ignored. Malformed
post-write receipts report `WRITE_OUTCOME_UNKNOWN`, not confirmed success.
This is not proof that a transport-level write failure was rolled back.

Realtime events reject unsupported actions and malformed records. Each
subscription owns the individual disposer returned by the SDK; wildcard
unsubscription no longer removes other subscribers. Cancellation stops delivery
immediately, including during asynchronous setup, and invokes cleanup once.
Setup, cleanup, and synchronous/asynchronous callback failures are handled
without exposing raw errors.

The shared `snapshotPlainData` helper rejects getters, serialization hooks,
cycles, sparse arrays, hidden/symbol properties, non-plain objects, explicit
undefined, functions, and nonfinite numbers. Snapshots preserve ordinary own
prototype-named keys and copy repeated references independently. Snapshot
validation checks transport data, not business authorization or token signatures.

## Supabase Realtime

The realtime adapter accepts a structural channel/client lifecycle contract.
Incoming database and broadcast envelopes stay unknown until schema validation.
Database events must target the subscribed public table, use a supported action,
and have no decoding errors. DELETE uses `old`, never the SDK's empty `new` row.
Broadcasts must match the subscribed resource. Each callback gets an independent
snapshot; throwing or rejecting callbacks do not block other registrations.
Two registrations of the same callback retain independent lifetimes.

Publishing validates and snapshots input before scheduling SDK work. Subscribers
and publishers use the same resource topic, with acknowledgements enabled.
Publish-only channels do not open a subscription, and are released after the SDK
HTTP send settles. In-flight publishing retains a shared channel after the last
listener cancels. Invalid, rejected, or unsuccessful send receipts are surfaced
through `onError` as `PUBLISH_OUTCOME_UNKNOWN`, never confirmed delivery.
The inherited `LiveProvider.publish` API remains fire-and-forget.

Resource channels are removed through the actual SDK client. Re-subscription
waits for earlier cleanup, preventing reuse of a retiring cached channel.
Unconfirmed cleanup blocks further channel creation for that resource and reports
failure; callers must resolve the failed SDK lifecycle before using a fresh
provider. Connection error/timeout statuses permit the SDK's reconnection path;
closed or malformed statuses stop delivery and release the owned channel.
This does not validate a live server's subscriptions, RLS, or delivery guarantees.

## Supabase Authentication

The auth adapter's structural SDK client returns unknown results. Runtime
schemas are the source of truth for credentials, user metadata, sessions, and
success receipts. The permission resolver receives a `SupabaseAuthUser` snapshot
instead of the SDK's broad `User` metadata; other custom metadata values stay
unknown. The original client type is preserved for typed database clients.
Both language guides demonstrate validation before reading permission rows,
and that example is covered by the strict auth type fixture.

Login, signup, recovery, and password updates reject malformed input before
dispatch. The current forms' optional `username` must equal `email`; password
confirmation is validated. Signup only forwards the explicitly supported name
and username fields, not arbitrary extra properties. Response validation rejects
missing/contradictory error envelopes, malformed users/sessions, mismatched
subject IDs, and expired session timestamps. Nullable presentation fields are
modeled explicitly rather than forwarded through assertions.

Identity, checks, and permissions verify the user with the captured access token,
then re-read session identity and token before returning. Permission results are
independent plain-data snapshots and are discarded if the session changes during
resolution. User-editable metadata is not authorization evidence. Transient
verification failures are not treated as successful authentication or automatic
logout, and structured error fields replace message-substring matching.

This provider serializes its authentication writes to prevent a delayed login
from undoing a later logout. Invalid-session cleanup shares that queue and checks
the provider revision before dispatch. Sign-out requires a validated SDK receipt
and an empty session read-back; cleanup failure is explicit. These checks do not
claim global serialization of other SDK instances, browser tabs, or servers.
SDK exception messages and thrown permission-resolver details are not exposed.
Unconfirmed writes report an unknown outcome, not rollback or confirmed success.

## Validated Audit Events

Audit types and runtime decoders share private TypeBox schemas. Every input and
response first crosses the shared JSON snapshot boundary. `AuditDraft` forbids
caller-generated IDs/timestamps; create inputs require canonical UTC timestamps.
Optional resources are omitted for resource-independent events. The append-only
provider API no longer exposes `update`.

`withValidatedAuditProvider` accepts unknown transport results and validates
query inputs, list entries, and write receipts. Global registration installs the
wrapper, and the record-history drawer validates scoped reads as well.
Receipts must preserve all submitted fields; caller and handler mutation cannot
change provider input, and provider mutation cannot change the expected snapshot.
Server-generated fields may be added. Errors do not retain SDK exceptions or
submitted records; failed writes may already have committed.

Enterprise context remains in explicit event fields rather than being copied
into `meta`, and `details` is no longer renamed to `data`. Rollback's mutation ID
also remains an explicit field. Supabase now stores the complete canonical event
in `audit_log.details`, retains indexed columns, and preserves numeric ID zero.
This is a storage-format break; existing history is not automatically migrated.
Validated database rejection, ambiguous receipts, and timeouts are no longer
silently accepted as successful writes. The HTTP tests use the actual installed
SDK with injected responses, not a hosted database.

These guarantees do not cover the separate `AuthProvider.getAuditLogs` viewer
contract, other audit backends, database append-only enforcement, retention, or
atomic commits with business changes. They do not complete the remaining task,
dynamic UI, and standalone-program migrations.

## Browser Dependencies And WebAuthn

Bits UI's component declarations preserve their original parameter unions,
binding names, and legacy setter parameter types while avoiding TypeScript's
large `keyof` union expansion. Floating CSS output refers to the installed
`csstype` vocabulary instead of hundreds of expanded, version-specific aliases.
Svelte Toolbelt explicitly imports its missing `Expand` utility and derives
timer handles from the current runtime's `setTimeout`.

Supabase's WebAuthn JSON declarations now distinguish serialized extension
strings from native binary data and require the current attestation fields.
The fallback serializer emits authenticator data, algorithm, transports, and
the optional public key, and omits absent attachment/user-handle fields.
Native JSON methods preserve their receiver. Fallback input types explicitly
allow an absent native `toJSON`, without pretending a partial fixture is a
complete browser credential.

The new extension serializer validates supported extension shapes and encodes
large-blob and PRF binary data, preserving typed-array/DataView offsets.
Malformed, unknown, accessor, hidden, or symbol fields are rejected instead of
being forwarded. Unknown extension names are intentionally unsupported, rather
than retained for backward compatibility. Errors omit the submitted data.
Both emitted module formats come from the same strictly checked helper source.
The rest of the SDK's source is not thereby audited. The application's auth
adapter has its own separate validation and regression coverage described above.

## Flow Transport And Runtime

Palette types are derived from the same private TypeBox schema used by the drag
encoder and decoder. Plain-data snapshots precede validation; they reject
cycles, accessors, non-plain objects, sparse arrays, symbol keys, hidden
properties, and explicit undefined without invoking serialization hooks.
The schema rejects nonfinite numbers, functions, invalid metadata, and unknown
template properties. Encoders throw a payload-free `TypeError`; invalid decoded
payloads return `null`. Repeated references are copied without being mistaken
for cycles, and prototype-named JSON keys remain ordinary own properties.
This validates transport shape, not host-defined graph rules or authorization.

Flow's source lint disallows unchecked assertions and diagnostic bypasses.
Regression tests use real browser-transfer objects instead of double assertions.
The XYFlow patches preserve custom node types and exact optional properties,
while deriving resolver declarations from the existing ES2022-compatible helper.
Runtime tests exercise the public canvas API without native
`Promise.withResolvers`; empty canvases settle with `false`, and later calls
use newly inserted nodes. These are component tests, not real-browser graph
interaction acceptance. Workspace dependency patches are not automatically
installed by published-package consumers.

## Elysia Contracts And Parsing

Elysia's declarations now guard generic indexing, preserve named/numeric/quoted
response statuses, keep TypeBox modules separate from Standard Schema
definitions, and retain macro resolution, resolver arrays, nested macros, and
registered guard error types. Negative fixtures verify those restrictions rather
than accepting widened callback or response types.

Model parsers describe decoded data, including transforms and referenced models,
not schema objects or a partial model merely because request handling treats the
schema as optional. Failed parsing has `success: false` and no successful data.
Model mappers receive actual registered schemas; TypeBox references and module
imports reject unknown or Standard Schema model names. The compiler's internal
schema may be wrapped, and cleaning alone does not claim successful validation.

Runtime fixes align model lookup and parsing with these declarations. Dynamic
TypeBox rejection no longer accesses an uninitialized variable. Standard Schema
parsing returns validated values instead of raw validation envelopes, rejects
invalid values and malformed issue envelopes, and normalizes error paths without
retaining extra payload fields. Synchronous parsing explicitly rejects async
schemas; their `Validate` method still supports asynchronous validation.

Both ESM and CommonJS use the same new parsing helper, which is checked with
`checkJs` and all strict flags. Runtime tests use actual Elysia, TypeBox, and Zod;
CommonJS parsing/routing/model lookup runs in a standalone Node process.
They do not establish hosted-service or every supported runtime's acceptance.
All Elysia source/test assertions and the old test lint suppression were removed;
tests use real Responses, typed fetch mocks, and explicit presence checks.

## Validated Data Transports

Transport implementations now return `unknown` through `DataTransport`.
`withValidatedResponses` validates envelopes, object records, and nonnegative
safe-integer totals before exposing `DataProvider`. Custom payloads stay
`unknown`. Concrete business record types come from the runtime schema in
`defineResource`, never a caller-selected `getList<T>()` or `useList<T>()`.

```ts
import { Type } from '@sinclair/typebox';
import { defineResource, useList } from '@svadmin/core';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const query = useList({ resource: posts });
```

The seven migrated data adapters have no unchecked response assertions:

- Refine validates method availability and returned envelopes, preserves method
  receivers, and exposes only the optional operations the provider implements.
- Elysia normalizes supported list dialects before validating them. Custom
  parsers return `unknown`; invalid totals are rejected rather than coerced.
- Directus rejects missing data/counts instead of manufacturing empty lists.
- PocketBase validates unknown SDK responses and requires confirmed deletion.
- Sanity validates document identity and mutation receipts before returning a
  record. Returned write IDs must match the requested update/delete ID.
- Supabase validates custom SDK envelopes, metadata, and record inputs. Table
  responses must contain records; single-row writes reject empty or multi-row
  responses. Unsupported equality/null filters fail before SDK dispatch instead
  of silently broadening a query. RPC uncertainty follows the actual GET/HEAD
  versus POST mode.
- Drizzle passes the actual `refine-sqlx` provider through the shared validated
  Refine adapter instead of asserting the provider type. Its SQLite CRUD
  integration tests also no longer use response or connection assertions.

Supabase's standalone `rpc.call` now returns `unknown` and has no caller-selected
result generic. It shares the custom transport's RPC decoder. Use a command
contract when business code needs schema-derived output fields. Edge Function
bodies accept plain records, strings, Blob/File, ArrayBuffer, and FormData;
unvalidated stream bodies are not accepted by this adapter.

Their lint scope prohibits type assertions (except literal-preserving
`as const`), non-null assertions, diagnostic bypass comments, and inline rule
disabling. The remaining repository has not yet reached this lint baseline.

## Drizzle Metadata And Dependency Repairs

Field inference now reads actual runtime tables through `getTableColumns`,
validates projected column metadata, and snapshots enum arrays. The old `_`
metadata shortcut was type-only and the enumerable-property fallback admitted
unchecked objects. Both are removed; invalid metadata is rejected even for
excluded columns.

Field keys now follow model property names rather than SQL column names.
This keeps a column such as `displayName: text('display_name')` aligned with the
records returned by Drizzle. Tests cover real SQLite, PostgreSQL, and MySQL
table definitions, boolean/date/numeric/enum mapping, field overrides, and
malformed metadata. Only SQLite has a live in-memory CRUD integration test;
PostgreSQL/MySQL server compatibility is not established by these schema tests.

The added patches restore members present in Drizzle's bundled source maps and
runtime, strengthen mutable-builder invariance, and model actual role/policy
optionality. D1 imports its module types without injecting Worker globals into
browser/Bun programs; the deprecated Miniflare v2 declaration branch is removed.
Negative fixtures reject invalid driver objects, invalid role/policy values,
widened mutable builders, exposed protected sessions, and forbidden union methods.

PostgreSQL's session declaration now accepts transactional clients, and its
runtime dispatch matches that contract: normal connections use `begin`,
transaction-only connections use `savepoint`, and nested configuration is
rejected before dispatch. Both ESM and CommonJS paths have protocol tests for
nesting, result propagation, rejection, and callback failures. They do not replace
verification against a live PostgreSQL server.

Other patches resolve Refine's unshipped import alias, match SvelteKit's cookie
types to the installed API, and distinguish TanStack's reactive modules from
Svelte components in declaration imports. No diagnostics are disabled.
See `patches/README.md`.
These workspace patches are not automatically applied in consumers' installs.

Malformed response diagnostics omit raw payloads. A validation failure after a
write is marked `writeMayHaveSucceeded: true`, including single/bulk mutations
and form writes. This marker is not a transaction rollback guarantee.

Resource contracts retain their identity inside Svelte state. Each query
configuration captures its decoder before dispatch, so changing a resource
cannot reinterpret an in-flight response under a different schema.

Verified regressions include malformed records/envelopes, invalid totals,
custom parser rejection, missing mutation receipts, optional provider methods,
method receiver preservation, invalid input before dispatch, and reactive
resource switching during an in-flight request.

## Validated Form State

The form implementation no longer uses type assertions. Its internal factory
requires a value decoder; strict forms derive that decoder from the private
operation-schema snapshot. Defaults, merged query values, setter changes, and
saved snapshots must pass it before entering typed form state.

`setValues` merges a partial update and validates the whole result atomically.
Rejected changes leave previous values intact. Query records are projected to
the input schema, and invalid values produce a form error rather than an
asserted form model. Reset snapshots preserve own `__proto__` data properties
without changing object prototypes.

Mutation context is explicitly typed, cache envelopes are checked before
optimistic updates, and non-Error failures are normalized before error callbacks.
Autosave transformation failures enter the error state instead of escaping the
async callback. Mutation configuration is restricted to the query library's
supported scheduling/retry options and cannot replace protected callbacks.

## Validated Field Displays

The show-page and record-drawer display registry no longer accepts unchecked
component props. Each builtin validates a schema before rendering and repeats
validation when its input changes. Field-choice options are forwarded only to
choice renderers; avatar values become `src`, and `images` requires a string
array. Invalid values display a localized error without displaying the payload.

Custom registration intentionally breaks the legacy two-argument API:

```ts
import { Type } from '@sinclair/typebox';
import { registerDisplayComponent } from '@svadmin/ui';
import StatusField from './StatusField.svelte';

registerDisplayComponent(
  'status',
  Type.Union([Type.Literal('active'), Type.Literal('inactive')]),
  StatusField,
);
```

`StatusField` must accept `{ value: 'active' | 'inactive' }`. Its value type
comes from the schema, not a caller-selected result generic. Registration takes
a schema snapshot; broad schemas, transforms, and open objects are not accepted.
Optional metadata is not implicitly forwarded to custom renderers.

Acceptance scenarios covered by `fieldComponentMap.test.svelte.ts`:

```gherkin
Scenario: Malformed record value
  Given a registered field renderer
  When its value does not match its schema
  Then the field reports invalid format without rendering the raw value

Scenario: Reactive record updates
  Given a valid rendered field
  When its value changes to invalid data and later to valid data
  Then the renderer rejects the invalid update and recovers on the valid update

Scenario: Field-specific projection
  Given avatar, images, and choice fields
  When valid record values are displayed
  Then avatar uses its source, images renders every image, and only choices receive options

Scenario: Custom schema registration
  Given a custom renderer registered with a closed schema
  When data fails that schema or the original schema is later weakened
  Then invalid data is still rejected before the custom renderer runs
```

## Contract-Bound Infinite Lists

`ResourceDefinition.contract` binds metadata-driven data views to a genuine
`defineResource` schema. `useResourceContract` preserves reactive resource,
provider and tenant routing. Missing or mismatched contracts, non-id primary
keys and unavailable named providers fail closed; display fields are not used
to invent a permissive schema. Example and scaffold data resources now carry
their existing business contracts.

`InfiniteList` uses the public contract-bound hook and no longer asserts its
page result or imports `@svadmin/core/unsafe`. Invalid responses show a localized
error with explicit retry, without rendering the rejected payload.

Each infinite-query configuration captures its schema, raw provider, pagination,
filters, sorters and resolved metadata. Provider identity is part of the cache
key, alongside the contract and tenant. Each page receives a detached input
copy; plain response snapshots reject accessors before schema validation.

Acceptance scenarios in `infinite-contract.test.svelte.ts`:

```gherkin
Scenario: Registered business contract
  Given resource metadata with a genuine matching contract
  When the infinite list loads or advances a page
  Then only records validated by that schema are returned and rendered

Scenario: Invalid configuration or provider response
  Given missing contracts, missing named providers or invalid query fields
  When the list attempts to read
  Then invalid configuration is rejected before dispatch
  And malformed responses show a retryable error without exposing their values

Scenario: Reactive scope changes
  Given an in-flight or cached list
  When its resource, tenant, provider instance or contract changes
  Then late replies and earlier cached records cannot replace the new view

Scenario: Deferred pagination
  Given a configured query with captured filters and metadata
  When the original input changes before that query executes another page
  Then that query still uses its original validated input snapshot
```

Focused verification: the single UI regression file passed 18 runtime tests.
No repository-wide type check, full suite, release build or deployment was run
for this increment. These results do not establish 100% repository type safety.

## Contract-Bound Exports

The public `useExport` requires a `defineResource` contract. Its result and mapper
input derive from that schema, and every page crosses the validated response
boundary. The old dynamic export implementation and its unsafe export are
removed; failures reject even when an `onError` callback is supplied.

`ExportButton` resolves the resource's registered contract and keeps the hook's
loading state reactive. Concurrent triggers share one invocation. Invalid data
does not produce a partial download; failures expose a sanitized retryable error.

Pagination, filters, sorters, limits, format, mapping and error callbacks are
captured before asynchronous work. Resource, tenant, provider instance, contract
or effective metadata changes cancel old results, downloads and callbacks.
Unmounted hooks reject retained triggers. Each mapper receives a detached,
validated record; mapped output must be a plain data record, and cannot mutate
the typed records returned by the hook.

Acceptance scenarios in `export-contract.test.svelte.ts`:

```gherkin
Scenario: Complete validated export
  Given a genuine resource contract and valid export options
  When all pages have passed the business schema
  Then only checked records reach the mapper, caller and download

Scenario: Rejected input or data
  Given an invalid query, provider record or mapper output
  When export is requested
  Then it rejects without a partial download or unvalidated error details

Scenario: Scope changes or unmount
  Given an export waiting for a provider response
  When its resource, tenant, provider, contract or metadata changes or its view unmounts
  Then its late response cannot download, notify or overwrite a newer export

Scenario: Repeated triggers and retry
  Given a pending or failed export
  When the user repeats the action or retries after failure
  Then pending actions are coalesced and a retry owns its own loading state
```

Focused verification passed 28 runtime tests in the new export regression file
and scoped diff checks. Export inference/rejection cases were added to the existing type fixture,
but the broader type-contract check and full suites were not run this increment.

## Contract-Bound Refresh

`RefreshButton` now uses the public `useInvalidate` with its registered resource
contract. The hook snapshots and validates the requested scopes and ID before
touching the cache. Missing named providers are rejected instead of falling back;
`false` and an explicit empty scope array perform no invalidation.

Refresh matches data queries in the captured contract, resource, named-provider
route and tenant. Infinite-list queries additionally match their raw provider
instance source; untagged or different-source infinite caches are excluded.
Queries, access decisions, tasks and custom calls outside that data scope remain
untouched. Standard list/one/many readers now also supply source tags, as recorded
below. Form-specific and selector queries, along with older untagged cache
entries, still have only named-provider routing isolation here; migrating those
remaining query implementations is necessary for complete instance isolation.

The invalidator returns `Promise<void>` and settles after every selected query,
including multiple active queries within one list scope. Overlapping scopes do
not cause duplicate explicit refetches. Failures reject with `REFRESH_FAILED`
without exposing the underlying provider error.

The button uses actual pending state instead of a fixed timer, disables repeated
clicks, and displays a retryable error. Resource, tenant, provider, contract or
metadata changes prevent old completions from altering the next button state;
unmounting prevents late UI updates.

Acceptance scenarios in `refresh-contract.test.svelte.ts`:

```gherkin
Scenario: Scoped cache refresh
  Given cached data in multiple resources, contracts, tenants and providers
  When a contract-bound refresh is invoked
  Then only the selected data scope is invalidated
  And infinite-list queries from another provider instance remain untouched

Scenario: Invalid refresh input
  Given an invalid ID, unsupported scope, unexpected property or accessor
  When refresh is invoked
  Then input is rejected before cache invalidation
  And empty scopes do not expand into a resource-wide refresh

Scenario: Multiple pending queries
  Given several active queries selected by the refresh
  When one fails while another remains pending
  Then refresh stays pending until all selected queries settle
  And the button then displays a sanitized error and allows retry

Scenario: A newer view or refresh
  Given a refresh waiting on an old scope
  When the view changes scope or unmounts
  Then the old completion cannot overwrite the newer UI state
```

Focused verification passed 21 tests in the single refresh regression file.
Type-inference/rejection fixtures were extended but not executed this increment;
no full type check, complete suite, release build, commit or deployment was run.

## Standard Read Isolation

This increment targets list, one and many reads in `query-hooks.svelte.ts`,
including table/show consumers that delegate to those factories. Form-specific
queries, selectors and write-cache ownership remain separate follow-up work.

All three reader factories capture their raw provider instance, decoder,
resolved metadata and query inputs before dispatch. Their keys include a stable
instance source, and explicit contract-bound refresh respects it. Two providers
with the same name, resource, tenant and schema no longer share these caches;
two consumers of the same provider still deduplicate requests.

List, one and many request snapshots use validated plain data. Each dispatch
receives a fresh copy, and explicit metadata is checked before context merging.
Responses are detached and reject accessors before schema validation. Missing
`getMany` uses checked `getOne` calls with separate metadata snapshots, after
validating the complete requested ID array.

The old assertion-based key cloning and query projection were removed.
`extendReactiveMembers` adds only new fields while retaining the query-result
union; `replaceReactiveMembers` remains the separate overwrite operation.
Resource binding's type now explicitly excludes both overwritten fields.

```gherkin
Scenario: Shared client and identically named providers
  Given two raw provider instances with the same resource contract and tenant
  When list, one or many hooks use one shared query client
  Then each hook fetches and retains only its own provider's checked records

Scenario: Deferred read input
  Given a configured query with captured IDs, filters and resolved metadata
  When its original input changes before an old query executes or retries
  Then the old query uses its original detached input and provider

Scenario: Reactive scope changes
  Given an in-flight read
  When the resource, tenant, provider instance or schema changes
  Then the new query cannot reuse or reinterpret the old result

Scenario: Invalid external data
  Given invalid inputs or accessor-backed provider records
  When a read executes
  Then it fails closed without exposing an asserted typed record
```

Verification: `query-source.test.svelte.ts` contains 55 focused runtime cases
and one narrow compiler test using the actual query-result types. The compiler
fixture checks state discrimination, replacement typing, forbidden overwrites
and generic resource projection with strict flags and declaration checking.
It does not compile the complete Core package or the workspace. Existing
directly affected mock fixtures were updated to provide the required context
members; those separate test files were not run in this increment.

## Select Contract Boundary

Scope: the select hook and its Combobox consumer. Form queries and mutation
cache ownership are not part of this increment.

```gherkin
Scenario: Independent selection sources
  Given matching resource contracts on different provider instances
  When selectors share a query client or switch their resource scope
  Then list and selected-record queries retain only their own checked data

Scenario: A selected value arrives after mounting
  Given a selector initially without a selected ID
  When the value changes to an ID absent from the current list
  Then the default-record query loads and displays its validated label

Scenario: Deferred search and input ownership
  Given pending search work and captured request parameters
  When the source changes or the caller mutates the original parameters
  Then old work cannot search the new scope or mutate the captured request

Scenario: Invalid mappings and failed defaults
  Given invalid mapped values or a failing selected-record request
  When the selector resolves its queries
  Then it exposes an error without displaying unchecked data and permits retry

Scenario: Distinct IDs and clearing a selection
  Given duplicate labels or numeric and string IDs with the same text
  When an option is selected or cleared
  Then identities remain distinct and clearing also resets remote search
```

The unchecked `useSelect` export was removed. Its internal factory now lives
in `select-query.svelte.ts`; the public hook still requires a genuine resource
contract and infers records, value fields, default IDs and search operands
from that contract.

Both select query families capture the actual provider instance, decoder,
resolved metadata and detached inputs. Default queries are always mounted and
reactively enabled. Provider fallback requests receive separate metadata, and
each dispatch receives fresh parameters. Debounced work is tied to its captured
reactive scope and discarded after source changes, clearing or unmounting.

Option projection runs inside the query observer's checked selection step.
Each mapper receives an independent decoded record. Invalid mappings become
query errors rather than throwing from the rendered option list. Non-finite
values are rejected; numeric and string values remain distinct during
deduplication. Errors from either transport remain `unknown`.

Combobox now uses the public contract-bound hook, retains reactive option
getters, loads its current selection as a default, and exposes sanitized errors
with retry. Its props no longer have an `any` index signature, and its old
record/event assertions were removed. Clear and trigger controls are separate
buttons. Duplicate labels use distinct value identities, and selection or
clearing resets remote search.

Verification: the single `select-contract.test.svelte.ts` file passes 33 cases:
32 runtime cases and one scoped strict compiler check. The compiler check
covers the new select implementation, option projector, Combobox and regression
harnesses, plus positive/negative API fixtures. It checks those source files,
not all transitive dependencies or the workspace. Scoped `git diff --check`
also passes. No full suite, workspace-wide type gate, build, commit, push or
deployment was performed in this increment.

## Delete Action Boundary

Scope: public single-record deletion and DeleteButton. The dynamic table's
legacy delete path and other mutation families remain separate migrations.

```gherkin
Scenario: A reactive deletion target
  Given a button bound to a runtime resource contract and record ID
  When its resource, ID, provider or tenant changes
  Then confirmation resets and the next operation validates the current target

Scenario: Independent caches
  Given providers sharing the same query client, resource and tenant
  When one provider deletes a record
  Then only that provider's contract-bound caches are removed or refreshed

Scenario: Invalid or mutable external data
  Given invalid IDs, deletion payloads or accessor-backed data
  When deletion is requested
  Then inputs fail before dispatch and unchecked responses cannot report success

Scenario: Undo, duplicate clicks and failure
  Given a confirmed deletion
  When it is pending, cancelled or fails
  Then duplicate submissions are blocked and cancellation or retry remains usable

Scenario: A late completion
  Given an operation started in an older view
  When the user changes scope or leaves the view
  Then the old result cannot call the new view's success callback
```

Public `useDelete` now uses a dedicated contract-bound implementation. It
captures the current resource contract, ID, provider instance, payload, resolved
metadata and lifecycle providers before asynchronous work. It rejects target
overrides, arbitrary cache policy and invalid inputs before dispatch. Erased
metadata keeps deletion payloads unknown until the private schema validates them;
concrete resource contracts retain required/optional input inference.

Deletion responses are detached before schema inspection and must return the
same typed ID, without string/number coercion. Failed receipts report that the
write may already have happened, and automatic mutation retries are disabled.
Detail removal and refresh require the captured provider source, contract,
tenant and resource. Untagged caches and unrelated record details are excluded.
The mutation remains pending until every selected refresh settles.

Undoable deletion defers dispatch without inventing an optimistic typed receipt
or changing cached rows. Cancellation never sends the request. DeleteButton
uses this public path, supports checked deletion payloads, resets confirmation
on scope changes, blocks duplicate submission, catches failures and suppresses
late view callbacks after scope changes or unmounting.

The focused regression exposed two necessary shared fixes. Captured mutation
results now preserve state discrimination through a separate union-preserving
projection, without changing the existing generic replacement helper. `useCan`
captures the actual access-control provider and complete checked inputs in its
key, validates decisions as plain boolean records, and fails closed on malformed
or failed responses. A fixed ID is attached only after validating extra params,
so they cannot override the button target or execute getters during spreading.

Verification: `delete-contract.test.svelte.ts` passes 33 cases, including 32
runtime regressions and one scoped strict compiler check of the changed
boundary, button/harness code and positive/negative public API fixtures.
Scoped diff checks pass. Two directly affected label/permission test mocks were
updated for the new public imports; their separate test files were not run.
No full suite, complete workspace type audit, commit, push or deployment was
performed. The dynamic table still consumes legacy deletion APIs and remains
on the boundary inventory.

## Detail View Boundary

Scope: ShowPage, RecordDetailDrawer and their contract-bound single-record read.

```gherkin
Scenario: Explicit drawer selection
  Given a closed drawer or a drawer without an explicit record ID
  When the router contains a different ID
  Then no detail query reads the route's record

Scenario: Checked read authorization
  Given a denied or pending show decision
  When a detail view mounts or changes record
  Then it does not fetch or display the protected record

Scenario: Resource and record changes
  Given a pending detail query
  When the ID, resource, provider, tenant or contract changes
  Then only the current source's checked matching record is displayed

Scenario: Invalid records and retry
  Given an invalid, mismatched or failed detail response
  When the view resolves
  Then it displays a sanitized error and retries only the current detail

Scenario: Display and action boundaries
  Given a checked record and metadata-driven fields
  When the view renders fields or exposes record actions
  Then field validation and current read/edit permissions remain enforced
```

Both detail views now use the public contract-bound `useOne` path through a
shared view helper. The unchecked `useShow` entry point was removed; public
contract-bound `useShow` remains available. Single-record contract reads reject
responses whose ID differs from the captured request, preserving the distinction
between numeric and string IDs.

The drawer mounts its bound content only while open and explicitly selected.
An absent selection renders an empty shell without creating a data query, so it
cannot fall back to an unrelated route ID. ShowPage and the drawer both wait for
the current show decision, respect `canShow`, and hide cached contents when
permission is revoked. Drawer navigation also checks the current record and
edit permission.

Failures are shown as sanitized errors with an explicit current-record retry.
The page refresh control now refreshes its own detail query and exposes pending
state, instead of invalidating only list families. Fields continue through the
validated dynamic display boundary. Existing layout and field-visibility
behavior remain intact.

Verification: `detail-contract.test.svelte.ts` passes 38 cases: 37 runtime
regressions and one scoped strict compiler check of the changed reader/view
files and positive/negative type fixtures. The stale negative fixture imports
for removed dynamic select/show APIs were replaced with explicit rejection
checks. Two directly affected enterprise/interaction fixtures now declare
resource contracts; their separate test suites were not run. Scoped diff checks
pass. No full suite, workspace-wide type audit, build, commit, push or deployment
was performed.

## Inline Update Boundary

Scope: public single-record updates and InlineEdit. Legacy form/bulk update
paths remain separate migrations.

```gherkin
Scenario: Current edit target
  Given a field bound to a contract, record ID and provider
  When editing starts or a save is submitted after a scope change
  Then the operation uses the current target and old work cannot overwrite it

Scenario: Validated input and receipt
  Given malformed, missing, accessor-backed or ID-changing update input
  When saving is requested
  Then it fails before dispatch
  And only a checked matching receipt can trigger a successful save callback

Scenario: Numeric editing
  Given a numeric editor with string input from the DOM
  When the value is blank, invalid or non-finite
  Then blank is validated as null and invalid numbers are rejected without coercive fallback

Scenario: Scoped refresh
  Given matching resources on independent provider instances
  When an update finishes
  Then only its captured source's related caches are refreshed
  And pending state lasts until all selected refreshes settle

Scenario: Editing interaction
  Given a permitted editable field
  When the user saves, cancels, blurs or retries a failed save
  Then duplicate submissions are prevented and failures preserve the draft
```

Public `useUpdate` now captures the current contract, ID, input, metadata and
actual provider before asynchronous mutation work starts. A private update
schema is required; omitted input, unknown fields, accessors and ID changes
fail before dispatch. Transport receipts are detached and checked against the
record schema and the exact captured ID. Potentially committed writes are
never retried automatically.

Refreshes are restricted to the captured provider instance, route, contract,
tenant and resource. Related list families and only the matching detail ID
are invalidated. All selected refreshes settle before the caller receives
success; unchecked optimistic records are not manufactured.

InlineEdit now uses the public contract-bound update hook and is no longer in
the unchecked consumer inventory. It checks record-level edit permission,
resource and field visibility, and excludes ID editing. Numeric drafts remain
strings in the DOM and are parsed as finite decimal/exponent values or null,
without falling back to the previous value on invalid input. Failed saves keep
the draft and display a sanitized error; save, cancel, Enter and blur prevent
duplicate requests. Callback values come from the checked server response.
Scope changes and unmounting suppress stale callbacks, and the busy indicator
stays inside the save button rather than overlaying cancel.

Verification: `update-contract.test.svelte.ts` passes 42 checks, including the
unchecked-inventory guard and a scoped strict compiler check of the changed
core/editor files, runtime regression file, and positive/negative type fixtures.
The runtime cases exercise actual Svelte/TanStack hooks, provider isolation,
input snapshots, response rejection, refresh settlement, numeric parsing,
permissions, retry interaction and stale callback suppression.
Two directly affected table fixtures now declare update schemas; their separate
test files were not run. Scoped diff checks pass. No full suite, repository-wide
type audit, build, commit, push or deployment was performed.

After this checkpoint, unchecked UI consumers were AutoForm, AutoTable,
StepsForm and ImportButton; the import migration is recorded below.
The raw internal mutation implementation and its unsafe export
are not retired by this scoped migration. These are outstanding migration
work, not backward-compatibility exceptions or evidence of repository-wide
100% type safety.

## Import Boundary

Scope: contract-bound file import and ImportButton. Input validation is a
whole-file preflight, not a promise of transactional database import.

```gherkin
Scenario: Validate before writing
  Given a CSV or JSON file and a resource with a create schema
  When any parsed or mapped row fails its schema
  Then no row is written and a sanitized input failure is reported

Scenario: Checked import receipts
  Given valid rows sent individually or in batches
  When a receipt is malformed, mismatched or incomplete
  Then it cannot count as success and the request is never retried automatically

Scenario: Captured import scope
  Given an import reading a file or awaiting a provider
  When its resource, provider, tenant, permission or mounted scope changes
  Then no further rows are dispatched and stale callbacks cannot update the new view
  And already dispatched writes are not described as rolled back

Scenario: Import settlement
  Given successful or potentially committed writes
  When import work ends
  Then only the captured source's related caches are refreshed
  And completion waits for all selected refreshes to settle

Scenario: Import interaction
  Given an authorized import button
  When the user selects a file, repeats an event, or encounters failure
  Then duplicate writes are prevented, errors remain visible, and the file can be selected again
```

The public `useImport` now requires a real contract with a create schema. Mapper
outputs and successful records derive from that contract; erased metadata keeps
inputs unknown until validation. Parsed JSON must contain plain object rows.
CSV parsing uses the directly declared Papa Parse dependency with no automatic
business coercion. Malformed quotes, duplicate/empty headers, mismatched column
counts, unsupported formats and invalid settings fail before dispatch. All
mapped rows pass a detached, private create-schema preflight before the first
write, including required fields, unknown keys, accessors and non-finite values.

Input files are captured without invoking overridden text methods or own
filename accessors. The importer captures the actual provider, receiver, route,
tenant, metadata, settings and callbacks before file reading. Repeated events
for the same active file share the invocation; different concurrent files are
rejected. Scope changes and unmounting stop subsequent requests and suppress
stale progress and completion. Already dispatched writes are explicitly marked
as possibly committed, never claimed to be rolled back.

Individual and batch receipts are copied and schema-checked. Batch counts,
duplicate result IDs and explicit submitted IDs are validated before accepting
success. Row failures contain sanitized errors and the checked input, with
one-based data-row indexes. Failed writes are not automatically retried.
Captured list/many/select families are refreshed even after uncertain writes
or cancellation, without invalidating another source or existing detail ID.
All selected refreshes settle before completion. Callback failures are isolated,
and callback/state/return records do not share mutable payload objects.

ImportButton uses the public hook, checks import permission and `canCreate`,
rejects a file picker opened for an obsolete scope, prevents duplicate events,
resets the input for explicit re-selection and displays sanitized errors.
An optional mapper supports explicit CSV conversions. The old importer
implementation and unsafe export were removed rather than retained as aliases.
The former mock-only importer tests were replaced by their stronger real-runtime
equivalents in the new regression file.

Verification: `import-contract.test.svelte.ts` passes 52 checks, including the
unsafe-removal guard and a scoped strict compiler check of the boundary,
component, regression sources and positive/negative type fixtures. Existing
hook-export, button-label and asynchronous-context fixtures were synchronized;
their separate test files were not run. The declared parser dependency was
added to the lockfile. Scoped diff checks pass. No full suite, repository-wide
type audit, build, commit, push or deployment was performed.

The unchecked consumer inventory now contains AutoForm, AutoTable and StepsForm,
plus one negative type fixture. Other outstanding coverage and internal API
migrations described above remain open; this checkpoint is not repository-wide
100% type-safety acceptance.

## AutoForm Boundary

Scope: public contract-bound forms and AutoForm. Step-form migration and
unchecked internal form wrappers remain separate work.

```gherkin
Scenario: Drafts are not validated payloads
  Given a form bound to an object create or update schema
  When partial or invalid values are edited
  Then draft reads remain unknown until validation
  And submission validates a detached payload before dispatch

Scenario: Current record loading
  Given an edit, clone or show form with an explicit ID and permission
  When the provider returns a record
  Then the record must match its schema and the exact requested ID
  And late responses cannot populate another form scope

Scenario: Truthful submission
  Given invalid input, failed writes, or invalid receipts
  When submission is attempted
  Then it rejects and never triggers a successful callback or redirect
  And duplicate submissions do not create duplicate writes

Scenario: Read-only and clone modes
  Given a show or clone form
  When the user reads or submits it
  Then show mode cannot write and cloning creates a new record without copying its source identity

Scenario: Post-save reconciliation
  Given a save awaiting its provider or cache refreshes
  When draft edits or scope changes happen
  Then newer draft values and new-scope state are preserved
  And completion waits for refreshes of only the captured source's related caches
```

The public `useForm` and AutoForm now use the contract-bound implementation.
Draft reads expose readonly partial fields with unknown values, not fabricated
complete business inputs. Concrete contract setters retain their field names
and value types. Defaults, draft updates and submitted payloads are detached;
unknown fields, accessors and non-plain values are rejected. Submission checks
the private create/update schema and rejects validation failures before writing.

Edit, clone and show require explicit, schema-checked IDs. Read receipts must
match the requested ID and record schema. Show mode cannot write; clone uses
the create schema and excludes source identity and bookkeeping fields.
AutoForm renders only fields belonging to the action schema, waits for current
permissions and record loading, and provides an explicit read retry. Failed
submission retains the draft, marks invalid fields and focuses the first error.
Checked server-error field names receive sanitized messages; unknown fields,
accessors and errors for newer edits cannot affect the displayed field state.

Submissions capture defaults, provider methods and receiver, route, contract,
metadata, tenant, auth/router instances and callbacks. Duplicate calls share
one pending submission and failed writes are not retried automatically.
Receipts are detached and checked before reporting success. Uncertain writes
refresh only the captured source's related cache families; incorrect update
receipt IDs cannot redirect invalidation away from the requested record.
Success and failure completion wait for selected refreshes to settle.

Late reads and writes cannot replace new-scope state or trigger obsolete
callbacks. Permission revocation suppresses old UI completion, and an old
submission settling cannot clear a newer submission's pending state.
Successful saves preserve edits made while waiting, accept server-normalized
unchanged fields and avoid navigation while newer changes remain unsaved.
Callback, notification and navigation failures cannot invalidate a checked
successful receipt. AutoForm runs its success callback before navigation and
clears obsolete navigation-confirmation actions when its scope changes.

Verification: `form-contract.test.svelte.ts` passes 45 checks, including real
Svelte/TanStack behavior, an unsafe-removal guard, and scoped strict compiler
diagnostics for the changed form boundary, AutoForm, regression sources and
positive/negative type fixtures. The accessibility harness now declares its
resource contract and is included in that scoped compiler check; its separate
test file was not run. Scoped tracked and new-file whitespace checks pass.
No full suite, repository-wide type audit, build, commit, push or deployment
was performed.

AutoForm has been removed from the unsafe inventory. AutoTable and StepsForm,
one negative type fixture, and the remaining internal form wrappers and coverage
gaps above still need their own acceptance. This is a completed AutoForm
checkpoint, not repository-wide 100% type-safety acceptance.

## StepsForm Boundary

Scope: the public step-form hook, StepsForm, and the shared form validation
needed for checked step navigation. Other form wrappers remain separate work.

```gherkin
Scenario: Contract-bound steps
  Given a step form with a create or update contract
  When its step definitions are accepted
  Then step fields belong to the writable schema and navigation indexes are bounded integers
  And draft and receipt types come from the contract, not caller-selected record types

Scenario: Checked navigation
  Given invalid fields in an earlier step
  When the user advances or selects a later step directly
  Then navigation stops at the first invalid step without writing
  And backward navigation preserves drafts and follows the configured validation policy

Scenario: Complete submission
  Given partial drafts across several steps
  When the user saves
  Then the complete input and receipt are checked by the shared form boundary
  And failures remain visible without automatic retries or false success

Scenario: Current workflow
  Given an in-flight read or save
  When the resource, provider, tenant, permission or step configuration changes
  Then the current step resets and stale work cannot affect the replacement workflow

Scenario: Accessible recovery
  Given a denied permission, read failure or field error
  When StepsForm renders or submission fails
  Then loading and error states are explicit, read retry is available and the first invalid step and field receive focus
```

The public `useStepsForm` now accepts a real create/update contract and explicit
step field definitions instead of `stepsCount` or caller-selected record/error
types. Step fields are checked against the private writable schema, duplicate
fields within a step are rejected, and the workflow must contain at least one
step. Initial and navigation indexes must be bounded integers. Empty review
steps are supported without dividing by zero or allowing invalid workflows.
The legacy form implementation and unsafe step-hook export have been removed.

Step navigation delegates field validation to the checked form boundary.
Forward jumps validate every preceding step, and optional backward validation
checks the current step. Failed validation moves to the first affected step
without dispatching a write. Final submission always validates the entire
payload, including fields outside the currently visible step. Draft reads
remain partial and unknown; typed field setters permit clearing a field with
undefined without retaining an obsolete value or accepting a missing required
field at submission.

The step workflow shares the form's captured provider, metadata, tenant,
contract, permissions and async mutation lifecycle. Layout changes reset
navigation and drafts, use an isolated read-cache key, and suppress obsolete
read/write completion. An old rejected save cannot move the new workflow to an
old error step or clear a newer submission's pending state. Duplicate saves
share one invocation. Checked server errors return to the appropriate step;
provider failures do not retry automatically, and newer edits survive a
successful write. Captured source caches settle before completion.

StepsForm uses instance-bound resource metadata and the public checked hook.
It waits for permission and record loading, rejects hidden or non-writable
configured fields, exposes read retry and sanitized submit errors, and links
invalid fields to their messages and focus targets. Step indicators cannot
bypass validation; navigation and save controls remain disabled through UI
submission settlement. Unsaved cancellation requires confirmation, and scope
changes remove obsolete confirmation actions. Permission revocation suppresses
old success callbacks and navigation.

Verification: `steps-contract.test.svelte.ts` passes 45 checks, including real
Svelte/TanStack behavior, public/unsafe export guards, and scoped strict
compiler diagnostics for the changed hooks, StepsForm, AutoForm and the
positive/negative fixtures. The existing hook-export fixture and English/Chinese
step-form documentation were synchronized; their separate suites were not run.
Scoped tracked/new-file whitespace checks pass. No full suite, repository-wide
type audit, build, commit, push or deployment was performed.

StepsForm has been removed from the unsafe inventory. AutoTable is now its only
production UI consumer, alongside one negative type fixture. Internal old form
wrappers and the broader coverage gaps above remain open. This checkpoint does
not establish repository-wide 100% type safety.

## Batch Delete Boundary

Scope: the public `useDeleteMany` prerequisite for AutoTable. The table consumer
and old internal bulk-cache helpers remain separate migrations.

```gherkin
Scenario: Whole-request validation
  Given a contract-bound batch delete
  When IDs, variables or metadata are invalid
  Then the entire request fails before any record is deleted

Scenario: Checked receipts
  Given a native batch operation or per-record fallback
  When deletion returns records
  Then every accepted record matches its schema and requested identity exactly
  And partial failures contain only checked IDs and sanitized causes

Scenario: Captured execution
  Given a queued or in-flight batch delete
  When resource, provider, tenant, permission or mounted scope changes
  Then no further fallback requests are dispatched and obsolete callbacks are suppressed
  And dispatched writes are never described as rolled back

Scenario: Precise settlement
  Given successful or uncertain deletes
  When the invocation settles
  Then only related queries from the captured source and contract are refreshed
  And all selected refreshes finish before success or failure is delivered

Scenario: Observer isolation
  Given repeated calls or throwing observers
  When a batch delete completes
  Then duplicate active requests do not repeat writes and observers cannot falsify its outcome
```

The public `useDeleteMany` now delegates to a dedicated checked implementation,
not the old broad-cache bulk mutation helper. The full envelope is detached and
validated before dispatch: IDs must be nonempty, unique and schema-typed;
required delete variables use the contract's private schema. Unknown envelope
keys, accessors, invalid numbers and malformed metadata fail before writing.
Caller-selected response/error types and legacy optimistic/retry overrides
remain unavailable.

Each invocation captures the current contract, provider methods and receiver,
provider route, metadata, tenant, auth/router instances and callbacks. Native
batch receipts must contain exactly the requested identity set, without
duplicates, extras, missing records or type coercion; reordered receipts are
accepted. The sequential fallback verifies each record against its requested
ID before claiming success. Partial errors contain only proven succeeded IDs,
failed IDs and detached sanitized causes. Rejected or malformed receipts are
marked as potentially committed rather than claimed to be rolled back.

Identical active requests share one invocation; conflicting requests are
rejected without replacing active state. Resource, provider, tenant, auth,
enabled-state changes and unmounting stop further fallback dispatch and suppress
obsolete completion callbacks. New invocations remain independent when old
requests settle. Permission-aware consumers can disable dispatch through the
explicit enabled gate; actual authorization remains the provider's duty.

Only checked deleted detail IDs are removed from the captured source's cache.
Successful and uncertain attempts refresh the same source/contract's related
collections and requested details, never another admin instance, provider,
tenant, resource or unrelated record. Both success and failure wait for all
selected refreshes, even when one fails early. Late auth-error responses cannot
redirect a replacement resource view.

Callbacks, notifications, return records, repeated data/error reads and
variables are detached from internal mutation state. Observer exceptions and
rejected promises cannot turn a checked receipt into a failed write. Client
retry and per-mutation observer defaults cannot override the checked lifecycle.
The public mutation retains its success/error discriminants and schema-derived
ID, payload and result types.

Verification: `delete-many-contract.test.svelte.ts` passes 44 checks, including
real Svelte/TanStack behavior, the legacy-delegation guard, and scoped strict
compiler diagnostics for the new boundary, hook, public hook wrapper, probes
and positive/negative fixtures. Scoped tracked/new-file whitespace checks pass.
No other test suite, full type audit, build, commit, push or deployment was run.

That checkpoint completed the public batch-delete prerequisite only. The next
section records AutoTable's migration, including current permissions and
confirmation scope. Old internal
bulk/form wrappers and the broader coverage gaps remain outstanding. This
checkpoint does not establish repository-wide 100% type safety.

## AutoTable Boundary

Scope: AutoTable and its directly related header/record adapters. Other internal
legacy wrappers and repository-wide coverage remain separate work.

```gherkin
Scenario: Checked table reads
  Given a table bound to a declared resource contract and current list permission
  When the provider returns rows
  Then only schema-checked records with unique typed identities enter the table
  And denied reads, malformed results and retries have explicit states

Scenario: Type-preserving interaction
  Given checked records and dynamic field metadata
  When cells, selection, detail links or custom snippets are used
  Then IDs keep their original types and invalid field values are not fabricated by assertions
  And custom renderers cannot mutate cached records

Scenario: Scoped destructive actions
  Given a delete confirmation or pending batch
  When its resource, provider, tenant, auth, permission or selection changes
  Then obsolete confirmation and completion cannot delete or update the new scope
  And partial failure retains only the failed checked identities for retry

Scenario: Preserved list workflow
  Given search, filters, sorting, pagination and saved column settings
  When the user changes the list or switches resource scope
  Then each request uses the current contract and state without leaking old preferences or selection

Scenario: Checked export and refresh
  Given the current checked page
  When export or refresh is requested
  Then current permission is required, exported data is safely encoded and stale data is not presented as current
```

AutoTable now uses the public contract-bound list and batch-delete hooks, with
current list/delete permissions gating requests. Rows enter TanStack only after
business schema validation and a detached unique typed-ID check. Numeric and
string identities remain distinct in selection, partial failures, and generated
detail links, including page reloads. Malformed route tokens do not dispatch a
detail request. Bare links still use string-first matching or canonical conversion
for numeric-only contracts; newly generated links always carry the ID type.

Cells and summary/extension records are detached from query-cache records.
FieldDisplay validates dynamic display values; inline editors are limited to
fields owned by the update schema. DraggableHeader preserves its concrete column
type without narrowing assertions. Search, filters, controlled pagination and
sorting, column order/visibility and saved-view preferences retain their scoped
workflow. Permission loss hides both cached rows and record totals.

Single-record and batch deletion use one checked confirmation flow. Old global
optimistic/undoable modes do not bypass it. Scope changes dismiss obsolete
confirmations, and late completions cannot change a replacement selection.
Partial failures retain the original typed failed IDs. Required delete variables
are preflighted, and absent optional inputs are omitted rather than serialized as
undefined.

Exports require current read/export permission and a valid settled page. They
respect visible column ordering, disambiguate duplicate labels, detach nested
values and neutralize formula-like text before the shared CSV encoder. Invalid
refreshes cannot export a previously cached page.

Verification: `table-contract.test.svelte.ts` passes 41 checks, including real
Svelte/TanStack interactions, a no-unsafe-entry guard, strict compiler diagnostics
for the table, generic header, row/route adapters and fixtures, and positive and
negative type contracts. Directly affected interaction harness receipts and old
deletion/link expectations were updated; the older interaction test file was not
run separately. Scoped tracked/new-file whitespace checks pass. No broader test
suite, repository-wide audit, build, browser screenshot acceptance, commit, push
or deployment was run.

This completes the AutoTable boundary, not repository-wide 100% type safety.
Internal bulk/form wrappers, unvalidated SDK assertions and the coverage gaps
listed above remain separate work.

## Batch Update Boundary

Scope: the public `useUpdateMany` hook, its schema-bound input/output adapter,
partial-failure error, and directly associated type aliases.

```gherkin
Scenario: Complete preflight
  Given a declared record and update schema
  When a batch contains invalid, duplicate or identity-changing inputs
  Then no provider method runs and the failure exposes no submitted values

Scenario: Exact checked receipts
  Given native batch support or a sequential single-record fallback
  When records are returned
  Then every receipt matches the record schema and requested typed identities
  And partial fallback failures preserve only proven successful and failed IDs

Scenario: Captured execution
  Given a batch in flight
  When its contract, provider, tenant, authorization scope or enabled gate changes
  Then later fallback writes stop and obsolete completion cannot alter the new state

Scenario: Isolated refresh and state
  Given successful, failed or uncertain updates
  When the operation settles
  Then only related source/contract collections and attempted details refresh
  And callback, state and result mutations cannot alter internal records
```

The public `useUpdateMany` entry point now uses a dedicated checked lifecycle.
The old `useUpdateMany`, `createUpdateManyMutation` and broad parameter interface
were deleted from the legacy hook module, so the unsafe entry point cannot
re-export them. The public parameter alias derives IDs and payloads from the
resource contract; erased metadata payloads remain unknown until validated.

Before queuing work, the hook snapshots the entire envelope, validates every ID
and the update payload, rejects identity changes, and captures provider methods,
their receiver, resource/contract identity, metadata, tenant, auth and router.
Native receipts must contain exactly the requested typed ID set, in any order.
Fallback calls run sequentially with independent payload snapshots and validate
each receipt. `UpdateManyPartialError` reports checked successes and failed IDs
with detached sanitized causes; it does not imply transaction rollback.

Disable, reset, unmount or scope replacement stops subsequent fallback calls.
An already-dispatched request may still finish, but its completion cannot replace
new mutation state or redirect a replacement resource. Successful and uncertain
attempts refresh only captured-source/contract collections and attempted detail
IDs. Updates never delete cached records. Success and failure wait for all
selected refreshes, including when one refresh fails before another settles.

Mutation data, variables, errors, callback values and returned values are
detached. Identical active requests share one provider dispatch but receive
separate result/error objects; conflicting requests are rejected. Client retry
and observer defaults cannot override the checked lifecycle. Audit events keep
the original numeric/string identity. Observer exceptions do not change the
write result.

Verification: `update-many-contract.test.svelte.ts` passes 55 checks, including
real Svelte/TanStack lifecycles, runtime absence of the legacy exports, and scoped
strict compiler diagnostics for the hook, adapter, legacy module, public wrapper,
probes and positive/negative fixtures. The directly affected mocked batch test
now invokes the public mutation API rather than the internal mutation envelope;
that older test file was not run separately. Scoped tracked/new-file whitespace
checks pass. A previous AutoTable notification expectation was also corrected to
retain the checked delete hook's actual batch-failure message.

This completes the batch-update boundary only. Public batch creation, legacy
delete/form internals, other SDK assertions and repository coverage still require
work. No full suite, full coverage audit, build, commit, push or deployment was run.

## Legacy Batch Delete Retirement

Scope: remove the old batch-delete implementation and align the public aliases
with the already checked lifecycle. Revalidate preserved cache, payload, auth
and callback behavior without retaining optimistic rollback compatibility.

```gherkin
Scenario: No unchecked batch-delete route
  Given the core and legacy module exports
  When a caller attempts to use an old batch-delete hook or factory
  Then the entry point is absent and type fixtures reject it

Scenario: No speculative cache removal
  Given a pending checked batch with a global optimistic or undoable setting
  When it has not returned a valid receipt
  Then collection and detail data remain untouched
  And confirmed deletion removes only exact typed detail identities

Scenario: Detached completion and auth handling
  Given joined calls or a partial fallback failure
  When results, errors or auth callbacks are consumed
  Then each observer receives detached values and sanitized failures
  And late authentication responses cannot navigate a replacement scope
```

The old `useDeleteMany` and `createDeleteManyMutation` implementation, broad
parameter/options types and speculative cache mutation context were removed
from `hooks.svelte.ts`. They are no longer available through the legacy export.
The obsolete mocked optimistic/undoable cache test was removed; retained behavior
is now exercised against the real checked hook in the focused UI contract test.

Public `UseDeleteManyOptions` and `UseDeleteManyMutateParams` now refer to the
actual checked interface, including its enabled gate and unknown runtime-checked
payload for erased resource metadata. Negative fixtures reject both removed
legacy functions and the old per-call mutation/notification policies.

Joined calls still dispatch once but now receive independent result/error
objects. Preflight failures also detach their rejection from internal state.
Partial failures pass a sanitized authentication cause to the current handler
without exposing the stored failure to mutation; authentication failures are
preferred even when an earlier fallback failed for another reason. Late auth
responses remain scope-guarded. Audit records preserve numeric/string ID types.

Verification: `delete-many-contract.test.svelte.ts` passes 58 checks, including
the original checked-hook coverage, real absence of legacy exports, strict
compilation of the changed adapter/hook/module/wrapper and fixtures, and added
cache/identity/payload/auth/copy regressions. Tests prove no speculative changes
to list, many, select, default-selection, infinite or detail caches, even with a
global optimistic/undoable setting. Confirmed deletion distinguishes numeric `1`
from string `"1"` and does not remove or invalidate the latter's detail.

The directly affected mocked strict-hook test now invokes public mutation
methods; it was not run separately. Scoped tracked/new-file whitespace checks
pass. No full suite, build, commit, push or deployment was run.

This retires the old batch-delete path, not all remaining unsafe paths.
Public batch creation, old single-record/form helpers, broader SDK assertions
and the repository coverage audit remain unfinished.

## Checked Batch Creation

Intent: create schema-owned records without unchecked inputs, duplicate automatic
writes or loss of recovery evidence. This boundary does not promise transaction
rollback or business correspondence for server-generated IDs.

```gherkin
Scenario: Complete preflight
  Given a batch and a resource contract
  When any input, supplied identity or envelope field is invalid
  Then no provider write is dispatched
  And missing create schemas cannot accept even an empty batch

Scenario: Checked receipts
  Given native or sequential fallback creation
  When the provider returns records
  Then cardinality, record schemas and unique typed IDs are validated
  And supplied IDs match the corresponding input positions

Scenario: Recoverable partial writes
  Given sequential creation with some failed receipts
  When the operation settles
  Then checked successes and zero-based failed input indexes remain available
  And no automatic retries repeat potentially completed writes

Scenario: Captured ownership
  Given a pending create batch
  When its scope changes or it is disabled, reset or unmounted
  Then no subsequent fallback writes start
  And only captured collections and known or supplied detail IDs refresh
  And stale completion cannot replace current state or navigate a new scope

Scenario: Detached public API
  Given mutation state, joined promises and completion observers
  When a consumer mutates a returned value
  Then other consumers and stored state remain unchanged
  And removed legacy batch-create exports are unavailable
```

The public `useCreateMany` now uses a dedicated checked lifecycle. The legacy
`useCreateMany`, `createCreateManyMutation` and broad parameter type were removed
from `hooks.svelte.ts`; negative fixtures reject those exports. Concrete create
payloads and success records derive from the resource schemas. Erased contracts
accept unknown inputs only through runtime validation. A missing create schema
cannot manufacture a payload type, including through an empty array.

Preflight snapshots the complete nonempty batch, validates each create payload
and any supplied ID against the record ID schema, and rejects duplicate supplied
typed identities. Provider methods and their receiver, resource, contract,
metadata, source, tenant, auth and router are captured before queued dispatch.
Native receipts require exact cardinality, valid record schemas and unique typed
IDs. Supplied IDs must match receipt positions. Generated IDs establish valid
record identity, not proof of business correspondence or ordering.

Fallback calls execute sequentially with independent payload and metadata copies.
Each receipt is checked, including generated-ID uniqueness across the fallback.
`CreateManyPartialError` carries checked success records with zero-based input
indexes, failed indexes and detached sanitized causes, even if every fallback
fails. Failure does not imply rollback, and automatic retries are disabled.

Disable, reset, unmount and scope replacement stop later fallback calls. An
already-dispatched write may finish; cancellation preserves attempted, succeeded,
failed and unattempted input indexes for recovery. Stale completions cannot
replace current state or invoke completion observers. Refreshes target captured
source/contract collections and only supplied attempted IDs or checked generated
IDs, never foreign IDs from rejected receipts. No cache records are removed.
Settlement waits for every selected refresh, even if another refresh rejects.

Joined identical calls dispatch once but receive independent values and their
own completion callbacks. State data, variables, errors, success callbacks and
error callbacks expose detached snapshots. Conflicting active requests are
rejected. Authentication handling prefers 401/403 causes in partial failures and
receives a separate sanitized error; delayed redirects remain allowed in the
original completed scope but are suppressed after replacement or reset.

Verification: `create-many-contract.test.svelte.ts` passes 58 checks, including
real Svelte/TanStack lifecycle tests and scoped strict compiler diagnostics for
the adapter, hook, public wrapper, legacy module, host/probe and positive/negative
fixtures. The directly affected mocked strict-hook test now invokes public
mutation methods and queues its mock dispatch like the real lifecycle; that
older test file was not run separately. Scoped tracked/new-file whitespace checks
pass. The existing missing svelte2tsx source-map warning does not fail the run.

This completes the public batch-create boundary, not repository-wide type safety.
Single-record creation, remaining old single-record/form helpers, broader SDK
assertions and repository coverage evidence remain unfinished. No full suite,
full coverage audit, build, commit, push or deployment was run.

## Checked Single Creation

Intent: derive single-create inputs and receipts from a real resource contract,
with no legacy bypass or automatic repeat of potentially committed writes.

```gherkin
Scenario: Schema-owned input
  Given a concrete or erased resource contract
  When a create call has invalid input, a supplied ID or envelope fields
  Then it fails before provider dispatch
  And a missing create schema has no valid payload type

Scenario: Checked identity
  Given a dispatched single create
  When the provider returns a malformed record or a different supplied ID
  Then no success is published
  And the failure identifies the write as potentially committed

Scenario: Captured completion
  Given a pending create with captured source and contract
  When the scope changes or the hook is reset, disabled or unmounted
  Then the old completion cannot replace current state or redirect a new scope
  And refresh targets only captured collections and supplied or checked detail IDs

Scenario: Detached observers
  Given joined calls, provider receipts, callbacks and reactive state
  When one consumer changes a value
  Then other consumers remain unaffected
  And automatic retry and old per-call policies cannot bypass the lifecycle
```

The public `useCreate` now delegates to a dedicated checked lifecycle. The old
`useCreate`, `createCreateMutation`, `UseCreateOptions` and broad mutation parameter
type were removed from the legacy mutation module. Public `UseCreateOptions` and
`UseCreateMutateParams` aliases now refer to contract-derived interfaces. Negative
fixtures reject raw resource names, caller-selected result types, missing schemas
and obsolete per-call policies. Erased contracts expose unknown inputs until the
private schema validates them.

The hook snapshots the input envelope, checks the create payload and any supplied
ID against the record ID schema, and captures the provider method and receiver,
resource, contract, source, metadata, tenant, auth, router and side-effect sinks
before queued dispatch. It always calls the single-create provider method, never
silently substituting a batch endpoint. Receipts must satisfy the full record
schema and match a supplied ID without string/number coercion.

Every dispatched write refreshes captured-source/contract collections and only
the supplied or validated returned detail ID, including uncertain failures. It
does not trust foreign IDs from rejected receipts or remove cache data. Success
and failure wait for all selected refreshes, even if one rejects first. Auditing
preserves the checked ID type.

Reset before dispatch prevents the write. Disable, unmount, reset and scope
replacement suppress stale mutation state, completion callbacks and delayed auth
navigation; already-dispatched writes may still complete. Cancellation exposes
whether dispatch happened and a detached checked created record when available.
Delayed authentication decisions remain valid in the unchanged completed scope.

Identical active calls share one dispatch and receive independent result/error
objects and completion callbacks; conflicting calls fail explicitly. State,
provider receipts and observer values are detached. Successful callbacks receive
separate contract-typed input snapshots. Preflight failure callbacks receive no
input snapshot rather than an invalid value disguised as a checked payload.
Automatic retries and inherited lifecycle overrides are disabled; observer
exceptions cannot alter a completed write.

Verification: `create-contract.test.svelte.ts` passes 58 checks, including real
Svelte/TanStack lifecycles and scoped strict compiler diagnostics for the adapter,
hook, legacy mutation module, public wrapper, new host/probe and positive/negative
fixtures. The migrated provider-bundle and legacy mutation-runtime probes are
also included in the scoped compilation. The two old create runtime tests were
removed from the legacy suite and their retained receipt/tenant-isolation
requirements are covered through the new public hook. The async-context probe
now uses an explicit contract; its older suite was not run separately.

Scoped tracked/new-file whitespace checks pass. The existing missing svelte2tsx
source-map warning does not fail the run. No full suite, coverage audit, build,
commit, push or deployment was run. Remaining old update/delete/form internals,
broader SDK assertions and repository-wide coverage evidence are still open.

## Checked Single Update Lifecycle

Intent: finish the single-update boundary, retaining checked inline editing while
retiring unchecked dynamic and speculative update paths.

```gherkin
Scenario: No legacy update bypass
  Given the public and legacy module exports
  When a caller requests a dynamic update hook or factory
  Then no such legacy entry point is available
  And the public API derives target IDs, payloads and records from the contract

Scenario: Captured execution
  Given a queued or dispatched update
  When its ID, resource, provider, tenant, auth or router changes
  Then stale completion cannot replace current state or invoke callbacks
  And reset before dispatch prevents the write

Scenario: No speculative cache writes
  Given a pending update even with global optimistic or undoable defaults
  When no valid receipt has arrived
  Then cached records remain unchanged
  And settlement refreshes only captured collections and the exact typed ID

Scenario: Detached completion
  Given joined calls and completion observers
  When one mutates its data, errors or submitted parameters
  Then stored state and other consumers remain unchanged
  And invalid preflight input is never exposed as checked callback parameters
```

The public single-update hook now owns its checked lifecycle instead of exposing
the old captured-mutation wrapper. The legacy `useUpdate`, `createUpdateMutation`,
options and parameter interface were deleted from `mutation-hooks.svelte.ts`.
Public `UseUpdateOptions` and `UseUpdateMutateParams` refer to contract-derived
interfaces, including an enabled gate. Input parsing validates the envelope,
target ID, update schema and identity preservation before dispatch. Receipt
decoding enforces the record schema and exact typed target ID.

Provider methods and their receiver, source, metadata, resource, contract, target
ID, tenant, auth and router are captured before queued work. Global optimistic or
undoable defaults cannot enable speculative cache writes, old custom mutation
maps or rollback. Pending updates leave cached records intact. Settlement refreshes
only captured-source/contract collections and the exact target detail, including
uncertain writes, and waits for every selected refresh. Audit IDs retain their
original numeric/string type.

Reset before dispatch prevents a request. Replacement of the resource, ID,
contract, provider, tenant, auth or router, as well as disable/reset/unmount,
suppresses stale state and completion observers. Cancellation reports whether a
write was dispatched and retains a detached checked updated record if available.
Late authentication decisions remain valid in an unchanged completed scope but
cannot navigate after scope replacement, reset or a newer invalid invocation.

Identical active calls share dispatch while receiving independent results,
errors and completion callbacks; conflicting requests are rejected. Public
state, variables and callback parameters are detached. Preflight errors expose
no parameters as checked input. Transport errors are sanitized `HttpError`
instances, automatic retry is disabled, and observer exceptions do not change
the write outcome.

Verification: `update-contract.test.svelte.ts` passes 67 checks, preserving all
existing InlineEdit regressions and adding real lifecycle, callback, auth,
identity, cache and legacy-export coverage. Scoped strict compilation includes
the adapter, hook, legacy mutation module, public wrapper, editor, probes,
positive/negative fixtures and the changed legacy runtime test source.
The obsolete legacy update runtime cases were removed; retained payload/tenant,
concurrency and cache-preservation requirements are covered through the checked
public API. Legacy deletion and pure cache-tool coverage remain in their old
test file, which was not run separately.

Scoped tracked/new-file whitespace checks pass. The existing missing svelte2tsx
source-map warning remains non-fatal. No full suite, coverage audit, build,
commit, push or deployment was run. Old single-delete/form internals, broader
SDK assertions and repository-wide completion evidence still require work.

## Checked Single Delete Lifecycle

Intent: complete the single-delete boundary and retire the last legacy CRUD
mutation implementation without losing checked DeleteButton behavior.

```gherkin
Scenario: No dynamic delete bypass
  Given the public resource contract and legacy exports
  When a deletion is requested
  Then IDs, payloads and receipts are validated
  And old dynamic hooks, factories and mutation policies are unavailable

Scenario: Scoped undo window
  Given an undoable deletion waiting to dispatch
  When it is undone, reset, disabled, unmounted or its scope changes
  Then the wait settles and its toast is removed
  And no deletion or cache change occurs

Scenario: Checked completion
  Given a dispatched deletion
  When a valid receipt confirms the exact typed ID
  Then only the captured detail is removed and captured collections refresh
  And uncertain failures refresh the target without claiming deletion

Scenario: Isolated consumers
  Given joined promises, callbacks, state and late auth responses
  When a consumer mutates values or the active scope changes
  Then copies stay independent and stale completion cannot affect a new scope
```

The public single-delete hook now owns its checked lifecycle. The old
`useDelete`, `createDeleteMutation`, broad options/parameter interfaces,
`MutationCallbacks`, captured legacy write scope and speculative deletion
implementation were removed from `mutation-hooks.svelte.ts`. That module now
retains only the existing shared invalidation/live helpers and deep-merge
re-export. Public delete options and parameters derive from the resource
contract, preserving required and payload-free deletion distinctions.

Input envelopes, target IDs and optional deletion payloads are checked before
creating an undo window or dispatching a write. Receipt decoding enforces the
record schema and exact typed target identity. Provider methods and receivers,
resource, contract, source, metadata, tenant, auth, router and undo policy are
captured before queued work.

Undo windows have scoped cancellation and settle exactly once. Undo, reset,
disable, unmount or scope/policy replacement removes the owning toast and ends
the wait without deletion or cache changes. Old timeout/undo callbacks cannot
restart work. Separate trees retain their own undo windows. DeleteButton now
passes its permission/resource gate to the hook and resets a pending operation
when its confirmation scope, including deletion parameters, changes.

Only a checked successful receipt removes the matching captured-source/contract
detail cache. Uncertain failures retain the detail and refresh it along with the
captured collections. Other typed IDs, tenants, providers and contracts remain
untouched. All selected refreshes settle before completion. Global optimistic
or undoable defaults cannot enable the old speculative cache path, and automatic
retry is disabled. Audit records preserve numeric/string ID types.

Already-dispatched deletions may complete after scope replacement, but their
receipt, cache handling and recovery metadata stay with the original scope.
Their callbacks and state cannot overwrite a new view. Authentication errors
are sanitized and copied; delayed redirects are suppressed after replacement,
reset or a newer invalid call. Undo remains a distinct `UndoError`, not a
reported deletion failure.

Identical active calls share one wait/request but receive separate results,
errors and callbacks. State and validated callback parameters are detached;
preflight failures expose no invalid parameters as a checked payload.
Conflicting calls are rejected, and observer exceptions cannot change a
completed write.

Verification: `delete-contract.test.svelte.ts` passes 74 checks, including all
existing DeleteButton regressions and new undo, cancellation, cache, identity,
callback and auth coverage. Scoped strict compilation includes the adapter,
hook, legacy helper module, public wrapper, DeleteButton, host/probe and type
fixtures, plus the revised cache-helper test sources. Legacy mutation host/probe
fixtures were removed; pure cache rollback and invalidation tests remain without
requiring obsolete hooks. The create/update contract compiler input lists were
adjusted to remove references to those deleted fixtures; those suites were not
run separately.

Scoped tracked/new-file whitespace checks pass. The existing missing svelte2tsx
source-map warning is non-fatal. No full suite, coverage audit, build, commit,
push or deployment was run. Old form internals, broader SDK assertions and
repository-wide completion evidence remain unfinished.

## Checked Form Retirement

Intent: remove the unused dynamic form implementation and keep form submission,
reset and observer behavior inside the checked resource boundary. No unrelated
UI redesign, repository-wide rewrite or compatibility shim is included.

```gherkin
Scenario: No dynamic form bypass
  Given a resource-bound form
  When its exports and options are checked
  Then legacy factories and unchecked modal wrappers are unavailable

Scenario: Reset owns queued work
  Given a queued or dispatched submission
  When the form is reset
  Then queued writes do not dispatch and late results cannot replace the draft

Scenario: Detached consumers
  Given joined submissions, observers and exposed form state
  When a consumer mutates a returned value
  Then other consumers and internal state remain unchanged

Scenario: Checked identity and recovery
  Given a create or clone form
  When an input ID or receipt fails validation
  Then invalid input never dispatches and uncertain writes refresh only trusted IDs

Scenario: Late authentication response
  Given a failed submission awaiting authentication handling
  When the form resets or a newer submission starts
  Then the old response cannot log out or redirect the current view
```

The legacy form module, dynamic factory and broad option/return types were
removed, together with its internal barrel export and unused modal/drawer form
wrappers. The old mocked form suite was retired. Retained baseline, reset,
pending-edit and observer behaviors are covered by the checked form suite,
including nested default and queried-value snapshots. The general resource
fixture no longer advertises legacy retry/mutation configuration; the focused
form fixture explicitly rejects removed exports and unchecked mutation options.

Each joined submission now receives its own checked record or sanitized error.
Errors, field maps, taint maps, query data and refetch results are detached from
internal state. Field error setters validate names and string messages; typed
maps are read-only. Duplicate calls must pass the submit-envelope check before
joining. Query reads snapshot transport data before record decoding.

Reset invalidates pending submission ownership. Queued writes cannot dispatch,
already-dispatched results cannot replace reset values, and an old completion
cannot clear a newer active submission. Synchronous reset from validation also
prevents dispatch and stale validation state. Existing newer-edit reconciliation,
clone projection, permissions and AutoForm behavior remain covered.

Create/clone input IDs are checked against the private record ID schema before
dispatch. Every dispatched write refreshes captured collections and trusted
detail identities: edit target, supplied create ID or checked generated ID.
Wrong receipt identities are never added to recovery targets. Audit records
retain ID types, and successful form redirects use the typed route-ID format.

Provider errors retain only sanitized auth status and recovery metadata.
Callbacks, notifications, authentication handlers, state and joined promises
receive independent errors. Delayed authentication effects are suppressed after
reset or a newer submission, including a newer invalid call. Invalid enabled
values fail closed instead of enabling work.

Verification: `form-contract.test.svelte.ts` passes 63 checks. Its focused strict
compiler includes the checked form, resource contract, public wrapper, AutoForm,
host/probe and positive/negative type fixtures, using virtual Svelte resolution.
No other test file, full suite, build or repository-wide coverage audit was run.
Scoped tracked/new-file whitespace checks pass. The existing missing svelte2tsx
source-map warning remains non-fatal. No commit, push or deployment was performed.
Broader SDK assertions and repository-wide completion evidence remain unfinished;
this batch does not establish repository-wide 100% type safety.

## Checked Realtime Transports

Intent: replace WebSocket/SSE JSON trust and mock-only evidence with checked
transport events and real implementation tests. Business payload fields remain
unknown until a resource-specific schema validates them.

```gherkin
Scenario: Transport event rejection
  Given arbitrary websocket or SSE message data
  When its type, resource, payload or named channel is invalid
  Then no subscriber receives a typed event

Scenario: Independent subscriptions
  Given specific and wildcard subscribers
  When a subscriber throws, mutates data or unsubscribes
  Then other active subscribers receive independent validated events

Scenario: Retired connections
  Given a disconnected or replaced transport
  When its saved handlers deliver messages or lifecycle events
  Then current subscribers, status and reconnect work remain unchanged

Scenario: Valid subscription inputs
  Given subscription metadata and callbacks
  When input is invalid or conflicts with an existing channel
  Then no connection or existing subscription is changed
```

WebSocket and SSE now decode string transport data through one private exact
event schema. The public `LiveEvent` type derives from that schema. Invalid JSON,
non-string data, unknown event kinds, empty/non-string resources, missing or
non-object payloads, extra envelope fields and non-finite nested data are dropped
before callback delivery. SSE named events may omit their resource only when
the channel supplies it; conflicting explicit resources are rejected. Arbitrary
top-level values no longer become fallback payloads. Payload business fields
remain `unknown`, not caller-selected record types.

Subscription and connection configuration are checked without invoking accessors
or serialization hooks. WebSocket channels capture detached parameter snapshots
and reject conflicting parameter sets. Callback-identical registrations retain
independent cleanup. SSE explicitly rejects unsupported live parameters instead
of silently ignoring them; its credential configuration requires an actual
boolean and is captured before connection creation.

Each active subscriber receives a separate checked payload. Throwing or
promise-rejecting observers do not block other recipients. Cleanup during
delivery removes only that registration, new registrations wait for the next
event, and wildcard resource events are not duplicated. Disconnecting during
delivery stops the retired connection from notifying later callbacks.

Saved handlers from replaced/disconnected transports cannot change current state
or deliver data. Removed SSE named listeners cannot revive after resubscription.
Reserved `message`, `open` and `error` resources use the default full-envelope
message path; application messages cannot impersonate lifecycle events.
Native SSE reconnect state and terminal closure are distinct. WebSocket retry
controls are checked, scheduled retries are cancelled on disconnect, and failed
subscription restoration cannot reset the retry budget. Reconnects resend only
captured active channel data. Constructor/send failures do not expose raw errors
or discard the active registrations. Missing browser transports remain idle.

Verification: `bun test packages/core/src/live.test.ts` passes 42 checks. This
replaces the prior in-memory-provider-only suite with tests of the production
WebSocket/SSE implementations using controlled browser transport doubles.
The same file strictly compiles both transports, their shared boundary, the
live type module and test sources, including a negative business-payload type
fixture. No other test file, full suite, build or coverage audit was run.
Scoped tracked/new-file whitespace checks pass. No real server or browser
network integration, commit, push or deployment was performed.

The remaining core `useLive`, `useSubscription`, `usePublish` and shared live-hook
callback paths still need their own input/event and operation-scope audit.
Other SDK boundaries and repository-wide completion evidence also remain
unfinished. These transport results do not prove full repository type safety.

## Checked Realtime Hooks

Intent: validate third-party live events at the hook boundary, capture cache
ownership at subscription time, and retire duplicated unchecked hook paths.

```gherkin
Scenario: Invalid live event
  Given a third-party subscription callback
  When an event or its resource does not match the checked envelope
  Then observers and query caches remain untouched

Scenario: Retired subscription
  Given an active subscription
  When its resource, provider, tenant, auth, contract or enabled state changes
  Then old callbacks and cleanup cannot affect the new subscription

Scenario: Exact cache ownership
  Given an automatic subscription and several cached data sources
  When a checked event arrives
  Then only captured resource, contract, tenant and source keys refresh

Scenario: Independent observers
  Given local and global event observers
  When one observer mutates or rejects its event
  Then the other observer and cache handling retain independent checked data

Scenario: Checked publication
  Given a publication request
  When input is invalid or the provider fails
  Then no unchecked data or private provider error escapes the publishing hook
```

`useLive`, `useSubscription` and the shared query live helper now delegate to one
checked subscription lifecycle. The shared private event schema validates and
detaches third-party callback values before observers or caches see them.
Wrong resource channels, malformed envelopes, accessors and non-plain payloads
are ignored. Reactive configuration remains supported, while its JSON-bearing
fields, boolean/mode values and observer functions must validate before
subscription dispatch. Manual channels do not require a data provider.

Subscriptions capture the live provider method and receiver, resource,
contract, provider route, raw data source, tenant, auth-provider identity and
router. Replaced or disabled scopes invalidate saved callbacks before cleanup
can affect the next subscription. Automatic invalidation requires an exact
source-tagged resource/contract/provider/tenant match. It does not touch
uncontracted or untagged cache entries, foreign provider instances sharing the
client, or other query families. Missing named providers do not fall back.
Wildcard channels are supported in manual mode, not for automatic cache
invalidation without a bound resource.

Local and global observers receive independent checked event snapshots.
Mutation, synchronous throws and rejected promises cannot corrupt other
observers or select another cache target. Cache-refresh failures are contained.
Events emitted synchronously during subscription setup are buffered until a
callable cleanup confirms setup. Throwing or malformed subscriptions discard
those events. Malformed asynchronous cleanup values remain quarantined and
are released when a callable cleanup becomes available. Cleanup failures do
not reactivate an old callback or expose provider diagnostics.

List, one, many and the remaining legacy infinite-query helper now pass their
resource contract and separate local/global observers into that boundary.
The checked public read wrappers therefore retain their contract identity
during realtime invalidation rather than refreshing an uncontracted key family.

`usePublish` now returns an awaitable publication function. Inputs are validated
and detached before invoking the captured provider method with its receiver.
Invalid inputs, absent methods, provider failures and obsolete completion
never expose private provider errors. Failures report whether dispatch occurred.
Unmount and provider/tenant/auth-provider/router replacement guard pending
completion. A successful provider invocation is not proof of remote delivery;
business payload fields remain unknown until separately validated.

Verification: `hook-utils.test.svelte.ts` passes 54 checks, retaining the five
existing auth-delegate regressions. The added mounted tests cover all three
subscription wrappers, the four query consumers, exact cache ownership,
independent trees, named providers, setup/cleanup failures and publication.
Its strict compiler targets the changed boundary modules, live/helper modules,
query consumer modules and mounted test fixtures. No other test file, full
suite, build, hosted service test or repository-wide audit was run.
Scoped tracked/new-file whitespace checks pass. Existing localStorage and
missing svelte2tsx source-map environment warnings remain non-fatal; no new
Svelte fixture warnings remain. No commit, push or deployment was performed.

Remaining work includes same-provider authentication session revisions
(this batch captures auth-provider identity, not internal session versions),
direct provider consumers outside these hooks, other SDK boundaries and full
repository acceptance evidence. The overall 100% type-safety goal remains
unfinished.

## Realtime Authentication Revisions

Intent: make realtime ownership follow same-provider authentication transitions
without exposing mutable session internals or changing credential schemas.

```gherkin
Scenario: Authentication starts
  Given a live subscription or pending publication
  When a validated session-changing action starts on the same auth provider
  Then old callbacks and completions become inactive immediately
  And new realtime work waits for a confirmed usable session

Scenario: Authentication settles
  Given a suspended realtime scope
  When login or a current authenticated check confirms access
  Then a new subscription may start
  But confirmed logout or uncertain outcomes do not restore access

Scenario: Rejected and superseded actions
  Given overlapping authentication operations
  When an older operation finishes or a newer operation rejects
  Then an unconfirmed older session cannot be revived

Scenario: Provider isolation
  Given independent authentication providers
  When one provider changes session
  Then the other provider's subscriptions and publications remain active
```

The existing provider-scoped auth session now also tracks a realtime revision,
access state and outstanding session-changing requests. Consumers receive only
a frozen capability snapshot with a currentness check, not a mutable session
or revision handle. Realtime subscriptions and publication capture this
snapshot in addition to their existing provider/tenant/router ownership.

Validated login, logout, registration, password, identity and profile mutations
suspend realtime access before dispatch. Invalid preflight and forgot-password
requests do not change session ownership. Confirmed login may restore access;
confirmed logout remains signed out. Other successful account operations do
not, by themselves, turn a previously signed-out or uncertain state into an
authenticated session. A validated rejection may restore a previously settled
state, but malformed receipts and transport exceptions leave access uncertain
until a current check or later login establishes it.

Overlapping requests are tracked until their actual provider promises settle.
A newer successful login cannot grant realtime access while an older logout
can still finish. When an obsolete request finishes last, the effective remote
session remains uncertain rather than automatically restoring an earlier ready
state. A newer rejection also cannot revive an unresolved older request.
Error-handler-driven logout participates in the same revision and in-flight
tracking as ordinary auth mutations.

Checked authentication refreshes can suspend or restore realtime access, but
checks started before a newer revision, checks during outstanding changes and
invalid/failing checks cannot grant access. The check hook does not subscribe
its own fetching effect to realtime revisions, avoiding a refetch loop.
This concerns core hook-driven checks and actions; it does not detect arbitrary
out-of-band SDK or external cookie/token changes on its own.

Old live callbacks are invalid immediately, including when an event observer
starts login before global observers or cache invalidation run. Saved
publications remain obsolete even after the same provider becomes usable again.
All mounted trees sharing an auth instance follow its transition; distinct
auth instances remain isolated. Resetting the auth registry invalidates old
capability snapshots by session identity as well as revision.

Verification: `hook-utils.test.svelte.ts` passes 89 checks. The same focused
compiler now includes the modified auth module and typed mounted auth controls,
with negative fixtures for immutable capabilities and private session state.
The added tests exercise all session-changing actions, rejection/uncertainty,
both concurrent completion orders, auth-error logout, checked recovery,
same-instance trees, independent providers and pending publication.
No other test file, full auth suite, repository-wide check, build or hosted
authentication service test was run. Scoped tracked/new-file whitespace checks
pass. Existing localStorage and missing svelte2tsx source-map warnings remain
non-fatal. No commit, push or deployment was performed.

Remaining work includes revision-aware ownership in other originating
read/write operations and their auth-error delegation, direct provider/SDK
consumers, external session-change integration and the full repository
acceptance audit. The overall 100% type-safety goal remains unfinished.

## Ordinary Read Authentication Ownership

Scope: list, one and many queries, including delegated show/table reads.
No unrelated provider migration or repository-wide completion claim.

```gherkin
Scenario: Session changes while a read is pending
  Given a request dispatched by an earlier authentication session
  When login or logout starts on the same auth provider
  Then its late data and errors cannot enter the current view or auth handler

Scenario: Cached and imperative results
  Given a successful read and a saved refetch function
  When the authentication revision changes
  Then the old view becomes pending without data and the saved refetch cannot dispatch

Scenario: Independent sessions
  Given a shared data provider and query client
  When different auth providers request the same record
  Then their caches remain separate while the same auth session still deduplicates

Scenario: Observer isolation
  Given a checked read result
  When a notification mutates its copy or starts login
  Then it cannot corrupt cached data or emit a notification into the newer session
```

List, one and many reads now use `createSessionQuery`; show and table inherit
the same behavior. Their existing source/contract/tenant cache descriptor also
contains a non-sensitive authentication session discriminator. The discriminator
is stable for the same provider and revision, distinct for independent providers,
and cannot collide with a replacement session after resetting the registry.
Capabilities remain frozen and do not expose mutable session state.

Requests check their originating auth capability before dispatch and after
settlement. Late successes and failures from obsolete sessions cannot become
current data or reach the new session's auth handler. Non-auth changes preserve
the established behavior of allowing detached responses into their old cache.
The result projection masks stale observer state immediately, preserves the
pending/success/loading-error/refetch-error discriminants, and returns detached
data and sanitized error copies. Saved refetch functions remain obsolete after
recovery; pending refetches cannot return an earlier session's data.

Notification receipts are snapshotted and validated before delivery. Observers
receive separate copies and cannot corrupt cached records, error objects, or
another observer's input. Receipt getters are rejected without execution;
callbacks that start login cannot send their old notification into the new
session. Auth-error delegation retains its originating capability through
asynchronous handling and can hand ownership to its own validated logout.
A failed query-triggered logout leaves access uncertain rather than entering
an unauthorized-read/logout retry loop.

Focused tests exposed a lazily allocated auth-state subscription gap; the
provider-scoped capability now uses a Svelte subscriber to notify existing
readers even when its session was first allocated inside a derived expression.
Logout preserves query caches tagged with a different auth owner. Untagged
query caches and mutation caches still receive conservative eviction because
their authentication ownership is not yet established.

Verification: `query-source.test.svelte.ts` passes 99 checks, including scoped
strict TypeScript diagnostics for the changed reader/auth modules, new query
boundary, typed fixtures, test source and compiled mounted host/probe.
The original provider-source tests remain passing. This is not a whole-program
type check: diagnostics are collected for the explicit source roots only.
No other test file, full suite, build, real authentication service or browser
network integration was run. Scoped whitespace checks pass for all nine changed
paths, including tracked and untracked files. Existing localStorage and missing svelte2tsx
source-map warnings remain non-fatal.

Remaining work includes originating write operations, other query families,
session-aware explicit/live invalidation matching, untagged caches, direct
provider/SDK consumers, external session-change integration and repository-wide
acceptance evidence. This round does not establish the overall 100% goal.
No commit, push or deployment was performed.

## Selection Authentication Ownership

Scope: the contract-bound select list, default-record backfill, mapper projection
and debounced search. Exact refresh matching depends on completing ownership
for the remaining query families; this round does not introduce a permissive
refresh fallback or claim that migration is complete.

```gherkin
Scenario: Two selector request families
  Given a select list and default-record backfill started by the current session
  When authentication changes before either request finishes
  Then neither old response nor old error can enter the new selector or auth handler

Scenario: Cached options and mapping
  Given checked options cached in a selector
  When login starts or a mapper starts a session change
  Then old options disappear immediately and subsequent old mappers cannot execute

Scenario: Search ownership
  Given a debounced search scheduled by one authentication session
  When that session changes or the selector unmounts
  Then its search callback and provider request cannot execute later

Scenario: Detached projections
  Given consumers or notification observers receive records and mapped options
  When they mutate those returned values
  Then later selector reads and cached records remain unchanged
```

Both select request families now use `createSessionQuery` and carry the same
provider-scoped auth discriminator as ordinary reads. Default-record backfill
is covered independently from the list, including pending requests, saved
refetch functions, signed-out access and registry replacement. Checked records
remain in the query cache; observer-specific mapped options are not stored as
shared cache data.

The session query boundary now supports a separately typed checked projection
without weakening its pending/success/error discriminants. Projection runs
outside reactive dependency tracking, and currentness is checked again after
user mapping. The mapper pipeline checks ownership between label and value
callbacks and between records. A callback that starts login cannot expose its
old result or run the remaining old callbacks.

Mapped options and failed mappings are memoized by raw cache value and its
write counter, while returned records/options remain detached. Ordinary state
reads do not rerun user mappers. An explicit refetch can retry a failed mapper
even when structural sharing keeps the raw data object unchanged. Changing a
mapper still updates the projection without fetching another provider result.
Notifications now use the shared checked/sanitized path; errors from both
selector families remain statically unknown rather than claiming that arbitrary
provider exceptions are Error instances.

Debounced searches belong to the captured auth/source/contract scope and are
canceled when that scope changes or the selector unmounts. Signed-out searches
cannot invoke user search callbacks, and callbacks that initiate login cannot
dispatch their old filters. Returned merged options are independent copies,
not mutable references into a memoized option array.

Verification: `select-contract.test.svelte.ts` passes 47 checks, including
strict diagnostics for the changed core boundaries, the standard-reader
consumer/type fixture, selector fixtures, test source and virtual Svelte
host/probe/Combobox consumer. The original selector behavior checks remain
passing with the intended sanitized-error contract. Mounted DOM tests confirm
that another tree's logout removes old selected labels and dropdown options.
This is one focused test file, not a full suite or whole-program type check.
No real browser/network integration, build, commit, push or deployment was
performed. The missing svelte2tsx source-map warning remains non-fatal.
Scoped tracked/new-file whitespace checks pass for all nine touched paths.

Remaining dependencies include infinite-list ownership before exact
session-aware explicit/live refresh matching, other query families and writes,
direct provider/SDK consumers, external auth changes, and repository-wide
acceptance evidence. The overall 100% type-safety goal is still incomplete.

## Infinite Read Authentication Ownership

Scope: infinite-list cache ownership, page protocol, pagination operations and
shared session lifecycle. Public hooks continue to use the installed TanStack
pagination engine; no replacement paging engine or broad repository rewrite.

```gherkin
Scenario: Existing pages
  Given a successful infinite list
  When the authentication session changes
  Then cached pages and next/previous page availability disappear immediately

Scenario: Pending page and refresh operations
  Given a first-page, next-page or refetch request from one session
  When authentication changes before its response
  Then old data and errors cannot reach the new session or its auth handler

Scenario: Checked page protocol
  Given an external page number or a cached page collection
  When it violates the positive consecutive page protocol
  Then it cannot be dispatched or exposed as a checked page result

Scenario: Independent copies
  Given consumers or observers receive pages and page parameters
  When they mutate those copies
  Then cached pages, later reads and pagination state remain unchanged
```

The infinite reader now lives in `infinite-query.svelte.ts`, retaining its
existing hook exports through `hooks.svelte.ts`. It uses the installed
TanStack infinite-query engine with checked positive safe-integer page numbers,
validated ordinal page collections and detached records/page parameters.
An empty final page stops further pagination even when the provider's total
is stale and positive. This API remains forward ordinal pagination; previous
page methods are guarded but do not invent a backward pagination protocol.

Shared session capture, request checks, notification delivery, auth-error
ownership, pending state and result reflection were extracted from the
ordinary reader into `query-session.svelte.ts`. Ordinary reads and selector
projections still use this same lifecycle. Infinite caches now carry the auth
discriminator, and first-page, next-page and refetch requests check their
originating session before dispatch and after settlement. Saved refetch,
next-page and previous-page operations cannot resume after their session
changes or their reader unmounts.

Inspection of the installed TanStack implementation confirmed a declaration
mismatch: a next-page error can retain data with `isRefetchError: false`,
although the installed result union does not describe that combination
accurately. The core boundary now exposes an explicit `InfiniteListResult`
union for pending, success, first-load errors, cached-data refetch errors and
cached-data paging errors. It validates pagination flags and normalizes the
correlated fields without asserting the native result to be a stronger type.
Strict negative fixtures require narrowing before using data after an initial
page failure and retain concrete record/page-number types after success.

Late responses cannot append old pages to the new session. Existing old-cache
pages may remain under their old auth key, but late page data never joins them;
non-auth source/resource/tenant changes retain the prior isolated-cache
behavior. Current auth-error handling can complete its own checked logout,
whereas obsolete instructions cannot log out a newer session. Failed
query-triggered logout remains suspended rather than looping unauthorized
reads. Notification and caller copies cannot corrupt the cached page collection.

Verification: `infinite-contract.test.svelte.ts` passes 52 checks. This includes
scoped strict compiler diagnostics for the new reader/lifecycle, ordinary and
selector consumers, concrete/negative type fixtures and virtual Svelte hosts
and UI consumers. Mounted regression tests cover ordinary and selected readers
after the shared extraction, and the InfiniteList consumer removes rendered
pages after another tree logs out of their shared session.
Only this single test file ran; the prior ordinary/selector test suites were
not rerun. No full suite, whole-program compiler audit, build, real browser or
network-service integration ran. The missing svelte2tsx source-map warning
remains non-fatal. Scoped tracked/new-file whitespace checks pass for all ten
touched paths.

Remaining work includes exact session-aware explicit/live refresh matching,
other query families and originating writes, untagged caches, direct SDK
consumers, out-of-band auth changes and repository-wide acceptance evidence.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Session-Owned Refresh

Scope: contract-bound explicit invalidation and automatic live invalidation,
now that ordinary, selected and infinite readers carry auth ownership.

```gherkin
Scenario: Exact ownership
  Given caches with identical resource, tenant, contract and provider route
  When one session requests explicit or live refresh
  Then only its exact raw source and auth revision may be invalidated

Scenario: No inferred owner
  Given untagged, malformed or accessor-backed query keys
  When refresh searches for matching data
  Then it neither assigns an owner nor executes submitted getters

Scenario: Reentrant changes
  Given several matching queries awaiting refresh
  When the first invalidation changes the current session or target
  Then no remaining old query is dispatched

Scenario: Settled completion
  Given matching refresh requests are in flight
  When one fails or the originating session becomes obsolete
  Then explicit refresh awaits all started requests and returns a sanitized failure
```

Explicit and automatic live refresh now share `query-invalidation.ts`.
Selection requires exact source and auth-revision ownership in addition to the
resource, contract, tenant and provider route. All six migrated data actions
are supported: list, one, many, select, selectDefaults and infiniteList.
Untagged, source-only, foreign-session, malformed and accessor-backed keys do
not acquire inferred ownership. Submitted key and owner getters are not run.

The legacy unscoped `hooks.svelte.ts` invalidator was removed. The public
contract-bound hook retains checked identifiers and closed scopes, including
false/empty no-ops. It captures the session when invoked, allowing a later
invocation after checked login without reviving a previously started request.
Signed-out and disposed invocations cannot refresh data.

Dispatch checks currentness for each selected query and inside its matching
predicate. Reentrant auth, tenant, contract, source, resolved provider-route
changes or unmount stop remaining dispatches. A route change still supersedes
the request when both route names point to the same raw provider. All started
invalidations settle before completion; obsolete requests return
`REFRESH_SUPERSEDED`, and other failures return sanitized `REFRESH_FAILED`.
Live refresh observes rejected promises without leaking unhandled rejections.

Verification (2026-09-10): `hook-utils.test.svelte.ts` passes 118 checks,
including scoped strict compiler diagnostics and negative contract fixtures.
Mounted list/one/many/infinite readers perform actual provider reads after
explicit and live refresh. Shared-client/shared-source trees with independent
auth providers remain isolated. Tests also cover post-login old-cache
rehydration, getters, scope/id selection, reentrant transitions and waiting for
every started request after synchronous/asynchronous failures.
Scoped tracked/new-file whitespace checks pass for all nine touched paths.
Only this single test file ran. No full suite, repository-wide compiler audit,
build, browser or remote integration ran. Existing localStorage and missing
svelte2tsx source-map warnings remain non-fatal.

Remaining work includes originating writes and their cache updates/refreshes,
other query families and untagged producers, direct SDK consumers, out-of-band
auth changes and repository-wide acceptance evidence. This refresh change
does not migrate legacy mutation invalidation or claim those boundaries are
session-safe. The overall 100% goal remains unfinished.
No commit, push or deployment was performed.

## Session-Owned Single Creation

Intent: keep a single create request, its public state and downstream effects
owned by the authentication revision that accepted the validated input.
This checkpoint covers the single-create hook and its immediate audit/refresh
boundaries; other write families remain separate unfinished work.

```gherkin
Scenario: Dispatch ownership
  Given a queued create or a suspended authentication session
  When its originating auth revision is no longer available
  Then no provider write starts and a later login cannot revive that invocation

Scenario: Obsolete receipt
  Given a dispatched create that may already have committed
  When authentication changes before its receipt settles
  Then the caller receives sanitized uncertainty without the old record
  And no audit, live event, cache refresh or completion observer reaches the new session

Scenario: Owned effects
  Given a checked create receipt and matching cache entries
  When an observer changes authentication during completion
  Then every later effect rechecks ownership and foreign-session caches remain untouched

Scenario: Public state and auth delegation
  Given create state or a checked authentication-error delegate
  When the session changes or the delegate starts its own logout
  Then old public state disappears immediately
  And only the current delegate may complete its own logout and navigation
```

Single creation now captures a frozen auth capability before queued dispatch.
Signatures include its revision, so a new-session call cannot join an older
pending write. Session-changing actions block queued requests immediately;
checked auth reads revoke ownership when their validated result changes the
revision, not merely when the check starts.

Every returned receipt and final caller handoff checks session ownership.
Late successes/failures return `CREATE_CANCELLED` with accurate
`writeMayHaveSucceeded` and without an old-session record. Dispatch is tracked
explicitly rather than inferred from errors. The last handoff also covers waits
inside native mutation-cache callbacks. A potentially committed operation is
never described as rolled back. Non-auth target changes retain checked recovery
records and isolated old-source refresh behavior while their session is valid.

Create-driven refresh uses the shared exact source/auth matcher for list,
infiniteList, many, select, selectDefaults and supplied/checked detail IDs.
Untagged and foreign-session entries are excluded, and all started refreshes
settle. Audit, live delivery, notifications and individual hook observers
recheck ownership between sinks, including synchronous reentrant login.
`auditWithProvider` accepts a currentness guard so its local handler cannot
start login and then dispatch the old audit to a new-session provider.

The public mutation view reflects an explicit idle branch immediately when its
origin is obsolete, including spread/property-descriptor reads; data, variables
and errors cannot outlive their session. Internal invocation envelopes are
frozen to prevent Svelte's nested proxies from changing identity comparisons.
Detached results, errors and joined callbacks retain their schema-derived types.

Auth-error delegation carries the originating capability and a separate
invocation token. Its own checked logout can complete despite retiring the
public mutation state, whereas reset, replacement and newer calls still retire
the delegate. A rejected logout keeps writes suspended. If that logout changes
the revision before final caller delivery, the create reports cancellation with
write uncertainty, not a stale successful result.

Verification (2026-09-10): `create-contract.test.svelte.ts` passes 90 checks,
including scoped strict compiler diagnostics for the changed hook/audit/refresh
boundaries, mounted fixtures and public positive/negative types. The imported
unregistered-resource fixture now rejects the already-removed unsafe form hook
instead of claiming that the obsolete export still exists.
Scoped tracked/new-file whitespace checks pass for all nine touched paths.
Only this one test file ran; no full suite, whole-program compiler audit, build,
browser or remote service verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal.

Remaining work includes other originating writes (single update/delete, bulk
writes, form/import flows), their cache mutations, other query families and
untagged producers, direct SDK/QueryClient/global-cache callbacks, out-of-band
auth changes and repository-wide acceptance. This hook does not sandbox native
cache plugins or establish backend authorization. The overall 100% goal remains
unfinished. No commit, push or deployment was performed.

## Session-Owned Single Update

Intent: keep a typed single-record update and its inline editor owned by the
auth revision that accepted the input. Existing ID and receipt validation
remain mandatory; no legacy update entry point is restored.

```gherkin
Scenario: Queued or unavailable session
  Given an update queued before dispatch or invoked without a usable session
  When its originating authentication revision changes
  Then it never dispatches and later login cannot revive the old invocation

Scenario: Dispatched update
  Given an update whose write may already have committed
  When authentication changes before receipt or final caller delivery
  Then old records and errors cannot reach the new session
  And cancellation preserves the checked requested ID and actual dispatch uncertainty

Scenario: Per-effect ownership
  Given a checked update and several owned cache entries or observers
  When a completion sink starts another login
  Then later sinks stop and foreign or untagged caches remain untouched

Scenario: State and delegation
  Given retained update state or a pending auth-error instruction
  When its session changes
  Then public state becomes idle and stale instructions cannot log out a newer session
  And a current delegate may still finish its own checked logout

Scenario: Inline editing
  Given an unsaved draft or pending inline save
  When another component changes the shared authentication session
  Then the old editor closes and cannot submit, report completion or restore its draft
```

Single updates now capture the originating auth capability, checked record ID
and invocation token before queued dispatch. Deduplication includes the auth
revision, preventing a new-session update from joining an unresolved old write
to the same ID. Unavailable sessions cannot dispatch; a saved mutation method
can be invoked again after recovery without reviving the prior invocation.

Receipt validation and final caller delivery recheck the session. Late success
or failure reports `UPDATE_CANCELLED` with the checked requested ID and explicit
dispatch tracking, without an old-session `updated` record. Native mutation-cache
callback delays are included in the final handoff check. Non-auth target changes
retain their prior checked recovery behavior while the originating auth remains
valid; already dispatched writes are never described as rolled back.

Update-driven invalidation uses the shared exact source/auth matcher for all
six migrated data-query actions, with strict typed detail-ID matching.
Untagged/source-only and foreign-session caches remain untouched, and completion
awaits all started refreshes. Audit, live delivery, notifications, regular and
joined observers recheck ownership between sinks. Public mutation state exposes
the fully correlated idle branch immediately when obsolete, including reflective
reads. Frozen invocation envelopes preserve identity through Svelte projection.

Auth-error delegation retains its independent invocation token and captured
capability. Its own checked logout may finish after the old public mutation
state disappears, but a newer login, reset or replacement suppresses stale
instructions. Rejected logout leaves writes suspended.

The public `captureAuthSession` export aliases the existing frozen capability
reader; it exposes availability, a non-sensitive cache discriminator and
currentness, not mutable auth internals or backend authorization. InlineEdit
uses it to retire editing scope, erase its draft, stop old save/blur events and
hide errors when the session changes. Late save results cannot call `onSave`
or reopen the editor, including logout initiated by another mounted component.
Reopening after checked login starts from the current input prop, not the old
draft. This does not validate or authorize parent-supplied display values.

Verification (2026-09-10): `update-contract.test.svelte.ts` passes 104 checks.
Coverage includes scoped strict compiler diagnostics for the changed hook,
public export, InlineEdit and mounted fixtures; negative fixtures preserve
record/ID typing, idle-state discrimination and read-only session capabilities.
Mounted tests exercise queued/native-delayed dispatch, native completion delays,
reentrant sinks, shared versus independent auth trees, checked logout delegation,
all-started refresh settlement, and draft/pending-save retirement.
The cross-component logout tests retain and await the actual pending mutation
objects even after logout removes them from the cache.
Scoped tracked/new-file whitespace checks pass for all nine touched paths.

Only this one test file ran; no full suite, whole-program compiler audit, build,
browser or remote service verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal.

Remaining work includes single deletion, bulk writes, form/import workflows,
their cache mutations, other query families and untagged producers, direct
SDK/QueryClient/global-cache callbacks, out-of-band auth changes and full
repository acceptance. The overall 100% goal remains unfinished.
No commit, push or deployment was performed.

## Session-Owned Single Deletion

Intent: bind single deletion, its undo window, confirmed cache removal and
DeleteButton confirmation to the authentication revision that owns the request.

```gherkin
Scenario: Queued and undoable deletion
  Given a queued delete or an open undo window
  When its originating authentication session changes
  Then the request is cancelled before dispatch and its own undo toast is removed
  And saved timeout or undo callbacks cannot revive it after login

Scenario: Dispatched deletion
  Given a delete whose server-side outcome may already be committed
  When authentication changes before receipt or final caller delivery
  Then the checked ID and actual dispatch uncertainty are retained
  And old records, errors and completion effects cannot enter the new session

Scenario: Exact cache ownership
  Given matching details and collections belonging to different sessions
  When a checked delete completes or cache callbacks change session mid-cleanup
  Then only current owned details are removed and later old operations stop
  And uncertain receipts never authorize removal

Scenario: State and auth delegation
  Given retained deletion state or an auth-error delegate
  When the session is retired or its own checked logout begins
  Then public state is immediately idle while only the current delegate may finish

Scenario: Delete confirmation
  Given a confirming, failed, waiting or pending delete button
  When another component changes their shared login session
  Then old confirmation and feedback disappear and no old callback can confirm deletion
```

Single deletion now captures the originating auth capability, checked record ID,
invocation token and dispatch state before native mutation scheduling.
Deduplication includes the auth revision. Queued requests and undo windows retire
when their session changes; saved undo or timeout callbacks cannot revive them.
Receipt and final caller delivery checks return `DELETE_CANCELLED` with the
checked ID and actual write uncertainty, without old-session `deleted` records.
Already dispatched writes are not described as rolled back.

Confirmed detail removal uses exact source/auth/contract/tenant/provider and ID
ownership, rechecking between individual removals because cache callbacks may
change session. Uncertain receipts cannot remove details. Collection and detail
invalidation retain the same ownership checks and await all started refreshes.
Checked recovery and old-source cleanup remain available for non-auth target
changes while their originating session is current.

Audit, live publication, notifications and regular or joined observers recheck
ownership between sinks. Obsolete public mutation state immediately exposes the
correlated idle branch, including reflective reads. Frozen invocation envelopes
preserve identity through Svelte projection. A current auth-error delegate may
finish its own checked logout; newer login, reset or replacement suppresses stale
instructions.

DeleteButton binds confirmation and pending feedback to the originating session.
Opening confirmation and confirming deletion use separate handlers, so old DOM
events cannot confirm a new session's deletion. Hook enablement uses resource
permissions separately from UI session availability, allowing its own checked
logout to finish navigating after the button hides. Signed-out users still
cannot dispatch, and permission changes still retire pending undo windows.

Verification (2026-09-10): `delete-contract.test.svelte.ts` passes 119 checks.
This includes scoped strict compiler diagnostics for the deletion boundary,
button and mounted fixtures, plus negative API and idle-state fixtures.
Mounted coverage includes queued/native-delayed dispatch and delivery, undo
retirement, reentrant removal and completion sinks, shared versus independent
auth trees, exact cache isolation, checked logout delegation, fresh confirmation,
and all-started refresh settlement.
Scoped tracked/new-file whitespace checks pass for all eight touched paths.

Only this one test file ran; no full suite, whole-program compiler audit, build,
browser or remote service verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal.

Remaining work includes bulk writes, form/import workflows, their cache
mutations, other query families and untagged producers, direct
SDK/QueryClient/global-cache callbacks, out-of-band auth changes and full
repository acceptance. These frontend boundaries do not establish backend
authorization or sandbox native cache plugins. The overall 100% goal remains
unfinished. No commit, push or deployment was performed.

## Session-Owned Batch Creation

Intent: preserve checked batch progress without exposing old-session records or
continuing sequential writes after their originating authentication retires.

```gherkin
Scenario: Queued and sequential dispatch
  Given a queued native batch or a sequential fallback with remaining inputs
  When its originating authentication revision changes
  Then no remaining writes dispatch and only actually attempted indexes are reported

Scenario: Partial receipts and final delivery
  Given native or partial creation results waiting for receipt or final handoff
  When another login or logout retires the originating session
  Then callers receive cancellation without old records or partial error payloads
  And already dispatched writes remain explicitly uncertain

Scenario: Owned completion effects
  Given multiple audit entries, cache refreshes or completion observers
  When a sink changes the authentication session
  Then subsequent old-session effects stop and every started refresh settles
  And foreign-session and untagged cache entries remain untouched

Scenario: Public state and auth delegation
  Given retained batch state or a checked auth-error instruction
  When the session changes
  Then public state is immediately idle and stale instructions cannot affect a newer login
  And only the current delegate may finish its own checked logout
```

Batch creation now captures the originating auth capability and invocation token
before native mutation scheduling, and deduplication includes the auth revision.
Native batches and sequential fallback requests recheck session ownership before
dispatch and after receipt. Sequential fallback stops before the next item when
its session retires.

A private progress object retains actual attempted indexes, checked successes and
completed failures through native callback delays and joined caller delivery.
`CREATE_MANY_CANCELLED` reports dispatch uncertainty and attempted/unattempted
indexes without old-session `succeeded` records or partial-error causes. An
in-flight item is not declared failed solely because its session changed.
Non-auth target changes retain checked recovery records while the original
session is current. No dispatched write is represented as rolled back.

Collection refreshes and each known detail ID use exact source/auth/contract/
tenant/provider ownership. Source-only, foreign-session and unknown-ID keys
remain untouched. All started collection and detail refreshes settle even after
an early failure or reentrant login. Each audit entry, provider audit sink, live
publication, notification and completion observer checks ownership again.

Public batch state immediately exposes the correlated idle branch when retired,
including spread and property-descriptor reads. Frozen invocation envelopes
preserve scope/token identity. Current auth-error delegates can complete their
own checked logout and owned query cleanup; newer login or reset suppresses
stale navigation and cleanup. If an older remote logout finishes after a newer
login, existing auth uncertainty continues blocking batch writes until a checked
authentication result restores availability.

Verification (2026-09-10): `create-many-contract.test.svelte.ts` passes 112 checks,
up from the 58-check baseline. This includes scoped strict compiler diagnostics,
negative input/receipt/idle-state fixtures, queued and sequential retirement,
native completion delays, partial-error isolation, per-sink reentrancy,
independent/shared auth trees, checked logout cleanup, and out-of-order auth
recovery. Only this one test file ran; no full suite, whole-program compiler
audit, build, browser or remote service verification ran. The existing missing
svelte2tsx source-map warning remains non-fatal.
Scoped new-file whitespace checks pass for all seven touched paths.

Remaining work includes batch update/delete, form/import workflows, other cache
mutations/query families and untagged producers, direct SDK/QueryClient/global
cache callbacks, out-of-band auth integration and full repository acceptance.
These frontend checks do not prove backend authorization or sandbox native
cache plugins. The overall 100% goal remains unfinished.
No commit, push or deployment was performed.

## Session-Owned Batch Update

Intent: update only the checked identities belonging to the originating
authentication revision and preserve accurate progress without stale records.

```gherkin
Scenario: Native and sequential dispatch
  Given a queued batch or a fallback update with remaining IDs
  When its originating authentication revision retires
  Then no remaining updates dispatch and cancellation reports only attempted IDs
  And an in-flight ID is not reported as failed merely because the session changed

Scenario: Delayed result delivery
  Given success, partial failure or cancellation waiting in native callbacks
  When a newer login or logout completes before final caller delivery
  Then old records and partial failure payloads are withheld
  And obsolete mutation state immediately becomes idle

Scenario: Joined callers and completion sinks
  Given multiple callers or audit, live, refresh and notification sinks
  When an earlier sink changes the authentication session
  Then later old-session callbacks stop and every started refresh settles
  And each still-current joined caller receives its own detached result or error

Scenario: Auth-error delegation
  Given an auth failure among successful or failed fallback updates
  When its current checked instruction requests logout
  Then only the current delegate may complete its logout and owned cleanup
  And reset, replacement or a newer login suppresses stale instructions
```

Batch updates now capture the originating auth capability and invocation token
before native mutation scheduling. Deduplication includes the auth revision.
Native and sequential fallback dispatch recheck ownership before requests and
after receipts, stopping remaining updates when the originating session retires.
Private, schema-typed progress retains actually attempted, successful and failed
IDs through native callback delays and final caller delivery.

`UPDATE_MANY_CANCELLED` retains dispatch uncertainty and attempted/unattempted IDs
without obsolete success records, partial-error causes or old-session
`succeededIds`. An in-flight ID is not classified as failed solely because its
session changes. Source-only replacement can refresh the old owned source and
retain checked recovery IDs while that session is still current. When mounted
auth controls recheck identity after provider replacement, that new revision
instead retires old-source cleanup. No dispatched write is claimed rolled back.

Collection refreshes and each attempted detail ID use exact source/auth/contract/
tenant/provider ownership; untagged and foreign-session queries do not acquire
inferred invalidation ownership. All started collection/detail refreshes settle
despite early failures or reentrant session changes. Every audit entry and sink,
live publication, notification and completion observer rechecks ownership.

Coalesced callers now receive their own callbacks and detached results/errors.
Joined observers stop after reentrant session retirement, including partial-error
delivery. Obsolete public state immediately exposes the correlated idle branch,
also through spread and descriptor reads. Frozen invocation envelopes preserve
scope/token identity through Svelte projection.

Fallback auth causes are selected independently of the returned batch error,
including a later 401/403 when earlier items failed differently. Auth handlers
receive a detached sanitized cause, not the mutable partial error. A current
delegate can finish its own checked logout and conservative auth-query cleanup
while preserving queries tagged to independent auth trees. New login, reset or
replacement suppresses stale instructions. Out-of-order remote logout retains
auth uncertainty and blocks updates until identity is checked again.

Verification (2026-09-10): `update-many-contract.test.svelte.ts` passes 119 checks,
up from the 55-check baseline. Coverage includes scoped strict compiler
diagnostics, negative ID/payload/receipt/idle fixtures, native and sequential
retirement, delayed native handoffs, partial progress, per-sink reentrancy,
joined callback isolation, shared/independent auth trees, checked delegation,
out-of-order auth recovery and source-only versus auth-rechecked replacement.
Scoped new-file whitespace checks pass for all seven touched paths.
Only this one test file ran; no full suite, whole-program compiler audit, build,
browser or remote service verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal.

Remaining work includes batch deletion, form/import workflows, other cache
mutations/query families and untagged producers, direct SDK/QueryClient/global
cache callbacks, out-of-band auth integration and full repository acceptance.
These checks do not prove backend authorization or sandbox native cache plugins.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Session-Owned Batch Deletion

Intent: bind batch deletion, checked progress and destructive cache cleanup to
the originating authentication revision.

```gherkin
Scenario: Queued and sequential deletion
  Given a queued native batch or remaining fallback IDs
  When its originating authentication revision retires
  Then no remaining deletion dispatches and only attempted IDs are reported
  And session retirement alone cannot classify an in-flight ID as failed

Scenario: Destructive cache cleanup
  Given checked successes and uncertain failures across owned and foreign caches
  When deletion finishes or a removal callback changes authentication
  Then only confirmed owned details are removed and subsequent stale removals stop
  And uncertain details are refreshed without being removed

Scenario: Final delivery and observers
  Given partial results or successful receipts waiting in native callbacks
  When their session changes before final delivery
  Then old records and partial errors cannot reach callers or public state
  And current joined callers otherwise receive detached callbacks and results

Scenario: Checked completion ownership
  Given audit, live, notification, refresh or auth-error completion
  When a prior sink starts another login or a caller resets the operation
  Then later stale effects stop while all already-started refreshes settle
  And only the current delegate may complete its own checked logout
```

Batch deletion now captures the originating auth capability and invocation token
before queued mutation work; deduplication includes the auth revision. Native
and sequential fallback requests recheck ownership before dispatch and after
receipt. Schema-typed progress retains requested, attempted, completed-failure
and unattempted IDs through native callback delays and final caller delivery.
Session retirement alone does not classify an in-flight ID as failed.

`DELETE_MANY_CANCELLED` retains actual dispatch uncertainty without old-session
records, partial-error payloads or `succeededIds`. Queued invalid-input observers
also retire with their origin. Obsolete public state exposes the correlated idle
branch immediately, including reflective reads. Frozen invocation envelopes
preserve scope/token identity through Svelte projection.

Confirmed detail cleanup uses exact source/auth/contract/tenant/provider and
typed ID ownership. Details are removed individually, with ownership rechecked
for each predicate and after reentrant removal callbacks. Remaining copies of
the same record and subsequent record IDs stay untouched after session change.
Uncertain receipts never authorize removal. Collections and attempted details
use the shared owned invalidation matcher and await every started refresh even
after another refresh fails or authentication changes. Cache-removal failures
cannot change a checked provider write into a claimed server failure.

Audit entries and their sinks, live publication, notifications and regular or
joined completion observers recheck ownership between calls. Coalesced callers
now receive independent callbacks and detached success/partial/failure results.
Non-auth target changes can still clean up the original owned source and return
checked recovery IDs while its session is current, without invoking obsolete
caller callbacks. When mounted auth controls recheck after provider replacement,
the newer revision instead retires that old cleanup. No dispatched deletion is
described as rolled back.

Auth-error delegation selects a sanitized auth cause even when earlier fallback
failures were unrelated and every deletion failed. A current delegate may finish
its own checked logout and conservative auth-query cleanup, preserving queries
tagged to an independent auth tree. New login, reset or replacement suppresses
obsolete instructions. An older remote logout finishing last retains auth
uncertainty until a checked identity result restores availability.

Verification (2026-09-10): `delete-many-contract.test.svelte.ts` passes 123 checks,
up from the 58-check baseline. Coverage includes scoped strict compiler
diagnostics and negative ID/payload/receipt/idle fixtures, queued and sequential
retirement, partial progress, native handoff delays, per-sink reentrancy,
confirmed removal versus uncertain refresh, joined callback isolation,
shared/independent auth trees, delegated logout, and source-only versus
auth-rechecked replacement. Only this one test file ran; no full suite,
whole-program compiler audit, build, browser or remote verification ran.
The existing missing svelte2tsx source-map warning remains non-fatal.
Scoped new-file whitespace checks pass for all seven touched paths.

Remaining work includes form/import workflows, other cache mutations/query
families and untagged producers, direct SDK/QueryClient/global cache callbacks,
out-of-band auth integration and full repository acceptance. These checks do
not prove backend authorization or sandbox native cache plugins.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Form Session Ownership

```gherkin
Scenario: Retire drafts and reads
  Given an editable form with loaded values, errors or unsaved changes
  When the same auth provider starts a new login or logout
  Then old values and errors disappear immediately and unavailable sessions cannot edit or refetch
  And a restored session loads only its own record and defaults

Scenario: Retire submitted work
  Given queued, dispatched or joined form submissions
  When their originating session changes before dispatch or final delivery
  Then callers receive FORM_CANCELLED with actual write uncertainty and no old record
  And obsolete audit, live, cache, notification and navigation effects stop

Scenario: Checked completion
  Given a validator or completion observer that changes the form or authentication
  When the observer returns
  Then later state writes and effects recheck ownership
  And only a current auth-error delegate may finish its own checked logout

Scenario: Exact cache ownership and UI callbacks
  Given owned, untagged and foreign-session cache entries or saved UI callbacks
  When a form completes or a saved callback runs after session replacement
  Then refreshes affect only the originating owner and settle all started work
  And obsolete UI callbacks cannot edit, submit or navigate the new session
```

Contract forms now capture the authentication capability separately from the
resource/action/ID/provider/tenant/workflow target. Reads use `authSession`
instead of a provider-object-only tag; result projection checks the exact
current cache entry before exposing or hydrating the native observer result.
Drafts, baselines, errors, taint, pending state and unload guards retire with
the session. Saved refetch callbacks retain their original scope and check it
before and after reactive synchronization and request completion.

Queued, dispatched and coalesced submissions retain actual dispatch state
through final delivery. `FORM_CANCELLED` returns no obsolete record and does
not describe a dispatched request as rolled back. Automatic session retirement
preserves the latest invocation token so a current auth-error delegate can
finish its own checked logout; explicit reset, unmount, target replacement or
another submission retires that delegate.

Cache refreshes use the shared exact source/auth/contract/tenant/provider
matcher and settle every started request. Untagged, source-only, unrelated
detail and foreign-session entries are excluded. Same-session target changes
may still refresh the originating write's owned cache without delivering stale
callbacks. Authentication changes stop later audit, live, refresh, notification,
callback and navigation sinks. Async live failures cannot replace a checked
write receipt. Navigation rechecks ownership after custom route parsing.

Field validation checks draft revision after user validators return, including
validators that reset or edit the draft. Edit options are detached and checked
without executing accessors. Existing partial drafts, typed IDs, field
projection, sanitized server-field errors, detached results, submit coalescing
and reconciliation of edits made during a write remain covered.

AutoForm captures session-owned edit, submit, retry and navigation callbacks
without coupling permission-policy enablement to auth availability. Saved
flat/grouped field callbacks and custom submit actions cannot affect a restored
session. Local errors and unsaved-navigation state reset across session changes.

Verification (2026-09-10): `form-contract.test.svelte.ts` passes 100 checks,
up from the 63-check baseline. Coverage includes scoped strict compiler
diagnostics with `noImplicitOverride` and existing negative type fixtures,
same-provider login/logout, queued/dispatched/joined retirement, delayed reads,
exact cache ownership, independent auth trees sharing a client, all-started
refresh settlement, validation and completion reentrancy, delegated logout,
and real AutoForm callback/permission/error/navigation behavior.
Mounted auth controls may publish a second checked revision; read tests verify
one request per revision rather than conflating those revisions.

Only this one test file ran. No full suite, whole-program compiler audit,
build, browser or remote verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal. Scoped new-file whitespace checks pass
for all seven touched paths.

Remaining work includes import and form workflow wrappers, other cache/query
families and untagged producers, direct SDK/QueryClient/global-cache callbacks,
out-of-band auth integration and full repository acceptance. Backend
authorization and native cache-plugin isolation are not established here.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Import Session Ownership

```gherkin
Scenario: Whole-file preflight ownership
  Given a queued import, delayed file read or custom row mapper
  When its auth session retires before the next stage
  Then no further mapping or write dispatch occurs
  And invalid explicit IDs are rejected before the first write

Scenario: Partial dispatch and final delivery
  Given sequential or native batches and callers selecting the same file
  When their originating session changes during a write or completion callback
  Then every caller receives cancellation with checked attempted and processed counts
  And no obsolete row records, requests or mutable internal state escape

Scenario: Exact cache and completion ownership
  Given owned, untagged and foreign-session cached collections
  When an import settles or authentication changes during refresh
  Then only the originating owner's collections may refresh and all started work settles
  And only a current error delegate may complete its own checked logout

Scenario: File picker ownership
  Given a file picker or handler captured before login or resource replacement
  When the selection arrives after its scope retires
  Then it cannot start an import or clear the current picker
  And a fresh selection remains usable once the checked session is available
```

Imports now capture the auth capability and router alongside their resource,
provider, metadata and tenant target. File reads, row mapping, native and
sequential dispatch, progress observers, completion observers and final caller
delivery recheck that ownership. Whole-file preflight also checks explicit
create IDs against the record identity schema before any write.

Cancellation carries schema-checked total, attempted and processed row counts.
In-flight work whose session retires is not reported as processed or failed;
earlier completed counts remain available without old row records or requests.
No dispatched import is described as rolled back. Same-file calls still share
one import operation but now receive separately checked and detached promises,
records, row requests and errors rather than one mutable shared result.
Public results, errors and read-only progress are detached snapshots; retired
public state becomes idle immediately, including reflective getter reads.

Collection refresh uses the shared exact source/auth/contract/tenant/provider
matcher. Untagged, source-only, foreign-session and detail entries remain
excluded. All started refreshes settle despite sibling failure or session
retirement. Same-session target changes and explicit reset may still refresh
the original owned source; they do not dispatch more rows or deliver obsolete
completion. Refresh failures do not falsify checked provider receipts.

Import failures preserve only sanitized 401/403 status for checked auth-error
delegation. A relevant auth failure is selected even when an earlier row
failed for another reason. Its current delegate can complete its own logout
and auth-query cleanup, while reset, newer import attempts, replacement or
new login retire stale instructions. The public reset operation also clears
progress and invalidates queued or pending import completion.

ImportButton captures picker scope, input identity and selection token.
Inputs are recreated across scope changes, and obsolete event handlers or
finalizers cannot start writes or clear a newer selection. UI availability
includes the checked auth session, independently of permission-policy
enablement passed to the hook, so the UI does not cancel its own logout.

Verification (2026-09-10): `import-contract.test.svelte.ts` passes 86 checks,
up from the 52-check baseline. The file includes scoped strict compiler
diagnostics with `noImplicitOverride`, source-resolved Svelte fixtures and
negative API/progress/ID/payload fixtures. Runtime coverage includes delayed
file reads, mapper reentrancy, sequential and native batch retirement, joined
result isolation, partial counts, exact cache ownership, independent auth
trees sharing a client, all-started refresh settlement, logout delegation,
and real file-picker/permission/re-selection behavior.

Only this single test file ran. No full suite, whole-program compiler audit,
build, browser or remote verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal. Scoped whitespace verification covers
the nine touched paths, including previously untracked files.

Remaining work includes form workflow wrappers, other cache/query families
and untagged producers, direct SDK/QueryClient/global-cache callbacks,
out-of-band auth integration and full repository acceptance. Backend
authorization and native cache-plugin isolation are not established here.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Step Workflow Ownership

```gherkin
Scenario: Step state retirement
  Given a partially completed multi-step form
  When authentication retires or the workflow is explicitly reset
  Then obsolete step state and navigation availability disappear
  And a restored form starts at its configured default step

Scenario: Reentrant validation and error focus
  Given a validator or failed submission that changes the workflow
  When its old navigation or error observer resumes
  Then it cannot move the current workflow or focus obsolete fields

Scenario: Submit result ownership
  Given repeated saves in one workflow
  When the shared write settles or its auth session retires
  Then each caller retains the base form's checked detached result or cancellation
  And the wrapper introduces no additional unchecked result handoff

Scenario: Rendered controls
  Given step fields, buttons or an unsaved-navigation dialog
  When their rendered step or authentication scope retires
  Then old callbacks cannot edit, save, navigate or change the new workflow
  And a current auth-error delegate can still finish its own checked logout
```

The active form wrapper is `useStepsForm`; removed modal/drawer legacy
entry points have not been reintroduced. Step submission now observes errors
without introducing another promise handoff after the base form's final
ownership check. Repeated saves retain one write and independently detached
caller results. The old shared-promise identity assumption has been removed
from the focused regression fixture.

Explicit reset now restores both the draft baseline and configured default
step, retiring pending navigation and error observers. Public current-step
and navigation availability hide obsolete state immediately when the form
is not ready. Validation rechecks an invocation token and captured workflow,
auth and router after custom validators return; a reentrant reset, login or
step change cannot be overwritten by the older navigation request.
Error focus also retains the submission and navigation generation, so a late
rejection cannot move a newly reset or explicitly navigated workflow.
Invalid-layout errors are detached rather than mutable shared instances.

StepsForm captures the rendered step together with auth and target scope
for field edits, step controls, submit events, retry and back actions.
Rendered form and confirmation instances retire with their owners. Deferred
error focus and navigation errors recheck the current auth scope before
touching UI state. A current unsaved confirmation still navigates normally;
old confirmation and save failures cannot affect a restored session.
Workflow retirement does not reset the base form's private submission token,
allowing its own checked auth-error logout delegate to finish.

Verification (2026-09-10): `steps-contract.test.svelte.ts` passes 67 checks.
The initial 45-check run had 44 passing checks and one obsolete shared-promise
identity assertion after the earlier base-form isolation change. The revised
fixture checks one provider write and distinct detached results instead.
Coverage now includes scoped strict compilation with `noImplicitOverride`,
source-resolved Svelte fixtures, negative field/ID/index/readonly-control
cases, same-provider login/logout, delayed edit hydration, queued and joined
submission retirement, reentrant validation, reset/navigation error-focus
ownership, and real StepsForm confirmation, retry, focus and logout behavior.

Only this single test file ran. No full suite, whole-program compiler audit,
build, browser or remote verification ran. The existing missing svelte2tsx
source-map warning remains non-fatal. Scoped whitespace verification covers
all eight touched paths, including previously untracked fixtures.

Remaining work includes other cache/query families and untagged producers,
direct SDK/QueryClient/global-cache callbacks, out-of-band auth integration
and full repository acceptance. Backend authorization and native cache-plugin
isolation are not established here. The overall 100% goal remains unfinished.
No commit, push or deployment was performed.

## Command Execution Snapshots

```gherkin
Scenario: Detached command input
  Given a command with nested input shared with its caller
  When the caller or provider changes its copy after dispatch
  Then the other party's input remains unchanged
  And accessors and non-JSON input fail before provider dispatch

Scenario: Detached command response
  Given an untrusted provider response
  When a command returns a checked result
  Then provider and caller mutations cannot cross that boundary
  And malformed responses fail without exposing rejected data

Scenario: Checked command failures
  Given a throwing or rejecting command provider
  When the command fails
  Then callers receive a fresh sanitized error with a checked HTTP status
  And dispatched writes preserve their uncertain-write marker

Scenario: Contract-bound types and registration
  Given a command with a closed input and output schema
  When code supplies an incompatible input or assumes another output type
  Then strict compilation rejects that code
  And malformed runtime contracts fail before dispatch
```

Direct command execution now snapshots and validates input before reading the
provider capability, captures that capability once with its receiver, and
snapshots and validates the complete response before delivery. Nested arrays
and objects are detached in both directions and between independent callers.
Accessors, serialization functions, sparse arrays, symbols, hidden properties,
cycles, non-plain objects and non-finite values are rejected at the data
boundary. Proxy reflection can run traps; this is not an executable-code
sandbox.

Transport failures become fresh local errors. Only an own, integer HTTP
status in 400-599 survives; provider messages, codes, field errors, bodies,
causes and details are discarded. A failed dispatched write is marked as
possibly successful. A failure while reading the provider capability has not
dispatched a command and is marked non-writing. Invalid response errors retain
the existing response-specific code and uncertain-write semantics.

Registration captures definition fields through property descriptors instead
of reading accessors, validates object input schemas, and retains private
endpoint/method/schema snapshots. Unsupported schemas now consistently produce
`INVALID_COMMAND_CONTRACT`. Schema construction still relies on the shared
schema-closing implementation; arbitrary executable schema plugins are not
sandboxed here. The input argument cannot contribute inference to the
contract's input type.

Verification (2026-09-10): `command-contract.test.ts` passes 63 checks. This
includes strict diagnostics for the implementation and test source, accepted
typed input/output fixtures and 13 negative compilation cases without
suppression directives. Runtime checks cover all five command methods, input
and output ownership, delayed responses, invalid envelopes and object shapes,
hostile reflection, checked error status, capability lookup, forged contracts
and registration snapshots. The initial run caught an excess-property error
in the new negative runtime fixture; the fixture was corrected without a cast.

Only this single test file ran. No full suite, whole-program compiler audit,
build, mounted custom-hook tests or remote verification ran. Scoped whitespace
verification covers the three touched files, including untracked paths.

Scope: command registration and direct execution only. Custom-hook session
and provider-source ownership, native query/mutation callbacks, legacy dynamic
command entry points, other untagged cache producers and full repository
acceptance remain unfinished. This does not establish the overall 100% goal.
No commit, push or deployment was performed.

## Command Hook Ownership

```gherkin
Scenario: Command query isolation
  Given commands with matching names and inputs in different provider or auth scopes
  When the commands read or refetch
  Then their caches and results remain isolated
  And cached results are revalidated and detached before public reads

Scenario: Captured command writes
  Given a queued or in-flight command mutation
  When its caller edits the input or changes provider, tenant, command or auth
  Then dispatch retains the captured input and transport
  And obsolete calls cannot dispatch, publish state or deliver old results

Scenario: Private mutation observers
  Given simultaneous command submissions and native mutation defaults
  When a write completes or fails
  Then identical submissions share one write and get detached results
  And callbacks are checked against their owner without invoking native defaults

Scenario: Explicit retirement and checked logout
  Given pending command work or an authentication error handler
  When the caller resets, unmounts or starts a new session
  Then obsolete work cannot affect the new state
  And a current handler can finish its own checked logout

Scenario: No dynamic bypass
  Given the public and unsafe hook entry points
  When callers attempt URL-only commands or caller-selected output types
  Then no legacy dynamic command hook is available
  And strict compilation rejects incompatible contract inputs and callbacks
```

Both legacy URL-based command hooks and their options type have been removed
from the unsafe barrel. The root entry point retains only contract-bound
commands. The maintained positive command fixture now uses a POST contract
for mutation; GET contracts are rejected by mutation hooks at runtime.

Command queries use the existing session-owned query projection with explicit
command-contract, raw-provider-source, provider-name, tenant, input and auth
revision tags. Missing named providers fail instead of falling back. Captured
transports and input snapshots are reused only for their original target;
obsolete refetch callbacks do not dispatch. Public results, including externally
written cache entries, pass the command response schema and are detached on
each read. Command-specific checked error codes survive the shared query error
projection.

Command mutations now keep private, discriminated idle/pending/success/error
state rather than exposing native mutation internals. This intentionally
removes native mutation-cache observation, native retry/offline-resume behavior
and global/per-client mutation defaults from this command path. The supported
surface is `mutate`, `mutateAsync`, `reset`, the four status flags, `status`,
`data`, `error` and `variables`. State and controls are read-only in both
TypeScript and runtime reflection.

Dispatch captures its provider capability and checked input before yielding.
Identical active submissions share one write but receive independent promises,
callbacks, inputs, errors and results. Different concurrent submissions fail
as busy. Invalid inputs do not replace a valid active write. Every callback
and final promise handoff rechecks its owner; callback exceptions and rejected
promises cannot replace the command outcome. Already-started application
callback code remains application-owned, not sandboxed.

Reset, unmount and target changes retire old work. Same-provider authentication
changes hide both mutation receipts and input-validation errors immediately.
Reflection that reenters reset, login or another submission cannot replace
the newer invocation. Automatic auth retirement preserves the token needed
by its own checked logout delegate; explicit reset or a new session retires
obsolete delegates. Retirement does not abort an already-dispatched network
write, so cancellation retains the uncertain-write marker without exposing an
old receipt.

Verification (2026-09-10): `command-hooks.test.svelte.ts` passes 49 checks.
The file covers scoped strict diagnostics with all strict flags and
`skipLibCheck: false`, source-resolved mounted Svelte fixtures, the selected
command declarations/functions extracted from the maintained registry fixture,
and 18 negative API cases without new suppression directives. The rejection
cases caught writable status/data types introduced by object spreading;
the returned projection now explicitly preserves the readonly discriminated
state. Initial fixture diagnostics and a normal-login-navigation assertion
were corrected without weakening the checks.

Runtime coverage includes source/auth cache isolation, cache revalidation,
stale refetches and responses, captured callable receivers, detached queued
and joined submissions, reset/target/auth retirement, reentrant input/callback
reflection, final success/error delivery, observer failures, native mutation
default/cache callback isolation, and delayed current/obsolete logout handling.

Only this single test file ran. The earlier direct-command test file was not
rerun in this turn. No full suite, whole-program compiler audit, build or
remote verification ran. The existing missing svelte2tsx source-map warning
remains non-fatal. Scoped whitespace checks cover all ten touched paths,
including the untracked files.

Remaining work includes generic legacy cache helpers and untagged producers,
direct SDK/QueryClient/global-query-cache callbacks, out-of-band auth changes
and full repository acceptance. Backend authorization and general executable
plugin isolation are not established here. The overall 100% goal remains
unfinished. No commit, push or deployment was performed.

## Legacy Cache Retirement

```gherkin
Scenario: No unowned cache bypass
  Given the root and unsafe package entry points
  When code requests legacy cache writes, unowned refreshes or unchecked publication
  Then those APIs and their unused implementations are absent
  And contract CRUD, explicit refresh and checked publication remain exported

Scenario: Immutable refresh selection
  Given a refresh with a provider, contract, tenant, source and auth owner
  When a currentness callback or cache observer mutates the caller's parameters
  Then the refresh retains its original validated selection
  And untagged or differently owned queries remain untouched

Scenario: Exact identifiers and checked inputs
  Given detail queries with numeric and textual identifiers
  When a refresh specifies a detail identifier or malformed selection
  Then identifiers are matched without coercion
  And malformed inputs fail before dispatch without executing accessors

Scenario: Scoped completion
  Given several started refreshes
  When one fails or the owner retires
  Then every started request settles before the refresh completes
  And subsequent dispatches and raw provider errors are suppressed
```

The unused legacy mutation-hook and optimistic-cache modules have been
removed, together with the permissive source matcher that treated untagged
queries as source matches. The root no longer exports `publishLiveEvent`;
the unsafe barrel no longer exposes `invalidateByScopes`, `deepMerge` or
unchecked publication. Checked `usePublish`, contract CRUD hooks and
`useInvalidate` remain. Exact-symbol and module-path searches found no
production callers of the retired implementations before deletion.

The two test files dedicated solely to the removed cache primitives were
retired with those implementations. The former mutation-hook test now
protects the checked replacement and rejects the deleted exports/imports.
Three CRUD tests had only their obsolete compiler input paths removed;
their existing contract/query-invalidation coverage was retained. Those
three files were not executed in this turn.

The active `invalidateOwnedQueries` boundary now validates and snapshots its
matcher, owner, scopes and detail ID before invoking currentness callbacks or
cache observers. Its client and callback capabilities are captured through
own data descriptors. Caller changes cannot replace the selection mid-refresh.
Missing provider and tenant select the default provider and unset tenant,
not wildcards; explicit undefined ID/action/method matchers retain their
presence semantics. Number and string detail IDs remain distinct.

Malformed, accessor-backed, sparse, non-JSON or unexpected metadata fails
before dispatch with a sanitized local error. Matching ignores untagged,
differently owned and malformed query keys and returns detached descriptors.
Currentness requires a synchronous boolean true; exceptions, other values and
asynchronous results retire the refresh. Retirement is latched for the
operation and cannot be reversed by a later true result. Every started
request still settles before failure/cancellation is delivered.

Verification (2026-09-10): `mutation-hooks.test.svelte.ts` passes 37 checks.
Coverage includes scoped strict diagnostics for changed public entry points,
matching/refresh code, the test and source-resolved mounted fixtures, plus
17 negative API/import cases without suppression directives. Runtime checks
cover exact owner selection, detached metadata, reentrant callback changes,
invalid inputs, latched retirement, failure settlement and sanitized errors.
A real mounted public `useInvalidate` refreshes the validated list while
preserving an untagged neighbor. The initial 36-check run passed; the final
run adds irreversible-retirement coverage.

Only this single test file ran. No full suite, whole-program compiler audit,
build or remote verification ran. Existing missing svelte2tsx source-map and
localStorage warnings remain non-fatal. Scoped whitespace checks cover all
13 touched paths, including deleted implementations and untracked files.

Remaining work includes other dynamic/untagged producers, direct
SDK/QueryClient/global-cache callbacks, out-of-band authentication integration
and complete repository acceptance. Removing these unused bypasses is not
proof that every remaining public boundary is safe. Backend authorization
and general executable-plugin isolation remain outside this local evidence.
The overall 100% goal is unfinished. No commit, push or deployment was performed.

## Query Key Snapshots

```gherkin
Scenario: Detached key construction
  Given a builder context and nested parameters owned by a caller
  When the caller edits either after key construction
  Then generated keys retain their captured values
  And generated key trees and builder controls cannot be mutated

Scenario: Checked parser output
  Given an untrusted query key with getters, proxies or malformed fields
  When it is parsed or checked
  Then parsing returns only a detached validated descriptor or no result
  And a boolean check cannot narrow the original untrusted object in TypeScript

Scenario: Checked matching
  Given an untrusted matcher and query key
  When matching is attempted
  Then malformed or accessor-backed metadata cannot execute getters or broaden the match
  And explicit undefined matchers and typed identifier equality retain their semantics

Scenario: Contract integration
  Given a mounted contract-bound query and explicit refresh
  When the checked key builders are used
  Then provider, contract, tenant, source and authentication tags remain intact
  And the public refresh still reaches the intended validated query
```

Query key builders now validate a captured context and every generated
descriptor before returning a key. Contexts accept only their documented
dimensions; ignored namespace/version/kind/action fields cannot be smuggled
through a descriptor spread. Parameters must be stable plain JSON data.
Absent parameters are omitted, preserving the existing canonical query hash
without retaining explicit undefined properties in generated keys.

Generated tuples, descriptors and nested parameter trees are detached and
frozen. Builder families and methods are read-only in their declared types
and at runtime. The default exported builder uses the same checked factory.
Changing the original context or request parameters cannot change an existing
key, a builder's captured defaults or its hash.

Parsing returns independent frozen descriptor snapshots instead of returning
the caller's original object. Accessors, unsupported values, extra fields and
reflection failures are rejected without exposing raw errors. Proxy reflection
can still execute traps; this boundary is not an executable-code sandbox.
`isQueryKey` is deliberately a boolean check, not a type predicate for the
original object. Callers needing a typed value must consume the checked parser
result, which cannot be a proxy with contradictory property reads.

Runtime schemas and descriptor types now require a resource on data keys,
an ID on data/task detail keys, and both resource and ID on custom keys.
The initial focused run caught the former optional-resource schema accepting
a JavaScript call with no resource. Context and matcher metadata are captured
through own data descriptors. Invalid matchers fail closed; explicit undefined
fields, default-provider matching and numeric/textual IDs retain their distinct
semantics. Data-only matchers reject a supplied kind field rather than silently
overriding it.

Contract context projection now copies only valid key-context dimensions,
including the original default resource, instead of spreading the entire
descriptor back into a builder. This preserves existing contract/provider/
tenant ownership while respecting the stricter construction boundary.

Verification (2026-09-10): `query-keys.test.svelte.ts` passes 59 checks.
The file covers scoped strict diagnostics for key construction/parsing,
contract context, owned refresh, tests and source-resolved mounted fixtures,
plus 18 negative API cases without suppression directives. Positive cases
check required detail IDs after discriminant narrowing. Runtime checks cover
all builder families, detached/frozen values, canonical hashes, invalid
JavaScript inputs, getter/proxy behavior, matcher reentrancy, exact IDs and
default resource inheritance. A mounted named-provider contract query
retains source/auth tags and refreshes through the public hook.

The previous parser identity assertions were replaced with detached-equality
assertions. The initial 56-check run had 55 passing cases and the missing-
resource failure; the final run includes required-ID and context-default
regressions. Only this single test file ran. No full suite, whole-program
compiler audit, build or remote verification ran. Existing missing svelte2tsx
source-map and localStorage warnings remain non-fatal. Scoped whitespace
checks cover all four touched paths, including untracked files.

Remaining work includes ad hoc/untagged query producers, other dynamic public
boundaries, direct SDK/QueryClient/cache callbacks, external authentication
integration and complete repository acceptance. Valid key shape alone does
not establish cache ownership, backend authorization or plugin isolation.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Access Query Ownership (2026-09-10)

Scope: `useCan`, its single-decision boundary and one mounted regression file.
Existing work outside this permission-query boundary remains unchanged.

```gherkin
Scenario: Authentication-owned permission decisions
  Given a cached allow decision for the current authentication owner
  When login starts, logout succeeds or the authentication owner changes
  Then the old allow and reason disappear immediately
  And only a fresh decision in an available session can grant access

Scenario: Target-owned permission decisions
  Given a permission request for a provider, tenant and record
  When any target dimension changes or the component unmounts
  Then obsolete results and authentication instructions cannot affect the active view
  And captured obsolete query functions cannot dispatch again

Scenario: Strict single permission results
  Given a provider or cache returning an untrusted permission decision
  When the hook exposes the result
  Then only a checked single decision can be read
  And legacy arrays, accessors and malformed payloads cannot grant access

Scenario: Explicit query lifecycle
  Given a disabled query or unavailable authentication session
  When a cached allow exists or no access-control provider is configured
  Then access remains denied without invoking the permission provider
  And enabled anonymous queries without a policy retain the default allow behavior

Scenario: Checked authentication failure
  Given a current permission query reporting an authentication failure
  When the checked auth handler requests logout
  Then its own logout may complete without exposing provider diagnostics
  And an obsolete handler cannot log out a replacement target or session
```

`useCan` now uses the existing session-owned query projection. Cache keys
include authentication ownership and revision in addition to permission
provider, tenant, resource, action and record parameters. Login immediately
masks old grants/reasons, signed-out sessions stay disabled, and cached
decisions are decoded again before public access. Failed refreshes do not
expose a previous grant or reason. Public controls are frozen and read-only;
nested permission IDs also carry the declared string-or-number constraint.

Single permission results must be exact checked objects. The former
one-element-array compatibility path is removed. Request/response snapshots
remain detached, fixed IDs override checked additional IDs, and provider
capabilities are captured before dispatch. Missing/throwing capabilities
become sanitized query failures. Query settings reject non-boolean enabled
values, negative stale times, NaN and non-number stale times.

Permissions without a configured policy still default to allow in enabled,
available sessions, including anonymous sessions. There is no unconditional
allow bypass during logout or while the query is disabled. Obsolete query
functions cannot dispatch unless another live observer owns the identical
permission target and authentication revision. A client-scoped owner set
preserves native cache refresh when the last stored query function belongs
to a disabled or unmounted peer; it does not bridge different auth owners
or permission targets.

The shared query-session helper accepts an optional target-lifetime guard,
used only here to retire disabled permission observers, and preserves the
three checked access-control error codes. Existing consumers retain their
default behavior. The guard deliberately excludes authentication retirement
so a current checked auth-error delegate can complete its own logout.
Provider/tenant/record/session changes and unmount suppress old instructions;
rejected logout leaves permissions suspended instead of creating a read loop.

Verification (2026-09-10): `useCan.test.svelte.ts` passes 46 checks, including
scoped strict diagnostics for the three runtime boundaries, the session
projection and source-resolved mounted fixtures, plus 11 negative public API
cases without suppression directives. Tests cover session isolation and
deduplication, login/logout, target replacement, disabled/unmounted peers,
shared cache refresh, legacy and malformed responses, hostile cached getters,
detached requests, fixed IDs, sanitized failures and checked auth delegation.

The initial compiler checks exposed a test-only import and a negative-case
control-flow narrowing issue; both were corrected. Additional shared-observer
tests exposed the retired-query-function refresh regression and now pass.
Only this single test file ran. No full suite, whole-program compiler audit,
build or external service verification ran. Existing missing svelte2tsx
source-map and localStorage warnings remain non-fatal.

Remaining work includes other dynamic/untagged query producers, the separate
batch/global access-control API, direct SDK/QueryClient/cache callbacks,
external authentication integration and complete repository acceptance.
Accepting a well-shaped permission decision is not proof that a caller with
direct cache access is authorized; backend authorization and executable
plugin isolation remain separate obligations. The overall 100% goal remains
unfinished. No commit, push or deployment was performed.

## Single And Batch Access Contracts (2026-09-10)

Scope: explicit single/batch permission calls, their shared boundary and the
two built-in access-control adapters. Keep unrelated work intact.

```gherkin
Scenario: Unambiguous permission capability types
  Given an access-control provider
  When a caller invokes can with one request or canMany with a batch
  Then the declared response matches that request shape
  And a single capability cannot return an array or require batch narrowing

Scenario: Checked request and response snapshots
  Given invalid, mutable or accessor-backed permission data
  When a single or batch permission call is made
  Then every request is validated before dispatch
  And only detached checked decisions with exact batch cardinality are returned

Scenario: Optional batch capability
  Given a provider with or without an explicit canMany capability
  When a batch is requested
  Then native batches are validated as batches
  And the single-call fallback captures one capability and settles all started calls

Scenario: Global registration ownership
  Given a pending call against the registered provider
  When registration is replaced or reset, even away and back to the same object
  Then neither its result nor its error can become the current decision
  And a replacement during input or capability capture prevents dispatch

Scenario: Adapter boundaries
  Given a CASL or Casbin adapter
  When its input or external decision violates the declared contract
  Then it rejects rather than granting truthy malformed values
  And ordinary single and batch access behavior remains available
```

The provider contract now separates required `can(CanParams): Promise<CanResult>`
from optional `canMany(readonly CanParams[]): Promise<CanResult[]>`. Single
providers can destructure their request without union narrowing or casts.
`canAccessAsync` retains shape-specific public overloads, accepts readonly
batch inputs and constrains a single call's nested ID to string or number.
Passing an array to `provider.can` is intentionally no longer supported.

Both global call paths validate complete detached requests before dispatch,
including when no provider is configured. Missing actions, empty resource/action
strings, invalid IDs, sparse/accessor-backed batches and extra single-call arguments
on a batch fail closed. Successful single results are checked exact objects;
native batch responses require one checked decision per captured request.
All exposed arrays, entries and nested request data are detached snapshots.

Native `canMany` is preferred when present. A missing method uses one captured
single capability; a malformed native method is rejected without reading or
invoking the single fallback. Empty batches return an empty result without
inspecting capabilities. The single-call fallback preserves order and waits
for every started call to settle before returning or rejecting. Synchronous
registration changes stop subsequent fallback dispatches.

Global calls capture a registration revision and provider identity. A reset,
replacement or away-and-back registration retires both pending decisions and
pending errors. Reentrant changes during input snapshots or capability lookup
prevent dispatch. Errors expose only sanitized protocol status and known
boundary codes, never raw diagnostics or accessor-backed error values.
This registration lifetime is not an authentication session: callers needing
component-scoped auth/tenant ownership must use the session-owned hook.

CASL and Casbin adapters now expose only the unambiguous single capability.
They validate request data and external boolean decisions, reject malformed
CASL field/Casbin subject values and sanitize external failures. Global batch
calls use the checked fallback. Two UI test consumers had obsolete array
branches removed; their unrelated existing changes remain intact.

Verification (2026-09-10): `permissions.test.svelte.ts` passes 64 checks on
the final repeat. Scoped strict compilation includes 14 negative public API
cases, snapshot/shape failures, native/fallback batches, registration races,
adapter validation and a mounted CASL-backed `useCan` login/logout cycle.
The first run found a test method's missing `this` annotation, now corrected.
Only `permissions.test.svelte.ts` has run this turn; no separate UI or query
suite, whole-program compiler audit, build or remote acceptance ran.
Scoped whitespace checks pass for all eight touched paths, including the
untracked contract/status files. Existing missing svelte2tsx source-map and
localStorage warnings remain non-fatal.

Remaining work includes provider registration/options projection, other
dynamic/untagged producers, direct SDK/QueryClient/cache callbacks, external
authentication integration and repository-wide acceptance. Valid frontend
decisions do not establish backend authorization or isolate executable
plugins. The overall 100% goal remains unfinished. No commit, push or
deployment was performed.

## Registered Access Provider Snapshots (2026-09-10)

Scope: global access-control registration, scoped context projection and
their permission-provider/options contract. Preserve unrelated work.

```gherkin
Scenario: Checked provider registration
  Given malformed provider capabilities or accessor-backed configuration
  When a provider is registered or read through an admin context
  Then only validated callable capabilities and exact boolean options are exposed
  And configuration getters are not executed

Scenario: Immutable public projection
  Given a registered provider and its original configuration
  When either the original configuration or a returned public object is mutated
  Then the captured capabilities and options remain unchanged
  And public methods still validate requests and results

Scenario: Stable provider identity
  Given the same immutable input provider shared by multiple admin trees
  When its checked projection is read repeatedly
  Then it retains one stable identity for cache deduplication
  And replacing the configuration with a new object captures a new identity

Scenario: Registration reentrancy
  Given an existing valid registration and a candidate provider
  When validation fails or reflection starts another registration
  Then invalid input cannot replace the valid registration
  And an obsolete outer registration cannot overwrite the newer intent

Scenario: Scoped integration
  Given a component reading permissions through the registered projection
  When its provider, tenant or authentication session changes
  Then old grants are not reused across ownership boundaries
  And normal permission querying and shared-cache refresh remain functional
```

Global registration and admin-context projection now expose a
`RegisteredAccessControlProvider`, not the original provider object.
Its required single and optional batch methods validate detached requests
and responses even when called directly, retain the original method receiver
and sanitize failures. Class prototype methods are supported; accessor-backed
methods/options are rejected without executing their getters. Prototype
reflection is bounded and cyclic chains fail closed.

`AccessControlOptions` is a closed, read-only projection. Only the documented
optional button booleans are accepted; unknown fields, explicit undefined
values, wrong types and nested accessors are rejected. Options and nested
button objects are detached and frozen. The registered object is frozen too,
so callers cannot replace methods or configuration through the public getter.
The no-provider options object is a stable frozen empty value.

Each input object identity owns one captured configuration. A WeakMap keeps
the same checked identity across global registration, scoped contexts and
provider bundles, preserving permission cache deduplication. Changes to the
original methods/options do not change the projection; callers must supply
a new input object to update configuration. This deliberately drops mutable
configuration compatibility. Method implementations may still read their
own service state; snapshots are not an executable-provider sandbox.

Registration validates before committing and changing the active revision.
An invalid replacement leaves the existing provider and its pending calls
intact. A separate registration intent prevents an outer reflection-triggered
registration from overwriting a newer reset or replacement. Ordinary
registration revisions still retire the global calls covered previously.

Admin contexts and `getProviderBundle` now declare checked access-provider
outputs through `ResolvedProviderBundle`. Both direct and bundled inputs
are normalized, while explicit scoped null still disables a bundled provider.
Resolved bundles and context-value objects are frozen; the captured accessor's
permission-provider and provider-bundle properties cannot be redefined.
Unrelated accessor methods and other provider implementations were not
rewritten. Reactive source, tenant and auth changes remain supported.

Verification (2026-09-10): `permissions.test.svelte.ts` passes 100 checks,
including 23 negative public type cases without suppression directives.
Scoped strict diagnostics cover registration, shared validation, context,
query usage, the edited permission/query tests and source-resolved mounted
fixtures. New runtime cases cover malformed registrations/options, getter
rejection, frozen snapshots, original class receivers, contradictory proxies,
prototype cycles, public method validation, native cardinality, failed and
reentrant registration, all context exits and actual mounted queries.

Mounted checks prove shared-source deduplication, refresh after peer unmount,
tenant/provider replacement, login/logout and configuration-time rejection
before query dispatch. Existing malformed-method tests were migrated from
query-time failure to registration/context-time failure; the separate
`useCan.test.svelte.ts` runtime suite was not run. Its edited cases are
strictly compiled, and equivalent mounted cases execute in the selected file.
An initial test-only missing async marker was corrected before the passing
run. The new nested-class performance warning was removed. Existing missing
svelte2tsx source-map and localStorage warnings remain non-fatal.

Only the selected permission test file ran; no full suite, whole-program
compiler audit, build or remote acceptance ran. Scoped whitespace verification
passes for all seven touched paths, including the untracked files.

Remaining work includes other dynamic/untagged producers, feature-gate input
contracts, other provider configuration APIs, direct SDK/QueryClient/cache
callbacks, external authentication integration and repository-wide acceptance.
These checked frontend projections do not establish backend authorization or
isolate executable plugins. The overall 100% goal remains unfinished.
No commit, push or deployment was performed.

## Feature Gate Input Contracts (2026-09-10)

Scope: feature-gate configuration and user-hint evaluation. Keep permission
provider behavior and unrelated work unchanged.

```gherkin
Scenario: Exact feature configuration
  Given a malformed or ambiguous feature-gate rule
  When the gate is created
  Then configuration validation rejects it with a sanitized error
  And minimum roles require a nonempty unique hierarchy containing that role

Scenario: Detached rule snapshots
  Given a valid rule and arrays owned by the caller
  When those original values change after gate creation
  Then the existing gate retains its captured constraints
  And a new gate can capture a new rule

Scenario: Checked user hints
  Given malformed, accessor-backed or sparse user-hint data
  When the gate evaluates it
  Then the result is false rather than an exception or a truthy untyped value
  And input getters and custom collection methods are not invoked

Scenario: Explicit role and permission semantics
  Given a valid rule and user
  When role, hierarchy and permission constraints are evaluated
  Then all configured constraints must hold
  And permissions are exact values without implicit wildcard or role defaults

Scenario: Presentation does not authorize
  Given a user whose feature-gate hints allow a control
  When the configured access-control provider denies the action
  Then the feature-gate result does not alter that permission decision
```

Feature-gate rules now use checked, detached, frozen snapshots. The public
configuration type requires minimum role and hierarchy together; runtime
validation also requires nonempty unique hierarchy entries and membership
of the minimum role. The former implicit exact-role fallback is removed.
Standalone unused hierarchies, unknown fields, whitespace-only names and
malformed arrays are rejected with `INVALID_FEATURE_GATE_CONFIG`.

Configuration arrays and user hint arrays are read-only in public types.
Every invocation parses fresh plain user hints; invalid values return false
without leaking errors or invoking accessors/custom collection methods.
Rules still combine all configured constraints, use exact case-sensitive
names, grant no built-in role privileges and do not expand wildcard strings.
Empty role lists deny all valid users, while empty permission lists add no
constraint. Feature-gate presentation never overrides access-control denial.

An added adversarial test proved a shared plain-data snapshot defect:
reading an original proxy array's length twice let a required permission
disappear between validation and copying. The regression initially failed
by granting a user with no required permission. Array snapshots now use
the captured length descriptor consistently and reject inconsistent lengths.
This small shared-boundary fix was necessary for the feature-gate contract;
ordinary, frozen, nested, sparse and accessor-backed array cases are covered.

Verification (2026-09-10): `permissions.feature-gate.test.svelte.ts` passes
63 checks, including scoped strict diagnostics for the feature contract,
permission API, plain-data helper and tests, plus 16 negative public type
cases without suppression directives. Runtime coverage includes malformed
configuration/user values, detached/frozen snapshots, hierarchy membership,
role/permission conjunction, exact wildcard behavior, getter/proxy failures,
changing array length, reentrant caller mutation and provider-denial isolation.

Only this one test file ran; no full suite, other plain-data consumer suite,
whole-program compiler audit, build or remote acceptance ran. Shared-helper
consumer integration outside this selected scope remains unverified.
Scoped whitespace checks pass for all five touched paths, including untracked files.

Remaining work includes other dynamic/untagged producers, other provider
configuration APIs, direct SDK/QueryClient/cache callbacks, external auth
integration and repository-wide acceptance. Schema-checked presentation
hints do not establish backend authorization or executable-plugin isolation.
The overall 100% goal remains unfinished. No commit, push or deployment
was performed.

## Plain Data Consumer Integration (2026-09-10)

Scope: the shared plain-data snapshot and its direct query-key, command,
resource-parser and invalidation consumers. Separate resource transport
wrappers are not presumed covered by parser-level evidence.

```gherkin
Scenario: Stable nested collection capture
  Given a proxy array whose property reads disagree with its descriptors
  When a direct consumer captures the array
  Then no query condition, write input, response row or refresh scope disappears
  And the original length getter is never used

Scenario: Detached command dispatch
  Given a prepared command with nested arrays owned by its caller
  When the caller or provider edits those arrays
  Then subsequent dispatches retain the captured request
  And returned response trees do not alias provider data

Scenario: Consistent input rejection
  Given sparse or accessor-backed nested arrays
  When query, command, resource or invalidation parsing runs
  Then invalid input is rejected before dispatch with the local checked error
  And submitted accessors are not executed

Scenario: Honest public types
  Given unknown input accepted at runtime boundaries
  When TypeScript callers consume a parser result
  Then only its declared checked result type is available
  And raw objects are not narrowed by snapshot creation
```

Extended the existing `plain-data.test.ts` with direct consumer integration
instead of treating the feature-gate regression as proof for every consumer.
Adversarial arrays have contradictory property reads but consistent own
descriptors; tests verify that nested query filters, sorter order, record
arrays, input labels and invalidation scopes remain intact without reading
the original length property. Numeric and string query IDs remain distinct.

Resource coverage exercises create/update/delete input parsing, complete
record parsing and form-draft snapshots. Command coverage prepares and
dispatches the real command boundary through a test provider, mutates caller,
prepared-view, provider and returned data, then executes again to prove
captured request and detached response semantics. Malformed trailing command
rows cannot disappear through array-length changes.

Sparse/accessor-backed arrays are rejected by every selected input consumer,
without invoking getters or dispatching a command. Nested arrays with hidden,
extra or symbol fields remain invalid. Existing primitive, repeated-reference,
cycle, serialization-hook and prototype-named-key cases remain covered.

Verification (2026-09-10): `bun test packages/core/src/plain-data.test.ts`
passes 19 tests with 81 assertions. The selected file includes scoped strict
diagnostics for snapshot, query-key, command, resource-contract and refresh
boundaries plus 10 negative type cases without suppression directives.
No new runtime fix was needed in this turn; the preceding shared length
descriptor repair passes the tested direct-consumer paths.

Only this one test file ran. No full suite, mounted UI, standalone resource
transport-wrapper suite, whole-program compiler audit, build, backend service
or remote acceptance ran. Resource transport wrappers have their own
validation path and are not proven safe by parser-level coverage here.
Scoped whitespace checks pass for both touched paths, including untracked files.

Remaining work includes the separate resource transport-wrapper boundary,
other dynamic/untagged producers, provider configuration APIs, direct
SDK/QueryClient/cache callbacks, external auth integration and repository-wide
acceptance. The overall 100% goal remains unfinished. No commit, push or
deployment was performed.

## Resource Transport Data Snapshots (2026-09-10)

Scope: `withResourceSchemas` standard CRUD request/response data boundary
and its dedicated regression file. Preserve unrelated changes.

```gherkin
Scenario: Checked transport requests
  Given malformed or accessor-backed CRUD parameters
  When a standard read or write is requested
  Then the whole request is captured and checked before provider dispatch
  And invalid IDs, collections and undeclared envelope fields are rejected

Scenario: Detached request ownership
  Given caller-owned metadata, filters, IDs or write variables
  When the provider or caller modifies its copy
  Then the other owner's data and the selected resource stay unchanged
  And every batch item is validated before any write starts

Scenario: Checked response ownership
  Given a provider response containing mutable arrays or accessors
  When a transport method returns
  Then callers receive only an independent checked data tree
  And malformed responses retain the correct write-may-have-succeeded flag

Scenario: Stable diagnostics and bodyless deletion
  Given an input or response that fails plain-data capture or schema validation
  When the boundary reports failure
  Then getters and provider diagnostics cannot leak through capture errors
  And bodyless deletion and ordinary form field errors remain supported
```

Standard CRUD methods now capture complete request trees before resolving
resource schemas or dispatching provider methods. Closed request envelopes
check resource names, IDs/ID arrays, write variables, metadata, recursive
filter syntax, sorter direction and pagination. Malformed and accessor-backed
input is rejected before I/O. Requests no longer alias caller metadata,
filter arrays or write values. Explicit undefined delete variables are
treated as an absent body while all other fields remain checked.

Responses are copied through the shared plain-data boundary before resource
schema evaluation. Concrete one/many/list result decoders replace the former
generic return of the original transport value. List extension data remains
available as detached plain data; undeclared one/many envelope extensions
are not exposed. Record data and arrays never alias provider receipts.
List totals and pagination integers are bounded by the safe-integer range.

Capture failures expose local input/response errors without reading getters.
Response failures retain whether a write may already have succeeded and do
not retry. Write diagnostics pin the resource before provider code executes,
so provider mutation cannot relabel an error with a different resource.
Existing field-error paths/messages, referenced schemas, required write
schemas, optional capability availability and bodyless deletion still work.
Only plain JSON transport data is accepted; hidden/accessor/non-JSON values
are no longer passed through because a broad schema accepts them.

Verification (2026-09-10): `resource-schemas.test.ts` passes 92 tests with
340 assertions, including scoped strict diagnostics and 12 negative public
API cases without suppression directives. The fixture no longer claims
that an untrusted generic response is type T through an assertion.
New cases cover all nine CRUD methods for input getters, parameter mutation,
detached responses and invalid receipt write outcomes. Additional cases
cover malformed IDs/filters/sorters/pagination, missing write bodies, explicit
undefined deletes, changing proxy lengths, batch tail validation and
provider-mutated diagnostics.

The selected file also executes the real `contractProvider` list preflight
and create-many fallback, including rejecting an invalid second record
before dispatch. An initial strict check caught the test library's mutable
parameter-table requirement; the test table was corrected without weakening
source types. Only this test file ran; no full suite, mounted UI, backend
service, whole-program compiler audit, build or remote acceptance ran.
Scoped whitespace checks pass for all three touched paths, including untracked files.

Remaining work includes provider-capability and schema-configuration capture
in this wrapper, raw provider failure handling, batch receipt semantics,
other dynamic/untagged producers, direct SDK/QueryClient/cache callbacks,
external auth integration and repository-wide acceptance. The current
wrapper still preserves provider-thrown failures and does not independently
establish auth/tenant ownership or backend authorization. The overall 100%
goal remains unfinished. No commit, push or deployment was performed.

## Resource Transport Configuration Capture (2026-09-10)

Scope: configuration and method capture for `withResourceSchemas`, preserving
the preceding data snapshots and the existing dirty work.

```gherkin
Scenario: Captured transport capabilities
  Given a provider with required and optional standard methods
  When the resource wrapper is created and the source methods later change
  Then dispatch uses the captured methods and original receiver
  And malformed or accessor-backed capabilities fail before dispatch

Scenario: Detached schema definitions
  Given resource schemas and referenced definitions owned by a caller
  When the caller changes them before or after the first operation
  Then the existing wrapper retains its original validation rules
  And a new wrapper may capture the new configuration

Scenario: Non-executable configuration
  Given schema/configuration getters, cycles, transforms or malformed fields
  When a wrapper is created
  Then creation fails with a sanitized configuration error
  And configuration accessors and transform functions are not invoked

Scenario: Read-only public wrapper
  Given an initialized wrapper
  When a caller attempts to replace or add public transport methods
  Then its validation boundary cannot be overwritten
  And optional capability availability and contract batch integration remain intact
```

`withResourceSchemas` now captures resource definitions and direct provider
capabilities during wrapper creation. Schema data is copied through own
descriptors before TypeBox validation; supported TypeBox kind, optional,
readonly and recursive-hint symbols are preserved. Accessors, executable
transforms, foreign symbols, cycles, invalid definitions and malformed
reference collections fail with a sanitized configuration error. Schema
copying has bounded depth and does not read original array length properties.

Every record/write schema and referenced definition is detached before lazy
validators are constructed. Mutating nested schema constraints, replacing
resource entries or changing references before/after first use cannot alter
the existing wrapper. A new wrapper may capture new configuration. Type.Ref
and recursive schemas remain supported. Reference evaluation errors such as
unresolved references retain their existing operation-time error behavior;
this change does not claim eager verification of all possible schema semantics.

Required and optional methods are captured from own/prototype data properties,
without spreading the provider or invoking capability accessors. Captured
calls use the original receiver, including class-private state. Missing
required methods and present noncallable optional methods are rejected.
Optional methods added later do not appear in existing wrappers. URL method
results are checked as strings and URL failures are sanitized.

The public wrapper is frozen and returns `Readonly<DataProvider>`, so callers
cannot replace, delete or add escape-hatch methods. Raw provider objects are
not frozen, and executable method internals may still read their own mutable
state. This is capability capture, not a sandbox. Unknown provider fields are
not copied or evaluated. Custom calls remain blocked by the resource-schema
boundary rather than forwarding an unchecked endpoint.

Verification (2026-09-10): `resource-schemas.test.ts` passes 144 tests with
509 assertions, including scoped strict compilation and 16 negative public
type cases without suppression directives. New coverage includes all CRUD
method replacements, capability getters, malformed/absent methods, class
receivers, contradictory proxies, frozen controls, schema/registry/reference
mutation, recursive markers, schema accessors/cycles/transforms and hostile
reflection. A dedicated case confirms a batch validator created after a
successful single write still uses the original schema snapshot.

The preceding detached data, invalid input/receipt, field diagnostics and
contractProvider batch-fallback cases remain in the selected file and pass.
An initial strict check exposed a closure narrowing issue, and an empty-array
test case was misinterpreted as a callback-style test; both were corrected.
Only this one file ran. No full suite, mounted UI, backend, whole-program
compiler audit, build or remote acceptance ran. Scoped whitespace checks
pass for all four touched paths, including untracked files.

Remaining work includes raw provider failure handling, batch receipt semantics,
and outer `contractProvider` transport closures that still delegate dynamically
to their original provider. Capturing a wrapper supplied by another layer does
not prove that layer's internal calls are immutable. Other dynamic/untagged
producers, SDK/QueryClient/cache callbacks, external auth integration and
repository-wide acceptance remain unfinished. No backend authorization or
executable-plugin isolation is established here. The overall 100% goal remains
unfinished. No commit, push or deployment was performed.

## Contract Provider Captured Dispatch (2026-09-10)

Scope: the outer resource-contract provider and its batch fallbacks. The goal
is to prevent transport replacement and unchecked receipts from bypassing an
already declared contract. No unrelated provider migration or whole-repository
type rewrite is included.

```gherkin
Scenario: Stable contract capabilities
  Given a contract wrapper around a provider with data methods
  When source methods are replaced or optional capabilities are added later
  Then existing dispatch retains the captured methods and original receiver
  And unrelated provider getters are not evaluated

Scenario: Checked fallback receipts
  Given a provider without native batch methods
  When a single-operation receipt has accessors or violates the record schema
  Then the fallback rejects it without invoking data accessors
  And invalid write receipts retain the uncertain-write marker

Scenario: Independent single requests
  Given a fully validated batch request
  When fallback operations are dispatched
  Then each receives its own detached single-operation envelope
  And no batch-only IDs or mutations from sibling calls leak into it

Scenario: Settled batch outcomes
  Given a fallback batch with an early failure and a pending sibling
  When the first operation fails
  Then the batch waits for every started operation before rejecting
  And partial deletes retain successful IDs and uncertain failure causes

Scenario: Read-only checked surface
  Given the public contract wrapper
  When callers replace methods or assume unchecked fields have concrete types
  Then scoped strict compilation rejects these assumptions
  And runtime method replacement is blocked
```

`contractProvider` now composes an inner captured `withResourceSchemas` provider
with the existing outer batch-validation boundary. It does not spread or
dynamically read the raw provider. Required and optional capabilities retain
their captured methods and original receiver; unrelated getters are ignored,
and accessor-backed standard capabilities fail during construction. The cache
and return type now preserve `Readonly<DataProvider>`, matching the frozen
runtime surface. Custom calls still cannot bypass resource contracts.

The outer layer validates every batch input and contract-specific ID before
dispatch. Fallbacks use checked single-operation methods, remove batch-only
`ids`, and receive independent request copies. Receipts are detached and
validated before `.data` is read, so malformed records and accessor-backed
envelopes cannot enter an aggregate. The extra validation layer is intentional;
no performance benchmark was run.

Read/create/update fallbacks now wait for every started operation to settle
before reporting the first rejection in input order. Delete fallback retains
its settled partial-outcome behavior, but an invalid single receipt is now a
failed confirmation carrying `writeMayHaveSucceeded: true`, not a claimed
successful deletion. Successful IDs remain available alongside failed IDs and
causes. A failed confirmation does not prove that the backend write failed.
Empty batches and bodyless delete requests remain supported.

Verification (2026-09-10): only `resource-contract.test.ts` ran, passing
72 tests with 249 assertions. Its scoped strict compiler checks include the
changed implementation/test and direct transport/decoder dependencies, plus
12 rejected public type assumptions without suppression directives. Initial
test-harness errors involving readonly table input and an incorrectly concrete
form result expectation were corrected without weakening production types.
All three touched, untracked paths pass whitespace checks. No full test suite,
whole-program compiler audit, browser, backend, build or remote acceptance ran.

Remaining work includes raw provider-thrown failure sanitization, exact receipt
identity/cardinality at this low-level adapter, other dynamic/untagged producers,
SDK/QueryClient/cache callbacks, external auth integration and repository-wide
acceptance. Captured methods can still consult mutable internal state; this is
not executable-plugin isolation. Settled fallbacks do not provide transactions,
rollback or cancellation, and pending transports can keep a batch pending.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Contract Receipt Identity (2026-09-10)

Scope: `contractProvider` request/receipt identity and batch cardinality. Reuse
the existing captured transport and data snapshots; do not change unrelated
hooks or raw-provider APIs. Record shape alone must not prove a successful
operation on the requested identity.

```gherkin
Scenario: Exact single-record identity
  Given a checked request for a typed record ID
  When the provider returns a valid record for another ID or ID type
  Then the response fails without exposing its data
  And writes retain the uncertain-write marker

Scenario: Complete distinct batch receipts
  Given a batch with distinct requested IDs
  When native results omit, duplicate or add identities
  Then the entire receipt is rejected
  And a complete reordered identity set is accepted
  And fallback single receipts must match their own requested ID
  And list results cannot repeat a typed identity

Scenario: Unambiguous write inputs
  Given duplicate target IDs, duplicate supplied create IDs or a conflicting update ID
  When a native or fallback operation is requested
  Then validation fails before the first transport call
  And numeric and string IDs are not conflated

Scenario: Checked create correspondence
  Given a create batch with optional caller-supplied IDs
  When its response is received
  Then record count and uniqueness are checked
  And supplied IDs must match the corresponding input position
  And generated IDs are not claimed to prove business-content correspondence

Scenario: Confirmed delete outcomes
  Given a delete fallback with a valid receipt and a wrong-identity receipt
  When all started operations finish
  Then only the valid receipt contributes a successful ID
  And the wrong-identity receipt is an uncertain failed confirmation
```

Single read/update/delete receipts must now match the requested ID, including
its type. Create receipts must match caller-supplied IDs when present. Numeric
zero and empty-string IDs are not mistaken for absent IDs. Record schemas still
establish ID legality; these checks run only after detached schema validation.

Native read/update/delete batches must return the complete distinct requested
identity set, in any order. Fallback receipts are checked against each individual
request, preventing a swapped pair from passing merely because the aggregate
set matches. List records must also have distinct typed IDs. List extensions
remain detached, and numeric/string identities remain separate.

Duplicate target IDs and duplicate supplied create IDs fail before dispatch.
Updates cannot change a record's ID, even when the write schema allows an `id`
field. Supplied create/update IDs must satisfy the record ID schema as well as
the write schema; an explicitly supplied update ID is checked even in an empty
native batch. The entire fallback input batch remains checked before writing.

Create batches require exact cardinality, unique returned IDs and positional
correspondence for caller-supplied IDs. Generated IDs have no such positional
business-content guarantee. Empty batches require empty native receipts. A
wrong-identity fallback delete receipt contributes an uncertain failure, not a
successful ID. Existing settled-batch behavior and partial-delete causes remain.
Identity diagnostics contain operation/phase/write uncertainty, not rejected
record values. Raw provider-thrown errors are still not sanitized by this work.

The inner request copies isolate identity expectations from transport mutation.
Tests cover a transport rewriting single IDs, native ID arrays and supplied
create IDs, plus a caller editing IDs while a native response remains pending.
All checks retain the originally accepted request identities.

Verification (2026-09-10): `resource-contract.test.ts` passes 143 tests with
467 assertions, including its scoped strict compilation and 12 negative public
type cases. Only this test file was executed. The directly affected integration
fixture in `resource-schemas.test.ts` was corrected to return distinct generated
IDs instead of treating duplicate create receipts as success. That companion
file was included in the scoped compiler check but its runtime suite was not
executed in this turn. Existing successful fallback fixtures were likewise
corrected to return the requested IDs or distinct generated IDs.

All four touched paths pass whitespace checks. No whole-program audit, full
suite, browser/backend acceptance, build or remote checks ran. Remaining work
includes raw provider failure sanitization, other dynamic/untagged producers,
SDK/QueryClient/cache callbacks, external auth integration and repository-wide
acceptance. These receipts cannot prove backend persistence, business-content
correspondence for generated IDs, authorization or transactionality. The overall
100% goal remains unfinished. No commit, push or deployment was performed.

## Resource Provider Failure Boundary (2026-09-10)

Scope: normalize exceptions from captured raw CRUD calls without converting
local request/receipt validation or checked partial-delete outcomes into opaque
transport failures. Preserve the current dirty work and use one selected test
file for verification.

```gherkin
Scenario: Unknown provider rejection
  Given a raw provider that throws a primitive, object or Error
  When a CRUD operation invokes it
  Then a new structured provider-failure error is returned without retrying
  And raw messages, bodies, causes, codes and accessors do not escape

Scenario: Checked status and write uncertainty
  Given a raw rejection with a statusCode data property
  When the status is an integer from 400 through 599
  Then the status is preserved without executing getters or coercion
  And malformed statuses fall back to 502
  And invoked writes remain uncertain regardless of supplied error details

Scenario: Local validation stays local
  Given malformed input, conflicting IDs or a missing resource schema
  When the outer contract validates the request
  Then no raw transport method is invoked
  And input codes, field errors and false write-uncertainty remain available

Scenario: Validated receipts and partial deletes
  Given malformed returned data or mixed checked delete outcomes
  When the contract processes the results
  Then response validation retains its own diagnostics
  And partial-delete causes contain checked errors rather than raw objects

Scenario: Stable failure context
  Given a raw method that mutates its request before throwing
  When the rejection is normalized
  Then diagnostics use the accepted resource and operation
  And nested schema wrappers cannot launder provider-supplied input-error claims
```

All nine captured raw CRUD calls now normalize synchronous throws and promise
rejections into new `HttpError` instances with `RESOURCE_PROVIDER_FAILED`.
Only an own `statusCode` data value that is an integer in 400..599 survives;
other values use 502. Status getters, inherited values and coercion hooks are
not executed. Hostile reflection and revoked proxies fall back to a local
error without retaining the reflection failure.

Raw names, messages, stacks, codes, field-error objects, details, bodies, causes
and claimed partial-delete successes are not preserved. This is an intentional
behavior change, not a compatibility promise: backend-provided field messages
are not automatically trusted as public form diagnostics. The normalized error
has a fixed message and captures resource, operation, transport phase and
write uncertainty locally. Once a raw write method is invoked, even a forged
or replayed `INVALID_RESOURCE_INPUT` with a false write marker cannot establish
that no write occurred. Valid status shape is not proof of backend authenticity.

The existing schema logic is shared through an internal request validator,
which captures input data and validates the complete operation before dispatch.
It retains operation-specific envelope types without claiming concrete types
for unknown write variables. Runtime operation discriminators are checked
without coercion, including JavaScript calls. The helper is not re-exported
from the public core entry point and provides no unchecked transport path.

`contractProvider` now validates its own requests with that shared validator
and returns its frozen contract surface directly. Only its captured inner
provider invokes raw methods. This removes the second raw-call wrapper around
trusted local validation rather than introducing a flag to bypass error
checks. Local request/identity errors, field diagnostics, schema errors,
checked response errors and locally constructed partial-delete outcomes retain
their semantics. Missing-resource/schema failures now explicitly carry a false
write-uncertainty marker. Batch inputs remain checked before the first write,
and all started fallback calls still settle before a failure is exposed.

Verification (2026-09-10): only `resource-schemas.test.ts` was executed, passing
245 tests with 872 assertions and 22 scoped compile-negative cases. Its compiler
check includes the changed implementation files and the directly affected
`resource-contract.test.ts`. That companion file's raw-error-identity assertions
were updated to expect normalized causes; its runtime suite was not executed.
The selected file runs direct contract integration for all native operations,
local field/ID validation, response/identity failures, genuine versus forged
partial-delete outcomes, all four settled fallbacks and the frozen surface.
It also covers arbitrary rejection values, sync/async dispatch, status ranges,
accessors, coercion, hostile proxies, replayed errors, mutated request context
and nested wrappers.

All five touched paths pass whitespace checks. No full suite, whole-program
compiler audit, browser/backend checks, build or remote acceptance ran. The
failure boundary does not sanitize unrelated SDKs, callbacks or other public
entry points and does not establish transactionality, persistence or executable
plugin isolation. Other dynamic/untagged producers, SDK/QueryClient/cache
callbacks, external auth integration and repository-wide acceptance remain.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Cached Record Receipt Validation (2026-09-10)

Scope: ordinary record-query cache reads and the shared one/many/list response
decoders. A cache entry is untrusted data even if an earlier network response
was checked. Do not refactor unrelated query lifetimes, adapters or SDKs.

```gherkin
Scenario: Non-executable cached receipts
  Given cached one, many or list data with envelope or record accessors
  When a mounted reader projects the cache value
  Then accessors are not invoked
  And the public result reports a checked response error with no data

Scenario: Detached query results
  Given valid cached records and nested list extensions
  When public consumers edit the returned result
  Then the cache and subsequent reads retain their original values

Scenario: Revalidation after external mutation
  Given a cache previously accepted by the query
  When external code replaces or mutates its data without another network call
  Then every subsequent public read rechecks its shape
  And a later valid cache value restores a successful public result

Scenario: Cache receipt identity
  Given a contract-bound single, many or list query
  When cached records have a wrong target ID, incomplete ID set or duplicate IDs
  Then the data is withheld
  And a complete reordered many result remains valid

Scenario: Checked observer effects
  Given an injected cache value that fails receipt validation
  When observers and refetch results are projected
  Then success notifications never receive the invalid value
  And cached accessors cannot supply authentication-error instructions
```

The shared one/many/list record response decoders now snapshot the complete
receipt before inspecting its envelope or invoking a record decoder. Descriptor
capture prevents data/record/extension getters from running and rejects
non-JSON values, cycles and hostile reflection with `INVALID_PROVIDER_RESPONSE`.
Write callers retain their `writeMayHaveSucceeded` marker. Nested list metadata
is detached as well as records. The custom unknown-payload decoder and the
standalone BaseRecord shape checker were not changed in this turn.

The snapshot enters schema validation as `unknown`; the schema establishes its
object/field types before property access. An initial strict compiler failure
from spreading a narrowed JSON union was resolved with this explicit boundary,
not a type assertion. The change deliberately makes all three record-receipt
decoders JSON-only, including their extension fields; it is not a promise to
retain previously accepted non-JSON extensions.

Ordinary contract-bound list/table reads reject duplicate cached identities.
Many reads recheck the entire distinct requested ID set, with complete reordered
results allowed. The existing single-record identity check now benefits from
the safe envelope snapshot. The same decode functions are used for network and
cache results, with contract flags and expected IDs captured for the query.
External `setQueryData` writes and in-place data mutations are revalidated on
public reads even if the cache revision does not change. Invalid data is masked
and a repaired value can restore a successful result without another fetch.

Contract queries now pass their raw provider directly to the existing captured
`contractProvider`, instead of constructing an intervening dynamic wrapper.
This preserves framework response-validation errors rather than misclassifying
them as raw provider failures and retains captured methods during later source
replacement. Source IDs and metadata capture remain in place. The unbound
dynamic query-provider wrapper is unchanged and is not covered by that claim.

The snapshot is inside record decoding, not around the select projection's
input identity. A direct select-projection case confirms that repeated reads
still invoke each mapper once per cached input/revision while returning detached
records and options. No mounted select/infinite-query suite or performance
benchmark ran, and the cost of repeated defensive copies was not measured.

Verification (2026-09-10): only `query-source.test.svelte.ts` was executed through
the core Vitest configuration. It passes 146 tests, including mounted Svelte
readers in happy-dom, scoped strict compilation and six new unsuppressed
decoder type-rejection cases. Existing result-discriminant fixtures remain
checked. New runtime cases cover envelope/record/extension getters, native
QueryClient writes, in-place mutation and repair, contradictory array lengths,
reflection failures, wrong/missing/duplicate identities, empty requested
collections, notification/auth effects, failed refetch retention, write flags,
select mapper memoization and method replacement.

The missing svelte2tsx source-map warning and Node localStorage experimental
warning were non-fatal. All five touched paths pass scoped whitespace checks.
No other runtime suite, full build, whole-program audit, real-browser/backend
acceptance or remote operation ran. This protects the ordinary typed read
surface, not direct SDK generic reads, every global cache callback or arbitrary
cache/plugin internals. Unbound dynamic producers, other query families,
external authentication and repository-wide acceptance remain unfinished.
The overall 100% goal remains unfinished. No commit, push or deployment was
performed.

## Select Cache Correspondence (2026-09-10)

Scope: contract-bound select list/default cache receipts and option-projection
memoization. Preserve independent record snapshots for user mappers and
existing query/auth ownership; do not refactor unrelated UI controls or SDKs.

```gherkin
Scenario: Exact cached default identities
  Given a selector with a distinct set of requested default IDs
  When its default cache contains missing, extra, duplicate or wrong-type IDs
  Then the result is rejected before option mappers run
  And complete reordered results are accepted

Scenario: Distinct list receipts and merged options
  Given separate list and default query results
  When either receipt repeats a record identity
  Then that receipt is rejected
  And valid overlap between the two result families still merges once

Scenario: Content-aware mapper caching
  Given a previously mapped cache object with an unchanged revision
  When its validated record contents change in place
  Then option labels and values are remapped from independent new snapshots
  And unchanged contents do not rerun the callbacks

Scenario: Checked failure and recovery
  Given poisoned data or a mapper failure
  When records are read, repaired or mapped recursively
  Then unchecked or stale options do not escape
  And same-input recursive mapping fails without looping
  And repaired record contents can recover without a network request
```
