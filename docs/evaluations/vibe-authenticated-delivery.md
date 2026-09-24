# Authenticated Vibe Delivery Follow-up

- Parent: `docs/evaluations/vibe-delivery-acceptance.md`.
- Source: user authorized publication and global configuration, completed the
  requested browser login, then explicitly asked to continue.
- Reason: npm authentication is now confirmed; finish the blocked delivery.
- Scope: correct the CLI blueprint compilation boundary, verify PR #465, publish
  the missing app dependency from its immutable release, finish the gated CLI
  release, and verify original-manifest public consumption.
- Mode: panel, high publication risk, one writer with independent read-only
  review. No force-publish, compiler suppression or release-gate bypass.
- Authentication: `npm whoami` succeeded; the account's role in the `svadmin`
  organization is owner. No credentials are stored in this record.
- First-package bootstrap: `app-v0.2.0` resolves to
  `16860e083b1970692b0f0640bc6cd82716b038e9`. Run `36013026945` already passed
  lint, tests, type checking, tarball checks and E2E for that release, but npm
  rejected the OIDC upload with E404. A local authenticated bootstrap may use
  only the same source/version and verified publication manifest; local upload
  must not be described as CI-provenance publication.
- PR #465 at `98b3c5e0` passed the corrected Bun test type checks, then failed
  on TS6059: production CLI code imports blueprint resource definitions outside
  its old `rootDir: src`. Widening the root to the package directory includes
  that shipped source without changing strictness or the Bun `dist/index.js`
  build entry.
- Acceptance remains PARTIAL until registry availability, candidate CI, release
  receipts and real public-package consumption are verified.

## Local Evidence

- Added a regression assertion that shipped blueprint metadata remains inside
  the CLI compiler root and dependency declaration checks stay enabled.
- CLI and packed Node/MCP regression: 105 passed, 0 failed, 1144 assertions
  (`/tmp/svadmin-vibe-authenticated-cli-tests.log`); ESLint and diff checks passed.
- The prior interrupted clean-install worktree still lacks transitive packages,
  so its attempted compiler run is not accepted as typecheck evidence.
  Complete candidate CI remains required.

## Publication And Remaining Gates

- Authenticated manual bootstrap published `@svadmin/app@0.2.0` from the
  immutable source above. The registry now reports version/latest `0.2.0`
  and integrity matching the locally verified archive:
  `sha512-Xoz5Wc2aVEdAIit8rh7aLxiJWMD/SVHLEBpAMH/N+kfoXgZ1eAbSQH91JDw2F7HTVjMaI79BZwWCh9IoLPPbVA==`.
  This upload has no CI provenance; it does not repair future OIDC configuration.
- The isolated app consumer passed strict TypeScript, Vite SSR build and runtime
  smoke after explicitly adding `@types/papaparse`. This auxiliary result is not
  original-manifest customer acceptance: public core `0.57.0` lacks that dependency.
  Source already declares it, so a core patch release remains required.
- Candidate `9dfa7988` passed type checking but failed the pack gate because it
  rejected the intentionally shipped customer acceptance test. The correction
  permits only its exact path in `@svadmin/create`, requires that file in the
  archive, and retains rejection of other test artifacts.
