---
name: svadmin-vibe
description: Build product-first Svelte admin surfaces from a validated svadmin.product.json and generated page plans.
---

# svadmin Vibe

Read PRODUCT.md, DESIGN.md, ARCHITECTURE.md, svadmin.product.json and svadmin.ai.json before changing a generated project. Keep the product plan as the source of truth for roles, workflows, resources, surfaces and menu entries.

Start with the user outcome and workflow. Resources are data contracts and do not automatically become pages or sidebar entries. Menu count follows the business domain; do not remove required entries to satisfy a global limit. Keep one dominant action per surface and use progressive disclosure for secondary actions.

Generated files under src/generated are derived artifacts. Change svadmin.product.json and regenerate instead of editing them by hand. Product actions are metadata until a typed command or provider contract is connected. Never claim that an empty in-memory provider provides persistence, authorization, audit or production data.

Use the installed @svadmin/ui component registry and public type declarations. Keep the Svelte/SvelteKit stack, semantic tokens, responsive layout and state coverage. Verify with bun run check, bun run build and bun run test:ui, then inspect 1440x900 and 1920x1080 captures. Backend authorization, tenancy, audit and durable writes remain server responsibilities.
