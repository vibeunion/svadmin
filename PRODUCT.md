# Product

## Users

Operators doing repeated administrative work: lists, records, settings, approvals,
and audits. Developers building those products on `@svadmin/ui` and
`@svadmin/core`. Downstream applications vendor these packages and treat this
repository as the design contract.

## Product purpose

svadmin is a headless Svelte 5 admin framework. The UI package supplies the
shell, settings, tables, and forms. The core package supplies theme ownership,
resources, and data hooks. A successful screen is dense, trustworthy, and
repeatable. It is not a marketing page.

## Positioning

The visual language is svadmin: neutral canvas `#F7F8FA`, one primary
action accent, hairline structure, 14px type, and 2px/4px radius. It is not the
marketing site, and it does not adopt gradients, a technical grid, or an
Inter-only aesthetic. shadcn-svelte and Bits UI remain the component
implementation. Named color themes swap the accent. They do not replace the
neutral system.

## Capabilities and constraints

- Compose `Layout`, `Sidebar`, `AutoTable`, `AutoForm`, `ConfigurationPage`,
  `SettingsGroup`, and `SettingsFieldRow` before adding markup.
- Keep `DataProvider` and Auth hook public APIs stable. Visual work does not
  change those contracts.
- Do not replace the component library or add a second theme.
- Preserve dark mode and the built-in color presets.
- `DESIGN.md` wins when a visual instruction conflicts with this file. This
  file wins when a change would turn the product into a different kind of
  interface.
