# Product-first generation rules

svadmin generates an admin application from business decisions, not from a raw resource list. Read this file before turning an API, database schema, or feature request into UI.

## Decision order

1. Write the product brief: primary outcome, audience, constraints, non-goals, and assumptions.
2. List the real workflows in actor language. Each core workflow needs a trigger, goal, steps, success criteria, exceptions, priority, and frequency.
3. Register resources as data contracts. A resource can be contextual or internal; it does not automatically become a page or menu item.
4. Define actions with an owning workflow and role visibility.
5. Define surfaces by purpose. Keep one primary action per surface, declare empty/loading/error/forbidden/success states, and move secondary actions into context or More.
6. Define menu nodes last. Every node should point to a workflow, resource, or surface and declare the roles that need it.

## Menu policy

There is no fixed menu-count limit. A small product may need one entry; a large operational product may need many. Do not delete business-required entries to satisfy an arbitrary count. Use role visibility, workflow frequency, placement, grouping, and contextual entries to keep the navigation legible. Backend authorization remains authoritative; menu visibility is only a UI hint.

## CLI review loop

Store the plan as JSON using schema version `product/v1`, then run:

- `svadmin vibe review ./svadmin.product.json` to report orphan resources, unserved workflows, unknown references, missing states, and dense surfaces.
- `svadmin vibe plan ./svadmin.product.json --role operator` to inspect the role-specific menu and generated page plans.

Fix product review errors before generating Svelte markup. Warnings are review prompts, not automatic page deletion rules.

## Visual acceptance

Generated pages must have one clear purpose, one dominant next action, and an explicit state contract. Prefer the existing `@svadmin/ui` page families and semantic tokens. Inspect long labels, dense tables, empty results, denied permissions, failures, and mobile layouts before accepting the result.
