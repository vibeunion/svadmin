# Product workspace boundaries

Product mode separates product decisions from runtime resources:

- `svadmin.product.json` is the source of truth for roles, workflows, resources,
  surfaces and menu entries.
- `src/generated/product-plan.ts` parses the plan at the application boundary.
- `src/generated/resources.ts` exposes read-only resource metadata to svadmin.
- `src/generated/navigation.ts` filters product menu entries by role and feature
  flags. There is no fixed menu count.
- `src/generated/pages.ts` contains the renderer-neutral page plan.
- `src/generated/page-routes.ts` registers custom surface routes.
- `src/product-provider.ts` is an empty in-memory adapter for visual review.

Product actions are metadata until a typed command or provider contract is
connected. The generated scaffold never claims that a button performed a real
mutation. Server authorization, tenancy, audit, idempotency and persistence
remain backend responsibilities.
