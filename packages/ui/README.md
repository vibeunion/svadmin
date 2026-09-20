# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

The design-system boundary is intentionally split: Bits UI owns headless
interaction primitives, while Panda CSS owns tokens, recipes, and generated
styles. Park UI is a reference for Panda anatomy and recipe organization, not
a runtime dependency of `@svadmin/ui`; Ark UI and Bits UI are not mixed for
the same primitive.

## CSS Integration

Import the standalone stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

`app.css` includes the generated Panda preflight, semantic tokens, recipes,
component styles, and the compatibility utility aliases. It does not require
a CSS framework, plugin, or build-time stylesheet compiler in the host.

`app.theme.css` is a compatibility-named entry with the same standalone
content. Import one SVAdmin CSS entry, not both:

```ts
import '@svadmin/ui/app.theme.css';
```

Theme overrides use semantic CSS variables; nested themes use `.svadmin-theme`.

## Migration Boundary

Panda CSS owns the design tokens, recipes, preflight, and generated component
styles. The `svadmin-u-*` selectors are frozen compatibility output for
existing consumers; they are not a dependency on the former utility compiler.

The public variant helpers return semantic classes for class-only composition.
Components also expose variant and size data attributes. Primitive defaults
live in the `components` layer so host utilities can override them.

## Validation

```sh
bun run build
bun run test
bun run test:css
```

The CSS tests inspect both published entries, require coverage for every
compatibility utility alias referenced by components, verify that both entries
are standalone Panda CSS, and verify that postprocessing is idempotent.

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
