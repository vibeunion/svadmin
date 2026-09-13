---
title: 认证 Hook
description: 响应式认证 Hook
---

认证 Hook 提供响应式加载状态和经过校验的 Provider 回执。读取响应式属性时应保留
Hook 返回对象，不要提前解构成静态值。

## 契约与生命周期

除登出外，认证变更必须提供输入。Hook 在调用前保存输入快照，校验已知的身份和资料字段；
资料头像支持 `File`。登录凭据字段由各 Provider 定义，Provider 必须校验自己的业务 schema。
身份、登录态、变更回执和错误处理指令均先经过运行时 schema 校验。
`redirectTo` 只能是以 `/` 开头的应用内路径，不能是外部或协议相对地址。
不存在的可选字段应省略，不能显式返回 `undefined`。

刷新会立即撤回旧身份和登录状态。切换租户或 Provider、登出、卸载、新请求取代旧请求后，
迟到响应不能发布状态或继续跳转。会话版本按 Provider 隔离。
Hook 登录成功会刷新身份、登录态和权限提示；登出后清空这些结果，不自动请求旧会话。
未配置认证 Provider 的应用仍保留明确的开放模式。

Provider 原始诊断不会直接显示。变更失败通过 `result.error.name` 返回固定错误码；
传输或回执异常不代表服务端写入一定未发生。通知或路由失败也不会推翻已经确认的操作结果。
查询通过 `error` 返回 `AuthQueryError`。错误处理返回可区分的 `status`，只有确认登出成功，
才撤回身份、清理可用的查询缓存并跳转。这些客户端检查不能替代后端认证和授权。

## Hook 参考

### `useLogin()`

```typescript
const login = useLogin();
await login.mutate({ email: 'admin@example.com', password: 'secret' });
// Read login.isLoading from the hook object.
```

### `useLogout()`

```typescript
const { mutate } = useLogout();
mutate(); // 重定向到 /login
```

### `useGetIdentity()`

```typescript
const query = useGetIdentity();
// query.data → { id: '1', name: '管理员', avatar: '...' } | null
```

### `useIsAuthenticated()`

```typescript
const { isAuthenticated, isLoading } = useIsAuthenticated();
```

### `usePermissions()`

`usePermissions()` 只是客户端渲染辅助。它可以隐藏或禁用 UI，但 API、DataProvider 和数据库策略必须独立执行授权。

解析器必须返回 `null`、由非空权限字符串组成的数组，或权限名称到布尔值的映射。
Hook 会验证并冻结这些提示。自定义角色对象应在解析器中转换；不再支持任意返回泛型、
`Set` 或用字符串等非布尔值表示授权。刷新、切换租户或 Provider、登出时会撤回旧提示；
刷新失败不会恢复过期提示。登出后，若在 Hook 外建立了新会话，再显式调用 `refetch()`；
通过 Hook 登录成功时会自动刷新提示。

```typescript
const permissionHints = usePermissions();

// 使用 UI 提示调整导航或禁用控件。
if (permissionHints.has('admin')) { /* ... */ }

// 使用 resource:action 命名读取 UI 提示。
if (permissionHints.can('posts', 'edit')) { /* ... */ }

await permissionHints.refetch();
```

内置 Supabase 与 SSO Provider 会提供 `getPermissions()`，但在应用配置可信 resolver 前返回
`null`。resolver 的返回值只能作为 UI 提示，绝不能将浏览器中的值作为 API、RLS 或动作授权
决定；后端必须认证并授权每一个请求。

### `useOnError()`

```typescript
const { mutate } = useOnError();
mutate(error); // 调用 authProvider.onError → 可能登出或重定向
```

### `useRegister()`、`useForgotPassword()`、`useUpdatePassword()`

与 `useLogin()` 相同的变更模式。

认证变更 Hook 支持 `successNotification` 和 `errorNotification`。页面自行
展示完成状态时，应关闭自动成功反馈：

```typescript
const forgot = useForgotPassword({ successNotification: false });
```
