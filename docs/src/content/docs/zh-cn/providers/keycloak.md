---
title: Keycloak 认证驱动
description: 连接 Keycloak 企业级开源 OIDC/PKCE 单点登录与角色权限至 svadmin
---

`@svadmin/keycloak` 将 Keycloak 开源统一身份认证中心（IAM）桥接为 svadmin 标准的 `AuthProvider`。

## 安装

```bash
bun add @svadmin/keycloak keycloak-js
```

## 基础用法

```typescript
import Keycloak from 'keycloak-js';
import { createKeycloakAuthProvider } from '@svadmin/keycloak';
import { setAuthProvider } from '@svadmin/core';

const keycloak = new Keycloak({
  url: 'https://auth.company.com',
  realm: 'enterprise-realm',
  clientId: 'svadmin-portal',
});

await keycloak.init({
  onLoad: 'check-sso',
  pkceMethod: 'S256',
});

const authProvider = createKeycloakAuthProvider(keycloak, {
  clientId: 'svadmin-portal',
  rolesSource: 'all',
  defaultRole: 'user',
  minTokenValidity: 30,
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

## 配置项

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `clientId` | `string` | `undefined` | 客户端 ID，用于解析客户端独有资源角色。 |
| `rolesSource` | `'realm' \| 'resource' \| 'all'` | `'all'` | 角色提取源（Realm 角色、Client 资源角色或全部合并）。 |
| `defaultRole` | `string` | `'user'` | 当凭据中无角色声明时的回退兜底角色。 |
| `minTokenValidity` | `number` | `30` | 触发静默 Token 自动续期的阈值秒数。 |
| `loginUrl` | `string` | `undefined` | 未登录时的回退路由地址。 |
| `logoutRedirectUri` | `string` | `window.location.origin` | 单点登出后的重定向地址。 |
| `onTokenRefreshFailed` | `() => void` | `undefined` | 静默续期失败时的回调钩子。 |

## 核心特性

- **企业级 OIDC 与 PKCE**：遵循标准授权码与 PKCE 防劫持流程，无缝对接企业内网自建 Keycloak。
- **静默 Token 自动续期**：在 `check()` 鉴权探活过程中自动调用 `keycloak.updateToken()` 维持长效会话。
- **双重角色自动映射**：自动汇聚 `realm_access.roles`（全局角色）与 `resource_access[clientId].roles`（当前应用角色），无缝直通 svadmin 权限控制。
- **单点登出（Single Sign-Out）**：规范清理本地凭证并通知 Keycloak 服务端注销全局 SSO 会话。
