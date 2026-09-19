# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

## CSS integration

Import the precompiled stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

Consumers need neither Tailwind nor Panda compiler plugins. Component styles,
finite utility aliases, animation rules and public theme variables are included.
Nested theme scopes continue to use `.svadmin-theme`.

The old `@svadmin/ui/app.theme.css` path remains available, but now contains
**the same plain CSS as `app.css`**. It no longer supplies `@theme`, `@source`,
or any other compiler metadata. Import one entry, not both. A host using its
own styling compiler must configure that compiler independently.

## Authoring and compatibility

UI, AI-elements and example utility styles are now authored from the owned finite
registries under each package's `design/migrated-utilities` directory and emitted
by Panda during repository builds. They are not copied from a historical compiled
stylesheet during production builds. Original selector names and cascade positions
remain stable, so existing components do not require a mechanical class-name rewrite.
Native semantic CSS in Lite, flow and editor remains native CSS.

Panda is build-only. No Tailwind compiler, `cn` class engine, `tailwind-merge`, or
`tailwind-variants` is required in the active dependency graph. The public helper
name `cn` remains, but its implementation uses generic conditional class composition
and finite property metadata generated from the owned stylesheet. It removes an
earlier known class only when all its declarations are covered by later known
classes. Unknown host classes are kept; arbitrary utility syntax is not interpreted.
Use semantic variants, native CSS or finite recipes for new styles.

Existing `svadmin-u-*` aliases and some compiled custom-property names are compatibility
interfaces, not compiler dependencies. Historical snapshots and license notices are
retained for regression tests and attribution. Do not delete them to make a text
search appear empty.

The `surfaceMetric` and `surfaceTable` slot recipes pre-generate their public
variants. Surface hosts opt into `styledSurfaceCatalog` and import
`@svadmin/surface/styles.css`. Default Surface v1 props stay compatible.

## Verification

From the repository root:

```sh
bun install --frozen-lockfile
bun run build:packages
bun run --cwd packages/ui test:css
node scripts/build-migrated-ui.mjs ui ai-elements example --check
node scripts/build-native-classnames.mjs ui ai-elements --check
node scripts/check-recipe-declarations.mjs
node scripts/check-style-boundary.mjs
```

Checks cover both CSS entries, referenced selectors, every finite recipe's source
declarations, deterministic regeneration, known-class conflict metadata, dependency
aliases and the resolved/installed graph. Historical baselines remain immutable.
Real Svelte fixture tests compare Chromium screenshots and computed styles across
viewport and theme variants. Fixture parity is not a claim of every application
page, every interaction or every browser being pixel-identical.

See `docs/architecture/native-ui-styles.md` for the full migration boundary and
Markdown dependency ownership.
