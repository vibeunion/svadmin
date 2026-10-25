# B3-05 详情工作台真实浏览器验收（2026-10-22）

## 本轮合同

- 目标：为 B3-05 详情工作台新增独立真实浏览器验收，真实挂载 `AutoTable` + `detailWorkspace`，不使用 `AutoTableInteractionsHarness`、`detail-workspace.test-host` 等测试宿主。
- 唯一 writer 与执行者：pi。未 commit、未 push、未 deploy。
- 允许修改：新增 `DetailWorkspaceBrowserFixture.svelte`、`detail-workspace.spec.ts`、`playwright.detail-workspace.config.ts`，在既有企业 fixture `App.svelte` 中增加 `view=detail-workspace` 路由，并更新本证据文档与 B3-05 验收矩阵。
- 未修改生产组件、API、样式或 token；未运行全仓 test/build/typecheck，只运行新增专属 Playwright 配置和 `git diff --check`。
- 浏览器矩阵沿用仓库既有约定：Chromium / WebKit / Firefox × desktop（1440×1000）/ narrow（390×844），共 6 个项目；端口选择未占用的 `4213`，`reuseExistingServer: false`。

## 受控 fixture 与真实边界

- fixture 直接挂载真实 `AutoTable`，通过真实详情抽屉传入 `detailWorkspace`；五区由真实 `DetailWorkspaceSections` / `DetailWorkspaceAsyncSection` 渲染。
- 关联区使用受控 snippet；附件、活动、审计、版本差异使用受控 provider，默认渲染器分别为真实 `FileList`、`AuditTimeline` 与 `VersionDiffViewer`。
- 数据来自 fixture 内存数组与受控 provider；权限来自受控 `AccessControlProvider`。这些是浏览器验收夹具，不等同真实后端服务或真实 RBAC：不证明服务端鉴权、租户/字段授权、持久化、真实附件/活动/审计/版本历史服务。
- provider 读取日志以普通数组挂在 `window.__detailWorkspaceCalls`；这只是把观测移出 Svelte 响应式依赖，避免观测代码本身制造循环，**不能据此证明生产 section 对 provider 同步响应式读取是健壮的**。后续组件级回归已确认真实生产 effect 存在重复请求缺口，见本文件“审查修正：生产 effect 依赖边界”和 `detail-workspace-audit-20261022.md`。

## 场景与断言

1. 打开详情后五区可见
   - 通过真实行内 Detail 按钮（键盘聚焦 + Enter）打开详情抽屉。
   - 断言 `data-svadmin-detail-workspace` 的 resource/record 属性为 `detail-workspace-records` / `1`。
   - 断言关联、附件、活动、审计、版本差异五个 `h3` 标题可见。
   - 断言关联 snippet 文本、真实 `FileList` 附件名、真实 `AuditTimeline` 活动/审计文本、真实 `VersionDiffViewer` 的 draft/published 差异均可见。
   - 逐项断言详情与四类 provider 最后一次读取都绑定 `detail-workspace-records` / record `1`；页面不泄露 fixture 私有诊断文本。
   - narrow 项目额外量取 `VersionDiffViewer` 的 `Side by Side` / `Unified` 按钮：必须完全位于所有裁切祖先与视口内；并用真实点击切换 `Unified`（出现 `- draft` / `+ published`）再切回并恢复分栏内容。

2. 附件 provider 失败显示 Retry 后恢复
   - 使用 `?fail=attachments-once` 让附件 provider 首次拒绝。
   - 断言附件区出现通用失败提示与 Retry，不显示旧附件，原始 `PRIVATE_DETAIL_WORKSPACE_ATTACHMENT_DIAGNOSTIC` 不泄露，provider 调用恰好 1 次。
   - 点击 Retry 后断言真实 `FileList` 显示 `attachment-record-1.txt`，错误态消失，provider 调用变为 2 次且两次 scope 都绑定同一条记录。

3. Escape 关闭并回焦详情按钮
   - 用键盘激活详情按钮打开抽屉。
   - 按 Escape 后断言抽屉隐藏、`data-svadmin-detail-workspace` 从 DOM 移除、详情按钮重新获得焦点。
   - WebKit 点击不会自动聚焦按钮，因此所有用例统一用 focus + Enter 打开，Escape 回焦断言在三引擎均成立。

4. 权限拒绝时详情区域不读取且不显示
   - 使用 `?deny=show` 让受控 `AccessControlProvider` 拒绝记录的 `show`。
   - 断言列表仍可见、show 权限已被查询、详情按钮不存在、没有 dialog、没有详情工作台 DOM。
   - 断言详情 `getOne`、附件、活动、审计、版本差异 provider 调用次数全部为 0，页面不泄露私有诊断文本。

5. 记录 A→B 五区切换、迟到结果隔离与关闭生命周期
   - 使用 `?controlled=deferred` 打开受控延迟模式；fixture 使用本地受控 `RouterProvider` 且 `syncWithLocation=true`，详情 row 按钮仍走真实 `AutoTable` 路由写入。
   - 抽屉内可见的 fixture 用户级按钮 `Switch to previous/next record` 通过 `router.go` 改写真实 `detail` route，不直接改 `AutoTable` 或 section 私有状态；后台行按钮被抽屉遮罩覆盖，因此不使用关闭再打开模拟同一抽屉切换。
   - 断言 A 的五区内容显示；切到 B 且 B 四类异步 provider 仍 pending 时，A 的关联/附件/活动/审计/版本文本立即消失，B 关联标记已出现，附件区显示真实 loading。
   - resolve B 后断言五区显示 B；再进行一次 A→B，在 B 已显示后让 A 的附件成功、其余分区失败，断言 B 内容不被覆盖、无错误态且不泄露迟到失败诊断。
   - 断言详情与四类 section provider 的每次调用都绑定 `detail-workspace-records`、recordId `1` 或 `2`，`meta.recordId` 与调用记录一致。
   - 最后在 B 抽屉按 Escape，断言抽屉隐藏、工作台卸载且真实 `detail` route 被清空；此前 `router.go` 的抽屉内切换留下 detail 历史，`AutoTable` 单次 `back()` 会回到 A，本轮据此红测并修复。

所有用例同时断言 `pageerror` 为空；narrow 项目额外断言页面无横向溢出。

## 实际执行

```bash
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts
```

- 结果：**24 passed**（4 个场景 × Chromium/WebKit/Firefox × desktop/narrow）。
- 原始退出码：**0**。
- Playwright duration：**16.4s**。
- 时序说明：该次 `24/24`、exit `0`、`16.4s`（pi）与主线程此前独立执行的 `24/24`、exit `0`、`16.5s` 均发生在 `DetailWorkspaceAsyncSection` 的 `untrack` 修复**之前**，只作为历史记录保留，不代表当前工作树版本；当前版本的浏览器证据见下文“审查修正：VersionDiffViewer 工具栏窄屏裁切”的 `43.8s`（pi）与 `38.2s`（主线程独立）运行。两次 `16.4s` / `16.5s` 为不同执行者记录，不合并。
- 执行主体：pi 自测；主线程已在修复后独立复跑全矩阵，结果 `24/24`、exit `0`、`38.2s`，与 pi 的 `43.8s` 分开记录、不合并。
- 截图目录（30 张，已在忽略目录）：`output/playwright/detail-workspace-browser-20261022/`
  - 每个浏览器/视口项目 5 张：`five-sections-open`、`attachments-failed`、`attachments-recovered`、`escape-restored-focus`、`show-denied`。
  - 命名示例：`chromium-desktop-five-sections-open.png`、`webkit-narrow-escape-restored-focus.png`、`firefox-desktop-show-denied.png`。
- `git diff --check`：原始退出码 **0**。

## 审查修正：生产 effect 依赖边界

此前浏览器 fixture 把 provider 调用日志挂到 `window`，只隔离了观测代码对 Svelte 响应式的写入，不能证明 `DetailWorkspaceAsyncSection` 本身不会因 provider 合法同步读取响应式状态而重复请求。该过强结论已纠正。

新增确定性组件回归：测试 host 的 provider 在同步执行栈内读取并增加一个响应式计数，并用请求上限防止无限循环；断言首次挂载只调用 1 次，点击 Retry 只再调用 1 次。

- 红测（生产未修改）：`detail-workspace.test.svelte.ts` 单文件 `1 failed | 8 passed`，原始退出码 `1`；配置上限 3 时首次挂载实际调用 4 次，期望 1 次。
- 最小修复：仅在 `DetailWorkspaceAsyncSection.svelte` 用 Svelte `untrack` 包裹外部 `provider.load` 的同步调用边界；`resourceName`、`recordId`、provider meta、tenant、auth session、access/audit provider 等依赖仍在 `untrack` 外侧捕获。
- 绿测（同一单文件）：`9 passed`，原始退出码 `0`，duration `8.21s`；首次挂载 1 次，Retry 后共 2 次。
- 修复后同文件 **pi 自测**：`9/9 passed`、原始退出码 `0`、duration `15.64s`；**主线程独立复跑**同一单文件：`9/9 passed`、原始退出码 `0`、duration `17.16s`。两次为独立运行，分开记录、不合并；与上文 `8.21s` 为同一文件不同次运行，也不合并。

## 审查修正：VersionDiffViewer 工具栏窄屏裁切

- 触发：主线程抽查 `output/playwright/detail-workspace-browser-20261022/webkit-narrow-attachments-failed.png`，发现 `VersionDiffViewer` 顶部 `Unified` 按钮右侧被裁切。页面级“无横向溢出”断言不能发现被内层 `overflow: hidden` 卡片裁切的局部控件。
- 本轮 pi 为唯一 writer；未 commit、未 push、未 deploy。只修改 `packages/ui/src/components/VersionDiffViewer.svelte`、`scripts/fixtures/enterprise-ui/detail-workspace.spec.ts` 与本证据文档、B3-05 矩阵条目；未改其他文件。
- 先补断言（修复前）：在首个场景中加入窄屏几何断言，量取 `Side by Side` 与 `Unified` 两个模式按钮相对所有 `overflow: hidden/clip/auto/scroll` 祖先及视口的边界，并要求切换模式的功能断言使用真实点击。
- 红测（生产未改，单 project 定位）：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts --project=webkit-narrow` → `1 failed | 3 passed`、原始退出码 `1`、duration `9.0s`；失败断言为 `detail-workspace.spec.ts:122` 的 `expect(geometry.clips).toEqual([])`，实际收到 `[\"DIV\"]`（`VersionDiffViewer` 根节点 `overflow: hidden`）。
- 最小修复：只复用既有 hashed 工具类别名——工具栏与按钮组加 `flex-wrap`、标题块加 `min-w-0`、两个模式按钮加 `flex-shrink: 0`；未新增 CSS/工具类/设计 token，未随 viewport 缩放字体，未改语义色。
- 绿测（单 project）：同命令 `--project=webkit-narrow` → `4 passed`、原始退出码 `0`、duration `8.5s`。
- 全矩阵（修复后重新取证）：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts` → **24 passed**（原 4 场景 × Chromium/WebKit/Firefox × desktop/narrow 全部保留）、原始退出码 `0`、duration `43.8s`（pi 自测）；主线程独立复跑同一配置 → **24/24 passed**、原始退出码 `0`、duration `38.2s`。两次为独立运行，分开记录、不合并；截图 30 张已在 `output/playwright/detail-workspace-browser-20261022/` 重新生成。
- 主线程抽查 `webkit-narrow-attachments-failed.png`，确认 `Side by Side` / `Unified` 两个模式按钮不再被裁切。
- `git diff --check`：原始退出码 `0`（pi 与主线程均确认）；四个新增浏览器文件与证据文档空白检查无问题。
- 未运行全仓 test/build/typecheck；未运行 `packages/ui` 颜色契约测试（本次只新增既有别名类用法，未新增颜色或 token，但仍属于未在本轮执行的项目）。

边界：该回归证明的是组件 effect 对 provider 同步响应式读取的依赖隔离，不替代真实浏览器矩阵、真实后端 provider 或服务端授权验收。本轮未修改既有浏览器 spec/fixture/配置；主线程对单测与浏览器矩阵的独立复跑已分别记录，但不据此宣称真实服务/RBAC、读屏、发布或部署完成。

## 本轮 A→B 浏览器补记（2026-10-22）

- 目标：在现有真实浏览器夹具内补 A→B 记录切换证据，保持受控内存 provider，不宣称真实后端；既有脏改动全部保留，pi 为唯一 writer/执行者，未 commit、未 push、未 deploy。
- 修改范围：`DetailWorkspaceBrowserFixture.svelte`（本地受控 `RouterProvider`、`syncWithLocation=true`、抽屉内切换按钮、受控 deferred provider 控制面、真实 detail route 观测输出）、`detail-workspace.spec.ts`（新增第 5 场景）、`AutoTable.svelte`（抽屉内切换后的关闭生命周期最小修复），以及本证据文档与 B3-05 矩阵。未改 `BoundRecordDetailDrawer` / `DetailWorkspaceSections` 等生产组件，未新增宿主掩盖缺口。
- 先红后绿（单 project 定位）：新增 A→B 五区切换与迟到结果断言在首跑即通过；再补“抽屉内 A→B 后按 Escape 必须清空真实 detail route”断言后，生产未改时 `--project=chromium-desktop -g "clears record A immediately"` → `1 failed`、原始退出码 `1`、duration `11.9s`，`detail-workspace-route-detail` 仍为 `~svadmin-id:["number",1]`。这暴露 `AutoTable.closeDetail()` 只调用一次 `routerProvider.back()`，在抽屉内已 push 过下一条详情时会回到 A，而不是关闭。
- 最小修复：`AutoTable` 记录打开详情时的 `detailOpenedId`；关闭时若当前 `detailRecordId` 已不同于打开时的记录，使用既有 `writeURLState({ detailId: undefined })` 清空当前 detail route，否则仍保留原有 `back()` 行为；scope 重置时同步清理该状态。未改 API、布局、颜色或 router 契约。
- 修复后同一单 project 新场景：`1 passed`、原始退出码 `0`、duration `2.0s`；同 project 全部 5 场景 `5 passed`、原始退出码 `0`、duration `4.9s`。
- 全矩阵：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts` → **30 passed**（原 4 场景 + 新增 A→B 1 场景，共 5 场景 × Chromium/WebKit/Firefox × desktop/narrow）、原始退出码 `0`、Playwright duration `26.5s`。该 `30/30、26.5s` 为本轮新增结果，与上轮主线程 `24/24、38.2s`、pi `24/24、43.8s` 分开记录、不合并。
- 截图：新增每项目 4 张（`a-to-b-before-switch`、`a-to-b-b-pending`、`a-to-b-b-ready`、`a-to-b-late-a-ignored`），目录现有 54 张；`git diff --check` 原始退出码 `0`。
- 边界：A→B 使用受控 RouterProvider、受控内存 section provider 与受控权限；证明真实浏览器/真实 `AutoTable` 消费者下的五区清空、B 完成渲染、迟到 A 成功/失败隔离与关闭生命周期，不证明真实服务端延迟/取消语义、真实后端、真实 RBAC、租户/字段授权、读屏、发布或部署。

## 审查修正：A→B→A 返回原记录后的关闭生命周期（2026-10-22）

- 触发：上一轮 `closeDetail()` 只比较 `detailOpenedId` 与当前 `detailRecordId`。同一抽屉 A→B→A 后两个 id 相同，但历史顶部仍是 B，单次 `back()` 会回到 B 而不是关闭。
- 范围：仅修改 `packages/ui/src/components/AutoTable.svelte` 的详情关闭生命周期、`scripts/fixtures/enterprise-ui/detail-workspace.spec.ts` 的必要断言与类型，以及本证据文档。`DetailWorkspaceBrowserFixture.svelte` 本轮未改；其他既有脏改动全部保留。未 commit、未 push、未 deploy。
- 断言先行：
  - 新增真实浏览器场景“closes A -> B -> A without returning to B”：打开 A 后在同一抽屉切到 B、再切回 A，断言当前工作台记录回到 1，然后按 Escape，断言抽屉隐藏、工作台卸载且真实 `detail` route 被清空。
  - 初次打开 A 且从未切换的既有 Escape 场景补充同一个真实 route 清空断言，保留其原有 `back()` 语义与查询参数保留行为；没有把“所有关闭”都改成 `replace`。
  - 延迟请求断言从“至少 N 次”收紧为精确 `toBe(4)`，继续覆盖 A→B、B→A、迟到 A 成功/失败隔离。
  - 移除新增测试中的 `only as never` 类型逃逸；spec 内 `sections` 参数改为 `'attachments' | 'activity' | 'audit' | 'versions'` 字面量联合类型，与 fixture 的受控分区键一致。
- 红测（生产未修改，单 project）：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts --project=chromium-desktop -g "without returning to B"` → `1 failed`、原始退出码 `1`、duration `12.4s`；失败点为 `detail-workspace-route-detail` 期望空字符串，实际仍为 `~svadmin-id:["number",2]`，即 Escape 回到了 B。
- 最小修复：`AutoTable` 记录详情打开后是否发生过详情路由切换的 `detailRouteChangedInHistory` 历史状态；打开详情、scope 重置和关闭时同步清理。关闭时若发生过切换，使用既有 `writeURLState({ detailId: undefined })` 清空当前 detail route；若首次打开后从未切换，仍调用原有 `routerProvider.back()`。未改 API、布局、颜色、router 契约或查询条件保留逻辑。
- 绿测（同一命令、同一单 project）：`1 passed`、原始退出码 `0`、duration `2.6s`。
- 单 project 全组：`--project=chromium-desktop` → `6 passed`、原始退出码 `0`、duration `8.2s`。
- 全矩阵（修复后最终取证）：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts` → **pi 自测 36/36 passed**（6 场景 × Chromium/WebKit/Firefox × desktop/narrow）、原始退出码 `0`、Playwright duration 约 `1.0m`；**主线程独立复跑同一配置** → **36/36 passed**、原始退出码 `0`、Playwright duration 约 `1.0m`。两次为独立运行，分开记录、不合并。
- 历史关系：修复前的共享主线程 `30/30`（A→B 场景版本）仅作修正前历史保留，不与本次 A→B→A 的 `36/36` 合并或代写；本轮新增 A→B→A 单 project 红测 `1 failed`、绿测 `1 passed`，`--project=chromium-desktop` 全组 `6/6 passed`，均已在前文单独记录。
- 截图：每个 browser/viewport 项目新增 1 张 `a-to-b-a-escape.png`，目录现有 60 张；`git diff --check` 原始退出码 `0`。
- 边界：本轮证明真实浏览器、真实 `AutoTable` 消费者与受控 RouterProvider 下的 A→B→A 关闭生命周期，不证明真实后端/RBAC、真实服务端取消/延迟、浏览器历史栈的跨页面恢复、读屏、发布或部署。

## 本轮补记：同一事件切换 provider 配置身份 + recordId（2026-10-22 follow-up）

- 目标：补明确缺口——五区浏览器用例此前只同时切换 recordId（同一 provider graph），没有验证“同一次用户事件同时更换整个 `detailWorkspace` provider 配置对象身份与 recordId”。
- 范围：仅修改 `scripts/fixtures/enterprise-ui/DetailWorkspaceBrowserFixture.svelte`、`scripts/fixtures/enterprise-ui/detail-workspace.spec.ts`、本证据文档与 B3-05 矩阵条目；未改生产组件/API/样式/token，未新增版本 API。pi 为唯一 writer，主线程审查；未 commit、未 push、未 deploy。
- fixture 变更：
  - 由 `createSections(provider)` 生成两套独立 provider 配置对象图 `workspaceConfigs.A / workspaceConfigs.B`；每个 provider 的 `load` 闭包捕获**固定**的 `provider` 常量并写进 `window.__detailWorkspaceCalls` 日志，日志不读取可变的当前 label，因此迟到的 A 调用不可能被记成 B。
  - relations 仍为真实 snippet，但拆为 `relationsSectionA` / `relationsSectionB`，共同渲染 `detail-workspace-relations-provider` 标记，用于断言实际生效的配置身份。
  - 新增抽屉内用户按钮 `detail-workspace-switch-provider-next`：同一次 `onclick` 内先切换 `activeProvider`（A↔B），再调用真实 `router.go` 改写 detail route；不直接改 `AutoTable`/section 私有状态，也不以关闭再打开模拟。
  - 受控 deferred 控制面按 `provider` + `recordId` + `section` 区分 pending；新增 `settleFor(provider, recordId, outcome, sections?)`，保留原 `settle(recordId, ...)` 与 `pending()` 兼容行为（旧 6 场景未改写）。
  - A 配置的渲染文本与旧用例完全一致（无后缀）；B 配置追加 `-B` 后缀，用于证明 B 自身数据渲染，而非残留 A。
- 新增场景（保留原 6 场景不动，共 8 场景）：
  1. **A 五区已显示 → 同事件切 B + record 2 → B pending 时 A 全部清空 → B 成功显示**：先断言 pending 恰为 `A:1:{attachments,activity,audit,versions}`，resolve A 后断言五区 A 内容与 provider 标记 A，且 A 四区各 1 次、B 为 0 次；点击按钮后断言工作台 record=2、标记 B、pending 恰为 `B:2:*`、A 的附件/活动/审计/版本/关联文本全部立即消失且附件区显示真实 loading；随后精确断言 A 只有 record 1 调用、B 只有 record 2 调用（各 1 次、完整 scope `{resourceName,recordId,meta:{recordId}}`）；resolve B 后断言 `attachment-record-2-B.txt`、`activity for record 2-B`、`audit for record 2-B`、`version-old/new-2-B` 显示，pending 为空，调用次数不变。
  2. **A 仍在途 → 同事件切 B + record 2 → B 显示 → A 附件迟到成功、活动/审计/版本迟到失败**：切换后 pending 同时包含 `A:1:*` 与 `B:2:*`，证明控制面按 provider+record 区分而非按当前 label；B resolve 后显示 B；再让 A 迟到成功/失败，断言 B 内容不被覆盖、无 `data-svadmin-detail-section-error`、无 `PRIVATE_DETAIL_WORKSPACE_LATE_FAILURE`、无 `pageerror`，最终 A/B 各 1 次且 scope 精确。
- 执行（只跑同专属 Playwright 单文件）：
  - 新场景先跑 `--project=chromium-desktop`：首次 1 passed / 1 failed，失败原因是场景二误把仍挂起的 `A:1:*` 排除在 pending 期望之外（A 的受控 promise 在 section 销毁后仍挂起）。修正为“A:1 与 B:2 并存”，属断言修正，非生产问题。
  - 修正后同一命令：**2 passed**、原始退出码 `0`、duration `3.2s`。
  - 同 project 全组 `--project=chromium-desktop`：**8 passed**（原 6 + 新 2）、原始退出码 `0`、duration `7.1s`。
  - 全矩阵 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts`：**48 passed**（8 场景 × Chromium/WebKit/Firefox × desktop/narrow）、原始退出码 `0`、duration `41.7s`。该 `48/48` 为本轮新增结果，与历史 `36/36`、`30/30`、`24/24` 分开记录、不合并。
  - 截图：每项目新增 5 张（`provider-switch-a-ready`、`provider-switch-b-pending`、`provider-switch-b-ready`、`late-a-b-ready`、`late-a-ignored-b-clean`），目录现有 90 张。
  - `git diff --check`：原始退出码 `0`。
- 边界：仍为受控内存 provider、受控 RouterProvider 与受控权限；证明真实浏览器 + 真实 `AutoTable` 消费者下“provider 配置对象身份与 recordId 同一事件切换”的五区清空、B 渲染、旧 provider 迟到成功/失败隔离与调用次数/完整 scope，不证明真实服务端取消/延迟语义、真实后端、真实 RBAC、租户/字段授权、读屏、发布或部署。

## 未验收边界

- 未连接真实后端、真实 RBAC、真实附件/活动/审计/版本服务；受控 provider 成功与失败不等于服务端行为或授权已验收。
- 未验证真实网络延迟、重试幂等、服务端分页/冲突、租户或字段级授权、独立审计 RBAC、服务端持久化。
- 未运行全仓 test/build/typecheck，未验证发布包、消费者生产构建、屏幕阅读器或部署。
- 详情对象 A→B 切换已在受控浏览器夹具中覆盖五区联动清空、B 完成渲染、迟到 A 成功/失败隔离与关闭生命周期；仍不覆盖真实服务端取消/延迟语义、真实后端或真实 RBAC。
- 窄屏工具栏修复只验证“两个模式按钮不被裁切且可切换”，未做像素级视觉回归，也未覆盖 320px 等更窄视口或长文案/长翻译下的工具栏换行。
## 当前主线程复核：详情配置与记录同时切换

- 2026-10-23 独立执行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts`：48/48 passed，exit 0，41.3s；与 pi 自测 48/48、41.7s 分开记录，不与历史次数合并。
- 审查确认 A/B 为两套独立配置对象图、load 闭包捕获固定身份；同一用户按钮事件替换详情配置并更新路由。四异步区精确断言完整 scope 和各一次调用，关系区使用 A/B 两个 snippet；原六个场景继续通过。
- 新场景分别验证已显示的 A 内容在 B pending 时清空，以及仍在途的 A 附件迟到成功、活动/审计/版本迟到失败不覆盖 B、不产生错误态。不是底层 DataProvider 或默认 AuditLogProvider 更换证据，也不证明服务端取消、版本历史选择、真实权限或读屏。
- `git diff --check` exit 0；生产组件未改，无提交、发布或部署。本次未逐张审查截图，不宣称全套视觉验收。
