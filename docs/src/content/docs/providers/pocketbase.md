---
title: PocketBase Provider
description: Connect PocketBase self-hosted backends with DataProvider, AuthProvider, and LiveProvider to svadmin
---

`@svadmin/pocketbase` provides official, lightweight, and batteries-included adapters for [PocketBase](https://pocketbase.io/) — the popular single-binary backend with SQLite, authentication, file storage, and realtime subscriptions.

## Installation

```bash
bun add @svadmin/pocketbase pocketbase
```

## Basic Usage

```typescript
import PocketBase from 'pocketbase';
import {
  createPocketBaseDataProvider,
  createPocketBaseAuthProvider,
  createPocketBaseLiveProvider,
} from '@svadmin/pocketbase';
import { setDataProvider, setAuthProvider, setLiveProvider } from '@svadmin/core';

const pb = new PocketBase('http://127.0.0.1:8090');

const dataProvider = createPocketBaseDataProvider({ pb });
const authProvider = createPocketBaseAuthProvider({ pb });
const liveProvider = createPocketBaseLiveProvider({ pb });

setDataProvider(dataProvider);
setAuthProvider(authProvider);
setLiveProvider(liveProvider);
```

## Features

- **Native Filter Syntax**: Seamlessly compiles SvAdmin multi-condition filter trees and logical operators (`and` / `or`) into PocketBase expressions (`id = "..." && created > "..."`).
- **Full CRUD & Batch Operations**: Maps `getList`, `getOne`, `create`, `update`, `deleteOne`, `getMany`, and `deleteMany` to PocketBase collection SDK calls.
- **Multi-Field Sorters**: Automatically joins sort directives into PocketBase comma-separated strings (e.g. `created,-status`).
- **Complete AuthProvider**: Direct authentication via PocketBase `authWithPassword`, automatic token synchronization in `pb.authStore`, user identity extraction, and logout.
- **Realtime LiveProvider**: Subscribes directly to SSE events using PocketBase `collection.subscribe()` with automatic resource cleanup.
- **Contract Tested**: Validated with complete automated contract suites against `@svadmin/core`.

## Filter Operators

| SvAdmin Operator | PocketBase Mapping |
| --- | --- |
| `eq` | `field = 'val'` |
| `ne` | `field != 'val'` |
| `gt`, `gte` | `field > 'val'`, `field >= 'val'` |
| `lt`, `lte` | `field < 'val'`, `field <= 'val'` |
| `contains`, `ncontains` | `field ~ 'val'`, `field !~ 'val'` |
| `startswith`, `endswith` | `field ~ 'val%'`, `field ~ '%val'` |
| `null`, `nnull` | `field = null`, `field != null` |
| `in`, `nin` | `(field = 'a' || field = 'b')`, `(field != 'a' && field != 'b')` |
| `between` | `(field >= min && field <= max)` |
