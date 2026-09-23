# AdminApp

> One-stop admin entry component / 一站式管理后台入口组件

## Import

```typescript
import { AdminApp } from '@svadmin/ui';
```

## Usage / 用法

```svelte
<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { createSimpleRestDataProvider } from '@svadmin/simple-rest';
  import { resources } from './resources';

  const dataProvider = createSimpleRestDataProvider({
    apiUrl: 'https://jsonplaceholder.typicode.com',
  });
</script>

<AdminApp {dataProvider} {resources} title="My Admin" defaultTheme="system" />
```

### With Auth / 带认证

```svelte
<AdminApp
  {dataProvider}
  authProvider={myAuthProvider}
  {resources}
  title="Secure Admin"
>
  {#snippet loginPage()}<MyLogin />{/snippet}
  {#snippet dashboard()}<MyDashboard />{/snippet}
</AdminApp>
```

## Props

| Prop | Type | Required | Default | Description / 描述 |
|------|------|----------|---------|-------------------|
| `dataProvider` | `DataProvider` | ✅ | — | Data source adapter / 数据源适配器 |
| `authProvider` | `AuthProvider` | — | — | Auth adapter / 认证适配器 |
| `routerProvider` | `RouterProvider` | — | hash | Custom router / 自定义路由提供者 |
| `resources` | `ResourceDefinition[]` | ✅ | — | Resource definitions / 资源定义 |
| `title` | `string` | — | `'Admin'` | App title (shown in sidebar) / 应用标题 |
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | — | `'system'` | Initial theme / 初始主题 |
| `themeConfig` | `ThemeConfig` | — | — | Theme config (strategy, CSS overrides) / 主题配置 |
| `locale` | `string` | — | provider locale, otherwise browser auto-detect (`en` during SSR) | Bindable tree-local locale override / 可绑定的树级语言覆盖 |
| `i18nProvider` | `I18nProvider` | — | — | Tree-local translation provider; explicit `locale` takes priority / 树级翻译提供者；显式 `locale` 优先 |
| `dashboard` | `Snippet` | — | — | Custom dashboard page / 自定义仪表盘 |
| `loginPage` | `Snippet` | — | — | Custom login page / 自定义登录页 |
| `loginDefaults` | `{ identifier?: string; password?: string; hint?: string }` | — | — | Prefill default login credentials / 预填默认登录凭据 |
| `components` | `Partial<ComponentRegistry>` | — | — | Override default components (DI) / 覆盖默认组件 |

Each `AdminApp` owns an isolated locale scope. When `locale` is omitted, the app uses `i18nProvider.getLocale()` first, then detects the browser language independently for that tree; server rendering defaults to `en`. Use `bind:locale` to observe and control locale changes without mutating another app instance or the legacy global locale.

每个 `AdminApp` 都拥有独立的语言作用域。省略 `locale` 时，组件会先使用 `i18nProvider.getLocale()`，否则为当前组件树独立检测浏览器语言；服务端渲染默认使用 `en`。可通过 `bind:locale` 观察和控制语言变化，不会污染其他应用实例或旧版全局语言状态。

## Component Injection / 组件注入

Override any built-in component via the `components` prop (Svelte Context-based DI):

通过 `components` prop 覆盖任意内置组件（基于 Svelte Context 的依赖注入）：

```svelte
<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import MyCustomLayout from './components/MyLayout.svelte';
  import MyCustomHeader from './components/MyHeader.svelte';
</script>

<AdminApp
  {dataProvider}
  {resources}
  components={{ Layout: MyCustomLayout, Header: MyCustomHeader }}
/>
```

Available slots: `Layout`, `Sidebar`, `Header`, `LoginPage`, `AutoTable`, `AutoForm`, `ShowPage`, `Button`, `Input`, `Badge`, `Skeleton`.

可覆盖的组件插槽：`Layout`、`Sidebar`、`Header`、`LoginPage`、`AutoTable`、`AutoForm`、`ShowPage`、`Button`、`Input`、`Badge`、`Skeleton`。

### Extended Slots (Optional) / 扩展插槽（可选）

These optional slots allow fine-grained customization of specific UI areas without replacing the entire Layout or Header:

这些可选插槽允许精细自定义特定 UI 区域，无需替换整个 Layout 或 Header：

| Slot | Description / 描述 |
|------|-------------------|
| `DashboardPage` | Custom dashboard page component / 自定义仪表盘页面 |
| `Breadcrumbs` | Custom breadcrumbs (replaces built-in) / 自定义面包屑 |
| `ThemeToggle` | Custom theme toggle button / 自定义主题切换按钮 |
| `UserMenu` | Custom user menu / avatar dropdown / 自定义用户菜单/头像下拉 |
| `NotificationPanel` | Custom notification panel / 自定义通知面板 |

```svelte
<AdminApp
  {dataProvider}
  {resources}
  components={{
    UserMenu: MyUserMenu,
    NotificationPanel: MyNotifications,
    ThemeToggle: MyThemeToggle,
    DashboardPage: MyDashboard,
  }}
/>
```

### Header rightActions Snippet

The Header component accepts a `rightActions` snippet for injecting custom actions (e.g. credits display, language switcher):

Header 组件接受 `rightActions` snippet，用于注入自定义操作（如积分显示、语言切换器）：

```svelte
<Header showSearch onSearchClick={...}>
  {#snippet rightActions()}
    <CreditsBadge />
    <LanguageSwitcher />
  {/snippet}
</Header>
```

Use `create-svadmin eject` to extract component source for customization. See [@svadmin/create README](../packages/create-svadmin/README.md).

使用 `create-svadmin eject` 提取组件源码进行深度定制。

### Layout surface contract / Layout 表面契约

The built-in `Layout` accepts an optional `class` for a host-owned root hook.
Its root exposes `data-svadmin-layout` and
`data-svadmin-layout-state="loading" | "ready"`, with `aria-busy` kept in sync.
The main content and footer expose `data-svadmin-layout-content` and
`data-svadmin-layout-footer`; use these hooks for scoped integration styling or
tests instead of relying on generated utility class names.

内置 `Layout` 支持可选的 `class`，用于挂载宿主自己的根节点样式钩子。根节点
提供 `data-svadmin-layout` 和
`data-svadmin-layout-state="loading" | "ready"`，并同步维护 `aria-busy`。
主内容和页脚分别提供 `data-svadmin-layout-content` 与
`data-svadmin-layout-footer`；集成样式和测试应使用这些钩子，不要依赖生成的
工具类名。

## Built-in Routing / 内置路由

AdminApp uses hash-based routing:

| Route | Page |
|-------|------|
| `#/` | Dashboard |
| `#/login` | Login |
| `#/:resource` | AutoTable (list) |
| `#/:resource/create` | AutoForm (create) |
| `#/:resource/edit/:id` | AutoForm (edit) |
| `#/:resource/show/:id` | ShowPage (detail) |
