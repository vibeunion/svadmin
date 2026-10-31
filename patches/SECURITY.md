# Dependency Security Patches

## Scope

Follow-up to PR #489, authorized on 2026-10-03 after the original dependency
upgrade remained blocked. The owner maintains the implementation; two read-only
security reviewers cover the pattern parser and HTTP cache independently.
No product code, publication bypass, or repository-wide dependency upgrade is
included.

The original 19 audit findings are addressed by axios 1.20.0, devalue 5.9.4 and
DOMPurify 3.4.16. `qs` GHSA-6pq8-jhm2-2vcw is cleared by the `qs` 6.17.0 override;
the comma-array fix landed in 6.16.1. deepmerge 4.3.1 still has no upstream
release, so it is patched locally. braces remains patched even though the current
registry response no longer reports it:

The current registry fixes for `follow-redirects` and `minimatch` are selected by
root overrides (`1.16.2` and `11.0.3`). `glob` 7.2.3 is patched only at its
consumer boundary so its legacy `set`/`globSet` and escape semantics remain stable
while it uses the fixed minimatch matcher.

| Dependency | Advisory | Local remediation |
| --- | --- | --- |
| braces 3.0.3 | GHSA-vfj7-8cjw-p6xm | Hard nesting limit of 128 for braces and parentheses; independent bounds in direct AST compile, expand and stringify walkers. |
| http-cache-semantics 4.2.0 | GHSA-ch52-4w7c-c8xp | Security restrictions precede max-stale, stale-while-revalidate and stale-if-error reuse; fresh responses and permitted private/public caching remain supported. |
| deepmerge 4.3.1 | GHSA-gcqx-w48m-w2h4 | `__proto__`, `constructor`, and `prototype` keys are dropped in both merge loops. Results are written with `Object.defineProperty`. Null and undefined targets still merge, and a throwing `in` check stays fail-open so normal keys are not rejected. |

Use `bun install --frozen-lockfile` to apply the tracked Bun patches. Package
versions remain truthful; no version spoofing or advisory ignore flags are used.
These are workspace patches, not an upstream npm release. Root patches do not
automatically protect downstream consumers' separate installations.

## Acceptance Gate

`bun run audit` is the CI entry point. It:

1. Verifies exact overrides, lock entries, patch mappings and SHA-256 hashes
   recorded in `scripts/security-patches.json`.
2. Verifies actual source hashes in every installed matching package, including
   nested and workspace copies; rejects unexpected versions, aliases and entry
   points.
3. Runs only `scripts/dependency-security.test.ts`, including exploit regressions,
   normal behavior and negative integrity/report tests.
4. Runs unfiltered `bun audit --json` against the official npm registry using a
   private temporary snapshot containing byte-identical `package.json` and
   `bun.lock`. This preserves the full dependency graph without loading local
   application `.env` files. The snapshot is removed on success or failure.
5. Prints every advisory. Only an exact package/advisory ID/range/severity tuple
   recorded above can pass as **locally patched**, and only after steps 1-3 pass.
   Any other advisory, source drift, malformed response, timeout, network error
   or inconsistent exit code fails the gate.

Raw `bun audit` still reports deepmerge and exits nonzero.
Do not describe this as an upstream clean audit. The project gate reports
verified local remediation, not zero upstream findings.

The same behavioral test file was replayed against clean npm originals:
10 failures, 1 pass, confirming the regression tests reject vulnerable code.
The patched installation passes. Full-suite and live-deployment acceptance are
separate from this targeted evidence.

## Removal

When upstream releases fixes, replace the overrides with verified fixed versions
and remove the corresponding patch, registry entry and local-advisory allowance
together. Retain the exploit tests and require unfiltered audit to pass before
removing local remediation. Do not auto-update the stored source hashes to make
a failing gate pass.
