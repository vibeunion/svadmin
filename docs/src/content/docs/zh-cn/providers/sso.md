---
title: SSO 认证提供器
description: OIDC/OAuth2 单点登录 — Okta、Azure AD、Cognito、Keycloak、Google
---

`@svadmin/sso` 提供基于 OIDC Authorization Code Flow + PKCE 的 AuthProvider —— 浏览器端无需 client secret。

## 安装

```bash
bun add @svadmin/sso
```

## 支持的身份提供商

任何 OIDC 兼容的提供商均可使用：

| 提供商 | Issuer URL 示例 |
|--------|---------------|
| Okta | `https://your-tenant.okta.com` |
| Azure AD / Entra ID | `https://login.microsoftonline.com/{tenant}/v2.0` |
| Amazon Cognito | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}` |
| Keycloak | `https://your-keycloak.com/realms/{realm}` |
| Google | `https://accounts.google.com` |
| Auth0 | `https://your-tenant.auth0.com` |

## 基本用法

```typescript
import { createSSOAuthProvider } from '@svadmin/sso';
import { setAuthProvider } from '@svadmin/core';

const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'your-client-id',
  redirectUri: window.location.origin + '/callback',
});

setAuthProvider(authProvider);
```

## 配置项

```typescript
interface SSOConfig {
  /** OIDC 发行者 URL */
  issuer: string;
  /** OAuth2 客户端 ID */
  clientId: string;
  /** 登录后重定向 URI */
  redirectUri: string;
  /** OAuth2 作用域，默认: ['openid', 'profile', 'email'] */
  scopes?: string[];
  /** 登出后重定向地址 */
  postLogoutRedirectUri?: string;
  /** 覆盖 discovery 的公开 RP-Initiated Logout 端点 */
  endSessionEndpoint?: string;
  /** Token 存储方式，默认: 'local' (localStorage) */
  storage?: 'local' | 'session' | TokenStorage;
  /** 自定义身份映射函数 */
  mapIdentity?: (userinfo: Record<string, unknown>) => Identity;
  /** 自动刷新 Token，默认: true */
  autoRefresh?: boolean;
  /** 过期前多少秒刷新，默认: 60 */
  refreshBuffer?: number;
  /** 额外授权请求参数，例如 audience 或 prompt */
  authorizationParams?: Record<string, string>;
}
```

## 功能特性

### PKCE 流程

所有认证流程使用 Authorization Code Flow + PKCE —— 浏览器端推荐方案，前端不存储 client secret。

### 自动发现

自动从 `/.well-known/openid-configuration` 获取 IdP 配置，无需手动指定端点。

### Token 自动刷新

默认开启 `autoRefresh`，在 access token 过期前自动刷新。刷新失败则自动登出。

### 自定义身份映射

```typescript
const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'abc',
  redirectUri: '/callback',
  mapIdentity: (userinfo) => ({
    id: userinfo.sub as string,
    name: userinfo.preferred_username as string,
    avatar: userinfo.picture as string,
    email: userinfo.email as string,
  }),
});
```

### 权限提示

默认 SSO Provider 有意不实现 `getPermissions()`，也不会把 ID Token 的 `roles`、`groups`
或 `permissions` claim 转化为浏览器权限。应用如自行实现 `getPermissions()`，其结果也只能
用于标签、导航或禁用控件等 UI 提示。API 端点必须独立验证令牌并强制授权；该 hook 不是 API、
RLS 或动作授权边界。

### 调用受保护 API

当 Admin Console 需要使用当前 SSO 会话调用后端 API 时，可通过 `getAccessToken()` 获取 access token：

```typescript
const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'abc',
  redirectUri: '/callback',
  authorizationParams: { audience: 'admin-api' },
});

const token = await authProvider.getAccessToken();
```
