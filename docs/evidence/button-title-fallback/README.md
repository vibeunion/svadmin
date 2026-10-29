# Button title fallback

Disabled `Button` controls fall back to `title` when `disabledReason` is absent.
Enabled controls keep `title` as a native hint only.

- `button-title-fallback-1440x900.png`
- `button-title-fallback-1920x1080.png`

Reproduce:

```bash
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.button-title-fallback.config.ts
```
