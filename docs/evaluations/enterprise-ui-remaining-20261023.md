# 企业级 UI 收尾差距清单（2026-10-23）

> 范围：仅审计 `enterprise-ui-plan.md` 原始批次一至四（B1-01..B4-04）与 `enterprise-ui-acceptance-matrix-20261022.md` 的当前未完成项，并只读核对直接相关源码。本文不是完成声明，不替代矩阵中的历史证据，也不把本地 mock/受控 Provider 通过当作服务完成。
>
> 本轮为 documentation-only，`safe_skip_reason=documentation-only`；pi 为唯一 writer，主线程审查。未跑测试、构建、类型检查或全仓扫描，未提交、推送、部署。

## 1. 结论先行

原始企业级 UI 目标**未完成**。29 个原始编号中，没有一条达到“本地功能 + 真实服务/授权 + 读屏 + 发布”全部门槛；部分条目的本地子范围已闭环，只能关闭对应子缺口。

真正的收尾阻塞分两类，不能混写：

1. **仍需本地实现的功能**：B2-11 受控外部引用、B3-05 版本选择、B3-09 淘汰策略等。B2-01 区域格式与 B2-05 本地取消/虚拟化/AutoComplete 子范围已完成，剩余是外部 Provider、读屏和发布验收。缺少 API 是缺口本身，不是“出范围”。（B3-03 本地 dry-run 已在 2026-10-23 增量补齐，见矩阵；服务端试运行仍不存在。）
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

- **B3-01 完整编辑**：矩阵 B3-01“完整编辑页主线程复核（2026-10-23）”已记录真实 `AdminApp` 路由进入 `AutoForm` 编辑、失败保留草稿、重试成功并恢复 `q/page`，Chromium desktop 1/1、exit 0；本地完整编辑路由不再列缺口，剩余是真实 Provider/RBAC 与发布。
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
| B1-04 | 全仓兼容与后续源码消费者生产构建；发布包与部署。定向回归与 `example check` 已记录，不等于全仓验收。 | B/C | 矩阵 B1-04；`docs/evidence/enterprise-consumer-build-20261022.md` |
| B2-01 | 本地显式 `en-US`/`de-DE`/`zh-CN` 区域格式、严格解析、精度/步进与表单提交已完成；剩余真实剪贴板/输入法、读屏、发布包与部署。 | C | 矩阵 B2-01；`NumberInput.svelte`、`MoneyInput.svelte`、`PercentInput.svelte` |
| B2-02 | 读屏、真实时区/后端、新分发包与部署。日期/范围、禁用日期、快捷范围、键盘已有本地证据。 | C | 矩阵 B2-02；`DatePicker.svelte`、`DateRangePicker.svelte` |
| B2-03 | 读屏、真实后端、新分发包；“只清部分分段也提交空值”需产品确认。DST/日期策略本轮未复跑，仅引用既有证据。 | C/D/B | 矩阵 B2-03；`DateTimeInput.svelte`、`TimePicker.svelte`、`DateTimePicker.svelte` |
| B2-04 | 更广泛控件组合下的原生 reset；真实读屏、服务端授权、发布包消费与部署。 | B/C | 矩阵 B2-04；`RadioGroup.svelte`、`SegmentedControl.svelte` |
| B2-05 | 本地已补公开 `AutoComplete`、真实 signal 透传/旧请求中止、可选客户端超时和 200+ 行窗口化；剩余真实 Provider/后端取消与超时、真实 RBAC/租户撤销、读屏和发布。 | C | 矩阵 B2-05；`ComboboxField.svelte`、`AutoComplete.svelte`、`packages/core/src/select-query.svelte.ts` |
| B2-06 | 完整半选/父子选择策略的公开契约与交叉矩阵；真实 Provider、读屏、发布。`bind:options` 内部替换后的宿主传播已补本地证据。 | A/B/C | 矩阵 B2-06；`TreeSelect.svelte`、`Cascader.svelte` |
| B2-07 | 真实资源授权/RBAC、撤销延迟、服务端分页一致性、完整关系选择器能力、读屏与发布。 | C | 矩阵 B2-07；`RelationPicker.svelte` |
| B2-08 | 真实 multipart/对象存储、服务端取消/清理幂等、审计、权限/租户隔离、读屏、发布。预览渲染器属宿主边界，不计为本组件缺失。 | C | 矩阵 B2-08；`FileUpload.svelte`、`FileList.svelte` |
| B2-09 | `ArrayField` 行级分组及其余复合控件（Transfer/TreeSelect/Cascader/DateRange/富文本/上传）的帮助/错误关联；完整 Tab 顺序；真实读屏；跨浏览器完整矩阵与发布。 | B/C | 矩阵 B2-09；`FieldRenderer.svelte`、`ErrorSummary.svelte` |
| B2-10 | 弹窗/抽屉统一状态与校验仍未被证明；真实后端取消/回滚/幂等；完整 Tab/读屏；分发包与部署。 | A/C | 矩阵 B2-10；`AutoForm.svelte`、`StepsForm.svelte`、`QuickEditDrawer.svelte` |
| B2-11 | `$ref`/`oneOf`/外部引用的受控适配（解析作用域、允许列表、超时、鉴权、SSRF 策略、分支选择 UI、公开错误 API）；真实读屏、服务端 TypeBox/授权、发布。显式拒绝只闭环安全边界。 | A/D/C | 矩阵 B2-11；`JsonSchemaForm.svelte` 内部 `readRecursiveSchemaForm(...).issues` |
| B3-01 | 真实 Provider/RBAC、服务端持久化、真实设备/读屏、发布包与部署。本地完整编辑路由已由主线程闭环。 | C | 矩阵 B3-01；`ResourceOperationsPage.svelte`、`AutoTable.svelte`、`QuickEditDrawer.svelte` |
| B3-02 | 团队/系统作用域写入授权、失效字段裁剪与提示真实行为、默认视图冲突、真实共享视图存储/服务、读屏与发布。 | B/D/C | 矩阵 B3-02；`saved-list-views.ts`、`saved-list-views-model.svelte.ts` |
| B3-03 | 真实任务持久化与进程重启恢复；服务端试运行；服务端全量导出；失败报告下载鉴权；真实权限/租户、大文件、读屏与发布。本地客户端 dry-run 已实现，但不是服务端试运行。 | C | 矩阵 B3-03；`ImportWizard.svelte`、`ExportButton.svelte` |
| B3-04 | 服务端幂等/事务、真实取消、跨页全部匹配删除协议、真实批量写入 Provider、读屏与发布。当前页载荷已有本地证据。 | C | 矩阵 B3-04；`AutoTable.svelte`、`BatchActionBar.svelte` |
| B3-05 | “选中记录版本 → oldValue/newValue”的真实契约与消费者；版本空态/错误/权限语义；真实附件/关联/活动/审计/版本服务、RBAC/租户/字段授权、读屏与发布。 | A/D/C | 矩阵 B3-05；`detail-workspace.ts`、`DetailWorkspaceSections.svelte`、`VersionDiffViewer.svelte` |
| B3-06 | 服务端 RBAC、继承、拒绝原因、字段权限、跨用户并发、真实租户授权、屏幕阅读器实机与发布。本地非布尔 fail-closed 和 DOM 无障碍语义已闭环，仍不等于真实读屏或服务验收。 | C | 矩阵 B3-06；`PermissionMatrix.svelte`、`RolesSettings.svelte` |
| B3-07 | 真实审批 Provider、服务端版本冲突/幂等/去重、权限、历史一致性、读屏与发布。本地冲突路径已闭环。 | C | 矩阵 B3-07；`ApprovalCenter.svelte` |
| B3-08 | 真实任务/通知 Provider、持久化任务恢复、服务端幂等/取消、跨浏览器完整矩阵、读屏与发布。 | B/C | 矩阵 B3-08；`TaskList.svelte`、`NotificationSettings.svelte` |
| B3-09 | 真实产品路由/Provider/查询缓存接入、浏览器前进后退与跨标签页恢复、淘汰策略（数量上限/LRU/固定优先级）、完整产品矩阵与性能、生产 storage 选型、读屏与发布。当前受控标签栏 fixture 已有三引擎两视口证据。淘汰策略决策输入见 [b3-09-tab-eviction-decision-20261023.md](b3-09-tab-eviction-decision-20261023.md)。 | A/D/B/C | 矩阵 B3-09；`MultiTabKeepAlive.svelte`、`workspace-tab-state.ts` |
| B3-10 | 生产 Dashboard 全局筛选控件/URL 状态落位；真实时间范围聚合口径、metric/text 钻取业务闭环、真实 Provider 慢请求取消/错误码映射、RBAC/跨租户、读屏、跨浏览器、SSR、发布与部署。 | B/C | 矩阵 B3-10；`DashboardView.svelte`、example dashboard 页面 |
| B4-01 | 产品是否选择该场景；真实领域持久化与冲突合并；服务端排程；可替换引擎；Gantt/Scheduler 的领域交互；真实 RBAC/跨租户、性能、读屏、跨浏览器与发布。Kanban 仅本地窄契约。 | D/C/A | 矩阵 B4-01；`KanbanBoard.svelte`、`GanttChart.svelte` |
| B4-02 | 服务端聚合、完整公式引擎、XLSX/第三方许可、包体积/性能预算、发布与部署；是否选择 Pivot/Spreadsheet 场景。 | D/C | 矩阵 B4-02；`PivotTable.svelte`、`SpreadsheetView.svelte` |
| B4-03 | 工作流版本/发布/模拟/审计/执行结果、决策表执行结果、服务端编排、权限、读屏与发布；是否选择 Workflow/DecisionTable 场景。 | D/C | 矩阵 B4-03；`DecisionTable.svelte`、`workflow-boundaries.test.svelte.ts` |
| B4-04 | 大内容性能、HTML/粘贴安全、版本差异、只读/协作边界、真实上传服务、读屏、许可与发布；是否选择富文本/代码/文档场景。 | D/A/C | 矩阵 B4-04；`LazyRichTextEditor.svelte`、`code-editor.test.svelte.ts` |

## 5. 本地功能缺失的 ownership 与可实现性

| 缺口 | 真实 ownership / 公开 API 现状 | 能否按原目标实现 |
| --- | --- | --- |
| B2-01 区域格式 | 已有公开 `locale`、严格解析、格式化、精度/步进和原生提交契约；当前显式集合为 `en-US`/`de-DE`/`zh-CN`。 | 本地范围已实现；新增 locale 或真实剪贴板/IME 需产品与外部环境验收。 |
| B2-05 虚拟化/取消/AutoComplete | 已有公开 `AutoComplete`、窗口化列表、查询 signal 透传和客户端超时边界；真实 Provider 的取消/超时仍由外部服务验收。 | 本地范围已实现；不把受控 Provider 结果外推为服务端取消保证。 |
| B2-06 半选/父子策略 | `TreeSelect.svelte` 公开 props 有 `multiple`、`onlyLeafSelectable`、`virtualized`，节点已有 `aria-checked="mixed"`，但没有完整父子级联/严格选择策略的公开契约。 | 可补公开策略参数与控制逻辑；具体默认语义需产品确认，但基础能力可按原目标落地。 |
| B2-10 弹窗/抽屉统一状态 | `AutoForm`/`StepsForm` 有公开 `reset()`；`QuickEditDrawer` 是宿主封装，弹窗/抽屉共享状态没有统一公开契约。 | 可先收敛到现有 AutoForm/StepsForm 生命周期；是否新增统一容器 API 需最小设计，不应只补测试。 |
| B2-11 受控外部引用 | 解析入口是内部模块 `readRecursiveSchemaForm(...).issues`，没有公开 resolver/允许列表/分支选择 API；UI 只有表单级通用错误。 | 不能在无契约下安全实现。需产品/安全先定义解析作用域、允许列表、超时、鉴权与 SSRF 策略；属“待决策 + 后端契约”，不是出范围。 |
| B3-03 试运行 | 已实现公开 `dryRun`/`onPreview`，复用解析、映射与逐行预校验，返回 `totalRows`/`importableRows`/`failedRows`；`importableRows` 仅表示本地 schema 校验通过，不保证服务端成功。`dryRun=true` 时即使带 `initialTaskId`/`taskName` 也不恢复任务 UI、不 `get/submit/cancel/retry/upload`，模式切换会清理任务态；普通导入首错早停，预览才聚合全部失败行。 | 本地客户端预检已闭环；真实服务端试运行、唯一性/授权/业务状态校验仍属后端契约，不在本轮虚构。 |
| B3-05 版本选择 | `detail-workspace.ts` 的 `DetailWorkspaceVersionData` 只有 `oldValue/newValue` 等载荷；provider scope 只有 `resourceName/recordId/meta`，没有版本 ID、版本列表或选中动作；`packages/core/src` 未定位记录版本 read API。 | 需先有真实版本服务/schema 或产品契约；仅靠 UI 无法凭空定义历史版本来源。属“产品/后端契约”阻塞。 |
| B3-09 淘汰策略 | `MultiTabKeepAlive.svelte`、`workspace-tab-state.ts` 没有 `maxTabs`/LRU/固定标签优先级的公开参数；适配器只管查询/滚动/草稿快照。 | 策略确定后可本地实现；当前缺产品决策，不能自行设定上限或淘汰规则。 |
| B4-01 引擎替换/Scheduler | 仓库已有 `KanbanBoard`/`GanttChart` 本地组件，未定位 Scheduler 或可替换引擎契约。 | 需产品先选择场景；选定后可实现，当前不作为默认必做。 |

## 6. 下一件最高收益可执行任务

**B3-03 本地 dry-run 已完成（2026-10-23 增量）。** 公开 `dryRun`/`onPreview` 复用现有 CSV/JSON 解析、映射和逐行预校验，返回类型化 `ImportPreviewResult`，不调用 `create`/`createMany`；`dryRun=true` 时不恢复或轮询任务、不提交/取消/重试/上传，即使同时传入 `initialTaskId`/`taskName` 也如此。预览文案只表达本地校验通过/失败，不保证服务端成功；返回映射不等于正式导入，正式导入仍会重新校验并写入。组件单文件与三引擎两视口专属浏览器场景均已补本地证据。它不是服务端试运行，仍不证明唯一性、真实授权/租户或业务状态。

**B2-05 本地取消/超时/虚拟化/AutoComplete 已完成（2026-10-23 增量）。** 证据见 `docs/evidence/combobox-b2-05-cancel-virtual-20261023.md`；剩余为真实 Provider/RBAC/读屏/发布。下一本地候选从 B2-06 父子选择策略或 B2-10 弹窗/抽屉统一状态中按产品优先级选择。

B3-03 剩余工作转入外部服务验收：真实任务持久化/进程重启恢复、服务端试运行、服务端全量导出、下载鉴权、真实权限/租户与读屏。

## 7. 原目标是否完成与真正阻塞

- **原目标是否完成：否。** 没有一条原始编号同时满足通用完成标准的公开 API、数据正确性、失败恢复、权限/租户、键盘/读屏、i18n、性能、真实消费者构建、许可与提交证据。
- **本地可继续推进的阻塞**：B2-06 父子策略、B2-11 受控外部引用、B3-05 版本选择、B3-09 淘汰策略、B4 选定场景后的领域能力。B2-01、B2-05、B3-03 本地子范围已不再列为本地缺口。
- **外部环境阻塞**：真实 Provider/RBAC/租户与字段授权、真实审批/任务/通知/导入导出/审计/版本服务、服务端幂等与事务、真实持久化、屏幕阅读器、发布包与部署授权。
- **产品决策阻塞**：locale 支持范围与舍入策略、B2-11 引用解析安全契约、B3-05 版本历史模型、B3-09 标签上限/淘汰策略、B4-01..04 是否纳入本轮范围。
- 本轮只增加短索引，不重写矩阵历史计数；矩阵中的本地通过结果仍只在其证据边界内有效。
