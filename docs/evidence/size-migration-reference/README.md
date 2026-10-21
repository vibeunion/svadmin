# Size Migration Reference

## Task Contract

- Parent: five-part admin UI completion; follow-up to #525.
- Source: #525 browser diagnostics and main `1dc9da6a4f258608d623f1d2f820427fc4300bf5`.
- Reason: the historical browser references omit the size rhythm already shipped by #513.
- Goal: record finite, independent expected migrations while retaining exact geometry, style and PNG comparisons.
- Non-goals: component redesign, historical snapshot replacement, tolerance increases, npm publication or deployment.
- Risk: medium, verification-only. Orchestration: managed, one writer and one read-only verifier.
- Scope: content/native migration references, their focused tests, and this evidence directory.
- Status: in progress.

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
| Compact published token | host override 112px | N/A | light/dark | passed |

The tested source was `1dc9da6a4f258608d623f1d2f820427fc4300bf5`.
The content historical source was `ee01ea0b52285bd3129447cd0b2ddb0c114f45ce`;
the native historical source was the manifest baseline
`cf6c4746578176ea773a17ef6f49f353292f7818`.

Commands:

```text
node --test scripts/ui-browser-migration-reference.test.mjs
node --test packages/ui/scripts/tailwind-recipes.test.mjs
CHROMIUM_PATH=... node packages/ui/scripts/verify-content-recipes.mjs
CHROMIUM_PATH=... node scripts/check-ui-browser.mjs
```

This evidence proves local source and browser contracts only. It does not prove
package publication, deployment, or authenticated consumer acceptance.
