# Public Vibe Release Acceptance

- Parent: `vibe-authenticated-delivery.md`.
- Source: user explicitly authorized publication and global MCP configuration,
  completed npm login and asked to continue.
- Reason: close the release and original-manifest customer acceptance gates.
- Mode: panel; one writer with independent read-only release review.
- State: original publication complete; all 30 registry versions are available
  and registry-backed package consumers pass. The persistent loading acceptance
  gap is resolved by the follow-up below; CLI patch delivery is tracked in
  release PR #469.
  Authorization URLs and credentials are not recorded.

## Source And Release

- Implementation PR #465 merged as
  `10325c9c5903e28dccca33c71c0f4a4d30ac227d` after candidate
  `ca6a6df029cb76ba8c28a9a62230bf7e3b979fcc` passed CI run `36069719717`,
  including package consumers and E2E, plus independent checks.
- Release PR #467 merged as
  `93022b40ac83a7d4a923def5ee89d415f3b1f273` after candidate
  `064c1dcf46488f5c549bcf915850dc56d2f5a8ad` passed run `36071692591`
  and independent checks.
- Release Please run `36073784149` created the immutable tags and dispatched
  publication. Review verified 30 package versions, 46 workspace dependency
  edges and 21 scaffold dependency edges.
- Core is `0.58.0`, a minor release, not a patch. Existing consumers constrained
  to `^0.57.0` must update their range to receive the declaration dependency fix.
- Publication run `36073869154` initially failed because the npm audit endpoint
  closed its connection. An unchanged-code retry passed tests, type checking,
  builds, audit, packed consumers and E2E.
- Attempt 2 published 28 packages, including create `0.35.0`, core `0.58.0`,
  app `0.2.1`, UI `0.78.1` and AI Elements `0.10.3`. Fresh official-registry
  queries confirmed all 28 exact versions and integrity fields. The only
  missing versions were devtools `0.2.1` and rest `0.2.1`, both rejected with
  npm PUT E404. Both were subsequently bootstrapped as recorded below.
- The final retry of run `36073869154` succeeded, including publication job
  `108041575136`. This is the completed workflow result, not a claim that
  manually bootstrapped packages acquired CI provenance.

## Public Customer Acceptance

- Workspace: `/tmp/svadmin-vibe-public-CGVEdp`.
- Installed `@svadmin/create@0.35.0` from the official npm registry and invoked
  its installed Node CLI to generate the enterprise customer workspace.
- Installed the original generated manifest from the official registry with a
  fresh Bun cache. No local tarballs, workspace links, node_modules symlinks or
  added CSV type dependency were used.
- `bun run check`: architecture passed, Svelte 0 errors and 0 warnings.
- `bun run build`: passed.
- `bun run test:ui -- --workers=2`: 38 passed, covering desktop/mobile,
  CRUD, presets, approval, read-only access and provider states.
- Inspected the generated desktop dashboard and mobile form screenshots:
  aligned readable controls and no page-level horizontal overflow.
- Registry receipts: `registry-receipt.json` in the workspace above.
  Browser evidence: generated app `test-results/`.
  These are historical results; this temporary workspace was cleared during
  a machine restart and is not the current evidence location.

## Persistent Demo Reverification

- Workspace: `/Users/zhd/.local/share/svadmin-vibe-demo-20260925`.
- Regenerated using the installed public CLI, with the original generated
  manifest unchanged; installed 370 packages from the official registry.
- `bun run check`: architecture passed, Svelte 0 errors and 0 warnings.
- `bun run build`: passed.
- First unchanged full browser run: 36 passed, 2 navigation timeouts during
  cold startup. Evidence: `first-run-test-results/`.
- Second unchanged full browser run: 37 passed, 1 mobile loading assertion
  failed. Both initial failures passed. Evidence: `second-run-test-results/`.
- Targeted unchanged retry (`bun run test:ui -- --workers=1 --last-failed`):
  mobile loading failed again at the 60-second test timeout, with a browser
  protocol/session-closed error while awaiting the skeleton. Evidence:
  `test-results/workspace-provider-state-loading-mobile/trace.zip` and
  `error-context.md`. The final page snapshot contains loaded customer rows.
- The demo provider delays loading by 2500 ms, while the test asserts the
  transient skeleton only after navigation finishes. This is a timing risk,
  not a proven sole root cause. No assertion, timeout, or application behavior
  was changed to obtain a pass. Persistent browser acceptance is not 38/38.
- Desktop dashboard and mobile form screenshots from the second run were
  inspected: controls remain readable, without page-level horizontal overflow.
- At this checkpoint, mobile loading remained unresolved. The follow-up below
  supersedes this historical PARTIAL result without discarding failure evidence.

## Registry-Backed MCP

- Installed exact `@svadmin/create@0.35.0` under
  `/Users/zhd/.local/share/svadmin-vibe`.
- Updated only the `svadmin-vibe` global MCP command arguments; retained the
  existing three-tool allowlist and all other global configuration.
- Parsed the saved configuration and used that exact command from `/tmp`
  with the official SDK client. Discovery, search, inspect and PNG preview
  all passed. This is a real registry-backed stdio integration test, not a
  claim of model-driven tool selection inside a newly loaded host session.

## Completed Bootstrap

- Both archives were prepared from immutable release SHA `93022b40`, with only
  the CI-equivalent workspace-range conversion. Devtools was built with its
  release build script; rest retains its source publication layout.
- The original temporary archives were cleared between sessions. Devtools was
  rebuilt under `/Users/zhd/.local/share/svadmin-release-bootstrap-20260925`
  from the same immutable SHA. Its archive digest is identical to the earlier
  reviewed archive. The isolated install used official registry transport with
  unchanged locked versions/integrities; its lockfile was restored afterward.
- Devtools SHA-1: `faf8d33ed82680043add6355043809e0fb235f6d`.
- Rest SHA-1: `ccc3068ef364e866fa2ecd87d7eceb1ff6059290`.
- Each archive contains exactly four expected files and no test fixtures.
- Separate packed-consumer verification passed strict TypeScript, native Node
  devtools import and Bun REST initialization. REST verification uses the
  existing scaffold Refine override/patch and shared GraphQL dependency;
  an unpatched npm-only fixture did not pass upstream Refine declarations.
- Both owner-authenticated manual publications succeeded after browser
  confirmation. Their exact registry integrity fields match the verified
  archives. These uploads have no CI provenance. Do not claim
  future trusted publishing is repaired merely because bootstrap succeeds.
- A fresh official-registry consumer under
  `/Users/zhd/.local/share/svadmin-release-consumer-20260925` passes strict
  TypeScript (`skipLibCheck: false`), native Node devtools import and Bun REST
  initialization, using the existing scaffold Refine patch/shared dependency
  configuration. No local package archives are installed in this consumer.
- All 30 exact registry versions and integrity fields were verified again;
  the machine-readable receipt is `registry-receipt.json` in the persistent
  bootstrap directory. The publication retry completed successfully.

Real backend persistence, production authorization and customer aesthetic
sign-off remain starter integration boundaries, not delivered backend features.

## Loading Acceptance Follow-Up

- Parent: persistent demo acceptance above.
- Source: user explicitly requested "修复和全部完成" on 2026-09-25.
- Reason: resolve the remaining loading test failure in the shipped blueprint,
  then complete source, release and registry-consumer verification.
- Scope: loading-test synchronization, regression coverage and acceptance
  evidence; no changes to demo provider delay or customer runtime behavior.
- Risk/orchestration: medium, native, single writer plus one read-only verifier.
- Coordination: no running tasks in the read-only coordination DB snapshot.
  The agmesh executable is unavailable; no framework install or DB mutation
  is needed for this bounded follow-up.
- Acceptance: focused repeated desktop/mobile loading tests, complete generated
  workspace browser suite, check/build, source CI and published CLI verification.
- State: local and source acceptance complete. Source PR #468 merged as
  `224ab65e6768117a353cf19120ca6f73b0f6e89c`; patch release PR #469 tracks
  `@svadmin/create@0.35.1`.
- Fix: pause the Playwright clock before navigating the loading scenario,
  assert the visible skeleton, advance the real demo delay by 2500 ms, then
  assert visible customer data and no visible skeleton. Isolate Bunny Fonts
  requests only in browser tests, using the existing system font fallback.
  Runtime behavior, DEV-only scenario restrictions and timeouts are unchanged.
- A production-preview experiment was rejected because scenarios intentionally
  remain DEV-only. Its configuration change was fully reverted.
- Final generated-consumer suite: 38/38 passed without retries. Evidence:
  `verified-test-results/` in the persistent demo workspace.
- Final focused loading repetitions: 10/10 passed (5 desktop, 5 mobile), without
  retries. Evidence: `verified-loading-test-results/` in the same workspace.
- Both final runs use the identical installed Chromium revision 1243 copied
  from the external-volume cache to
  `/Users/zhd/Library/Caches/ms-playwright-svadmin`. Earlier initialization
  failures remain recorded; they are not counted as passing retries.
- The tested acceptance file is byte-identical to the source blueprint.
  Check/build pass; focused CLI regression tests pass. Broader local source
  tests encountered external-volume process-start timeouts, and an older
  bootstrap install resolved TypeScript 7 instead of the root's TypeScript 6.
  Neither failed local setup is counted as successful source verification.
- Source CI run `36135598568` passed tests, types, build, audit, packed consumers
  and E2E. All 12 check runs on candidate `a961929c` completed without failure.
- Independent review found no blocking issue. Its regression-test false-positive
  finding was corrected before merge. The mobile loading screenshot was
  inspected; screenshot evidence covers fallback-font layout, not remote-font
  availability.
- Release PR #469 was independently reviewed at
  `aaac8c9e2f9ace1ef92d359347672cc636789385`: only the CLI manifest/package/lock
  versions and changelog change. Publication and public-package receipts belong
  to that release, not to the local test results above.
