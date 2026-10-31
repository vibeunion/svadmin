# Review: `TwoFactorStepper` fallback → exact

Status: accepted
Scope: one `@svadmin/lite` parity entry (`advanced` category)
Related: [parity criteria](../lite-field-parity-criteria.md)

## Why a review was needed

The status flip was proposed as "looks upgradeable" without a code change. Under
the published criteria that is exactly the shape of a metric-padding edit, so an
independent reviewer (Codex, read-only sandbox) was asked three times: *is this
upgrade padding?* Each round was judged against the source, not against the
proposal text.

## What the reference actually is

`packages/ui/src/components/content/TwoFactorStepper.svelte` is a step list, not
an authentication flow: `current`, `steps` and `class`, rendered as an ordered
list with `aria-label="Progress"`. It has **no** OTP input, resend, countdown,
recovery-code login, error echo or auto-advance. Those cannot be upgrade
blockers because they do not exist in the reference.

## Review rounds

| Round | Verdict | Finding |
| --- | --- | --- |
| 1 | keep `fallback` | Lite hardcoded three steps and ignored the reference `steps` list: a caller could not choose the number, order or labels. |
| 2 | keep `fallback` | `steps` was implemented, but the reference merges a caller `class` into the step list and Lite dropped it. A public styling hook is not a client enhancement. |
| 3 | upgrade to `exact` | `steps` (order/count/labels), `current` index semantics, `aria-label="Progress"` and `class` on the list are all preserved; the extra native OTP form is additive. |

Round 3 also confirmed the upgrade is **not** padding *because* the component and
its tests changed in the same pull request, which the criteria require.

## Implementation

- `LiteTwoFactorStepper.svelte`: new `steps?: string[]` (defaults to Lite's own
  labels) and `class?: string`, both forwarded to the step list.
- `LiteSteps.svelte`: new `class?: string` merged with the built-in class list on
  the `<ol>`.
- `LiteNavigation.test.svelte.ts`: default three steps plus `aria-label`, custom
  four steps with `finish/finish/process/wait`, and the caller class landing on
  `.lite-steps`.
- `scripts/parity-contract.test.ts`: pins the new status so a later flip has to
  argue against this record.

## Accepted differences

- Default labels differ (`Password verified / Enter verification code / Access
  granted` vs `Setup / Verify / Recovery`). Labels are content; callers pass any
  list through `steps`.
- Finished steps show `✓` instead of a number, and the visual styling is Lite's
  own baseline. Both are presentation, not capability.

## Evidence

- `packages/lite/src/components/LiteNavigation.test.svelte.ts` (`mirrors the
  reference step contract for the two-factor stepper`)
- `bun scripts/check-parity.ts` → `advanced` 26/43, total exact 126 (70.4%)
- `bun test scripts/parity-contract.test.ts` (12 tests)
- `bun run check:lite:ssr` → 212 routes, no hydration script