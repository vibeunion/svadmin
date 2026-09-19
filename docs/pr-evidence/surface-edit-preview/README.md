# Surface edit-preview acceptance evidence

Tested implementation: `e153f71bab911a8d48f0f5eebd2ba0930d4435ab`.
GitHub tested its merge with `510d0b5` as `5b51c07461411dfcf22af2cf157279c54f89471f`.
The accompanying evidence-only commit changes no implementation or test files.

[Successful workflow](https://github.com/vibeunion/svadmin/actions/runs/35412114507)
contains the Node contract and Svelte integration/CSS jobs.
[Browser artifact](https://github.com/vibeunion/svadmin/actions/runs/35412114507/artifacts/10574579085)
contains `1440-light.png`, `1920-dark.png`, `390-light.png` and the original
`provenance.json`. The ZIP SHA-256 was independently checked after retrieval.
Screenshots are actual Chromium captures, not generated UI illustrations. They
were visually inspected at all three viewport sizes: readable labels, separated
actions, retained draft text and no clipping or horizontal overflow were observed.

## Executed checks

- 13 Surface test files / 108 tests passed. The 62 Node contract tests are a subset,
  not 62 additional unique tests.
- Surface strict Svelte/TypeScript check: 0 errors, 0 warnings.
- All workspace package builds and finite Panda CSS generation passed.
- Generated editor CSS is 3647 bytes; checked-in CSS/class mappings match a fresh
  generation, and the locked installation makes no lockfile changes.
- Complete PR `git diff --check` passed.
- Real built-package browser acceptance passed with only the Svelte Vite plugin;
  neither Panda nor Tailwind compiler plugins are used by the consumer fixture.
- Both editor-first/UI-first CSS import orders preserve 16px default panel padding
  and allow a host utility to override it to 24px.
- The title edit's preview, return and explicit apply preserve the input DOM/value
  and one data-source request. The host apply count remains zero during preview
  and becomes one after confirmation.
- Streaming/incomplete input does not replace the current surface or enable apply.
  Invalid JSON displays an error with apply disabled. Host color-token overrides,
  keyboard focus and all three viewport overflow checks pass without page errors.

The controlled fixture uses synthetic read-only order records and a local draft
input. It is not a real-model evaluation, a full business CRUD form, a backend
write or evidence of server authorization. Unit tests separately cover stale
revisions, host failures and explicit session changes. Full repository CI and
independent review remain separate merge requirements; this evidence does not
claim their completion. Actions artifacts have a retention period; rerun
`packages/surface/scripts/browser-evidence.mjs` after workspace builds to regenerate.
