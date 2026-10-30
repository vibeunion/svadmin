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
| TagsInput | `input[type=text]` comma separated | fallback | array domain approximated by free text |
| DatePicker | `input[type=datetime-local]` | fallback | emits a datetime value where the reference is date-only; fix to `type=date` before upgrading |
| DateTimePicker | `input[type=text]` | fallback | `datetime-local` exists and is not used; format discovery moves to the user |
| TimePicker | `input[type=text]` | fallback | `type=time` exists and is not used |
| ColorPicker | `input[type=text]` hex | fallback | `type=color` exists; invalid values only caught server-side |
| MarkdownField | `textarea` + `<pre>` source | fallback | no rendered Markdown preview |
| RichTextField | `textarea` + pre-wrapped text | fallback | no rich rendering, only plain text |
| AutoComplete | `input` + `datalist` | fallback | native suggestions exist, but remote query/selection is client state |
| RelationPicker | `select` or link | fallback | large relation sets need client search/paging |

Result: fields exact 30 → 36 of 46 (65.2% → 78.3%); the six upgrades all follow
condition 1, and each downgrade candidate lists the fix that would justify an
upgrade.

## Guard rails

- `scripts/check-parity.ts` rejects an `exact` entry whose strategy still says
  `降级`/`fallback`, so a stale row cannot drift back.
- The rule is reprinted in `packages/lite/PARITY.md`, which CI verifies for drift.
- Upgrades are allowed only with a code change; a pull request that flips a status
  without touching the Lite control must be rejected in review.

## Follow-up work created by this audit

1. `DateField`: use `type="date"` for date-only fields (currently
   `datetime-local`), then upgrade DatePicker.
2. `TimePicker` / `DateTimePicker`: introduce native `type=time` /
   `datetime-local` controls, then upgrade both.
3. `ColorPicker`: adopt `type=color` with a text fallback, then upgrade.
4. `TagsInput`: emit repeated `name` inputs (or a documented separator) instead of
   parsing free text, then upgrade.
5. `MarkdownField`: render Markdown server-side before claiming preview parity.