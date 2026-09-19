# Enterprise UI browser evidence

Source under test: `7621ec2103ef0f7ad87899283eedb65b7b7e4b0a`.

Actual exact-head GitHub Actions run: https://github.com/vibeunion/svadmin/actions/runs/35429616363
Original PNGs, unit/browser JSON, source hashes and complete diff: https://github.com/vibeunion/svadmin/actions/runs/35429616363/artifacts/10580391029
Artifact ZIP SHA-256: `fe8672e6798663ed96e6aea003e3f6ab91349f6a9a195f656f9e1a4c17968c87`.

The two WebP files are reduced, lossy previews of actual browser captures, not replacements for original screenshots or functional test reports. Light preview: 320 px wide, from a 1440x900 viewport. Dark preview: 640 px wide, from a 1920x1080 viewport. Both originals use fullPage capture (1475 px image height); viewport size must not be confused with output image size.

Original ready-1440x900-light.png SHA-256: `b206f15a2a13293d1c7a8b69f82505708f8a29d9679cf5d301879e7cf2599047`.
Original ready-1920x1080-dark.png SHA-256: `efbd96d642dff352a66db029cc5332c8e56962557f61a733f730191782f539df`.

The 1920 dark PNG was byte-identical to the prior 46fea4a capture. Its existing preview was reused only after verifying this equality. The light preview was regenerated from the current source artifact. Preview Git blob hashes were verified against local bytes before publication.

The complete artifact contains 12 original PNGs: 1440x900, 1920x1080 and 390x844 viewports; light/dark; ready/invalid. Targeted real Vitest: 160 passed, zero failed or pending. Production Chromium: 10 expected, zero unexpected/flaky/skipped, retries disabled. These tests do not certify the entire enterprise roadmap, complete JSON Schema/Excel support or full assistive-technology accessibility.

This branch only publishes review evidence. It does not merge the implementation, publish packages or deploy an application.
