# Long-tail capabilities

svadmin keeps the long-tail surfaces opt-in and host-owned. The shipped pieces
share the same public contracts as the core admin UI, so a project can adopt one
surface without taking on a second runtime.

## Page materials

`svadmin add block --list` exposes the core `dashboard`, `monitor`, `settings`,
`crud`, and `workflow` materials alongside the existing search and detail
materials. Installation remains dry-run by default:

```sh
svadmin add block monitor --write
svadmin add block workflow --json
```

Each material is versioned and recorded in `svadmin.materials.json`. Upgrade and
remove operations compare the recorded SHA-256 before touching a file; locally
edited files remain conflicts and are preserved.

## Design token exchange

`@svadmin/core` accepts W3C DTCG color documents with `parseDtcgTheme` and can
emit the same shape with `exportDtcgTheme`. The exchange uses `$type: "color"`
and `$value` entries under `color.light` and `color.dark`, which keeps the
payload usable by token editors that understand the DTCG JSON format.

```ts
import { exportDtcgTheme, parseDtcgTheme } from '@svadmin/core';

const document = exportDtcgTheme({
  light: { '--primary': '#1D4ED8' },
  dark: { '--primary': '#93C5FD' },
});
const theme = parseDtcgTheme(document);
```

Only color syntax is exported. Invalid CSS and duplicate token names fail
before a document is produced.

## AI workspace

`Reasoning` is exported as `ReasoningCollapse` for callers that want to make
the collapsed chain-of-thought affordance explicit. `ModelComparisonCard`
renders parallel responses, latency/token metadata, error states, and a single
selection callback for the result that should continue through the workflow.

## Narrow mobile surfaces

At widths up to 420px, detail drawers use the full viewport with compact
padding, while the virtual table viewport opts into touch panning and contained
overscroll. Desktop sizing and the existing keyboard scrolling contract remain
unchanged.
