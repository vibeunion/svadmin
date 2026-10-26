# B3-09 真实 example 多标签消费者

## 主线程最终验收（本轮最新源码）

- 本节前半部分为逐文件验证结果（当时未运行浏览器或构建）；最新补跑的 build、浏览器与完整目标零诊断见本节末尾两条。
- `auto-table-interactions.test.svelte.ts`：最终完整目标零诊断断言版 **59/59**，
  exit `0`，19.83s；此前 25.62s 为中间版本独立记录，不累计。
- `list-state.test.svelte.ts`：**20/20**，exit `0`，1.33s。
- `saved-list-views-model.test.svelte.ts`：**30/30**，exit `0`，3.28s。
- 8 个目标 Svelte/TS 文件定向 ESLint exit `0`；`git diff --check` exit `0`。
- 一次 `list-state` 命令误从仓库根目录启动，0 test、启动失败，不计作测试失败；
  改在 `packages/ui` 下重跑得到上述 20/20。
- 本轮早期验证范围：scope 退休、首帧请求隔离、首次身份延迟保留、新 session 隔离、
  受控分页排序、活动 saved view 标记。这里的“仍缺真实 dirty 表单消费者”是
  后续修正前的历史状态；完整滚动边界、跨窗口、真实后端、读屏和发布仍未验收。
- 上一轮 query/page/filter 刷新恢复的 12/12 与本轮补跑分别记录；最新结果见下条，
  其余历史阶段计数不累计。

- **最新 build 与浏览器（2026-10-24 收尾）**：最终生产源码 UI 定向 build exit `0`
  （仅既有 `import.meta.env` 打包警告）。build 结束后独立运行
  `playwright.workspace-tabs.config.ts`：**12/12 passed**、exit `0`、约 1.2m，
  12 项实际执行且无 skip。该 12/12 为本轮最新结果，与上文历史 12/12 分属不同
  批次，不合并计数；浏览器仍只覆盖 Chromium。
- **最新局部完整零诊断（2026-10-24 收尾）**：svelte2tsx 虚拟源纳入
  `AutoTable.svelte`、`DraggableHeader.svelte`、`AutoTableIdentityHydrationHost.svelte`，
  真实 TS 源纳入 `list-state.svelte.ts`、`saved-list-views.svelte.ts`（连同
  `saved-list-views.ts`），在 strict/exactOptionalPropertyTypes/
  noUncheckedIndexedAccess/noPropertyAccessFromIndexSignature、`skipLibCheck:false`
  下对目标逐一取 syntactic + semantic diagnostics，总数 **0**。此前 AutoTable 的
  6 个 TS7006 并非基线错误，而是前轮未纳入 `DraggableHeader` 虚拟源导致类型丢失。
  对应回归用例已把上述组件与 fixture 全部纳入并把断言改为完整目标
  diagnostics 为 `[]`（去掉 message 正则过滤），单文件 `-t "strictly types"`
  运行 1 passed / 58 skipped、exit `0`。该零诊断只代表上述目标集合，不代表全仓
  类型检查或发布验收。
- 原未验收边界保持不变：真实 dirty 表单消费者、完整滚动边界、跨窗口、
  真实后端/RBAC/租户/存储、读屏与发布部署仍未验收。

### 上轮浏览器与构建验收（历史）

- 下列 12/12、局部类型、build、ESLint、截图等是新增活动 saved view、首帧查询门
  与原生身份宿主之前的上一轮结果，保留为历史，不代表本轮最新源码已重跑浏览器。
- `bunx playwright test --config playwright.workspace-tabs.config.ts --reporter=line`：
  上一轮 **12/12 passed**、exit `0`、约 1.2m。包含查询/分页/筛选刷新恢复、滚动刷新、
  空态历史和 390x844 布局场景，均 Chromium；滚动场景实际执行，未跳过。
- 三个接入文件（WorkspaceTabsPage、LazyWorkspaceTabs、App）通过 svelte2tsx
  虚拟源及 TypeScript 局部 strict/exactOptionalPropertyTypes/
  noUncheckedIndexedAccess/noPropertyAccessFromIndexSignature 检查，0 个诊断。
  消费公开包声明，不代表整个 UI 包内部类型检查。
- 主线程 UI 定向 build exit `0`，AdminApp 与 MultiTabKeepAlive 的源码/产物
  `cmp` 一致；AdminApp 声明使用 `Component as PageComponent`，不再误用旧类。
  example check 为 0 errors / 3 个既有 Dashboard initial-value warnings；
  不是全仓类型或发布验收。
- 目标 Svelte/TS 文件 ESLint exit `0`；CSS 没有匹配的 ESLint 配置，不宣称
  CSS lint 通过。CSS 通过元素边界用例与截图复核。`git diff --check` exit `0`。
- 最终窄屏截图：
  `output/playwright/workspace-tabs-20261024/narrow-grid-fix-20261024.png`；
  主线程已查看，标题、Export/Create 和标签栏容器未越界。
- 初次浏览器运行与 UI 重新构建重叠，发生 HMR/登录等待失败，已作废；
  构建完成后重新启动预览并运行，最终专属 spec 结果以上述 12/12 为准。
- 滚动刷新续接中主线程发现 `storage: undefined` 不满足精确可选类型，
  pi 改为适配器已支持的 `null`；最新三个接入文件局部诊断仍为 0。
- 仍未完成：真实表单草稿与关闭保护接入、
  慢加载/布局变化/用户抢先滚动及多标签滚动刷新的完整边界、
  共享 QueryClient 回收策略、跨引擎/真实设备/读屏、生产后端/RBAC/租户/存储、
  打包发布及部署。本页面不是完整 B3-09 或整体企业级目标完成声明。

## 任务契约

- parent: `../evaluations/enterprise-ui-closeout-20261024.md`
- source: 用户要求继续直到全部完成
- reason: 真实 example 仍缺少使用现有资源的多标签消费者
- orchestration: managed medium risk；本任务只有一个代码 writer，主线程独立审查
- 写入范围:
  - `example/src/features/workspace/**`
  - `example/src/components/LazyWorkspaceTabs.svelte`
  - `example/src/App.svelte`
  - `e2e/workspace-tabs.spec.ts`
  - 专属 `playwright.workspace-tabs.config.ts`
- 非目标:
  - 不修改 `packages` 核心 API，不新增 draft 公共协议或生产存储
  - 不实现跨窗口同步、真实后端、RBAC 或发布部署
  - 不把 `inMemoryDataProvider` 描述为真实服务

## 验收场景

```gherkin
Scenario: 两个 AutoTable 的查询与分页互相隔离
  Given example 工作区使用现有 inMemoryDataProvider 和 AdminApp 的 QueryClient
  And 同时打开 Customer Accounts 与 Revenue Opportunities 两个资源标签
  When 在各自 AutoTable 中修改搜索条件和页码
  Then 两个标签保留各自的搜索/分页状态，切换后不串数据

Scenario: 浏览器前进后退与活动标签一致
  Given 工作区通过 URL 的 tab 参数记录活动标签
  When 用户选择另一个标签后触发浏览器后退或前进
  Then 活动标签、URL 和可见 AutoTable 面板同步变化

Scenario: 关闭或淘汰只清理自身快照，刷新不复活已关闭标签
  Given 多个标签分别持有 AutoTable 查询状态和适配器的滚动快照
  When 关闭活动标签或通过 maxTabs 淘汰 LRU 标签
  Then 仅清理被移除标签的快照，其他资源查询保持
  And 刷新后按当前身份会话的标签集合恢复，不复活已关闭/淘汰标签或已关闭的默认标签

Scenario: 通过单个 X 关闭最后一个标签
  Given 工作区只剩一个标签
  When 用户点击该标签的 X
  Then URL 不再包含 tab 参数，页面显示真实空态
  And 刷新后仍为空态，手动重开资源标签成功

Scenario: 滚动位置在隐藏前采样
  Given 当前标签存在真实纵向滚动条并已滚动
  When 切换到另一个标签再返回
  Then 返回后恢复切换前的 scrollTop
```

## 约束说明

- 工作区入口通过 `pageRoutes` 的 `/workspace` 自定义路由提供；活动标签放在
  hash 查询参数 `?tab=<resource>` 中，不改变 `AdminApp` 的 resource/id key。
- 标签内容使用真实 `MultiTabKeepAlive` 与 `createWorkspaceTabStateAdapter`；
  每个标签的 `AutoTable` 使用 `syncWithLocation={false}`，由各自实例保存搜索/
  分页状态，避免与工作区 URL 参数互相覆盖。
- 仅 example 使用显式 `sessionStorage` 持久化“标签资源集合 + 活动标签”，键和值都
  带版本；读取时严格校验版本、资源白名单、唯一性、`maxTabs` 上限以及空集合与
  活动标签的一致性。scope 取当前真实身份（identity id/email），不硬编码租户，
  也不声称这是生产租户隔离。`sessionStorage` 不可用或写入失败时标签仍可在当前
  内存中工作，但不会把本次会话误报为已持久化。
- 本轮只验证本地 example 消费者与浏览器历史；生产 storage、跨窗口同步和真实
  服务端验收仍未完成。

## 实现结果

- `example/src/App.svelte` 增加 opt-in 菜单入口和 `/workspace` 自定义
  `pageRoutes`；没有改动 `AdminApp` 的 resource/id 路由结构。
- `WorkspaceTabsPage.svelte` 使用真实 `MultiTabKeepAlive.openTab`、LRU 淘汰和
  `createWorkspaceTabStateAdapter`。每个标签的 `AutoTable` 保持挂载，搜索/分页由
  AutoTable 实例持有；适配器只负责当前组件实例的标签滚动快照并在关闭/淘汰时
  按标签清理。它不清理共享的 QueryClient 缓存，关闭标签后重新打开仍可能命中
  已缓存的查询数据；文档不把这种行为声称为 query cache 清理。
- 活动标签只更新同一 `/workspace` path 的 hash 查询 `?tab=<resource>`，并派发
  `popstate`。主要原因：走 `AdminApp` 导航入口会触发 auth recheck 并短暂卸载
  页面，导致 AutoTable 分页状态丢失；同 path 查询更新不改变 `AdminApp` key。
- 滚动快照在 `$effect.pre` 中、标签面板被隐藏前采样，再在切换完成后恢复；真实
  浏览器回归只在滚动容器确实出现纵向滚动条时运行，不使用人为插入填充替代表格。
- 单个 X 关闭最后一个标签与 Close All 都走同一空态清理：清空 URL 的 `tab` 参数、
  显示真实空态，并把空集合持久化；刷新后保持空态。默认资源不再是每次加载强制
  加入的标签，关闭默认 `crm_accounts` 后刷新不会复活。
- 页面标题只保留业务标题；实现/使用边界放在本文档。打开资源按钮使用
  `@lucide/svelte` 的 `Plus` 图标，不用文字加号。
- 严格类型修复后已定向重建 `packages/ui/dist`，其中 `MultiTabKeepAlive` 的
  `openTab`、`WorkspaceTabOpenResult`、`WorkspaceTabLimitReachedDetail` 均存在；
  工作区消费者已从临时相对 `src` 引用改回 `@svadmin/ui` 公开包入口，避免 example
  永久依赖构建旁路。未修改 packages 运行时 API 或 vite 配置。

## 本轮实际运行

- 先补回归用例并运行，观察真实失败：4 failed / 2 passed。失败包括关闭默认标签
  后刷新增量复活、关闭最后标签后 URL 残留且无空态、返回标签后 scrollTop 从 68
  丢为 0。
- `bunx playwright test --config playwright.workspace-tabs.config.ts`
  **6/6 passed**，Chromium desktop，exit `0`，21.8s；固定端口 `5186`，
  `strictPort`，只跑 `e2e/workspace-tabs.spec.ts`。
- 覆盖：两个现有 CRM AutoTable 的搜索/分页隔离、真实浏览器后退/前进与活动标签
  同步、关闭/淘汰只清理自身且其他资源查询保留、关闭默认标签后刷新不复活、单个
  X 关闭最后标签后 URL/空态/刷新/重开、真实滚动位置跨标签恢复。
- 定向 ESLint：workspace 页面、懒加载入口、e2e spec 和专属配置 exit `0`。
- `git diff --check`：exit `0`。未运行全仓测试或 `verify standalone`。

## 残留边界

- `sessionStorage` 持久化仅限 example 的标签集合与活动标签；scope 是 example
  当前身份，不是生产租户隔离。storage 被禁用时降级为内存状态，不能声称持久化成功。
- 当前消费者从未把标签标记为 dirty，因此本轮没有真实草稿验收；适配器的 draft
  字段只作为既有契约存在，不能把本次结果描述为草稿恢复或草稿保护验收。
- 共享 `QueryClient` 缓存不随标签关闭而删除；只移除当前组件实例和适配器自身
  快照。重新打开标签可能读取已缓存的列表查询结果。
- 仅验证 Chromium desktop，不是跨引擎、窄屏或读屏验收。
- 数据来自 `inMemoryDataProvider`，不是真实服务；未验证真实后端、RBAC、取消、
  幂等或跨租户。
- 未实现生产 storage 或跨窗口同步；查询、分页、筛选、排序及正常加载下的活动
  标签滚动已恢复到当前身份会话的 sessionStorage，非活动标签慢加载、存储故障
  和跨窗口同步仍未验收。
- 已定向重建本地 `packages/ui/dist` 并用公开入口回归；未发布、未提交该产物。

## 严格类型修复（B3-09 续接）

- scope 续接理由：`pageRoutes` 消费暴露声明生成 alias 冲突；只允许当前 workspace
  `WorkspaceTabsPage`、`LazyWorkspaceTabs`、`App` 与
  `packages/ui/src/components/AdminApp.svelte` 的本地类型别名命名调整，不改运行
  逻辑。
- `WorkspaceTabsPage.svelte`：在 `noPropertyAccessFromIndexSignature` 下把
  `record.version` / `record.resources` / `record.activeTabId` 改为方括号访问；
  `activeTabId` 显式声明为 `$state<string>`，默认值使用具名
  `DEFAULT_RESOURCE`，不再落入 resource union 与组件 `string` 绑定的冲突；
  `previousActiveId` 用 `untrack` 读取初始值并保持 `string`，消除 initial-only
  语义歧义。
- `LazyWorkspaceTabs.svelte`：移除 `void route` / `void params`，保留
  `route?` / `params?` 类型合约，并把二者作为 `LazyPage` 的 props 传递，消除
  Svelte `state_referenced_locally` 警告而不是用忽略或强制转换隐藏问题。
- `AdminApp.svelte`：`<script module>` 的本地 type alias 从
  `Component as SvelteComponent` 重命名为 `Component as PageComponent`。原因是
  svelte2tsx 生成的 `.d.ts` 顶部会注入
  `import { SvelteComponent } from "svelte"`（legacy class），与本地同名 alias
  碰撞后 `AdminPageRoute.component` 被错误解析为 legacy instance。
- 生成产物核对：`packages/ui/dist/components/AdminApp.svelte.d.ts` 顶部为
  `import type { Component as PageComponent } from 'svelte'`，
  `AdminPageRoute.component` 与 `declare const AdminApp` 均使用
  `PageComponent`，不再出现 legacy `SvelteComponent` 碰撞；
  `packages/ui/dist/components/MultiTabKeepAlive.svelte.d.ts` 中
  `openTab` / `WorkspaceTabOpenResult` / `WorkspaceTabLimitReachedDetail` 均存在。
- 未使用 `any`、`@ts-ignore` 或类型强转隐藏错误。

### 本轮严格类型修复实际运行

- `bun run --cwd packages/ui build`：定向重建 UI 产物，exit `0`。
- `bun run --cwd example check`：目标文件 `App.svelte`、`WorkspaceTabsPage.svelte`、
  `LazyWorkspaceTabs.svelte` 0 error / 0 warning；剩余 3 个
  `dashboardworkspace.svelte` initial-only warning 不在本任务 scope，未触碰。
- `bunx eslint packages/ui/src/components/AdminApp.svelte example/src/features/workspace/WorkspaceTabsPage.svelte example/src/components/LazyWorkspaceTabs.svelte --max-warnings 0`：
  exit `0`。
- `bunx playwright test --config playwright.workspace-tabs.config.ts`：
  **6/6 passed**，Chromium desktop，exit `0`，26.9s。

## 空态历史 URL 回归（B3-09 续接）

### 任务契约

- parent/source: 用户要求修复 B3-09 example workspace 主线程发现
- reason: 关闭全部标签进入空态后，浏览器后退会带回旧 `#/workspace?tab=<resource>`，
  空态工作区既不复活标签也不清理 URL，导致 URL 与活动标签不一致
- orchestration: managed；唯一代码 writer，保留 dirty 语义，未改核心 API 或 `App`
- 写入范围: `example/src/features/workspace/WorkspaceTabsPage.svelte`、
  `e2e/workspace-tabs.spec.ts`、本文档

### 失败复现（先红）

新增真实浏览器用例
`browser back to a closed tab URL keeps the empty workspace and does not reopen tabs`：

1. 打开 `crm_accounts`，点击 `crm_deals` 产生带 `tab` 参数的历史条目；
2. 依次关闭两个标签，确认 0 个标签、空态可见、URL 不含 `tab=`；
3. `page.goBack()` 回到旧 tab URL。

修复前运行结果：**1 failed**。`page.goBack()` 后 URL 实际为
`#/workspace?tab=crm_deals`，`expect.poll(...).not.toContain('tab=')` 在 5s 超时，
后续“0 标签 / 空态可见 / 面板不存在 / 手动重开恢复 URL”断言未执行。该失败证明
空态请求路径没有把历史 tab URL replace 回无 tab，而不是测试环境或选择器问题。

### 最小修复

`WorkspaceTabsPage.svelte`：

- 提取 `replaceWithEmptyWorkspace()`：清理 `pendingTabId`，若 hash 已为
  `#/workspace` 则跳过，否则对当前历史条目 `history.replaceState` 到
  `${pathname}${search}#/workspace` 并派发 `popstate`；
- 原有“`tabs.length === 0 && activeTabId === ''` 清理 URL”的 effect 改为调用该函数，
  行为不变；
- 请求同步 effect 在 `tabs.length === 0` 时直接返回：若存在任意 `requested` tab，
  只调用 `replaceWithEmptyWorkspace()`，不创建标签、不 push 新历史；
- 用户点击“打开资源”仍走 `openTab` 默认路径，由 `handleSelect` 新建标签并 push
  `#/workspace?tab=<resource>`。

修复未修改 `WorkspaceTab` 的 `dirty` 字段或关闭/淘汰逻辑；空态清理只替换 URL，
不清空也不重建标签集合，因此不会误改 dirty 状态。

### 本轮实际运行

- `bunx playwright test --config playwright.workspace-tabs.config.ts -g "browser back to a closed tab URL"`：
  修复前 **1 failed**（URL 残留，见上）；修复后该用例通过。
- `bunx playwright test --config playwright.workspace-tabs.config.ts`：
  **7/7 passed**，Chromium desktop，exit `0`，28.1s；固定端口 `5186`，
  `strictPort`，只跑 `e2e/workspace-tabs.spec.ts`。
- `bunx eslint example/src/features/workspace/WorkspaceTabsPage.svelte e2e/workspace-tabs.spec.ts --max-warnings 0`：
  exit `0`。
- `git diff --check`：exit `0`。三个目标文件当前为未跟踪文件，另用
  `git diff --no-index --check /dev/null <file>` 核对，均无空白错误。
  未运行全仓测试、类型检查或发布流程。

### 覆盖与边界

新用例覆盖：关闭最后标签后 URL 无 tab；`goBack` 到旧 tab URL 后 URL 被 replace
回无 tab、标签数仍为 0、空态可见、旧资源面板不存在；随后手动打开
`crm_contacts` 后新建标签并恢复 `tab=crm_contacts`。浏览器仅 Chromium desktop，
数据仍来自 `inMemoryDataProvider`，不代表跨引擎、生产存储或真实后端验收。

## 390x844 局部视觉修正（B3-09 续接）

### 任务契约

- parent/source: 用户要求修正 B3-09 最后局部视觉问题
- reason: 390x844 主线程截图中工作区内部宽度超过 358px，`h1` 右边界达 389.8px，
  `Create` 按钮被裁切
- orchestration: managed；唯一 CSS/e2e writer，保留 dirty，不重启主线程 5187 服务
- 写入范围: `example/src/features/workspace/workspace-tabs.css`、
  `e2e/workspace-tabs.spec.ts`、本文档
- 非目标: 不改 `packages`、不改全局 Layout、不改业务逻辑、不用 `overflow: hidden`
  掩盖溢出、不复制 production 配置

### 根因与最小修复

- 实测 390x844：`.workspace-tabs` 自身 358px，但其隐式 grid 列按内容
  min-content 分配，`ContentPageShell` 被撑到 389.8px，`h1` 跟随到
  `right=405.8`，`Create` 按钮 `right=401.8`，超出 390px 视口。
- `workspace-tabs.css`：给 `.workspace-tabs` 显式
  `grid-template-columns: minmax(0, 1fr)`，并给直接子项
  `.workspace-tabs > * { min-width: 0 }`，让 `ContentPageShell` 可被压缩到父宽；
  标题仅在 `[data-svadmin-content-header]` 内加 `overflow-wrap: break-word`。
- 空态 `.workspace-tabs__empty` 圆角从 `0.75rem` 收到 `0.5rem`（8px）。
- 未新增任何 `overflow: hidden` 裁剪；`tablist` 仍保留内部水平滚动。

### 定向浏览器边界断言

新增 `narrow 390px viewport keeps heading, actions and tablist inside the
viewport`，在用例内设置 390x844 后逐元素测量：

- root / shell / header / `h1` / toolbar / tablist / panes / pane scroller 的
  `getBoundingClientRect()` 左右边界都在视口内；
- shell 宽度不超过 root，root 与 h1 的 `scrollWidth <= clientWidth`；
- 活动面板中的 `Export`、`Create` 按钮 `toBeVisible()` 且右边界不超过 390px；
- tablist 允许 `scrollWidth > clientWidth`，滚动到最大后容器仍不超出视口；
- 关闭全部标签后空态可见、右边界在视口内、`borderTopLeftRadius <= 8px`。

断言不依赖 `document.scrollWidth` 作为唯一门槛：该用例先红在元素
`right=405.796875 > 390.5`，证明 body 隐藏横向滚动条时元素级测量仍能捕获溢出。

### 本轮实际运行

- 修复前（临时移除 grid/min-width 规则）：
  `bunx playwright test --config playwright.workspace-tabs.config.ts -g "narrow 390px viewport"`
  **1 failed**，`Expected <= 390.5, Received 405.796875`。
- 修复后同命令 **1 passed**；随后完整
  `bunx playwright test --config playwright.workspace-tabs.config.ts`
  **8/8 passed**，Chromium，exit `0`，51.2s；固定端口 5186、`strictPort`，
  只跑 `e2e/workspace-tabs.spec.ts`。
- 主线程 5187 现成服务器只读截图（未重启）：390x844，等 `document.fonts.ready`、
  双 `requestAnimationFrame`、连续两次布局快照一致后 capture，保存
  `output/playwright/workspace-tabs-20261024/narrow-grid-fix-20261024.png`。
  同时实测 root/shell 均 `x=16, w=358, right=374`，`h1 right=374`，
  tablist `right=330` 且内部 `scrollWidth=338 > clientWidth=306`，
  `Export right=105.2`、`Create right=206.3`，`document.scrollWidth=390`。
- `bunx eslint e2e/workspace-tabs.spec.ts --max-warnings 0`：exit `0`。
- `git diff --check`：exit `0`；目标 CSS/spec 为未跟踪文件，另用
  `git diff --no-index --check /dev/null <file>` 核对无空白错误。

### 残留边界

- 仅验证 Chromium 390x844 与既有 desktop 用例；未做跨引擎、真实移动设备或
  读屏验收。
- 只修正该 page 的局部布局宽度，未改全局 `Layout`、`ContentPageShell` 或
  `ContentPageHeader` recipe；其他页面若存在相同隐式 grid 行为需另开任务验证。

## 滚动刷新恢复子切片（B3-09 续接）

### 任务契约

- parent: 本文工作区消费者契约
- source: 用户“继续，直到全部完成”；主线程依据只读审计选择滚动刷新恢复子切片
- reason: 既有 example 的 `sessionStorage` 只保存标签集合与活动标签，刷新后同一
  活动标签的滚动位置丢失；适配器已有的持久化 storage 注入能力尚未被消费者使用
- orchestration: managed；唯一代码 writer，保留 dirty，不提交/发布/部署
- 写入范围: `example/src/features/workspace/WorkspaceTabsPage.svelte`、
  `e2e/workspace-tabs.spec.ts`、本文档
- 非目标: 不改 `packages` 核心 API；不恢复 query/page/filter；不虚构 dirty；
  不新增跨窗口同步或生产存储

### 红测（先失败）

新增真实浏览器用例
`reload restores the active tab scroll and reopening after close starts at zero`：

1. 1280x420 视口打开 `crm_accounts`，确认存在真实纵向滚动条后滚到
   `scrollTop=68`；
2. `page.reload()`，等待工作区标题与活动标签恢复；
3. 断言同一活动标签的 `scrollTop` 回到 68；
4. 关闭 `crm_accounts` 后重新打开同一资源，断言新标签 `scrollTop` 为 0。

修复前运行结果：**1 failed**，`Expected: 68, Received: 0`，10s 轮询超时。
失败发生在 reload 后的活动标签，而不是选择器或登录等待；证明刷新前没有把
滚动快照持久化，刷新后也没有可恢复的数据。

### 实现结果

`WorkspaceTabsPage.svelte`：

- 为 `createWorkspaceTabStateAdapter` 注入显式前缀
  `svadmin:example-workspace-tab-state` 的 `sessionStorage` 包装；`tenantId`
  仍是当前 identity 的 id/email scope。storage 在访问或探针写入失败时返回
  `undefined`，适配器降级为内存快照，不把本次会话误报为已持久化。
- `pagehide` 时捕获所有仍有布局盒（`getClientRects().length > 0`）的已挂载
  标签的 `scrollTop`/`scrollLeft`。隐藏面板 `display:none` 时读取滚动值会得到
  假 0，因此跳过不可测量面板，保留切换前已保存的快照，避免 pagehide 覆盖为 0。
- `onDestroy` 仅在根节点仍 `isConnected` 时采样，随后释放适配器；不会在父节点
  已卸载后读取不存在的 DOM 并写入假 0。
- 初次 identity hydrate 后恢复活动标签；标签切换时先同步采样旧标签，再在
  `tick()` 后恢复新激活标签。刷新后表格数据可能仍异步渲染，恢复使用有界
  `requestAnimationFrame` 重试，直到容器高度允许目标滚动位置；新的恢复请求会
  递增 generation，取消旧请求。
- 关闭/淘汰仍经 `adapter.clear({ id })` 清理该标签自身快照；同一实例的
  tombstone 阻止重开时回读旧滚动。关闭后再打开同一资源从 0 开始。
- 采样不再写入 `draft: tab.dirty === true`。当前 example 没有真实草稿状态，
  因此本轮既不恢复也不宣称恢复草稿；不虚构 dirty。

### 绿测与检查

- `bunx playwright test --config playwright.workspace-tabs.config.ts -g "reload restores the active tab scroll"`：
  **1 passed**（7.6s）。
- 完整专属 spec：
  `bunx playwright test --config playwright.workspace-tabs.config.ts`：
  **9/9 passed**，Chromium desktop，exit `0`，34.9s；固定端口 5186、
  `strictPort`，只跑 `e2e/workspace-tabs.spec.ts`。原有 8 个用例均通过。
- 主线程审查后 pi 修正精确可选参数和双轴 pending 检测；主线程最终独立
  同一 spec **9/9 passed**、exit `0`、37.0s，局部严格类型 0 个诊断，
  定向 Svelte/TS ESLint exit `0`，`git diff --check` exit `0`。
- `bunx eslint example/src/features/workspace/WorkspaceTabsPage.svelte e2e/workspace-tabs.spec.ts --max-warnings 0`：
  exit `0`。
- `git diff --check`：exit `0`。三个目标文件仍是未跟踪文件，另以
  `git diff --no-index --check /dev/null <file>` 核对，仅返回“文件有差异”的
  exit `1`，没有空白错误输出。

### 覆盖与边界

- 本轮只恢复 `scrollTop`/`scrollLeft`。没有恢复 query/page/filter，也没有
  修改 `AutoTable` 实例持有的搜索/分页状态；刷新后这些状态仍按既有行为丢失。
- 浏览器直接证明的是正常数据加载下活动标签的纵向滚动刷新与关闭重开；
  水平刷新、非活动标签刷新、SPA 离开重返、存储写/删失败和慢数据超过 60 帧
  重试预算尚无本轮浏览器证据。不得将实现路径存在等同这些边界已验收。
- 当前消费者没有真实 dirty 草稿，因此不能把本子切片描述为草稿恢复、草稿保护
  或 dirty 持久化验收。
- `sessionStorage` 仅用于 example 当前身份会话，不是生产租户隔离、跨窗口同步
  或服务端存储；storage 不可用时只保留内存快照。
- 仅验证 Chromium desktop 1280x420 的真实滚动条场景；没有滚动条时用例主动
  skip，不代表其他视口、移动设备或跨引擎已验收。
- 未修改 `packages` 核心、未运行全仓测试或 `verify standalone`、未提交、
  未发布、未部署。

## Query/page/filter 刷新恢复（B3-09 additive 公共契约）

### 任务契约

- parent: 本文工作区消费者契约；source: 用户要求实施 B3-09
  query/page/filter 刷新恢复的 additive 公共契约
- reason: example 已持久化标签集合、活动标签和滚动位置，但 AutoTable 实例持有
  的搜索、分页、筛选与排序在刷新后仍会丢失
- orchestration: managed；唯一代码 writer，保留全部 dirty，不提交/发布/部署
- 写入范围: `packages/ui/src/components/list-state.svelte.ts`、
  `packages/ui/src/components/AutoTable.svelte`、`packages/ui/src/index.ts`、
  对应 `list-state`/AutoTable 定向测试与 fixture、
  `example/src/features/workspace/WorkspaceTabsPage.svelte`、
  `e2e/workspace-tabs.spec.ts`、本文档
- 非目标: 不恢复 dirty draft，不改 `QueryClient` 清理策略，不新增生产存储、
  跨窗口同步、服务端同步或真实 provider 验收

### 公共 API 契约

- `ListStateSnapshot` 为严格导出类型：
  `{ search: string; filters: Filter[]; sorters: Sort[]; pagination: Pagination }`。
  不包含列可见性、草稿、远程视图元数据；快照复制复用 `cloneListFilter`，
  并新增 `cloneListStateSnapshot` 供消费者安全复制。
- `createListState` 新增可选 `initialListState` 和 `onStateChange`。初始化优先级
  明确为：受控 `externalPagination`/`externalSorters` > URL（仅
  `syncWithLocation()` 为真时） > `initialListState` > saved view > 资源默认值。
- `AutoTable` 新增可选 `initialListState?: ListStateSnapshot | undefined` 与
  `onListStateChange?: ((state: ListStateSnapshot) => void) | undefined`，并传给
  `createListState`。`onListStateChange` 读取实际生效的 `appliedSearchText`，
  因此搜索只在 debounce 应用后上报；回调前用序列化快照比较，避免每个 effect
  重复通知或自触发循环。
- 未提供 `initialListState` 时，URL/saved view/defaults 与既有行为一致；只在
  `initialListState` 存在时，身份/scope 恢复若没有活动 saved view 会重新应用该
  初始快照，避免既有的 scope reset 覆盖更高的初始优先级。

### example 持久化 envelope

适配器持久化条目原有的 `query` 字段现在承载严格 JSON envelope；滚动仍保存在
同一条目的 `scrollTop`/`scrollLeft` 字段，查询变化只更新 `query`，不会覆盖滚动
快照：

```json
{
  "version": 1,
  "resource": "crm_accounts",
  "path": "/workspace?tab=crm_accounts",
  "snapshot": {
    "search": "e",
    "filters": [],
    "sorters": [{ "field": "accountName", "order": "asc" }],
    "pagination": { "current": 2, "pageSize": 2 }
  }
}
```

- 读取时校验 `version`、`resource`、`path` 和 `snapshot` 的 search/filters/
  sorters/pagination schema；JSON 损坏、版本不符、资源/路径不符、非法筛选节点、
  非法排序或非法页码都按无快照丢弃，不回退到宽松解析。
- storage scope 仍是 example 当前 identity id/email 的 `sessionStorage`，不是
  生产租户隔离。
- 每个标签的 `AutoTable` 传入 `initialListState` 与 `onListStateChange`；身份
  hydrate 完成后按标签重建表格实例，确保其余 scope 稳定后再读取持久化快照。
- 关闭/淘汰沿用 `adapter.clear({ id })` 清理该标签的 query 与滚动快照；重开同一
  资源没有初始快照，因此回到空搜索、第 1 页和默认排序。
- 未修改共享 `QueryClient` 回收策略；关闭标签后重开仍可能命中既有查询缓存。

### 红测（先失败）

- `packages/ui` 定向单测新增初始优先级、debounce 后回调与 AutoTable 初始快照
  用例，修复前运行：
  `3 failed | 65 passed`。失败分别为 `initialListState` 未生效、回调未触发、
  AutoTable 未应用初始快照。
- 新增浏览器用例先运行：
  `2 failed, 1 passed`。`crm_accounts` reload 后搜索为空、`crm_deals` reload
  后搜索为空；关闭重开清零用例在既有实现下通过，保留为回归保护。

### 绿测与检查

- `packages/ui` 定向：
  `bunx vitest run --config ./vitest.config.ts
  src/components/list-state.test.svelte.ts
  src/components/auto-table-interactions.test.svelte.ts`
  **68 passed**，exit `0`。
- 专属 workspace spec：
  `bunx playwright test --config playwright.workspace-tabs.config.ts`
  **12/12 passed**，Chromium desktop，exit `0`，约 1.4m；原有 9 个场景全部通过。
- 浏览器覆盖：`crm_accounts` 搜索+分页在 reload 后恢复；`crm_deals` 搜索+筛选
  与 `crm_accounts` 查询隔离，活动/非活动标签都能恢复；关闭再打开 accounts
  搜索清零；两个恢复用例同时断言真实持久化 envelope 的版本/资源/路径/snapshot，
  并检查 `pageerror` 为空。
- `bun run --cwd example check`：0 errors / 3 个既有 dashboard initial-value
  warnings，均不在本任务范围。`bun run --cwd packages/ui build` exit `0`。
- 目标文件 ESLint `--max-warnings 0` exit `0`；定向 `git diff --check` exit `0`。
  三个未跟踪目标文件用 `git diff --no-index --check /dev/null <file>` 核对，
  没有空白错误输出。

### 覆盖与边界

- 不恢复 dirty 草稿；本轮没有真实表单草稿或关闭保护接入，不能把结果描述为
  草稿恢复验收。
- `crm_deals` 的资源字段当前没有启用 AutoTable 列筛选 UI，因此浏览器用例在
  reload 前通过真实适配器存储的 `query` envelope 注入 stage 筛选；reload 后仍走
  与 UI 修改相同的严格解码、初始快照和真实查询路径。这不等于列筛选控件本身已
  经浏览器验收。
- 仅验证 Chromium desktop；未验证跨引擎、移动设备、读屏、跨窗口或生产
  storage。数据来自 example 的 `inMemoryDataProvider`，不代表真实后端、
  RBAC、租户隔离或服务端幂等。
- 未改 saved view/URL 之外的既有行为，未改 `QueryClient` 清理策略；未提交、
  未发布、未部署。

## 初始查询快照生命周期修复 follow-up（B3-09）

### 任务契约

- parent: 本文上节“Query/page/filter 刷新恢复（B3-09 additive 公共契约）”
- source: 用户要求续接 B3-09，修复上轮已证实的初始快照跨 scope 重放漏洞
- reason: `AutoTable` 在租户/provider/身份切换时反复应用挂载时的
  `initialListState`，会把旧查询带入新作用域；远程默认视图也可能覆盖仍然有效的
  初始快照
- orchestration: managed medium risk；唯一代码 writer 负责实现与定向验证，
  主线程只读审查，不并行写入
- 写入范围: `packages/ui/src/components/AutoTable.svelte`、
  `packages/ui/src/components/list-state.svelte.ts`、
  `packages/ui/src/components/auto-table-interactions.test.svelte.ts`、
  `packages/ui/src/components/list-state.test.svelte.ts`、
  `packages/ui/test/fixtures/AutoTableInteractionsHarness.svelte`、本文档
- 非目标: 不重写列表/保存视图系统，不改 example 严格 JSON decoder，不新增生产
  存储、跨窗口同步、QueryClient 回收策略或后端契约；不提交、不推送、不发布、
  不部署
- 历史说明: 上节“身份/scope 恢复若没有活动 saved view 会重新应用该初始快照”
  是修复前行为，已被本节取代；上节其余 API、example envelope 和浏览器证据保留
  为历史记录，不追溯改写。

### 新契约

- 挂载时的 `initialListState` 先复制，只属于挂载 scope。进入其它
  resource/provider/tenant/identity scope 后永久退休；切回原 scope 也不能复活。
- 同一 session 的首次身份 hydrate（挂载时为 unresolved identity，随后解析为
  当前 identity，resource/provider/tenant 不变）保留初始快照的“可适用”状态，
  但不重新调用 `applyState`。用户已经在 hydrate 前应用的搜索、筛选、排序和
  分页保持不变。
- hydrate 之后的第一次真实 scope 切换退休初始快照；之后的切换继续走正常的
  saved view 恢复或默认重置，不是永久跳过 reset。
- 远程默认视图自动应用只在没有有效 `initialListState` 时发生。初始快照退休后，
  新 scope 可以应用自己的唯一远程默认视图；用户主动选择 saved view 仍然优先于
  初始快照之外的所有自动应用。
- `createListState.applyState` 不覆盖受控 `externalPagination`/`externalSorters`。
  `pagination.mode` 在初始化、捕获快照和应用快照之间保持一致。
- `onStateChange` 通过 `untrack` 调用，避免宿主回调读取的响应式状态进入列表
  effect 的依赖。传入的初始快照、回调快照与内部状态互不别名。
- example 的严格 JSON decoder、存储 key 与 envelope 本轮未修改。

### 验收场景

```gherkin
Scenario: 切换 scope 后旧初始快照不重放
  Given 一个已挂载的 AutoTable 带有 initialListState
  When 组件不 remount 地切换到其它 provider 或 tenant 再切回
  Then 新 scope 不包含旧搜索/筛选/分页
  And 切回原 scope 也不恢复已退休的初始快照

Scenario: 首次身份 hydrate 不覆盖用户操作
  Given AutoTable 在身份未解析时已应用 initialListState
  And 用户在 hydrate 前修改了搜索或分页
  When 同一 session 的 identity 解析完成
  Then 用户修改保持，不被初始快照覆盖

Scenario: 远程默认视图与初始快照的优先级
  Given 当前 scope 存在有效的 initialListState
  When 远程默认视图延迟返回
  Then 自动应用被阻止
  But 用户主动选择该 saved view 仍可应用
  And 初始快照退休后的新 scope 可以应用自己的远程默认视图

Scenario: 受控分页与排序
  Given AutoTable 处于 controlled pagination/sorters 模式
  When 列表 hydrate 或应用 saved state
  Then 受控分页、排序和 pagination mode 不被快照覆盖

Scenario: 快照与输入对象隔离
  Given 消费者在挂载后修改传入的 initialListState 对象
  When AutoTable 切换到新 scope
  Then 被修改的旧对象不会进入新 scope
  And 回调发出的快照被消费者修改也不会反向修改内部状态
```

### 红测（先失败）

命令：

```sh
cd packages/ui
bunx vitest run --config ./vitest.config.ts \
  src/components/list-state.test.svelte.ts \
  src/components/auto-table-interactions.test.svelte.ts
```

修复前结果：**5 failed | 69 passed (74)**，exit 非 0。失败用例：

- `retires a mounted initial snapshot after a scope switch and does not revive it`
  —— 新 scope 读到挂载后被修改的初始快照。
- `keeps initial state ahead of a delayed remote default while allowing an explicit saved view`
  —— 延迟远程默认视图覆盖了有效初始快照。
- `does not let a tenant-scoped identity hydration replay an initial snapshot`
  —— identity/tenant hydrate 后初始快照再次出现。
- `preserves the pagination mode across initialization and captured snapshots`
  —— 初始化与 `captureState` 丢失 `pagination.mode`。
- `does not overwrite controlled pagination or sorters when applying a saved state`
  —— `applyState` 覆盖受控分页与排序。

### 绿测与检查

- 逐文件定向：
  - `bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts`：**56 passed**，exit `0`。
  - `bunx vitest run --config ./vitest.config.ts src/components/list-state.test.svelte.ts`：**19 passed**，exit `0`。
- 合并定向：
  `bunx vitest run --config ./vitest.config.ts src/components/list-state.test.svelte.ts src/components/auto-table-interactions.test.svelte.ts`
  **75 passed**，exit `0`，约 21s。
- 目标文件 ESLint：
  `bunx eslint packages/ui/src/components/AutoTable.svelte
  packages/ui/src/components/list-state.svelte.ts
  packages/ui/src/components/auto-table-interactions.test.svelte.ts
  packages/ui/src/components/list-state.test.svelte.ts
  packages/ui/test/fixtures/AutoTableInteractionsHarness.svelte --max-warnings 0`
  exit `0`。
- `git diff --check` exit `0`。
- 本轮没有构建、没有运行浏览器、没有运行全仓测试；以上只证明列出的单元与静态
  检查，不是发布或完整 B3-09 验收。

### 覆盖与剩余边界

- 无 remount 的真实 AutoTable 回归覆盖 provider、tenant，以及由 tenant 变化触发
  同 provider identity 刷新的组合切换。没有单独隔离“tenant 不变、仅身份 id
  变化”的 AutoTable DOM 用例：切换 auth provider 会经过 `AdminApp` auth gate
  导致表格重新挂载，无法证明实例不 remount；因此不把该组合用例宣称为纯身份
  切换验收。
- 已覆盖延迟远程默认视图返回后不覆盖初始快照，以及退休后新 scope 应用自己的
  默认视图；尚未穷举同一 tick 内 scope 切换、远程列表返回和默认应用三者交错的
  请求瞬态，也不证明真实网络乱序或取消语义。
- 没有浏览器证据证明真实 example 在刷新、认证延迟或多标签并发下的生命周期；
  example 严格 decoder 本轮未改，也没有重新跑浏览器。
- 仍未覆盖草稿/dirty 恢复、跨窗口同步、生产存储、真实后端/RBAC/租户隔离、
  读屏、跨引擎或发布部署。

## 审查补强 follow-up（身份 hydrate、活动视图与查询启用门）

### 任务契约

- parent: 本文上节“初始查询快照生命周期修复 follow-up（B3-09）”
- source: 审查不接受上节证据不足，要求补足活动 personal view、真实
  deferred identity hydrate、scope 切换首帧请求、纯身份切换宿主、untrack
  响应式回归与增量类型诊断
- orchestration: 唯一代码 writer，保留全部 dirty；本轮未构建、未运行浏览器、
  未提交、未发布、未部署
- 写入范围: `packages/ui/src/components/AutoTable.svelte`、
  `packages/ui/src/components/list-state.svelte.ts`、
  `packages/ui/src/components/list-state.test.svelte.ts`、
  `packages/ui/src/components/saved-list-views.svelte.ts`、
  `packages/ui/src/components/saved-list-views-model.test.svelte.ts`、
  `packages/ui/src/components/auto-table-interactions.test.svelte.ts`、
  `packages/ui/test/fixtures/AutoTableIdentityHydrationHost.svelte`、本文档
- 非目标: 不重写列表/保存视图系统，不整仓类型重写，不改生产存储、后端契约、
  QueryClient 回收策略或浏览器验收范围

### 本轮修复

- `createSavedListViews` 新增 `initialStateOverridesSavedView`。挂载时已有
  `initialListState` 时，不再把 localStorage 里的活动 personal view 标记为
  当前视图；保存视图仍保留在列表中，用户仍可主动选择。身份/scope 恢复分支在
  初始快照仍有效时调用 `clearActiveSavedView()`，只取消当前作用域的活动标记，
  不删除保存视图，也不写其它作用域。
- 首次身份 hydrate 现在同时要求 resource/provider/tenant 不变且 auth session
  `cacheKey` 与挂载时一致。旧 session 的 pending getIdentity 即使随后解析出新
  身份，也不能被当作首个 hydrate 而保留旧初始快照。
- `AutoTable` 查询启用门增加 `queryScopeReady`：作用域恢复写入
  `loadedPreferenceScopeId` 之前不发送查询，避免新作用域首帧带上旧
  filters/sorters/pagination。该门不阻止身份 pending 期间的初始表格查询。
- `getCurrentSavedViewState()` 改用
  `captureSavedListViewState(snapshot, columns, fallbackPageSize)`：把
  `Pagination.current/pageSize` 的可选字段在写入持久化视图前补齐，消除
  `ListStateSnapshot` 到 `SavedListViewState` 的严格类型不兼容。
- 新增 `AutoTableIdentityHydrationHost.svelte`：用
  `provideAdminContext` + `QueryClientProvider` 直接挂载真实 `AutoTable`，
  不经过 `AdminApp` 鉴权门；测试通过 `login` mutation 推进同一 provider 的
  auth session，并用 DOM 节点 `toBe` 证明身份解析后未 remount。

### 红测（先失败）

- `prefers initial list state over an existing personal saved view until the user selects it`
  —— 设置活动 personal view 后，修复前 UI 下拉值仍为 `personal`，期望为 `''`。
- `strictly types the saved view pagination captured from list state`
  —— 修复前 `AutoTable.svelte.tsx:755` 报
  `Type 'Pagination' is not assignable to type '{ current: number; pageSize: number; }'`。
- `retires a mounted initial snapshot after a scope switch and does not revive it`
  —— 临时移除 `queryScopeReady` 后失败：新作用域首帧仍收到旧 `user` 筛选；
  恢复查询门后通过。

### 绿测与检查

- 逐文件定向，均 exit `0`：
  - `bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts`：**59 passed**。
    覆盖新增活动 personal view、deferred identity hydrate、受控
    pagination/sorters、主动应用 saved view、旧 session pending 新身份、
    scope 切换首帧请求和局部 strict diagnostic。
  - `bunx vitest run --config ./vitest.config.ts src/components/list-state.test.svelte.ts`：**20 passed**。
    新增真实响应式宿主回调读取的 `untrack` 回归。
  - `bunx vitest run --config ./vitest.config.ts src/components/saved-list-views-model.test.svelte.ts`：**30 passed**。
    新增 `initialStateOverridesSavedView` 不误标活动视图、仍可主动应用的模型回归。
- `git diff --check` exit `0`；新增 fixture 与 evidence 文件单独做
  `git diff --no-index --check /dev/null <file>` 核对空白。

### 覆盖与未覆盖

- 已覆盖：personal 保存视图存在且被持久化为活动视图时，初始查询快照仍优先；
  UI 不误标活动视图；用户主动应用它仍生效且不删除保存视图。deferred
  getIdentity 首次 hydrate 前表格可编辑，debounce 后 `onListStateChange`
  上报最新 search，hydrate 后保留最新 search 与受控分页/排序；随后主动应用
  saved view 不覆盖受控状态。同一 provider 通过 login 推进 auth session 时，
  旧 pending 身份不会被当作首个 hydrate，新 session 查询不发送旧搜索。scope
  切换后每条新查询都不含旧 filters/sorters/pagination。`untrack` 回调读取真实
  响应式宿主状态不会反向订阅。局部 `svelte2tsx` 严格诊断只守本次
  `SavedListViewState/pagination` 增量，不宣称整仓类型通过。
- 未覆盖：真实网络乱序/取消、真实后端或 RBAC/租户隔离、生产存储、浏览器、
  跨引擎、移动端、读屏、完整仓库 `svelte-check`/类型检查；本轮没有构建或
  发布证据。纯身份切换仅由直接宿主 + 同 provider login session 推进证明，
  未穷举所有外部 auth provider 实现。

## 本轮收尾清理与主线程复跑（2026-10-24）

- 仅做最小清理与文档：删除 `AutoTable.svelte` 重复中文注释，首次身份 hydrate
  英文说明改为一句中文；测试宿主 `AutoTableIdentityHydrationHost.svelte` 在
  `onDestroy` 清理其自有 `QueryClient`；`createSavedListViews` 的
  `initialStateOverridesSavedView` 保持可选并默认 `false`，不改生产语义。
- 主线程独立逐文件复跑最新源码：`auto-table-interactions` **59/59** exit `0`
  25.62s；`list-state` **20/20** exit `0` 1.33s；`saved-list-views-model`
  **30/30** exit `0` 3.28s。一次 `list-state` 命令误从根目录启动导致 0 test、
  启动失败，改在 `packages/ui` 下重跑成功，不计作测试失败。
- 8 个目标 Svelte/TS 文件定向 ESLint exit `0`；`git diff --check` exit `0`。
- 本轮未运行浏览器、构建、全仓测试，未提交、未推送、未发布；12/12 浏览器仍是
  上一轮结果，此轮未重跑。

## 真实 dirty 表单消费者子切片（B3-09 续接）

### 任务契约

- parent: 本文 B3-09 example 多标签消费者证据
- source: 用户要求继续 B3-09 真实 dirty 表单消费者，先红测再实施
- orchestration: managed；唯一代码 writer，保留工作区全部既有 dirty；未提交、
  未发布、未部署
- 写入范围: `example/src/features/workspace/WorkspaceTabsPage.svelte`、
  新增 `example/src/features/workspace/WorkspaceResourceEditor.svelte`、
  `example/src/features/workspace/workspace-tabs.css`、`e2e/workspace-tabs.spec.ts`
  与本文档
- 非目标: 不修改 `AutoForm`/`MultiTabKeepAlive` 生产 API，不恢复草稿字段或草稿
  内容，不新增生产存储，不改变现有资源标签行为，不跑全仓检查，不做跨引擎/
  移动端/读屏/真实后端验收

### Gherkin

```gherkin
Feature: real dirty editor tab in the example workspace

  Scenario: dirty editor tab is protected on close and cancel keeps the draft
    Given the user opens the real Customer Accounts editor workspace tab
    When the user changes a real AutoForm field
    Then the workspace marks that tab dirty
    And closing the tab opens the real AutoForm unsaved-changes guard
    And cancelling keeps the tab, the draft, and the dirty state

  Scenario: successful save clears dirty and close clears the tab adapter
    Given the dirty editor tab has a persisted tab-state adapter entry
    When the user saves the real AutoForm successfully
    Then the tab is no longer dirty
    And closing the tab does not open a guard
    And the closed tab's adapter snapshot is removed

  Scenario: reload restores tab identity but not draft content
    Given the editor tab has unsaved field values
    When the user reloads the page
    Then the editor tab and its query path are restored
    And the form shows the stored record value, not the unsaved draft
    And the tab is not falsely marked dirty
    And closing it does not open a stale unsaved-changes guard

  Scenario: existing resource tabs keep their behavior
    Given the existing CRM list tabs
    When the editor feature is present
    Then search, pagination, history, close/eviction, reload and scroll tests still pass
```

### 实现要点

- `WorkspaceTabsPage` 新增 `edit:crm_accounts:1` 标签与 `Edit demo account` 操作，
  会话标签集合升级为 v2，只保存标签 id 和 active id；列表标签 id 保持原值，
  现有资源标签行为不变。
- 新 `WorkspaceResourceEditor` 直接消费公开 `AutoForm`（`mode="edit"`、
  `redirect={false}`），用 `onNavigationGuardReady` 注册真实 guard；关闭标签时
  由该 guard 决定是否弹出未保存确认，确认后才执行同一个关闭动作。
- 首版标签 `dirty` 由宿主监听字段容器的 `input`/`change` 猜测；该实现已被下文
  “真实 dirty 回调修正（B3-09 续接）”取代，不能再作为完成声明。当前 dirty 只
  由 `AutoForm` 公开的 `onDirtyChange` 从真实 `form.isTainted()`/上传阻塞派生。
- 关闭/确认关闭统一走宿主清理：删除标签、清理 `editorGuards` 并
  `adapter.clear({ id })`。刷新恢复只重建标签 id 和活动标签，AutoForm 重新读取
  记录，因此不恢复草稿字段或草稿内容，也不会因旧 dirty 快照误保护。

### 红测（先失败）

命令：

```bash
bunx playwright test --config playwright.workspace-tabs.config.ts \
  -g "real editor tab|reload restores the editor" --reporter=line
```

结果：**2 failed / exit 1**。两个新场景都在等待
`[data-open-workspace-editor="crm_accounts"]` 时 60s 超时，证明实现前没有真实
可编辑工作区入口，而不是测试通过后才补断言。

### 绿测与检查

- 专属目标浏览器：

  ```bash
  bunx playwright test --config playwright.workspace-tabs.config.ts --reporter=line
  ```

  结果 **14 passed / exit 0 / 50.2s**（Chromium desktop）。其中 12 个为既有
  workspace 场景，2 个为本次新增真实 editor dirty/reload 场景；没有 skip。
  结果证明现有资源标签的搜索、分页、history、关闭/淘汰、空态、滚动和窄视口
  行为未回归。
- 局部严格检查：`bun run --cwd example check` exit 0；`tsc -p
  tsconfig.bun-tests.json` 通过，`svelte-check` 为 **0 errors**，仅有
  `dashboard/Workspace` 既有的 3 个 `state_referenced_locally` warning，与本次
  改动无关。
- 定向 ESLint：`WorkspaceTabsPage.svelte`、`WorkspaceResourceEditor.svelte`、
  `e2e/workspace-tabs.spec.ts` exit 0；CSS 由
  `bun run --cwd example styles:migrated:check` 覆盖，exit 0。
- `git diff --check` exit 0。

### 边界与未覆盖

- 本次只运行 Chromium desktop 目标配置，不是 Chromium/WebKit/Firefox 矩阵，
  也不是移动端视觉或读屏验收。
- 未验证真实后端、RBAC/租户隔离、生产 storage、跨浏览器标签页同步和真实网络
  失败/取消；editor 保存只由 example 的内存 provider 验证。
- 草稿内容明确不持久化：刷新后保留标签身份与查询路径，但字段值恢复为 provider
  记录值；不宣称草稿恢复、离线草稿或跨会话草稿。
- 首版没有新增 `AutoForm` dirty 回调，宿主只能按 DOM 事件猜测；该限制已由下文
  “真实 dirty 回调修正（B3-09 续接）”补上，旧描述保留为历史记录。
- 本子切片不等同 B3-09 或整体企业级完成；仍保留真实产品路由/Provider/查询缓存、
  跨窗口、生产存储、跨引擎、读屏和发布验收缺口。

## 真实 dirty 回调修正（B3-09 续接）

### 主线程独立复验（当前结果）

- 2026-10-24：当前差异审查完成；独立运行 `form-engine-reset.test.svelte.ts`
  **13/13**（15.97s）、`form-contract.test.svelte.ts` **102/102**（29.01s），
  均 exit 0，后者包含严格表单类型契约检查。
- 独立 UI build exit 0 后运行专属 workspace spec：**16/16**（1.1m），
  无 skip；Chromium，15 个桌面场景和 1 个主动设置 390px 的边界场景。
- 六个目标 Svelte/TS 文件定向 ESLint `--max-warnings 0`、`git diff --check`
  均 exit 0。构建保留既有 `import.meta.env` 警告，契约测试保留依赖
  `svelte2tsx/index.js.map` 缺失警告，未阻止验证。
- 本结果取代本文件更早“没有真实 dirty 消费者”的当前状态表述；旧计数只作
  历史证据，不累计。真实服务、身份切换、完整滚动和跨窗口等边界仍未关闭。

### 任务契约

- parent: 本文“真实 dirty 表单消费者子切片（B3-09 续接）”
- source: 主线程审查发现首版 `WorkspaceResourceEditor` 用 `input`/`change` 猜测
  dirty，自定义组合框选择不会触发这些 DOM 事件；同时 `WorkspaceTabsPage.beforeClose`
  在 `tab.dirty === false` 时直接放行，会绕过提交中保护
- orchestration: managed；当前唯一 writer，保留工作区既有 dirty；未提交、推送或
  部署
- 写入范围: `packages/ui/src/components/AutoForm.svelte`、
  `packages/ui/test/fixtures/FormEngineResetHarness.svelte`、
  `packages/ui/src/components/form-engine-reset.test.svelte.ts`、
  `example/src/features/workspace/WorkspaceResourceEditor.svelte`、
  `example/src/features/workspace/WorkspaceTabsPage.svelte`、
  `e2e/workspace-tabs.spec.ts` 与本文档
- 非目标: 不改 `MultiTabKeepAlive` 的公开关闭协议，不改 Core `form.isTainted()`
  的 taint-flag 语义，不新增草稿持久化、生产存储、跨窗口、真实后端、跨引擎或
  读屏验收

### 实现修正

- `AutoForm` 新增可选公开 prop
  `onDirtyChange?: (dirty: boolean) => void`。它只在当前表单作用域内，把
  `form.isTainted() || uploadBlocked` 的真实变化通知宿主；回调用 `untrack`
  调用，不把宿主读取带进该 effect。`reset()`、保存成功和上传队列清理都会让
  真实状态回到 clean 并再次通知。
- `WorkspaceResourceEditor` 删除字段容器的 `input`/`change` 猜测和
  `onSuccess` 手工清 dirty，改为直接把 `AutoForm.onDirtyChange` 接到宿主标签
  dirty 声明；自定义组合框、日期控件或程序化字段写入都由同一真实来源覆盖。
- `WorkspaceTabsPage.beforeClose` 对所有 editor 标签调用真实 guard，不再因为
  `tab.dirty === false` 直接放行；提交中不执行关闭，上传阻塞时需确认后才能
  关闭。同步确认时由 `MultiTabKeepAlive` 完成唯一一次移除；
  异步确认时由回调执行清理，避免两处同时关闭。
- 每次注册 editor guard 都生成新 token；关闭、确认关闭和身份 scope 变化都会
  退休旧 guard/token。迟到的异步确认回调若 token 不匹配、标签已移除或页面已
  销毁，不得关闭同一 id 的重开标签。editor 本身不强制 remount，避免刷新时
  AutoForm 重挂载产生假的 `Operation failed`；作用域切换由 AutoForm 自身
  scope 重置和 guard 重新注册处理。

### 红测（先失败）

- 单文件 `form-engine-reset.test.svelte.ts` 新增两条对 `onDirtyChange` 的回归。
  修复前运行：
  `bunx vitest run --config ./vitest.config.ts src/components/form-engine-reset.test.svelte.ts`
  结果 **2 failed / 11 passed**；失败均为 `currentDirty()` 一直为 `false`，
  证明公开回调尚未存在，而不是断言选择器问题。
- workspace spec 新增自定义关系组合框场景。修复前单独运行：
  `bunx playwright test --config playwright.workspace-tabs.config.ts -g "custom relation select"`
  结果 **1 failed**；选择 `Priya Raman` 后 `data-workspace-dirty-tabs` 仍为空，
  证明自定义控件修改没有进入宿主 dirty 声明。

### 绿测与检查

- 单文件：
  `bunx vitest run --config ./vitest.config.ts src/components/form-engine-reset.test.svelte.ts`
  **13 passed / exit 0**。新增覆盖：真实 dirty 通知、显式 reset 回到 baseline
  后清除、保存成功清除；原 11 条保留。
- 专属 workspace spec：
  `bunx playwright test --config playwright.workspace-tabs.config.ts --reporter=line`
  **16 passed / exit 0 / 约 1.2m**（Chromium desktop）。原 14 条全部保留；
  新增自定义关系组合框关闭保护/取消保留、确认关闭后标签与适配器快照清理。
- 为让 example 通过公开入口消费新 prop，定向执行
  `bun run --cwd packages/ui build`，exit 0；未发布该产物。
- 定向 ESLint：`AutoForm.svelte`、`FormEngineResetHarness.svelte`、
  `form-engine-reset.test.svelte.ts`、`WorkspaceResourceEditor.svelte`、
  `WorkspaceTabsPage.svelte`、`e2e/workspace-tabs.spec.ts` 均
  `--max-warnings 0`，exit 0。
- `git diff --check` exit 0；未跟踪目标文件用
  `git diff --no-index --check /dev/null <file>` 核对，无空白错误。
- 未运行全仓测试、未运行 `example` 全量 check、未做发布/部署。

### 覆盖与边界

- 已浏览器验证：自定义关系组合框（非原生 `<select>` 交互路径）修改后关闭会
  弹出真实未保存确认；取消保留选择；确认关闭移除标签和适配器快照；保存后
  dirty 清除并可无确认关闭；刷新不恢复草稿且不复活旧 guard。
- `form.isTainted()` 当前是 Core 的 taint-flag 语义：用户把字段手动改回初值
  仍保持 tainted；本轮的“回到初值清除”由显式 `reset()` 或保存成功证明，不是
  值相等比较。未改 Core 语义，以避免扩大范围。
- 未用延迟提交/上传制造浏览器级“提交中 dirty=false 不可关闭”证据；该路径由
  `beforeClose` 始终调用真实 guard 的代码保证，单元/浏览器未直接拉长提交窗口。
- 未做真实身份切换的浏览器用例，也未强制 editor DOM remount；只验证了 guard
  token 与 scope 退休逻辑，不能宣称所有真实 auth provider 切换均已验收。
- 仅 Chromium desktop、example 内存 provider；未验证真实后端、RBAC/租户隔离、
  生产存储、跨窗口、跨引擎、移动端或读屏。本修正不等同 B3-09 或整体企业级完成。
