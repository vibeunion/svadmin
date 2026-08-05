---
title: 认证 Provider
description: 认证、身份管理和权限控制
---

svadmin 通过 `AuthProvider` 和 9 个响应式 Hook 提供完整的认证系统。

## AuthProvider 接口

```typescript
interface AuthProvider {
  login: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  logout: (params?: Record<string, unknown>) => Promise<AuthActionResult>;
  check: (params?: Record<string, unknown>) => Promise<CheckResult>;
  getIdentity: () => Promise<Identity | null>;
  // 仅限 UI 提示；API、RLS 和动作处理器必须独立授权。
  getPermissions?: (params?: Record<string, unknown>) => Promise<unknown>;
  register?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  forgotPassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  updatePassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  onError?: (error: unknown) => Promise<{ redirectTo?: string; logout?: boolean }>;
}
```

`getPermissions` 只作为 UI hint。只有应用提供可信 resolver 时才应返回权限；它不能替代 API、后端或数据库授权。

## 认证 Hook

| Hook | 用途 |
|------|------|
| `useLogin()` | 登录变更 |
| `useLogout()` | 登出变更 |
| `useRegister()` | 注册变更 |
| `useForgotPassword()` | 密码重置请求 |
| `useUpdatePassword()` | 密码更新 |
| `useGetIdentity()` | 获取当前用户信息 |
| `useIsAuthenticated()` | 检查认证状态 |
| `useOnError()` | 处理 API 错误（401→登出） |
| `usePermissions()` | 获取仅限 UI 的权限提示 |

### 用法

```typescript
const { mutate: login, isPending } = useLogin();
await login({ email: 'user@example.com', password: 'secret' });
```

内置 Supabase 与 SSO Provider 有意不实现 `getPermissions()`。应用可自行提供它来调整标签、
导航或禁用控件，但浏览器中的值绝不能授权 API、RLS 或动作请求；后端必须独立强制授权。

## 认证页面

内置毛玻璃风格认证页面：
- `LoginPage` — 邮箱/密码登录
- `RegisterPage` — 用户注册
- `ForgotPasswordPage` — 密码重置请求
- `UpdatePasswordPage` — 设置新密码

路由：`/#/login`、`/#/register`、`/#/forgot-password`、`/#/update-password`

## `<Authenticated>` 组件

```svelte
<Authenticated>
  {#snippet children()}<p>受保护的内容</p>{/snippet}
  {#snippet fallback()}<p>请先登录</p>{/snippet}
  {#snippet loading()}<p>正在检查认证...</p>{/snippet}
</Authenticated>
```

## Mock AuthProvider

```typescript
export const mockAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (password === 'demo') {
      localStorage.setItem('auth', JSON.stringify({ email }));
      return { success: true, redirectTo: '/' };
    }
    return { success: false, error: { message: '请使用密码 "demo"' } };
  },
  logout: async () => {
    localStorage.removeItem('auth');
    return { success: true, redirectTo: '/login' };
  },
  check: async () => ({ authenticated: !!localStorage.getItem('auth') }),
  getIdentity: async () => {
    const auth = localStorage.getItem('auth');
    return auth ? { id: '1', name: '管理员' } : null;
  },
};
```

## 内置认证 Provider

### Supabase

```typescript
import { createSupabaseAuthProvider } from '@svadmin/supabase';
const authProvider = createSupabaseAuthProvider(supabaseClient, {
  getPermissions: async ({ client }) => {
    const { data, error } = await client
      .from('effective_permission_grants')
      .select('permission');
    if (error) throw error;
    return data.map((grant) => grant.permission);
  },
});
```

`@supacloud/js` 不会改变认证流程。认证部分仍然建议继续使用官方 Supabase 客户端配合 `createSupabaseAuthProvider()`，任务相关 API 再通过 [`@svadmin/supabase/supacloud`](/zh-cn/providers/supacloud) 单独组合接入。
不要把用户可修改的 metadata 当成授权事实。

### Appwrite

```typescript
import { Account, Client } from 'appwrite';
import { createAppwriteAuthProvider } from '@svadmin/appwrite';

const client = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('PROJECT_ID');
const account = new Account(client);
const authProvider = createAppwriteAuthProvider({ account });
```

### PocketBase

```typescript
import PocketBase from 'pocketbase';
import { createPocketBaseAuthProvider } from '@svadmin/pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
const authProvider = createPocketBaseAuthProvider({ pb });
```

PocketBase 认证支持通过 `login()` 和 `register()` 的 `collection` 参数自定义集合名称。
