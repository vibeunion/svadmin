# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

## CSS Integration

Import the precompiled stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

Consumers do not need Tailwind or Panda. Both component styles and the existing
utility aliases are included in the published native stylesheet. Theme overrides
continue to use public semantic CSS variables; nested themes use `.svadmin-theme`.

Existing Tailwind v4 hosts may opt into the legacy metadata entry instead:

```css
@import "@svadmin/ui/app.theme.css";
```

This entry includes the same component CSS plus `@theme` and `@source` metadata.
Import one UI CSS entry, not both. The metadata does not add a Tailwind dependency
to SVAdmin, and plain-CSS hosts should use `app.css`.

## Migration Boundary

Tailwind, its Vite plugin and animation compiler are no longer build dependencies.
Panda is a development dependency for the new semantic tokens and slot recipes;
its runtime class helpers and type declarations do not import the compiler.

Existing `svadmin-u-*` aliases, animation rules and compiled `--tw-*` variables
remain native compatibility CSS. Do not rename or delete them mechanically.
New styles should use native CSS or reviewed Panda recipes, not new uncompiled
Tailwind class strings. This is not a wholesale rewrite of every UI component.

The initial `surfaceMetric` and `surfaceTable` recipes pre-generate every public
variant. Surface applications opt into `styledSurfaceCatalog` and load
`@svadmin/surface/styles.css`; see the Surface package's `STYLING.md`. Default
Surface v1 props and the no-variant rendering path stay unchanged.

## Validation

```sh
bun run build
bun run test
bun run test:css
```

CSS tests pin the original native compatibility rule tree, declarations and
cascade order, check every referenced utility alias, verify the declarations for
all styled recipe slots and variants, and exercise a deliberately missing rule.
They also check nested layer flattening, isolation of generated CSS variables,
postbuild idempotence and both public stylesheet entries.

The repository's Panda compatibility workflow additionally checks strict Surface
types, generated helpers in a dependency-free consumer, and Chromium screenshot
and computed-style comparisons. Its viewport/theme matrix uses actual Svelte
components; it is not a claim of full-application or cross-browser coverage.
