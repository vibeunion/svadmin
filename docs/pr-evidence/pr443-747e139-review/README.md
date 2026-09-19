# PR #443 current-head review evidence

Implementation: `747e1392f70dfa2294de0254d58b5deffb22309e`.
Actual tested checkout: `a964145dd27b73197846980faf4aaad6ba7f6cf6`.
Source and tested tree: `ed1e01137da1d2da5bac2ffd6ccb80bf2293cffd`.
Integrated main: `8f068fb093b48cd2410b3b28a6066b567a44690e`, tree `e3ee0d61ae70fc9d61cb4c8d52322676fb5ca0a9`.

This evidence-only descendant does not change the implementation branch. It records fresh current-head downloads, not a relabeling of the failed 7613100/0dd3ec5 full CI. Current production code is identical to 7613100, but the source-contract tests now keep Panda build-time definitions out of the Core tooling graph. All former recipe object assertions were moved to the actual UI recipe suite, with additional published-CSS assertions. The original main type configuration, dependency declarations and strict options are unchanged.

## Successful strict workspace verification

[Run 35455261824](https://github.com/vibeunion/svadmin/actions/runs/35455261824), Workspace types job 105929336444, [artifact 10587508600](https://github.com/vibeunion/svadmin/actions/runs/35455261824/artifacts/10587508600).

The downloaded ZIP SHA-256 is `b14186907e413f3d6b745893f768fc933eae86e1f20b7758325a545cd36c02d9`. Its immutable checkout/tree match above and exit-code.txt is 0. Read the full actual log: Core tooling and all remaining strict dependency declaration projects complete, including the four separate core resource fixtures, root browser, Surface, Flow, main example and Lite. Original inventory remains 1975 source files / 1882 browser roots / 94 Bun roots. Svelte reports zero errors and warnings; the existing optional workflow-fixture Vite config diagnostic remains on stderr and is not described as fixed. This is not a local offline compiler claim.

## Fresh original Surface screenshots

[Successful run 35455261854](https://github.com/vibeunion/svadmin/actions/runs/35455261854), [artifact 10588426637](https://github.com/vibeunion/svadmin/actions/runs/35455261854/artifacts/10588426637).
ZIP SHA-256 independently checked: `059f2fbab2bf30f3fa154c69a6628da2a855e7fe552a70e144b1c67b37e77d9c`.

| Viewport | Actual PNG dimensions | Original PNG SHA-256 |
| --- | --- | --- |
| 1440x900 | 1440x900 | dc1a90409e9746c39e1616e92435e62038b6c81c8f1eaf311bbaab04dc4ad2d5 |
| 1920x1080 | 1920x1080 | 1e9699b814e6dc71ef1fa60f8c9329d7fa599bc7bfd8a8d78ff9dc37a5bb86ad |
| 390x844 | 390x1456 full page | 7c24eb31134319f321b51cd2dec1474b8b4d2e84cea82b7792d6553ffae30e96 |

All original PNG bytes were verified against the new download. They happen to match earlier fixture pixels exactly; content-addressed Git blobs were reused only after verifying their complete new-run hashes and provenance. No resizing, masking, product-style substitution or image generation is applied. The newly downloaded 1920x1080 original was visually inspected.

The current `packed-consumer.json` SHA-256 is `1aeaf0322beac84614a2135fb7fa8e392f5471b91602ac1c4edc06a7ffbd93c6`. It records the tested checkout above and `passed`, explicitly for same-checkout core/UI/Surface tarballs, NOT an older published UI version. The original report records package integrities, entry/declaration checks, strict peer install, DOM-free imports, SQLite tenant isolation, interactive browser build and server-code exclusion.

## Fresh Stripe-first specimens

[Successful run 35455261831](https://github.com/vibeunion/svadmin/actions/runs/35455261831), [artifact 10587808235](https://github.com/vibeunion/svadmin/actions/runs/35455261831/artifacts/10587808235).
ZIP SHA-256 independently checked: `45765460348c9985ca01269a57bae0fe2a446cf7d95907e57ba239c2930575e7`.

- Current report SHA-256: `a5398b4313525a79b63211663b3bbb2d61ee8fb8e5cd2e73ed5832d047dfc3fa`.
- All 152 scene entries and four interaction groups report success with no failures. All 152 PNG hashes and 17 versioned source hashes independently match the download and reconstructed source. Generated CSS retains its CI-recorded hash; it was not rebuilt locally.
- Both actual locale keyboard/motion checks pass. keyboard.json SHA-256 is `880189215e62001ce8636ee3343de92a0d0626af62ee7ccbf2eb64caac2a1cb9`.
- The newly downloaded English dark invalid-settings PNG was visually inspected: 390x1424 full page, SHA-256 `6f83dfdac544017b7397118131bdd8748483e87ed11414113e4d8a3cc5a31b9f`.
- The selected original Chinese product-list PNG is archived here at 1440x1000, SHA-256 `5978b7bafba9950502d116960c293c930093c6b82231d359837d9b450593e2cb`. Its existing Git blob was reused only after verifying the current downloaded image bytes. The complete matrix remains in the original artifact.

The actual UI recipe step passed on this head after adding the relocated object assertions and generated-CSS alignment/order assertions. The original screenshot settling, interaction checks, tolerance and source-hash gates remain enabled.

## Separate remaining gates and product limits

Full CI 35455261865 and application E2E are separate merge gates; their completion is not asserted by these specialist screenshots. Evidence metadata must remain tied to the exact reviewed head. Existing derived_inert warnings are not suppressed. Synthetic fixture identity/data/saves do not certify production authentication, record/field authorization, Figma parity, independent human design approval, WCAG coverage or real model-generation quality. Figma synchronization remains false. Surface interactive remains experimental pending coordinated release and published-peer verification. No npm publication is performed by this archival operation; release PR #433 is separate. #434's nested-form/filter semantic reconciliation is not included.
