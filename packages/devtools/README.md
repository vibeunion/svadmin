# @svadmin/devtools

Headless diagnostics core for svadmin.

`@svadmin/devtools-contract` defines the JSON-safe snapshot, event, and
diagnostic vocabulary. This package adds the runtime pieces that adapters, SSR,
and the CLI can share:

- `createDevtoolsCollector()` — a bounded, redacting in-memory collector with
  `recordEvent`, `recordDiagnostic`, `snapshot`, `subscribe`, and `clear`.
- `buildProviderDiagnostics(bundle)` — provider configuration/capability matrix.
- `buildResourceDiagnostics(resources)` / `buildRouteDiagnostics(resources)` —
  resource operations, menu visibility, provider routing, and route paths.
- `toPermissionDiagnostic(resource, action, result)` — normalizes access-control
  results for display.
- Re-exports the whole `@svadmin/devtools-contract` surface.

UI rendering stays in `@svadmin/ui` (`DevTools.svelte`); this package is the
headless boundary so non-UI consumers do not depend on `devframe` or Svelte.

## Usage

```ts
import { createDevtoolsCollector, buildProviderDiagnostics } from '@svadmin/devtools';

const collector = createDevtoolsCollector({ source: 'frontend', maxEvents: 200 });

collector.recordDiagnostic({
  code: 'provider.missing',
  source: 'frontend',
  severity: 'warning',
  message: 'liveProvider is not configured',
});

const snapshot = collector.snapshot({ requestId: 'req-1' });
const providers = buildProviderDiagnostics(config.providers);
```

Secrets are redacted by `redactDevtoolsRecord` before a snapshot is produced.