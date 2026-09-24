# Button Inline Reason Evidence

Captured in real Playwright WebKit desktop viewports on 2026-09-24, using the
modified source Button and the repository's generated UI styles in a local,
controlled preview. These are component specimens, not a live business system.

## PM Gate

JTBD: Before an approval or submission, the operator needs to see the missing
prerequisite without discovering a hover target.

Anti-goals: No business rule inference, permission changes, persistence, or change
to the default tooltip presentation. No automatic focus stop for inline text.

Information architecture: The action and one associated reason remain together.
Workflow-wide recovery stays in FeedbackNotice instead of repeated button notices.

## State Matrix

| State | Expected result | Evidence |
| --- | --- | --- |
| Empty input | Inline reason, disabled approval | Both viewport screenshots |
| Loading | Visible wait reason, disabled action | Both viewport screenshots |
| Invalid deadline | Long reason wraps below action | Both viewport screenshots |
| Forbidden | Restricted link has no href | Screenshots and browser DOM read-back |
| Valid input | Reason disappears, action enables | Filled comment and clicked; status became approval submitted |
| Tooltip closed/open | Default mode unchanged | Hovered default restriction; tooltip showed the frozen-task reason |

## Acceptance

- Given an empty comment, when viewing the action, then the reason is visible
  without hover and is associated with the disabled control.
- Given a completed comment, when submitting, then the reason disappears and the
  enabled callback runs.
- Given a restricted link, when inspecting or activating it, then it has no href
  and its callback is suppressed.
- Given the default mode, when hovering or focusing the wrapper, then the existing
  tooltip remains available.

## Verification

- `bun run test src/components/ui/button/button.test.ts` from `packages/ui`: 13 pass.
- `git diff --check`: passed.
- `1440x900.png`: viewport 1440x900; document overflow false; long reason 640x39.1875px.
- `1920x1080.png`: viewport 1920x1080; document overflow false.
- Both screenshots visually inspected: no overlapping controls or clipped reasons.
- Real-browser interactions: empty -> completed -> submitted, default tooltip
  hover, restricted-link href absent.
