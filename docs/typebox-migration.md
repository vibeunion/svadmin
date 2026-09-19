# TypeBox schema policy

Maintained svadmin schemas use the workspace's `@sinclair/typebox` 0.34 line.
This migration removes the remaining direct Zod development dependency and
Zod imports from Elysia runtime/declaration fixtures. It does not introduce
the separately versioned `typebox` package or change Surface's public protocol.

## Elysia compatibility tests

Elysia's TypeBox and Standard Schema paths are different contracts. Deleting
Standard Schema tests when removing Zod would leave the local Elysia patch
unprotected. The test-only `packages/elysia/test/typebox-standard-schema.mts`
therefore uses TypeBox's real compiler and decoder behind a small Standard
Schema boundary. It is not exported or shipped by `@svadmin/elysia`.

The fixtures retain decoded output types, mixed-registry isolation, invalid
input rejection, malformed-issue rejection, and path sanitization. Native
TypeBox transform/model-reference tests remain in place. Both ESM/Bun and a
standalone Node/CommonJS process exercise synchronous and asynchronous parsing.
The async fixture tests the Standard Schema protocol; it does not claim native
asynchronous refinement support in TypeBox.

The bridge validates strictly before decoding. It does not implicitly coerce,
apply defaults, or strip additional fields. Required/optional/nullable semantics
and `additionalProperties` remain properties of the explicitly supplied schema.
TypeBox JSON Pointers are unescaped into Standard Schema path segments before
Elysia normalizes them again. Error envelopes do not include input payloads.

The package's test configuration permits explicit TypeScript import extensions
for the Node-native `.mts` fixture. All strict flags and declaration checks stay
enabled; `skipLibCheck` remains false.

## Dependency boundary

Remove direct Zod dependencies and imports from maintained workspace code.
Do not alias Zod to TypeBox: their runtime APIs are not interchangeable.
Third-party transitive dependencies must be assessed separately; a Zod entry
in `bun.lock` alone is not evidence that svadmin still defines Zod schemas.
Historical changelogs, checkpoint records, and dependency-auditor negative
fixture strings are intentionally retained.

## Verification

Use the pinned Bun and Node versions from CI. Run frozen-lockfile installation,
then lint and the focused runtime/declaration checks:

```sh
bun install --frozen-lockfile
bun test packages/elysia/src
node node_modules/@typescript/native/bin/tsc -p packages/elysia/tsconfig.json --pretty false
node node_modules/@typescript/native/bin/tsc -p scripts/fixtures/elysia-types/tsconfig.json --pretty false
node node_modules/@typescript/native/bin/tsc -p scripts/fixtures/elysia-types/tsconfig.runtime.json --pretty false
```

These are focused migration checks, not a substitute for the repository's full
build, lint, test, type-check, and browser acceptance gates.
