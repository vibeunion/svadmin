# Native UI styling after the Panda migration

## Runtime boundary

Consumers import published CSS. No Tailwind or Panda plugin is required in their
Vite configuration. The root/UI/AI/example manifests and lockfile must contain no
Tailwind compiler/plugin or class-engine dependency, including npm aliases and
transitive installations. `scripts/check-style-boundary.mjs` also checks production
imports and all built CSS entries, not only top-level package.json files.

`@svadmin/ui/app.css` and the legacy `app.theme.css` path now have identical plain
CSS. `@svadmin/ai-elements/ai.theme.css` is a plain CSS alias of `ai.css`. Legacy paths
remain; compiler metadata does not. Hosts must not rely on those entries to register
utility-language tokens or scan package components.

## Authoring sources

UI, AI-elements and example finite utility declarations live in
`design/migrated-utilities/recipes.json`. The adjacent foundation template owns
native reset/theme/keyframe/registration CSS and records each recipe's original
cascade position. Panda builds the declarations; the assembly step restores stable
public selectors and positions. Build scripts do not read test/style-baselines.

New semantic variants should use the reviewed token/slot recipe contracts. Keeping
a compatibility class is not the same as keeping a compiler dependency. Native
semantic component CSS in Lite, editor and flow has no reason to be translated into
utility classes. This migration does not claim that every component was manually
redesigned or converted to a new semantic-prop API.

## Class composition

The `cn` helper name stays compatible. The external package named `cn` is removed:
it was itself a utility-language engine. Generic conditions use `clsx`; conflict
metadata comes from the actual owned finite CSS, not from a utility-language parser.
Unknown host classes are retained. Known classes are removed only when all their
property effects are covered by later classes in the same recorded condition.
The resolver is conservative about unknown shorthands and host-defined syntax.

Use semantic variants and explicit native CSS for host overrides. The migration does
not promise arbitrary new utility strings or full dynamic utility-parser behavior.
CSS logical/physical shorthand interactions, complex host selectors and cross-browser
behavior deserve application-specific tests in addition to the package fixtures.

## Streaming Markdown

The locked Apache-2.0 `streamdown-svelte` 3.0.6 distribution is retained as an explicit
owned copy under `packages/ai-elements/vendor/streamdown`. Its parser, streaming repair,
URL policy, sanitizers, controls, public props and type declarations remain unchanged.
Only the two class-composition calls in theme.js use the native helper. Original file
hashes and the modification list are recorded in provenance.json; LICENSE and any
NOTICE are shipped with the package. Runtime dependencies are explicitly declared by
AI-elements, with the class engine removed rather than aliased or hidden.

This trades automatic updates of that wrapper package for explicit maintenance.
Review upstream releases/security changes and update the pinned copy deliberately;
never regenerate an unreviewed version or bypass the parser-integrity gate. The other
parser/math/highlighting dependencies remain ordinary package-managed dependencies.
Consumers compiling the full AI package for SSR should include
`@svadmin/ai-elements` in `ssr.noExternal` alongside their existing Svelte/ESM boundary.

## Evidence and non-goals

Tests retain immutable pre-migration CSS baselines, require deterministic regeneration,
check every referenced alias and source declaration, and include negative fixtures for
missing declarations, compiler metadata, npm aliases and class engines. Chromium tests
use actual Svelte components, not generated mock screenshots. Evidence records the
exact tested commit and stylesheet digest. A successful fixture comparison is not
full-application E2E or cross-browser certification.

The separate Surface edit-preview feature in PR #426 is not merged by this migration
branch. Branch integration, independent review, full CI, release and deployment remain
separate decisions. No changes here authorize model-generated CSS, code or backend writes.
