# Enterprise UI reconciliation

The original scalar-only replacement is not used. JsonSchemaForm keeps main's recursive object/array renderer, missing-key defaults, typed enum values, scoped locale/idPrefix, detached bounded snapshots, native disabled controls, synchronous submit lock, and stale callback ownership. A bounded recursive adapter reuses the reviewed scalar assertion kernel and rejects unsupported assertions instead of silently ignoring them. Server TypeBox validation and authorization are still required.

The filter editor preserves immutable incoming unsupported/unknown-field conditions and originally empty groups for a lossless host round trip. Metadata arrival restores supported editing. Only unchanged captured host nodes can use this path: setting a readonly flag on a new or modified node does not bypass strict compilation. Edited/new invalid conditions fail as a complete query. Existing main regressions are retained beside the old branch's tests.

The bounded spreadsheet parser, deterministic error codes, current-event formula bar, readonly guards, precise CSV values and dangerous text-prefix neutralization are retained. This is not a full spreadsheet engine. No new dependency, backend writes, released-version change, deployment or permission relaxation is included.

Original scalar-component rejection of nested objects and rejection of all unknown incoming fields were incompatible with main; the two interaction tests now assert successful recursive and lossless behavior. The separate leaf-kernel negative test remains valid for that internal helper. Current exact-head CI and new browser evidence are required; old artifacts are historical only.

Array-item removal retires parse errors belonging to the removed item and reindexes errors for surviving descendants. An invalid numeric draft cannot become a stale blocker on a deleted path or silently become valid when a previous row is removed. A rejected readonly/disabled write leaves errors unchanged. These are actual recursive component regressions, not a relaxation of input validation.
