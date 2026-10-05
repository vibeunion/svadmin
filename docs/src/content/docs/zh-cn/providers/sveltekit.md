---
title: SvelteKit 集成
description: SvelteKit 路由提供器 — 基于文件路由、goto 和 page stores
---

`@svadmin/sveltekit` 提供与 SvelteKit 原生路由系统集成的 RouterProvider。

## 安装

```bash
bun add @svadmin/sveltekit
```

## 用法

```typescript
import { createSvelteKitRouterProvider } from '@svadmin/sveltekit';
import { setRouterProvider } from '@svadmin/core';

const routerProvider = createSvelteKitRouterProvider();
setRouterProvider(routerProvider);
```

## 工作原理

| RouterProvider 方法 | SvelteKit 实现 |
|--------------------|---------------|
| `go({ to, type })` | `goto(url)` / `goto(url, { replace: true })` |
| `back()` | `history.back()` |
| `parse()` | 从 `$app/state` 的 `page` state 读取 |

### 导航

使用 SvelteKit 的 `goto()` 进行导航，完整支持：
- **Push 导航** — 默认行为
- **Replace 导航** — `type: 'replace'`
- **查询参数** — 自动追加到 URL

### 路由解析

`parse()` 从 SvelteKit 的 `page` store 读取当前路由：
- `pathname` 来自 `$page.url.pathname`
- `params` 来自 `$page.params` + URL 查询参数
- SSR 或非 SvelteKit 环境下回退到 `window.location`

## 完整配置示例

```svelte
<!-- +layout.svelte -->
<script>
  import { setDataProvider, setAuthProvider, setRouterProvider } from '@svadmin/core';
  import { createSvelteKitRouterProvider } from '@svadmin/sveltekit';
  import { createSimpleRestProvider } from '@svadmin/simple-rest';

  setRouterProvider(createSvelteKitRouterProvider());
  setDataProvider(createSimpleRestProvider('https://api.example.com'));
</script>

<slot />
```

## 与内置路由提供器对比

| 特性 | `@svadmin/sveltekit` | `createHashRouterProvider` | `createHistoryRouterProvider` |
|------|---------------------|---------------------------|-------------------------------|
| 路由 | SvelteKit 文件路由 | Hash 路由 (`#/path`) | History API |
| SSR | ✅ | ❌ | ❌ |
| SEO | ✅ | ❌ | ✅ |
| SvelteKit 特性 | ✅ 完整（layouts、load 等） | ❌ | ❌ |
| 依赖 | `$app/navigation` | 无 | 无 |
