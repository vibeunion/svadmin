# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

The design-system boundary is intentionally split: Bits UI owns headless
interaction primitives, while Panda CSS owns tokens, recipes, and generated
styles. Park UI is a reference for Panda anatomy and recipe organization, not
a runtime dependency of `@svadmin/ui`; Ark UI and Bits UI are not mixed for
the same primitive.

## CSS Integration

Import the precompiled stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

Consumers do not need Tailwind or Panda. Both component styles and the existing
utility aliases are included in the published native stylesheet. Theme overrides
continue to use public semantic CSS variables; nested themes use `.svadmin-theme`.

`app.theme.css` is retained as a native-CSS alias of `app.css`. It no longer
emits compiler metadata. Import one UI CSS entry, not both. Old host `@source`
directives can be removed; styles are pre-generated, not scanned at consumption.

## Migration Boundary

Tailwind, its Vite plugin and animation compiler are no longer build dependencies.
Panda is a development dependency for the new semantic tokens and slot recipes;
its runtime class helpers and type declarations do not import the compiler.

Existing `svadmin-u-*` aliases, animation rules and compiled `--tw-*` variables
remain native compatibility CSS. Do not rename or delete them mechanically.
New styles should use native CSS or reviewed Panda recipes, not new uncompiled
Tailwind class strings. This is not a wholesale rewrite of every UI component.

Button, Badge, Input and Textarea now select pre-generated Panda recipes. Their
public props, bindings, semantic class markers and null-variant semantics remain
compatible. Migrated instances are excluded from the old primitive defaults at
CSS publication time; the original compatibility snapshot is not rewritten.
Primitive recipes stay in the `components` layer so consumer overrides keep their
priority. Shared theme/focus rules and unmigrated components remain native CSS.

The strict repository check also rejects helper packages (`tailwind-merge`,
`tailwind-variants`) and the shadcn-svelte generator, including transitive lockfile
entries. **The current Streamdown dependency still brings `tailwind-merge`; the
strict check intentionally fails until a behavior-preserving replacement is
verified. Do not describe this migration as fully complete.**

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

The utility migration script is an explicit maintenance operation, not a build
step. It validates the full input set before writing and leaves dynamic
template fragments unchanged for manual review.

Reusable design contracts are exported from the package entry point. Use the
slot helpers for shared field and surface styling instead of adding a second
component styling system:

```ts
import { fieldClasses } from '@svadmin/ui';

const classes = fieldClasses('error');
```
