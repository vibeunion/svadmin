# Surface integration provenance

The phase-two draft reuses the source-cache implementation and its 28 unit tests
from parallel PR #428, commit `a5d19aff0d305c1f0a2fbbf89594c5d962d6b703`.
`source-cache.ts`, `source-cache.test.ts` and `binding.ts` are the same content as
that revision. The superseded phase-two `source-controller.ts` is removed; there
is only one runtime source cache in this branch.

The renderer uses the same request-owner guard and observable provider, logout,
authentication, authorization and tenant identities. The proposal UI additionally
remounts widget-local state at a changed trusted session/surface/catalog boundary.
`dataScopeKey` remains compatible with #428, and `scopeKey` is the editor's trusted
scope input. Opaque credential changes still require an updated host scope token;
never place actual credentials or AI-provided values in either scope property.

PR #428 is not merged or modified by this integration. Its source-loading
component tests remain in that PR; this branch runs the shared cache unit suite,
existing Surface component suite, and the additional revision/preview/state tests.
Before either PR is merged, reconcile their shared renderer changes rather than
keeping two implementations. This draft does not claim independent code review.

The Lite CSS prerequisite is copied unchanged from PR #425 at `1bc31f0`.
Existing evidence for that exact stylesheet/component is recorded at
`docs/pr-evidence/lite-file-picker/provenance.json` in commit `9e5ce35f`.
Those screenshots demonstrate only the Lite file picker; Surface evidence is
collected separately by `packages/surface/scripts/browser-evidence.mjs`.
