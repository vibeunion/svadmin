# Browser specimen verification — 2026-09-19

## Actual tested revision

Implementation: `8fa038bfe373b86e9259a0a66b4f17514f6312f0`.
GitHub PR merge snapshot: `4bfb57e103b756a5110eb0e81f81c284c580b8f9`.
This document records that exact run; it does not assign its green status to later code changes.

[Successful browser workflow](https://github.com/vibeunion/svadmin/actions/runs/35443723957)
— job `105898957445`, completed on 2026-09-19 at 12:48 UTC.

| Check | Observed result |
| --- | --- |
| Source-token, model and screenshot-helper unit tests | 35 passed, 0 failed, 0 skipped |
| Frozen installation and actual AI/UI package builds | Passed |
| Strict specimen Svelte type check | 0 errors, 0 warnings |
| 19 states × two themes × two languages × two viewports | 152 / 152 passed |
| Search, navigation, input and save interaction sequences | 4 / 4 passed |
| Keyboard scrolling/focus and motion-preference scenarios | 2 / 2 passed |
| No changes to production packages or bun.lock | Passed |
| Final all-checks-success gate | Passed |

The package build still emits an existing `import.meta.env` portability warning. A successful package build is not a claim that every package is warning-free.

## Open the delivered specimens

[Static site, screenshot gallery and structured reports](https://github.com/vibeunion/svadmin/actions/runs/35443723957/artifacts/10584846256).
Artifact SHA-256: `4c1b1826886d1036f79d8c4f77481e9a205305496efafbaf04dd7309f57fe36d`.
The artifact has 14-day retention and expires on 2026-10-03 at 12:48 UTC; source remains in this branch and can reproduce it.

After extracting the ZIP, open its `index.html` for the screenshot gallery. To run the actual built Svelte application from the extracted directory:

```sh
python3 -m http.server 4179 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:4179` in the browser. The four views are components, customer list, record detail and settings. The theme, language and scenario controls switch the finite specimens. Search, editing and simulated saves operate on synthetic in-memory data, without production writes. Do not open the application's ES module entry using `file://`.

`report.json` records all scenes and source hashes; `keyboard.json` records keyboard and media-preference checks. Screenshots include 152 states and four focused-input captures.

## What changed in this continuation

Previous revision `13b1c5a` had 151 successful scenes and one unstable screenshot, with keyboard checks skipped. The capture now waits for fonts and uses a full-page screenshot rather than repeatedly scrolling an element into view. The existing maximum of eight attempts and two consecutive byte-identical PNGs remain unchanged. Every failed capture keeps its intermediate images and state/geometry/animation diagnostics. Snapshot state is checked after capture, including transient settings states.

This removes the observed failure in the recorded run; it does not prove the historical failure's exact root cause. Full-page captures include the preview controls and are not declared identical to earlier cropped screenshots. No masks, relaxed pixel thresholds or test-injected product styling were introduced. Keyboard verification now runs independently of screenshot success, while the final job still fails if any required check fails.

## Boundaries still open

This is automated verification of real built component specimens, not human approval of visual aesthetics, cross-browser certification, server authorization testing, whole-product E2E or WCAG certification. Repeated PNG equality proves capture stability, not visual equivalence to Stripe, Figma or a previous version.

Figma `r02lMyLBPoaNS3gep3TNRF` was not changed in this continuation: `get_metadata(6:4)` again returned the Starter MCP limit. Input, Badge and the three page patterns remain pending in Figma. Browser completion never changes `figma-map.json` into a false synchronization claim.

[Full-repository CI](https://github.com/vibeunion/svadmin/actions/runs/35443723958) remains red on four unchanged lint problems: the unused `onApply` binding in LiteFilterBuilder, the upload callback's void union, and forbidden global locale imports in the import/workspace tests. Downstream full-CI steps were skipped. Parallel PR #436 contains related production integration work; this design-asset branch does not overwrite it or disable its checks.

PR #438 remains Draft. Nothing was merged into main, published or deployed.
