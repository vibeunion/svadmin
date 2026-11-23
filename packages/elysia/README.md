# @svadmin/elysia

Elysia DataProvider for svadmin — CRUD convention + InferResourceMap type utility

## Install

```bash
bun add @svadmin/elysia
```

## Usage

```ts
import { createElysiaDataProvider } from '@svadmin/elysia';
import type { App } from './server';

const dataProvider = createElysiaDataProvider<App>({ apiUrl: 'http://localhost:3000' });
```

End-to-end type inference from Elysia routes via `InferResourceMap`, plus the conventional CRUD data provider.

Documentation: https://svadmin.nestjs.cn

License: MIT
