---
title: Auth0 身份认证提供器
description: 将 Auth0 通用登录与 RBAC 权限接入 svadmin
---

`@svadmin/auth0` 将 Auth0 SPA SDK 客户端桥接为标准的 svadmin `AuthProvider`。

## 安装

```bash
bun add @svadmin/auth0 @auth0/auth0-spa-js
```

## 基本用法

```typescript
import { createAuth0Client } from '@auth0/auth0-spa-js';
import { createAuth0AuthProvider } from '@svadmin/auth0';
import { setAuthProvider } from '@svadmin/core';

const auth0Client = await createAuth0Client({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'https://api.yourdomain.com',
  },
});

const authProvider = createAuth0AuthProvider(auth0Client, {
  rolesKey: 'https://svadmin.dev/roles', // 自定义角色命名空间 claim
  defaultRole: 'user',
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

`logoutRedirectUri` 只作为 Auth0 的外部登出回跳地址使用。svadmin 认证钩子的 `redirectTo` 只接受 `/login` 这类站内路径；如果 `loginUrl` 用于应用内路由，请传入相对路径。

## 特性

- **Universal Login**: 支持 Auth0 标准的重定向或弹窗认证流程。
- **身份信息对齐**: 规范化提取 `sub`, `name`, `email` 及头像 `avatar`。
- **角色与权限集成**: 自动从 ID Token 声明中提取角色与权限数组。
- **失效会话治理**: 捕获 401/403 鉴权失败，安全触发登出与页面跳转。
