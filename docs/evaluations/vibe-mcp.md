# Vibe MCP Follow-up

## Contract

- Parent: `docs/evaluations/vibe-catalog-architecture.md`.
- Source: user confirmation "继续".
- Reason: let coding assistants discover and retrieve the shipped page catalog,
  implementation context and desktop/mobile reference images directly.
- Mode: Native, medium risk, one writer and one independent read-only verifier.
- Scope: a separate `create-svadmin vibe mcp` stdio entry using the official MCP
  SDK, shared catalog readers, strict arguments, client integration tests and docs.
- Non-goals: changing the business-data MCP server, customer-filesystem access,
  model calls, code execution, write tools, HTTP hosting, publication or deployment.
- Preserve all earlier uncommitted work and the parent's publication boundary.

## Acceptance

- An official SDK client can initialize and discover the finite read-only tools.
- Search and inspect use the same shipped materials as the CLI.
- Reference images are returned as image content from allowlisted page/viewport
  pairs, with filesystem containment and bounded reads.
- Unknown tools, extra keys, wrong types and traversal input fail explicitly.
- Stdout contains only protocol messages; closing stdin terminates the server.
- The packed Node CLI works outside the workspace and does not read customer
  files or call a provider. Prior CLI commands retain their behavior.

## Implementation Decisions

- SDK `1.30.1` is pinned; Zod is a declared production dependency. The stdio
  entry loads them dynamically and the build leaves them external. Other CLI
  commands do not initialize an MCP server or load a customer's configuration.
- An independent read-only reviewer reproduced a high-level SDK limitation:
  omitting `arguments` failed a search with all-optional fields. The server now
  uses the SDK's public low-level `Server` API, normalizes omitted arguments to
  `{}`, and derives advertised JSON schemas and runtime checks from the same
  strict Zod objects. No SDK internals or protocol framing are reimplemented.
- Three tools only: search metadata, inspect reference context, read a
  desktop/mobile reference PNG. No model credentials, writes, HTTP listener,
  arbitrary path or DataProvider operations are exposed.
- Preview reads are capped at 4 MiB; incoming stdio buffering at 64 KiB.
  Material errors are explicit tool failures without filesystem path disclosure.

## Evidence (2026-09-24)

- `env npm_config_offline=true bun run --cwd packages/create-svadmin test`:
  **104 passed, 0 failed, 1142 assertions**, including the existing CLI suite.
- The pack test builds and packs the CLI, installs that tarball with npm into
  an unrelated temporary directory, and launches the installed bin with Node.
  An official SDK client verifies discovery, omitted search arguments, source
  inspection and image content. Empty stdin exits zero with empty stdout/stderr.
  Installation uses npm's previously downloaded cache, not workspace symlinks.
- Nine focused MCP tests cover SDK handshake, read-only tool schemas, CLI
  material parity, both preview sizes, strict argument rejection, sanitized
  failures, symlink escape/corrupt/oversized images, unrelated working-directory
  isolation and EOF shutdown.
- Strict TypeScript check of `vibe-mcp.ts` and `vibe-catalog.ts`: passed with
  `skipLibCheck: false`, unchecked-index and exact-optional checks.
- Changed CLI/test files: ESLint passed. Repository architecture gate passed
  for 1799 source files. Frozen-lockfile install and `git diff --check` passed.
- A filtered dependency install temporarily left ESLint resolving the wrong
  AJV major; the full frozen-lockfile install restored the dependency layout.
  No linter rule, type gate or dependency-check setting was relaxed.
- Initial online npm pack-consumer attempts hit registry connection/idle
  timeouts. One run also hit the existing architecture test's 5-second timeout
  under load. The final complete cached run passed without skipping tests or
  increasing the existing test timeouts.
- One independent read-only review found the omitted-arguments issue described
  above. It is covered by both in-memory SDK and packed Node client regressions.
- No UI markup changed and no browser screenshot refresh was required.
- clean-code-guard: clean.

## Outcome

Local implementation and cached tarball-consumer verification: `PASS_SCOPED`.
Cold online installation was not accepted because of registry timeouts.
No commit, push, publication, deployment or global coding-assistant configuration
was performed. Formal published-package consumption and customer-host setup
remain separate acceptance steps; prior release blockers are unchanged.
