# Third-Party References

`@svadmin/ai-elements` is an original Svelte 5 implementation whose public
component-family coverage and interaction contracts were researched against
the following projects on August 31, 2026:

- Vercel AI Elements, commit `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd`, Apache-2.0.
- vuepont/ai-elements-vue, commit `ad4818f6081a2fe6e5b7bb53cebc5a66d9a24148`, Apache-2.0.
- SikandarJODD/ai-elements, commit `fa4bc217f84bc571378bc371332a154106772614`, MIT.

Those projects remain subject to their own licenses and trademark policies.
Their names are used only to identify compatibility research sources.

## Runtime dependencies and vendored code

- The `streamdown-svelte` 3.0.6 distribution is an explicit Apache-2.0 vendor
  copy under `vendor/streamdown`. It provides streaming Markdown, sanitization,
  math, Mermaid and code rendering. Its LICENSE and modification notice are
  distributed there. Only the two class-composition calls in theme.js were
  changed to use SVAdmin's native finite-class helper. Original source digests
  and the modification list are recorded in `vendor/streamdown/provenance.json`.
  The copy requires deliberate upstream maintenance, not automatic wrapper updates.
- `@rive-app/webgl2` 2.41.0, MIT. It renders the `.riv` persona assets and
  drives their `default` state-machine inputs.
- `@xyflow/svelte` 1.6.5, MIT. It provides the workflow canvas primitives.
- `@lucide/svelte` 1.35.0, ISC. It provides interface icons.
- `clsx` 2.1.1, MIT. It composes conditional class tokens without parsing a
  utility language. The external `cn`, `tailwind-merge` and `tailwind-variants`
  runtime packages are no longer dependencies.

The vendored Markdown distribution uses explicitly declared runtime dependencies,
including Shiki, KaTeX, Mermaid, Unified, Marked and rehype/remark packages.
Their license texts are distributed by their respective packages.

## Historical native CSS attribution

The notices below are retained for native CSS foundations and migration baselines.
They do not indicate an active compiler or runtime dependency. Removing a compiler
does not remove the attribution obligations of retained derived CSS.

## tailwindcss

MIT License

Copyright (c) Tailwind Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## tw-animate-css

MIT License

Copyright (c) 2025 Wombosvideo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
