# 企业级完成边界最终有界审计（2026-10-27）

- 角色与边界：pi 为唯一文档 writer，主线程为独立 reviewer。本轮为
  documentation-only / low，跳过 delegation gate；只新增本文件，不修改生产代码、
  测试、fixture、依赖或编排文件。
- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md`、
  `docs/evaluations/enterprise-ui-closeout-20261024.md`、
  `docs/evidence/enterprise-local-closeout-audit-20261027.md`。
- source：用户要求对当前企业级目标做最终有界完成审计，并按四类给出“本地已完成 /
  本地不等于真实服务 / OrbStack 已解除 / 仍需外部输入”的准确边界。
- 范围：只读核对当前源码、直接测试文件、主线程独立复核记录、Toast/Surface 证据和
  OrbStack 真实本地服务证据；不新增测试、不重跑全量、不执行全量 typecheck/build。
- 非目标：不宣称整体企业级目标完成，不把本地 stub、受控 Provider、DOM/ARIA 断言、
  tarball 或构建结果外推为真实服务、生产 RBAC、读屏、registry 发布或生产部署。
- 当前状态：**PARTIAL**。工作区保留既有 dirty，未提交、未推送、未发布、未部署。

> 路径校正：用户提到的 `docs/evaluations/enterprise-local-closeout-audit-20261027.md`
> 在当前仓库实际位于 `docs/evidence/enterprise-local-closeout-audit-20261027.md`。
> 本文按该实际路径引用，未创建重复文件或重复测试。

## 1. 四类判定口径

| 类别 | 允许写成的结论 | 不允许外推的结论 |
| --- | --- | --- |
| **A. 当前代码和主线程独立证据已完成** | 当前源码范围内的某条本地契约已有直接测试、当前文件/计数和主线程独立复跑记录；`git diff --check` 通过。 | 不表示真实 Provider、服务端授权、屏幕阅读器、发布包消费、部署或在线验收完成。 |
| **B. 本地实现有证据但不等于真实服务** | 组件、fixture、受控 Provider、浏览器矩阵或静态分发证据存在，边界和未覆盖项已写明。 | 不把本地行为、HTTP stub、内存 Provider、tarball 或构建成功当成生产服务完成。 |
| **C. 已由 OrbStack 本地真实服务解除** | 在隔离 worktree 中用可丢弃的本地 PostgreSQL/PostgREST/GoTrue/Storage 栈跑通指定流程，并记录精确清理。 | 不把本地可丢弃栈当成生产 Supabase、生产 RBAC、字段权限、即时撤权、MFA/OAuth 或生产 bucket/RLS。 |
| **D. 仍需产品选择/真实账号/RBAC/读屏/发布部署** | 明确列出缺失的产品契约、真实账号、授权、读屏实机或发布部署输入。 | 不把继续补本地 case、重复浏览器矩阵或修改文档当作关闭外部验收。 |

计数规则：不同 runner、不同范围、pi 与主线程的独立运行分别记录，不合并。OrbStack
runner 中的三引擎路径仍只按 runner 的 `pass` 计数，不把 3 个浏览器引擎乘进测试数。
本文件中的计数均引自现有证据文档；本轮没有复跑，因此不把它们冒充 2026-10-27 的
新执行结果。

## 2. 当前工作区与证据快照

- 当前 worktree：`enterprise-storage-acceptance/svadmin`，基线相关证据显示隔离
  worktree 基线为 `72ce9847`（见 `enterprise-auth-storage-acceptance-20261026.md`）。
- 当前 `git diff --stat`：15 个 tracked 文件、`598 insertions(+)`、`24 deletions(-)`；
  另有未跟踪的 OrbStack fixture、`docker/enterprise-storage/` 和本轮证据文档。
- tracked dirty 包含：`packages/supabase/src/data-provider.ts`、
  `packages/supabase/src/response-validation.test.ts`、
  `packages/surface/src/SurfaceRenderer.test.svelte.ts`、
  `packages/surface/src/components/SurfaceRenderer.svelte`、
  `packages/surface/src/localization.ts`、
  `packages/ui/src/components/AutoTable.svelte`、
  `packages/ui/src/components/Toast.svelte`、两个 AutoTable 测试、两个 Toast 测试、
  `QuickEditLifecycleFixture.svelte`、`quick-edit-lifecycle.spec.ts` 以及两份评估文档。
- 未跟踪的真实服务 fixture 包括
  `scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`、
  `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`、
  `scripts/fixtures/enterprise-runtime/browser/` 与 `docker/enterprise-storage/`。
- 本轮只读取以下关键证据：
  `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md`、
  `docs/evaluations/enterprise-ui-closeout-20261024.md`、
  `docs/evidence/enterprise-local-closeout-audit-20261027.md`、
  `docs/evidence/enterprise-toast-drawer-geometry-20261026.md`、
  `docs/evidence/enterprise-surface-source-error-diagnostic-20261027.md`、
  `docs/evidence/enterprise-resource-workspace-service-20261026.md`、
  `docs/evidence/enterprise-auth-storage-acceptance-20261026.md`、
  `docs/evidence/enterprise-storage-acceptance-20261026.md`、
  `docs/evidence/enterprise-orbstack-rbac-20261025.md` 和
  `docs/evidence/enterprise-autoform-postgrest-record-20261026.md`。

## 3. A 类：当前代码和主线程独立证据已完成

以下条目只说明“当前源码在所列本地契约上已有直接证据，且主线程已独立复跑或复核”。
每条的最后边界仍然有效，不能把 A 类合计成企业级总体完成。

| 条目 | 当前代码/直接证据 | 计数与主线程证据 | 仍未证明 |
| --- | --- | --- | --- |
| Surface 源错误、语言切换与绑定 | `packages/surface/src/components/SurfaceRenderer.svelte`、`localization.ts`、`SurfaceRenderer.test.svelte.ts`；契约 `enterprise-surface-source-localization-contract-20261027.md` | `SurfaceRenderer.test.svelte.ts` **24/24**、exit 0；主线程独立复验 24/24、2.60s；定向 ESLint 与 `git diff --check` exit 0 | 真实 Provider、RBAC、读屏、发布与部署；宿主自行展示 `onError` 原文的责任不在该收敛范围 |
| Toast 默认错误链与 QuickEditDrawer 几何 | `QuickEditLifecycleFixture.svelte`、`quick-edit-lifecycle.spec.ts`；证据 `enterprise-toast-drawer-geometry-20261026.md` | 专属 Playwright **30/30**、exit 0、1.4m；三引擎 × 桌面/窄屏六项目；主线程独立复跑；未设置自定义 NotificationProvider、未延长默认时长 | 仅单条 error Toast 与单个 Drawer 短表单；不证明多 Toast 堆叠、长文案、缩放、RTL、软键盘、减少动画、读屏、真实后端失败 |
| AutoTable 权限感知空态 | `packages/ui/src/components/AutoTable.svelte`；`auto-table-interactions.test.svelte.ts`、`auto-table-enterprise.test.svelte.ts` | 主线程独立运行 interactions **63/63**、enterprise **11/11**、exit 0；无创建权限使用 `common.noData`，筛选空态仍用 `empty.description` | 不证明真实空结果来自生产 Provider；不证明权限服务真实拒绝或字段级权限 |
| Toast host 生命周期 | `packages/ui/src/components/Toast.svelte`、`toast-host.test.svelte.ts` | 主线程独立运行 **8/8**、exit 0；覆盖首个 sheet 打开移到左下、多个 sheet 只移除一个仍保持、最后移除恢复右上 | 不证明真实浏览器几何；几何由上述 30/30 单独覆盖，仍不证明读屏和像素级遮挡 |
| ResourceFormBody 表单错误与 scope | `packages/surface/src/components/ResourceFormBody.svelte`；`form-scope.test.svelte.ts` | 主线程独立运行 **7/7**、exit 0；覆盖 scope 变化清空、纯展示变化保留输入与实例身份；Provider 失败只发布内部 error，DOM 使用 locale 文案 | 不证明真实 Provider 提交错误、服务端 Schema 一致性、RBAC、读屏或发布 |
| B1-01 FilterBuilder | `filter-builder.test.svelte.ts`；矩阵 B1-01 | 主线程最终 **52/52**、exit 0；pi 前一轮 50/50 单独保留；节点/深度超限 fail-closed 与迟到元数据只读回归已补 | 日期区间、共享视图、完整关系查询、真实 Provider/权限、读屏、发布 |
| B1-02/B2-11 Schema 表单与受控引用 | `json-schema-form-enterprise.test.svelte.ts`、递归 Schema resolver、oneOf 浏览器配置；矩阵 B1-02/B2-11 | 受控引用与 oneOf 主线程独立 **119/119**、exit 0；oneOf 六项目 **42/42**、exit 0；此前 JSON Schema 81/81 单独保留；拒绝路径 24/24 不并入 | 不承诺远程 HTTP resolver、SSRF/鉴权/缓存/完整性、服务端 Schema 接受/拒绝一致、读屏、发布 |
| B1-03 SpreadsheetView | `spreadsheet-view` 直接测试；矩阵 B1-03 | 主线程独立复核 **122/122**、exit 0、12.63s；有界公式、错误码、只读保护、CSV 精确值、危险文本前缀和资源上限有断言 | 大表/工作簿性能、真实 XLSX 适配、许可、读屏、发布；完整 Excel/公式引擎属于 B4-02 按需扩展 |
| B2-03 TimePicker/DateTimePicker 键盘与清空 | `playwright.date-time-keyboard.config.ts`；矩阵 B2-03 | 主线程三引擎桌面 **24/24**、exit 0、15.8s；覆盖 Tab/方向键、分段删除后补回、逐段清空、禁用跳过与 FormData 排除 | 其他 locale、设备、真实读屏、真实后端、新分发包与部署 |
| B2-04 RadioGroup/SegmentedControl | 专属单元与 Playwright；矩阵 B2-04 | 主线程 RadioGroup 单元 **28/28**、浏览器 **75 passed/3 skipped**、exit 0；SegmentedControl 单元 **12/12**、浏览器 **75 passed/3 skipped**、exit 0 | 读屏认证、真实后端/RBAC、发布包消费、部署；Firefox 导航超时根因未确认 |
| B2-05 异步 Select/MultiSelect/AutoComplete | `select-query.svelte.ts`、`ComboboxField.svelte`、`AutoComplete.svelte`；证据 `enterprise-local-closeout-audit-20261027.md` | 主线程独立验证 select-contract **77/77**、Combobox **50/50**、AutoComplete **15/15**、专属 Playwright **78/78**、色彩契约 **4/4** | 真实 Provider 是否响应/传播 `AbortSignal`、真实租户撤权时序、读屏、发布；本地 auth session reset 不等同 RBAC 撤权 |
| B2-06 Tree/TreeSelect/Cascader | 矩阵 B2-06；`TreeSelect.svelte` 未改 | 主线程单文件 TreeSelect **140/140**、Cascader **44/44**、exit 0；此前历史 136/136、43/43 单独保留；`leaf-only` 浏览器 18/18 单独记录 | single 三态完整组合、真实 Provider/读屏、发布 |
| B2-07 实体与关系选择器 | `RelationPicker.svelte`；矩阵 B2-07 | 主线程独立单文件 **32/32**、11.96s；拒绝场景 **6/6**、8.7s；主线程未重复完整 30 项矩阵，完整 30/30 为独立记录 | 真实 Provider/授权、撤销延迟、读屏、发布与部署 |
| B2-08 Upload/Dropzone/FileList | 矩阵 B2-08；`file-upload-field-feedback.test.svelte.ts` 等 | 主线程单文件 **26/26**、6.16s；Preview 定向浏览器 **6/6**、8.7s；点击完成后的真实服务上传另见 C 类 | 真实存储/预览渲染器、读屏、生产上传生命周期、发布 |
| B2-09 FormField/ErrorSummary 与 AutoForm 复合字段 | `form-field` 直接测试、`playwright.autoform.config.ts` | 主线程 FormField **22/22**；AutoForm 六项目 **102/102**、exit 0、2.2m；覆盖错误摘要、数组、日期范围、TreeSelect、Cascader、Transfer、RichText、Tags、Multiselect、Images 与迟到响应隔离 | 真实上传服务、服务端错误映射、Provider/RBAC、读屏、发布 |
| B3-01 资源工作台受控消费者 | `ResourceWorkspaceFixture.svelte`、`ResourceOperationsPage → AutoTable → QuickEditDrawer`；矩阵 B3-01 | 主线程单文件 **35/35**、13.50s；受控浏览器 **36/36**、约 1.1m；此前 18/18、34/34 分开保留 | 受控 Provider 不等于真实服务；真实 RBAC、持久化、读屏与发布仍未验收（真实本地服务见 C 类） |
| B3-02 共享视图 | 矩阵 B3-02；`saved-view-stale-fields-20261024.md` | 主线程模型 **29/29**、解码 **38/38**；最终消费者三引擎两视口 **18/18**；失效列按视图身份清理且保存载荷不含失效列 | 不证明真实后端、双语言独立矩阵、读屏或发布 |
| B3-03 导入导出中心 | `ImportWizard`、`ExportContract`；矩阵 B3-03 | ImportWizard **70/70**、ExportContract **59/59**、exit 0；三引擎两视口 fixture 主线程 **30/30**、exit 0；失败行/CSV 只显示安全错误码文案 | 本地任务/失败报告为 stub/mock；真实导入服务、任务持久化、权限、读屏、发布仍未验收 |
| B3-04 批量操作 | 矩阵 B3-04；`auto-table-interactions.test.svelte.ts` | 48/48 与 50/50 两组均分别有 pi/主线程记录；50/50 主线程 14.39s、exit 0；覆盖部分成功重试、pending 去重、当前页载荷与搜索边界 | 服务端跨页删除、幂等/事务、真实取消、跨页全量删除、真实 RBAC、发布 |
| B3-05 详情工作台与版本差异展示 | 矩阵 B3-05；`detail-workspace-audit-20261022.md`；`VersionDiffViewer` | 主线程受控浏览器 **36/36**、A→B→A 生命周期；五区切换 **48/48**；`scoped-async-consumers` **12/12**、**11/11**；`version-diff-viewer` **2/2**；版本差异已有 `aria-pressed`/装饰图标处理 | 2026-10-27 用户已决策保留宿主 `oldValue/newValue` 展示，版本列表/选择/恢复归业务宿主，SVAdmin 不提供版本服务/list/select/restore；真实记录 ID 服务、RBAC、读屏与发布仍未验收 |
| B3-06 权限与组织管理 | 矩阵 B3-06；`useCan.test.svelte.ts`、`form-contract` + `table-contract` | 主线程 `useCan` **47/47**；表单+表格契约 **177/177**；权限查询失败与正常拒绝已区分，失败 fail-closed 并显示可重试文案 | 真实 RBAC、继承、拒绝原因、字段权限、跨用户并发、真实租户授权、读屏、发布 |
| B3-07 审批中心 | 矩阵 B3-07；冲突浏览器配置 | 主线程单文件 **20/20**、6.89s；三引擎两视口冲突场景 **6/6**、6.2s；审批动作错误只映射稳定文案，草稿与重试语义保留 | 真实审批 Provider、服务端冲突/幂等、历史一致性、RBAC、读屏、发布 |
| B3-08 任务与通知中心 | 矩阵 B3-08；`task-notifications-cross-engine-20261024.md` | 主线程任务 **49/49**、同任务动作互斥；跨引擎任务 **36/36**（30.0s）、通知 **6/6**（9.9s），均 exit 0 | 真实任务/通知 Provider、持久化任务恢复、服务端幂等/取消、完整读屏、发布 |
| B3-09 多标签工作区 | 矩阵 B3-09；`workspace-tab-state.ts`、`workspace-tab-state.test.svelte.ts`、`multitab-*`；[closeout B3-09 复验](../evaluations/enterprise-ui-closeout-20261024.md#b3-09-三引擎生命周期矩阵复验2026-10-26) | 当前契约：显式 `maxTabs`、逻辑 `id+path` LRU、固定/dirty/active/closable 保护已实现；`clear()` 回读确认、失败关闭信封、同 storage 共享阻断已实现。`13/13` 与 `81/81` 是历史阶段计数，保留为历史，不冒充当前。 | 完全不可写 storage 时跨新运行时删除仍不保证；`clear()` 返回 `storage: 'failed'` 必须由宿主处理。生产 storage 选型、真实产品路由/Provider、内存/性能、读屏和发布仍未验收；淘汰策略已确定，不再等待产品选择。跨窗口与分发续接见 [closeout 最新段落](../evaluations/enterprise-ui-closeout-20261024.md#本地分发与跨窗口续接复验2026-10-26)。 |
| B3-10 仪表盘 | 矩阵 B3-10；example `/` 消费者 | 主线程 **18/18**、1.2m；example 配置单文件 **6/6**、1.10s；覆盖筛选/日期、hash 恢复、metric 钻取、详情返回刷新、未知 region 拒绝、Provider 失败重试 | 真实 Dashboard Provider、服务端聚合口径、时间边界、详情权限、RBAC/跨租户、SSR、读屏、发布 |
| B4-01 Kanban 窄契约 | 矩阵 B4-01；Kanban 组件直接测试 | 主线程历史独立复核 **32/32**、exit 0；两轮红测分别为 5 failed/20 passed、1 failed/31 passed，修复后 25/25、32/32 | 后端排程、领域持久化、可替换引擎、Gantt/Scheduler；台账原文为按需扩展，不构成领域完成 |

### A 类小结

A 类能证明的是：在当前 dirty 源码和现有受控测试范围内，上述本地契约已有直接断言，
主线程也已独立复跑关键文件；`git diff --check` 在对应回合通过。A 类不能证明：
真实身份/租户/RBAC、真实上传或数据持久化、真实服务端 Schema、屏幕阅读器、移动端实机、
registry 发布、部署或在线验收。任何一条都不得单独写成“企业级完成”。

## 4. B 类：本地实现有证据但不等于真实服务

B 类保留本地可复现证据，但证据源是组件、fixture、受控 Provider、DOM/浏览器断言或
静态分发产物。它们可以证明前端契约和回归边界，不能替代 C/D 类。

| 本地实现/证据 | 本地证据与计数 | 为什么不能等于真实服务 | 仍缺的外部输入 |
| --- | --- | --- | --- |
| B1 正确性：FilterBuilder、JsonSchemaForm、SpreadsheetView | FilterBuilder 52/52；Schema 81/81、受控引用 119/119；Spreadsheet 122/122；均按文件独立记录 | 输入是本地表单值与受控 Schema，不是真实查询/权限/Schema 服务；Spreadsheet 不是完整 Excel | 真实 Provider/权限、服务端 Schema 一致性、XLSX 许可、读屏、发布 |
| B2 基础控件：数字/日期/时间/选择/树/关系/上传/表单 | numeric-format 30/30、numeric-locale 20/20、numeric-input 18/18、区域浏览器 72/72；DatePicker 绑定 4/4；DateTimePicker 24/24；Select 77/77 等 | 键盘/合成事件不等于 OS 剪贴板、真实 IME、真实时区/设备；上传 UI 不等于生产对象存储 | 其他 locale、真实 IME/剪贴板、真实读屏、生产上传与取消、发布 |
| B2-05 异步选择与取消 | select-contract 77/77、Combobox 50/50、AutoComplete 15/15、Playwright 78/78 | 本地只证明前端透传 `AbortSignal`、session/scope 隔离和窗口化；Provider 可能不响应取消，也没有真实租户撤权 | Provider 真实取消/超时上限、真实 RBAC 撤权、读屏、发布 |
| B3-01 资源工作台受控消费者 | 单文件 35/35；受控浏览器 36/36、18/18；本地 Provider 按搜索/分页/选择/详情/更新约束真实运行 | 受控内存 Provider 和本地 Router 不是生产数据服务；不能证明服务端错误分类、持久化、幂等或真实权限 | 真实 Provider/RBAC、生产持久化、跨服务事务、读屏、发布；真实本地栈见 C 类 |
| B3-02 共享视图 | 模型 29/29、解码 38/38、消费者 18/18 | 视图身份、失效列清理和本地存储是前端模型；真实共享视图服务、跨用户并发和权限未证明 | 真实后端、跨用户并发、真实权限、读屏、发布 |
| B3-03 导入导出 | ImportWizard 70/70、ExportContract 59/59、浏览器 30/30 | 导入任务、失败报告和 artifact 仍是 stub/mock；没有真实导入服务、任务持久化或服务端取消 | 真实导入/导出服务、任务持久化、权限、读屏、发布 |
| B3-04 批量操作 | 48/48、50/50；部分成功重试与 pending 去重 | 载荷与本地去重不等于服务端事务、幂等、跨页删除或真实取消 | 真实批量写入服务、服务端幂等/事务、RBAC、发布 |
| B3-05 详情工作台/版本差异 | 受控浏览器 36/36、五区 48/48、侧栏 12/12、11/11、版本差异 2/2 | 版本差异只接收宿主提供的 `oldValue/newValue`；2026-10-27 用户已决定版本列表/选择/恢复归业务宿主，SVAdmin 不提供版本服务/list/select/restore | 真实版本/记录服务、RBAC/冲突语义、读屏、发布；版本服务本身已划出 SVAdmin 范围 |
| B3-06/07/08 权限反馈、审批、任务通知 | `useCan` 47/47；表单+表格 177/177；审批 20/20、6/6；任务 49/49、跨引擎 36/36；通知 6/6 | 本地 fail-closed、稳定错误文案和互斥动作不等于真实权限服务、审批 Provider、任务持久化或服务端幂等 | 真实 RBAC/组织服务、审批服务、任务/通知 Provider、读屏、发布 |
| B3-09/ B3-10 多标签与仪表盘 | 生命周期 81/81（历史计数）；关闭保护 29/29；状态适配器 13/13（历史计数）；仪表盘 18/18、example 6/6 | 本地 storage/Router/受控 Dashboard 不是生产 storage、真实路由或真实聚合服务；淘汰策略已落地，跨窗口仅本地续接而非生产协议 | 生产 storage、真实 Provider/聚合口径、SSR、读屏、发布 |
| B4-01 Kanban | 组件窄契约 32/32；两轮红测后修复 | 只验证前端卡片移动/回执/回滚/卸载边界；没有后端排程、领域持久化或可替换引擎 | 产品是否选择 Kanban/Scheduler/Gantt 引擎，以及真实排程/持久化服务 |
| 本地构建与分发 | `build:packages` exit 0（12 包）；`build:example` exit 0；`pack:check` exit 0；`@svadmin/ui` 1033 tarball entries；33 个发布包入口/声明目标审计通过 | tarball/packed consumer 只证明当前本地源码可构建、可打包、可被受控消费者解析；不是 registry 上的包，也不是部署产物 | registry 发布授权、跨版本消费、部署环境、在线验收 |

### B 类与 A 类的关系

A 类中的 B3-01、B3-05 等也同时属于 B 类：它们有当前源码和主线程独立证据，但运行环境
仍是受控 Provider/fixture。把它们同时列出是为了防止读者把“主线程已复跑”误读为
“真实服务已验收”。C 类只对其中特定本地真实服务范围做升级，不整体升级 B 类。

## 5. C 类：已由 OrbStack 本地真实服务解除

C 类的共同前提：在隔离 worktree 中使用 `docker --context orbstack`，启动随机 Compose
project，使用真实 PostgreSQL/PostgREST/GoTrue/Storage HTTP 服务；runner 在成功和失败
路径都执行本次项目 `down -v`，并按精确 project label 核对容器（含已停止）、network、
volume 为空。下列计数均为各自 runner 的独立记录，不合并，也不把浏览器引擎数乘入测试数。

| 已解除范围 | 证据文件与关键计数 | 真实服务内容 | 明确边界 |
| --- | --- | --- | --- |
| 本地真实 Provider/RLS 数据链路 | `docs/evidence/enterprise-orbstack-rbac-20261025.md`：**1 pass / 14 assertions / exit 0**；PostgreSQL **18.6**、PostgREST **12.2.12** | 真实 HTTP + PostgreSQL RLS：匿名拒绝、tenant-a/tenant-b 独立读取、正常 CRUD、跨租户 insert/update/delete 拒绝、独立 provider 回读确认越权写入未发生；同时修复 `@svadmin/supabase` DELETE 适配缺口 | 本地栈不等于 Supabase Auth/真实 RBAC 服务、文件对象存储、业务版本冲突 API、生产部署或读屏；生产字段权限/即时撤权未证明 |
| 本地真实 Storage 对象授权与生命周期 | `docs/evidence/enterprise-storage-acceptance-20261026.md`：**7 pass / 0 fail**、exit 0；随机项目 `svadmin-storage-smoke-<uuid>` | 私有 bucket、owner-only 策略、A/B/匿名读取与覆盖/删除拒绝、签名 URL 实际可读、上传引用只保留 `uploadId`、预先中止不落库、取消清理校验 `uploadId`、重复清理空操作 | 该 runner 不运行真实 GoTrue，用户 JWT 由测试进程本地签发；只证明 Storage RLS；不证明在途取消、部分写回滚、生产 bucket/RLS、MFA/OAuth、读屏 |
| 本地真实 GoTrue + Storage 联合 | `docs/evidence/enterprise-auth-storage-acceptance-20261026.md`：**`pass=8 fail=0 skip=0 todo=0`**、exit 0；随机项目 `svadmin-auth-storage-smoke-<uuid>` | 真实 GoTrue 注册/登录/`refreshSession`/登出驱动 Storage；刷新后使用新 token；登出后上传拒绝且无对象落库；A/B 所有者隔离、匿名/跨用户读取/覆盖/删除拒绝、签名 URL 边界 | 8/8 与 14/14 是不同 runner 版本/范围，**不合并计数**；不证明生产 RBAC/租户撤权、MFA/OAuth、邮件投递、跨服务事务、生产 bucket/RLS |
| 本地真实 PostgREST/PostgreSQL 租户 CRUD | `docs/evidence/enterprise-postgrest-tenant-acceptance-20261026.md`：主线程最终 **`pass=12 fail=0 skip=0 todo=0`**、exit 0 | 真实 GoTrue 会话驱动当前工作区 `createSupabaseDataProvider` 与 PostgREST/PostgreSQL：租户 CRUD 持久化读回、跨租户拒绝、行租户转移拒绝、user_metadata 伪造拒绝；精确临时资源清理为空 | 这是 Node 侧服务链路，不是完整资源工作台浏览器到业务数据库的闭环；生产 RBAC、读屏、发布仍未证明 |
| 真实浏览器 AutoForm → PostgREST/PostgreSQL 持久化 | `docs/evidence/enterprise-autoform-postgrest-record-20261026.md`：主线程独立 **13/13**、exit 0、零 skip/todo；9 张截图已检查 | 三引擎真实登录、Storage 上传、创建、真正 `page.reload()` 回显、编辑保存、B 租户真实 GET 空结果；Node 独立会话读回 title/tenant/attachment，Storage 对象 id 与文件字节核对 | 本地验收表 `browser_records`、CHECK、tenant 元数据和 RLS 是可丢弃 fixture，不是生产业务模型；不证明生产 RBAC、跨服务事务、移动端、读屏或发布 |
| 真实浏览器资源工作台端到端 | `docs/evidence/enterprise-resource-workspace-service-20261026.md`：主线程对稳定帧最终代码独立 **14/14**、exit 0、零 skip/todo；第 14 项内部运行 Chromium/Firefox/WebKit，缺一即失败，仍计 1 项 | 真实 ResourceOperationsPage → AutoTable → QuickEditDrawer → AutoForm：真实搜索、第 2 页、选择、详情 GET、PATCH 失败/成功、PostgreSQL CHECK `23514` 拒绝后保留草稿、修正保存、列表刷新；B 租户独立 context 空列表且无写请求；REST allowlist 负面 probe | 本地可丢弃服务流程，不是生产 RBAC、字段权限、即时撤权、读屏、移动视觉、跨源 CORS、大文件流式或发布部署；旧 13/13 与受控 Provider 证据保持原边界 |

### C 类能升级与不能升级的范围

能升级：真实数据库、真实 PostgREST HTTP、真实 GoTrue 会话/刷新/登出、真实 Storage
对象授权和生命周期，以及这些服务驱动的浏览器 AutoForm/资源工作台流程，在**本地可丢弃
测试栈**中已经有主线程独立证据。此前“全部真实服务未验收”的笼统说法应被修正。

不能升级：生产 Supabase 或生产 RBAC、生产租户/字段权限、即时撤权、MFA/OAuth、邮件、
生产 bucket/RLS、跨服务事务、生产身份映射、生产网络/CORS、大文件流式、读屏实机、
registry 发布、部署和在线验收。C 类不等于“真实生产服务完成”。

## 6. D 类：仍需产品选择、真实账号、RBAC、读屏或发布部署

| 待关闭项 | 为什么本地不能继续关闭 | 需要的输入/判据 |
| --- | --- | --- |
| B3-05 版本历史范围与真实集成 | 范围决策已关闭：2026-10-27 用户明确保留宿主 `oldValue/newValue` 差异展示；版本服务、版本列表、版本选择和恢复是业务宿主集成职责，不阻塞 SVAdmin 开发收口。SVAdmin 不提供版本服务/list/select/restore。 | 真实记录/版本服务集成、RBAC/租户与字段授权、读屏实机、发布和部署仍未验收；这些外部集成限制需由业务宿主或后续真实环境验收关闭，不重新打开 SVAdmin 版本模型/API 产品决策。详见 [版本范围契约](../evaluations/enterprise-b3-05-version-scope-contract-20261027.md)。 |
| B2-11 服务端 Schema 一致性与远程 resolver | 本地受控引用只允许宿主注入普通文档，按精确 URI/fragment 解析，不执行 fetch/XHR/动态 import；远程 HTTP resolver、SSRF/鉴权/缓存/完整性未定义 | 实际 Schema 来源、版本、校验接口与安全策略；同一载荷在客户端与服务端的接受/拒绝结果一致 |
| B2-06 选择范围决策与 B4 按需范围 | B2-06 产品决策已关闭：2026-10-27 用户批准 TreeSelect 多选纯叶子值级联、父项全选/取消和半选、单选允许父值且 `onlyLeafSelectable` 父项只展开；Cascader 完整路径值、`changeOnSelect` 控制父路径提交；不新增 `strict`、父子混合值模式或独立权限树模型。旧待决策记录保留为历史，由新契约覆盖。B4-02 Pivot/Spreadsheet、B4-03 Workflow/DecisionTable、B4-04 富文本/代码/文档、B4-01 Scheduler/Gantt/引擎替换仍为台账“按需扩展”。 | B2-06 仍需真实 Provider/权限、读屏实机、完整 retry/empty/disabled 交叉矩阵、发布和部署验收；B4 仍需产品明确业务场景、范围、数据模型和是否替换引擎。上述外部输入不可用继续修改本地文档或重复受控 case 代替。详见 [B2-06 选择范围契约](../evaluations/enterprise-b2-06-selection-scope-contract-20261027.md)。 |
| 生产 RBAC、租户与字段级权限 | 本地 fail-closed、稳定错误文案、受控租户切换和本地 RLS 只证明前端/本地栈行为；真实授权服务、继承、拒绝原因、字段权限、即时撤权和跨用户并发未验证 | 指定测试应用/环境、现有安全登录方式、两个隔离测试租户及低权限身份、允许操作的记录范围；真实允许/拒绝/撤权与跨租户隔离 |
| 真实账号与身份生命周期 | 本地 GoTrue 是随机 Compose 中的可丢弃账号；没有真实账号、MFA/AAL、OAuth、邮件投递、跨客户端 session 替换、生产身份映射 | 真实账号/测试身份、MFA/OAuth 配置、邮件与 session 替换场景、明确授权和数据清理边界 |
| 真实 Provider 能力与跨服务事务 | B2-05 只证明前端透传 `AbortSignal` 和隔离迟到结果；Provider 是否实际取消、服务端超时上限、任务持久化、幂等、跨服务回滚未证明 | Provider 真实取消/超时契约，可观测服务端行为，任务/回滚/幂等协议；不可用本地 stub 代替 |
| 生产 Storage/bucket/RLS 与上传边界 | C 类的 Storage 栈是本地私有 bucket + owner-only 策略；不是生产 bucket/RLS、生产对象生命周期、大文件流式、跨源 CORS 或生产网络条件 | 生产契约、可清理测试 bucket、上传/修改/取消/删除权限、失败与清理边界；独立读回验证 |
| 屏幕阅读器、移动端视觉与性能 | 本地 DOM/ARIA、键盘和浏览器矩阵不等于读屏实机；narrow 不是移动端视觉验收；单次 20,000 行或本地窗口化不是通用性能保证 | 人工读屏安排、移动设备/视口矩阵、明确性能场景/规模/视口/测量边界与性能环境 |
| B3-09 生产 storage 与真实集成 | 淘汰策略已确定并落地：显式 `maxTabs`、逻辑 `id+path` LRU、固定/dirty/active/closable 保护；本地适配器与三引擎生命周期为历史证据。生产 storage 选型、跨刷新/跨窗口删除保证、完全不可写时的旧持久化残留仍未关闭 | 选择并验证生产 storage 语义；`storage: 'failed'` 由宿主处理；真实路由/Provider、跨刷新/跨窗口验证、性能、读屏与发布 |
| registry 发布、部署与在线验收 | `build:packages`、`build:example`、`pack:check` 与 1033 tarball entries 只证明本地构建/分发完整；不是 registry 已发布，也不是部署产物 | registry 发布授权、跨版本消费、部署目标/权限、在线验收；源码构建、分发、部署与在线验收分别记录 |

## 7. 总账与禁止宣称

1. **不能写“整体企业级目标已完成”。** 当前唯一正确总状态是 **PARTIAL**；A/B/C 各自
   只关闭有界范围，D 类仍需产品或外部授权输入。
2. **不能把 C 类升级为生产验收。** OrbStack 解除的是本地可丢弃 PostgreSQL/PostgREST/
   GoTrue/Storage 服务流程；生产 RBAC、字段权限、即时撤权、MFA/OAuth、生产 bucket/RLS、
   跨服务事务、读屏和发布部署仍未解除。
3. **不能把 A/B 类相加成总完成度。** 各 runner、各文件、pi 与主线程独立结果分开记录；
   引擎数不乘入测试数；受控 Provider、stub、DOM 断言、ARIA 和 tarball 不能相互替代。
4. **不能继续用新增本地测试替代外部验收。** D 类输入未到位前，重复本地 case 只会增加
   维护面，不会产生真实账号、RBAC、读屏或发布证据。
5. **不能把工作区 dirty 当成发布基线。** 当前 15 个 tracked 修改和未跟踪 fixture 均
   保留；没有提交/SHA 对应关系、没有 registry 发布、没有部署，不能称为已发布或已上线。

## 8. 本轮执行与保留

- 本轮只读取文档、源码和既有证据；未运行测试、浏览器矩阵、构建、全量 typecheck、
  `test:standalone` 或 `verify:standalone`。
- 未新增或修改生产代码、测试、fixture、依赖、配置或编排文件；只新增本证据文档
  `docs/evidence/enterprise-completion-boundary-20261027.md`。
- 工作区全部既有 dirty 保留，包括上述 15 个 tracked 修改和未跟踪的真实服务 fixture；
  未提交、未推送、未发布、未部署，未执行任何生产写入。
- 本文件不把历史计数冒充本轮复跑结果；主线程审查时应以当前 `git diff --check` 和
  实际 `git status --short` 为准。

## 9. 主线程后续审查点（建议）

- 只读审查本文件与当前工作区，确认四类没有互相外推，尤其确认 C 类没有被写成生产
  服务完成、A 类没有被写成总体完成。
- 执行 `git diff --check`，确认新增文档无空白错误；如需核对范围，再执行
  `git status --short` 与 `git diff --stat`，确认仍为原 dirty 集合加本文件。
- 不要求全量测试、全量构建或重复浏览器矩阵；如发现文档与现有证据不一致，只做有界
  文档更正，不新增测试、不改生产代码。
- 若后续要进入 D 类，先取得明确的产品决策、真实测试账号/环境、RBAC 授权、读屏安排或
  发布部署授权，再另立有界验收任务；不得从本文直接推导“已经可以发布”。
