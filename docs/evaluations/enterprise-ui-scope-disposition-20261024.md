# 企业级 UI 原始范围有界完成审计（2026-10-24）

> 本文保留阻塞解除前的审计快照，不是当前待办清单。后续用户“解决阻塞”已触发
> `enterprise-ui-unblock-contract-20261024.md`：内部引用、显式 oneOf、草稿数据
> 政策及 example AutoForm 草稿接入均已本地收口；远程引用明确禁止，不再作为
> 本轮待批准项。下文 B2-11/B3-09 和第 3–5 节对应旧结论已被
> [当前收口记录](enterprise-ui-closeout-20261024.md) 取代。
> 真实服务、读屏及发布未验收，B4 未选；不能把本地收口扩写为原始目标全部完成。

## 0. 审计契约

- 类型：documentation-only，`safe_skip_reason=documentation-only`。
- 写入者：pi 为唯一文档 writer；主线程负责审查本表，不把本审计当实现完成。
- 写入范围：仅本文件。主线程已把本文引用的测试配置路径修正为根目录
  `playwright.workspace-tabs.cross-browser.config.ts`；本轮未新增或修改其他文件。
  未改产品、测试、已有台账、矩阵或证据文档；未跑 tests，未提交、推送、部署。
- 权威范围：`enterprise-ui-plan.md` 原始计划（2026-09-19，含原始 29 个编号、
  B4 按需条目的“按需扩展”口径与“每项至少记录”的通用完成标准）、
  `docs/architecture/enterprise-ui-reconciliation.md`、当前
  `enterprise-ui-acceptance-matrix-20261022.md`、`enterprise-ui-remaining-20261023.md`、
  `enterprise-ui-closeout-20261024.md`，以及最新
  `b2-09-file-action-browser-20261024.md`、`workspace-navigation-readiness-20261024.md` 证据。
- 审计性质：本表是**文档证据审计**，不是对每项当前源码的逐项重验，也不是发布
  或外部环境验收记录。表中“本地已闭环”指已有对应文档/证据路径支持，不宣称
  本轮重新跑过所有本地指标。已完成的 13/13、12/12 文件动作反馈只引用其路径与
  边界，不重复、不累计。

## 1. 判定口径

本表按“原始明确要求”逐项判定，不把后续新增的组合矩阵、完整日历、全量 locale、
时区全集、完整 Excel、行级错误模型、完整版本服务等扩展自动升级为原始门禁。
但也不因此宣布不适用或缩水：只有原始需求或组件 owner 能证明不属于该项时才排除；
无法确定时标“待确认”，并说明是后续扩展还是原始语义有歧义。

“适用完成门槛”分两层记录：

1. **原始本地可判据**：该编号原始要求可由本仓库公开 API、组件契约、受控消费者
   或专属浏览器证据验证的部分。
2. **通用标准记录维度**：公开 API、数据正确性、加载/失败/重试、权限/身份/租户
   隔离、键盘与读屏、国际化、性能、真实消费者构建、许可、对应提交证据。
   原始计划要求“每项至少记录”，但**每项都须记录、适用性须逐项判断**；不代表
   每项都必须同时具备真实服务、实机读屏与生产部署才算完成。真实服务边界、读屏
   与发布若属于该项原始语义，仍需保留；不属于的部分不能拿来判所有本地工作未完成。

剩余类别固定使用以下标签：

- **本地安全**：无需产品/安全授权即可在本仓库安全实施或复验。
- **产品决策**：必须先确定业务语义、数据边界或 API 契约，不能从本地代码推导。
- **真实服务/账号环境**：需要真实 Provider、RBAC/租户、持久化、后端服务或凭证。
- **读屏人工**：需要真实屏幕阅读器与人工操作。
- **发布授权**：需要提交/发布包/registry/部署授权。

## 2. 29 项逐项处置表（阻塞解除前历史快照）

| 编号 | 原始明确要求 | 适用完成门槛 | 最新证据路径 | 原始本地剩余 | 通用维度外部待验（适用性逐项判断） | 剩余类别 |
| --- | --- | --- | --- | --- | --- | --- |
| B1-01 FilterBuilder | 嵌套 AND/OR 可往返；无效/不可编辑条件不得被静默丢弃；类型化条件值；深度与数量限制 | 四项本地契约 + 公开 API/错误/i18n/键盘/证据记录；日期区间、共享视图、完整关系查询 UI 不属于本项原始门禁 | `docs/evidence/filter-builder-b1-01-readonly-unlock-20261023.md`、`docs/evidence/filter-value-feedback-20261022.md` | 无（原始四项本地证据已闭环，本表未重验当前源码） | 真实查询/权限 Provider 下的编译一致性、读屏、发布包消费与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B1-02 JsonSchemaForm | 展示和提交共享默认值；数值枚举不变成字符串；清空数字不变为零；验证失败不能提交 | 四项正确性 + 显式拒绝安全边界；完整 `$ref`/`oneOf` 受控适配归 B2-11，不作本项门禁 | `docs/evidence/schema-form-description-association-20261022.md`、`schema-form-hidden-parse-errors-20261022.md`、`schema-form-unsupported-schema-20261022.md` | 无（原始四项本地证据已闭环，本表未重验当前源码） | 服务端 Schema 校验与业务授权、读屏、新分发包与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B1-03 SpreadsheetView | 移除动态代码求值；公式循环、错误、非法语法和资源上限有确定结果 | 有界求值 + 确定错误码 + 资源上限 + 公开限制；完整公式引擎/完整 Excel（含 XLSX 适配）归 B4-02 按需，不在本项原始四条内 | `docs/evaluations/enterprise-ui-correctness.md`、`packages/ui/src/components/spreadsheet-safety.test.svelte.ts` | 无（原始四项本地证据已闭环；XLSX 适配不列为本项缺口） | 大表资源上限的真实性能验证、读屏、发布；XLSX 与第三方许可按 B4-02 另行确认 | 真实服务/账号环境；读屏人工；发布授权 |
| B1-04 回归与兼容 | 保留现有入口；增加正反向测试；记录验证证据及未通过项 | 入口保持 + 正反向回归 + 未通过项记录 + 当前源码分发检查；不以“全仓全绿”为唯一判据 | `docs/evidence/enterprise-ui-pack-distribution-audit-20261023.md` | 仍缺本轮增量后的行为兼容复跑与重新打包（本地安全；本表未执行） | registry 发布与部署授权 | 本地安全；发布授权 |
| B2-01 NumberInput/MoneyInput/PercentInput | 精度、区域格式、空值与零、字段契约 | 显式 locale 最小集合 + 严格解析 + 空/零/精度/步进 + 原生提交；全部 `Intl` locale、新增 locale 集合不自动列为原始门禁（待确认） | `docs/evidence/numeric-input-locale-20261023.md`、`numeric-input-contract-20261023.md`、`numeric-input-cross-browser-20261022.md` | 无（原始最小 locale/精度/空零契约已闭环）；新增 locale 是否纳入属后续扩展，待确认 | OS 剪贴板/IME 真实环境、读屏、发布 | 产品决策（locale 范围待确认）；真实服务/账号环境；读屏人工；发布授权 |
| B2-02 DatePicker/DateRangePicker | 日期/范围、禁用日期、快捷范围、键盘 | 四项本地契约 + 三引擎证据；自绘完整日历不是原始明确要求，不作门禁 | `docs/evidence/date-time-picker-binding-20261021.md`、`date-time-picker-cross-browser-20261022.md`、`date-time-policy-browser-20261022.md` | 无（原始四项本地证据已闭环） | 读屏、真实时区/后端环境、新分发包与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-03 TimePicker/DateTimePicker | 时间点、时区、跨日、输入与展示一致 | civil/instant 序列化 + 跨日/DST 策略 + 清空/分段 + FormData 一致 + 真实键盘；全时区全集不列为门禁 | `docs/evidence/date-time-picker-b2-03-keyboard-20261023.md`、`date-time-picker-b2-03-readonly-20261023.md`、`date-time-policy-browser-20261022.md` | 主路径已闭环；“只清部分分段是否应提交空值”原始语义有歧义，不能直接判缺陷或必做，待确认 | 读屏、真实设备/后端、发布 | 产品决策（分段清空语义待确认）；真实服务/账号环境；读屏人工；发布授权 |
| B2-04 RadioGroup/SegmentedControl | 选择与导航语义、键盘与禁用状态 | 原生选择语义 + roving/键盘 + 禁用/reset + 实例隔离；更广控件组合属后续扩展，不列原始门禁 | `docs/evidence/radio-group-reset-20261022.md`、`radio-group-browser-contract-20261022.md`、`segmented-control-keyboard-boundary-20261023.md` | 无（原始本地要求已闭环） | 真实读屏、服务端授权、发布包消费与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-05 异步 Select/MultiSelect/AutoComplete | 搜索取消、分页、虚拟化、选中回显 | 四项本地契约 + 旧响应隔离 + AbortSignal 透传 + 三引擎；真实 Provider 取消能力另验 | `docs/evidence/combobox-b2-05-cancel-virtual-20261023.md`、`combobox-multiselect-failure-20261023.md` | 无（原始四项本地证据已闭环） | 真实 Provider/后端取消与超时、真实 RBAC/租户撤销、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-06 Tree/TreeSelect/Cascader | 异步树、半选、父子策略、完整键盘路径 | 异步加载/半选/onlyLeaf/键盘 + 宿主 options 传播；父值回传与 strict 模式在未定义前不擅自新增 API | `docs/evidence/tree-select-cascader-b2-06-cross-regression-20261023.md`、`tree-select-keyboard-load-20261022.md`、`cascader-async-loading-20261022.md` | 异步/半选/键盘本地证据已存在；父项是否进入 `value`、strict/non-strict 等原始语义有歧义，待确认，不自动列为必做缺口 | 真实 Provider 权限、读屏、发布 | 产品决策（父子语义待确认）；真实服务/账号环境；读屏人工；发布授权 |
| B2-07 实体与关系选择器 | 跨页选择、资源授权、租户切换隔离 | 跨页失败恢复 + 授权拒绝清理 + Provider/租户作用域隔离；真实 RBAC 另验 | `docs/evidence/relation-picker-page-recovery-20261022.md`、`relation-picker-authorization-revocation-20261023.md`、`relation-picker-cross-browser-20261022.md` | 无（跨页/拒绝清理/作用域隔离本地已闭环） | 真实资源授权/RBAC、撤销延迟、服务端分页一致性、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-08 Upload/Dropzone/FileList | 会话、进度、取消、重试、预览 | 会话/进度/取消/重试 + 预览宿主边界 + AutoForm 引用数据流；真实存储取消/清理另验 | `docs/evidence/autoform-upload-integration-20261024.md`、`file-upload-native-contract-20261021.md`、`file-list-preview-boundary-20261023.md` | 无（原始五项的本地契约已闭环；预览渲染器属宿主，不列组件缺口） | 真实 multipart/对象存储、服务端取消/清理幂等、审计、权限/租户、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-09 FormField/ErrorSummary | 帮助/错误关联、焦点、统一布局 | 帮助/错误 IDREF、首个错误焦点、统一布局 + 关键复合控件覆盖；行级/子字段错误模型须先有错误路径契约，不能由“关联”二字直接推出 | `docs/evidence/b2-09-file-action-browser-20261024.md`、`b2-09-composite-followup-20261024.md`、`auto-form-error-summary-browser-20261022.md` | 无（原始三项本地已闭环，含 13/13、12/12 文件动作反馈）；`rowErrors`/行级模型是否属于原始范围有歧义，待确认，不自动要求实现 | 完整 Tab、真实读屏、服务端错误映射、发布 | 产品决策（行级模型待确认）；读屏人工；真实服务/账号环境；发布授权 |
| B2-10 表单引擎统一 | AutoForm、分步、弹窗、抽屉、动态列表共享状态与校验 | 五类容器共享状态/校验/reset/关闭保护/旧回执隔离 + `aria-busy`；真实取消/回滚另验 | `docs/evidence/form-engine-reset-lifecycle-20261023.md`、`modal-drawer-form-state-20261023.md`、`steps-form-lifecycle-browser-20261023.md` | 无（本地统一生命周期已闭环） | 真实后端取消/回滚/幂等、完整 Tab/读屏、新分发与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B2-11 完整 Schema 表单 | 嵌套、数组、条件与外部引用的受控适配 | 嵌套/数组/条件本地适配 + 外部引用受控适配（解析作用域、允许列表、超时、鉴权、SSRF、分支 UI、公开错误 API）；显式拒绝只闭环安全边界 | `docs/evidence/schema-form-b2-11-boundary-audit-20261023.md`、`schema-form-b2-11-browser-unsupported-20261023.md` | **原始“受控适配”仍未完成**：外部引用 resolver/允许列表/分支选择与错误 API 需产品/安全契约 | 服务端 TypeBox/授权、读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |
| B3-01 资源数据工作台 | 查询、选择、详情、编辑、恢复和权限成品封装 | 列表→选择→详情→编辑→保存→恢复 + 权限 fail-closed + 真实消费者；真实 RBAC/持久化另验 | `docs/evidence/resource-workspace-browser-20261022.md`、`resource-workspace-audit-20261022.md` | 无（本地成品路径已闭环） | 真实 Provider/RBAC、服务端持久化、真机/读屏、发布包与部署 | 真实服务/账号环境；读屏人工；发布授权 |
| B3-02 共享视图 | 个人/团队/系统作用域、默认视图、失效字段 | 三作用域 + 默认视图 + 失效字段裁剪/清理 + 真实消费者；团队/系统写入授权由服务端判定 | `docs/evidence/saved-view-stale-fields-20261024.md`、`saved-view-stale-fields-browser-20261024.md`、`saved-list-views-browser-20261022.md` | 失效字段与三作用域本地证据已闭环；默认视图冲突语义待产品/后端确认 | 团队/系统作用域写入授权、真实共享视图存储、完整 Tab/读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |
| B3-03 导入导出中心 | 预校验、试运行、任务持久化、全量导出、失败报告 | 客户端预校验 + dry-run + 真实任务持久化/重启恢复 + 服务端试运行 + 服务端全量导出 + 失败报告下载鉴权 | `docs/evidence/import-export-center-browser-20261023.md`、`import-export-center-audit-20261022.md` | 客户端预校验与 dry-run 已闭环；服务端试运行/任务持久化/全量导出/失败报告鉴权属服务端实现，本地无法完成 | 真实权限/租户、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B3-04 批量操作 | 已选/当前页/全部匹配范围、部分成功、幂等与取消 | 三种范围协议 + 部分成功反馈 + 幂等/事务/取消 + 授权；当前页载荷通过不等于全部匹配完成 | `docs/evidence/auto-table-batch-partial-retry-20261023.md`、`batch-operation-audit-20261022.md`、`batch-action-bar-contract-20261021.md` | 已选/当前页与部分成功本地已闭环；“全部匹配”删除协议需后端/产品契约 | 服务端幂等/事务、真实取消、真实批量写入 Provider、读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |
| B3-05 详情工作台 | 关联、附件、活动、审计、版本差异 | 五区存在 + 对象切换隔离 + 真实消费者；版本差异必须有版本 ID/列表/选中与 Provider 契约 | `docs/evidence/detail-workspace-browser-20261022.md`、`detail-workspace-audit-20261022.md` | 关联/附件/活动/审计与五区本地证据已闭环；版本差异只有静态 `oldValue/newValue`；完整版本服务/列表/选中 API 是否属于原始范围待确认，不自动要求 | 真实版本服务/消费者契约、空态/错误/权限语义、RBAC/租户/字段授权、读屏、发布 | 产品决策（版本范围待确认）；真实服务/账号环境；读屏人工；发布授权 |
| B3-06 权限与组织管理 | 继承、拒绝原因、字段权限、服务端边界 | 权限矩阵 fail-closed + 继承/拒绝/字段权限的服务端契约 + 组织管理 UI；本地 DOM 不等于服务端授权 | `docs/evidence/permission-matrix-fail-closed-20261022.md`、`permission-matrix-browser-20261022.md`、`roles-settings-feedback-20261022.md` | 无（本地非布尔 fail-closed 与无障碍语义已闭环） | 服务端 RBAC/继承/拒绝原因/字段权限、跨用户并发、真实租户、读屏实机、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B3-07 审批中心 | 待办、历史、意见、状态迁移与冲突 | 待办/历史/意见 + 状态迁移 + 冲突路径 + 幂等/去重；真实审批服务另验 | `docs/evidence/approval-center-cross-browser-20261022.md`、`approval-center-version-conflict-20261022.md`、`approval-center-idempotent-retry-20261022.md` | 无（本地冲突与重试已闭环） | 真实审批 Provider、服务端版本冲突/幂等/去重、权限、历史一致性、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B3-08 任务与通知中心 | 刷新恢复、任务状态、重试和取消能力声明 | 刷新恢复（查询重取）+ 状态/能力门禁 + 重试/取消声明 + 旧回执隔离；任务持久化由 Provider/服务端负责 | `docs/evidence/task-notifications-cross-engine-20261024.md`、`task-list-query-feedback-20261022.md`、`docs/evidence/notification-settings-recovery/` | 本地状态/能力/重试/取消声明已闭环；持久化任务跨刷新/重启恢复与传输层取消依赖 Provider/服务端 | 真实任务/通知 Provider、服务端幂等/取消、通知存储一致性、真实权限/租户、完整跨浏览器、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B3-09 多标签工作区 | 路由/查询/草稿/滚动恢复、关闭保护与淘汰 | 路由/查询/滚动恢复 + 关闭保护 + 淘汰 + 真实消费者；草稿恢复需先定义生命周期，不能只以 dirty 布尔代替 | `docs/evidence/workspace-tabs-consumer-20261024.md`、`workspace-lifecycle-cross-browser-20261024.md`、`workspace-navigation-readiness-20261024.md`、`workspace-scroll-boundaries-20261024.md` | 路由/查询/滚动/关闭/淘汰本地已闭环；切换保活已有真实 AutoForm 草稿保留/关闭保护；缺的是刷新/淘汰/组件重建后的内容恢复。原始草稿恢复未定义生命周期，待用户决定边界，不能笼统说“草稿未实现”。Firefox 导航候选已处理（字体隔离 + browser launch 代理），最新定向 9/9（50.9s）；历史个别根因仍未确定 | 跨窗口/真实身份切换/生产 storage/真实后端、读屏、发布 | 产品决策（草稿边界）；真实服务/账号环境；读屏人工；发布授权 |
| B3-10 仪表盘 | 全局筛选、时间范围、钻取与错误状态 | 筛选/时间范围 URL 恢复 + 钻取 + 失败重试/迟到隔离 + 真实消费者；真实聚合口径另验 | `docs/evidence/dashboard-workspace-consumer-20261022.md`、`dashboard-enterprise-contract-20261022.md` | 无（本地筛选/恢复/钻取/错误状态已闭环） | 真实时间范围聚合口径、Provider 慢请求取消/错误码映射、RBAC/跨租户、生产 SSR/持久化、读屏、发布 | 真实服务/账号环境；读屏人工；发布授权 |
| B4-01 Kanban/Scheduler/Gantt | 领域级交互与可替换引擎；台账状态为“按需扩展” | 只有产品选定场景后，才按领域交互与引擎替换验收；Kanban 本地窄契约不等于整项 | `docs/evidence/kanban-move-persistence-20261022.md` | 场景未选定，不能宣布完成；本地 Kanban 窄契约不等于整项 | 选定后：真实领域持久化/冲突合并、服务端排程、可替换引擎、Gantt/Scheduler、RBAC/性能、读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |
| B4-02 Pivot/Spreadsheet | 服务端聚合、完整公式引擎、许可和包体积；台账状态为“按需扩展” | 只有产品选定场景与许可边界后，才按服务端聚合/完整公式/包体积验收；B1-03 有界表格不等于本项 | `docs/evaluations/enterprise-ui-correctness.md`、`packages/ui/src/components/PivotTable.svelte`、`SpreadsheetView.svelte` 及其测试 | 场景未选定，不能宣布完成；完整公式引擎、XLSX 适配、服务端聚合与许可均属本项按需范围，不能由 B1-03 外推 | 选定后：服务端聚合、完整公式引擎、XLSX/第三方许可、包体积/性能预算、发布 | 产品决策；真实服务/账号环境；发布授权 |
| B4-03 Workflow/DecisionTable | 版本、发布、模拟、审计、执行结果；台账状态为“按需扩展” | 只有产品选定场景后，才按版本/发布/模拟/审计/执行结果验收；本地 DecisionTable 边界不等于整项 | `packages/ui/src/components/workflow-boundaries.test.svelte.ts`、`pdf-spreadsheet-decision.test.svelte.ts`；`docs/evidence/` 未定位专属验收报告 | 场景未选定，不能宣布完成 | 选定后：服务端编排、版本/发布/模拟/审计/执行结果、权限、读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |
| B4-04 富文本/代码/文档 | 大内容、安全、版本、只读与编辑边界；台账状态为“按需扩展” | 只有产品选定场景后，才按大内容性能/HTML 与粘贴安全/版本差异/只读协作/上传验收；现有字段契约与上传恢复不等于整项 | `docs/evidence/richtext-field-contract-20261021.md`、`toolbar-upload-lifecycle-20261021.md`、`editor-upload-recovery-20261021.md` | 场景未选定，不能宣布完成 | 选定后：大内容性能、HTML/粘贴安全、版本差异、只读/协作边界、真实上传服务、许可、读屏、发布 | 产品决策；真实服务/账号环境；读屏人工；发布授权 |

## 3. 整体结论（历史，当前以顶部续接为准）

- 原始企业级目标**仍未完成**，但理由不是“29 项都没有通过真实服务/读屏/发布”。
  明确理由如下：
  1. **B2-11 原始受控适配仍有真实缺口**：外部引用的解析作用域、允许列表、超时、
     鉴权、SSRF、分支 UI 与公开错误 API 尚未落地；现有证据只证明显式拒绝的
     安全边界。
  2. **B3-09 原始草稿恢复生命周期未定义**：切换保活已有真实 AutoForm 草稿保留/
     关闭保护；刷新/淘汰/组件重建后的内容恢复需要先定义字段范围、PII/文件、
     存储位置、保留期、跨身份/租户隔离与冲突策略。
  3. **多项原始语义/协议待定**：B2-06 父子选择、B3-03 服务端试运行/全量导出、
     B3-04“全部匹配”协议、B3-05 版本服务范围、B3-08 任务持久化/传输层取消等，
     不能从本地代码安全推导。
  4. **B4-01..B4-04 仍为按需待选**，未选定场景前不能宣布完成。
  5. **尚未提交/创建 PR，更未获发布或部署授权**；真实账号/RBAC、真实服务、
     实机读屏与生产部署均未验收。
- 每项的通用记录维度都必须记录，但适用性逐项判断；本地证据已覆盖的原始条目
  不因缺少外部部署而倒推为“本地功能未完成”。同时，本表是文档证据审计，不宣称
  所有本地指标都已完成当前源码重验。
- 最新 Firefox 导航候选已处理：保留字体隔离并按引擎配置 browser launch 代理后，
  主线程最终定向三引擎 **9/9（50.9s）**；历史个别根因仍未确定，不把重复复跑同一
  用例当作最高收益候选。

## 4. 历史本地候选（不作为当前待办）

经本轮有界核对，**没有“无需任何产品/安全决策即可安全补齐”的原始功能缺口**，
因此只列一项，不凑满三项：

1. **B1-04 当前工作区增量后的兼容/打包复验（本地安全）**
   - 现状：`enterprise-ui-pack-distribution-audit-20261023.md` 的 pack 通过只覆盖
     当时源码；当前 dirty 工作区包含 B2-09/B3-09 等后续改动。
   - 定位：现有公开入口、`packages/ui` 构建与 `pack:check` 脚本、既有正反向测试。
   - 说明：这是复验而非新功能；即使通过也不替代真实发布/部署，本表未执行该复验。

B3-09 草稿内容恢复不列入“本地安全”：它需要先由用户确定数据与生命周期边界。
Firefox 导航用例已完成测试边界修正，不再作为本地候选重复复跑。

## 5. 历史输入清单（草稿与内部 Schema 决策已执行）

| 事项 | 需要用户给出的内容 | 为何无法从本地推导 |
| --- | --- | --- |
| B3-09 草稿恢复 | 持久化字段范围、敏感数据/文件是否入库、存储位置与生命周期、跨身份/租户隔离、恢复冲突策略 | 涉及 PII 与安全边界；代码里只有 dirty 布尔，没有草稿数据契约。切换保活/关闭保护已存在，缺的是刷新/淘汰/组件重建后的内容恢复 |
| B2-06 父子选择语义 | 父项是否进入 `value`、strict/non-strict 级联、禁用/未加载分支如何处理 | 当前实现是纯叶子值级联；新增语义会改变公开值模型，必须产品确认 |
| B2-11 外部 Schema 引用 | 解析作用域、允许列表、超时、鉴权、SSRF 策略、分支选择 UI、公开错误模型 | 这是安全与协议设计，不能由本地测试拒绝路径代替 |
| B3-05 版本差异/版本服务 | 原始“版本差异”是否要求版本 ID/列表/选中 API；Provider 契约、空态/错误/权限与租户语义 | 当前只有 `oldValue/newValue` 静态展示；完整版本服务是可能扩展，不能自动列为必做 |
| B3-02 团队/系统共享视图 | 写入授权、默认视图冲突、跨用户并发与失效字段删除语义 | 需要服务端授权与产品规则，本地受控 Provider 无法证明 |
| B3-03 导入导出 | 服务端试运行、任务持久化/重启恢复、全量导出、失败报告下载鉴权 | 当前 dry-run 是客户端预检，服务端任务与鉴权不存在于本地 |
| B3-04 全部匹配批量操作 | “全部匹配”删除/写入协议、幂等键、事务边界、取消语义 | 需要后端协议；当前页载荷不能外推 |
| B3-08 任务/通知 | 持久化任务恢复、服务端幂等、传输层取消、通知存储一致性 | 需要真实 Task/Notification Provider 与服务端契约 |
| B2-01/B2-03 产品语义 | 新增 locale 集合与舍入策略；只清部分时间分段是否允许提交空值 | 新增 locale 属后续扩展，分段清空属原始语义歧义；均待确认，不自动要求全部实现 |
| B2-09 行级/子字段错误 | 是否把 `rowErrors`/错误路径纳入原始范围，以及消费者契约 | `rowErrors` 属后续扩展或原始语义歧义，待确认，不自动列为必做 |
| B4-01..B4-04 | 是否选择 Kanban/Scheduler/Gantt、Pivot/Spreadsheet、Workflow/DecisionTable、富文本/代码/文档场景；XLSX 适配与许可边界 | 原始台账明确为“按需扩展”，未选择前不能宣布完成或擅自实现领域能力 |
| 外部验收环境 | 真实 Provider/RBAC/租户账号、持久化与后端服务、屏幕阅读器人工、发布/部署授权 | 本地 stub/受控 Provider/DOM 断言/本地浏览器均不能替代真实服务与人工读屏 |

## 6. 交付与 PR 边界

- 本文件是审计与处置记录，不是实现完成声明，也不是验收通过证明。
- 用户当前禁止未授权 commit/push；本轮未提交、未推送、未创建 PR。
- 原计划交付是独立 PR，不自动合并、发版或部署。部署必须单独授权，不能套作
  原始代码交付的门槛；PR 进入评审也不等于真实 service、真实账号/RBAC、实机读屏
  或生产部署完成。
- 已有证据中的 13/13、12/12 文件动作反馈、Firefox 最终定向 9/9（50.9s）与历史
  77/78 矩阵均按原边界保留，不累计、不外推，也不因本审计重写。

## 7. 主线程审查交接

请主线程重点审查：

1. 29 项“原始本地剩余”是否严格限定在原始计划，不把后续扩展（完整 locale、
   `rowErrors`、完整版本服务、XLSX 等）误列必做。
2. B4-01..B4-04 是否保持“按需待选、未完成”，没有被本表暗示完成。
3. B3-09 是否准确区分“切换保活/关闭保护已有”与“刷新/淘汰/重建后的草稿内容
   恢复待定义”，没有笼统宣称草稿未实现。
4. 第 4 节是否只列本地安全候选，没有把产品决策阻塞项伪装成本地可执行；Firefox
   导航用例是否已退出候选。
5. 第 5 节外部输入是否足以解释“为什么本地无法继续”，且没有要求用户提供秘密。
6. 29 个编号数量与全部引用路径是否一致；主线程修正配置路径一事是否已记录且未
   新增其他文件。
