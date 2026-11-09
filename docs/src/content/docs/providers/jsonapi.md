---
title: JSON:API Provider
description: Connect JSON:API 1.0 specification backends to svadmin
---

`@svadmin/jsonapi` provides a standard `DataProvider` adapter compliant with the [JSON:API 1.0 specification](https://jsonapi.org/).

## Installation

```bash
bun add @svadmin/jsonapi
```

## Basic Usage

```typescript
import { createJsonApiDataProvider } from '@svadmin/jsonapi';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createJsonApiDataProvider({
  apiUrl: 'https://api.example.com/jsonapi',
});

setDataProvider(dataProvider);
```

## Features

- **JSON:API 1.0 Standard Compliance**: Automatically constructs compliant envelopes with `data.type`, `data.attributes`, and `data.relationships`.
- **Compound Document Unpacking**: Automatically resolves and links sideloaded `included` resources into record objects.
- **Specification-Compliant Filtering & Sorters**: Maps pagination to `page[number]`/`page[size]` (or `offset`/`limit`), sorting to `sort=-field`, and filters to `filter[field]=value`.
- **Zero Heavy Dependencies**: Pure TypeScript native implementation using Web standard Fetch API.
