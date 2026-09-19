# Native UI migration verification

## Scope and reproducible boundary

UI, AI-elements and example utility styles build from owned finite Panda recipes;
Lite, editor and flow retain their native semantic CSS. Consumers import published
CSS and require neither styling compiler. The old UI theme entry now contains the
same plain CSS as app.css; the AI legacy theme entry is a plain-CSS alias.

The active workspace manifests, npm aliases, lockfile, fresh installed graph,
production imports and published CSS are checked for Tailwind compiler/plugins and
class engines. The external cn package is removed; the cn function name remains,
using clsx and finite metadata derived from owned CSS. Arbitrary new utility syntax
is not interpreted. Public CSS names and license notices are retained deliberately.

The Markdown renderer is an explicit Apache-2.0 Streamdown 3.0.6 vendor copy. Only two
theme composition calls change. Original parser, sanitizer, streaming and URL-policy
source hashes are verified. LICENSE and provenance ship. Wrapper updates require
manual upstream review. See ../architecture/native-ui-styles.md.

## Executed implementation evidence

Styling/runtime implementation: 2fd14b02750d1ed9b5b6caf650284a0ea3f8ea72.
Component-test merge: a3f40d63d418f0cf2e06f0c84d29b0dc31709dcf against main
510d0b5afe00651916f841a6a4218654d3d6e150.
Browser captures recorded in d855e3547fb0ffe9e7253bcc9e944b7e248efa62.

[Component regression job](https://github.com/vibeunion/svadmin/actions/runs/35415845049/job/105824264605):

| Executed suite | Result |
| --- | --- |
| UI Vitest | 104 files, 1719 tests passed |
| AI-elements Vitest | 34 files, 177 tests passed |
| AI-elements build/audit tests | 4 passed |
| Surface Vitest | 8 files, 55 tests passed |
| Core locale source regression | 1 passed |
| Repository lint | Passed |

CSS verification preserved 1379 UI, 719 AI-elements and 953 example declarations:
3051 total. Registries contain 1167 UI, 588 AI-elements and 809 example finite
recipe fragments: 2564 total. These are style counts, not component counts.
The gate also passed 15 CSS tests, 14 negative/metadata/screenshot helper tests,
deterministic regeneration and standalone runtime/declaration checks.

An earlier combined job failed after the CSS checks because it invoked a nonexistent
UI package check script. The command was corrected to the installed Svelte checker
with explicit tsconfig paths; failed historical runs are not relabeled as passes.
Both Native UI Styles and Panda compatibility workflows subsequently passed on
549f4baf4016d87f9494e6d4106dc63245b42413.

## Distribution and strict types

[Final package verification](https://github.com/vibeunion/svadmin/actions/runs/35416297482)
completed successfully. It checked native package builds, the full tarball and
isolated-consumer matrix, explicit strict UI/AI types and complete-PR whitespace
against main. The log artifact records zero Svelte errors, and successful npm/pnpm
AI consumers and Surface packed consumers. The tarball contract requires both
compiler-free CSS entries, native helpers, vendored files, LICENSE and provenance.
Vendor CSS is explicitly retained as a side effect.

## Real browser evidence

[Provenance](panda-styles/provenance.json) records six passing viewport/theme cases:
1440x900, 1920x1080 and 390x844, each in light and dark mode. UI CSS SHA-256:
ef829569f012e6c7aee72da1c587f9f461fbf7a152443547ad7051f9d337ae39.

Actual Svelte fixtures must first produce consecutive identical captures independently.
Baseline and published screenshots are then compared with zero tolerance. No baseline
is rewritten to match new results. Default widgets, variant/state bounds, nested
themes, file selection, focus, details toggling and overflow checks passed without
page errors. This is current-component fixture parity, not a claim of every historical
DOM, full-application interaction or browser engine being identical.

## Full-suite merge repairs

Commit 0a7fa2c2560ab91848fec9dce2b12b965d964264 fixes two issues exposed by the full
repository test invocation rather than by package-only tests:

- The generated example stylesheet now lives at example/styles/compatibility.css,
  separate from hand-authored application sources. Its bytes are unchanged; the
  import, generation destination and deterministic-output CI gate move together.
  The existing semantic-color test is unchanged and still scans every authored
  Svelte, TypeScript and CSS file in example/src. Finite declaration and dependency
  checks continue to cover the generated stylesheet.
- SSO test fixtures capture and restore the original window/fetch property descriptors
  instead of deleting native fetch after each case. Explicit restoration assertions
  prevent pollution of later CLI inference tests in the same Bun process.

The targeted regression command passed 69 tests locally and in the guarded repair
job before committing. Example CSS regeneration was byte-identical and the complete
PR whitespace check was repeated. The temporary source-repair workflow was retired;
normal verification has no source-writing permissions.

## Merge and release record

Latest-head full repository CI and E2E results, the reviewed head and eventual merge
SHA are recorded in PR #430. Historical package or fixture passes must not substitute
for a failed current-head gate. Owner approval permits merging after verification;
it does not request a release or deployment. The separate Surface edit-preview work
in PR #426 is not merged by this branch.
