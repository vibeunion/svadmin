# PR #793 component evidence

Screenshots are captured from the actual Svelte source components in `scripts/fixtures/pr793`, with the UI package stylesheet. The fixture includes a local diagram, video, audio, and downloadable sample document.

Run from the repository root:

```sh
bun run --cwd packages/ui build:styles
bun run vite --config scripts/fixtures/pr793/vite.config.ts
```

Open `http://127.0.0.1:4193/` using the Playwright CLI. Use an isolated browser session such as `pr793`.

| Image | State |
| --- | --- |
| `1440x900.png` | Actual media thumbnails and splitter, keyboard resize from 35/65 to 37/63 |
| `1920x1080.png` | Shortcut help dialog, search focused, separate close control |
| `lightbox-1920x1080.png` | Actual image preview at 125% with metadata drawer |

Browser checks: opening help focuses search; Shift+Tab wraps to its close button; Escape closes it and restores the invoking button. Opening the image preview, zooming, and toggling metadata work; Escape restores focus to the thumbnail. Splitter arrow keys update both pane percentages together.

Regression coverage: gallery item reorder/removal, disabled/unsafe downloads and media control keys; shortcut platform/category changes and single Escape notification; paired pane limits, valid/invalid saved ratios, collapse recovery, pointer cleanup, and configuration changes during dragging.
