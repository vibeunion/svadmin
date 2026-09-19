# Content component recipes

This change continues the no-Tailwind migration on main `ee01ea0b52285bd3129447cd0b2ddb0c114f45ce`.
It does not apply the old 646-file stage3 patch over newer Surface, typed-rendering, SVAR,
or enterprise changes. It does not replace the parallel native primitive migration.

## Implemented boundary

`ContentPageShell`, `ContentPageHeader`, and `MetricBlock` now use named Panda slot recipes.
The recipes are maintained in `packages/ui/design/content-recipes.ts`; theme-bound content
spacing, width, typography and color definitions live in `content-tokens.ts`.

Public component imports, props and snippets are unchanged. Width remains
`narrow | default | wide`; metric trend meaning remains
`positive | negative | warning | neutral`. No new arbitrary CSS or style-definition
input is accepted from AI. Surface schemas, permissions, source loading and business
mutations are unchanged. Generated helpers are internal implementation details,
not new public `@svadmin/ui/recipes` exports.

The build explicitly generates every supported width and trend variant. Consumers
continue to import precompiled `@svadmin/ui/app.css`; neither Panda nor Tailwind is
required in an application. Existing CSS and selectors remain for unmigrated components.
This is not a claim that all components or pages use semantic recipes already.

## Compatibility details

- A long metric value remains a single ellipsized line. The previous local stage3
  proposal's `overflowWrap: anywhere` changed this behavior and is not adopted.
- The clean-flat card treatment follows component semantics instead of requiring the
  removed `bg-card` alias on the metric root.
- Header alignment still changes at 40rem. Breadcrumbs do not gain new wrapping,
  and loading skeleton geometry is retained.
- Existing public theme variables supply the new namespaced tokens. Nested theme
  roots must use the established `.svadmin-theme`, `.dark`, or `[data-theme]` boundary.
- This migration does not preserve undocumented internal `--tw-*` composition hooks
  on the three migrated components. Host-owned ordinary classes remain accepted.

## Reproduction

From a checkout with the repository's pinned Node and Bun versions:

```sh
bun install --frozen-lockfile
bun run build:packages
bun run --cwd packages/ui test:css
node --test packages/ui/scripts/content-recipes.test.mjs
bunx playwright install --with-deps chromium
node packages/ui/scripts/verify-content-recipes.mjs
```

The browser verifier reads the three original Svelte components directly from immutable
Git revision `ee01ea0`, changing only the baseline Skeleton import's location. It builds
both baseline and candidate components using Vite/Svelte and the candidate's plain CSS,
then serves the production bundle. No Panda compiler plugin runs in the fixture app.
The historical components still use unchanged legacy rules; candidate components use
only the new recipes. This tests actual generated component output, not fabricated DOM.

There are 48 planned cases: three viewports (1440x900, 1920x1080, 390x844), light/dark,
three widths, ordinary/clean-flat layout, plus RTL and opposite-parent nested-theme
cases. Each contains all trend meanings, zero, long text, loading, and action snippets.
Each screenshot must independently stabilize; PNG bytes and selected computed styles
and geometry must match exactly. Animation is disabled only for screenshot capture.
Action callbacks, focus, loading and width changes are also exercised.

The Node contracts require published declarations for slots/variants and include a
missing-variant negative test. A class mentioned only inside `:not()` is not evidence
that its required style exists.

`Content recipe checks` collects step logs and exact source/CSS hashes. Its final job
fails unless contracts, strict types, lint and browser checks all succeed, even though
individual checks continue to collect diagnostics. A planned or running case is never
recorded as passing. Current results are the exact-revision workflow artifact, not
historical screenshots or earlier PR green checks.

## Not certified by this slice

Full stage3 migration, all application routes, non-Chromium rendering, assistive
technology coverage, arbitrary host utility overrides, and release/deployment are
not certified by the dedicated fixture. Full repository CI remains a separate gate.
