---
title: OpenFGA 权限控制适配器
description: 将 OpenFGA 关系型细粒度授权 (ReBAC) 接入 svadmin
---

`@svadmin/openfga` 为 CNCF OpenFGA 提供 `AccessControlProvider` 适配器，实现对齐 Google Zanzibar 的细粒度关系授权（ReBAC）模型。

## 安装

```bash
bun add @svadmin/openfga @openfga/sdk
```

## 基础用法

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

## 特性

- **细粒度关系授权 (ReBAC)**：基于 OpenFGA 元组检查（`user`, `relation`, `object`）进行实时权限判定。
- **灵活映射机制**：支持自定义 `relationMap` 和 `objectTypeMap`，将 svadmin 资源操作（`list`, `show`, `edit`, `delete`）灵活映射至业务关系（如 `viewer`, `editor`, `admin`）。
- **Fail-Closed 故障安全**：发生网络异常或未明确授权时严格拒止并提供清晰的诊断信息。
