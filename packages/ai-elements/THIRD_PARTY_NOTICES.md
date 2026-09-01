# Third-Party References

`@svadmin/ai-elements` is an original Svelte 5 implementation whose public
component-family coverage and interaction contracts were researched against
the following projects on August 31, 2026:

- Vercel AI Elements, commit `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd`, Apache-2.0.
- vuepont/ai-elements-vue, commit `ad4818f6081a2fe6e5b7bb53cebc5a66d9a24148`, Apache-2.0.
- SikandarJODD/ai-elements, commit `fa4bc217f84bc571378bc371332a154106772614`, MIT.

Those projects remain subject to their own licenses and trademark policies.
Their names are used only to identify compatibility research sources.

## Runtime Dependencies

- `streamdown-svelte` 3.0.6, Apache-2.0. It provides the streaming Markdown,
  sanitization, math, Mermaid, and code-rendering pipeline used by `Response`.
- `@rive-app/webgl2` 2.41.0, MIT. It renders the `.riv` persona assets and
  drives their `default` state-machine inputs.
- `@xyflow/svelte` 1.6.5, MIT. It provides the workflow canvas primitives.
- `@lucide/svelte` 1.35.0, ISC. It provides interface icons.
- `clsx` 2.1.1, `tailwind-merge` 3.6.0, and `tailwind-variants` 3.3.1, MIT.

`streamdown-svelte` includes or loads its own documented runtime dependencies,
including Shiki, KaTeX, Mermaid, Unified, Marked, and rehype/remark packages.
Their license texts are distributed by their respective packages.
