# Vibe Catalog and Architecture Follow-up

## Contract

- Parent: `docs/evaluations/vibe-starter.md`.
- Source: user confirmation "实施" after the reference-project architecture proposal.
- Reason: make shipped design materials searchable and give generated customer
  projects executable module boundaries.
- Mode: Native, medium risk, one writer and one independent read-only verifier.
- Scope: create CLI catalog/inspect, starter architecture gate, public headless
  feature entrypoint, focused tests and customer guidance.
- Non-goals: new UI styling, generic plugin runtime, microservices, MCP transport,
  production authorization, publishing, deployment or modification of customer apps.
- Preserve the existing uncommitted starter. This follow-up does not change its
  recorded registry-publication blocker.

## Acceptance

- Search six real page families by ID, intent, component and bilingual tags.
- Export source and shared contracts/design/acceptance as read-only JSON context.
- Preserve catalog-without-flags compatibility, dry-run init and strict errors.
- Run the generated architecture gate as part of `check`.
- Parse imports using the existing TypeScript 6 compiler dependency and Svelte
  compiler; no new runtime package or handwritten source-code import regex.
- Reject private feature/package imports and uncheckable computed/alias imports.
- Verify generated source and the built/packed CLI separately from registry
  availability. Deterministic checks do not prove visual taste or production readiness.

## Evidence (2026-09-24)

- `bun run --cwd packages/create-svadmin test`: 95 passed, 0 failed,
  1081 assertions. Includes actual npm pack extraction and Node execution of
  catalog search, inspect and init, without repository-relative material reads.
- CLI build passed as part of that pack gate.
- Focused strict TypeScript check of `vibe-catalog.ts`: passed with
  `skipLibCheck: false`, unchecked-index and exact-optional checks enabled.
- Changed CLI/test/checker files: ESLint passed with zero warnings.
- Repository `bun run check:architecture`: passed for 1798 source files.
- Fresh generated consumer:
  `/var/folders/h7/9t4_q7bd6p9489dhdy_bdt400000gn/T/svadmin-vibe-followup-final-6tHUv6/app`.
  `bun run check`: architecture passed, Svelte 0 errors / 0 warnings.
  `bun run build`: passed. This consumer reuses the prior isolated local-tarball
  dependency installation through a node_modules symlink; this is not a fresh
  registry installation or release receipt.
- One independent read-only verifier found four issues. Fixed and covered:
  TS versus TSX parsing and import-equals; module-extension and Svelte-template
  scanning; existing Svelte alias resolution; provider source in inspect context.
- Generated preset selection is explicitly marked as an init-generated file,
  not read as a nonexistent shipped source.
- No visual markup or layout changed; browser screenshots were not rerun in
  this follow-up. Prior starter screenshots are references, not new evidence.
- clean-code-guard: clean.

## Outcome

Local scope: `PASS_SCOPED`. No commit, push, publication or deployment performed.
Official registry consumption remains unverified in this follow-up; the parent
publication blocker is unchanged and requires separate release authorization.
