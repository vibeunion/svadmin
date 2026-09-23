# Content component recipes

This continues the no-Tailwind migration from main `ee01ea0b52285bd3129447cd0b2ddb0c114f45ce`,
reconciled with native primitive recipes on main `c91936335e1a431f2ac37dec31da138afbbbc21f`.
It does not apply the old 646-file stage3 patch over newer Surface, typed rendering,
SVAR or enterprise work. No release or deployment is performed by this change.

## Implemented boundary

`ContentPageShell`, `ContentPageHeader` and `MetricBlock` now use named Tailwind
slot recipes in `packages/ui/src/recipes.ts`. Theme-bound content spacing, width,
typography and color tokens come from shared semantic CSS variables. The page
shell owns the vertical stack, while `ContentPageHeader` owns its internal
heading rhythm; clean-flat does not add a second child margin layer.

The three components retain their existing public imports, props, snippets and
DOM structure; density and stable data hooks are additive.
Width is `narrow | default | wide`; page/header density is
`compact | comfortable`; metric trend meaning is
`positive | negative | warning | neutral`. Every variant is generated explicitly.
Consumers import ordinary `@svadmin/ui/app.css`; no consumer-side compiler is needed
in the host app. Helpers are internal, not new public package exports. No AI style
or executable-code inputs, Surface permissions or business-write authority change.

## An intentional color bug fix, not historical zero-difference parity

Actual Chromium comparison exposed a legacy defect: the original MetricBlock emitted
raw `text-success`, `text-destructive`, `text-warning-foreground` and
`text-muted-foreground` names while owned CSS uses mapped classes. The trend meanings
therefore did not reliably select their intended colors. The new recipe binds each
meaning directly to its existing public semantic token. This visible repair is
intentional; the original historical PNGs are NOT claimed identical to the candidate.

The verifier retains THREE captures per scene:

1. Unmodified historical components, read from immutable Git revision `ee01ea0`.
2. Actual candidate components from the built package.
3. The historical DOM with ONLY the four fixture trend leaves' foreground colors set
   to the independently resolved public theme tokens, recorded as the expected repair.

Candidate node text, geometry and all selected computed properties must equal the
historical snapshot with only those four explicit leaf color substitutions. The
candidate PNG must then equal the third capture byte-for-byte. No masks, pixel
thresholds, broad ignored properties or rewritten historical source/CSS baselines are
used. A per-scene record names every changed color and keeps all three PNG hashes.
Eight negative/positive tests prove that unrelated colors, geometry, typography, text,
missing nodes, wrong trend colors and invalid correction targets still fail.

Other compatibility details: long values remain single-line ellipsized; clean-flat
card treatment follows semantic anatomy rather than a deleted bg-card alias; header
alignment still changes at 40rem; loading skeleton geometry and consumer class
hooks stay intact. Undocumented internal utility-composition variables are not a
new supported customization interface.

## Integration corrections

Real full-repository checks also exposed inherited main defects. This slice restores
`percent` to FieldDefinition's finite union (the renderer and scale option already
exist), keeps both fields when editing a null date range, omits absent forwarded
props, removes upload error/URL fields instead of assigning undefined, and gives
import/workspace test hosts independent English i18n scopes. The upload callback
accepts receipt/undefined promises and ordinary Promise<void> callbacks explicitly.
Existing tests and strict compiler/lint rules are retained. New component regressions
cover null date edits, preserved dates/limits, all upload receipt forms and retries.
LiteFilterBuilder retains its native form submission; its unused callback is no
longer destructured. No client hydration is introduced to Lite.

## Reproduction

```sh
bun install --frozen-lockfile
bun run build:packages
bun run --cwd packages/ui test:css
node --test packages/ui/scripts/tailwind-recipes.test.mjs packages/ui/scripts/content-trend-parity.test.mjs
bunx playwright install --with-deps chromium
node packages/ui/scripts/verify-content-recipes.mjs
```

The browser app is built with production Vite/Svelte, not fabricated DOM. The only
historical source relocation is Skeleton's import path; Shell still resolves the
historical Header. Both versions consume the candidate's plain stylesheet: historical
components exercise retained legacy rules; candidate components exercise new recipes.
This does not compare all historic application DOM/CSS bundles.

The 48 scenes cover three viewports (1440x900, 1920x1080, 390x844), both themes, three
widths, ordinary/clean-flat layouts, RTL and opposite-parent nested themes. They
include all trends, zero, long text, loading and action snippets. Each PNG stabilizes
independently. Actions, focus, loading and width changes also have assertions.

`Content recipe checks` retains exact revision, source/CSS hashes and failure logs.
Its final aggregator requires every attempted CSS contract, strict type, lint and
browser check to succeed. A running/planned check is not a passing result. Full
repository CI and application E2E remain separate gates. Non-Chromium, assistive
technology, every application route and the remaining stage3 migration are not
certified by this focused fixture.
