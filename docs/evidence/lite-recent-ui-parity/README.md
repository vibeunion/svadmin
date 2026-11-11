# Lite recent UI parity evidence

Source: `packages/lite/example/src/routes/lite/parity/+page.svelte` (`#recent-fallbacks`), served by the Lite example in zero-JS SSR mode.

| Viewport | Screenshot | Focus |
| --- | --- | --- |
| 1440x900 | `lite-recent-ui-parity-1440x900.png` | Trend, presence, gauge, metric grid, org chart, task center |
| 1920x1080 | `lite-recent-ui-parity-1920x1080.png` | Audit log, conflict/deletion forms, cron and tree select fallbacks |

State matrix:

| Surface | Default | Empty / loading | Error / conflict |
| --- | --- | --- | --- |
| TrendIndicator | positive/negative/neutral direction | `--` fallback without values | reverse-color semantics |
| MetricGrid | populated and auto/1-6 columns | skeleton and empty message | reduced-motion-free static cards |
| TaskCenter | running, pending, completed | empty task list | failed/cancelled status and retry |
| AuditLog | field diff table | empty audit list | legacy `AuditLog` and current `AuditEntry` shapes |
| SafeDeleteConfirm | impact list + confirmation input | no impact items | native POST delete form |
| ConcurrentConflictModal | local/remote values per field | no conflicting fields | per-field keep choice |
| MicroAppFrame | sandboxed iframe | missing fallback link | direct new-tab escape hatch |

All screenshots were captured in Chromium at the stated viewport sizes. `git diff --check` is run separately in the PR checklist.