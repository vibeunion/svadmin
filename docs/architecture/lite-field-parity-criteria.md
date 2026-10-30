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