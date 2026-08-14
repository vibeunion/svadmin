# Lite SvelteKit SSR example

This example keeps the complete `/lite` route subtree server-rendered with
`csr = false`. IE11 receives HTML, CSS, native links, and native GET/POST forms;
it never executes the Svelte 5 runtime.

From the repository root:

```bash
bun run --cwd packages/lite build
bun run check:lite:ssr
```

The check runs Svelte diagnostics, builds the production application, starts the Vite
preview server, and asserts that `/lite` returns status 200 with native GET/POST forms
and no hydration script or disclosure elements.

The in-memory records are demonstration data. Replace `+page.server.ts` with
`createListLoader` and `createCrudActions` backed by the application's real
`DataProvider` when integrating Lite into an application.
