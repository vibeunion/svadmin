# @svadmin/devtools-contract

Compatibility shim re-exporting `@vibeunion/devtools-protocol`.

The JSON-safe DevTools contract (trace/correlation metadata, diagnostics,
events, snapshots, cache vocabulary, and recursive credential/signed-URL
redaction) is owned by `@vibeunion/devtools-protocol` so svadmin, SupaCloud,
and frontend adapters share a single source of truth.

Product-specific diagnostics live in `@svadmin/devtools`.