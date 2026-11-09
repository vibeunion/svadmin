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
outside `bun.lock` still fails the job. `release.yml` runs the same verifier on
the release pull request, so the synchronization is also checked before merge.

## A version that never reached npm

The publication plan used to be exactly the release-please manifest of the
current release, so a skipped or failed publish for release N was never retried
by release N+1. Versions stayed missing permanently (this is how
`@svadmin/core@0.76.0` and `@svadmin/ui@0.114.0` were tagged but absent from
npm).

`bun scripts/plan-release-publication.ts --include-missing` now unions the
release manifest with every workspace package whose current version is missing
from npm, ordered by the workspace dependency graph. The next release repairs
older gaps automatically. To audit or repair by hand:

```sh
RELEASE_MANIFEST='[]' bun scripts/plan-release-publication.ts --include-missing
```

## A package that has never been published

OIDC trusted publishing is configured per package on npmjs.com. A package that
does not exist yet, or whose trusted publisher does not point at
`vibeunion/svadmin` with the release workflow, fails with `E404` while every
other package publishes fine. `@svadmin/charts`, `@svadmin/dock`,
`@svadmin/ai-elements`, `@svadmin/clerk`, `@svadmin/drizzle`,
`@svadmin/editor`, `@svadmin/elasticsearch`, `@svadmin/pusher`,
`@svadmin/storage`, and the ecosystem providers `@svadmin/clickhouse`,
`@svadmin/kinde`, and `@svadmin/openfga` were in that state when this fallback
was added.

The publish job first attempts OIDC trusted publishing. If npm returns `E404`
and the repository `NPM_TOKEN` secret is configured, it retries that one package
once with the bootstrap token and `--ignore-scripts`, then continues the release.
Existing packages still publish with OIDC provenance.

Add `vibeunion/svadmin` as the trusted publisher for newly bootstrapped packages
when possible. Until that is configured, later releases keep using the bootstrap
fallback for those package names and the workflow emits a warning so the missing
trust configuration stays visible. Without `NPM_TOKEN`, `E404` still fails the
job and prints the manual remediation steps.

## Operating rules

- Never re-publish or move a tag whose npm version already exists; the loop
  skips published versions and fails on anything else.
- `force_publish` only bypasses the test/e2e gates for a tag that already
  exists; it does not bypass the lockfile or dependency-closure checks.
- `bun scripts/verify-workspace-lockfile.ts` is the single source of truth for
  the release-commit/lockfile contract.