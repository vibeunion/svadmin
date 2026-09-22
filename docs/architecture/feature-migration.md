# Feature 模块迁移说明

业务页面不再通过 `src/pages` 作为正式架构入口。新代码必须放在：

```text
src/features/<module>/
```

每个模块至少提供一个公开入口：

```text
features/
  catalog/
    index.ts
    data.ts
    ProductsPage.svelte
  people/
    index.ts
    UserManagementPage.svelte
  calendar/
    index.ts
    CalendarPage.svelte
    CalendarWorkspacePage.svelte
  crm/
    index.ts
    CrmDashboardPage.svelte
    CrmOperationsPage.svelte
  mail/
    index.ts
    MailWorkspacePage.svelte
  operations/
    index.ts
    OperationsPage.svelte
    OperationsWorkspacePage.svelte
  ai/
    index.ts
    AiWorkspacePage.svelte
  property/
    index.ts
    PropertyOperationsPage.svelte
    RealEstateWorkspacePage.svelte
  domain/
    index.ts
    DomainWorkspacePage.svelte
    InventoryDirectoryPage.svelte
  case/
    index.ts
    CaseWorkspacePage.svelte
    case-actions.ts
    case-workspace.svelte.ts
  dashboard/
    index.ts
    Dashboard.svelte
  showcase/
    index.ts
    DesignPrinciplesPage.svelte
  resource/
    index.ts
    ExampleResourcePage.svelte
```

## 模块入口

页面和交互 API 的 `index.ts` 是模块公开边界；纯资源数据使用同级
`data.ts`，避免服务端或纯数据消费者静态加载 Svelte 页面：

```ts
export { default as ProductsPage } from './ProductsPage.svelte';
export const loadProductsPage = () => import('./ProductsPage.svelte');
```

应用页面组装层只能从 `features/<module>/index.ts` 导入页面和懒加载器；
资源组装层只能从 `features/<module>/data.ts` 导入纯资源数据。
禁止从其他模块的私有文件导入。

架构门禁会检查相对导入的最终路径：跨模块只允许 `index.ts` 或 `data.ts`，
不允许绕过公开入口导入 `resources.ts`、页面文件或内部状态文件。

## 迁移步骤

1. 创建 `src/features/<module>/`。
2. 移动页面和该页面专属的查询、命令、契约、组件到模块目录。
3. 将 `../` 相对路径按新目录层级修正。
4. 在 `index.ts` 中只导出模块公开 API。
5. 更新 `LazyResourcePage`、路由表或应用组装层，改为导入模块入口。
6. 将测试 fixture 和测试 import 改为 feature 入口。
7. 删除旧 `src/pages/<Page>.svelte` 路径，不保留兼容壳。
8. 运行：

```bash
bun run check:architecture
bun run typecheck
bun run --cwd example test -- test/business-rendering.test.ts
git diff --check
```

## 资源定义拆分

示例中的 53 个资源定义已移入各 Feature 的 `resources.ts`，根
`example/src/resources.ts` 负责组合、契约绑定和本地化，不再内联业务字段。
新增资源需同步模块资源集合、schema 和资源归属表。

这是破坏性迁移：资源数组现在按模块组合，不保证原来的数组下标或遍历顺序。
调用方应按资源 `name` 查找，菜单顺序使用 `menuOrder`，不得依赖数组下标。

根资源组装已通过 `data.ts` 导入纯资源数据，不会静态引入 Feature 页面；
`scripts/feature-data-entry.test.ts` 会检查每个资源模块的纯数据公开入口。

## 类型要求

- 业务记录必须来自 `@svadmin/core` 的资源契约或 TypeBox 推导类型。
- 页面 Props 使用显式类型，不使用 `any`。
- Provider 返回值进入 UI 前必须经过 schema/runtime decoder。
- 模块之间通过 `index.ts` 或核心契约通信，不直接访问私有实现。
