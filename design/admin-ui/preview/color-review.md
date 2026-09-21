# Status color review

Parent task: admin-ui-product-integration-20260919. Same user continuation and writer; low risk, native mode, no external verifier. Scope is the productStatus blend, targeted browser checks and evidence. No new dependency, backend write, Figma mutation, merge or deployment.

The fa5d10f browser run passed 228 scenes, six interaction sequences, two keyboard scenarios and status-text contrast. Visual inspection of its actual light customer-list screenshot nevertheless found pink backgrounds for success and warning. Contrast alone did not protect semantic color meaning.

The source used polar Oklch blending against card/foreground tokens with explicit hues. The correction uses rectangular Oklab for only this recipe's background, border and foreground blends. Source tokens, percentages, opacity, spacing and public props remain unchanged; the non-color-mix fallback stays intact. This is an intentional correction, not historical screenshot parity.

`status-colors.mjs` checks the five real built components in light/dark themes against separately resolved theme bindings, without styling the components under test. The default light palette additionally must retain green/amber/red/blue channel ordering. The existing 4.5:1 text contrast gate and all 228 scenes remain required. `status-colors.json` is archived with screenshots; the final job requires this check to succeed.

Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix (rectangular versus polar interpolation). No supplier color values or third-party assets are introduced.
