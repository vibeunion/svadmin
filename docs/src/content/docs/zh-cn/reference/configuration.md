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
| `colorTheme` | `ColorTheme` | — | `'blue'` |

顶层未传 `dataProvider` 时，`providerBundle.dataProvider` 可满足必填数据源。为便于渐进迁移，顶层 Provider 属性会覆盖 `providerBundle` 内同名字段。企业 Provider 按组件树隔离；缺失时，对应的内置设置操作保持不可用，不会使用演示数据伪造持久化。

Provider 契约只定义 UI 与后端的边界。后端仍必须对每次调用强制执行授权和租户范围。敏感变更应在服务端原子地完成业务持久化与审计持久化；将 `writeAuditEntry()` 与远程业务调用分开执行，不会自动获得分布式事务能力。

企业 Provider 方法会收到当前 `AdminApp` 组件树的 `EnterpriseRequestContext`。`writeAuditEntry()` 会严格失败关闭，必须配置 `AuditLogProvider`；它不能替代在同一后端事务中同时提交敏感变更和审计记录。

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

## 配色主题

可用主题：`blue`、`green`、`purple`、`orange`、`rose`、`teal`、`slate`

```typescript
<AdminApp colorTheme="purple" ... />
```

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
