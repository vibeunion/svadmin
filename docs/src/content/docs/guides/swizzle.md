---
title: Component Swizzling
description: Eject official components into your project for deep source customization
---

The `svadmin swizzle` command implements the **Level 4 Escape Hatch** of the Vibe Coding ladder. It allows ejecting official `@svadmin/ui` components directly into your local project directory for customization.

## List Ejectable Components

```bash
bunx @svadmin/create swizzle --list
```

## Eject a Component

```bash
bunx @svadmin/create swizzle AutoTable --write
```

This ejects the component to `src/components/svadmin/AutoTable.svelte`, where you can modify its template, styling, and behavior.
