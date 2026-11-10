---
title: Casbin 权限控制适配器
description: 将 Casbin 策略授权引擎 (PERM / 多租户 RBAC) 接入 svadmin
---

`@svadmin/casbin` 为 Casbin 授权引擎提供 `AccessControlProvider` 适配器，支持经典的 PERM 元模型、多租户域模型（Domain-based RBAC）以及远程 Casbin REST 决策网关。

## 安装

```bash
bun add @svadmin/casbin casbin
```

## 基础用法

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

## 多租户域授权模型

当您的 Casbin 模型定义为 `[request_definition] r = sub, dom, obj, act` 时：

```typescript
const accessControl = createCasbinAccessControl({
  enforcer,
  user: () => 'alice',
  domain: () => 'tenant_org_1',
});
```

## 特性

- **标准 PERM 引擎**：无缝对接 `node-casbin` 或 `casbin.js` 本地执行器。
- **多租户租界隔离**：支持基于域的多租户隔离授权（`enforce(sub, dom, obj, act)`）。
- **集中式策略网关**：开箱即用支持集中式 Casbin REST 微服务决策端点。
- **Fail-Closed 故障安全**：异常或校验未通过时严格拒止并提供清晰的诊断信息。
