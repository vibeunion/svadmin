# Lite Field Parity Criteria (input-domain rule)

Status: accepted (2026-10-30)
Scope: `@svadmin/lite` field/control mappings in `packages/lite/parity.json`
Supersedes: implicit per-entry judgement used before this record

## Rule

A field mapping is `exact` only when **both** conditions hold:

1. The Lite control is a native form control whose input type matches the value
   domain (`text`, `number`, `date`, `datetime-local`, `time`, `color`, `select`,
   `select multiple`, `checkbox`, `file`, `range`, `textarea`), and it keeps the
   same submitted field name and value shape.
2. Everything Lite drops is a client-only enhancement: drag handle, star or
   swatch clicking, popover calendar, clipboard copy, progress/cancel, optimistic
   preview, live validation.

Everything else stays `fallback`:

- A structured domain approximated by free text (for example an array rendered as
  a comma-separated string, or a color rendered as a hex text box), because
  format discovery and escaping move to the user.
- Capability that needs client state to decide what is visible or computed
  (virtualization, remote relation search, recursive filter editing).
- Capability with no native equivalent (canvas handwriting, rich-text rendering).

Ambiguous entries stay `fallback`. A mapping may only be upgraded together with a
code change that makes the native-control condition true.

## Field audit (2026-10-30)

| Field | Lite control | Verdict | Reason |
| --- | --- | --- | --- |
| CodeField | `<pre><code>` + `textarea` | exact | Display + native edit; copy is an enhancement |
| Slider | `input[type=number]` min/max/step | exact | numeric domain preserved; drag is an enhancement |
| RangeSlider | two `input[type=number]` | exact | bounds + step preserved; ordering is host validation |
| RadioGroup | `select` | exact | same enum, single value |
| Rate | `input[type=number]` min/max/step + stars | exact | rating domain preserved; star click is an enhancement |
| FileUpload | `input[type=file]` + multipart | exact | file domain preserved; progress/cancel are client state |
| DateRangePicker | two `input[type=date]` | exact | date pair preserved; popup calendar is an enhancement |
| SignaturePad | upload of signed image | fallback | canvas handwriting has no native equivalent |
| TagsInput | one `input[type=text]` per tag, same `name` | exact | array domain preserved; clearing a field deletes that tag, server parses repeated keys |
| DatePicker | `input[type=date]` (datetime → `datetime-local`) | exact | date-only stays date-only, `dateInput` min/max/step passed through, no UTC shift |
| DateTimePicker | `input[type=datetime-local]` | exact | local instant preserved; timezone/disambiguation stays with the host |
| TimePicker | `input[type=time]` | exact | time domain preserved |
| ColorPicker | `input[type=color]`, text fallback for non-hex values | exact | colour domain preserved; brand whitelist stays with the host |
| MarkdownField | `textarea` + server-rendered Markdown preview | exact | preview rendered server-side; toolbar is a client enhancement |
| RichTextField | `textarea` source + allowlisted HTML render | fallback | WYSIWYG editing has no native equivalent; see [rich content boundaries](./ssr-rich-content-boundaries.md) |
| AutoComplete | `input` + `datalist` | fallback | native suggestions exist, but remote query/selection is client state |
| RelationPicker | `select` or link | fallback | large relation sets need client search/paging |

Result: fields exact 30 → **42 of 46 (65.2% → 91.3%)**; every upgrade follows
condition 1 with a matching code change (native control type, repeated-name tag
fields plus server parsing, or a server-rendered preview). Remaining fallbacks are
RichTextField, AutoComplete, RelationPicker and SignaturePad, each with the
boundary recorded in [rich content boundaries](./ssr-rich-content-boundaries.md).

## Styling hooks (`class`) are debt, never a status

The reference components often declare a caller `class` hook. Whether Lite also
accepts one is tracked as **styling-hook coverage** in
`packages/lite/CLASS-HOOKS.md` (`bun scripts/check-parity.ts --write` regenerates
it, `--check` fails on drift) and is deliberately *not* a parity criterion:

- Lite ships its own `lite.css` baseline and hosts can style through a wrapper, so
  a missing hook is not a missing capability;
- treating hooks as required would flip ~60 previously-reviewed `exact` entries to
  `fallback` on a styling technicality, which would make the ratio meaningless;
- tracking it separately means the debt is visible and cannot be paid down to
  inflate the number either.

Structural components (`LiteLayout`, `LiteSplitPaneLayout`) take **named** hooks
(`classSidebar`, `classMain`, `classPane1`, `classDivider`, …) next to the wrapper
`class`, because a wrapper-only hook would be counted while leaving the part hosts
actually restyle unreachable — see
[the layout review](./reviews/layout-class-hooks.md).

`TwoFactorStepper` is the deliberate exception: its reference API is only
`{ current, steps, class }`, so once `steps` was added the missing `class` was the
entire remaining difference, and it was implemented rather than deferred
(recorded in [the review](./reviews/two-factor-stepper.md)).

## Guard rails

- `scripts/check-parity.ts` rejects an `exact` entry whose strategy still says
  `降级`/`fallback`, so a stale row cannot drift back.
- The rule is reprinted in `packages/lite/PARITY.md`, which CI verifies for drift.
- Upgrades are allowed only with a code change; a pull request that flips a status
  without touching the Lite control must be rejected in review.

## Follow-up work created by this audit

Completed in the same cycle:

1. `DateField`: date-only fields now use `type="date"` (datetime keeps
   `datetime-local`), replies on `dateInput` min/max/step and never shifts a
   stored date through UTC. DatePicker upgraded.
2. `TimePicker` / `DateTimePicker`: `LiteTextField` renders native `type=time` /
   `datetime-local`; both upgraded.
3. `ColorPicker`: native `type="color"` with a text fallback for legacy non-hex
   values; upgraded.
4. `TagsInput`: one same-name input per tag plus an empty "add" slot; the server
   parses repeated keys into an array and still accepts legacy comma values;
   upgraded.

5. `MarkdownField`: completed — server-side Markdown rendering with an escaped,
   link-checked subset; upgraded to `exact`.
6. `RichTextField`: decided — plain-text editing is **not** an acceptable
   replacement for WYSIWYG, so the mapping stays `fallback` while read mode
   renders allowlisted HTML. See
   [rich content boundaries](./ssr-rich-content-boundaries.md).

## Audit log

Advanced-category re-audit (same cycle as the field audit above):

| Component | Was | Now | Why |
| --- | --- | --- | --- |
| `Popconfirm` | fallback | `exact` | An anchor opens a `dialog`-role panel (`:target`), and the confirm is a native POST form or link; cancel is a plain anchor. Only focus trap, scroll lock and click-outside are client extras. |
| `DetailDrawer` | fallback | `exact` | Anchored side panel with an explicit close link; the rest of the page stays usable. Focus trapping stays in the SPA. |
| `ErrorSummary` | fallback | `exact` | Errors are listed with accessible heading and field anchors; mapping rules come from the server. Auto-focus and scroll are client extras. |
| `Tour` | fallback | `fallback` | Anchored highlight and step positioning are the capability, not an enhancement. |
| `Tree` | fallback | `fallback` | Indeterminate multi-select is listed in the criteria; `details` preserves expansion only. |
| `Collapse` | fallback | `fallback` | Exclusive accordion state belongs to the host/SPA. |

The outcome is pinned by `scripts/parity-contract.test.ts`
(`records the advanced disclosure re-audit outcome`) so a later status flip has
to argue against this table instead of silently changing the number.
| `TwoFactorStepper` | fallback | `exact` | The reference component is only a step list (`current` + `steps` + `class`, no auth engine). Lite now renders that list server-side with the same index semantics and a caller class on the list, plus a native OTP form. Two review rounds rejected the upgrade first (missing `steps`, then missing `class`), so the status only moved after the code did. |

`TwoFactorStepper` keeps its own default labels (`Password verified` /
`Enter verification code` / `Access granted`) instead of the reference
`Setup`/`Verify`/`Recovery`; labels are content, and a caller can pass any list
through `steps`, so this is a content difference rather than a capability gap.
| `NotificationCenter` | fallback | `fallback` | The reference ships category filters and a client popover/read model; Lite only renders the server list, read state and a mark-all link, so filtering and live updates would be a capability gap, not an enhancement. |
| `Tree` | fallback | `fallback` | `indeterminate` is a DOM property, not an HTML attribute, so native checkboxes cannot express half-selected parents; recursive selection, keyboard tree navigation and lazy loading also need client state. The strategy text was corrected because it claimed a `details` tree that the component does not render. |
| `Collapse` | fallback | `fallback` | The current component is anchor-`#target` based, not `<details>`. `<details name>` does give a native exclusive accordion where supported, but it covers only that one behaviour: controlled open state, multi-open mode, disabled semantics, lazy mounting and the change callback all remain client concerns. See [the progressive enhancement note](./reviews/collapse-progressive-enhancement.md). |

Strategy text is now machine-checked: `scripts/parity-contract.test.ts`
(`keeps strategy text honest about the markup Lite actually renders`) fails when a
strategy mentions `details`/`summary`, a checkbox or a `<select>` that the mapped
Lite component does not actually render.
### Second re-audit (fallback → exact candidates)

| Component | Was | Now | Why |
| --- | --- | --- | --- |
| `AutoSaveIndicator` | fallback | `exact` | The reference state machine is `idle/loading/success/error` with an error detail plus `role="status"`/`aria-live`; all of it is expressible in server HTML. Lite now renders the four states, the error title/detail and keeps the legacy `saved` spelling working. |
| `LiveIndicator` | fallback | `exact` | Connection state (`connected/connecting/disconnected`), resource label and last-event details are props; only the per-second "time since event" ticker and fade are client extras. Lite now takes `connection`/`resource`/`lastEvent`/`showDetails` and keeps the refresh-link fallback. |
| `PageSkeleton` | fallback | `exact` | The reference layout is `type` + `rows` driven (`list`/`show`/`form`), with no random or measured dimensions, so the server can generate it exactly. Lite gained `variant` and `rows` while keeping the plain text-line default. |
| `SegmentedControl` | fallback | `exact` | Choosing an option is preserved by URL links; Lite now marks the active link with `aria-current="page"`, exposes a group name and renders disabled options as inert `span`s so they cannot be activated. Only the in-place state swap and keyboard roving focus stay client-side. |
| `UndoableNotification` | fallback | `fallback` | The reference expiry fires `onTimeout` and supports `managedExternally`; a link-only Lite chip cannot preserve that result contract. Strategy text was corrected — it claimed an "undo form" while the component renders a link. |
| `ApprovalCenter` | fallback | `fallback` | The reference owns filters, pagination, history, dynamic `allowedActions`, comment/target input and version/idempotency handling; Lite ships a single approval card with two POST buttons. Strategy text was corrected — it claimed an "approval list page" that the component does not render. |

The outcome is pinned by `scripts/parity-contract.test.ts`
(`records the second fallback re-audit outcome`).
