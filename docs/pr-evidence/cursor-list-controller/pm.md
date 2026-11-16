# Cursor list controller PM gate

JTBD: Users of a cursor-backed admin list need to move between pages and change queries without mixing old records or losing the current page on a read failure.

Scope: Add an opt-in, framework-independent controller over the existing cursor provider/cache. Existing offset hooks, provider contracts and UI components remain compatible. No transport, authorization, automatic retries, persistence or DOM focus policy is added.

Information hierarchy: current page records, current page number and previous/next availability. Unknown totals remain unknown. Raw errors stay available to the host's diagnostic disclosure.

| State | Result | Action |
| --- | --- | --- |
| Initial/loading | No success claim; retain current page during navigation | Navigation/refresh deduplicated; a new query supersedes the read |
| Empty | Empty target page with previous-page availability | Previous or refresh |
| Failure | Retain current page, page number and retry cursor | Retry or change query |
| Success | Replace records with target page | Previous/next |
| Scope change | Clear old scope data and start at page one | Host supplies scope as part of queryKey |
| Disposed | No callbacks or late state writes | None |

```gherkin
Feature: Query-scoped cursor lists
Scenario: Navigate without appending
  Given a successful page with a next cursor
  When the user moves forward and back
  Then each page replaces records and visited pages are reused without another read
Scenario: Change the query during a read
  Given query A has a pending request
  When query B or an authorization scope key is applied
  Then B starts at page one and A cannot overwrite B even if it ignores cancellation
Scenario: Recover a failed page read
  Given a successful current page
  When navigation fails and is retried
  Then the same target cursor is retried and current data/page remain until success
Scenario: Refresh intentionally
  Given a visited second page
  When refresh is requested
  Then current-page refresh is the default and first-page reset is explicit
Scenario: Cancel or dispose
  Given a pending read
  When it is cancelled or the controller is disposed
  Then late completion cannot commit state or notify disposed subscribers
```

Execution decision: native, one owner, external=0. Additive opt-in API; deterministic focused tests and diff review. This is a headless API change; no production screen or visual behavior is changed in this PR.

## Verification

- `bun test packages/core/src/cursor-list-controller.test.ts`: 12 pass / 88 assertions.
- Strict targeted TypeScript check and targeted ESLint passed; vibe governance and `git diff --check` passed.
- Browser store-consumer harness at 1440x900 and 1920x1080 confirmed replacement, previous/next, failure retention, retry, final-page boundaries and query reset. No page errors or horizontal overflow. Images show a failed third-page read retaining page two; the harness uses the actual new controller and a deterministic in-memory provider.
- `svadmin_getDiagnostics` was invoked through the local MCP handler with a read-only mock provider. It returned basic provider health and explicitly reported no attached DevTools collector; this is not production runtime diagnostics.
- [1440x900](1440x900.png), [1920x1080](1920x1080.png), [measurements](measurements.json).
- Reproduce: build UI CSS, `bun build docs/pr-evidence/cursor-list-controller/demo.ts --target browser --outfile output/cursor-controller/demo.js`, serve the repository root on localhost:5286, and run `playwright-cli run-code` with `verify.js`. This is an opt-in headless API; no existing application UI is replaced by the harness.
