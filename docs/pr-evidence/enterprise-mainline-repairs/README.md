# Enterprise Mainline Repair Evidence

Captured on 2026-11-15 with Chromium, the actual source components and the built UI stylesheet.
The temporary Vite harness is under ignored `output/playwright/harness/`; it does not replace production components.

## State Matrix

| State | Verification | Result |
| --- | --- | --- |
| A4 designer with caller-owned rows | 1440x900.png and 1920x1080.png | Zero quantity and zero amount preserved; decimal rounding and real barcode/QR visible |
| Explicit empty items | UI regression test | No demo rows inserted |
| All three configured copies | Browser print iframe and PDF | 3 isolated A4 PDF pages; no host UI copied |
| 80mm receipt with default columns and 100 rows | Chromium print media measurement | Table 241.89px within 241.89px content width |
| 100mm shipping label with default columns | Chromium print media measurement | Table 317.47px within 317.47px content width |
| Malformed CSV and missing import callback | UI regression tests | Parsing failure is visible; no fabricated import completion |
| Media verification pending, failed and stale | UI regression tests | Awaited callback, repeat-click guard and scope isolation |
| Audio controls | UI regression test | Request callbacks do not invent playback state |

## Checks

- [x] `git diff --check`
- 7 targeted UI test files: 48 passed, including style contracts and two narrow-paper regressions.
- UI-specific `svelte-check` on final source: 0 errors and 0 warnings.
- Targeted ESLint passed.
- Vibe governance passed: 82 files, zero violations.

## Boundaries

Browser printing was intercepted only at the native `window.print` boundary to inspect the real generated iframe.
No physical printer, Safari behavior, backend import or forensic service execution is claimed.
The runtime `svadmin_getDiagnostics` connector is unavailable on this host.
