# FeatureFlagStudio review fixture

This fixture imports the actual component and its scoped registry from `packages/ui/src`, plus the existing UI stylesheet. It performs no network mutations and has no backend service integration.

From the repository root:

```sh
bun install
bun run --cwd packages/ui build:styles
bun run vite --config scripts/fixtures/pr794/vite.config.ts
```

Open `http://127.0.0.1:4194/`. Styles must be generated before starting Vite. A clean checkout needs no full workspace package build for this fixture.

## Captured states

- `docs/pr-evidence/pr-feature-flag/1440x900.png`: 1440×900, status filter `Enabled`, target flag `AI Table Copilot`, role `admin`; the zero-percent flag evaluates true through its explicit role allow rule.
- `docs/pr-evidence/pr-feature-flag/1920x1080.png`: 1920×1080, Billing Engine V2 kill-switch confirmation open. No change is applied before the confirmation button is pressed.

These replace the original PR attachments, which depicted an unrelated unsaved-changes dialog.

## Browser verification

Use the Playwright CLI skill wrapper in an isolated CLI session. Run the wrapper from `/tmp` if npm rejects the workspace's existing dependency-override syntax:

```sh
npm_config_offline=true /Users/zhd/.codex/skills/playwright/scripts/playwright_cli.sh --session pr794 open http://127.0.0.1:4194/
npm_config_offline=true /Users/zhd/.codex/skills/playwright/scripts/playwright_cli.sh --session pr794 resize 1440 900
npm_config_offline=true /Users/zhd/.codex/skills/playwright/scripts/playwright_cli.sh --session pr794 snapshot
```

Read each fresh snapshot and use its refs for `select`, `click`, and `screenshot --filename=...`. Set the status and target selectors as described above, then capture the first viewport. Resize to 1920×1080, click Billing Engine V2's `Trigger Kill Switch`, read a fresh snapshot, and capture the dialog state.

Confirmed in the real browser:

1. The role whitelist enables AI Table Copilot despite its 0% rollout.
2. Opening or cancelling the kill-switch dialog leaves the connected billing consumer enabled.
3. Confirming the kill switch changes the same-registry billing consumer to disabled and disables the card switch.
4. Revoke Kill Switch restores the consumer. Escape closes the confirmation without changing the flag.

The component test file additionally covers SSR/request isolation, reactive registry/context updates, input/output snapshot isolation, prop replacement and stale filter reset, duplicate keys, and invalid percentages:

```sh
bun run --cwd packages/ui test src/components/feature-flag.test.svelte.ts
```
