# Release publishing

Release tags and npm versions are produced by two separate workflows. Tags and
GitHub releases come from `release.yml` (release-please); the npm packages come
from a `ci.yml` `workflow_dispatch` that `release.yml` triggers after it has
resolved the immutable release SHA.

```
push to main ──► release.yml ──► release-please (tags + GitHub releases)
                     │
                     └──► ci.yml dispatch(publish=true, release_sha, release_manifest)
                              │  test → e2e → publish
                              └──► npm (OIDC trusted publishing, provenance)
```

Because tagging and publishing are separate steps, a tag can exist while the
matching npm version does not. Two failure modes have actually happened, and the
pipeline now tolerates both.

## A release commit with a stale `bun.lock`

`release.yml` synchronizes `bun.lock` and peer ranges on the release pull
request. If that commit is lost (for example when release-please re-creates its
branch after the synchronization push), the release commit carries workspace
versions that no longer match `packages/*/package.json`.

The publish job installs dependencies from the release SHA and previously
failed on `git diff --exit-code -- bun.lock`, which skipped publishing entirely
while the tag and GitHub release stayed in place.

The publish job now runs `bun scripts/verify-workspace-lockfile.ts` after
`bun install` instead: the published tarballs are built from `package.json`, so
the only requirement is that the *final* lockfile is consistent. Any change
outside `bun.lock` and the explicitly restored workflow verifiers still fails
the job. `release.yml` runs the same verifier on
the release pull request, so the synchronization is also checked before merge.

## A version that never reached npm

The publication plan used to be exactly the release-please manifest of the
current release, so a skipped or failed publish for release N was never retried
by release N+1. Versions stayed missing permanently (this is how
`@svadmin/core@0.76.0` and `@svadmin/ui@0.114.0` were tagged but absent from
npm).

Production plans only the explicit release manifest, ordered by the workspace
dependency graph. Unrelated historical missing versions cannot block a valid
recovery. Before emitting any paths, the CLI verifies that the complete plan is
covered by the explicit manifest and that every tag points to `RELEASE_SHA`.
Discovery does not authorize publishing historical versions from newer source.

Recover a missing version by dispatching `ci.yml` with its original immutable
tag SHA and an explicit manifest covering the plan. For example, from the
matching release checkout, validate the plan before dispatch:

```sh
RELEASE_SHA="$(git rev-parse 'refs/tags/core-v0.76.0^{commit}')" \
RELEASE_MANIFEST='[{"path":"packages/core","tag":"core-v0.76.0"}]' \
RELEASE_INCLUDE_MISSING=false bun scripts/plan-release-publication.ts
```

The optional `--include-missing` CLI mode discovers missing workspace versions
but still requires full manifest/tag coverage. If it discovers additional
unapproved versions, it fails rather than silently publishing them. Include
them only when their tags point to the same SHA; otherwise recover them in
separate dispatches at their original SHAs. A missing workspace dependency
always blocks its dependent until that exact version is published or approved
in the same batch.

## A package that has never been published

OIDC trusted publishing is configured per package on npmjs.com. A package that
does not exist yet, or whose trusted publisher does not point at
`vibeunion/svadmin` with `ci.yml`, can fail with `E404`. This response alone
does not distinguish an absent package from missing trust.

CI uses OIDC only and never retries with a long-lived repository token. A scope
owner must manually publish an isolated placeholder for a new package name,
preserving the repository's formal version, then configure its trusted publisher
for GitHub Actions, `vibeunion/svadmin`, workflow `ci.yml`, with direct publishing
allowed. An existing package needs the trust configuration, not another bootstrap.

Every failed registry lookup or publication makes the job fail. The loop still
attempts the remaining packages and reports the aggregate failure, so a green
publication job cannot hide an intentionally unpublished target.

## Operating rules

- Never re-publish or move a tag whose npm version already exists; the loop
  skips published versions and fails on anything else.
- `force_publish` only bypasses the test/e2e gates for a tag that already
  exists; it does not bypass the lockfile or dependency-closure checks.
- `bun scripts/verify-workspace-lockfile.ts` is the single source of truth for
  the release-commit/lockfile contract.
