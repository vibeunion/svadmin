# @svadmin/ui

Svelte 5 admin components using semantic design tokens and Bits UI primitives.

## CSS Integration

For a host without Tailwind, import the precompiled stylesheet once:

```ts
import '@svadmin/ui/app.css';
```

No Tailwind plugin is required in that host. Both component styles and the
transitional utility aliases are compiled into the published stylesheet.

For a Tailwind v4 host that also generates its own utilities:

```css
@import "tailwindcss";
@import "@svadmin/ui/app.theme.css";
```

The theme entry includes the same precompiled component styles, plus the
semantic `@theme` metadata. Import one SVAdmin CSS entry, not both.
Theme overrides use semantic CSS variables; nested themes use `.svadmin-theme`.

## Migration Boundary

Tailwind and its animation helpers remain build-time tools. The UI package no
longer declares `tailwind-variants` or `tailwind-merge` as runtime dependencies.
The source still contains transitional utility aliases; this is not a complete
rewrite to hand-authored CSS.

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
migrated utility alias referenced by components, compile a Tailwind host, and
verify that postprocessing is idempotent.

The utility migration script is an explicit maintenance operation, not a build
step. It validates the full input set before writing and leaves dynamic
template fragments unchanged for manual review.
