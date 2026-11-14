# PR #795 notification component evidence

The screenshots show the real `NotificationDrawer.svelte` mounted with `NotificationCenter.svelte` in `scripts/fixtures/pr795/App.svelte`. They replace unrelated dialog images previously attached to this PR.

## Reproduce

From the repository root with Bun 1.4.4 and workspace dependencies installed:

```sh
bun run --cwd packages/ui build:styles
bun run vite --config scripts/fixtures/pr795/vite.config.ts
```

Open `http://127.0.0.1:4195/` and click **Open notification drawer**. The fixture imports component sources and the real UI stylesheet; no workspace package build is needed.

- `1440x900.png`: all four notification cards, category/unread filters, global read controls and quick actions, quiet mode off.
- `1920x1080.png`: the same real drawer with quiet mode on; security alerts and their unread badge remain visible.

Capture with the Playwright CLI after resizing to the stated viewport. Temporary captures go under `output/playwright/`; the two reviewed captures are copied here for PR attachment URLs.

## Verified

- NotificationCenter bell popover → **Open Full Drawer** opens the real drawer and focuses its first control.
- Shift+Tab wraps within the drawer; Escape closes it and restores the opener.
- Quiet mode preserves security items and their emphasis.
- `bun run --cwd packages/ui test src/components/notification-center.test.svelte.ts`: 14 tests covering reactive filters, immutable read state, asynchronous failures/repeated actions, global batch operations, new arrivals during saves and keyboard behavior.
- Targeted ESLint and Svelte/TypeScript checks, `bun run check:vibe-governance`, and `git diff --check`.

Quiet mode is a view preference and host callback. It does not itself change an external transport or notification delivery service.
