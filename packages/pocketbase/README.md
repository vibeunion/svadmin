# @svadmin/pocketbase

[![npm version](https://img.shields.io/npm/v/@svadmin/pocketbase.svg)](https://www.npmjs.com/package/@svadmin/pocketbase)
[![license](https://img.shields.io/npm/l/@svadmin/pocketbase.svg)](https://github.com/vibeunion/svadmin/blob/main/LICENSE)

Official, lightweight, and batteries-included **PocketBase** `DataProvider`, `AuthProvider`, and `LiveProvider` adapters for [svadmin](https://svadmin.nestjs.cn).

PocketBase is the most popular single-binary self-hosted open-source backend (Go + SQLite with realtime subscriptions, file storage, and auth).

---

## Features

- **Full CRUD Support**: Complete mapping for `getList`, `getOne`, `create`, `update`, `deleteOne`, `getMany`, and `deleteMany`.
- **Native Filter Syntax**: Flawlessly maps `@svadmin/core` filter trees and logical operators (`&&`, `||`) to PocketBase query expressions (`field = "..."`, `field ~ "..."`, `field > "..."`, `in`, `between`, `null`, `nnull`).
- **Multi-Field Sorters**: Maps ascending and descending sorting to PocketBase comma-separated format (`created,-status`).
- **Built-in AuthProvider**: Out-of-the-box password login, token persistence via `pb.authStore`, token refresh, registration, and user identity extraction.
- **Realtime LiveProvider**: Direct Server-Sent Events (SSE) subscriptions via `pb.collection(name).subscribe()` with automatic cleanup on unmount.
- **Contract Tested**: 100% strict contract validation against `@svadmin/core` specification.

---

## Installation

```bash
bun add @svadmin/pocketbase pocketbase
```

---

## Quick Start

```typescript
import PocketBase from 'pocketbase';
import {
  createPocketBaseDataProvider,
  createPocketBaseAuthProvider,
  createPocketBaseLiveProvider,
} from '@svadmin/pocketbase';

export const pb = new PocketBase('http://127.0.0.1:8090');

export const dataProvider = createPocketBaseDataProvider({ pb });
export const authProvider = createPocketBaseAuthProvider({ pb });
export const liveProvider = createPocketBaseLiveProvider({ pb });
```

---

## Filter Operator Support

| SvAdmin Operator | PocketBase Operator | Example Output |
| --- | --- | --- |
| `eq` | `=` | `status = 'active'` |
| `ne` | `!=` | `status != 'archived'` |
| `gt` / `gte` | `>` / `>=` | `created >= '2026-01-01'` |
| `lt` / `lte` | `<` / `<=` | `amount < 1000` |
| `contains` | `~` | `title ~ 'keyword'` |
| `ncontains` | `!~` | `title !~ 'spam'` |
| `startswith` | `~ 'val%'` | `sku ~ 'PRD%'` |
| `endswith` | `~ '%val'` | `email ~ '%@example.com'` |
| `null` / `nnull` | `= null` / `!= null` | `deleted_at = null` |
| `in` | `(...)` | `(role = 'admin' || role = 'editor')` |
| `between` | `(>= && <=)` | `(age >= 18 && age <= 65)` |

---

## License

MIT © [zuohuadong](https://github.com/zuohuadong)
