# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

The design-system boundary is intentionally split: Bits UI owns headless
interaction primitives, while Tailwind semantic classes and `tailwind-variants`
own recipes and variant composition. shadcn-svelte is the authoring source for
new components; it is not a parallel runtime library.

## CSS Integration

Import the precompiled stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

Consumers do not need Tailwind. Both component styles and the existing
utility aliases are included in the published native stylesheet. Theme overrides
continue to use public semantic CSS variables; nested themes use `.svadmin-theme`.

`app.theme.css` is retained as a native-CSS alias of `app.css`. It no longer
emits compiler metadata. Import one UI CSS entry, not both. Old host `@source`
directives can be removed; styles are pre-generated, not scanned at consumption.

## Migration Boundary

The package publishes precompiled CSS: consumers do not need to compile library
sources. Tailwind is an authoring/build dependency only; generated APIs are not
a new compatibility commitment.

Existing `svadmin-u-*` aliases and compatibility rules remain native CSS. Do not
rename or delete them mechanically. New styles should use semantic Tailwind
classes and reviewed recipes. This is not a wholesale rewrite of every UI
component.

Button, Badge, content layouts and Surface appearance use the shared
`tailwind-variants` registry. Public props, bindings, semantic class markers and
null-variant semantics remain compatible. Existing component CSS state rules
remain part of the published stylesheet.

The package now permits the `tailwind-variants` recipe helper and the
`shadcn-svelte` generator. The generator is only an authoring tool; published
components continue to use the package's semantic tokens and Bits UI primitives.
Panda configuration and generated helpers are no longer part of the build.

## shadcn Authoring

Run `bun run --cwd packages/ui shadcn:add button` to generate candidate source
under `shadcn/candidate`, not `src`. The isolated configuration uses `$lib` only
inside that sandbox; it does not change published imports or package exports.
Dependencies are recorded in the sandbox without installation.

Review each candidate before adapting it into the existing component. Preserve
semantic tokens, public props, data slots, bindings and accessibility enhancements.
Convert candidate aliases to package-relative imports. Do not publish its CSS
or utilities until they have a tested precompiled build. The generator is not an
OpenUI runtime: schema validation, registry and controlled actions remain owned
by the existing Surface implementation.

The initial `surfaceMetric` and `surfaceTable` recipes cover every public
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
