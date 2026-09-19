# Surface integration provenance

## Integrated source histories

Integration commit `0a6d22dbbfbfa68615f99dffa4966062acbc683f` retains the actual
histories of the phase-two preview from PR #426, the native/Panda main
`bdef00a9c9a7340c70b3002d379f5104401e4493` from PR #430, and the final scoped
source-loading fix from PR #428 at
`58abed0b3e89f172d5b0051fc0bd0d52a60dfe40`.
This records source ancestry, not a claim of final merge or test acceptance;
the PR report identifies the final tested head, workflow runs and merge tree.

The original phase-one/phase-two documents and earlier screenshot provenance
remain historical records. Their statements about unimplemented repository-wide
styling refer to those earlier slices. The integrated main already provides
compiler-free native/Panda styles; the Surface feature does not reintroduce
Tailwind or require consumer-side Panda plugins.

## Shared renderer and retained regressions

There is one per-renderer source cache. `source-cache.ts`, `source-cache.test.ts`
and `binding.ts` retain PR #428's implementation. Its incremental and scoped
renderer tests and `ScopedSurfaceHarness.svelte` are also retained byte-for-byte.
The phase-two test file that had the same incremental-test name is preserved as
`SurfaceRenderer.preview-state.test.svelte.ts`; neither suite replaces the other.

Authorization and cache identity use the same owning admin context, including
trusted resource metadata. An owning denial must not fall back to an unrelated
global allow. Request-owner checks prevent late authorization from starting
stale reads. Presentation-only updates reuse unchanged data and local widget
state; session/surface/catalog boundaries remount widget-local state as designed.

`dataScopeKey` remains compatible with PR #428; `scopeKey` is the editor's trusted
scope input. Opaque credential changes require a new non-secret host scope token,
and hosts must discard pending proposals on account or tenant changes. Neither
property is model-controlled. Backend authorization and atomic persisted revision
comparison remain host responsibilities.

## Build and verification boundary

Both build stages run: the scoped preview `editor.css` recipes and the existing
shared design/recipe preparation for `styles.css`. Existing Surface exports and
minimum-supported peer ranges remain unchanged. The lockfile adds only two
Surface workspace devDependency declarations for versions already in main;
resolved dependency versions and frozen CSS baseline bytes are unchanged.

The Node-only contract job prepares the real shared UI design outputs before
running the unchanged DOM-free tests. It does not substitute a mock design schema
or remove a failed test. Prompt generation retains the legacy `Component contracts:`
section while using the single validated catalog manifest.

All temporary source/object workflows are removed from the candidate tree.
Final acceptance requires the integrated head's full repository CI and E2E,
Surface contract/component/type/style/browser checks, package consumers and
native/Panda boundary checks. Earlier runs are not substituted for those gates.
The browser fixture uses synthetic read-only data, not a real-model invocation
or business write. Current-run artifacts, not older Lite screenshots, provide
the Surface preview evidence.
