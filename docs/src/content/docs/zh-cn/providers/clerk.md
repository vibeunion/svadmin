---
title: Clerk 认证提供器
description: 将 Clerk 现代身份服务接入 svadmin
---

`@svadmin/clerk` 将 Clerk 完整的用户认证体系桥接为标准的 svadmin `AuthProvider`。

## 安装

```bash
bun add @svadmin/clerk @clerk/clerk-js
```

## 基本用法

```typescript
import { Clerk } from '@clerk/clerk-js';
import { createClerkAuthProvider } from '@svadmin/clerk';
import { setAuthProvider } from '@svadmin/core';

const clerk = new Clerk('pk_test_...');
await clerk.load();

const authProvider = createClerkAuthProvider(clerk, {
  signInUrl: '/login',
  rolesKey: 'role', // 从 user.publicMetadata[rolesKey] 提取角色
});

setAuthProvider(authProvider);
```
