---
title: OpenFGA Access Control Provider
description: Connect OpenFGA relationship-based authorization (ReBAC) to svadmin
---

`@svadmin/openfga` provides an `AccessControlProvider` adapter for OpenFGA, implementing Google Zanzibar-inspired fine-grained relationship-based access control (ReBAC).

## Installation

```bash
bun add @svadmin/openfga @openfga/sdk
```

## Basic Usage

```typescript
import { OpenFgaClient } from '@openfga/sdk';
import { createOpenFgaAccessControl } from '@svadmin/openfga';
import { setAccessControlProvider } from '@svadmin/core';

const fgaClient = new OpenFgaClient({
  apiUrl: 'https://api.us1.fga.dev',
  storeId: '01H0GZXXXXXX',
  authorizationModelId: '01H0GZYYYYYY',
});

const accessControl = createOpenFgaAccessControl({
  client: fgaClient,
  currentUser: () => 'user:anne',
});

setAccessControlProvider(accessControl);
```

## Features

- **Fine-Grained ReBAC**: Evaluates permissions via OpenFGA tuple checks (`user`, `relation`, `object`).
- **Flexible Mapping**: Configurable `relationMap` and `objectTypeMap` to translate svadmin resources and actions (`list`, `show`, `edit`, `delete`) to OpenFGA relations (`viewer`, `editor`, `admin`).
- **Fail-Closed Safety**: Safely denies access and surfaces diagnostic reasons when checks fail or encounter network issues.
