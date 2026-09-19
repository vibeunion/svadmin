# PR #443 exact-head review evidence

Implementation: `761310059dc0845311f3ffe9aec9c4a5bf53b6d2`.
Actual PR checkout: `6348beb020e94bb5aecbe0934023fff51e18322d`.
Both have tree `718f91308d467eae3df98b833b1c8ba8d7894cac`, independently reconstructed from the source archive and reviewed deltas. Base main is `8f068fb093b48cd2410b3b28a6066b567a44690e`, tree `e3ee0d61ae70fc9d61cb4c8d52322676fb5ca0a9`.

These PNGs are the original unmodified bytes freshly downloaded from successful Surface run [35454111997](https://github.com/vibeunion/svadmin/actions/runs/35454111997), artifact [10587662395](https://github.com/vibeunion/svadmin/actions/runs/35454111997/artifacts/10587662395). ZIP SHA-256 was independently checked as `ffb36f0888927abb9e484e6ea328178550a4d7c499892527bc58b5d1f1147c25`. The fixture happens to produce byte-identical PNGs to earlier runs: the existing content-addressed Git blobs were reused only after verifying the new download's complete bytes/hashes. No old run result is substituted for this run's validation. No resizing, masking, drawing or image generation is applied to these archived PNGs.

| Viewport | Actual bitmap | Original PNG SHA-256 |
| --- | --- | --- |
| 1440x900 | 1440x900 | dc1a90409e9746c39e1616e92435e62038b6c81c8f1eaf311bbaab04dc4ad2d5 |
| 1920x1080 | 1920x1080 | 1e9699b814e6dc71ef1fa60f8c9329d7fa599bc7bfd8a8d78ff9dc37a5bb86ad |
| 390x844 | 390x1456 full page | 7c24eb31134319f321b51cd2dec1474b8b4d2e84cea82b7792d6553ffae30e96 |

Both desktop original PNGs were visually inspected. The archive's `packed-consumer.json` has SHA-256 `b5e3266657c8f059433d35ae8939f3f6be0a5a75815557c346a1c297f2b1a1d4` and reports `passed` for this checkout, explicitly only a same-checkout tarball combination, not compatibility with older published UI packages. Its checks cover exports/declarations, strict peer install, DOM-free imports, SQLite tenant isolation and the browser/server packaging boundary.

## Current Stripe-first product specimens

Freshly downloaded [run 35454111987](https://github.com/vibeunion/svadmin/actions/runs/35454111987), artifact [10588330136](https://github.com/vibeunion/svadmin/actions/runs/35454111987/artifacts/10588330136), uses the same checkout. ZIP SHA-256: `ea57c7a3ec0adf4043caa9e189801803ca8d13c2ac60d7a8cbb7ec5b463ca999`.

- `report.json` SHA-256: `bea36cb197d8b8500baadccf406781a2854eaf97d3f4ee39e1bc2b4d463d9c67`.
- All 152 recorded scenes and four interaction groups report success with zero failures. All 152 PNG hashes and 17 versioned source hashes were independently verified. The built CSS hash is preserved in the original CI report, not reconstructed or claimed rebuilt locally.
- `keyboard.json` SHA-256: `880189215e62001ce8636ee3343de92a0d0626af62ee7ccbf2eb64caac2a1cb9`; both locale checks pass, with actual keyboard scrolling and motion-preference checks.
- Visually inspected `resource-list-ready-light-en-1440.png` (1440x1000, SHA-256 `77a48aba2e9d06658137021c74254888f1cb07f040564f2469b2326a656a0156`) and `settings-invalid-dark-en-390.png` (390x1424 full page, SHA-256 `6f83dfdac544017b7397118131bdd8748483e87ed11414113e4d8a3cc5a31b9f`). They remain in the original current-run artifact, not replaced with older specimen images.

This evidence branch does not modify or retest the implementation. General repository CI and application-wide E2E remain separate merge gates; their success is not asserted by these screenshots. Fixtures use synthetic data and mock product saves, not production authentication or backends. This is not final Stripe/Figma design equivalence, WCAG certification, model-generation quality, a coordinated package release, deployment or distributed exactly-once execution proof. Figma synchronization remains explicitly false in the updated design source provenance.
