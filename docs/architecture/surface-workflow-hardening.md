# Surface workflow hardening and release evidence

Companion to [controlled workflows](surface-controlled-workflows.md).

The form controller snapshots the trusted scope and checks it **before** sending
confirm, execute, inspect or reject requests, not only after a response arrives.
Changing the session, surface, accepted revision, transport or enabled state
retires the old proposal and its retry identity. The real form clears draft data
and validation errors at the same boundary. A presentation-only change retains
the input and its component identity. Instance-specific IDs prevent collisions
when two surfaces happen to reuse a widget ID.

The prerequisite UI fixes preserve a null date range, date/time display contracts,
required false booleans and decimal input. File uploads use per-request ownership:
cancel, replacement, retry and unmount prevent late progress/results from changing
the current upload. Lite filter callbacks consume the current native FormData;
without a callback, normal GET/POST and structural server actions remain intact.

`compatibility.json` scopes the existing published minimum-version evidence to
the original entries. The interactive entry remains experimental and its
`minimumPublishedUi` is intentionally unset. The companion
`scripts/surface-workflows/packed-consumer.mjs` checks actual same-checkout
core/UI/Surface tarballs in an isolated strict-peer consumer, the Node-only
entries, SQLite tenant isolation and the browser bundle boundary. Its report
records the checkout and tarball integrity. A report must say `passed` before
claiming that combination is verified. Even a successful same-checkout result
does not establish compatibility with an older published UI; a coordinated UI
release and a verified package peer floor remain required before publication.

Browser screenshots and the packed-consumer report are retained together in the
current-run workflow artifact. Earlier green runs or historical screenshots must
not be relabelled as evidence for a changed implementation head.
