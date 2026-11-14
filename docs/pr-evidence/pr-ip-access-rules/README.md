# IP Access Rules PR Evidence

## Contract

- Source / parent: PR #798, initial head `8e2b72c7`.
- Reason: user requested an Arco-style enterprise suite PR; continue the existing PR and correct its review findings.
- Goal: strict IP/CIDR/range parsing, temporary-rule preservation, current-IP detection adapter, local lockout prevention, and accessible Arco editor/drawer.
- Non-goals: production ACL enforcement, deployment, merging, other roadmap suites, unrelated example changes.
- Risk / orchestration: high / bounded panel, one writer and two independent read-only reviewers.
- Writer scope: IP suite source, tests, dependency declaration, bilingual enterprise section, dedicated browser fixture and this evidence directory. A backward-compatible `Sheet.closeOnOverlayClick` flag is required to preserve form drafts; its default remains unchanged.
- Acceptance: focused parsing and behavior tests, Arco/style contracts, deterministic build, governance, desktop/mobile screenshots, nested keyboard flow and independent final review.
- Runtime note: `agmesh` and `stack-profile-selector` were unavailable. No installation or project-rule deployment was performed. The requested default subagent model is unavailable in the current host catalog; reviewers inherit the host model.

## Boundaries

The browser fixture uses documentation-range IPs and in-memory callbacks.
Its screenshots are local UI evidence, not server ACL or production acceptance.
The server must independently authenticate, scope and atomically validate policy writes,
resolve client IPs through trusted proxy configuration, and enforce matching DENY-first,
address-family and clock semantics.

## Local Evidence

- PASS: 55 direct source parser/safety assertions covering IPv4/IPv6/mapped addresses, strict CIDR prefixes, ascending ranges, DENY order independence and exclusive expiration boundaries. These are Bun/node:assert checks, not a passing Vitest suite.
- PASS: focused ESLint over the IP source/tests, shared Sheet and dedicated fixture, with zero warnings.
- PASS: Vibe Governance, 79 files, zero architectural violations.
- PASS: production Vite browser-fixture build.
- PASS: `browser-results.json`: Chrome 157.0.8103.51 at 1440x900, 1920x1080, 375x812 and 812x375, light/dark themes and reduced motion; nested focus containment, Escape order/focus restoration, local lockout prevention, exact expiration preservation and no page-level horizontal overflow. All eight viewport/theme cases passed with zero browser runtime errors.
- PASS: stale edit, asynchronous rule-save and asynchronous mode-switch conflicts preserve newer host policies. Pending writes prevent closing the editor or switching mode; backdrop clicks preserve drafts. Modal width and viewport bounds are asserted in the browser.
- Panel: two independent read-only reviewers, two bounded rounds. Findings included stale-edit/stale-save overwrites, DST activation drift, modal width cap, backdrop draft loss, unused busy contract and low-contrast status text. Remediation uses policy snapshot checks, unchanged-ISO preservation, explicit modal max-width, the shared Sheet flag, an omitted drawer busy prop and shared subtle Badge variants. Final regression evidence is recorded by the browser script; this is not a claim of a separate final reviewer sign-off.
- BLOCKED locally: Node Vitest forks (including single-worker mode) and threads failed to start before their timeouts; no test count or passing suite is claimed. The final five-file single-worker attempt exited 1 after 305.83 seconds with five worker-start errors and zero tests executed. A Bun-hosted attempt also stalled and was terminated. The whole UI package build was terminated after approximately 20 minutes without progress beyond the packaging phase. The fixture production build is separate, narrower evidence.
- Unavailable: this chat exposes neither `svadmin_getDiagnostics` nor `svadmin_getSelfHealingPrompt`; no zero-diagnostics claim is made.

Run the fixture with `bun run vite --config scripts/fixtures/ip-access-rules/vite.config.ts`,
then run `node scripts/fixtures/ip-access-rules/verify-browser.mjs`. The browser script
uses installed Chrome and emits the screenshots and JSON result in this directory.

Execution state: PARTIAL / blocked on full test-suite, package-build and diagnostics
acceptance. PR submission does not merge, deploy or publish. Remote CI must be evaluated
on the submitted head independently of these local results.
