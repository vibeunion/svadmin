# Panda / native CSS compatibility

## Verified component evidence

The recorded screenshots and `provenance.json` are copied without modification
from the successful `Panda style compatibility` run `35411713064`, artifact
`10574653456`, tested commit `6fe9b80e4a5547c5a0135a8c71118deb1f03fefd`.
They are historical evidence for that exact commit, not automatic evidence for
later changes. Every subsequent compatibility run produces its own artifact.

The complete matrix is 1440x900, 1920x1080 and 390x844, each in light and dark mode.
Actual Svelte metric/table widgets and controls are rendered with native baseline
CSS and then the published stylesheet, in independent browser contexts. Full-page
screenshots match exactly. This compares CSS against the current fixture DOM,
not the old application's DOM or the entire admin application.

Semantic variants separately verify compact/comfortable padding, compact table
font size, metric empty/error borders, nested dark theme token binding, disabled
controls, loading/empty/error states, focus, file input, collapsible behavior and
horizontal overflow. Permissions are covered by Surface unit tests; browser
screenshots do not prove backend authorization or destructive mutation safety.

## Compatibility contract

Baseline commit: `cf6c4746578176ea773a17ef6f49f353292f7818`.
The manifest in `packages/ui/styles-compatibility.json` preserves the CSS rule
tree, declaration order and native source hashes. No baseline values were changed
just to make tests pass. Existing utility aliases, animation rules and `--tw-*`
variables remain native compatibility CSS; they are not active compiler imports.

`app.css` is ordinary CSS. `app.theme.css` is an optional legacy metadata entry
for a host that already uses Tailwind. SVAdmin itself no longer installs or runs
that compiler. Panda generates the new semantic recipes only at build time.

Default `svadmin/v1` remains strict and unchanged. The opt-in
`styledSurfaceCatalog` accepts only the shared tone/density enum. Models cannot
submit arbitrary CSS, class names, recipe definitions or executable code.
Surface packages independent generated runtime helpers, declarations and CSS.
The standalone consumer test uses strict TypeScript with `skipLibCheck: false`
and no installed dependencies.

## Remaining scope limits

Chromium only; not Safari/Firefox, every component, full application E2E, old UI
peer browser validation or an independent review. OpenUI Lang streaming/parser
work and a complete rewrite of historical components into recipes are not part
of this migration. Read the PR's current validation section before merging.
