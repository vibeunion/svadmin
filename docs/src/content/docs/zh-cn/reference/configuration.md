---
title: 配置参考
description: svadmin 完整配置参考
---

## AdminApp 属性

| 属性 | 类型 | 必填 | 默认值 |
|------|------|------|--------|
| `dataProvider` | `DataProvider \| Record<string, DataProvider>` | ✅ | — |
| `providerBundle` | `ProviderBundle` | — | — |
| `authProvider` | `AuthProvider` | — | — |
| `accessControlProvider` | `AccessControlProvider` | — | — |
| `auditLogProvider` | `AuditLogProvider` | — | — |
| `organizationProvider` | `OrganizationProvider` | — | — |
| `identityGovernanceProvider` | `IdentityGovernanceProvider` | — | — |
| `sessionProvider` | `SessionProvider` | — | — |
| `credentialProvider` | `CredentialProvider` | — | — |
| `resources` | `ResourceDefinition[]` | ✅ | — |
| `routerProvider` | `RouterProvider` | — | Hash 路由 |
| `title` | `string` | — | `'Admin'` |
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | — | `'system'` |
| `themeConfig` | `ThemeConfig` | — | — |

顶层未传 `dataProvider` 时，`providerBundle.dataProvider` 可满足必填数据源。为便于渐进迁移，顶层 Provider 属性会覆盖 `providerBundle` 内同名字段。企业 Provider 按组件树隔离；缺失时，对应的内置设置操作保持不可用，不会使用演示数据伪造持久化。

Provider 契约只定义 UI 与后端的边界。后端仍必须对每次调用强制执行授权和租户范围。敏感变更应在服务端原子地完成业务持久化与审计持久化；将 `writeAuditEntry()` 与远程业务调用分开执行，不会自动获得分布式事务能力。

企业 Provider 方法会收到当前 `AdminApp` 组件树的 `EnterpriseRequestContext`。`writeAuditEntry()` 会严格失败关闭，必须配置 `AuditLogProvider`；它不能替代在同一后端事务中同时提交敏感变更和审计记录。

## 审计校验契约

远程审计实现应通过 `withValidatedAuditProvider(transport)` 接入。
`AuditLogTransport.create` 和 `get` 返回 `Promise<unknown>`；包装器先校验
输入和返回记录，再暴露 `AuditLogProvider`。全局注册也会自动包装。
审计记录只允许追加，旧的 `update` 方法已移除。

`writeAuditEntry` 接受 `AuditDraft`，不允许调用方提供 `id` 或 `timestamp`。
它生成规范 UTC 时间戳、复制纯 JSON 数据、等待 Handler 完成，并用原始输入
核对持久化 Provider 的回执。服务端可以添加生成字段，但不能修改已提交的值。
非法或未确认的写入会抛出不含原始数据的 `AuditError`；
`writeMayHaveSucceeded` 表示不能假定已经回滚或盲目重试。
尽力投递的 `audit` 只记录脱敏后的失败信息，不提供持久化成功确认。

迁移变更：

- 登录、退出事件可省略 `resource`，不能使用空字符串占位。
- `tenantId`、`requestId`、`traceId`、`mutationId`、`outcome` 保留为明确的
  事件字段；`details` 不再被改名为 `data`。
- 缺失可选字段必须省略，不能显式传入 `undefined`。嵌套值必须是纯 JSON；
  日期对象、访问器、循环引用和非有限数字都会被拒绝。
- Supabase 审计 Handler 在 `audit_log.details` 中保存完整校验事件，同时保留
  `action`、`resource`、`record_id`、`user_id`、`created_at` 索引列。
  数字记录 ID `0` 保存为 `"0"`。读取旧 details-only 格式的代码必须迁移；
  适配器不会自动重写历史数据。
- 数据库拒绝不再视为投递成功。经过校验的拒绝返回 `WRITE_REJECTED`；
  非法回执、超时和传输异常返回 `WRITE_OUTCOME_UNKNOWN`。

这些检查只验证数据契约，不替代后端授权、保留策略、数据库只追加约束，
也不保证业务变更与审计写入的原子性。

## 资源定义

```typescript
interface ResourceDefinition {
  name: string;               // URL 段（例如 'posts'）
  label: string;              // 显示名称（例如 '博客文章'）
  icon?: string;              // 侧边栏图标
  primaryKey?: string;        // 默认：'id'
  fields: FieldDefinition[];
  defaultSort?: Sort;
  pageSize?: number;          // 默认：10
  canCreate?: boolean;        // 默认：true
  canEdit?: boolean;
  canDelete?: boolean;
  canShow?: boolean;
  meta?: Record<string, unknown> & {
    dataProviderName?: string;  // 用于多 Provider 场景
  };
}
```

## 字段定义

```typescript
interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect'
    | 'tags' | 'textarea' | 'richtext' | 'image' | 'images' | 'json'
    | 'relation' | 'color' | 'url' | 'email' | 'phone';
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  width?: string;
  showInList?: boolean;
  showInForm?: boolean;
  showInCreate?: boolean;
  showInEdit?: boolean;
  showInShow?: boolean;
  options?: { label: string; value: string | number }[];
  defaultValue?: unknown;
  resource?: string;       // 关联资源（关系字段）
  optionLabel?: string;
  optionValue?: string;
  validate?: (value: unknown) => string | null;
}
```

## 主题配置

使用 `themeConfig` 选择配色预设和布局风格。默认布局为 `default`；
`clean-flat` 提供 Stripe 风格示例使用的克制、高对比后台布局。

```svelte
<AdminApp
  {dataProvider}
  {resources}
  defaultTheme="system"
  themeConfig={{
    colorPreset: 'stripe',
    layoutPreset: 'clean-flat',
  }}
/>
```

`ThemeConfig` 支持以下选项：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `strategy` | `'standard' \| 'dark-first'` | `'standard'` | 控制暗色模式添加 `.dark`，还是亮色模式添加 `.light` |
| `colorPreset` | `ColorPreset \| string` | `'stripe'` | 内置或注册的配色预设；已持久化或显式选择的主题优先 |
| `layoutPreset` | `'default' \| 'clean-flat'` | `'default'` | 应用外壳的布局风格 |
| `cssOverrides` | `Record<string, string>` | — | 注入 `<html>` 的 CSS 变量 |
| `disableColorScheme` | `boolean` | `false` | 跳过内置的 `color-scheme` 属性 |

内置 8 套配色预设：

| 主题 | ID | 预览色 |
|------|----|--------|
| Neutral | `neutral` | `#71717a` |
| Indigo | `indigo` | `#4f46e5` |
| Blue | `blue` | `#3b82f6` |
| Green | `green` | `#22c55e` |
| Rose | `rose` | `#f43f5e` |
| Orange | `orange` | `#f97316` |
| Violet | `violet` | `#8b5cf6` |
| Stripe | `stripe` | `#635bff` |

可使用 `registerColorPreset()` 添加自定义预设，或使用
`setColorTheme()`/`getColorThemes()` 在运行时切换。

## 国际化 (I18n)

`@svadmin/core` 内置了基于 `useTranslation` 的轻量级多语言系统。在组件中建议保留返回对象，并在模板中通过属性访问，让 Svelte 在渲染时读取最新值：

```svelte
<script>
  import { useTranslation, addTranslations } from '@svadmin/core';

  const i18n = useTranslation();

  addTranslations('ja-JP', { 'common.test': 'テスト' });
</script>

<h1>{i18n.t('common.save')}</h1>
<p>当前语言: {i18n.locale}</p>
<button onclick={() => i18n.setLocale('ja-JP')}>切到日语</button>
```
