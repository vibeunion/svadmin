# Lite file-input compatibility evidence

Captures mount the actual `LiteFileInput.svelte` with the repository's `lite.css` in Chromium. Viewports are exactly 1440x900 and 1920x1080. Source commit, browser version, source hashes, and checked measurements are recorded in `provenance.json`.

| State matrix | Evidence |
| --- | --- |
| Empty | Native input and localized empty-file label remain visible through the visual control. |
| Keyboard focus | Tab moves from the empty input to the next real file input; computed focus shadow is present. |
| Selected file | Playwright assigns a real browser File; reactive filename becomes invoice.csv. |
| Disabled | Actual component input has disabled=true. |
| Validation error | Actual error-class component renders the red border. |
| Long filename | Reactive long filename is clipped within a 320px wrapper, without page overflow. |
| Loading / permissions / submission | Not provided by this component; not simulated or asserted. |

The browser assertions verify 10px sibling spacing, native-input overlay dimensions, focus feedback, filename reactivity, clipping, validation border, and absence of browser errors. Screenshots do not prove IE11 engine execution, complete application workflows, or server authorization. Existing source, distribution CSS, and SSR compatibility checks remain required.
