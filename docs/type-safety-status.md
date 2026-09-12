# Type Safety Acceptance

Type safety is an acceptance requirement for the public application surface.
It is not a promise that TypeScript proves every runtime behavior, third-party
SDK, executable plugin, or backend authorization rule.

## Done means

1. Public contracts. Callers cannot select arbitrary record or error types on
   `DataProvider` methods and typed hooks. Resource, auth, and command reads
   and writes go through schema-validated contracts.
2. Compile gates. Registered TypeScript programs run with the full strict flag
   set and `skipLibCheck: false`. Coverage and runtime-separation checks fail
   the gate if sources drop out or weaken those flags.
3. Explicit unsafe list. `@svadmin/core/unsafe` has a reviewed inventory in
   `scripts/unsafe-boundaries.json`. Application scaffolds must have none.
   New exceptions require an inventory entry.

Evidence for this definition is a passing `bun run check` plus focused contract
tests for the changed modules. This is not repository-wide 100% coverage of
adapters, cache plugins, or hosted services.

`createSchemaFormValidator` remains the TypeBox adapter for form `validate`
callbacks. Query cancellation still reaches data providers; `AbortSignal` is
peeled before JSON snapshots and reattached for the transport call, and it is
never part of a cache key.

## Evidence

`bun run check:types` passes on this branch. Focused contract and schema-form
tests pass. `packages/lite/src/server-adapter.test.ts` stays out of the mixed
Bun/Vite program and is listed in the backlog.

## Checks

- `bun run check` / `bun run check:types`: strict programs, type-contract
  rejection fixtures, and runtime-separated workspace sources.
- `bun run check:types:dependencies`: coverage plus dependency declarations
  with `skipLibCheck: false`.
- `scripts/check-strict-boundaries.ts`: reviewed `@svadmin/core/unsafe` imports.
- Focused runtime tests for the changed contract and query modules.

## Backlog

Do not block this definition on:

- Adversarial QueryClient cache poisoning beyond the current record-receipt
  decoders
- Select or infinite mapper memoization against in-place cache mutation
- Untagged or dynamic query producers
- Executable plugin isolation
- Provider-specific credential business schemas
- Backend authorization
- Optional Refine declarations when peer packages are absent
- Lite `server-adapter` unit tests that import both `bun:test` and SvelteKit
- A complete inventory of every generated, example, or tooling program
