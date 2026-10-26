# 企业级 UI 收尾差距清单（2026-10-23）

> 2026-10-24 状态入口：请先查看
> [当前阻塞处置](enterprise-ui-closeout-20261024.md#当前阻塞处置2026-10-24)。
> 本文 B2-11/B3-09 的旧待决策结论已由内部引用/oneOf 与业务草稿续接契约取代；
> 对应本地实现已完成，远程引用明确禁止。历史计数不累计，真实服务与发布仍需
> 独立验收；不以所有条目都经过生产部署作为每项本地能力的完成标准。

> B3-09 存储状态补充（2026-10-24）：当前 v1 已对未登录 fallback 保留旧键只读
> 兼容，显式身份不回退旧匿名键，未知版本、损坏或关闭信封 fail closed，不做猜测
> 迁移。文中早期“新适配器读取旧持久化数据的风险仍未解决”属于历史阶段记录；
> 最新证据见 `docs/evidence/workspace-tab-storage-compatibility-20261024.md`。

> 范围：仅审计 `enterprise-ui-plan.md` 原始批次一至四（B1-01..B4-04）与 `enterprise-ui-acceptance-matrix-20261022.md` 的当前未完成项，并只读核对直接相关源码。本文不是完成声明，不替代矩阵中的历史证据，也不把本地 mock/受控 Provider 通过当作服务完成。
>
> 本轮为 documentation-only，`safe_skip_reason=documentation-only`；pi 只读审计，主线程负责文档整合与审查。已运行 UI 定向 build、example check、example production build、B1-04 `npm_config_registry=https://registry.npmjs.org bun run pack:check`（exit `0`，完整 pack 门禁通过）、`git diff --check` 与 `doc:sync`；未运行全仓测试，未提交、推送、部署。

## 1. 结论先行

原始企业级 UI 目标**未完成**。29 个原始编号中，没有一条达到“本地功能 + 真实服务/授权 + 读屏 + 发布”全部门槛；部分条目的本地子范围已闭环，只能关闭对应子缺口。

真正的收尾阻塞分两类，不能混写：

1. **本地功能及契约边界**：FileUpload 的 AutoForm 集成与并发/reset/作用域保护已通过专项及浏览器验证；B2-11 受控外部引用仍受产品/安全契约约束，B3-05 版本选择缺少版本服务和消费者协议，不能猜造。B3-09 淘汰策略已实现，组件 37/37、关闭保护 29/29、受控浏览器 24/24，转入真实宿主验收。B2-01 区域格式、B2-05 本地取消/虚拟化/AutoComplete 与 B3-03 本地 dry-run 已有本地证据；真实服务另验。最新执行见 `enterprise-ui-closeout-20261024.md`。
2. **必须外部或产品决策**：真实 Provider/RBAC/租户/持久化、真实审批/任务/导入导出/审计服务、屏幕阅读器、发布授权，以及 B4 按需场景选择。

## 2. 分类口径

| 类别 | 含义 |
| --- | --- |
| A 本地功能缺失 | 原始要求所需的公开入口、参数、状态或协议尚不存在；可由本仓库实现，或需先补公开 API。 |
| B 本地验收缺口 | 实现存在，但当前证据未覆盖原始要求的某个本地边界；补证据或窄修复即可，不冒充服务完成。 |
| C 外部环境授权 | 需要真实服务、凭证、RBAC/租户、持久化、真实设备/读屏、发布或部署授权。 |
| D 产品待决策 | 原始台账标为“按需扩展”，或必须先确定业务范围/策略（如 locale 集合、版本历史契约、标签淘汰策略）。 |

硬边界：本地 stub、受控 Provider、DOM 断言、旧 build 和本地下载 artifact 均不等同真实服务；不新增无界 locale/时区/设备矩阵作为收尾条件。

## 3. 已消除的过时状态（仅引用最新主线程补记）

以下旧段落中的“待覆盖/待复核”已被矩阵内更新的主线程结果取代，本文不再把它们列为缺口：

- **B3-01 完整编辑**：矩阵 B3-01“完整编辑页主线程复核（2026-10-23）”已记录真实 `AdminApp` 路由进入 `AutoForm` 编辑、失败保留草稿、重试成功并恢复 `q/page`，Chromium desktop 1/1、exit 0；本地完整编辑路由不再列缺口，剩余是真实 Provider/RBAC、持久化、读屏与发布。
- **B3-03 跨引擎**：矩阵 B3-03“最新跨引擎主线程复核”已记录 Chromium/WebKit/Firefox × desktop/narrow 18/18、exit 0；跨引擎/narrow 不再列本地缺口，剩余是真实任务持久化、服务端全量导出、下载鉴权与读屏。
- **B3-03 本地 dry-run**：矩阵 B3-03 已记录公开 `dryRun`/`onPreview`、类型化 `ImportPreviewResult`、组件 74/74、Chromium desktop 4/4 与完整专属浏览器矩阵 24/24 本地证据；“没有 dry-run 入口”不再成立。该入口只做客户端解析/映射/逐行预校验，不是服务端试运行。
- **B3-05 同时切换**：矩阵 B3-05“当前主线程复核（2026-10-23）”已记录同一次用户事件切换 `detailWorkspace` provider 配置对象与 `recordId`，全矩阵 48/48、exit 0；五区同时切换不再列本地缺口，剩余是真实服务延迟/取消语义、版本历史与读屏。
- **B2-03 全部分段清空**：矩阵 B2-03“主线程最新复核（2026-10-23）”已记录 DateTimePicker 逐段全部清空后绑定 `null`、`badInput=false`、提交空值，三引擎 desktop 24/24、exit 0；“逐段清空未验证”不再成立，剩余是读屏、真实后端与“部分分段清空是否应提交空值”的产品语义。

## 4. 全部原始编号的当前未完成要求

| 编号 | 当前仍未完成的要求（去重后） | 类别 | 直接定位 |
| --- | --- | --- | --- |
| B1-01 | 真实权限/查询 Provider 下的编译一致性；真实读屏。日期区间控件、共享视图、完整关系查询界面是验收边界扩展，不全部属于原始四条要求。 | C | 矩阵 B1-01；`packages/ui/src/components/FilterBuilder.svelte` |
| B1-02 | 服务端 Schema 校验与业务授权；读屏；新分发包/部署。 | C | 矩阵 B1-02；`packages/ui/src/components/JsonSchemaForm.svelte` |
| B1-03 | 大表/工作簿级性能、真实 XLSX、许可、读屏、发布。完整公式引擎仍归 B4-02，不作为批次一门禁。 | C | 矩阵 B1-03；`packages/ui/src/components/SpreadsheetView.svelte` |
| B1-04 | 全仓行为兼容、registry 发布包与部署。UI 与发布相关 workspace 包已重建成功，官方 registry 环境下完整 `pack:check` 已通过，但不替代行为回归；默认镜像下载曾失败，不作为源码缺陷。 | B/C | 矩阵 B1-04；`docs/evidence/enterprise-ui-pack-distribution-audit-20261023.md` |
| B2-01 | 本地显式 `en-US`/`de-DE`/`zh-CN` 区域格式、严格解析、精度/步进与表单提交已完成；剩余真实剪贴板/输入法、读屏、发布包与部署。 | C | 矩阵 B2-01；`NumberInput.svelte`、`MoneyInput.svelte`、`PercentInput.svelte` |
| B2-02 | 读屏、真实时区/后端、新分发包与部署。日期/范围、禁用日期、快捷范围、键盘已有本地证据。 | C | 矩阵 B2-02；`DatePicker.svelte`、`DateRangePicker.svelte` |
| B2-03 | 读屏、真实后端、新分发包；“只清部分分段也提交空值”需产品确认。DST/日期策略本轮未复跑，仅引用既有证据。 | C/D/B | 矩阵 B2-03；`DateTimeInput.svelte`、`TimePicker.svelte`、`DateTimePicker.svelte` |
| B2-04 | RadioGroup 原生 `form.reset()`、命名/未命名组、禁用恢复和 SegmentedControl 键盘语义已有本地证据；剩余更广泛组合场景、真实读屏、服务端授权、发布包消费与部署。 | B/C | 矩阵 B2-04；`RadioGroup.svelte`、`SegmentedControl.svelte` |
| B2-05 | 本地已补公开 `AutoComplete`、真实 signal 透传/旧请求中止、可选客户端超时和 200+ 行窗口化；剩余真实 Provider/后端取消与超时、真实 RBAC/租户撤销、读屏和发布。 | C | 矩阵 B2-05；`ComboboxField.svelte`、`AutoComplete.svelte`、`packages/core/src/select-query.svelte.ts` |
| B2-06 | 当前“纯叶子值级联”与半选展示、懒加载一次性提交、Cascader `changeOnSelect` 已有本地证据；仍缺父项是否进入 `value`、strict/non-strict、禁用/未加载分支语义的产品契约，以及真实 Provider、读屏、发布。 | D/B/C | 矩阵 B2-06；`TreeSelect.svelte`、`Cascader.svelte` |
| B2-07 | 真实资源授权/RBAC、撤销延迟、服务端分页一致性、完整关系选择器能力、读屏与发布。 | C | 矩阵 B2-07；`RelationPicker.svelte` |
| B2-08 | 真实 multipart/对象存储、服务端取消/清理幂等、审计、权限/租户隔离、读屏、发布。预览渲染器属宿主边界，不计为本组件缺失。 | C | 矩阵 B2-08；`FileUpload.svelte`、`FileList.svelte` |
| B2-09 | `ArrayField` 父级分组、说明/错误关联、行级身份与禁用/重排，以及 DateRangeInput presets 的帮助/错误关联已有本地证据；2026-10-26 当前 AutoForm 复合字段三引擎 desktop/narrow 矩阵 **102/102**（六项目各 17/17，exit 0）已收口本地跨浏览器覆盖。剩余是行级/子字段错误路径模型、真实读屏、真实上传/服务端错误映射、Provider/RBAC 与发布。 | B/C | 矩阵 B2-09；`FieldRenderer.svelte`、`ErrorSummary.svelte`、`fields/ArrayField.svelte`、`DateRangeInput.svelte`；`../evidence/b2-09-composite-followup-20261024.md` |
| B2-10 | AutoForm/StepsForm reset、弹窗/抽屉提交状态、关闭保护、旧回执隔离和 `aria-busy` 的本地契约已有证据；`AutoForm.reset()` 现同时退休已打开的关闭保护与其待执行导航。剩余真实后端取消/回滚/幂等、完整 Tab/读屏、分发包与部署。 | B/C | 矩阵 B2-10；`AutoForm.svelte`、`StepsForm.svelte`、`ModalForm.svelte`、`DrawerForm.svelte`、`QuickEditDrawer.svelte` |
| B2-11 | `$ref`/`oneOf`/外部引用的受控适配（解析作用域、允许列表、超时、鉴权、SSRF 策略、分支选择 UI、公开错误 API）；真实读屏、服务端 TypeBox/授权、发布。显式拒绝只闭环安全边界。 | A/D/C | 矩阵 B2-11；`JsonSchemaForm.svelte` 内部 `readRecursiveSchemaForm(...).issues` |
| B3-01 | 真实 Provider/RBAC、服务端持久化、真实设备/读屏、发布包与部署。本地完整编辑路由已由主线程闭环。 | C | 矩阵 B3-01；`ResourceOperationsPage.svelte`、`AutoTable.svelte`、`QuickEditDrawer.svelte` |
| B3-02 | 本地失效列裁剪、按视图提示生命周期、真实消费者的提示/查询/删除/覆盖和窄屏边界已有证据；仍缺完整 Tab/读屏、团队/系统作用域写入授权、默认视图冲突、真实共享视图存储/服务与发布。 | B/D/C | 矩阵 B3-02；`saved-list-views.ts`、`saved-list-views.svelte.ts`；`../evidence/saved-view-stale-fields-20261024.md`、`../evidence/saved-view-stale-fields-browser-20261024.md` |
| B3-03 | 真实任务持久化与进程重启恢复；服务端试运行；服务端全量导出；失败报告下载鉴权；真实权限/租户、大文件、读屏与发布。本地客户端 dry-run 已实现，但不是服务端试运行。 | C | 矩阵 B3-03；`ImportWizard.svelte`、`ExportButton.svelte` |
| B3-04 | 服务端幂等/事务、真实取消、跨页全部匹配删除协议、真实批量写入 Provider、读屏与发布。当前页载荷已有本地证据。 | C | 矩阵 B3-04；`AutoTable.svelte`、`BatchActionBar.svelte` |
| B3-05 | “选中记录版本 → oldValue/newValue”的真实契约与消费者尚未定义；版本空态/错误/权限语义；真实附件/关联/活动/审计/版本服务、RBAC/租户/字段授权、读屏与发布。 | D/C | 矩阵 B3-05；`detail-workspace.ts`、`DetailWorkspaceSections.svelte`、`VersionDiffViewer.svelte` |
| B3-06 | 服务端 RBAC、继承、拒绝原因、字段权限、跨用户并发、真实租户授权、屏幕阅读器实机与发布。本地非布尔 fail-closed 和 DOM 无障碍语义已闭环，仍不等于真实读屏或服务验收。 | C | 矩阵 B3-06；`PermissionMatrix.svelte`、`RolesSettings.svelte` |
| B3-07 | 真实审批 Provider、服务端版本冲突/幂等/去重、权限、历史一致性、读屏与发布。本地冲突路径已闭环。 | C | 矩阵 B3-07；`ApprovalCenter.svelte` |
| B3-08 | `TaskList` 的 Provider 能力门禁、普通/DLQ 查询、错误/重试、任务动作隔离，以及 `NotificationsSettings` 的加载/保存/恢复/实例隔离已有本地证据；剩余真实任务/通知 Provider、持久化任务恢复、服务端幂等/取消、传输层取消、跨浏览器完整矩阵、读屏与发布。 | B/C | 矩阵 B3-08；`TaskList.svelte`、`NotificationsSettings.svelte` |
| B3-09 | 真实 AutoTable 查询刷新恢复、AutoForm dirty 关闭保护、双轴/迟到布局/用户取消滚动恢复和真实 SPA 清理已有本地证据。2026-10-26 当前三引擎矩阵 **81/81**（Chromium/WebKit/Firefox desktop 各 27/27，exit 0）已收口本地跨引擎生命周期；仍需共享查询缓存回收策略、跨窗口与真实身份切换、完整产品性能、生产 storage、真实后端、读屏和发布；不承诺恢复草稿内容。 | D/B/C | 矩阵 B3-09；`MultiTabKeepAlive.svelte`、`workspace-tab-state.ts`；`../evidence/workspace-lifecycle-cross-browser-20261024.md` |
| B3-10 | Dashboard 查询、筛选/时间范围 URL 恢复、失败重试、迟到响应隔离及 metric/text 钻取已有本地与受控消费者证据；剩余真实时间范围聚合口径、Provider 慢请求取消/错误码映射、RBAC/跨租户、生产 SSR/持久化、读屏、发布与部署。 | B/C | 矩阵 B3-10；`DashboardView.svelte`、`example/src/features/dashboard` |
| B4-01 | 产品是否选择该场景；真实领域持久化与冲突合并；服务端排程；可替换引擎；Gantt/Scheduler 的领域交互；真实 RBAC/跨租户、性能、读屏、跨浏览器与发布。Kanban 仅本地窄契约。 | D/C/A | 矩阵 B4-01；`KanbanBoard.svelte`、`GanttChart.svelte` |
| B4-02 | 服务端聚合、完整公式引擎、XLSX/第三方许可、包体积/性能预算、发布与部署；是否选择 Pivot/Spreadsheet 场景。 | D/C | 矩阵 B4-02；`PivotTable.svelte`、`SpreadsheetView.svelte` |
| B4-03 | 工作流版本/发布/模拟/审计/执行结果、决策表执行结果、服务端编排、权限、读屏与发布；是否选择 Workflow/DecisionTable 场景。 | D/C | 矩阵 B4-03；`DecisionTable.svelte`、`workflow-boundaries.test.svelte.ts` |
| B4-04 | 大内容性能、HTML/粘贴安全、版本差异、只读/协作边界、真实上传服务、读屏、许可与发布；是否选择富文本/代码/文档场景。 | D/A/C | 矩阵 B4-04；`LazyRichTextEditor.svelte`、`code-editor.test.svelte.ts` |

## 5. 本地功能缺失的 ownership 与可实现性

| 缺口 | 真实 ownership / 公开 API 现状 | 能否按原目标实现 |
| --- | --- | --- |
| B2-01 区域格式 | 已有公开 `locale`、严格解析、格式化、精度/步进和原生提交契约；当前显式集合为 `en-US`/`de-DE`/`zh-CN`。 | 本地范围已实现；新增 locale 或真实剪贴板/IME 需产品与外部环境验收。 |
| B2-05 虚拟化/取消/AutoComplete | 已有公开 `AutoComplete`、窗口化列表、查询 signal 透传和客户端超时边界；真实 Provider 的取消/超时仍由外部服务验收。 | 本地范围已实现；不把受控 Provider 结果外推为服务端取消保证。 |
| B2-06 半选/父子策略 | TreeSelect 多选当前只回传叶子值，父项状态由叶子集合推导为 `true`/`mixed`/`false`；父项级联会先加载完整子树并一次性提交，失败不产生部分提交。Cascader 是路径模型，`changeOnSelect` 已定义父级路径是否提交。 | 现有本地协议已实现并通过 TreeSelect `140/140`、Cascader `44/44`；是否引入父值回传或 strict/non-strict 必须先由产品确认，不能凭空新增公共参数。 |
| B2-10 弹窗/抽屉统一状态 | `AutoForm`/`StepsForm` 有公开 `reset()`；`ModalForm`/`DrawerForm` 已统一本地 pending、错误脱敏、关闭保护、旧回执隔离和 `aria-busy`；`QuickEditDrawer` 仍是宿主封装。 | 本地生命周期子范围已实现并有定向单测/浏览器证据；真实后端取消、回滚、幂等、读屏和发布仍需外部验收，不新增无必要的容器 API。 |
| B2-11 受控外部引用 | 已新增公开 `referenceDocuments` 类型和受控本地 resolver：宿主精确注入普通文档，仅允许根文档或 `/$defs/<name>` fragment；未知 URI、非法 fragment、循环、访问器和预算超限 fail closed。 | 本地受控子集已实现并通过 resolver/递归/企业表单回归与 oneOf 跨浏览器矩阵；远程 resolver、鉴权、SSRF/缓存/完整性和服务端 Schema 一致性仍另立评审。 |
| B3-03 试运行 | 已实现公开 `dryRun`/`onPreview`，复用解析、映射与逐行预校验，返回 `totalRows`/`importableRows`/`failedRows`；`importableRows` 仅表示本地 schema 校验通过，不保证服务端成功。`dryRun=true` 时即使带 `initialTaskId`/`taskName` 也不恢复任务 UI、不 `get/submit/cancel/retry/upload`，模式切换会清理任务态；普通导入首错早停，预览才聚合全部失败行。 | 本地客户端预检已闭环；真实服务端试运行、唯一性/授权/业务状态校验仍属后端契约，不在本轮虚构。 |
| B3-05 版本选择 | `detail-workspace.ts` 的 `DetailWorkspaceVersionData` 只有 `oldValue/newValue` 等载荷；provider scope 只有 `resourceName/recordId/meta`，没有版本 ID、版本列表或选中动作；`packages/core/src` 未定位记录版本 read API。 | 需先有真实版本服务/schema 或产品契约；仅靠 UI 无法凭空定义历史版本来源。属“产品/后端契约”阻塞。 |
| B3-09 淘汰策略 | 已有显式 `maxTabs`、公开 `openTab`、逻辑 LRU 与受保护标签约束；适配器负责快照清理。 | 本地契约及受控消费者已通过；真实路由、Provider、生产存储与读屏仍需外部验收。 |
| B4-01 引擎替换/Scheduler | 仓库已有 `KanbanBoard`/`GanttChart` 本地组件，未定位 Scheduler 或可替换引擎契约。 | 需产品先选择场景；选定后可实现，当前不作为默认必做。 |

**B3-09 2026-10-26 审计补记。** pi 对多标签源码、状态适配器、单测、浏览器 fixture
和验收文档做了有界只读审计，未发现无需产品决策即可安全修复的本地 bug，未产生源码或
测试改动。主线程独立复跑相关 Vitest **109/109**、跨窗口 fixture **1/1**；多标签三引擎
两视口串行矩阵首轮 **35/36**，Firefox narrow 的唯一失败为页面导航超时，失败用例随后
单独 **1/1**，WebKit 首次加载失败用例亦各自单独 **1/1**。失败根因仍未确认；串行
也出现超时，不能断言为环境竞争或拼接为完整矩阵通过。生产剩余边界保持：URL/history、Provider/缓存/未完成请求、
真实 storage、跨窗口协议的生产接入、身份切换、读屏和发布验收；可实现接口是
`maxTabs`、`openTab()`、`onTabLimitReached`、`onbeforeclose` 及状态适配器的
`capture`/`restore`/`clear`/`dispose`，不擅自补充新策略。

## 6. 下一件最高收益可执行任务

**B3-03 本地 dry-run 已完成（2026-10-23 增量）。** 公开 `dryRun`/`onPreview` 复用现有 CSV/JSON 解析、映射和逐行预校验，返回类型化 `ImportPreviewResult`，不调用 `create`/`createMany`；`dryRun=true` 时不恢复或轮询任务、不提交/取消/重试/上传，即使同时传入 `initialTaskId`/`taskName` 也如此。预览文案只表达本地校验通过/失败，不保证服务端成功；返回映射不等于正式导入，正式导入仍会重新校验并写入。组件单文件与三引擎两视口专属浏览器场景均已补本地证据。它不是服务端试运行，仍不证明唯一性、真实授权/租户或业务状态。

**B2-10 短补记（2026-10-24 收口）。** `AutoForm.reset()` 在成功复位时现在会同时关闭已打开的未保存更改保护并丢弃其捕获的待执行导航，避免 reset 后再次确认时执行 reset 前动作；StepsForm、ModalForm、DrawerForm 与 Core 未改。pi 已实现并由主线程审查该生产最小改动，关闭保护定向用例把旧/新导航拆成独立 `vi.fn()` 分别断言（reset 后旧 0；再次 dirty 确认后旧 0、新 1）。主线程随后独立复验单文件 **11/11**、7.50s；不含真实服务、读屏或发布结论。证据见 `docs/evidence/form-engine-reset-lifecycle-20261023.md` 第 8 节。

**B2-10 浏览器矩阵补记（2026-10-24）。** 仅修改 `FormResetBrowserFixture.svelte`、`form-reset.spec.ts`、`playwright.form-reset.config.ts`，未改生产代码；配置为 Chromium/WebKit/Firefox × desktop/narrow，保留 5 个既有场景并新增 1 个关闭保护场景，共 **36 cases**。主线程独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.form-reset.config.ts`，结果 **36/36 passed、exit 0、27.5s**；pi 前一轮 36/36、27.8s 分开记录，不合并计数。新增场景以真实 dirty 输入打开公开 guard，再通过明确 test-only DOM event 调用真实 `bind:this.reset()`（不 force click、不读 Svelte 内部），验证基线恢复、旧导航 0、无 write/success，以及新 dirty 后仅新导航 1、旧仍 0 且继续可编辑、`pageerror` 为空。第 7 节 10/10 Chromium 两视口为历史记录，当前跨引擎结论以本矩阵为准；测试宿主不是产品 reset 按钮或真实 router 跳转，narrow 不是新增视觉/移动端验收，不证明真实服务、RBAC、读屏或发布。

**B2-05 本地取消/超时/虚拟化/AutoComplete 已完成（2026-10-23 增量）。** 证据见 `docs/evidence/combobox-b2-05-cancel-virtual-20261023.md`；剩余为真实 Provider/RBAC/读屏/发布。B2-06 当前本地协议也已闭环，下一步需产品确认是否扩展父子选择语义，而不是继续添加重复测试。

**B2-04 本地复核（2026-10-23）。** pi 与主线程确认 RadioGroup 的原生 reset、
键盘/禁用/实例隔离契约已闭环，SegmentedControl 是按钮式视图模式控件，不属于
原生表单 reset 范围。主线程独立复跑 RadioGroup **28/28**、SegmentedControl
**12/12**，`git diff --check` 通过；剩余是组合场景、真实读屏、Provider/RBAC、
发布包消费和部署，不新增公共 reset API。

**B3-05 版本历史审计（2026-10-23）。** pi 独立只读核对确认当前只有
`oldValue/newValue` 静态差异展示，缺少版本 ID、版本列表、选中动作、
`listVersions/getVersion` provider 契约及空态/错误/权限/租户语义；主线程独立复跑
`VersionDiffViewer` **1/1** 与 `DetailWorkspace` **9/9**，`git diff --check` 通过。
该证据不证明真实版本历史，未新增 `versionId`、`VersionProvider` 或选择状态。

**B2-09 本地复核（2026-10-23）。** 主线程与 pi 分别核对
`FieldRenderer`、`ErrorSummary`、`ArrayField` 及四个定向测试文件；组件测试
`60/60` 通过，`git diff --check` 通过。当前已证明错误摘要的动态标题/多错误/
实例隔离、字段说明与 `errorId` 组合关联、数组父级分组、行级名称、增删重排/
禁用/嵌套/文件输入身份和原生提交边界。`ArrayField` 尚无行级或子字段错误映射
协议；补充 `rowErrors`、错误路径或索引格式需要新的错误数据模型与消费者契约，
不能仅靠增加 DOM 属性安全完成。Transfer、TreeSelect、Cascader、日期范围、
富文本和上传的完整复合控件矩阵、完整 Tab、真实读屏、服务端错误映射及发布仍
未验收；本轮未修改生产组件。

**B2-09 DateRangeInput 修复（2026-10-24）。** pi 执行最小生产修复，为
presets `select` 透传 `aria-describedby` 与 `aria-invalid`；新增真实
FieldRenderer 双实例 IDREF 隔离、动态移除说明/错误后的关联清理、值保持和 preset
回调断言。主线程独立复跑最终 `auto-form-accessibility` **48/48**、exit `0`、
9.22s；中间 `date-time-input` 23/23 不计最终验收。未改变焦点顺序、required 或日期逻辑。
该结果只关闭 DateRangeInput presets 的本地反馈关联缺口，不代表完整错误摘要聚焦、
真实读屏、其他复合控件、Provider 或发布验收。后续主线程已重建 UI，
核对 DateRangeInput 源码与 dist 一致；example check（0 errors / 3 warnings）
与生产构建均 exit `0`。本次未重跑 pack，10 月 23 日 pack 结果不覆盖此次增量。

**B2-09 层级控件增量（2026-10-24）。** managed、低风险，pi 唯一测试 writer，
主线程独立审查；仅补充 `hierarchical-field-feedback.test.svelte.ts`，未改生产组件。
双实例真实宿主错误节点、description/error IDREF 隔离、清理 A 不影响 B、
动态反馈不触发 onchange、popup 引用与选择回调均有断言。
pi 最终报告 24/24；主线程正确目录下独立复跑 **24/24**、exit `0`、7.04s，
ESLint 通过。此前根目录命令因缺少配置启动失败，不计作组件失败或成功证据。
错误节点由测试宿主创建，不证明 AutoForm 服务端错误映射、真实读屏或全浏览器行为；
Transfer/富文本/上传完整组合、完整 Tab 与发布仍未验收。

**B2-09 Transfer 增量（2026-10-24）。** pi 唯一测试 writer，主线程独立审查，
仅补充 `transfer-field-feedback.test.svelte.ts`。真实宿主错误节点验证双实例
description/error IDREF 隔离、清理 A 不影响 B、data-invalid 收敛及无 onchange。
pi 报告 27/27；主线程独立复跑 **27/27**、exit `0`、6.98s，ESLint 与 diff 检查通过。
未修改生产组件，不证明读屏、完整 Tab、服务端错误映射或发布。

**B2-09 FileUpload 增量（2026-10-24）。** pi 仅修改
`file-upload-field-feedback.test.svelte.ts`；主线程独立复跑 **11/11**、exit `0`、
7.12s，ESLint 与 `git diff --check` 通过。真实宿主节点覆盖两个 file 实例的
原生 input 与 dropzone 双入口 IDREF 解析、实例隔离、A 清理不影响 B，以及
`aria-invalid`/`data-invalid` 收敛。未修改生产组件，不证明真实上传服务、读屏、
完整 Tab、服务端错误映射或发布。

**B2-09 FileUpload 集成阻塞（2026-10-24，历史只读审计，后续已修复本地数据流）。**
后续实现及最终单文件/浏览器结果见 `../evidence/autoform-upload-integration-20261024.md`；
以下保留问题发现过程，不代表当前仍传递 File。
主线程核对
`FieldRenderer.svelte` 的 file 分支：`FileUpload` 的 `onChange` 被映射为
`items.map(item => item.file)`（multiple）或 `items[0]?.file ?? null`，即向
`onchange` 传 `File`/`File[]`。AutoForm 的 `fieldChange` 随后调用
`form.setFieldValue`，经 `updateField` -> `draft` ->
`snapshotContractFormDraft` -> `snapshotPlainData`；后者只接受 JSON。
临时内联验证 `snapshotPlainData(new File(...))`、含 `File` 的对象和数组均抛
`TypeError: Invalid plain data`，未新增永久测试。直接相关文件内未找到现成公开
入口能按已定义契约完成上传：`FileUpload` 虽有公开 `upload` prop 并返回
`{ url?, uploadId? }`，但 `FieldRenderer`/`AutoForm` 均不转发，`FieldDefinition`
只有 `accept`/`maxSize`，contract-form 提交只有 `snapshotPlainData(payload)` 的
JSON 路径；原生 file input 虽保留字段名，AutoForm 的 `onsubmit` 始终
`preventDefault`，未使用 multipart。结果是文件选择在 `fieldChange` 抛出
`INVALID_RESOURCE_INPUT`，不会进入草稿，required file 字段也无法完成写入。
这是本地集成缺口，不只是外部上传服务未验证；需要用户决策是引入 multipart
File 草稿/传输契约，还是先上传取得引用 ID/URL 再以 JSON 提交（并定义字段值与
resolver）。在决策前不新增公开 API、不把 File JSON 化，也不以禁用 file 字段
当作完成。本轮未修改生产代码。

**B2-09 RichText 增量（2026-10-24）。** pi 仅修改
`richtext-field-contract.test.svelte.ts`；主线程独立复跑 **73/73**、exit `0`、
11.34s，`git diff --check` 通过。测试覆盖两个实际编辑区的 description/error
IDREF 解析与实例隔离、`aria-invalid`/`aria-required`/`aria-multiline` 保持，
以及清理 A 不影响 B。该文件原有第 9 行 `t` 导入已触发 ESLint
`no-restricted-imports`，本次新增代码未引入新的 lint 错误；未修改生产组件，
不证明真实编辑器/上传服务、读屏、完整 Tab 或发布验收。

**B2-09 DateRangeInput 浏览器增量（2026-10-24）。** pi 修改既有 enterprise
fixture 的三个测试文件，主线程独立复跑 `--grep "AutoForm daterange"`：
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、11.0s。
真实 create AutoForm 两实例覆盖：首错自动聚焦 presets `select`；摘要反向
Shift+Tab（macOS WebKit 为 Alt+Shift+Tab）；摘要正向 Tab
`Period -> Name -> Description -> presets`；Enter 返回 presets，再用真实 Tab
进入 start；三个控件的 `aria-describedby` 均解析到同一表单内活节点，实例不串；
preset 修正后精确提交 payload，第一份清错但保留帮助关联，第二份仍 invalid。
未假设原生 date 分段的 Tab 顺序；未覆盖 edit、时区/DST、禁用日期、真实读屏、
服务端错误映射、发布或部署。

**B2-09 TreeSelect 浏览器增量（2026-10-24）。** pi 修改既有 enterprise
fixture 的三个测试文件，主线程独立复跑 `--grep "AutoForm tree-select"`：
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、14.4s。真实 create
AutoForm 两实例覆盖首错聚焦 trigger、摘要反向/正向 Tab、Enter 返回 trigger、
真实 popup `aria-controls`/`aria-labelledby`、Escape 复原焦点、ArrowDown/Enter
选择叶子、同表单活 IDREF 和跨实例隔离；第一份精确提交后第二份保持 invalid。
TreeSelect trigger 的 invalid 语义为现有 `data-invalid`，未擅自改为
`aria-invalid`。未覆盖真实读屏、服务端 Provider、完整 TreeSelect 策略矩阵、
发布或部署。

**B2-09 Transfer 浏览器增量（2026-10-24）。** pi 修改既有 enterprise fixture
的三个测试文件，主线程独立复跑 `--grep "AutoForm transfer"`：
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.2s。真实 create
AutoForm 两实例覆盖 Transfer 首个可操作 checkbox 聚焦、摘要反向/正向 Tab、
Enter 返回控件、group 的真实 label/help/error IDREF、Space 选择、
Tab/Enter 转移所选项、精确 payload、清错后帮助保留和第二实例 invalid 隔离。
未覆盖读屏、搜索/禁用/全选/移除等完整 Transfer 策略、服务端 Provider、发布或部署。

**B2-09 Cascader 浏览器增量（2026-10-24）。** pi 修改既有 enterprise
fixture 的三个测试文件，主线程独立复跑 `--grep "AutoForm cascader"`：
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.4s。真实 create
AutoForm 两实例覆盖首错 trigger 聚焦、摘要正反向 Tab、Enter 返回、真实 popup
`aria-controls`/`aria-labelledby`、ArrowDown/Enter 选择 East、Escape 返回焦点、
同表单活 IDREF 与跨实例隔离、精确 path payload、清错后帮助保留和第二实例 invalid。
当前明确配置 `changeOnSelect=true`，载荷为 `['east']`，不证明默认叶子选择路径。
未覆盖真实读屏、父子策略全矩阵、edit/懒加载、服务端 Provider、发布或部署。

**B2-09 RichText AutoForm 浏览器增量（2026-10-24）。** pi 修改既有 enterprise
fixture 的三个测试文件，主线程独立复跑 `--grep "AutoForm richtext"`：
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、20.9s。首错自动
聚焦真实 `contenteditable` 正文而非前置工具栏 select；摘要反向/正向键盘路径
逐步遍历同一表单工具栏，并验证正反向工具栏序列互为逆序、未越出当前表单；
Enter 返回正文；两个实例的活 IDREF 隔离、清错后帮助保留和精确 HTML payload
均通过。运行时仍出现 Tiptap 重复 `link`/`underline` 扩展及重复加载
`prosemirror-model` 警告，未将其视为已解决。未覆盖真实读屏、完整编辑器扩展
策略、服务端 Provider、上传服务、发布或部署。

**B2-09 AutoForm 富文本焦点边界修复（2026-10-24）。** `AutoForm.svelte`
仅对默认渲染的顶层 `richtext` 优先正文；数组等非富文本容器、自定义
`fieldRenderer` 和不可用正文继续按原有 DOM 顺序回退。主线程独立复跑
`auto-form-compound-focus.test.svelte.ts` **21/21**、exit `0`、7.78s；
`packages/ui` build exit `0`。新增回归确认数组后置 richtext 不抢走容器首个
可操作控件，hidden/inert/aria-disabled/disabled fieldset/无法 focus 的正文
均回退到可用控件。构建仅有既有 `import.meta.env` 打包提示。

**B2-09 tags 浏览器增量（2026-10-24）。** pi 仅扩展既有
`AutoFormAccessibilityFixture.svelte`、`browser.spec.ts` 与
`playwright.autoform.config.ts`，未修改生产代码；主线程独立复跑
`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep "AutoForm tags"`
为 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、13.1s。真实
create AutoForm 两实例覆盖 tags 草稿输入框首错聚焦、摘要反向/正向 Tab 与
Enter 返回、help/error 活 IDREF 及跨实例隔离、`alpha`/`beta` 按 Enter 生成
`tags[]`、精确 JSON payload、第一份清错而第二份保持 invalid，以及
`pageerror` 为空。全文件 `browser.spec.ts` lint 仍有既有 4 个 non-null
assertion 错误（旧区域，不归因 tags），本轮不声称全文件 lint 通过。窄视口
不是移动端或视觉验收；不证明真实读屏、真实 Provider、RBAC、发布或部署。

**B2-09 multiselect 浏览器增量（2026-10-24）。** 仅在既有 `browser.spec.ts`
末尾追加场景，fixture 与 config 的 multiselect 分支已存在，未修改生产代码；
主线程独立复跑
`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep "AutoForm multiselect"`
为 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.2s。真实
create AutoForm 两实例覆盖 Labels group 与 Alpha/Beta/Disabled 三个 checkbox、
首错聚焦 Alpha、Disabled 保持 disabled 未选、组与 checkbox 的 help/error 活
IDREF 同表单解析及跨实例隔离、摘要正反向 Tab/Enter、Space 选择 Alpha、
单一 `labels[]=alpha`、精确 JSON payload、第一份清错提交而第二份保持 invalid，
以及 `pageerror` 为空。全文件 `browser.spec.ts` lint 仍有既有 4 个 non-null
assertion 错误（旧区域，不归因本场景），本轮不声称全文件 lint 通过。窄视口
不是移动端或视觉验收；不证明真实读屏、真实 Provider、RBAC、发布或部署。

**B2-09 images 浏览器增量（2026-10-24）。** pi 除扩展既有
`AutoFormAccessibilityFixture.svelte`、`browser.spec.ts` 与
`playwright.autoform.config.ts` 外，补充最小生产修复
`packages/ui/src/components/FieldRenderer.svelte`：为 images 的
add/update/remove 增加 `disabled` 守卫，Add image、Remove image 与 URL input 的
help/error `aria-describedby` 及 `aria-invalid` 关联补齐。主线程独立复跑
`field-renderer-advanced.test.svelte.ts` **24/24**、exit `0`；定向浏览器
`--grep "AutoForm images"` 为 Chromium/WebKit/Firefox × desktop/narrow
**6/6**、exit `0`、13.6s。浏览器与单测覆盖 IDREF 不得为空且须解析到活节点、
同业务 key 双实例隔离、错误/说明动态清理、空数组保存时 `Add image` 同时关联
说明与宿主错误、摘要正反向 Tab/Enter、URL 输入与 `Add image`/`Remove image`、
禁用态无 `onchange` 且恢复后 add/update/remove 回调及隐藏值正确、隐藏
`images[]` 与精确 payload、第一份清错第二份保持 invalid，以及 `pageerror`
为空。旧 `browser.spec.ts` 仍有 4 个既有 non-null assertion lint 错误（旧区域，
不归因本场景），不声称全文件 lint 通过。窄视口不是移动端或视觉验收；不证明
真实图片上传/存储、Provider、RBAC、真实读屏、发布或部署。

**B2-09 RichText 扩展与依赖修复（2026-10-24）。** `StarterKit v3` 默认包含
`link`/`underline`，preset 同时显式注册配置版本；已关闭 StarterKit 内置版本，
并新增真实 `splitBlock`、`wrapIn`、link/underline mark transaction 回归。
主线程已确认编辑器扩展单测 **7/7**、单文件严格类型 **0** 错误、ESLint **0**，
构建通过。另将根 override 的
`prosemirror-model` 从 `1.25.11` 更新为 `1.25.12`，通过 `bun install` 重算
`bun.lock`；冻结安装通过，所有相关包解析到单一 `1.25.12`。富文本浏览器
**6/6**、**24.9s** 复跑通过，测试主动断言无 Tiptap warning。旧 `.bun` store
仍可能保留未被解析引用的历史包目录，不代表运行时重复加载。本轮未发布、未部署；
旧 pack 不覆盖新增源码与 `bun.lock`。未覆盖完整读屏、服务端 Provider、上传
契约、发布或部署。

本轮共享 AutoForm fixture 最终定向回归（daterange/tree-select/cascader/transfer/array）
**30/30**、exit `0`、41.1s。详见
`docs/evidence/auto-form-error-summary-browser-20261022.md` 的 2026-10-24 增量；
不与改动前 54 项复跑相加为最终完整配置通过。

**B2-09 空数组 Add 反馈闭环（2026-10-24）。** managed、低风险；pi 为唯一 writer，
主线程独立审查。parent=`enterprise-ui-closeout-20261024.md`；
source=用户继续；reason=空数组首错焦点入口缺少帮助/错误关联。
仅修改 `fields/ArrayField.svelte` 与
`array-field-feedback.test.svelte.ts`，其余 dirty 保留；未新增 `rowErrors`、错误路径
或索引错误模型，也未把父级错误关联到行内按钮。基于现有 `describedby`/`invalid`
公开协议，空必填 array 校验失败后 Add 入口透传
`aria-describedby={describedby}`、`aria-invalid={invalid || undefined}`，disabled
语义不变。新增真实 AutoForm 双实例回归：点击 Save 后错误摘要存在、焦点落在 Add、
Add 的 `aria-describedby` 按“说明 → 字段错误”顺序解析到本实例活节点、两实例
description/error ID 全部隔离；第一份点击 Add 清错后摘要消失，仅保留说明引用、
`aria-invalid` 移除且按钮仍可用，第二份错误关联不受影响。定向
`array-field-feedback.test.svelte.ts` pi 自测 **24/24**、exit `0`、8.23s；
主线程独立复跑同一文件 **24/24**、exit `0`、7.88s；两文件定向 ESLint
**0**、`git diff --check` exit `0`。该生产修复阶段未跑浏览器；后续增量见下。
未跑全仓测试、提交、推送或部署。

**B2-09 Add 浏览器续接（2026-10-24）。** parent 为上述 Add 反馈闭环，
source 为用户“全部完成”，reason 为补齐聚焦入口的浏览器语义证据。
managed、低风险，pi 仅扩展既有 `browser.spec.ts` array 用例并通过 Chromium
desktop；主线程审查后收紧为 ID 集合完全无交集及直接可访问描述断言。
主线程独立运行 `playwright.autoform.config.ts --grep "AutoForm array error focus"`，
Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、15.4s。
覆盖两实例保存失败后 Add invalid、同表单真实 help/error IDREF、摘要键盘返回、
修正后的精确提交载荷与帮助保留、另一实例错误不变。复用夹具和配置，未改生产代码；
不证明行级错误协议、真实 Provider、完整 Tab 顺序、实机读屏或发布部署。
该结果关闭空数组 Add 入口的现有反馈协议缺口；数组行级/子字段错误映射仍需产品/
后端提供路径契约，真实读屏、完整 Tab、跨浏览器与发布仍未验收。

**B3-08 本地复核（2026-10-23）。** pi 核对 `TaskList` 与
`NotificationsSettings` 及相关 Provider/查询测试；主线程独立复跑任务队列与
任务列表查询 **77/77**、通知设置回归 **36/36**，`git diff --check` 通过。
现有证据覆盖任务普通/DLQ 能力门禁、错误/重试、旧结果隔离、动作互斥与租户/
Provider 切换，以及通知偏好加载失败、重试、保存失败、草稿保留、恢复成功、
epoch 丢弃旧响应和实例级控件 ID。任务组件的业务 `cancel` 不承诺传输层
`AbortSignal`；任务持久化恢复、通知存储一致性、真实幂等/权限/租户隔离仍由
Provider/服务端负责，不新增客户端缓存、自动恢复或通知存储 API。跨浏览器完整
矩阵、真实读屏、发布和部署仍未验收；本轮未修改生产组件。

**B3-10 本地复核（2026-10-23）。** pi 核对 `DashboardView`、example
Dashboard 工作区、Core dashboard contract 及专属测试；主线程独立复跑
`DashboardView` **15/15**、Core `dashboard-contract` **10/10**、example
`dashboard-workspace-data` **6/6**，`git diff --check` 通过。当前证据覆盖全局
筛选与时间范围透传、hash/popstate 恢复、严格日期校验、失败清空旧数据并按当前
查询重试、筛选/Provider/卸载后的迟到响应隔离、metric/text 钻取及脱敏失败反馈。
example 受控入口另有 Chromium/WebKit/Firefox × desktop/narrow **18/18** 记录；
这些仍不证明真实聚合口径、时区/DST、网络 `AbortSignal`、错误码映射、真实
RBAC/租户隔离、生产 SSR/持久化、屏幕阅读器、发布和部署，不新增 Dashboard
内置筛选栏或未确认的指标 API。本轮未修改生产组件。

**B1-04 分发审计（2026-10-23）。** `bun run --cwd packages/ui build` 与根
`bun run build:packages` 均成功；`@svadmin/ui` tarball 静态清单、入口、CSS
内容与 packed consumer 入口/类型导入阶段通过（`1023` entries verified），npm
install、pnpm strict peer tree、Surface 兼容消费者和 packed doctor 阶段也通过。以
`npm_config_registry=https://registry.npmjs.org bun run pack:check` 重跑，完整门禁
exit `0`。默认 mirror 的 404 是环境同步问题。证据见
`docs/evidence/enterprise-ui-pack-distribution-audit-20261023.md`。

B3-03 剩余工作转入外部服务验收：真实任务持久化/进程重启恢复、服务端试运行、服务端全量导出、下载鉴权、真实权限/租户与读屏。

**B3-09 多标签契约与消费者验证（2026-10-24）。** managed；pi 为唯一 writer，
主线程独立审查，未提交、未发布、未部署。除此前的键盘与状态适配器修复外，
`MultiTabKeepAlive` 已落地显式 `maxTabs`、固定/dirty/active/closable 保护、
逻辑 `id+path` LRU、异步守卫原子淘汰、公开 `openTab()` 判别结果和 limit 回调。
主线程独立验证淘汰单文件 **37/37（7.00s）**、关闭保护 **29/29（11.17s）**；
真实 fixture 通过 `bind:this.openTab` 验证 `maxTabs=3` 淘汰与快照清理、`maxTabs=2`
整体拒绝两场景，原 Playwright 配置 **24/24（21.4s）**，覆盖 Chromium/WebKit/
Firefox × desktop/narrow，pageerror 为空。浏览器计数为旧 2 场景 12 项加新 2
场景 12 项，不能重复累计协作 writer 的先行结果；narrow 不作为移动视觉验收。
`git diff --check` 通过；既有 close 测试非空断言和 spec 旧 scroller 未使用仍是已知
lint 问题，未称全文件 lint 通过。真实产品路由、Provider/查询缓存、生产 storage、
跨浏览器标签页同步、读屏实机、发布仍未验收，整体仍未完成。

**B3-09 最新状态补记（2026-10-24 收尾）。** 最终生产源码 UI 定向 build exit 0
（仅既有 `import.meta.env` 打包警告）；build 结束后独立运行 workspace 专属 spec
**12/12 passed**、exit 0、约 1.2m，12 项实际执行无 skip，为本轮最新浏览器结果
（Chromium），不并入下文历史 12/12。逐文件测试仍为 `auto-table-interactions`
**59/59**（exit 0，25.62s）、`list-state` **20/20**（exit 0，1.33s）、
`saved-list-views-model` **30/30**（exit 0，3.28s）；8 个目标 Svelte/TS 定向
ESLint 与 `git diff --check` 均 exit 0。局部类型检查纳入虚拟源 `AutoTable`、
`DraggableHeader`、`AutoTableIdentityHydrationHost` 及真实源
`list-state.svelte.ts`、`saved-list-views.svelte.ts`、`saved-list-views.ts`，
在 strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess/
noPropertyAccessFromIndexSignature、`skipLibCheck:false` 下完整目标
syntactic + semantic 诊断总数 **0**；此前 AutoTable 的 6 个 TS7006 属前轮漏纳
`DraggableHeader` 虚拟源的类型丢失，不是基线错误。对应回归已去掉诊断 message
正则过滤，改为断言完整目标 diagnostics 为 `[]`，单测 `-t "strictly types"`
1 passed / 58 skipped、exit 0。覆盖 scope 退休、首帧请求隔离、首次身份延迟保留、
新 session 隔离、受控分页排序、活动 saved view 标记；真实 dirty 表单消费者已由
后续 `AutoForm.onDirtyChange` 修正接入基础关闭保护；仍缺完整滚动边界、跨窗口、
真实后端/RBAC/存储、读屏与发布验收。上文及表格中的
12/12、9/9、37/37、29/29 等计数保留为历史阶段，不累计。

## 7. 原目标是否完成与真正阻塞

- **B3-09 跨实例关闭清理当前进展**：失败清理后的共享阻断和持久化关闭信封、
  失败 recapture 不退休阻断、tenant/keyPrefix 隔离已有直接单测。主线程
  **20/20**、目标严格类型 **0**，UI build 后 workspace **24/24（2.5m）**，
  lint/diff 通过。只消除已验证的跨实例旧状态复活缺口；完全不可写存储跨刷新、
  跨窗口、真实服务/权限、SPA 清理计数及读屏发布仍保留。
- **B3-09 滚动当前进展**：主线程已独立验证 workspace **24/24（2.4m）**、
  局部严格类型 **0**、定向 ESLint/diff 通过。受控晚显示、非活动标签、真实
  水平滚动、存储降级、取消后旧位置不复活和静止 observer/rAF 行为已补证据；
  真实慢网络、SPA 清理计数、跨引擎、跨窗口与外部服务验收仍保留。详见
  `../evidence/workspace-scroll-boundaries-20261024.md`，不累计旧计数。
- **B3-09 当前复验替代下条历史状态**：查询快照及真实 AutoForm 编辑消费者已接入；
  主线程独立 reset **13/13**、表单契约 **102/102**、UI build 后 workspace
  **16/16（1.1m）**、定向 ESLint/diff 通过。不再把“查询未持久化”或“没有
  真实 dirty 消费者”列为当前缺口。完整滚动、跨窗口、身份切换和外部验收仍待完成。
- **B3-09 本地消费者进展（2026-10-24）**：example `/workspace` 已接入，
  不再将“完全没有产品入口”列为缺口。此前 9/9 的搜索、分页、history、关闭/LRU、
  刷新不复活关闭标签、空态历史 URL、滚动恢复及窄视口边界仍保留为历史证据；
  当前另有 `AutoForm.onDirtyChange` 的真实 dirty 基础关闭保护复验。不再把真实
  dirty 消费者列为当前缺口；完整滚动、跨窗口、真实后端与读屏/发布验收仍待完成，
  不等同整体完成。
- **原目标是否完成：否。** 没有一条原始编号同时满足通用完成标准的公开 API、数据正确性、失败恢复、权限/租户、键盘/读屏、i18n、性能、真实消费者构建、许可与提交证据。
- **后续功能契约阻塞**：B2-06 父子策略、B2-11 受控外部引用、B4 选定场景后的领域能力；B3-05 版本选择经只读审计确认缺少版本服务/消费者契约，当前属于产品/后端契约阻塞，不应凭空实现。FileUpload 表单数据流集成、B3-09 淘汰契约及受控消费者已通过，转入真实宿主验收；B2-01、B2-05、B3-03 本地子范围已不再列为本地缺口。更广泛组合和错误路径仍按上表逐项保留。
- **外部环境阻塞**：真实 Provider/RBAC/租户与字段授权、真实审批/任务/通知/导入导出/审计/版本服务、服务端幂等与事务、真实持久化、屏幕阅读器、发布包与部署授权。默认镜像下载失败已通过仅作用于本次命令的官方 registry 环境覆盖绕过，完整 pack 门禁通过，未修改全局 npm 配置。
- **产品决策阻塞**：locale 支持范围与舍入策略、B2-11 引用解析安全契约、B3-05 版本历史模型、B4-01..04 是否纳入本轮范围。B3-09 最小淘汰契约已获授权并实现，不再作为未定义策略列入。
- 本轮只增加短索引，不重写矩阵历史计数；矩阵中的本地通过结果仍只在其证据边界内有效。
