# Dependency Type Repairs

These patches repair declarations against the installed runtime. They do not
disable diagnostics, replace dependency modules with ambient shims, or establish
repository-wide type safety. `check:types:dependencies` must remain enabled.

- `@refinedev/core@5.0.12`: replace the unresolved build-time `@definitions/index`
  alias with the shipped relative definitions entry in all three declaration
  formats. `@types/papaparse` supplies the actual CSV library declarations.
- `@sveltejs/kit@2.70.3`: use the `ParseOptions` and `SerializeOptions` exports of
  the workspace's pinned `cookie@1.1.1`. The parser option intersection preserves
  Kit's string-returning decoder contract, so `getAll()` does not falsely promise
  strings for a decoder that returns `undefined`. Cookie runtime calls continue
  to use the existing `parse` and `serialize` compatibility exports.
- `@tanstack/svelte-query@6.1.48` and `@tanstack/svelte-table@9.2.3`: point
  reactive-module declaration imports at the shipped `.svelte.js` modules.
  Extensionless `.svelte` imports caused Svelte checking to invent component
  default exports. Actual component imports are unchanged.
- `@xyflow/system@0.0.81`: retain the base-node constraint when removing
  user-supplied measured dimensions. Intersecting the original mapped type with
  the base shape preserves exact optional properties, custom data, node type
  literals, and the original user-node reference without widening those fields.
  ESM and UMD declarations are repaired together.
- `@xyflow/svelte@1.6.5`: use the system package's existing Promise resolver
  helper in the runtime and derive the store declaration from it. This removes
  the ES2024 ambient type requirement and fixes `fitView()` in ES2022
  environments without a native `Promise.withResolvers`. The public canvas API
  has a regression with that native method unavailable.
- `bits-ui@2.19.0`: express the Button/Calendar component signatures without
  expanding `keyof` across their DOM-property unions. Original prop unions,
  binding names, and setter parameter types remain intact. Floating CSS output
  refers to the installed `csstype` properties rather than stale expanded aliases.
- `svelte-toolbelt@0.10.6`: import `Expand` explicitly in the box declarations and
  derive the sleep handle from `ReturnType<typeof setTimeout>`. Browser-only
  fixtures no longer depend on an accidental global utility or Node timer type.
- `@supabase/auth-js@2.112.4`: distinguish native binary WebAuthn extensions from
  JSON output, require the current attestation fields, and align fallback
  serialization with those declarations. The new helper validates supported
  extensions and encodes large-blob/PRF bytes with correct view boundaries.
  It rejects unknown/malformed extension fields; legacy extension passthrough is
  intentionally removed. Both module formats include the same compiled helper.
- `elysia@1.4.30`: guard generic indexes, isolate TypeBox definitions from
  Standard Schema definitions, and preserve macro context, registered errors,
  numeric/quoted/named status codes, and schema-derived response types.
  Mutable status-wrapper invariance is retained. Model mappers receive the
  actual schemas supplied by the runtime; references and module imports accept
  only registered TypeBox models.
  Model parser types describe decoded values and discriminated success/failure
  results rather than schema objects. Internal compiler schemas may be wrapped,
  and cleaning alone does not claim to validate a value.
- `drizzle-orm@1.0.0-rc.2-63dd281`: restore `ColumnBuilder.config`,
  `SQLiteSelectQueryBuilderBase.config`, role fields, and seven `getSQL` method
  declarations omitted during packaging. Their types and visibility follow the
  TypeScript sources embedded in the installed JavaScript source maps. Model
  optional role/policy values that the runtime stores as `undefined`, and make
  mutable column builders invariant instead of incorrectly covariant. MySQL's
  protected `session` is not a public key to remove from a union query.
  ESM and CJS declarations are patched together.

The Drizzle patch also imports current D1 types as module types rather than
requiring ambient Worker globals mixed into browser/Bun programs. It removes the
deprecated Miniflare v2 declaration branch. Driver development dependencies
supply the actual Cloudflare, better-sqlite3, MySQL, and PostgreSQL declarations.

PostgreSQL sessions accept both normal and transactional driver clients. This
requires a runtime fix, not just a wider constructor type: normal connections
use `begin`, transaction-only connections use `savepoint`, and transaction
configuration inside a savepoint is rejected before dispatch. Both module formats
have callback-result, nesting, rejection, and error-propagation protocol tests.
These doubles do not establish acceptance against a live PostgreSQL server.

The Elysia patch also repairs runtime model lookup for mixed TypeBox/Standard
Schema registries, the uninitialized-variable error in dynamic parsing failures,
and Standard Schema parsing that previously returned validation envelopes as
successful data. Standard errors are normalized without retaining extra payload
fields; malformed issue envelopes fail closed. Synchronous parsing rejects
asynchronous schemas explicitly, while `Validate` retains async support.
Both ESM and CommonJS use the same strictly checked parsing helper.

`packages/elysia/src/declaration-contract.test.ts` exercises actual Elysia,
TypeBox, and Zod behavior. Its CommonJS fixture runs in a standalone Node
process rather than relying on Bun's already-loaded ESM modules.
Negative fixtures cover statuses, decoded model values, references, model
mapping, macro resolution, and registered guard error narrowing.

Drizzle's restored members have runtime regressions in
`packages/drizzle/src/declaration-contract.test.ts`; transaction dispatch is
covered by `packages/drizzle/src/postgres-transaction.test.ts`. Negative fixtures
in `scripts/fixtures/drizzle-types` preserve builder invariance, hidden sessions,
union method restrictions, and invalid role/policy/driver rejection.
Remaining errors are tracked in `docs/type-safety-status.md`; these patches are
not an approval to ignore them or a promise about unpatched consumers' installs.

Bits UI/Svelte Toolbelt rejection fixtures are in `scripts/fixtures/bits-types`.
Supabase WebAuthn fixtures are in `scripts/fixtures/supabase-types`, with runtime
regressions in `packages/supabase/src/webauthn-contract.test.ts`. Its source
checker reads the actual edited serializer functions and checks them against
shipped SDK declarations; it does not claim to check all upstream SDK source.
The full declaration gate now passes in separate browser/Node and Bun programs.
Do not merge their incompatible globals or re-enable `skipLibCheck` to do so.
