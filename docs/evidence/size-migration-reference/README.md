# Size Migration Reference

## Task Contract

- Parent: five-part admin UI completion; follow-up to #525.
- Source: #525 browser diagnostics and main `1dc9da6a4f258608d623f1d2f820427fc4300bf5`.
- Reason: the historical browser references omit the size rhythm already shipped by #513.
- Goal: record finite, independent expected migrations while retaining exact geometry, style and PNG comparisons.
- Non-goals: component redesign, historical snapshot replacement, tolerance increases, npm publication or deployment.
- Risk: medium, verification-only. Orchestration: managed, one writer and one read-only verifier.
- Scope: content/native migration references, their focused tests, and this evidence directory.
- Status: local verification and independent diff review complete; PR merge is recorded separately.

## Acceptance

1. Given historical native CSS, when the migration reference is generated, then only the enumerated color, font and table-size declarations change; missing or altered historical declarations fail.
2. Given historical content headers, when the migration reference is applied, then the documented 24px gap, caption/body leading and 65ch description measure match the current baseline without reading candidate styles.
3. Given current published CSS, when the browser compares the candidate with that reference, then geometry, styles and PNG bytes match exactly in both desktop sizes and the existing narrow viewport.
4. Given an unrelated style, text or geometry regression, when parity is checked, then it still fails.

## State Matrix

| Surface | Desktop | Narrow | Theme | Result |
| --- | --- | --- | --- | --- |
| Content recipes | 1440x900, 1920x1080 | 390x844 | light/dark | 48/48 |
| Native UI styles | 1440x900, 1920x1080 | 390x844 | light/dark | 6/6 |
| Primitive fallbacks | 1440x900, 1920x1080 | 390x844 | light/dark | 12/12 |
| Compact published token | 1440x900, 1920x1080 | 390x844 | light/dark | 128 -> 96 -> 112 -> 128px |

The tested source and verifier commit was
`c901d5d60c8b9ead20f8f4d7ac6ed32b22c850e7`; its product source is based on
`main` at `1dc9da6a4f258608d623f1d2f820427fc4300bf5`.
The content historical source was `ee01ea0b52285bd3129447cd0b2ddb0c114f45ce`;
the native historical source was the manifest baseline
`cf6c4746578176ea773a17ef6f49f353292f7818`.
Browser: local Microsoft Edge (Chromium) `155.0.4283.62` on macOS, not a
Linux CI or pinned Playwright-browser certification.

Commands:

```text
node --test scripts/ui-browser-migration-reference.test.mjs
node --test packages/ui/scripts/tailwind-recipes.test.mjs
CHROMIUM_PATH=... node packages/ui/scripts/verify-content-recipes.mjs
CHROMIUM_PATH=... node scripts/check-ui-browser.mjs
```

This evidence proves local source and browser contracts only. It does not prove
package publication, deployment, or authenticated consumer acceptance.

Archived artifacts include the machine-readable reports, fallback contrast
report, and representative light-theme screenshots for `1440x900` and
`1920x1080`. The full matrix remains in the local CI-style reports.

## Verification Boundaries

- Native reference plus published recipe tests: 24/24.
- Content negative parity tests: 8/8; unrelated geometry, typography, text and colors still fail.
- UI package build passed. Its existing `import.meta.env` packaging advisory remains.
- `git diff --check`: passed.
- One independent read-only verifier found no mandatory code fixes.
- Compact override is applied on the state element, then both class and
  override are restored. Ancestor-host inheritance is not separately tested.
- No full repository suite or remote CI polling was used.

## PR Reconciliation

#525 was already merged as `1dc9da6a`. Its historical failure logs were used to
identify these missing migration references, not as current-run evidence.
#509 was closed as superseded after a separate read-only comparison of its
29 changed files against that main revision: shell/panel APIs, size tokens,
exports, docs and compact-number formatting were already absorbed. A redundant
nested `nav` in the Chinese app-shell example remains a separate documentation
follow-up.
