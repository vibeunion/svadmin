---
name: svadmin-vibe
description: Build and refine Svelte admin pages from the installed svadmin page catalog, shared design presets, and resource contracts. Use for customer-workspace UI changes and visual acceptance, not production deployment.
---

# svadmin Vibe

Read `DESIGN.md`, `svadmin.vibe.json`, and `svadmin.ai.json`. Select the smallest
matching page family from `pages`; inspect its source and the relevant resource
contract before editing. The catalog is a starting point, not permission to
replace the customer's workflow with this demo's business model.
Inspect the selected page's `previews/{pageId}-desktop.png` and mobile capture
when deciding layout. These shipped references are not current test evidence.
For shipped references, `create-svadmin vibe catalog --query "<keywords>"`
matches IDs, component names and Chinese/English tags (all words must match).
`create-svadmin vibe inspect <pageId>` returns read-only reference context.
Read `ARCHITECTURE.md`; cross-feature imports use public `index.ts` or headless
`data.ts`. Do not confuse shipped reference source with the customer's edits.
When the read-only svadmin MCP tools are available, use `svadmin_vibe_search`,
then `svadmin_vibe_inspect` and `svadmin_vibe_preview` for desktop and mobile.
Pass an empty object to search all pages. These tools read shipped references
only; inspect the current customer's sources separately before making changes.
The CLI commands remain the fallback when no MCP client is configured.

## Implement

- Read installed `@svadmin/ui/component-registry` metadata and component type
  declarations. Match the versions in package.json; do not invent props or copy
  internal/example-only imports.
- Translate "compact", "standard", or "lightweight" requests into the existing
  application-wide presets in `src/design.svelte.ts`. Keep layout, form columns,
  table density, and detail layout consistent. Change `src/design-selection.ts`
  for the initial preset. Do not silently reset a user's saved preferences.
- Preserve resource contracts, providers, permissions, routes, and active form
  values when making visual-only changes. Keep metric values provider-backed.
- Modify the chosen feature source, not a new parallel implementation. Use
  semantic tokens and public component composition. No decorative nested cards.
- Demo data and simulated errors are under `src/demo/` and development-only
  scenario selection. Do not copy demo permission grants into a real backend.
  Business authorization, approval rules, audit, and persistence belong on the
  server, not in model output.

## Verify

Run `bun run check`, `bun run build`, and `bun run test:ui`. Inspect the captured
desktop/mobile screenshots, not only test exit codes. Tests cover six page
families, CRUD navigation, form validation, provider states, and preset changes.
Extend focused tests when adding business behavior.

Use at most two targeted visual repair rounds. Report failures and evidence
paths after that; never claim screenshots or deterministic checks prove taste.
Ask for human judgement when brand direction is ambiguous. Do not change
business logic to make a visual check pass, update screenshot baselines blindly,
or contact production services for preview data.

Deliver changed files, check results, screenshot paths, and remaining
human/backend acceptance. Publication, deployment, and model-provider accounts
are separate authorization boundaries.
