// Language tooling must not instantiate the E2E Vite server, which requires
// a real optional parser and owns synthetic database state. Check these Svelte
// components normally without importing that server configuration.
export default {};
