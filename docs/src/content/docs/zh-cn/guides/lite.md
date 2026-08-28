---
title: Lite SSR 与组件对齐架构
description: 零 JS 服务端渲染降级方案、IE11 兼容纯 CSS 基线与 100% 组件对齐架构
---

`@svadmin/lite` 是 svadmin 体系中的服务端渲染（SSR）、零客户端 JS（Zero-JS）管理端组件库。它与 `@svadmin/core` 及 `@svadmin/ui` 完全共享相同的 `DataProvider`、`AuthProvider`、`Resource` 和 `FieldDefinition` 契约。

该包专门为政企客户、内网安全环境、老旧终端（如 IE11）以及弱网/低性能设备设计，通过原生 HTML 表单与链接提供完整的 CRUD 管理能力，无需在客户端运行复杂的 JavaScript 框架运行时。

---

## 架构本质：Lite 到底是什么？

在评估技术方案与架构边界时，首先需要明确 Lite 的本质与定位：

| 核心问题 | 架构本质事实 |
|---|---|
| **是做了一套 Tailwind IE11 吗？** | **不是。** Tailwind v4 面向现代浏览器设计。Lite 采用完全独立、自包含的 `lite.css`（约 19KB），基于标准 CSS Flexbox 实现，**完全不使用 CSS 变量（CSS Custom Properties）、不使用 CSS Grid、不使用现代伪类**（如 `:is()`、`:where()`、`:has()`、`:focus-visible`）。 |
| **是做了一套 shadcn-ui IE11 吗？** | **不是。** shadcn-svelte 依赖客户端 JS 运行时、Bits/Melt UI 状态机、动态 Portal 浮层及现代 CSS 变量。Lite 将其全量替换为**原生语义化 HTML 元素**（`<form method="POST">`、`<a>`、`<select>`、`<input>`）与纯 CSS 锚点（Fragment Target `#modal`）交互。 |
| **仅仅是我们组件的 IE11 适配吗？** | **是的，且是一套完整的无依赖管理端渲染层。** 核心是在服务端完成所有数据加载、表单验证与 HTML 拼装（SvelteKit SSR 配合 `csr = false`），输出的纯 HTML 页面在任意老旧浏览器中均可正常浏览与提交。 |
| **建议抽离出独立仓库维护吗？** | **强烈不建议独立建仓，建议保持 Monorepo 子包。** 保留在主仓库作为 `packages/lite`（`@svadmin/lite`）能够确保与 `@svadmin/core` 的数据契约、资源定义、表单 Schema 保持 100% 同步更新，避免跨仓库版本漂移与维护成本倍增。 |

---

## 组件体系与 100% 对齐覆盖

`@svadmin/lite` 实现了与 `@svadmin/ui` **100% 的组件对齐（72/72 个组件）**。现代 SPA 中的每一个 UI 组件，在 Lite 中均有严格对应的 1:1 服务端渲染组件或明确的语义降级方案。

### 模块对齐看板

```
===============================================================
       @svadmin/ui ↔ @svadmin/lite 组件对齐进度看板
===============================================================
  [fields]        29/29 (100.0%)  [██████████████]
  [buttons]       10/10 (100.0%)  [██████████████]
  [pages]           9/9 (100.0%)  [██████████████]
  [layout]          7/7 (100.0%)  [██████████████]
  [widgets]         6/6 (100.0%)  [██████████████]
  [advanced]      11/11 (100.0%)  [██████████████]
---------------------------------------------------------------
  总体覆盖率: 100% (72/72)
  - 1:1 对齐 (Exact): 55
  - 语义降级 (Fallback): 13
  - 免适配 (SPA Only): 4
  - 待补齐 (Missing): 0
===============================================================
```

### 组件分类清单

1. **核心页面 (Pages - 9 个)**:
   - `LiteListPage`: 列表页（服务端分页、排序链接、GET 搜索、批量删除）。
   - `LiteCreatePage` / `LiteEditPage`: 新建/编辑页（基于 TypeBox 的服务端表单校验）。
   - `LiteShowPage`: 详情查看页（键值结构展示与类型化字段渲染）。
   - `LiteProfilePage` / `LiteRegisterPage`: 用户资料与注册页。
   - `LiteForgotPasswordPage` / `LiteUpdatePasswordPage`: 密码找回与重置页。
2. **字段与复合选择器组件 (Fields - 29 个)**:
   - **文本与数值类**: `LiteTextField`、`LiteNumberField`、`LiteCurrencyField`（金额格式化）、`LitePercentField`（百分比与 CSS 进度条）、`LitePhoneField`（`tel:` 协议）、`LiteEmailField`、`LiteUrlField`、`LiteRatingField`（Unicode 星级）、`LiteCopyField`。
   - **选项与关联类**: `LiteBooleanField`、`LiteDateField`、`LiteDateRangeField`（区间与双日期输入）、`LiteSelectField`、`LiteMultiSelectField`、`LiteTreeSelect`（树形下拉）、`LiteCascader`（级联选择）、`LiteTagField`、`LiteRelationField`（外键关联）。
   - **媒体与复杂数据**: `LiteAvatarField`（首字母头像与状态点）、`LiteImageField`、`LiteFileField`、`LiteJsonField`、`LiteArrayField`（嵌套字段解析）、`LiteDynamicFormList`（动态子表单列表）、`LiteTransfer`（穿梭框）。
   - **语义降级字段**: `LiteCodeField`（降级为 `<pre><code>` 语法容器与 Textarea）、`LiteMarkdownField`（纯 HTML 渲染与 Textarea）、`LiteRichTextField`（安全过滤纯文本与只读展示）。
3. **操作按钮 (Buttons - 10 个)**:
   - `LiteListButton`、`LiteCreateButton`、`LiteEditButton`、`LiteShowButton`、`LiteCloneButton`（原生 `<a>` 链接）。
   - `LiteDeleteButton`（纯 CSS 锚点弹窗确认 + 原生 POST 表单）。
   - `LiteSaveButton`、`LiteRefreshButton`、`LiteExportButton`、`LiteImportButton`。
4. **布局与导航 (Layout - 7 个)**:
   - `LiteLayout`（响应式侧边栏+顶部栏+主容器，支持多级菜单）、`LiteSidebar`、`LiteHeader`、`LiteBreadcrumbs`、`LiteTabs`、`LiteEmptyState`。
5. **挂件与图表 (Widgets & Charts - 6 个)**:
   - `LiteStatsCard`、`LiteInsightCard`、`LiteAnomalyBadge`（KPI 指标卡与异常状态徽章）。
   - `LiteBarChart`、`LiteLineChart`、`LitePieChart`（纯 SVG/HTML 服务端渲染图表，附带纯文本数据降级表格）。
6. **高级交互与查询构造器 (Advanced UX - 11 个)**:
   - `LiteModalForm` / `LiteDrawerForm`: 纯 CSS Fragment Target (`#modal`) 无 JS 弹窗表单。
   - `LiteVirtualTable`: 优雅降级为服务端分页表格。
   - `LiteAutoSaveIndicator`、`LiteInlineEdit`、`LiteDraggableHeader`、`LiteToast`、`LiteFilterBuilder`（可视化多条件筛选构造器）。

---

## 双轨部署架构（Dual-Track）

推荐的生产实践是**双轨同构部署**：现代浏览器默认访问基于 `@svadmin/ui` 的单页应用（SPA），当检测到 IE11 等老旧浏览器或特殊访问参数时，在服务端自动路由至 `@svadmin/lite`。

```
                   [ 客户端 HTTP 请求 ]
                            |
                   [ SvelteKit 服务端 Hook ]
                            |
             +--------------+--------------+
             |                             |
       现代浏览器 (Chrome/Edge/Safari)     老旧浏览器 (IE11 / 极简模式)
             |                             |
      /admin/* 现代 SPA 路由          /lite/* 极简 SSR 路由
      @svadmin/ui                   @svadmin/lite
      Svelte 5 + Tailwind v4        纯 HTML + lite.css (零 JS)
```

### 1. 声明 Lite 路由为纯服务端渲染

在 `/lite/+layout.ts` 中禁用客户端 Hydration：

```typescript
// src/routes/lite/+layout.ts
export const ssr = true;
export const csr = false;
```

### 2. 编写服务端数据加载器与 Action

```typescript
// src/routes/lite/posts/+page.server.ts
import { createListLoader, createCrudActions } from '@svadmin/lite';
import { dataProvider, resources } from '$lib/admin';

const postsResource = resources.find(r => r.name === 'posts')!;

export const load = createListLoader(dataProvider, postsResource);
export const actions = createCrudActions(dataProvider, postsResource);
```

### 3. 页面视图组件

```svelte
<!-- src/routes/lite/posts/+page.svelte -->
<script lang="ts">
  import { LiteLayout, LiteTable, LitePagination, LiteSearch, LiteAlert } from '@svadmin/lite';
  import '@svadmin/lite/lite.css';
  import { resources } from '$lib/admin';

  let { data, form } = $props();
</script>

<LiteLayout resources={resources} currentResource="posts" brandName="管理后台">
  <div class="lite-header">
    <h1>{data.resource.label}</h1>
    <a href="/lite/posts/create" class="lite-btn lite-btn-primary">+ 新建</a>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="操作执行成功！" />
  {/if}

  <LiteSearch value={data.search} />
  <LiteTable
    records={data.records}
    resource={data.resource}
    currentSort={data.sort}
    currentOrder={data.order}
  />
  <LitePagination page={data.page} totalPages={data.totalPages} />
</LiteLayout>
```

### 4. 服务端 UA 嗅探自动重定向

```typescript
// src/hooks.server.ts
import { createLegacyRedirectHook } from '@svadmin/lite';

export const handle = createLegacyRedirectHook({
  litePrefix: '/lite',
  spaPrefix: '/admin',
  exclude: ['/api', '/_app', '/health'],
});
```

---

## 现代能力降级与边界规范

对于浏览器专有 API 或现代前端重型交互库，Lite 提供了标准化的业务承接降级策略：

| 现代前端能力 | 现代 SPA 方案 | Lite 零 JS 服务端降级方案 |
|---|---|---|
| **流程图 / 画布** | `@xyflow/svelte` / Canvas | `LiteVisualFallback`（静态 SVG / 快照 + 结构化节点/连线表格） |
| **复杂图表** | ECharts / Chart.js | `LiteBarChart` / `LiteLineChart`（服务端纯 SVG + 数据明细表） |
| **代码编辑器** | Monaco / CodeMirror | `LiteCodeField`（`<pre><code>` 语法容器 + 原生 `<textarea>`） |
| **富文本编辑器** | TipTap / Quill | `LiteRichTextField`（服务端安全 HTML + 原生 `<textarea>`） |
| **实时通讯** | WebSocket / SSE | `LiteRealtimeStatus`（数据生成时间戳 + 刷新链接 / 轮询） |
| **剪贴板 API** | `navigator.clipboard` | `LiteCopyField` / `LiteClipboardFallback`（原生选中复制） |
| **拖拽与分片上传** | HTML5 DND / FileSystem API | `LiteDirectoryUpload` / 原生多文件与 ZIP 上传 |

---

## 可视化进度追踪与维护工具链

为确保后续新增业务组件或 `@svadmin/ui` 迭代时能够方便补齐和追踪适配进度，Lite 建立了一整套完整的工具链：

1. **CLI 实时进度看板**:
   ```bash
   bun run check:parity
   ```
   终端直接输出分类覆盖率条形图与统计数据，并自动同步更新 `PARITY.md` 与 `parity.json`。
2. **静态全量矩阵文档**: 查看 [packages/lite/PARITY.md](https://github.com/vibeunion/svadmin/blob/main/packages/lite/PARITY.md) 了解每个组件的详细承接方案。
3. **交互式可视化 Showroom**: 启动 Demo 项目访问 `/lite/parity` 路由，可以在线交互预览全部 72 个组件的真实渲染效果、切换亮色/暗色主题并查看模块级覆盖率。
4. **自动化 CI 合约测试**: `scripts/parity-contract.test.ts` 已纳入 Monorepo 根目录 `bun run test`，当有未在矩阵中声明的 UI 组件时会自动阻断 CI，杜绝隐式遗漏。
