# Native UI migration verification

## Tested implementation and exact evidence

Implementation: `2fd14b02750d1ed9b5b6caf650284a0ea3f8ea72`.
Component-test merge: `a3f40d63d418f0cf2e06f0c84d29b0dc31709dcf`, against main
`510d0b5afe00651916f841a6a4218654d3d6e150`.
Actual browser captures were recorded in `d855e3547fb0ffe9e7253bcc9e944b7e248efa62`.

The [component regression job](https://github.com/vibeunion/svadmin/actions/runs/35415845049/job/105824264605)
completed successfully. Its logs show:

| Executed suite | Result |
| --- | --- |
| UI Vitest | 104 files, 1719 tests passed |
| AI-elements Vitest | 34 files, 177 tests passed |
| AI-elements build/audit script tests | 4 passed |
| Surface Vitest | 8 files, 55 tests passed |
| Core locale source regression | 1 passed |
| Repository lint | Passed |

The separate [native CSS job](https://github.com/vibeunion/svadmin/actions/runs/35415845049/job/105824264879)
passed frozen installation, dependency/import boundaries, all workspace package builds,
14 boundary/metadata/declaration/screenshot-helper tests, 15 CSS tests, deterministic
regeneration and standalone helper runtime/declarations. Declaration coverage checked
1379 UI, 719 AI-elements and 953 example source declarations: 3051 total.
There are 1167 UI, 588 AI-elements and 809 example finite recipe fragments: 2564 total.
These are style fragments, **not component counts**.

That job later failed because it invoked a nonexistent package `check` script.
It is **not an all-green workflow**. The CI command has subsequently been corrected
to invoke the installed strict Svelte checker with each package's actual tsconfig.
The 14 tests, 15 tests and declaration counts describe distinct checks; no contract
subset from another PR is added to these component totals.

## Real browser evidence

[Provenance](panda-styles/provenance.json) records all six passing viewport/theme
cases: 1440x900, 1920x1080 and 390x844, each in light and dark mode. The published
UI CSS SHA-256 is `ef829569f012e6c7aee72da1c587f9f461fbf7a152443547ad7051f9d337ae39`.

Captures use actual Svelte widgets and controls. Each page must produce two
consecutive identical screenshots independently, then baseline and published
screenshots must match with zero tolerance. No baseline is regenerated to match a
new result. Default widgets, token/variant states, nested themes, file input,
focus, details toggling and horizontal overflow checks passed without page errors.
Earlier single-capture runs differed by three pixels with identical collected
computed styles; those failed runs were not relabeled as passes or used as the
successful provenance.

This compares current real component DOM under immutable baseline versus published
CSS. It is not historical-DOM parity, all-application E2E or multi-browser certification.

## Removal boundary

A fresh frozen installation and the resolved lockfile contained no `tailwindcss`,
`@tailwindcss/*`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, or external
`cn` package. The production source and built-CSS gate also passed. UI, AI-elements
and example styling now builds from owned finite Panda declarations; existing
native semantic CSS in Lite, editor and flow remains native CSS.

Both UI CSS entry paths are plain CSS, and the AI legacy theme entry is a plain-CSS
alias. The pack-check contract was subsequently updated to reject compiler metadata
and require the native class helper, vendored Markdown files, license and provenance.
Vendor CSS is explicitly marked as a package side effect. Those distribution changes
require their own latest-head tarball checks and must not be inferred from the older
component test pass.

Public selector names, some legacy CSS variable names and license attribution remain
for compatibility. Their presence is not an active compiler dependency. This migration
does not claim every component was hand-rewritten to a new semantic-prop API.

## Remaining merge requirements

Latest-head strict package checks, the complete tarball/isolated-consumer matrix,
full repository CI, independent review and branch integration remain separate gates.
This report does not claim their completion. No main merge, release or deployment
has been performed. PR #426's separate Surface edit-preview implementation is not
merged by this migration branch; #427 and #428 are not modified here.

The Markdown wrapper is an explicit Apache-2.0 pinned vendor copy. Only theme class
composition changes; original parser/security sources remain hash-checked. Upstream
updates now require deliberate review. See `../architecture/native-ui-styles.md`.
