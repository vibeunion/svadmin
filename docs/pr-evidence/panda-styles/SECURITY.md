# Build dependency security follow-up

The migration's raw `bun audit --json` report identified Browserslist <=4.28.6 and Panda's nested postcss-selector-parser 7.1.1. The workspace already had selector-parser 7.1.5 at the root; updating only that root entry would not fix the nested dependency.

- Browserslist is pinned to 4.28.7 for GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g.
- `@pandacss/core>postcss-selector-parser` is scoped to 7.1.5 for GHSA-w9m9-85wc-3x92. The documentation toolchain's parser 6.1.4 remains untouched.

Upstream advisories:

https://github.com/advisories/GHSA-c83g-rgw3-j3cx
https://github.com/advisories/GHSA-73wf-gq98-2v4g
https://github.com/advisories/GHSA-w9m9-85wc-3x92

Only these dependency resolutions changed; existing patches, workspace constraints and unrelated packages were checked for equality before committing the lockfile. The scoped override uses Bun lockfile version 3: use the repository's declared Bun 1.4.2 for development. Published component consumers still do not require Bun, Panda or Tailwind.

The normal `bun audit` gate remains enabled, with no severity filter or advisory ignore list. The read-only audit job additionally records the unfiltered JSON, exact lockfile, installed tree and tested commit. The one-time lockfile writer is removed after resolution.
