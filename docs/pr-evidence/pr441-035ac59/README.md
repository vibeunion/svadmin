# PR #441 verification: 035ac59

Implementation: `035ac5950c131e2dba0a50ce750ab9e8b3dc64e6`.
Base: `e594440ad6e143727fb5b8d81f0368d9a9024385`.
Actual Actions checkout: `8720e2943864c81523ed200ae7bd021750ea098d`.

[Controlled workflow run](https://github.com/vibeunion/svadmin/actions/runs/35450707246) and [original artifact](https://github.com/vibeunion/svadmin/actions/runs/35450707246/artifacts/10586835676).

The successful run completed the full workspace package build; 24 Surface test files and 222 tests, including 14 callback-reentrancy regressions; strict Surface and UI checks with zero errors/warnings; 33 selected UI tests; seven selected Lite tests; 1,568 real OpenUI parser checks; four Chromium scenarios; and the isolated same-checkout packed consumer. The `packed-consumer.json` and original PNGs are archived alongside the run provenance and independently checked hashes.

The [SVAR verification](https://github.com/vibeunion/svadmin/actions/runs/35450707257) also passed, including real browser integration. The preceding integration run 35450383650 was not green: its downloaded `browser-tests.json` records 47 passed and one failed assertion for the virtualized Stock column after narrowing the viewport. The new synchronization patch polls actual overflow layout and visibility within the existing budget, retaining theme and overflow assertions. Earlier failures were not hidden or marked passed.

The source includes `bc721dd` callback ownership hardening and the `d2494e8` integration of TypeBox main repairs. Independent local reconstruction matches implementation tree `3c4ff258ba4ac015795244577646823bd02f18a5`; the complete PR tree diff versus main passed whitespace checking (55 changed files). This is supplementary source verification, not a local workspace runtime test.

These are deterministic synthetic workflow fixtures, not measured model-generation accuracy or final product-design approval. The interactive entry still needs a verified published UI peer floor and coordinated release; same-checkout tarballs do not prove an older published package. Resource-workspace tests still emit `derived_inert` runtime warnings despite passing assertions, so zero strict-type warnings does not mean zero runtime warnings.

Overall repository CI was still running when this immutable targeted-evidence archive was prepared. See the PR for its latest status. No merge into main, publishing, deployment or security-gate bypass is recorded here.
