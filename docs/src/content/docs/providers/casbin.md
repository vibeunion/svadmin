---
title: Casbin Access Control Provider
description: Connect Casbin policy-based authorization (PERM / RBAC) to svadmin
---

`@svadmin/casbin` provides an `AccessControlProvider` adapter for the Casbin authorization library, supporting standard PERM models, multi-tenant RBAC with domains, and remote Casbin REST policy gateways.

## Installation

```bash
bun add @svadmin/casbin casbin
```

## Basic Usage

```typescript
import { newEnforcer } from 'casbin';
import { createCasbinAccessControl } from '@svadmin/casbin';
import { setAccessControlProvider } from '@svadmin/core';

const enforcer = await newEnforcer('path/to/rbac_model.conf', 'path/to/policy.csv');

const accessControl = createCasbinAccessControl({
  enforcer,
  user: () => 'alice',
});

setAccessControlProvider(accessControl);
```

## Multi-Tenant Domain-Based RBAC

When your model defines `[request_definition] r = sub, dom, obj, act`:

```typescript
const accessControl = createCasbinAccessControl({
  enforcer,
  user: () => 'alice',
  domain: () => 'tenant_org_1',
});
```

## Features

- **Standard PERM Models**: Seamlessly evaluates policies with local `casbin.js` / `node-casbin` enforcers.
- **Multi-Tenant Domains**: Supports domain-scoped permissions (`enforce(sub, dom, obj, act)`).
- **Remote Policy Gateways**: Built-in HTTP client for centralized Casbin microservice endpoints.
- **Fail-Closed Design**: Automatically rejects access with diagnostic details when checks fail or encounter network issues.
