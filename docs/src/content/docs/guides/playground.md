---
title: Playground
description: Ready-to-run vertical examples and scaffold paths
---

svadmin already ships runnable vertical examples. Use these instead of generating a large template farm.

## Example app

The repository `example/` app is the browser playground. It includes ready vertical workspaces:

- Property and real-estate operations
- Inventory, products, and purchase orders
- CRM accounts, contacts, and deals
- Mail, planning, and people administration

Start it from the repository root:

```sh
bun run dev
```

## Scaffold blueprints

`@svadmin/create` includes two vertical blueprints you can read or copy:

- `packages/create-svadmin/blueprints/customer-workspace` — customer list, detail, and provider wiring
- `packages/create-svadmin/blueprints/product-workspace` — product workspace composition

`create-svadmin init` writes a runnable app. `create-svadmin add provider <name> --write` wires `src/svadmin.config.ts`, `.env.example`, and `src/examples/<name>-smoke.ts`. Run that smoke file with Bun to exercise the provider. Hosted backends still need real credentials; the smoke command reports the missing variable instead of leaving a TODO stub.

`create-svadmin infer` writes a strict `defineResource()` contract that AutoTable and AutoForm can resolve.
