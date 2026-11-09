---
title: Kinde 认证适配器
description: 将 Kinde 现代化云身份与认证服务接入 svadmin
---

`@svadmin/kinde` 将 Kinde 身份认证 SDK 桥接至 svadmin 的标准 `AuthProvider`。

## 安装

```bash
bun add @svadmin/kinde @kinde-oss/kinde-auth-pkce-js
```

## 基础用法

```typescript
import createKindeClient from '@kinde-oss/kinde-auth-pkce-js';
import { createKindeAuthProvider } from '@svadmin/kinde';
import { setAuthProvider } from '@svadmin/core';

const kinde = await createKindeClient({
  client_id: 'your-kinde-client-id',
  domain: 'https://your-domain.kinde.com',
  redirect_uri: window.location.origin,
  logout_redirect_uri: window.location.origin,
});

const authProvider = createKindeAuthProvider({
  client: kinde,
  loginRedirectUri: window.location.origin,
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

## 特性

- **现代化云端认证**：零代码集成社交登录、企业级 SSO 及免密登录体验。
- **身份档案映射**：自动提取用户信息（`id`, `name`, `email`, 头像等）。
- **权限与特性开关**：开箱即用支持从 Kinde Token 提取用户权限列表。
- **会话生命周期管理**：完整适配 svadmin 统一的登录、登出、校验和错误拦截钩子。
