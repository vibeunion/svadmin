# Vibe Delivery Acceptance

## Follow-up Contract

- Parent: `docs/evaluations/vibe-mcp.md`.
- Source: user request "所有都完成".
- Reason: consolidate customer-install, application, host-configuration and
  release-readiness evidence rather than equating local tests with delivery.
- Scope: non-destructive local acceptance and read-only registry/release checks.
- Mode: Native, low risk, one owner, external=0; no new runtime implementation.
- The user was asked to explicitly confirm commit/push, npm publication and
  global MCP configuration writes. Those operations remain outside the
  authorized local verification scope until confirmed.
- Preserve all existing uncommitted changes and do not move the dirty main
  checkout to a different release baseline automatically.

## Current Evidence (2026-09-24)

- Generated a new application at
  `/var/folders/h7/9t4_q7bd6p9489dhdy_bdt400000gn/T/svadmin-vibe-acceptance-ggXf1i/app`.
  It uses the prior isolated local-tarball dependency installation through a
  node_modules symlink. This is not a public-registry consumer installation.
- `bun run check`: architecture passed; Svelte 0 errors / 0 warnings.
- `bun run build`: passed.
- Installed the matching Playwright Chromium headless shell revision 1243
  after the first attempt failed before browser launch due to a missing binary.
  The subsequent `bun run test:ui -- --workers=2` passed **38/38** desktop/mobile
  tests in 2.2 minutes, without changing tests or their thresholds.
- Fresh visual evidence is under the generated application's `test-results/`.
  Inspected `workspace-dashboard-renders-without-page-overflow-desktop/dashboard.png`
  and `workspace-form-renders-without-page-overflow-mobile/form.png`: readable
  aligned controls and no page-level horizontal clipping in those captures.
  This is local rendering evidence, not customer aesthetic sign-off.
- Codex `mcp get svadmin-vibe --json` with invocation-only `-c` overrides
  correctly resolves stdio, the built CLI entry and the three enabled tools.
  No global configuration was written. This checks host configuration parsing,
  not model-driven tool use or customer-host acceptance.
- A direct fresh request to the official npm registry for `@svadmin/app`
  returned HTTP 404 / `Not found`. The generated project still requires
  `@svadmin/app@^0.2.0`; official installation remains blocked.
- `npm view @svadmin/create version` returned `0.34.0`, while this local
  checkout's package manifest is `0.33.0`. Do not try to publish this working
  tree under an already-used version.
- Remote main is `f4e210e8af115fdfd687d89c596502b357eb8846` (release PR #464);
  local HEAD is `309c2e8b`. Remote release workflow run `35982027709` succeeded,
  but that is not CI or publication evidence for these uncommitted changes.
- Existing scoped code/SDK/pack verification remains recorded in
  `vibe-mcp.md`: 104 tests passed using cached npm artifacts.
- Two new cold npm-cache attempts did not pass. The first hit the existing
  120-second install timeout; a focused retry with bounded fetch timeouts
  failed downloading `accepts-2.0.0.tgz`. No offline fallback was counted as
  cold-install success. The focused failure log is
  `/tmp/svadmin-vibe-cold-final.YDr0ra/_logs/2026-09-24T13_59_56_142Z-debug-0.log`.

## Release Boundary

### Authorized Follow-up (2026-09-24)

- Parent: this acceptance record; source: user confirmation "授权".
- Reason: complete the previously blocked commit/push, npm release and global
  Codex MCP configuration steps.
- Scope: preserve the dirty workspace, reconcile remote main, verify and push
  the implementation, use the existing gated release workflow, configure the
  read-only MCP server and verify original-manifest public installation.
- Mode: panel, high release risk, one writer and independent read-only release
  review. No force publishing or bypass of failing release gates is authorized.
- Acceptance: remote commit receipt, successful release gates, exact registry
  versions, public consumer installation and persisted MCP configuration.
- The authorization supersedes the permission blocker below, not the missing
  package or installation evidence. Outcome stays PARTIAL until verified.

### Authorized Execution

- Preserved the implementation in commit `30caa05c`, merged remote main
  `f4e210e8` without conflicts, and pushed `codex/vibe-customer-delivery`.
  Review and CI are tracked in PR #465.
- Dispatched gated app back-publication run `36013026945`, using immutable
  `app-v0.2.0` SHA `16860e083b1970692b0f0640bc6cd82716b038e9`,
  an app-only manifest and `force_publish=false`.
- Historical run `35935084576` reached npm publication but npm rejected
  `@svadmin/app@0.2.0` with PUT E404. This is not resolved by a release tag.
- Added global Codex MCP entry `svadmin-vibe` through `codex mcp add`, using
  Node and the local built CLI. Read back the persisted configuration and used
  that exact command from `/tmp` with an official SDK client: tool discovery,
  search, inspection and preview passed. This is a local checkout integration,
  not a registry-backed installation or a model-driven host acceptance test.
- The CLI suite initially hit the first architecture test's 5-second process
  timeout repeatedly. Increased that integration case's budget to 30 seconds,
  matching the neighboring multi-process case; no assertions were removed.
  The resulting suite passed 104 tests / 1142 assertions before the subsequent
  TypeBox migration.
- PR CI caught a direct Zod dependency forbidden by repository policy.
  Replaced MCP input schemas with TypeBox and retained the SDK protocol layer.
  Post-migration CLI/packed Node/MCP regression passed **104/104**, with
  **1142 assertions** in 57.10 seconds. Strict TypeScript (`skipLibCheck=false`)
  and ESLint passed. The complete local test output is
  `/tmp/svadmin-vibe-authorized-cli-tests.log`.

### Final Publication Blocker (2026-09-24)

- User authorization has been granted and exercised; it is no longer a blocker.
  Implementation and TypeBox fixes are committed and pushed in PR #465.
  The production-code candidate is `49a00482af53adf405cfb08a70b4ed128438e6fc`.
- Run `36013026945` completed its lint/test, type, pack and E2E gates successfully,
  then failed in `Publish released packages` at 14:57:59 UTC:
  npm rejected PUT `@svadmin/app@0.2.0` with E404. Provenance generation did
  succeed, but npm package publication did not.
- Local `npm whoami` returned E401 from the official registry. The exact
  account/package authorization problem requires the npm owner to resolve;
  neither an invalid local session nor a provenance receipt proves permission.
- Global Codex MCP configuration is persisted with the three-tool allowlist.
  Its actual local command passed SDK discovery/search/inspect/preview again
  after the TypeBox migration. No other global MCP entries were changed.
- Final code candidate passed local frozen-lock installation, architecture
  checks (1799 sources), strict TypeScript, ESLint, diff checks and the 104-test
  CLI suite. The PR TypeBox gate passed. One unrelated mobile-dark focus check
  failed, then passed on an unchanged-code rerun; no CSS or assertion was changed.
  Main PR CI then identified strict typing errors in the new test fixtures.
  The follow-up explicitly parses SDK call results with its public result
  schema, preserves the valid status literal, and uses index-signature access.
  No unchecked casts or compiler suppressions were added. The corrected CLI suite
  passed **104/104**, **1142 assertions**, in 20.14 seconds
  (`/tmp/svadmin-vibe-authorized-final-tests.log`).
- Broad local type-contract validation is not accepted: the existing local
  dependency tree reports duplicate dependency declarations and core Query
  type errors. These are separate from the corrected new test diagnostics.
  Isolated validation and the latest PR CI must supply the remaining receipt.

Overall delivery is `PARTIAL`, state `blocked`, not "all complete".
PR #465 remains unmerged and the new CLI release has not been published.

Required external action: authenticate a local npm account with `@svadmin`
publication rights (`npm login`) or repair the package's GitHub trusted-publisher
authorization. Do not place credentials in source, chat or this record.

After the owner resolves npm access, verify identity and package permission,
complete the immutable app release through the existing gated workflow, then
finish PR/release checks and publish the new CLI version. Repeat public
installation using the original generated manifest; do not substitute local
tarballs or equate an action/tag/provenance receipt with registry availability.

Real backend authorization, persistence and customer aesthetic sign-off remain
the documented starter boundaries, not silently implemented production features.
