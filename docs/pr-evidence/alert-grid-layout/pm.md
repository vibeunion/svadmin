# Alert icon/content layout PM gate

JTBD: A user reading an error or warning needs its title, description and recovery details beside the icon, without a blank implicit column or horizontal overflow.

Scope: Correct the native Alert CSS grid with and without an optional direct SVG icon. Preserve variants, public props, semantics and consumer layout. No FA-specific selectors, navigation, authorization or new components.

Hierarchy: title, concise description, optional collapsed diagnostics. No confirmation or domain command is introduced.

| State | Expected result |
| --- | --- |
| Icon present | Fixed 1rem icon column and flexible minmax(0,1fr) text column |
| Icon absent | One flexible column; no reserved icon space |
| Long content | Text remains in the container; disclosures can expand |
| Warning/error/loading/empty | Existing tone and message preserved |

```gherkin
Feature: Alert native layout
Scenario: Alert contains an icon
  Given the standard Alert root, SVG, title and description
  When rendered at desktop widths
  Then the icon and text have separate columns with a visible gap and no implicit track
Scenario: Alert has no icon
  Given only a title and description
  When rendered
  Then both occupy the sole flexible column without leading blank space
Scenario: Details are expanded
  Given a long diagnosis in a disclosure inside the description
  When expanded
  Then the content stays within the Alert without horizontal page overflow or icon overlap
```

Execution decision: native, one owner, external=0; bounded CSS fix verified with generated native CSS and real browser geometry at 1440x900 and 1920x1080. No new API or dependency.

## Verification

- UI package build passed; existing packaging notice about `import.meta.env` remains.
- `node --test packages/ui/scripts/static-css.test.mjs`: 5 pass / 0 fail.
- `bun run check:vibe-governance`: passed; `git diff --check`: passed.
- Real browser 1440x900 and 1920x1080: icon/no-icon, loading/empty guidance, error recovery and collapsed/expanded long diagnostics; page errors and horizontal overflow 0. Title offset from Alert border changed 183.172→45px with icon and 221.594→17px without icon at 1440. These are CSS-slot fixtures using actual generated public CSS, not production application acceptance.
- Images: [1440x900](1440x900.png), [1920x1080](1920x1080.png); before images and full geometry are beside them.
- Reproduce: build UI, serve the repository root on localhost:5286, then run `playwright-cli run-code` with `verify.js`. `fixture.html` consumes the public native CSS and standard Alert slots.
