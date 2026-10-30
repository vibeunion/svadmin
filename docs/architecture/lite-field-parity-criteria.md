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
| MarkdownField | `textarea` + `<pre>` source | fallback | no rendered Markdown preview |
| RichTextField | `textarea` + pre-wrapped text | fallback | no rich rendering, only plain text |
| AutoComplete | `input` + `datalist` | fallback | native suggestions exist, but remote query/selection is client state |
| RelationPicker | `select` or link | fallback | large relation sets need client search/paging |

Result: fields exact 30 → **41 of 46 (65.2% → 89.1%)**; every upgrade follows
condition 1 with a matching code change (native control type, or repeated-name tag
fields plus server parsing). Remaining fallbacks are MarkdownField, RichTextField,
AutoComplete, RelationPicker and SignaturePad.

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

Still open:

5. `MarkdownField`: render Markdown server-side before claiming preview parity.
6. `RichTextField`: define whether plain-text editing is acceptable for rich
   content, or route rich editing to the SPA.