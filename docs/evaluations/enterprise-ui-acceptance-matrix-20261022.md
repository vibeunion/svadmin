# 企业级 UI 完成审计矩阵（2026-10-22）

> 来源：用户持续企业级目标下的完成审计。本文不是新功能开发记录，也不把组件存在、历史测试计数或旧构建结果当作当前完成。审计基准为 `enterprise-ui-plan.md` 的原始批次一、后续能力台账全部条目、通用完成标准，以及 `ENTERPRISE_PRODUCT_SYSTEM.md`、`ui-state-matrix.md`、`DESIGN.md`、`enterprise-ui-correctness.md` 规定的页面与组件验收边界。

## 1. 状态口径

| 状态 | 含义 |
| --- | --- |
| 文档记录已验证但本轮未复跑 | 证据文档记录了定向测试或浏览器结果，但本轮只做文档审计，没有重跑测试、构建或类型检查。 |
| 当前本轮复核可证明 | 当前工作区只能证明文档、链接、模块边界或测试声明存在；不证明运行时行为或当前源码通过。 |
| 局部证据不足 | 条目的一部分已有直接证据，但原始要求中的关键范围仍缺当前源码、消费者、权限或失败恢复证明。 |
| 需外部验收 | 必须依赖真实 Provider、凭证、RBAC/租户服务、屏幕阅读器、发布授权或生产部署才能关闭。 |
| 按需待产品决策 | 台账原文标为“按需扩展”；未选择业务场景前不作为必做实现，也不因存在组件自动验收。 |

本轮为 documentation-only，跳过 delegation gate；记录为 pi writer、主线程 reviewer。未修改生产代码、测试或依赖，未执行全仓扫描、测试、build、typecheck、提交或网络写入。

> **当前状态索引（2026-10-24）**：阻塞解除与最新本地证据见 [enterprise-ui-closeout-20261024.md](enterprise-ui-closeout-20261024.md)。内部引用、显式 oneOf 与业务草稿接入已本地收口，真实服务验收仍为 PARTIAL。原始逐项范围见 [enterprise-ui-remaining-20261023.md](enterprise-ui-remaining-20261023.md)，其中旧待决策状态以最新收口记录为准；本文以下条目保留历史证据，不再作为当前缺口清单。

本文保留 29 条原始批次编号，只作为文档证据索引，不把新增证据反推成原始要求，也不宣称总体完成。每条分别标注本地可做、需外部环境或产品决策；未执行项不作完成结论。

## 2. 通用门槛如何应用

通用完成标准中的每一项都按“当前条目的证据边界”应用，而不是用一次局部通过替代全部门槛：

| 门槛 | 本文的应用方式 |
| --- | --- |
| 公开 API | 只接受公开入口、公开 props/事件或明确公开方法的证据；内部辅助函数能力不外推为公开 API 完成。 |
| 数据正确性 | 类型化值、空值与零、默认值、无损往返、提交载荷和迟到回执必须有直接断言；存在组件或演示数据不算正确性证明。 |
| 加载/失败/重试 | 区分初始加载、空、筛选无结果、错误、恢复和部分失败；stub 的本地恢复不外推为真实后端恢复。 |
| 权限/身份/租户 | 本地实例隔离、Provider/tenant 切换和旧回执隔离只能证明前端契约；真实 RBAC、服务端授权、跨用户并发仍需外部验收。 |
| 键盘与读屏 | 浏览器键盘/焦点证据只证明所列路径；DOM 名称、`aria-*` 和自动断言不等于屏幕阅读器认证。 |
| 国际化 | 只接受当前 locale 词条、语言切换不增请求、错误文案随语言更新的直接证据；不代表全量文案或全部语言已覆盖。 |
| 性能 | 只有明确场景、规模、视口和测量边界的证据才算；构建成功、旧报告或单次 20,000 行窗口记录不外推为通用性能保证。 |
| 真实消费者构建 | 只接受证据文档记录的具体源码与产物对应关系；旧 UI dist、旧 build 或历史 PR/CI 不能证明后续源码已进入消费者。 |
| 许可 | 台账条目的第三方组件、引擎或素材需逐项核对许可；未定位许可证据时明确标为未证明，而不是默认可用。 |
| 对应提交证据 | 证据文档中的基线、未提交工作区或历史计数不等同当前 HEAD；没有当前提交/SHA 与结果对应关系时，不能写成已验收。 |

另有一条硬边界：本地 stub、受控 fixture、Mock Provider 或 DOM 断言不能外推为真实 Provider、服务端幂等、数据库事务、生产安全或发布验收；旧 build 也不能沿用为后续源码的消费者构建证明。

## 3. 批次一：原始正确性范围

### B1-01 FilterBuilder

- 主线程最新复核：`filter-builder.test.svelte.ts` 独立运行 52/52 passed、exit 0、12.27s，`git diff --check` exit 0；pi 独立复核此前为 50/50、exit 0。新增两条回归分别覆盖迟到元数据仍无法校验时只读宿主条件原样保留，以及新草稿伪造 `readonly` 无法绕过编译；本轮再补组件入口对节点/深度超限的 fail-closed 回归，生产源码未改。仍不证明日期区间、共享视图、关系查询、真实 Provider/权限、读屏或发布。

- 原始要求：嵌套 AND/OR 可往返；无效/不可编辑条件不得被静默丢弃；类型化条件值；深度与数量限制。
- 直接证据：[filter-value-feedback-20261022.md](../evidence/filter-value-feedback-20261022.md)、[filter-builder-b1-01-readonly-unlock-20261023.md](../evidence/filter-builder-b1-01-readonly-unlock-20261023.md)、[enterprise-foundation-audit-20261021/README.md](../evidence/enterprise-foundation-audit-20261021/README.md)、[enterprise-ui-correctness.md](enterprise-ui-correctness.md)、[enterprise-ui-reconciliation.md](../architecture/enterprise-ui-reconciliation.md)。
- 证据覆盖边界：证据记录了递归组、类型化集合/范围、无效条件整次拒绝、宿主只读条件保留、预算限制，以及真实源码消费者浏览器 6/6；这些是当前文档记录，本轮未复跑浏览器。2026-10-23 已只读核对现有断言，并补三类窄回归：迟到元数据后仍无效的宿主条件保持只读且原样应用；新建草稿伪造 `readonly` 且无匹配宿主快照时仍被校验拒绝；组件入口对节点/深度超限均报告 `limit`、不调用 `onApply` 且不修改输入。该单文件主线程最终 52/52、exit `0`，pi 前一轮 50/50、exit `0`，源码无改动；source-map 缺失仅为既有警告，不影响退出码。
- 仍未证明的验收：日期区间控件、共享视图、完整关系查询界面、真实读屏、真实 Provider 权限和后端查询编译一致性。
- 下一项可执行动作：本轮已完成只读核对；既有用例已覆盖“元数据迟到后解锁宿主条件”，本次只补“迟到元数据仍无效时保持只读”和“新建节点伪造只读标记仍被校验”两条窄回归，未扩展日期区间、共享视图或关系查询 API。后续仅按真实外部场景补浏览器/Provider 证据。
- 外部依赖：真实权限/查询 Provider、屏幕阅读器、发布授权。
- 状态：2026-10-23 单文件主线程最终 52/52、exit `0`，`git diff --check` 通过；节点/深度超限组件入口回归已补，生产源码无改动；浏览器复跑、真实 Provider/权限、读屏与发布验收仍未完成。pi 的 50/50 为前一轮独立记录，不与本轮合并。

### B1-02 JsonSchemaForm

- 原始要求：展示和提交共享默认值；数值枚举不变成字符串；清空数字不变为零；验证失败不能提交。
- 直接证据：[schema-form-unsupported-schema-20261022.md](../evidence/schema-form-unsupported-schema-20261022.md)、[schema-form-description-association-20261022.md](../evidence/schema-form-description-association-20261022.md)、[schema-form-hidden-parse-errors-20261022.md](../evidence/schema-form-hidden-parse-errors-20261022.md)、[enterprise-ui-correctness.md](enterprise-ui-correctness.md)、[enterprise-ui-reconciliation.md](../architecture/enterprise-ui-reconciliation.md)。
- 证据覆盖边界：证据覆盖缺失键默认值、显式清空、类型化枚举、条件隐藏错误生命周期、帮助/错误关联、真实浏览器 24/24，以及 `$ref`/`oneOf`/外部引用/未知关键字的显式拒绝（单文件 61/61，主线程独立复核通过）。该 61/61 只证明 B1-02 原始正确性与显式拒绝安全边界；完整 `$ref`/`oneOf` 受控适配属于 B2-11，不作为 B1-02 门禁。问题路径来自内部模块 `readRecursiveSchemaForm(...).issues`，不是公开组件 API；UI 只保留表单级通用错误。
- 仍未证明的验收：不支持关键字的读屏表现（浏览器拒绝路径已由 B2-11 本地证据覆盖）、完整业务授权、服务端 Schema 校验、新分发包和部署；完整 Schema 受控引用适配见 B2-11。
- 下一项可执行动作：本轮不再新增 Schema 拒绝用例；先只读核对已有正确性用例，确认缺口才在 `packages/ui/src/components/json-schema-form-enterprise.test.svelte.ts` 增补。浏览器拒绝路径已有 B2-11 本地证据，读屏表现继续列为外部验证。
- 外部依赖：服务端 Schema/授权、屏幕阅读器、发布授权。
- 状态：本地单文件证据与主线程独立复核已记录；局部证据不足；需外部验收。

### B1-03 SpreadsheetView

- 原始要求：移除动态代码求值；公式循环、错误、非法语法和资源上限有确定结果。
- 直接证据：[enterprise-foundation-audit-20261021/README.md](../evidence/enterprise-foundation-audit-20261021/README.md)、[enterprise-ui-correctness.md](enterprise-ui-correctness.md)、[enterprise-ui-reconciliation.md](../architecture/enterprise-ui-reconciliation.md)。
- 证据覆盖边界：证据记录有界公式求值、确定错误码、只读保护、CSV 精确值、危险文本前缀、公开限制；单文件 122/122 已覆盖默认与无效尺寸、`maxRows`/`maxCells`/`maxSheets` 覆盖、单单元格与聚合文本、公式长度/深度/范围/步数及超限覆盖上限。聚合文本上限 1,000,000 由 UI 渲染检查与 core 工作簿快照共同执行。本轮没有源码/测试改动。当前仍不是完整 Excel 兼容或大表虚拟化。完整公式引擎/完整 Excel 属于 B4-02 按需扩展，不作为批次一门禁。
- 仍未证明的验收：大表/工作簿级性能、真实 XLSX 适配、许可边界、真实读屏、发布包和部署；完整公式引擎/完整 Excel 兼容只在 B4-02 产品选择后评估。
- 下一项可执行动作：本轮只读核对与单文件复跑完成，未发现需要新增红测的资源上限源码缺口；不再重复已有断言。后续仅按真实外部场景评估 B4-02，不把完整 Excel/大表虚拟化加入本批门禁。
- 外部依赖：可选 XLSX/工作簿许可、性能环境、发布授权。
- 状态：2026-10-22 在本工作区复跑单文件，pi 自测 122/122、主线程独立复核 122/122、exit `0`、duration 12.63s，两次分别记录、不合并；本轮没有源码/测试改动，source map 缺失警告不影响退出码，`git diff --check` 通过；未发现源码缺口；仍需外部验收。

### B1-04 回归与兼容

- 主线程最新复核（2026-10-23）：当前 dirty 工作区分别以独立进程运行 FilterBuilder `52/52`、JsonSchemaForm `61/61`、SpreadsheetView `122/122`，均 exit 0；pi 以同一当前工作区独立复跑三文件亦为 `52/52`、`61/61`、`122/122`，合计 `235/235`，三项为各自单文件，不合并计数，仍有既有 source-map 警告。消费者 `example check` 独立复核 0 errors / 3 warnings、exit 0；`build:example` 当前构建 exit 0，并保留 Svelte 3 warnings、动态导入提示及大 chunk warnings。下文“本轮未复跑”仅指此前 pi 修复回合，现已补主线程结果。仅解除定向回归与示例类型/构建门槛，不证明全仓兼容、registry 发布、真实服务、读屏或部署。
- 2026-10-23 分发审计补记：此前发现的源码/dist 不一致已通过 `bun run --cwd packages/ui build` 刷新；随后 `bun run build:packages` 的 12 个发布相关 workspace 包均 exit `0`。重建后 `@svadmin/ui` tarball 静态要求仍通过，记录为 `1023 tarball entries verified`，packed consumer 入口/类型导入、npm install、pnpm strict peer tree、Surface 两组兼容消费者和 packed doctor 阶段均通过。默认 `npmmirror` 因缺少 `@vibeunion/devtools-devframe@0.1.0` 曾返回 404；以 `npm_config_registry=https://registry.npmjs.org bun run pack:check` 重跑后 exit `0`。该结果证明 pack 门禁，不证明 registry 发布、生产部署或在线验收。详见 [enterprise-ui-pack-distribution-audit-20261023.md](../evidence/enterprise-ui-pack-distribution-audit-20261023.md)。

- 原始要求：保留现有入口；增加正反向测试；记录验证证据及未通过项。
- 直接证据：[enterprise-ui-correctness.md](enterprise-ui-correctness.md)、[ui-contract-type-recovery-20261021.md](../evidence/ui-contract-type-recovery-20261021.md)、[enterprise-consumer-build-20261022.md](../evidence/enterprise-consumer-build-20261022.md)、[enterprise-ui-plan.md](enterprise-ui-plan.md)。
- 证据覆盖边界：2026-10-22 follow-up 已记录 `DashboardWorkspace.svelte` 消费者门槛修复：前轮 `example check` 出现 1 个 `requestContext` 的 `exactOptionalPropertyTypes` error；改用 `@svadmin/core/options` 的 `definedOptions` 省略 `undefined` 后，又暴露出同调用点 `title` 的同类 error，一并按最小消费者兼容处理，未放宽 `DashboardView` Props。当前 `bun run --cwd example check` 退出 0（0 errors / 3 个既有 warning），`build:example` 退出 0，`git diff --check` 退出 0。当前 dirty 工作区的三文件定向测试由主线程与 pi 分别复核为 `52/52`、`61/61`、`122/122`，合计 `235/235`。工作区为 dirty，不能把 HEAD 或 untracked 文件当作内容身份或发布基线。
- 仍未证明的验收：全仓行为兼容（pack 检查不替代行为回归）、类型门槛之外的真实浏览器/Provider、registry 发布包和部署。
- 下一项可执行动作：保留官方 registry 复跑命令作为发布环境证据；后续进入真实 registry 发布、部署和在线验收，不重复本地 pack 检查。
- 外部依赖：发布授权；真实 Provider 不属于本条本地门槛。
- 状态：UI build、消费者 `example check`、`build:example` 与官方 registry 下完整 `pack:check` 已通过；registry 发布、真实 Provider/读屏、部署与在线验收仍未完成。

## 4. 批次二：基础组件与表单能力

### B2-01 NumberInput / MoneyInput / PercentInput

- 原始要求：精度、区域格式、空值与零、字段契约。
- 直接证据：[numeric-input-binding-20261021.md](../evidence/numeric-input-binding-20261021.md)、[numeric-input-cross-browser-20261022.md](../evidence/numeric-input-cross-browser-20261022.md)、[numeric-input-contract-20261023.md](../evidence/numeric-input-contract-20261023.md)、[numeric-input-locale-20261023.md](../evidence/numeric-input-locale-20261023.md)。
- 证据覆盖边界：父值回填、空值 `null`、零、金额原单位、百分比缩放和真实源码消费者三引擎两视口 12/12 已记录；精度展示、步进推导和 happy-dom 下 `Number.isFinite` 非有限文本防御分支已补 3 个用例。区域格式已收敛为显式 `locale` 契约：仅 `en-US`/`de-DE`/`zh-CN`，不传时保持原 `type="number"` 行为；集中实现 `Intl.NumberFormat` 展示与严格 locale 解析，真实浏览器三引擎两视口 30/30 覆盖键盘输入、文本插入、混合分隔符拒绝、失焦恢复、金额负数和百分比缩放。
- 仍未证明的验收：其他 locale、操作系统真实剪贴板粘贴、输入法组合输入、真实读屏、发布包和部署仍未证明；`Intl` 展示舍入遵循其默认策略，不新增写回舍入或银行家舍入。
- 下一项可执行动作：只在产品明确新增 locale 时扩集合，并为该 locale 补解析/浏览器/读屏矩阵；不把 `Intl` 支持的全部 locale 自动视为已验收。
- 外部依赖：屏幕阅读器、真实浏览器区域输入环境与剪贴板/输入法环境、发布授权。
- 状态：区域格式最小可实施契约已完成并通过 `numeric-format.test.ts` 30/30、`numeric-input-locale.test.svelte.ts` 20/20、`numeric-input.test.svelte.ts` 18/18，以及专属三引擎两视口浏览器 72/72；首次独立浏览器复核曾为 71/72，定位为外部 `NaN` 切换后旧草稿未清理，修复后最终 72/72。Playwright 文本填充/合成事件不等同 OS 剪贴板或真实 IME；读屏、发布和部署仍需外部验收。

### B2-02 DatePicker / DateRangePicker

- 最新主线程复核：独立执行 `bunx vitest run --config ./vitest.config.ts src/components/date-time-picker-binding.test.svelte.ts`，4/4 passed、exit 0、704ms；`git diff --check` exit 0。已读父值赋值/清空断言，确认日期及范围两端清空且无额外 onchange。本轮不重复新增测试，生产未改；其余禁用日期/快捷范围结果仅为既有证据引用，并未在本次复跑。

- 原始要求：日期/范围、禁用日期、快捷范围、键盘。
- 直接证据：[date-time-picker-binding-20261021.md](../evidence/date-time-picker-binding-20261021.md)、[date-time-picker-cross-browser-20261022.md](../evidence/date-time-picker-cross-browser-20261022.md)、[date-time-policy-browser-20261022.md](../evidence/date-time-policy-browser-20261022.md)。
- 证据覆盖边界：证据覆盖 civil/instant 绑定、禁用日期、逆序范围、快捷范围原子更新和三引擎两视口日期策略；控件仍是原生输入包装。自绘日历面板不是原始明确要求，不列为必需门禁。
- 仍未证明的验收：读屏、真实后端、当前新分发包和部署；全部区域/时区策略只按明确业务场景验证，不作为无界补 case 依据。
- 本轮只读核对（2026-10-23）：`date-time-picker-binding.test.svelte.ts` 的父级赋值/清空用例已覆盖四个公开入口“父值清空后控件清空且不触发 onchange”；`DateRangeInput` 的禁用日期与受限快捷范围已有定向单测，公开 `DatePicker`/`DateRangePicker` 的 `disabledDate`/preset 在 policy 浏览器证据中 30/30 覆盖。未发现明确源码契约缺口，本轮不重复增补用例，也未修改组件。
- 下一项可执行动作：不再重复补父值清空或禁用/快捷范围用例；自绘日历和全量时区矩阵不列入本批门禁。模块为 `packages/ui` DatePicker/DateRangePicker。
- 外部依赖：屏幕阅读器、真实时区/后端环境、发布授权。
- 状态：本轮定向单文件 4/4 与 `git diff --check` 通过；父值清空及禁用/快捷范围契约已由现有证据覆盖，不再作为待补缺口；读屏、真实后端、新分发包和部署仍需外部验收。

### B2-03 TimePicker / DateTimePicker

- 主线程最新复核（2026-10-23）：新增 DateTimePicker 逐段全部清空场景后，`playwright.date-time-keyboard.config.ts` 三引擎 desktop 独立运行 **24/24 passed**、exit 0、15.8s；与 pi 24/24、13.8s 分开记录。新增断言逐段真实按键清空 DateTimePicker 后 `null`、`badInput=false`、有效提交 `meetingAt=""`，独立 TimePicker 仍提交 `09:30`；无生产改动。B2-03 本地键盘/清空/禁用边界已覆盖，真实读屏、设备、后端与发布仍未验收。

- 主线程键盘专项最终复核：`playwright.date-time-keyboard.config.ts` 三引擎 desktop 21/21 passed、exit 0、12.3s，无 expected failure/skip；已检查 `DateTimeInput.svelte` 本轮生产改动全部撤回。实际覆盖 Tab/方向键、删除一个分段后重新填写并保留其他分段、TimePicker 部分清空阻止提交与全部分段清空后空值提交、disabled 跳过和 FormData 排除。此前把 Control+A/Backspace 当成全部清空的缺陷归因无效；不再采用旧 12/12 作为有效完成证据。完整 DateTimePicker 逐段全部清空、其他 locale/设备/读屏仍不由此证明。

- 主线程独立复核：审查修正后 `time-date-picker.test.svelte.ts` 单文件 3/3 passed、exit 0、612ms，`git diff --check` exit 0。新增用例只证明 disabled 属性透传与合成 input 回调抑制，未断言绑定草稿不变，不证明真实键盘。清空/跨日绑定单文件另有本轮主线程 4/4、exit 0、704ms，分别计数。

- 最新主线程复核（2026-10-23）：只读核对 `TimePicker`/`DateTimePicker` 源码与 tests/fixture；两者仅转发 `DateTimeInput` 的 `time`/`datetime` mode，没有自绘键盘或新 API 缺口。清空/跨日由 `date-time-picker-binding.test.svelte.ts` 覆盖（本轮 4/4 passed、exit 0、703ms）；补一条入口级 `disabled` 最小回归后 `time-date-picker.test.svelte.ts` 3/3 passed、exit 0、615ms；`git diff --check` exit 0。未改生产组件。独立键盘仍为浏览器原生输入，本轮未用 jsdom 合成键盘冒充验收，也未重跑或外推日期 policy 浏览器结果。
- 逐段全部清空补充（2026-10-23）：仅补 `DateTimePicker` 一条真实键盘场景，前置按钮 `focus()` 后 `Tab` 进入，6 轮 `Backspace`+`ArrowRight` 逐段清空；断言输入为空、绑定 `null`、`badInput=false`、`checkValidity()=true`，点击 Submit 后 `FormData` 为 `{"meetingTime":"09:30","meetingAt":""}`。三引擎 desktop **24 passed（8×3，含原有 7 条）**、exit 0，`git diff --check` exit 0，`DateTimeInput.svelte` 仍无 diff；无 `test.fail`/skip、未放宽关键断言、fixture 未改。该条只补充 DateTimePicker 逐段清空证据，**不表示 B2-03 整体完成**。
- 真实键盘专项（2026-10-23，已修正）：新增独立 `DateTimeKeyboardFixture`、`date-time-keyboard.spec.ts` 与专属 Chromium/WebKit/Firefox desktop 配置，使用真实 Tab 进入与真实键盘。上一轮 pi 在 `DateTimeInput` 新增 `clearKeyPending`/`handleKeydown`/`clearEmptyBadInput`/`onkeydown` 并临时切换 `input.type`，把 B2-03 标为“已修复”，记录 Chromium 4/4、三引擎 12/12；该结果已判定为 pi 初版伪通过——旧 spec 以 `Control+A Backspace` 假定一次清空，未覆盖“删除单个分段后补回”，掩盖了修复丢弃其他有效分段的回归。本轮已全部撤回该生产改动（`git diff` 对 `DateTimeInput.svelte` 为空，无临时 type 切换、无 `test.fail`/skip），并修正归因：原生分段输入的 `Control+A` 未必全选；单分段删除后原生值变空但其余分段仍保留，补回该分段可重建完整值；部分分段为空时 `badInput` 阻止提交，全部逐段清空后 `badInput` 消失并可提交空字符串（三引擎一致）。新契约含两条“删单分段再补回”保护场景（time 小时后补回得 `11:30`、datetime 月份后补回得 `2026-11-21T09:30`，其余分段保留、绑定/`onchange`/`FormData` 一致）。红测：临时恢复修复版后 Chromium 4 passed / 3 failed；绿测：仅撤销生产变更后 Chromium **7/7 passed**，三引擎 **21/21 passed**，exit 0，`git diff --check` exit 0。
- 原始要求：时间点、时区、跨日、输入与展示一致。
- 直接证据：[date-time-picker-b2-03-keyboard-20261023.md](../evidence/date-time-picker-b2-03-keyboard-20261023.md)、[date-time-picker-b2-03-readonly-20261023.md](../evidence/date-time-picker-b2-03-readonly-20261023.md)、[date-time-picker-binding-20261021.md](../evidence/date-time-picker-binding-20261021.md)、[date-time-picker-cross-browser-20261022.md](../evidence/date-time-picker-cross-browser-20261022.md)、[date-time-policy-browser-20261022.md](../evidence/date-time-policy-browser-20261022.md)。
- 证据覆盖边界：证据覆盖 civil/instant 表单序列化、清空、禁用入口、跨日本地/UTC 转换、DST gap/fold 选择策略、三引擎两视口 30/30，以及三引擎真实 Tab/分段修改/单分段删除后补回/TimePicker 与 DateTimePicker 逐段全部清空/禁用跳过；真实键盘专项未覆盖 instant、时区矩阵和自绘时间面板。
- 仍未证明的验收：读屏、真实后端、新分发包和部署；DST 与跨浏览器日期策略本轮仅引用既有证据，未复跑。
- 下一项可执行动作：无待授权的键盘清空修复（上一轮修复已撤回，生产源码保持原样）；若产品要求“只清部分分段也能提交空值”，需独立授权后另立契约。后续按发布流程决定是否复跑日期 policy、typecheck/build 与分发验证。模块为 `packages/ui` TimePicker/DateTimePicker/DateTimeInput。
- 外部依赖：屏幕阅读器、真实时区/后端环境、发布授权。
- 状态：本轮真实键盘专项 Chromium 7/7、三引擎 21/21（每引擎 7 条正常契约，无 expected failure、无 skip），diffcheck 通过；真实 Tab、segment 修改、单分段删除后补回、绑定/回调/`FormData` 一致、逐段清空原生边界与禁用跳过已验证；上一轮“已修复”已改为已撤回/修正归因；读屏、真实后端、新分发包和部署仍需外部验收。

### B2-04 RadioGroup / SegmentedControl

- 原始要求：选择与导航语义、键盘与禁用状态。
- 直接证据：[choice-binding-20261021.md](../evidence/choice-binding-20261021.md)、[radio-group-isolation-20261021.md](../evidence/radio-group-isolation-20261021.md)、[radio-group-browser-contract-20261022.md](../evidence/radio-group-browser-contract-20261022.md)、[radio-group-reset-20261022.md](../evidence/radio-group-reset-20261022.md)、[segmented-control-browser-contract-20261022.md](../evidence/segmented-control-browser-contract-20261022.md)、[segmented-control-keyboard-boundary-20261023.md](../evidence/segmented-control-keyboard-boundary-20261023.md)。
- 证据覆盖边界：证据覆盖实例 ID、未命名组 roving 导航、required/custom validity、原生表单 reset（命名/未命名、初始非空/null、取消 reset、共享表单实例隔离、reset 后同任务最后选择优先）、禁用恢复、RTL 和三引擎两视口矩阵；新增 SegmentedControl 的 Alt/Ctrl/Meta 组合键不被拦截、祖先 fieldset 禁用时用未选中 Board 验证真实指针不可绕过 `:disabled`，恢复后以真实 `ArrowRight` 回填；浏览器侧用真实 `page.keyboard.press` 验证 Control/Alt/Meta+ArrowDown 不改变焦点/值/计数，再以普通 ArrowRight 验证原行为。修饰键文档只限定“处理器不主动选择”，不承诺阻止浏览器原生组合键默认动作或不产生 click，组件未新增 onclick 过滤；keydown 不 preventDefault 与祖先 fieldset 下合成键盘事件守卫仍由单测直接证明，浏览器只证明真实修饰方向键不改变焦点/值/计数，以及禁用指针不可绕过和恢复后的真实键盘交互。读屏与真实发布未覆盖。主线程最终复核实际命令为 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.radio-group.config.ts --trace retain-on-failure --output output/playwright/radio-group-reset-review-20261022`，结果 105 passed、3 skipped、exit 0、1.1m，使用原始 30s 超时、单 worker、retries 0；3 skipped 为既有视口条件跳过，无失败。此前 pi 的完整运行实际为三次默认 30s 加一次 CLI 60s，各次均为 104 passed、3 skipped、1 failed，不是三次运行合计；失败发生在 firefox-narrow 的 `beforeEach` `page.goto`，对应用例未进入行为断言。Firefox 导航超时原因尚未确认，不能宣称基础设施或并行抖动已根治，也不能单凭本次通过宣称稳定性关闭。主线程独立单元复核在 `packages/ui` 执行 `bunx vitest run --config ./vitest.config.ts src/components/radio-group.test.svelte.ts`，结果 28/28、exit 0、duration 1.89s。SegmentedControl 键盘边界主线程已独立复核单文件 Vitest：12/12、exit 0、duration 2.20s，含 svelte2tsx source map 缺失警告但无退出失败；主线程随后独立执行正式浏览器命令 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.segmented-control.config.ts --trace retain-on-failure --output output/playwright/segmented-control-keyboard-review-20261023`，原始输出 `Running 78 tests using 1 worker`，正式结果 75 passed、3 skipped、exit 0、duration 52.2s，无失败；3 skipped 为桌面项目既有窄屏焦点条件跳过，未计为通过。主线程随后发送文档指令时因 shell 反引号误触发一次重复运行，其汇总 53.5s 属非计划重复运行，不计正式证据，也不与正式 52.2s 混写。pi 的 78 项运行 75 passed、3 skipped、exit 0、55.2s 与主线程正式 52.2s 分开记录、不合并。
- 仍未证明的验收：更广泛控件组合下的原生 reset、真实读屏、服务端授权、发布包消费和部署。
- 下一项可执行动作：SegmentedControl 键盘边界的单测与浏览器部分均已由主线程独立复核（12/12、exit 0、2.20s；浏览器 75 passed、3 skipped、exit 0、52.2s），可关闭该窄缺口；不再重复 RadioGroup reset 已闭环场景，也不重复同一浏览器矩阵。后续只在获得真实读屏、真实后端/RBAC 或发布授权时推进外部验收。模块为 `packages/ui` SegmentedControl。
- 外部依赖：屏幕阅读器、发布授权。
- 状态：RadioGroup 主线程最终复核专属 Playwright 105 passed、3 skipped、exit 0，主线程独立单元复核 28/28、exit 0、1.89s；SegmentedControl 键盘边界 pi 浏览器新增/修改场景 12/12、exit 0，完整专属配置 75 passed、3 skipped、exit 0、55.2s，pi 修复轮单文件 12/12（本轮未重跑），主线程独立单测 12/12、exit 0、2.20s，主线程独立浏览器 75 passed、3 skipped、exit 0、52.2s，单测与浏览器均已由待复核改为已复核；该窄缺口可关闭，但仍不等于读屏认证、真实后端/RBAC、发布包消费或部署验收；Firefox 导航超时根因未确认，稳定性未据此关闭；需外部验收。

### B2-05 异步 Select / MultiSelect / AutoComplete

- 原始要求：搜索取消、分页、虚拟化、选中回显。
- 直接证据：[combobox-keyboard-recovery-20261021.md](../evidence/combobox-keyboard-recovery-20261021.md)、[combobox-listbox-association-20261022.md](../evidence/combobox-listbox-association-20261022.md)、[combobox-search-dismissal-20261022.md](../evidence/combobox-search-dismissal-20261022.md)、[combobox-cross-browser-20261022.md](../evidence/combobox-cross-browser-20261022.md)、[combobox-multiselect-failure-20261023.md](../evidence/combobox-multiselect-failure-20261023.md)、[combobox-b2-05-cancel-virtual-20261023.md](../evidence/combobox-b2-05-cancel-virtual-20261023.md)。
- 证据覆盖边界：既有证据覆盖打开/关闭回焦、搜索 debounce 清理、分页累积、旧响应隔离、实例关联、多选已确认值在后续候选分页失败/重试期间的摘要保持。2026-10-23 增量补齐真实 `AbortSignal` 透传与同类旧请求中止、可选客户端超时、Combobox 200+ 行窗口化、公开 `AutoComplete` 单值入口；专属三引擎两视口浏览器矩阵覆盖快速搜索旧请求不覆盖新结果、超时恢复、分页 1200 候选滚动选中、本地 auth session 撤销后标签/候选清空及 AutoComplete 搜索回显。Provider 若忽略 signal，仍只由 session/scope 隔离拒绝迟到结果。
- 仍未证明的验收：真实 Provider/后端取消与超时、真实 RBAC/租户撤销、窗口化列表与 AutoComplete 读屏、发布包消费和部署。
- 下一项可执行动作：B2-05 本地子缺口已由 2026-10-23 增量关闭，新增证据见 `docs/evidence/combobox-b2-05-cancel-virtual-20261023.md`；主线程独立单测为 select-contract 77/77、Combobox 50/50、AutoComplete 15/15，色彩契约 4/4，专属 Playwright 78/78，diffcheck exit 0。后续只应在真实 Provider/RBAC/读屏或发布授权到位时推进外部验收，不重复同一浏览器矩阵。模块为 `packages/core` select-query 与 `packages/ui` Combobox/AutoComplete。
- 外部依赖：真实查询 Provider/后端取消能力、真实 RBAC/租户撤销、屏幕阅读器、发布授权。
- 状态：本地取消/超时/虚拟化/AutoComplete 子缺口已实现并由主线程独立验证；select-contract 77/77、Combobox 50/50、AutoComplete 15/15、专属 Playwright 78/78、色彩契约 4/4、diffcheck exit 0。真实 Provider、RBAC/租户撤销、读屏和发布仍未验收；浏览器中的 auth session reset 不等同 RBAC 撤权。

### B2-06 Tree / TreeSelect / Cascader

> **2026-10-27 产品范围决策已关闭**：TreeSelect 多选保留纯叶子值级联，父项用于
> 全选/取消和半选展示；单选允许父值，`onlyLeafSelectable` 控制父项只展开；
> Cascader 始终使用完整路径值，`changeOnSelect` 控制父路径是否提交。不新增
> `strict`、父子混合值模式或独立权限树模型。旧“产品待决策”记录保留为历史，
> 由 [B2-06 选择范围契约](./enterprise-b2-06-selection-scope-contract-20261027.md)
> 覆盖当前结论；B4 按需范围仍独立评估。真实 Provider、读屏、发布和部署仍未
> 验收，整体继续为 PARTIAL。

- 原始要求：异步树、半选、父子策略、完整键盘路径。
- 直接证据：[tree-select-keyboard-load-20261022.md](../evidence/tree-select-keyboard-load-20261022.md)、[tree-select-outside-focus-20261022.md](../evidence/tree-select-outside-focus-20261022.md)、[tree-select-leaf-only-20261022.md](../evidence/tree-select-leaf-only-20261022.md)、[cascader-async-loading-20261022.md](../evidence/cascader-async-loading-20261022.md)、[cascader-browser-followup-20261022.md](../evidence/cascader-browser-followup-20261022.md)、[tree-select-cascader-b2-06-cross-regression-20261023.md](../evidence/tree-select-cascader-b2-06-cross-regression-20261023.md)。
- 证据覆盖边界：证据记录 TreeSelect 键盘/搜索/外部聚焦/onlyLeaf 和 Cascader 异步加载/Retry 焦点/跨浏览器；onlyLeaf 的 retry→empty→disabled 三态路径已补组件级与专属浏览器证据，确认无生产行为缺口；共享加载失效的旧/新响应排列仍只有组件证据。
- 仍未证明的验收：真实 Provider 权限、产品未公开的严格/非严格父子策略、真实读屏、完整 retry/empty/disabled 交叉矩阵和发布。
- 2026-10-23 宿主绑定补记：新增真实 Svelte 宿主使用 `bind:options`，验证 TreeSelect 异步子节点替换后宿主观察到更新后的根数组；`tree-select.test.svelte.ts` 主线程独立复跑 **136/136**、exit `0`，`git diff --check` exit `0`。该结果关闭“绑定宿主传播缺少直接证据”的本地窄缺口，不改变完整半选/父子策略、真实 Provider/RBAC、读屏、交叉矩阵与发布边界。
- 同轮 Cascader 主线程独立复跑 `cascader.test.svelte.ts` **43/43**、exit `0`；未修改 Cascader 生产代码。该结果只确认当前异步/叶节点/键盘契约仍保持通过，不扩大为真实 Provider 或读屏验收。
- 2026-10-23 直接交叉回归补记：未改生产组件；TreeSelect 新增父/子切换与 `aria-checked="mixed"`、虚拟化未挂载后代/禁用分支、懒加载成功及失败重试保持 mixed 后显式子项选择三组场景；Cascader 新增异步失败/重试后禁用子项边界。详见 [tree-select-cascader-b2-06-cross-regression-20261023.md](../evidence/tree-select-cascader-b2-06-cross-regression-20261023.md)。该增量只证明当前公开 API 的本地直接行为，不引入 cascadeStrategy，也不扩大为真实 Provider、读屏、跨浏览器或发布验收。
- 下一项可执行动作：B2-06 的 onlyLeaf 三态和 `bind:options` 宿主传播已形成局部证据；不再重复同类测试，后续只在新的宿主/Provider 契约证据出现时推进。模块为 `packages/ui` TreeSelect/Cascader。
- 外部依赖：真实 Provider、屏幕阅读器、发布授权。
- 状态：本轮复核未发现 onlyLeaf retry/empty/disabled 生产缺口，未改 `TreeSelect.svelte`；此前宿主绑定阶段的 TreeSelect **136/136**、Cascader **43/43** 作为历史记录保留；当前主线程独立复跑单文件为 TreeSelect **140/140**、Cascader **44/44**，均 exit 0。专属浏览器 `-g "leaf-only"` 18/18、exit 0（新增三态场景 6/6，三引擎两视口），此前完整 TreeSelect 专属配置 96/96、exit 0。定向浏览器 18/18、exit 0、18.5s，diffcheck exit 0；未独立重跑完整 96 项配置。single 三态浏览器组合与真实 Provider/读屏/发布仍未验收。
- 2026-10-23 独立审计补记：当前工作区 TreeSelect 单文件复跑 **140/140**、Cascader 单文件 **44/44**，均 exit `0`；`git diff --check` exit `0`。未发现可独立于产品契约实施的新本地缺口；父项是否进入 `value`、strict/non-strict 级联、禁用节点和懒加载未完成态仍需产品确认。该计数仅更新最新本地回归证据，不覆盖真实 Provider、读屏、完整交叉矩阵或发布验收。

### B2-07 实体与关系选择器

- 原始要求：跨页选择、资源授权、租户切换隔离。
- 直接证据：[relation-picker-dismissal-20261021.md](../evidence/relation-picker-dismissal-20261021.md)、[relation-picker-search-mode-20261022.md](../evidence/relation-picker-search-mode-20261022.md)、[relation-picker-page-recovery-20261022.md](../evidence/relation-picker-page-recovery-20261022.md)、[relation-picker-cross-browser-20261022.md](../evidence/relation-picker-cross-browser-20261022.md)、[relation-picker-authorization-revocation-20261023.md](../evidence/relation-picker-authorization-revocation-20261023.md)。
- 证据覆盖边界：证据覆盖关闭清理、搜索模式切换、跨页失败重试、精确提交、三引擎两视口基础路径，以及授权拒绝后旧页记录/旧草稿/旧受控摘要清理、拒绝期间不发请求、恢复后从第 1 页重新读取；不证明真实资源授权、RBAC 策略或服务端查询一致性。
- 仍未证明的验收：真实权限拒绝与撤销延迟、服务端分页一致性、读屏、完整关系选择器能力和发布。
- 下一项可执行动作：B2-07 的授权拒绝清理窄用例已闭环，不重复添加同类用例；后续只在出现新的真实 Provider/RBAC 契约或宿主集成证据时再开窄项。模块为 `packages/ui` RelationPicker。
- 外部依赖：真实 RBAC/资源 Provider、屏幕阅读器、发布授权。
- 状态：本轮复核确认无生产缺口，未改 `RelationPicker.svelte`；pi 组件单文件 32/32、exit 0，专属浏览器完整配置 30/30、exit 0（新增拒绝场景 6/6，三引擎两视口），`git diff --check` exit 0。主线程独立复核同一单文件 32/32、exit 0、11.96s，定向拒绝场景 6/6、exit 0、8.7s，`git diff --check` exit 0；主线程未重复完整 30 项矩阵。真实 Provider/授权、撤销延迟、读屏、发布与部署仍未验收。

### B2-08 Upload / Dropzone / FileList

- 2026-10-26 浏览器数据库持久化续接：主线程独立复跑同一 OrbStack runner
  **13/13，exit 0，零 skip/todo**。新增第 13 项在三引擎验证 AutoForm 上传后创建
  真实 PostgreSQL 行、reload 后回显并更新、另一租户浏览器读取为空；独立会话
  核对持久化引用与真实 Storage 对象 id/字节，精确临时资源清理为空。见
  [AutoForm 持久化验收](../evidence/enterprise-autoform-postgrest-record-20261026.md)。
  这是独立本地测试资源，不是生产业务模型；上传与保存不具备跨服务事务保证。
  下条 11/11 的捕获 JSON 证据保留原范围，不回写为数据库持久化证据。
- 2026-10-26 AutoForm 真实服务续接：pi 实施后由主线程审查修复测试页覆盖布局与
  Vite 失败清理，再独立复跑 **11/11，exit 0，零 skip/todo**。新增第 11 项在
  Chromium、Firefox、WebKit 内验证真实 AutoForm/FileUploadField 上传、精确
  `attachment.uploadId` 提交、登出失败时 Save 禁用及重登重试保存；owner 与
  service role 独立核对对象字节和 id，精确项目资源清理为空。见
  [AutoForm 服务验收](../evidence/enterprise-autoform-upload-browser-20261026.md)。
  提交仅由夹具捕获 JSON，不证明业务数据库持久化、生产 RBAC、读屏或发布；
  下方 9/9、10/10 与受控上传记录继续保留各自历史范围。
- 2026-10-26 真实组件浏览器续接：主线程独立复跑同一 OrbStack runner 最终
  **10/10，exit 0，零 skip/todo**；其中 1 项测试包含 Chromium、Firefox、WebKit
  三引擎真实 FileUpload 登录上传、登出失败、重新登录重试与非法类型拒绝流程，
  不计为 30 项。owner/service role 独立读回对象，失败后对象不存在，最终对象
  名单及 id 与 UI 引用一致；精确 project label 下容器/network/volume 清理为空。
  见 [浏览器服务验收](../evidence/enterprise-upload-browser-20261026.md)。该增量关闭
  所列真实组件本地链路子项；使用同源测试代理与小文件，不证明部署 CORS、浏览器
  在途取消、大文件、AutoForm/FileUploadField 服务联调、生产策略、读屏或发布。
- 2026-10-26 本地真实服务增量：隔离 OrbStack 中的 GoTrue 会话驱动 Storage 上传、
  所有者访问、越权拒绝、签名读取、刷新/登出后上传边界及受控在途取消，主线程独立
  runner 最终 **9/9，exit 0，零 skip**。取消用例的信号移除反例由 pi 验证失败，
  恢复后通过；主线程另行复跑最终实现。详见
  [联合验收](../evidence/enterprise-auth-storage-acceptance-20261026.md) 与
  [在途取消](../evidence/enterprise-storage-cancellation-20261026.md)。这只关闭所列本地
  服务子项，不证明生产租户策略、通用原子回滚、底层临时文件清理或真实组件端到端链路。
  下列旧记录保留各自当时的证据边界，不再将“完全没有真实 Storage 证据”作为当前阻塞。
- 2026-10-24 AutoForm 集成增量：托管上传只写入 JSON 引用，保留 url/uploadId；
  支持回显、移除、重试、并发队列聚合、离开保护与 reset/作用域隔离。
  主线程逐文件通过 11/11、6/6、23/23、22/22、11/11、101/101，
  上传浏览器三引擎两视口 18/18。证据见
  [autoform-upload-integration-20261024.md](../evidence/autoform-upload-integration-20261024.md)。
  真实上传服务及全仓类型门禁未验收，不以此关闭原始整项。
- 原始要求：会话、进度、取消、重试、预览。
- 直接证据：[file-upload-native-contract-20261021.md](../evidence/file-upload-native-contract-20261021.md)、[import-dropzone-cross-browser-20261022.md](../evidence/import-dropzone-cross-browser-20261022.md)、[file-list-cross-browser-20261022.md](../evidence/file-list-cross-browser-20261022.md)、[file-upload-failed-cleanup-20261022.md](../evidence/file-upload-failed-cleanup-20261022.md)、[file-list-preview-boundary-20261023.md](../evidence/file-list-preview-boundary-20261023.md)。
- 证据覆盖边界：证据覆盖原生表单一致、非法文件、失败会话回收、行级下载/预览/移除、跨浏览器和迟到回执；不覆盖真实存储取消/清理幂等。预览渲染不在 FileList 内：组件只等待宿主 `onpreview` 回调，宿主预览器渲染失败只能通过该 Promise 拒绝进入行级恢复，本轮不以回调拒绝冒充真实渲染失败，也不新增预览引擎。
- 仍未证明的验收：真实 multipart/对象存储、服务端清理、审计、权限/租户隔离、读屏、发布包和部署；真实预览渲染器及其在 `onpreview` resolve 后的异步失败反馈仍由宿主负责。
- 下一项可执行动作：本轮只读核对确认预览渲染属宿主边界，`file-list.test.svelte.ts` 与 `file-list.spec.ts` 已覆盖 `onpreview` 拒绝下的行级恢复、同行互斥和跨行隔离，无生产缺口，不重复新增同类测试；后续只在宿主暴露真实预览器失败契约时再开窄项。模块为 `packages/ui` FileList。
- 外部依赖：真实存储/签名 URL、宿主预览器、屏幕阅读器、发布授权。
- 状态：本轮只读核对与既有回归完成，未改组件/测试/fixture。pi 单文件 26/26、原始 exit 0、6.02s；专属浏览器 Preview 场景 6/6、原始 exit 0、8.0s；`git diff --check` exit 0。主线程独立复核单文件 26/26、exit 0、6.16s，Preview 定向浏览器 6/6、exit 0、8.7s，`git diff --check` exit 0；与 pi 结果分开记录。真实存储/预览渲染器/读屏/发布仍未验收。

### B2-09 FormField / ErrorSummary

- 文件动作键盘续接：真实 AutoForm 校验错误、真实按键遍历取消/重试/移除、
  反馈描述解析、禁止在途提交、成功清错与精确载荷均已由主线程新增场景
  **12/12**（三引擎两视口，23.5s）验证，目标 ESLint/diff 通过。
  见 `../evidence/b2-09-file-action-browser-20261024.md`；不等同读屏或服务验收。
- 2026-10-24 文件动作反馈续接：队列取消/重试/移除及既有附件移除透传所属字段
  `aria-describedby`/`aria-invalid`。主线程真实 FieldRenderer 双实例单文件
  **13/13**（9.83s），目标 ESLint/diff 通过。只证明活 IDREF、实例隔离与动态
  清理，不证明键盘焦点、真实读屏或服务端错误映射；未重建分发包。
  见 `../evidence/b2-09-composite-followup-20261024.md`。
- 2026-10-26 完整 AutoForm 复验：主线程独立执行专属配置 **102/102 passed**、
  exit `0`、2.2m，无 skip；Chromium/WebKit/Firefox 的 desktop/narrow 六个项目
  各 17/17。覆盖 ArrayField、DateRangeInput、TreeSelect、Cascader、Transfer、
  RichText、Tags、Multiselect、Images、错误摘要以及 provider/scope 切换后的迟到
  响应与 dirty 草稿隔离。该结果收口本地跨浏览器矩阵，不替代真实读屏、上传服务、
  服务端错误映射、Provider/RBAC 或发布验收。

- 2026-10-24 空数组 Add 入口增量：pi 最小修复 `ArrayField` 的 Add 按钮帮助/错误
  关联，复用既有 `describedby`/`invalid`，不新增行级错误协议。主线程审查并独立
  复跑 `array-field-feedback.test.svelte.ts` **24/24**、exit 0、7.88s；覆盖真实
  AutoForm 双实例保存失败焦点、活节点 IDREF 顺序/隔离、单实例新增行清错及另一
  实例保持错误。定向 ESLint、diff 检查通过。浏览器续接复用既有 array 用例，
  pi 验证 Chromium desktop；主线程增强断言并独立复跑三引擎两视口 **6/6**、
  exit `0`、15.4s，直接验证 Add 描述、活 IDREF 无交集、修正后仅保留帮助
  及另一实例保持错误。真实读屏仍未验收。
- 原始要求：帮助/错误关联、焦点、统一布局。
- 直接证据：[auto-form-error-summary-browser-20261022.md](../evidence/auto-form-error-summary-browser-20261022.md)、[auto-form-compound-focus-20261021.md](../evidence/auto-form-compound-focus-20261021.md)、[form-error-summary-contract-20261021.md](../evidence/form-error-summary-contract-20261021.md)、[form-field-description-20261021.md](../evidence/form-field-description-20261021.md)、[compound-field-native-contract-20261021.md](../evidence/compound-field-native-contract-20261021.md)、[form-field-generated-id-description-error-20261023.md](../evidence/form-field-generated-id-description-error-20261023.md)。
- 证据覆盖边界：证据覆盖顶层首错顺序、实例 ID、帮助/错误关联、摘要跳转、复合字段原生提交，以及无宿主显式 `id` 时 `tags`/`rate`/`multiselect`/`images`/`array` 的说明+错误关联：本轮已改为真实宿主错误节点 + 同页两个同业务 key、不传显式 `id` 的实例，逐 IDREF 解析到活节点并断言不串实例，同时覆盖说明更新、先移除错误再移除说明的关联与 invalid 收敛（`multiselect` 同时覆盖分组与 checkbox）；`ArrayField` 行级分组、`Transfer`/`TreeSelect`/`Cascader`/`DateRangeInput`/富文本/文件上传的同类组合和真实读屏仍未覆盖。
- 仍未证明的验收：行级/子字段错误路径模型、真实读屏、真实服务错误映射、Provider/RBAC 和发布。
- 下一项可执行动作：不重复当前 102/102 矩阵；后续仅在出现新的产品错误路径契约、真实服务或读屏验收输入时推进；模块为 `packages/ui` FieldRenderer/ErrorSummary。
- 外部依赖：屏幕阅读器、发布授权。
- 状态：本轮只读核对确认生产契约正确，未改组件；orchestration 为 managed、pi 唯一 writer、主线程独立审查。首版参数化用例只比较 `aria-describedby` 字符串、`errorId` 指向不存在节点，主线程复核 22/22（6.65s），但未验证同业务 key 多实例隔离与动态清除，故不充分。修正版 22/22、原始 exit code 0、6.54s，主线程独立复核 22/22、exit 0、6.55s，`git diff --check` exit 0。首轮 `array` 用例曾因选择器误命中行级分组失败 1 项，修正选择器后通过，未认定生产缺陷。真实读屏、完整 Tab 顺序、跨浏览器完整矩阵、发布与部署仍未验收。
- 2026-10-23 ArrayField 独立复核：`array-field-feedback.test.svelte.ts` **23/23 passed**、exit `0`，`git diff --check` exit `0`。现有测试覆盖行身份/重排、嵌套数组原生提交、禁用态、动态增删和顶层反馈关联；未发现可不依赖错误数据模型或读屏工具而安全新增的生产契约。行级错误帮助链、完整复合控件矩阵、真实读屏与发布仍未验收。
- 2026-10-24 DateRangeInput presets 反馈关联修复：`DateRangeInput.svelte` 的 presets 原生 `select` 补齐 `aria-describedby` 与 `aria-invalid`，避免同一字段的预设选择器缺失帮助/错误上下文；新增 FieldRenderer 双实例真实 IDREF、动态清理、值保持和 preset 回调回归。pi 报告单文件 48/48；主线程独立复跑最终 `auto-form-accessibility.test.svelte.ts` **48/48**、exit `0`、9.22s；本轮收尾再次复跑 **48/48**、exit `0`、10.30s。随后主线程重建 `packages/ui`，源码与 `dist/components/DateRangeInput.svelte` 逐字节一致；`example` check 为 0 errors / 3 个既有 warning，生产构建 exit `0`。中间 `date-time-input` 23/23 不对应最终测试改动，不列为最终验收。该窄修复不改变焦点策略、required 或日期值语义；完整 AutoForm 错误摘要聚焦、真实读屏、其余复合控件矩阵和 registry 发布仍未验收。本次未重跑 pack，历史 pack 不覆盖本次增量。

- 2026-10-24 TreeSelect/Cascader 本地反馈增量：pi 执行、主线程审查，仅修改 `hierarchical-field-feedback.test.svelte.ts`。覆盖真实宿主错误节点、双实例 IDREF 隔离、清理 A 不影响 B、popup 引用和选择回调；主线程最终单文件 **24/24**、exit `0`、7.04s，ESLint 通过。未修改生产组件，不证明 AutoForm 服务端错误映射、完整 Tab、真实读屏或跨浏览器完整矩阵；其余复合控件与发布仍未验收。

- 2026-10-24 Transfer 反馈增量：pi 修改 `transfer-field-feedback.test.svelte.ts`，主线程审查并独立复跑 **27/27**、exit `0`、6.98s；ESLint 与 diff 检查通过。真实宿主节点覆盖双实例 description/error IDREF 隔离、清理 A 不影响 B、data-invalid 收敛与无 onchange。未改生产组件，不证明读屏、完整 Tab、服务端错误映射或发布。
- 2026-10-24 FileUpload 反馈增量：pi 修改 `file-upload-field-feedback.test.svelte.ts`，主线程审查并独立复跑 **11/11**、exit `0`、7.12s；ESLint 与 `git diff --check` 通过。真实宿主节点覆盖两个 file 实例的原生 input/dropzone 双入口 IDREF 解析、实例隔离、A 清理不影响 B 及 invalid 状态收敛。未改生产组件，不证明真实上传服务、读屏、完整 Tab、服务端错误映射或发布。
- 2026-10-24 RichText 反馈增量：pi 修改 `richtext-field-contract.test.svelte.ts`，主线程独立复跑 **73/73**、exit `0`、11.34s，`git diff --check` 通过。覆盖两个实际编辑区的 description/error IDREF 解析与隔离、`aria-invalid`/`aria-required`/`aria-multiline` 和清理 A 不影响 B。该文件原有 `t` 导入的 ESLint 限制仍存在，本次未新增 lint 错误；未改生产组件，不证明真实编辑器/上传服务、读屏、完整 Tab 或发布验收。
- 2026-10-24 DateRangeInput 浏览器增量：pi 修改既有 enterprise fixture 三个测试文件，主线程独立复跑 `--grep "AutoForm daterange"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、11.0s。覆盖 create 两实例首错聚焦 presets、摘要反向/正向 Tab、Enter 返回 presets、preset→start 真实 Tab、同表单活 IDREF、跨实例隔离、精确 payload 与清错后帮助保留。未假设原生 date 分段顺序；edit、时区/DST、禁用日期、真实读屏、服务端错误映射、发布和部署仍未验收。
- 2026-10-24 TreeSelect 浏览器增量：pi 修改既有 enterprise fixture 三个测试文件，主线程独立复跑 `--grep "AutoForm tree-select"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、14.4s。覆盖 create 两实例首错 trigger 聚焦、摘要反向/正向 Tab、Enter/Escape/ArrowDown/Enter 真实键盘路径、popup `aria-controls`/`aria-labelledby`、活 IDREF 与隔离、精确 payload 和第二实例保留 invalid。trigger 既有 invalid 语义为 `data-invalid`；未改生产组件，不证明真实读屏、Provider、完整策略矩阵、发布和部署。
- 2026-10-24 Transfer 浏览器增量：pi 修改既有 enterprise fixture 三个测试文件，主线程独立复跑 `--grep "AutoForm transfer"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.2s。覆盖两实例首个 checkbox 聚焦、摘要反向/正向 Tab、Enter 返回、真实 label/help/error IDREF、Space 选择、Tab/Enter 转移、精确 payload、帮助保留和第二实例 invalid 隔离。未改生产组件，不证明读屏、完整 Transfer 策略、Provider、发布和部署。
- 2026-10-24 Cascader 浏览器增量：pi 修改既有 enterprise fixture 三个测试文件，主线程独立复跑 `--grep "AutoForm cascader"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.4s。覆盖两实例首错 trigger 聚焦、摘要正反向 Tab、Enter/Escape/ArrowDown/Enter 真实键盘路径、popup 引用、活 IDREF 与隔离、精确 path payload、帮助保留和第二实例 invalid。未改生产组件，不证明读屏、父子策略全矩阵、edit/懒加载、Provider、发布和部署。
- 2026-10-24 RichText AutoForm 浏览器增量：pi 修改既有 enterprise fixture 三个测试文件，主线程独立复跑 `--grep "AutoForm richtext"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、24.9s。覆盖首错正文 `contenteditable` 聚焦、同表单工具栏真实反向/正向键盘遍历及互逆序、摘要 Enter 返回正文、双实例活 IDREF 隔离、清错后帮助保留和精确 HTML payload；测试主动断言无 Tiptap warning。未证明真实读屏、完整扩展策略、Provider、上传、发布或部署。
- 2026-10-24 AutoForm 富文本焦点边界修复：`AutoForm.svelte` 仅对默认渲染顶层 `richtext` 优先正文；数组后置 richtext、自定义 renderer 与不可用正文均保持/回退原 DOM 顺序。主线程独立复跑 `auto-form-compound-focus.test.svelte.ts` **21/21**、exit `0`、7.78s；`packages/ui` build exit `0`，仅有既有 `import.meta.env` 打包提示。未因此扩大整体复合控件、读屏、Provider 或发布结论。
- 2026-10-24 RichText 扩展与依赖修复：`StarterKit` 内置 `link`/`underline` 已关闭，新增真实 ProseMirror transaction 回归；编辑器扩展单测 **7/7**、构建、严格定向类型检查和 ESLint 通过。根 override 与 `bun.lock` 的 `prosemirror-model` 从 `1.25.11` 升至 `1.25.12`，冻结安装及单一解析入口验证通过；未改其它业务文件，未因此扩大读屏、Provider、上传或发布结论。
- 2026-10-24 tags AutoForm 浏览器增量：pi 仅扩展既有 enterprise fixture 三个测试文件，未改生产代码；主线程独立复跑 `--grep "AutoForm tags"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、13.1s。覆盖草稿输入框首错聚焦、摘要反向/正向 Tab 与 Enter 返回、help/error 活 IDREF 和跨实例隔离、`alpha`/`beta` Enter 生成 `tags[]`、精确 payload、第一份清错第二份保持 invalid、`pageerror` 为空。全文件 `browser.spec.ts` lint 仍有旧区域 4 个 non-null assertion 错误，不归因本轮且不声称全文件通过；窄视口不是移动端/视觉验收，不证明读屏、真实 Provider、RBAC、发布或部署。
- 2026-10-24 multiselect AutoForm 浏览器增量：仅追加既有 `browser.spec.ts` 末尾，未改生产代码，fixture/config 的 multiselect 分支已存在；主线程独立复跑 `--grep "AutoForm multiselect"`，Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.2s。覆盖双实例 Labels group/Alpha、Beta、Disabled 三 checkbox、首错聚焦 Alpha、Disabled 保持 disabled 未选、组与 checkbox 的 help/error 活 IDREF 同表单解析与跨实例隔离、摘要正反向 Tab/Enter、Space 选择 Alpha、单一 `labels[]=alpha`、精确 JSON payload、第一份清错提交而第二份保持 invalid、`pageerror` 为空。全文件 `browser.spec.ts` lint 仍有旧区域 4 个 non-null assertion 错误，不归因本场景且不声称全文件通过；窄视口不是移动端/视觉验收，不证明读屏、真实 Provider、RBAC、发布或部署。
- 2026-10-24 images AutoForm 浏览器增量：pi 在扩展既有 enterprise fixture 三个测试文件的同时，补充 `FieldRenderer.svelte` 最小生产修复，为 images 的 add/update/remove 增加 `disabled` 守卫，并补齐 Add image、Remove image 与 URL input 的 help/error `aria-describedby` 及 `aria-invalid` 关联；主线程独立复跑 `field-renderer-advanced.test.svelte.ts` **24/24**、exit `0`，定向浏览器 `--grep "AutoForm images"` 为 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、13.6s。覆盖双实例空数组首错聚焦真实 `Add image`、摘要实际文案 `Images: Invalid format` 的正反向 Tab 与 Enter 返回、URL 输入与 `Add image`/`Remove image`、IDREF 不得为空且须解析到本表单活节点的双实例隔离、错误/说明动态清理、禁用态无 `onchange` 且恢复后 add/update/remove 回调、隐藏 `images[]` 与精确 payload、第一份清错第二份保持 invalid、`pageerror` 为空。旧 `browser.spec.ts` 仍有 4 个既有 non-null assertion lint 错误（旧区域，不归因本场景），不声称全文件 lint 通过；窄视口不是移动端/视觉验收，不证明真实图片上传/存储、Provider、RBAC、真实读屏、发布或部署。

### B2-10 表单引擎统一

- 当前主线程浏览器复核（2026-10-24）：`playwright.form-reset.config.ts` 已扩展为 Chromium/WebKit/Firefox × desktop/narrow，保留 5 个既有场景并新增 1 个关闭保护场景，共 **36 cases**；主线程独立运行 **36/36 passed、exit 0、27.5s**，pi 前一轮 36/36、27.8s 分开记录、不合并计数。新增场景以真实 dirty 输入打开公开 `alertdialog`，再通过明确 test-only DOM event 调用真实 `bind:this.reset()`（不 force click、不读 Svelte 内部），断言弹窗关闭、基线与描述恢复、旧导航 0、无 write/success；再次 dirty 后 Confirm 仅新导航 1、旧仍 0，并继续可编辑、`pageerror` 为空。旧/新导航独立计数。fixture 按钮不是产品按钮；narrow 只是既有布局回归，不是新增视觉/移动端验收；仍不证明真实服务、RBAC、读屏或发布。
- 历史主线程浏览器复核（Chromium 两视口，保留为历史，不再作为当前跨引擎结论）：`playwright.form-reset.config.ts` 专属单文件 10/10 passed、exit 0、6.0s，diffcheck exit 0；与 pi 10/10、9.8s 独立记录。覆盖 Chromium desktop/narrow 的真实 AutoForm/StepsForm 宿主公共 reset 消费、基线与步骤恢复、校验清除、只读/拒绝可见状态保持，无写入/导航/成功回调。fixture 按钮不是产品按钮；不证明内部状态完全未变、在途响应隔离、Firefox/WebKit、真实后端或读屏。

- 原始要求：AutoForm、分步、弹窗、抽屉、动态列表共享状态与校验。
- 直接证据：[auto-form-error-summary-browser-20261022.md](../evidence/auto-form-error-summary-browser-20261022.md)、[steps-form-array-contract-20261022.md](../evidence/steps-form-array-contract-20261022.md)、[steps-form-error-focus-20261022.md](../evidence/steps-form-error-focus-20261022.md)、[steps-form-cancel-confirmation-20261022.md](../evidence/steps-form-cancel-confirmation-20261022.md)、[nested-array-native-contract-20261021.md](../evidence/nested-array-native-contract-20261021.md)、[form-engine-reset-lifecycle-20261023.md](../evidence/form-engine-reset-lifecycle-20261023.md)。
- 证据覆盖边界：证据覆盖 AutoForm create/edit 恢复、StepsForm 数组/草稿/首错/取消、动态列表原生 JSON，以及 AutoForm/StepsForm 显式 `reset()` 公共 UI 入口：未授权和 AutoForm 只读 no-op、reset 退休在途回执、旧成功/失败不污染 reset 后草稿、旧回执不覆盖新提交、旧回执不触发导航/业务回调。新增 StepsForm 真实消费者三引擎两视口提交生命周期证据：两步成功精确写入、同步/异步失败保留草稿并重试、pending 防重复与宿主替换旧回执隔离。Core 明确不取消已派发 HTTP 请求，旧写仍可能完成审计、live 发布和查询失效。QuickEditDrawer 普通关闭回执隔离的首版尝试已撤回，不能作为证据。
- 仍未证明的验收：真实后端取消/回滚与 Provider 幂等、完整 Tab/读屏、分发包和部署仍未证明；ModalForm/DrawerForm/QuickEdit/StepsForm 浏览器均为受控宿主或 Provider。
- 下一项可执行动作：转入真实 Provider/RBAC/读屏或发布验收；不再重复本地受控表单生命周期矩阵。模块为 `packages/ui` AutoForm/QuickEditDrawer。
- 外部依赖：真实 Provider、屏幕阅读器、发布授权。
- 状态：QuickEditDrawer 首版 3/3 因改变既有关闭策略被撤回，不计最终结果。返修恢复 AutoForm 原策略，最终单文件 pi 4/4、主线程独立 4/4；通用 ModalForm/DrawerForm 单文件 pi 与主线程均 30/30，专属浏览器均 36/36；StepsForm 专属浏览器均 36/36；QuickEditDrawer 专属三引擎两视口浏览器 pi 与主线程均 18/18，主线程 29.5s，目标 diffcheck exit 0。浏览器均为受控宿主/provider，不证明真实后端、读屏、发布和部署。
- 2026-10-23 本地增量补记：ModalForm/DrawerForm 的提交表单统一暴露 `aria-busy`，覆盖本地异步提交与外部 `isSubmitting`，并保留错误脱敏、关闭保护和旧回执隔离。主线程独立复跑直接单测 **32/32 passed**、exit `0`，`git diff --check` exit `0`；该增量只闭环本地无障碍状态语义，不替代真实后端取消/幂等、读屏、分发包或部署验收。

### B2-11 完整 Schema 表单

- 原始要求：嵌套、数组、条件与外部引用的受控适配。
- 直接证据：[schema-form-b2-11-browser-unsupported-20261023.md](../evidence/schema-form-b2-11-browser-unsupported-20261023.md)、[schema-form-b2-11-boundary-audit-20261023.md](../evidence/schema-form-b2-11-boundary-audit-20261023.md)、[schema-form-unsupported-schema-20261022.md](../evidence/schema-form-unsupported-schema-20261022.md)、[schema-form-description-association-20261022.md](../evidence/schema-form-description-association-20261022.md)、[schema-form-hidden-parse-errors-20261022.md](../evidence/schema-form-hidden-parse-errors-20261022.md)、[enterprise-ui-correctness.md](enterprise-ui-correctness.md)、[enterprise-ui-reconciliation.md](../architecture/enterprise-ui-reconciliation.md)。
- 证据覆盖边界：证据覆盖受限递归 object/array/scalar、条件隐藏、数组行错误、浏览器条件路径，以及 `$ref`/`oneOf`/外部引用/未知关键字的显式拒绝（单文件 61/61，主线程独立复核通过）。2026-10-23 新增真实浏览器本地证据：四类 unsupported schema 在 chromium/webkit/firefox × desktop/narrow 下均显示表单级 alert、零可编辑字段、提交禁用；手动 `SubmitEvent` 与 `requestSubmit()` 均无业务回调；`external-ref` 经 `page.route` 计数为 0，未访问远端（24/24，后续已由主线程独立复核）。显式拒绝只闭环安全边界，不替代 B2-11 的受控引用适配；明确不是完整 JSON Schema，也没有实现引用解析。问题路径来自内部模块 `readRecursiveSchemaForm(...).issues`，不是公开组件 API；UI 只显示表单级通用错误。
- 仍未证明的验收：不支持关键字的读屏表现、服务端 TypeBox/授权、完整 Schema 能力、受控引用适配、新分发包和部署。
- 下一项可执行动作：2026-10-23 已完成只读边界审计（`schema-form-b2-11-boundary-audit-20261023.md`）：仓库无 `$ref`/`oneOf`/外部引用的可执行产品契约（解析作用域、加载允许列表/超时/鉴权/SSRF 策略、分支选择 UI、公开错误 API 均缺失），当前受限子集无发现真实实现错误，故不改生产并保持显式拒绝。后续受控引用适配需产品/安全侧先给出契约；浏览器拒绝路径已有本地证据（`schema-form-b2-11-browser-unsupported-20261023.md`，24/24）并已由主线程独立复核，读屏复核仍为外部验证。
- 外部依赖：服务端 Schema/授权、屏幕阅读器、发布授权。
- 主线程复核更新：上述浏览器“待复核”状态已更新为已复核，24/24、exit 0、23.2s；Schema 单文件独立复跑 61/61、exit 0、10.75s，diffcheck exit 0。网络断言仅覆盖 fixture 指定域名及测试观察窗口，不代表网络安全认证。
- 2026-10-23 主线程再次复跑：`playwright.schema-unsupported.config.ts` 三引擎双视口 **24/24 passed**、exit `0`、26.2s、单 worker；四类不支持 Schema 均保持零业务回调和提交关闭。该结果只强化显式拒绝安全边界，不改变受控引用适配仍需产品/安全契约的结论。
- 最新本线程复核（2026-10-23）：从 `scripts/fixtures/enterprise-ui` 目录独立运行 `bunx playwright test --config playwright.schema-unsupported.config.ts --reporter=list`，**24/24 passed、exit 0、25.5s**。四类不支持 Schema 在三引擎两视口下均保持 fail-closed；该结果不改变受控 fixture、真实 Schema 服务、读屏和发布边界。
- 状态：本地单文件与浏览器拒绝路径均已独立复核；受控引用适配仍未实现，需产品/安全契约；真实读屏、服务端授权与发布仍未验收，不能以拒绝用例关闭完整 B2-11。

## 5. 批次三：业务闭环能力

### B3-01 资源数据工作台

- 2026-10-26 真实工作台服务流程续接：pi 实施、主线程审查修正并独立复验最终版本，
  同一 OrbStack runner **14/14，exit 0，零 skip/todo**。第 14 项在三引擎使用真实
  `ResourceOperationsPage → AutoTable → QuickEditDrawer → AutoForm`，验证搜索/稳定
  分页/选择/详情、PostgreSQL 约束拒绝后保留草稿、修正保存与列表刷新，并核对查询和
  选择保持、独立会话持久化读回及 B 租户空列表。完整请求/响应计数、解析错误收敛、
  失败/空态稳定帧与精确临时资源清理均通过。见
  [工作台真实服务验收](../evidence/enterprise-resource-workspace-service-20261026.md)。
  关闭的是本地测试资源服务流程，不是生产 RBAC、字段权限、即时撤权、读屏或发布。
  Toast 覆盖抽屉标题、禁止创建时空态仍建议创建曾另记待复核界面问题；旧 13/13 与
  受控 Provider 历史证据保持各自边界，不重复计数。
- 2026-10-27 界面观察收口：AutoTable 权限感知空态直接回归 63/63、筛选空态所在
  文件 11/11、Toast 生命周期 8/8 已独立通过。Toast 默认错误链新增三引擎两视口
  几何验收，主线程独立 **30/30、exit 0、1.4m**，证明当前短表单的通知与标题、
  关闭、Save 不相交，关闭后恢复右上；无自定义通知 provider 或延长默认时长。
  见 [Toast 几何证据](../evidence/enterprise-toast-drawer-geometry-20261026.md)。
  该结果不外推多通知/长表单/软键盘/读屏，整体目标保持 PARTIAL。
- 2026-10-26 浏览器 AutoForm 到真实数据库续接：pi 实施、主线程审查修正后独立
  复跑同一 runner **13/13，exit 0，零 skip/todo**；第 13 项覆盖三引擎真实登录、
  上传、创建、重新打开及真正 reload 回显、编辑保存和 B 租户真实 GET 空结果。
  Node 独立会话读回 title/tenant/attachment，并核对 Storage 对象 id 与文件字节；
  定向 TS/ESLint/Svelte/diff 通过，9 张桌面截图已检查，精确项目资源清理为空。
  见 [AutoForm 持久化验收](../evidence/enterprise-autoform-postgrest-record-20261026.md)。
  本次关闭的是本地测试资源表单持久化子项，不证明生产 RBAC、整个工作台查询/选择/
  详情链路、跨服务事务、移动端、读屏或发布；下方 12/12 的 Node 服务证据保留。
- 2026-10-26 Provider 类型边界续接：pi 最小修复第三方工厂动态调用，保留公开
  `unknown` 与运行时校验；主线程独立直接单测 **12/12**、真实服务 runner
  **12/12**、fixture 类型检查、单测严格编译、目标 lint/diff 均通过，临时资源清理
  为空。下条记录中的 TS2345 为修复前历史，不再作为当前阻塞；详见同一
  [PostgREST 租户验收](../evidence/enterprise-postgrest-tenant-acceptance-20261026.md)
  末节。本地服务与定向类型门禁不替代整个工作台浏览器流程或生产验收。
- 2026-10-26 真实认证到数据 Provider 服务增量：pi 实施、主线程审查修正并独立
  复跑单一 OrbStack runner **12/12，exit 0，零 skip/todo**。新增第 12 项以真实
  GoTrue 会话驱动当前工作区 `createSupabaseDataProvider`、PostgREST 与 PostgreSQL，
  覆盖租户 CRUD 持久化读回、跨租户拒绝、行租户转移拒绝与 user_metadata 伪造拒绝；
  精确项目资源清理为空。见
  [PostgREST 租户验收](../evidence/enterprise-postgrest-tenant-acceptance-20261026.md)。
  这是 Node 侧测试策略下的服务链路，不是资源工作台浏览器到业务数据库的闭环；
  生产 RBAC、读屏、发布仍未证明。定向 TS 仍报 `data-provider.ts:64` TS2345，
  未将运行时通过外推为类型门禁完成。
- 完整编辑页主线程复核（2026-10-23）：独立执行 `playwright.resource-workspace-edit-route.config.ts`，Chromium desktop 1/1 passed、exit 0、4.2s。已检查真实 AdminApp 路由渲染 AutoTable/AutoForm（非 QuickEditDrawer），受控内存 RouterProvider 将搜索/第 2 页带入编辑记录 11，失败保留草稿和编辑页，重试成功后返回列表并显示服务端规范化值，精确断言两次 update 及恢复的 q/page。此处路由状态来自 fixture 内存，未验证浏览器地址栏、刷新/历史恢复、真实服务/RBAC、其他引擎或发布；不得称真实路由服务验收。

- 主线程最新浏览器复核：独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.resource-workspace.config.ts`，Chromium/WebKit/Firefox × desktop/narrow 共 18/18 passed、exit 0、31.7s；`git diff --check` exit 0。本轮未改组件、fixture 或 spec。既有“主线程结果待复核”现更新为已复核，但仍仅证明受控本地 Provider 的行为，不证明真实 Provider/RBAC、持久化或发布；独立完整编辑路由随后由第 6 节单文件浏览器闭环补充，后续主线程复核结果见同条目下方的 2026-10-23 补记。

- 原始要求：查询、选择、详情、编辑、恢复和权限成品封装。
- 直接证据：[list-state-composition.md](../architecture/list-state-composition.md)、[svar-grid.md](svar-grid.md)、[infinite-list-recovery/README.md](../evidence/infinite-list-recovery/README.md)、[svar-resource-query-feedback-20261021.md](../evidence/svar-resource-query-feedback-20261021.md)、[resource-overview-sort/README.md](../evidence/resource-overview-sort/README.md)、[resource-workspace-audit-20261022.md](../evidence/resource-workspace-audit-20261022.md)。
- 本轮执行证据：同一限定命令在 `packages/ui` 分轮记录，不合并历史次数。历史 **pi 自测**基线 32/32、原始 exit code 0、duration 23.86s；**主线程独立基线** 32/32、原始 exit code 0、duration 17.26s（新增用例之前，不能计作新增后复核）。初版新增 2 个行为用例后，**pi 自测** 34/34、原始 exit code 0、duration 11.61s；**主线程已独立复核初版** 34/34、原始 exit code 0、duration 11.95s。主线程审查修正加强后，**pi 自测**再跑同一文件 34/34、原始 exit code 0、duration 16.30s，并执行 `git diff --check` 得到原始 exit code 0；随后**主线程在最终加强版本后独立复核**同一文件 34/34、原始 exit code 0、duration 14.18s，并执行 `git diff --check` 得到原始 exit code 0。审查修正过程中曾出现一次中间态失败，该失败不计入最终结果，仅作为审查修正过程保留；最终加强版通过。未使用 `tail`。该文件通过 `resource-workspace.test-host.svelte` 直接挂载真实 `ResourceOperationsPage` → `AutoTable`，使用真实 `provideAdminContext`、`QueryClient` 和受控本地 `DataProvider`，是当前工作区的真实源码消费者，不是页面 mock。
- 编辑提交闭环续轮证据：在同一真实消费者文件只新增 1 个快速编辑用例，复用真实 `QuickEditDrawer → AutoForm → useForm` 和受控 Provider。受控第 2 页 + 搜索 `needle` + 行选择后打开 `Quick edit`，初始列表为 `needle initial title`，首次 `update` 拒绝时抽屉保持且草稿 `needle draft title` 不丢失；显式再次保存成功后抽屉关闭，列表刷新为服务端规范化返回值 `needle normalized title`（与草稿不同），搜索、第 2 页分页和行选择保留且保存后重新查询当前选择仍可参与真实批量动作，刷新调用数增加；`update` 恰好 2 次，两次均精确断言 `{ resource: 'posts', id: 2, variables: { title: 'needle draft title' }, meta: { tenantId: 'first' } }`，创建/删除写入为 0。限定命令 **本版 pi 自测 35/35、原始 exit code 0、duration 12.90s**，`git diff --check` 原始 exit code 0；**本版主线程随后独立复核 35/35、原始 exit code 0、duration 13.50s**，`git diff --check` 原始 exit code 0，本版主线程复核已完成。初版记录单独保留：pi 自测 **35/35、原始 exit code 0、duration 28.40s**，主线程初版独立复核 **35/35、原始 exit code 0、duration 13.42s**，均为独立运行、不合并；历史 34/34 基线亦单独保留。新增前未再运行 34，调试中两次中间态失败仅来自新用例期望（搜索重置分页、`update` 携带 tenant meta），不计最终结果，未认定生产缺陷。详见 [resource-workspace-audit-20261022.md](../evidence/resource-workspace-audit-20261022.md) 第 8 节。
- 完整编辑路由闭环续轮证据（历史记录）：补齐上一轮明确未验收的独立完整编辑页。新增 `ResourceWorkspaceEditRouteFixture.svelte` 直接挂载真实 `AdminApp`，从真实 `AutoTable` 的完整 `Edit` 按钮进入 `/:resource/edit/:id`，由真实 `AutoForm` 执行 `getOne`、提交失败保留草稿和显式重试，不手写假编辑页、不以 `QuickEditDrawer` 代替。按现有路由契约验证列表搜索 `needle` + 第 2 页进入编辑时 URL 保留 `q=needle&page=2`，首次 `update` 失败后草稿 `needle draft title` 保持且 `update` 为 1 次，重试成功后 `update` 恰好 2 次、列表显示服务端规范化值 `needle normalized title`，返回列表后路由恢复 `q=needle&page=2` 且重新查询仍为搜索后的第 2 页。专属配置仅 Chromium desktop 单文件：**pi 自测 1/1 passed、原始 exit code 0、total duration 4.1s**（test 3.4s），`git diff --check` 原始 exit code 0；当时记录为**主线程独立复核待执行**，后续已由本节下一条补记取代。仍未证明真实 Provider/RBAC、服务端持久化、跨引擎、narrow、读屏或发布。详见 [resource-workspace-browser-20261022.md](../evidence/resource-workspace-browser-20261022.md) 第 6 节。
- 最新复核补记（2026-10-23）：完整编辑路由本线程独立复跑 **1/1 passed、exit 0、5.8s**；受控内存 Provider/Router 边界不变。资源工作台完整三引擎两视口初次复跑发现 **33 passed / 3 failed**，失败均为 narrow 对全屏 Drawer 的真实 overlay 指针点击被 dialog 覆盖；审查确认窄屏 `width: 100%` 本身没有可命中的遮罩区域，不以 `force` 规避。生产 `packages/ui/src/app.css` 已补 `.svadmin-sheet-panel { box-sizing: border-box; }`，修正 padding 的尺寸模型并由 pi 构建验证；测试在 narrow 分支改为直接触发 overlay handler，并保留 desktop 真实指针点击。最终专属配置本线程独立复跑 **36/36 passed、exit 0、约 1.1m**，三引擎 × desktop/narrow，每项目 6/6；这证明受控消费者的行为与布局边界，不证明真实服务、RBAC、读屏或发布。
- 证据覆盖边界：该切片对查询（分页/排序/搜索透传、tenant/provider 切换后的迟到回执隔离）和选择（当前页、跨页已选、全部匹配及排除项、搜索与上下文变化清除）有直接断言；对列表读取权限拒绝有直接断言。加强后的新增用例：首次 `getList` 失败 → 显式 `Retry` → 记录出现并可选择 → 输入搜索 `needle`，等待 `getList` 精确收到 `filters: [{ field: 'title', operator: 'contains', value: 'needle' }]` → 打开真实 `RecordDetailDrawer`，断言 `getOne` 收到 `{ resource: 'posts', id: 7 }` → 从抽屉进入编辑，最终导航精确为 `{ to: '/posts/edit/7?q=needle', type: 'push' }`，查询未丢失，且创建/更新/删除写入均为 0；另一用例使用可观察 `vi.fn` 异步 `can`，等待 `show`/`edit` 授权完成，确认列表可读但详情/编辑被拒绝时不暴露详情/编辑按钮或行内 `More actions` 菜单中的 `Edit`/`Quick edit` 项、不调用 `getOne`、不写入。host 的 `go` 参数改为 `Parameters<RouterProvider['go']>[0]`，并按真实 pathname/query 回读以核对最终导航。详见 [resource-workspace-audit-20261022.md](../evidence/resource-workspace-audit-20261022.md) 的 follow-up contract 与 Gherkin。
- 纠正旧产品假设：旧文档把“列表刷新失败”当作应强制关闭“已授权的独立详情”的结论没有确认依据。暂时列表刷新失败不等同撤销列表读取授权，也不等同于强制关闭已授权详情；失败关闭只适用于列表读取权限被拒绝，或详情/编辑本身未获授权。本轮按该权限边界与显式重试路径验收，不再沿用旧假设。
- 独立组件证据说明：主线程已独立复核 `auto-table-interactions.test.svelte.ts` 48/48、原始 exit code 0、duration 15.14s，并确认 `git diff --check` exit 0；其中实际验证详情抽屉、完整详情/编辑导航与列表 query 恢复，但不是当前 `resource-workspace` 完整消费者流程，不能替代 34/34。
- 本轮新增真实源码消费者浏览器证据：`ResourceWorkspaceFixture.svelte` 直接挂载真实 `ResourceOperationsPage → AutoTable → QuickEditDrawer`，受控本地 Provider 真实按 search/filter/pagination 筛选分页，本地内存 router 保留并回读查询；专属 Playwright 在 Chromium/WebKit/Firefox × desktop/narrow 共 **18/18 passed、原始 exit code 0、duration 29.9s**，`git diff --check` 原始 exit code 0。主线程随后独立复核同一专属 Playwright 配置，**18/18 passed、原始 exit code 0、duration 31.7s**，并独立执行 `git diff --check` 得到原始 exit code 0；两次为独立运行，分开记录、不合并次数或时长。覆盖：首次查询失败→键盘 Retry→搜索与真实分页→选择→详情→关闭后搜索/分页/选择保留；快速编辑首次 update 失败保留草稿、显式重试成功、列表刷新为规范化服务端值、`update` 恰好 2 次且逐次精确断言 resource/id/variables/tenant、失败时无敏感诊断，保存失败抽屉打开时 narrow 控件边界与页面横向溢出检查；列表允许但 show/edit 拒绝时不暴露 Detail/Edit 与 More actions 内 Edit/Quick edit，不读取详情、不写入。所有用例断言 `pageerror` 为空；截图在忽略目录 `output/playwright/resource-workspace-browser-20261022/`。详见 [resource-workspace-browser-20261022.md](../evidence/resource-workspace-browser-20261022.md)。
- 仍未证明的验收：查询→选择→详情→编辑→提交→失败恢复→权限拒绝的单一真实消费者完整流程；真实 Provider、服务端 RBAC 与租户/字段授权；真实设备/读屏；发布包、消费者生产构建和部署。独立“编辑完整路由页面”已有 Chromium desktop 1/1 的受控本地证据，但不证明真实服务、跨引擎、narrow、读屏或发布。受控 AccessControl stub、受控 `getList` rejection 与受控 `update` 拒绝不外推为真实服务端错误分类、持久化或幂等。本地 Playwright 已覆盖三引擎 desktop/narrow 的受控浏览器路径，但仍不替代真实设备/读屏或真实后端。
- 下一项可执行动作：快速编辑、三条浏览器流程和独立完整编辑路由均已有本地直接证据，不再重复添加同类用例；历史 34/34、35/35、浏览器 18/18 与完整编辑路由 1/1 分开保留，不合并。真实 Provider/RBAC、真实服务持久化、读屏设备及发布授权仍为外部依赖。不得把这些受控本地结果外推为真实 RBAC、真实设备/读屏或发布完成。模块为 `packages/ui` ResourceWorkspace / ResourceOperationsPage / AutoTable / QuickEditDrawer。
- 外部依赖：真实 Provider/RBAC、屏幕阅读器、发布授权。
- 状态：历史 34/34 切片证据已由主线程独立复核（历史 pi 32/32 与主线程 32/32 分开保留；初版 pi 34/34、duration 11.61s，初版主线程 34/34、duration 11.95s；加强后 pi 34/34、duration 16.30s、`git diff --check` exit 0；最终加强版主线程 34/34、原始 exit code 0、duration 14.18s、`git diff --check` exit 0；中间态一次失败不计最终结果，仅作为审查修正过程保留）。编辑提交受控消费者证据已独立复核：本版 pi 自测 **35/35、原始 exit code 0、duration 12.90s**、`git diff --check` exit 0，本版主线程独立复核 **35/35、原始 exit code 0、duration 13.50s**、`git diff --check` exit 0，本版由待复核改为已复核；初版记录单独保留：pi 自测 **35/35、原始 exit code 0、duration 28.40s**，主线程初版独立复核 **35/35、原始 exit code 0、duration 13.42s**，均为独立运行、不合并；历史 34/34 基线单独保留，中间态失败不计入最终结果。快速编辑失败保留草稿、显式重试成功、列表服务端规范化值、刷新调用增加、保存后重新查询当前选择与搜索/分页/选择保持已有本地直接证据。新增真实源码消费者浏览器证据：pi 自测 **18/18 passed、原始 exit code 0、duration 29.9s**、`git diff --check` exit 0；主线程独立复核同一专属 Playwright 配置 **18/18 passed、原始 exit code 0、duration 31.7s**、`git diff --check` exit 0，两次独立运行分开记录，本地浏览器证据已复核。但真实 Provider/RBAC、服务端持久化、独立“编辑完整路由页面”、真实设备/读屏与发布仍未验收；局部证据不足；需外部验收。
- 2026-10-23 主线程再复核：`playwright.resource-workspace.config.ts` 当前三引擎双视口矩阵 **36/36 passed**、exit `0`、约 1 分钟、单 worker；覆盖 QuickEdit 关闭/旧回执隔离、查询重试、搜索分页选择、失败重试规范化值和 show/edit fail-closed。仅更新本地受控消费者证据，不扩大为真实 Provider/RBAC、持久化、读屏或发布完成。
- 口径更正：上方历史状态行中“独立编辑完整路由页面”仍未验收的表述仅对应主线程补记之前的时间点；该范围现已有 Chromium desktop **1/1 passed** 且已由主线程独立复核，当前不再列为本地待验收项。

### B3-02 共享视图

- 原始要求：个人/团队/系统作用域、默认视图、失效字段。
- 直接证据：[list-state-composition.md](../architecture/list-state-composition.md)、[svar-grid.md](svar-grid.md)、[saved-list-views.test.ts](../../packages/ui/src/components/saved-list-views.test.ts)、[saved-list-views-model.test.svelte.ts](../../packages/ui/src/components/saved-list-views-model.test.svelte.ts)、[saved-list-views-browser-20261022.md](../evidence/saved-list-views-browser-20261022.md)。
- 证据覆盖边界：两个单测文件**分别独立运行**，不合并命令。`saved-list-views.test.ts` 在 `packages/ui` 以 `bunx vitest run --config ./vitest.config.ts src/components/saved-list-views.test.ts` 执行。**pi 自测**与**主线程独立复核**均得到 38/38 通过、原始 exit code 0；主线程另确认 `git diff --check` exit code 0。该文件覆盖系统/团队远端元数据（system source 解码为只读、`local` 远端 source 收敛为 `team`、显式 default 标记保留但不可写）、权限 metadata 与访问主体（access 编解码、畸形/越权 access 拒绝、不执行 getter、成员目录边界）、未知字段拒绝（未知列 id 裁剪、未知 filter/sorter 字段与畸形 JSON 失败关闭、receipt 中 extra/secret 字段与不可静默归一化的 state 拒绝）、provider/tenant/identity key 隔离（每个偏好 key 编入 resource/provider/tenant/identity，匿名与身份互不冲突，legacy 迁移仅限默认 provider 且无 tenant）、版本冲突与旧回执保护（版本化成功/`VERSION_CONFLICT` 回执、回执与请求 view/source/version 关联、过期或错配回执被拒绝、只读服务端元数据保留且返回分离视图）。本轮另单独以 `bunx vitest run --config ./vitest.config.ts src/components/saved-list-views-model.test.svelte.ts` 运行共享视图模型文件，**pi 自测**得到 23/23 通过、原始 exit code 0；**主线程独立复核**已独立执行同一命令，同样得到 23/23 通过、原始 exit code 0，并确认 `git diff --check` exit code 0，已查看模型实现与证据。该文件运行证据覆盖：本地恢复与显式 URL（不覆盖 URL 状态）、按名保存/替换与 scope 内删除、存储写入失败保留内存视图、租户切换不覆盖持久化视图、作用域未就绪不加载不保存、`tenant`/`provider`/`unmount` 后迟到列表结果隔离、远端默认视图在 `none`/`url`/`local`/`dirty`/`cleared` 下的应用优先级、远端保存失败/`VERSION_CONFLICT` 保留草稿、默认视图 opt-in 与唯一性、旧租户保存回执隔离、版本化保存/删除与默认视图变更重载、旧访问主体搜索隔离、应用视图为脱离快照且 dirty 清除 active id。38 与 23 是两次独立运行，不合并为一个命令，模型层 23/23 不证明真实后端。未知字段处理按现有拒绝/裁剪契约核对，不新造“删除未知字段”语义。
- 本轮新增真实源码消费者浏览器证据：`SavedListViewsFixture.svelte` 直接 import `AutoTable.svelte`，使用真实 `provideAdminContext`、真实 `QueryClient` 和本地可控 `DataProvider`/`SavedListViewProvider`。专属 Playwright 在 Chromium/WebKit/Firefox × desktop/narrow 共 18 个用例中 **pi 自测** 18/18 通过、原始 exit code 0；`git diff --check` 原始 exit code 0。**主线程独立复核**已独立复跑同一专属 Playwright 命令，同样 18/18 passed、原始 exit code 0（Chromium/WebKit/Firefox × desktop/narrow），并独立执行 `git diff --check` 得到原始 exit code 0；主线程另抽查 `webkit-narrow` 失败弹层截图，确认表单、名称输入、保存与刷新/重试控件均在视口内且页面无横向溢出。两次为独立运行，分开记录。覆盖：个人视图保存后以独立预期断言本地持久化 state，改查询后通过原 UI 应用，完整 Provider 查询与刷新后恢复均按 `toEqual` 验证 `filters/sorters/pagination`；团队视图首次保存失败仅通用错误、草稿名保留、显式重试成功，每次 save 的 scope（resource/provider、无 tenant）与完整 mutation state 精确断言，首次失败与再次保存比较业务内容但不要求相同 `id`，保存请求总数 2 且无本地误报或重复 list；远端读取失败显式 Retry 恢复 team/system 视图、只读视图删除/默认入口禁用且远端写调用为 0。所有用例断言 `pageerror` 为空；narrow 除页面横向溢出外，还在失败/保存弹层展开时检查表单、名称、保存、刷新/重试控件边界；截图输出在忽略的 `output/playwright/saved-list-views-browser-20261022/`。首轮测试曾误把搜索折进 `state.filters`，已按真实契约修正为 `state.search` 独立、`state.filters` 为空，未伪称实现缺陷；该证据仍不证明真实服务端授权、持久化、读屏或发布。
- 证据记录：[saved-list-views-audit-20261022.md](../evidence/saved-list-views-audit-20261022.md)、[saved-list-views-browser-20261022.md](../evidence/saved-list-views-browser-20261022.md)，其中区分 pi 自测与主线程独立复核。
- 2026-10-24 失效列提示增量：pi 实施、主线程审查并独立复跑。按视图身份记录被裁剪列，
  覆盖本地/远端应用载荷不含失效列、保存原文不被改写、同 ID 远端遮蔽本地提示、
  删除/覆盖只清对应提示、作用域切换不泄漏；主线程审查另发现并由 pi 修复特殊
  合法 ID `__proto__` 的自身属性写入问题，最终模型 **29/29**、解码 **38/38**，
  均 exit `0`，定向 ESLint 与 `git diff --check` 通过。证据见
  [saved-view-stale-fields-20261024.md](../evidence/saved-view-stale-fields-20261024.md)。
  新增专属真实消费者矩阵由 pi 自测、主线程独立复核最终均 **18/18**（三引擎 × 两视口）、
  exit `0`；覆盖 role=status 计数、真实查询载荷、删除/覆盖清理、键盘激活与窄屏边界。
  新增真实按键遍历关键控件、反向遍历和 Escape 焦点恢复；
  不证明所有中间 Tab 轨迹、真实读屏、双语言独立矩阵或真实后端。证据见
  [saved-view-stale-fields-browser-20261024.md](../evidence/saved-view-stale-fields-browser-20261024.md)。
- 仍未证明的验收：团队/系统作用域写入授权、失效字段裁剪与提示的真实行为、默认视图冲突、真实共享视图存储/服务、读屏、发布；`saved-list-views-model.test.svelte.ts` 的 23/23 已由 pi 自测与主线程独立复核分别确认，但仅覆盖模型层；新浏览器 18/18 已由 pi 自测与主线程独立复核分别确认，仍只是本地受控 Provider，不证明真实后端。
- 下一项可执行动作：本地源码消费者浏览器证据已由 pi 与主线程分别复跑确认，不再重复添加同类用例；后续只在确认真实服务或读屏缺口时推进外部验收，不得把本地受控 Provider 外推为真实共享视图服务。
- 外部依赖：真实视图存储/身份作用域、读屏工具、发布授权。
- 状态：本地解码/key 隔离证据已独立复核（pi 自测与主线程复核均 38/38、exit 0）；共享视图模型文件亦已独立复核（pi 自测与主线程复核均 23/23、exit 0，两次独立运行）；真实源码消费者浏览器 18/18（含完整查询 `toEqual`、scope/state 精确断言、失败弹层展开截图与 narrow 控件边界检查）已由 pi 自测与主线程独立复核分别确认（两次均 18/18 passed、exit 0，主线程另确认 `git diff --check` exit 0 并抽查 webkit-narrow 截图无横向溢出）；模型层与浏览器受控 Provider 均不证明真实后端，真实服务/读屏/发布仍未验收。

### B3-03 导入导出中心

- 最新跨引擎主线程复核：`playwright.import-export-center.config.ts` 独立运行 18/18 passed、exit 0、17.6s（Chromium/WebKit/Firefox × desktop/narrow），与 pi 18/18、18.1s 分开记录。三个既有场景保留精确 CSV 内容、零非法写入、点击前零下载/点击后一次下载、无新任务提交及 pageerror 断言；新增窄屏页面无横向溢出。未逐个检查内部控件裁切，不宣称完整视觉或读屏验收。生产组件未改，仍不证明真实任务持久化、服务端全量导出或授权。

- 最新主线程复核（2026-10-23）：独立运行 `playwright.import-export-center.config.ts`，Chromium desktop 3/3 passed、exit 0、3.9s。已审查真实组件挂载和下载断言：点击 Start import 后、写入前逐行预校验阻断非法 CSV；部分失败报告精确仅含 header 和失败行；任务恢复后点击前零下载，点击后一次下载，submit 仍为零；导航前监听 pageerror。与修正版 pi 3/3、3.8s 独立记录，不合并。该轮记录时尚未实现独立试运行；后续本地 dry-run 增量见下条。当前仍不是分页导出或服务端全量导出证据；任务持久化、真实授权/服务、其他引擎、读屏、发布仍未闭环。

- 原始要求：预校验、试运行、任务持久化、全量导出、失败报告。
- 直接证据：[import-export-center-audit-20261022.md](../evidence/import-export-center-audit-20261022.md)、[import-export-center-browser-20261023.md](../evidence/import-export-center-browser-20261023.md)、[import-dropzone-contract-20261021.md](../evidence/import-dropzone-contract-20261021.md)、[import-dropzone-cross-browser-20261022.md](../evidence/import-dropzone-cross-browser-20261022.md)、[svar-grid.md](svar-grid.md)、[enterprise-consumer-build-20261022.md](../evidence/enterprise-consumer-build-20261022.md)、[import-wizard.test.svelte.ts](../../packages/ui/src/components/import-wizard.test.svelte.ts)、[export-contract.test.svelte.ts](../../packages/ui/src/components/export-contract.test.svelte.ts)、[ImportExportCenterFixture.svelte](../../scripts/fixtures/enterprise-ui/ImportExportCenterFixture.svelte)、[import-export-center.spec.ts](../../scripts/fixtures/enterprise-ui/import-export-center.spec.ts)、[playwright.import-export-center.config.ts](../../scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts)。
- 证据覆盖边界：两个测试文件**分别独立运行**，不合并命令。`import-wizard.test.svelte.ts` 在 `packages/ui` 以 `bunx vitest run --config ./vitest.config.ts src/components/import-wizard.test.svelte.ts` 执行；历史基线 **pi 自测**与**主线程独立复核**均得到 70/70 通过、原始 exit code 0；dry-run 增补后 pi 曾为 74/74，当前主线程按工作区最新版本独立复核 **83/83 passed、exit 0**；主线程另确认 `git diff --check` exit code 0。该文件运行证据覆盖：映射后逐行预校验与大小/行数/映射/权限拒绝；基于 `initialTaskId` 的服务端任务恢复、关闭重开恢复、取消、租户切换清除；任务幂等提交与 artifact 引用提交；服务端授权失败行引用重试、同一幂等键未确认重试、非法/越权 retry 回执拒绝；部分失败 CSV 报告与文件名清洗；权限/租户/provider/关闭/卸载后的迟到提交、迟到 artifact、迟到 retry 回执隔离。续轮单独以 `bunx vitest run --config ./vitest.config.ts src/components/export-contract.test.svelte.ts` 运行导出契约文件，**pi 自测**与**主线程独立复核**均得到 59/59 通过、原始 exit code 0；主线程另确认 `git diff --check` exit code 0，并核对了未授权按钮不 dispatch、任务恢复仅显式下载、invalid result fail-closed、scope change 迟到回执丢弃。该文件运行证据覆盖：逐页契约校验与后页非法不下载部分结果、`pageSize`/filter/format/limit 校验、零限制不取数；重复触发合并与首次 await 前捕获选项；资源/租户/provider/contract/metadata 变化或卸载后取消迟到下载与回调；错误脱敏与诊断 getter 不执行；任务化导出提交、幂等键与 query/format/limit 透传、mapped export 拒绝任务化；任务恢复与显式下载、非法/不安全下载地址失败关闭、恢复 artifact 在 tenant/provider/permission/key/filters/sorters/limit 变化后丢弃、未授权按钮不 dispatch。ImportDropzone 只覆盖选择/校验/失败重试，不等同导入导出中心；SVAR 已加载记录导出也不等同服务端全量导出；测试内 stub provider/下载 mock 不外推为真实服务。
- 本轮新增真实源码消费者浏览器证据：`ImportExportCenterFixture.svelte` 直接挂载 `ImportWizard.svelte` 与 `ExportButton.svelte`，使用真实 `provideAdminContext`、真实 `QueryClientProvider`、受控本地 `DataProvider`/`TaskProvider` 和同源静态 artifact；专属 Playwright 只运行 `import-export-center.spec.ts`，**pi 自测 3/3 passed、原始 exit code 0、duration 3.7s**、`git diff --check` exit code 0，项目仅 `chromium-desktop`。覆盖：非法映射 CSV 在 `Start import` 前被逐行预校验阻断，`create` 调用 0 次；合法 3 行 CSV 产生 2 成功 1 失败，精确 `onSuccess` 计数、3 次 `create`、2 条成功写入，点击 `Download failed CSV` 捕获真实 download，文件名 `browser-import-import-errors.csv`，CSV 含 `_error_reason` 与失败值且不含 Provider 私有错误文本；`ExportButton` 通过 `initialTaskId` 恢复 completed 任务，不触发 `submit`（0 次），按钮变为显式 `Download` 后捕获真实 download，内容为受控同源 artifact 的 5 条记录。该轮记录时 API 尚无独立试运行/干跑入口，合法路径按现有实现为映射预校验后真实 `create` 写入，未虚构试运行；后续已新增本地 dry-run，见下条。任务恢复下载的 artifact 是本地静态文件，不是真实服务端全量导出。首轮一次失败来自 fixture 同时渲染导入模态框与导出按钮导致遮罩阻断点击，已用 `panel` 隔离修正，不是生产缺陷，未改生产组件。该浏览器证据仍不证明真实服务端持久化、授权/租户隔离、失败报告下载鉴权、服务端全量导出、大文件、跨引擎/narrow、读屏或发布。
- 2026-10-23 跨引擎/narrow follow-up（pi 自测，后由主线程复核）：只扩展专属配置为 Chromium/WebKit/Firefox × desktop/narrow 共 6 个项目，`workers: 1`，仍运行同一 3 个场景；未新增重复测试，fixture 与生产组件未改。spec 仅新增窄视口无横向溢出断言，保留导航前 `pageerror` 与 `afterEach` 零页面错误断言。pi 先以 `--project=chromium-desktop` 确认 3/3 passed，再运行全矩阵 18/18 passed。随后主线程按当前配置（含 dry-run 与 preview-import）独立运行 **30/30 passed、exit 0、33.1s**，三引擎双视口每项目 5/5。仅证明本地受控 Provider/静态 artifact 在上述引擎与视口下的消费路径，不证明真实服务、读屏或发布。
- 2026-10-23 主线程最新复核：同一配置当前包含 dry-run 与 preview-import 场景，独立运行 **30/30 passed**、exit `0`、38.7s；三引擎双视口每项目 5/5。该结果覆盖本地受控 ImportWizard/ExportButton 消费路径，不证明真实任务服务、持久化、全量导出、下载鉴权、读屏或发布。
- 2026-10-23 B3-03 本地 dry-run 增量（pi 自测，主线程随后独立复核）：`ImportWizard.svelte` 新增公开 `dryRun`/`onPreview`，只复用现有解析、映射与 `parseContractCreateInput` 逐行预校验，不调用 `DataProvider.create/createMany`；`dryRun=true` 时即使同时传入 `initialTaskId`/`taskName` 也不恢复任务 UI、不调用 `TaskProvider.get/submit/cancel`、不调用 artifact `upload`，模式切换会清理已恢复任务与提交尝试。新增 `ImportPreviewResult`/`ImportPreviewFailure` 并从 core/ui index 导出，失败原因沿用安全文本 `Invalid import input`。预览 summary 使用“本地校验通过/失败”而非 `can be imported`，hint 明确不保证服务端成功；`importableRows` 保留兼容但注释明确仅为本地 schema 校验通过；失败行用 i18n 渲染；观察者收到冻结隔离快照，同步抛错/异步拒绝均不外溢。普通 `Start Import` 恢复首错早停，只有预览聚合全部失败行。pi 曾运行 **74/74 passed**，当前主线程按最新工作区独立复核 **83/83 passed、exit 0**；专属浏览器 **30/30 passed、exit 0**（三引擎 × desktop/narrow，每个项目 5/5）。`panel=preview` 仍断言 dry-run 回调计数、零 `create`、零写入、无 `Start Import`；新增 `panel=preview-import` 真实操作证明预览→返回映射→改坏映射被 `Row 1` 阻断且零写入→修正映射后正式导入写入 2 行。`Back to import` 只表示返回映射，不等于正式导入；dry-run 是客户端预检，不是服务端试运行；不证明唯一性、真实授权/租户隔离或业务状态。
- 2026-10-23 主线程最新复跑：同一 `playwright.import-export-center.config.ts` 已按当前 fixture 独立运行 **30/30 passed**、exit `0`、38.7s（Chromium/WebKit/Firefox × desktop/narrow，每项目 5/5），覆盖既有三场景与 dry-run/preview-import 两场景；该结果仅更新本地受控浏览器证据，不改变真实服务、任务持久化、下载鉴权、读屏与发布边界。
- 仍未证明的验收：真实服务端任务持久化与进程重启恢复、服务端全量导出、失败报告下载鉴权、真实权限/租户隔离、大文件性能、读屏与发布。WebKit/Firefox 与 desktop/narrow 现已有本地受控浏览器证据（18/18），但不外推为真实服务或读屏验收；两文件仍是 stub/mock 本地单测证据，真实服务与发布均未验收。dry-run 本地入口已补齐，但仍是本地受控预检证据。
- 下一项可执行动作：本地 Chromium desktop 与三引擎两视口真实浏览器消费路径已补齐（分别为 3/3、18/18），后续只在确认读屏或真实服务缺口时推进；不得把单测或本地受控浏览器路径外推为真实导入/导出服务、服务端全量导出或读屏验收，也不重复添加已存在的同场景用例。模块为 `packages/ui` ImportWizard/ExportContract。
- 外部依赖：真实导入/导出任务服务、文件存储、真实权限/租户服务、发布授权。
- 状态：ImportWizard 本地任务/失败报告证据（70/70、exit 0）与 ExportContract 导出契约证据（59/59、exit 0）均已独立复核；当前 fixture 的三引擎两视口矩阵已由主线程复跑 **30/30、exit 0**，本地跨引擎/narrow 缺口已补并完成主线程复核。两文件均为 stub/mock 本地证据，浏览器矩阵也仅覆盖受控 Provider/静态 artifact；真实服务、读屏与发布仍未验收。

### B3-03 最新复核补记（2026-10-23）

ImportWizard dry-run 单文件已由 pi 与本线程分别复核为 **83/83、exit 0**，ExportContract 为 **59/59、exit 0**。真实源码消费者浏览器矩阵已由本线程独立复跑 **30/30 passed、exit 0、48.3s**（Chromium/WebKit/Firefox × desktop/narrow，每项目 5/5），pi 亦为 30/30。该结果仅确认本地受控 Provider、静态 artifact、下载事件和窄屏无横向溢出，不证明真实服务端任务持久化、全量导出、下载鉴权、RBAC/租户隔离、读屏、性能或发布部署。

### B3-04 批量操作

- 主线程最新复核：`resource-workspace.test.svelte.ts` 独立运行 36/36 passed、exit 0、11.46s，`git diff --check` exit 0。新增当前页场景精确证明第一页选择后 `onBatch=[1]`、`currentPageIds=[1]`；翻到未选择的第二页再次执行仍为 `[1]`、`currentPageIds=[]`。生产未改；不证明真实批量 Provider、服务端幂等/事务/取消或跨页全量删除。

- 原始要求：已选/当前页/全部匹配范围、部分成功、幂等与取消。
- 直接证据：[batch-action-bar-contract-20261021.md](../evidence/batch-action-bar-contract-20261021.md)、[auto-table-batch-toolbar-20261021.md](../evidence/auto-table-batch-toolbar-20261021.md)、[list-deletion-criteria-isolation-20261021.md](../evidence/list-deletion-criteria-isolation-20261021.md)、[batch-operation-audit-20261022.md](../evidence/batch-operation-audit-20261022.md)、[auto-table-batch-partial-retry-20261023.md](../evidence/auto-table-batch-partial-retry-20261023.md)、[svar-grid.md](svar-grid.md)。
- 本轮当前页执行缺口补记（2026-10-23）：只改 `packages/ui/src/components/resource-workspace.test.svelte.ts`，新增 1 个真实 `ResourceOperationsPage → AutoTable` 消费者用例，未改生产代码、未提交/推送/部署，既有脏改动保留。断言当前页全选后 `Process selection` 的 `onBatch` 精确收到 `[1]`、`onSelection` 为 `{scope:'selected',ids:[1],currentPageIds:[1]}`；切换到第 2 页但不选择时再次执行仍只传 `[1]`，`currentPageIds` 为空且不把第 2 页记录加入载荷。仅运行 `bunx vitest run --config ./vitest.config.ts src/components/resource-workspace.test.svelte.ts`，**pi 自测 36/36 passed、原始 exit code 0、duration 12.13s**，`git diff --check` exit 0。搜索边界已有 `clears selected/all selection when search changes` 覆盖选择清空与工具栏移除，本用例不重复。该证据仍为本地受控 DataProvider/AccessControl stub，不证明服务端事务、幂等、取消或真实 RBAC。
- 最新单文件补记（2026-10-23）：只改 `packages/ui/src/components/auto-table-interactions.test.svelte.ts`，新增 2 个用例，未改 `AutoTable.svelte`/Core/Provider。**pi 自测**在 `packages/ui` 仅运行 `bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts`，**50/50** 通过（既有 48 + 新增 2）、原始 exit code **0**、duration **14.64s**，`git diff --check` exit code **0**。新增断言：部分成功后显式再次批量删除，`deleteOne` 调用序列严格为 `['user-1','user-2','user-2']`，成功 ID 不再请求，第二次成功清空选择；pending 期间重复点批量删除与清除不追加请求（仍 1 次 `deleteMany`、无第二个确认框、选择保留）。**主线程独立复核**同一单文件 50/50、exit 0、14.39s，diffcheck exit 0。与 48/48 分开记录，不证明服务端幂等、事务、真实取消、当前页执行或跨页全部匹配删除。
- 本轮执行证据：在 `packages/ui` 仅运行 `bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts`，**pi 自测** 48/48 通过、原始 exit code 0；**主线程已独立复跑**同一命令，48/48 通过、原始 exit code 0、duration 15.14s；主线程另确认 `git diff --check` exit code 0。该文件实际覆盖：显式单/多选与数字主键贯穿权限/自定义动作/删除；全部匹配的选择、逐条排除到零计数及清除（未执行全部匹配删除）；`deleteMany` 不可用时 `deleteOne` 逐条回退的部分成功与仅保留失败项；搜索变化及租户/Provider 切换后的旧请求结果隔离；pending 时 `aria-busy`、动作 `inert`、清除禁用及失败后解锁；批量删除权限拒绝时自定义动作保留；undoable/optimistic 下 checked 删除边界和 pending 行可见；成功路径仅通知一次。该文件还实际验证详情抽屉、完整详情/编辑导航与列表 query 恢复，但这些是组件级交互，不是当前 `resource-workspace` 完整消费者流程。本文件**未覆盖**当前页批量选择/执行、显式取消与部分成功后的重试、服务端 `DeleteManyPartialError`、幂等键/事务和跨页全部匹配删除协议；测试使用本地受控 DataProvider/AccessControl stub，不证明真实后端、RBAC、租户、浏览器键盘、读屏或发布。`list-deletion.test.svelte.ts` **本轮未运行**，其历史 27/27 仅来自既有证据文档，不并入本次结果。
- 证据覆盖边界：证据覆盖选中/全部匹配选择、部分回退成功、处理中锁定和筛选代际隔离；服务端幂等、真实取消、当前页与跨页全选协议尚未由本轮证明。当前页/全部匹配的载荷可在 `packages/ui/src/components/resource-workspace.test.svelte.ts` 现有用例中交叉查看（当前页选择/`currentPageIds`、`scope: 'all'`、`excludedIds`、`total`、`filters`、`sorters`），那只是本地消费者载荷断言，**不冒充服务端跨页全部匹配删除**。
- 仍未证明的验收：服务端幂等/事务、真实取消、跨页全部匹配删除协议、真实批量写入 Provider、读屏和发布。当前页批量执行已有本地消费者精确载荷与分页边界证据，但不等同服务端真实批量写入。
- 下一项可执行动作：部分成功后显式重试失败项与 pending 重复操作不追加请求已由 2 个新增本地用例补齐；当前页批量执行的本地消费者载荷与分页边界已由新增 1 个用例补齐，搜索边界由既有用例覆盖。后续不得重复这些本地用例，只能在获得真实批量写入服务/权限后推进外部验收；不得将 50/50 或 36/36 外推为服务端跨页删除、幂等、事务或真实取消已完成。
- 外部依赖：真实批量写入服务、权限、发布授权。
- 状态：48/48 已由 pi 自测与主线程独立复核分别确认（两次均 48/48、原始 exit code 0；主线程 duration 15.14s 并确认 `git diff --check` exit 0）。2026-10-23 单文件补记新增 2 个用例后 pi 自测 50/50、原始 exit code 0、duration 14.64s，主线程独立复核 50/50、原始 exit code 0、duration 14.39s，均确认 `git diff --check` exit 0；50/50 与 48/48 分别记录、不合并，且不证明服务端幂等/事务/真实取消/跨页全量删除。当前页/全部匹配仅有本地载荷交叉证据；局部证据不足；需外部验收。

### B3-05 详情工作台

- 2026-10-27 范围决策（当前状态，优先于下文历史记录）：用户已明确 B3-05 保留宿主提供的 `oldValue/newValue` 差异展示；版本列表、版本选择、恢复由业务宿主负责。SVAdmin 不提供版本服务、版本列表、版本选择或恢复 API/UI。该项由“产品待决策”改为“范围已确定”，详见 [enterprise-b3-05-version-scope-contract-20261027.md](enterprise-b3-05-version-scope-contract-20261027.md)。真实版本服务、RBAC/租户、读屏实机、发布和部署仍属外部限制，不因本决策自动验收。

- 当前主线程复核（2026-10-23）：`playwright.detail-workspace.config.ts` 独立全矩阵 48/48 passed、exit 0、41.3s；与 pi 48/48、41.7s 分开记录。新增两个场景已核对固定闭包身份、同事件替换整个详情区配置和记录路由、四异步区完整 scope/各一次调用、A 已显示后立即清空、A 在途迟到成功/失败不污染 B；关系区为真实 snippet。替换的是 `detailWorkspace` 配置中的 Provider，不是底层 DataProvider 或默认 AuditLogProvider。该本地同时切换缺口已验收，旧段落的同项“待覆盖”不再代表当前状态；版本历史选择、真实服务/RBAC、读屏与发布仍未完成。生产源码未改，`git diff --check` exit 0。

- 当前审查补记：同时切换 Provider/recordId 的侧栏用例已补完整 A scope 和最终调用次数断言；补强版 pi 报告 12/12 通过（未提供耗时），主线程独立复跑 12/12、exit 0、8.57s。下文 pi 9.36s 是补强前运行，不归入补强版。A 在切换前已完成，因此此用例不证明同时切换时旧在途请求的迟到成功/失败隔离；五区同时切换仍是独立待验收项。

- 最新复核补记：扩展生命周期修复已由主线程独立运行 `detail-contract.test.svelte.ts`，**46/46 passed**、原始 exit code `0`、duration `9.69s`。下文“主线程独立复核待执行”为 pi 交付时状态，由本条更新为已复核；此前“未在专项重跑”的描述仅适用于续补前。与 pi 自测 46/46、14.12s 分开记录，不合并计数。仍不代表完整详情工作台业务联动已验收。

- 原始要求：关联、附件、活动、审计、版本差异。
- 直接证据：[surface-business-catalog.md](../architecture/surface-business-catalog.md)、[audit-content-exact-optional/README.md](../evidence/audit-content-exact-optional/README.md)、[audit-timeline-localization-20261022.md](../evidence/audit-timeline-localization-20261022.md)、[detail-workspace-audit-20261022.md](../evidence/detail-workspace-audit-20261022.md)。
- 历史只读核对证据：[detail-workspace-audit-20261022.md](../evidence/detail-workspace-audit-20261022.md) 第一轮在 `packages/ui` 只运行 `bunx vitest run --config ./vitest.config.ts src/components/audit-log-viewer-scope.test.svelte.ts`。**pi 自测** 2/2 通过、原始 exit code 0、duration 5.88s；**主线程已独立复跑**同一命令，2/2 通过、原始 exit code 0、duration 6.94s。两次为独立记录，不合并为一次运行。该文件实际覆盖审计快照在 authProvider 与 tenant 从 A 切到 B 后关闭，以及仅分页变化时保留同一作用域快照；**不是**记录 ID A→B 的验证。
- 本轮最小缺口补强旧版（审查修正前，保留）：只修改测试宿主与测试并只运行 `bunx vitest run --config ./vitest.config.ts src/components/scoped-async-consumers.test.svelte.ts`，**pi 自测** 10/10 通过、原始 exit code 0、duration 15.97s；**旧版主线程已独立复核**同一命令，10/10 通过、原始 exit code 0、duration 9.16s，另确认 `git diff --check` exit code 0。两次为独立记录、不合并。测试宿主新增可选 `recordId`（默认 `shared-record`）并传给 `AuditLogDrawer`；用例在同一 provider、同一 tenant/resource 下把记录 ID 从 `record-a` 切到 `record-b`，B 日志先显示，A 迟到不残留，并精确断言两次请求 meta 分别为 `recordId: 'record-a'/'record-b'`、最终调用次数为 2。该 10/10 为修正前版本结果，保留但不代表当前测试文件版本。历史 `audit-log-viewer-scope` 的 2/2 与旧版 10/10 分开记录、不合并。
- 本轮审查修正后的新版：仅修改 `scoped-async-consumers.test.svelte.ts` 与 B3-05 文档，未改生产代码；只运行同一命令，**pi 自测** 11/11 通过、原始 exit code 0（pi 未提供 duration，不记录）；**主线程独立复核**同一命令，11/11 通过、原始 exit code 0、duration 9.36s，另确认 `git diff --check` exit code 0。新增用例先 resolve A 并断言 `record-a-auditor` 显示，再仅把 `recordId` 从 `record-a` 改为 `record-b`，立即断言 A 日志不再显示且 B 请求已发出，随后 resolve B 并显示 `record-b-auditor`；保留迟到 A 不覆盖用例。两个用例均精确断言 A/B 请求 meta 与最终调用次数为 2。新版 11/11（pi 与主线程两次独立）与旧版 10/10（修正前）、历史 2/2 三组结果分别独立记录，不合并。
- 新 provider 与 recordId 同时切换窄缺口（仅补测试，未改生产）：在 `scoped-async-consumers.test.svelte.ts` 新增用例，同一 tenant/resource 下先显示旧 provider 的 `record-a-auditor`，并精确断言旧 provider 首次收到 A scope；再一次 `rerender` 同时更换 `auditLogProvider` 与 `recordId` 到 `record-b`；立即断言 A 消失、旧 provider 不再调用、新 provider 仅收到 B scope，B resolve 后显示 `record-b-auditor`，最终两 provider 各调用一次。只运行该单文件：**pi 自测 12/12 passed**、原始 exit code `0`、duration `9.36s`；**主线程独立复核 12/12 passed**、原始 exit code `0`、duration `8.57s`；两次独立记录、不合并，均确认 `git diff --check` exit `0`。该结果不与历史 11/11、旧版 10/10、历史 2/2 合并。该证据只覆盖 `AuditLogDrawer` 侧栏，不证明五区整体联动或真实审计服务/RBAC。详见 [detail-workspace-audit-20261022.md](../evidence/detail-workspace-audit-20261022.md)。
- 证据覆盖边界：`AuditLogViewer` 的审计快照有历史独立的 authProvider+tenant 作用域切换证据，分页变化保留快照。`AuditLogDrawer` 现有同 provider 记录 ID A→B 直接行为证据（新版含“A 已显示后仅切 recordId 立即清空、A 迟到不覆盖 B”两个用例），并新增一次同时切换 provider 与 recordId 的侧栏窄用例（pi 12/12），但仍不外推为完整详情工作台五区联动。`detail-contract.test.svelte.ts` 的既有断言（未在 B3-05 专项重跑）覆盖 page/drawer 的 id 变化、旧迟到响应隔离和关闭重开；`BoundRecordDetailDrawer` 也以 `${resourceName}:${recordId}` 重建字段区。关联仅有 `FieldRenderer`/`RelationPicker` 独立证据，附件仅有审批与上传/文件列表独立证据，活动仅有 `AuditTimeline` 独立证据；版本差异本轮只读审计并仅运行 `version-diff-viewer.test.svelte.ts` 单文件（pi 自测 1/1、原始 exit code 0、duration 14.78s；主线程独立复核 1/1、原始 exit code 0、duration 15.91s；两次独立、不合并），该单测只覆盖静态旧/新值渲染，`VersionDiffViewer` 无 loading/error/permission props、无独立空态文案（两侧为空仅显示 `0 changes`），且未定位详情工作台消费者；均未定位消费者闭环。存在组件或 `extraSections` 扩展点不等于对象切换行为已验收。其他测试未在 B3-05 专项重跑，不并入本专项计数。
- 扩展生命周期 follow-up（本轮）：只改 `BoundRecordDetailDrawer.svelte`、`detail-contract.test.svelte.ts`、测试扩展探针/host 与本证据文档，未改扩展 API/布局/颜色，未提交、推送、部署。新增最窄真实消费者回归：同一 query cache 预缓存 A/B 两条记录，A 扩展打开局部操作后仅切换 `recordId` 到 B，不经过 loading 卸载。生产未改时红测 `1 failed | 45 passed`、原始 exit code 1、duration 16.17s，失败断言在 `detail-contract.test.svelte.ts:176`（期望 B 扩展 `idle`，实际复用 A 的 `active`）；最小修复后同一单文件绿测 `46 passed`、原始 exit code 0、duration 14.12s（pi 自测）；主线程已独立复核同一单文件 `46/46 passed`、原始 exit code 0、duration 9.69s（见上条），两次独立记录、不合并。新增断言另覆盖父记录授权拒绝时扩展不挂载、授权后撤销时扩展销毁并丢弃局部状态。该修复只用与字段区相同的 `${resourceName}:${recordId}` key 重置扩展组件生命周期，不证明活动、附件、关联、版本差异内容闭环、真实后端/RBAC、浏览器/读屏或发布。
- 2026-10-23 主线程窄复核：`json-schema-form-enterprise.test.svelte.ts` **61/61**、`detail-workspace.test.svelte.ts` **9/9**、`version-diff-viewer.test.svelte.ts` **1/1** 均 exit `0`；仅确认当前受控本地契约保持通过，不改变 B2-11 外部引用适配和 B3-05 版本历史消费者缺失的结论。
- 仍未证明的验收：详情工作台五区在新 provider 与 recordId 同时切换时的整体联动已补受控浏览器证据（本轮 follow-up：用户按钮同事件切 provider 配置对象身份+recordId，48/48，仍不证明真实服务端）；真实服务端延迟/取消语义下的详情对象切换；关联/附件/版本差异权限；版本差异空态、错误态与真实版本历史；真实审计/详情 Provider、RBAC、租户/字段授权；读屏；发布包、消费者生产构建和部署。受控浏览器 A→B 已覆盖五区联动清空、B 完成渲染、迟到 A 成功/失败隔离与关闭生命周期，但不得外推为真实后端或真实 RBAC 闭环；历史 `audit-log-viewer-scope` 的 2/2 与同 provider recordId A→B 窄用例仍不得外推为真实审计服务。
- 下一项可执行动作（2026-10-27 更新）：浏览器受控 A→B 五区联动缺口已补。版本差异保留宿主静态 `oldValue/newValue` 组件契约；用户已决策版本列表、版本选择、恢复归业务宿主，SVAdmin 不提供版本服务/list/select/restore。因此不再等待版本产品契约，也不新增“选中记录版本”公共 API、默认版本 Provider 或重复静态渲染测试。剩余动作只在获得真实记录/版本服务、RBAC 或读屏/发布授权后推进外部验收；不得把受控浏览器证据、审计窄用例或独立组件存在当作真实后端/RBAC 闭环。
- 外部依赖：真实审计/详情 Provider、真实版本/附件/关联服务与权限、屏幕阅读器、发布授权。
- 状态：浏览器受控 A→B 五区切换与关闭生命周期历史结果 `30/30、exit 0、26.5s`（5 场景）仅作修复前保留；A→B→A 关闭生命周期最终由 pi 自测与主线程独立复跑全矩阵各 `36/36 passed`、`exit 0`、duration 约 `1.0m` 覆盖，另有新增单 project 红测 `1 failed`、绿测 `1 passed`、`chromium-desktop` 全组 `6/6 passed`、`git diff --check` exit `0`。上述 `36/36` 与修复前 `30/30`、上轮 `24/24、38.2s`、pi 上轮 `24/24、43.8s` 分开记录、不合并；真实服务/RBAC 仍未验收。历史 `audit-log-viewer-scope` 两次独立记录（pi 2/2、exit 0、5.88s；主线程独立复核 2/2、exit 0、6.94s）仍不是记录 ID A→B 验证，且与本轮分开、单独保留。`scoped-async-consumers` 旧版（审查修正前，保留）pi 自测 10/10、exit 0、15.97s 与旧版主线程独立复核 10/10、exit 0、9.16s（另确认 `git diff --check` exit 0）为两次独立记录、不合并，支持同一 provider 记录 ID A→B 的旧审计不残留。审查修正后新版 pi 自测 11/11、exit 0（pi 未提供 duration，不记录），主线程独立复核 11/11、exit 0、9.36s（另确认 `git diff --check` exit 0），新增“A 已显示后仅切 recordId 到 B 立即清空、B 请求已发”的直接断言并保留迟到 A 不覆盖用例；新版（两次独立）与旧版及历史 2/2 分别独立记录、不合并。新 provider 与 recordId 同时切换的侧栏窄用例已补（pi 12/12、exit 0、9.36s）；完整五区联动、真实服务/RBAC、读屏与发布仍未验收（受控浏览器 A→B 五区联动已补）；版本差异仅完成组件级只读审计与单文件静态渲染运行（pi 自测 1/1、exit 0、14.78s；主线程独立复核 1/1、exit 0、15.91s；两次独立），空态/错误/权限/对象切换与消费者闭环未证明；其他测试未在 B3-05 专项重跑、不合并计数；本轮 follow-up 另以受控浏览器 `48/48`（8 场景 × 三引擎 × 两视口）覆盖“同一用户事件切换 provider 配置对象身份 + recordId”的五区清空/B 渲染/旧 provider 迟到隔离，该 `48/48` 与历史 `36/36`、`30/30`、`24/24` 分开记录、不合并，且仍不证明真实服务；局部证据仍不足；需外部验收。

- 本轮实施补记（AutoTable 真实消费者；pi 为唯一 writer，主线程已独立复核同一单文件）：在真实 `AutoTable` 详情抽屉路径新增可选 `detailWorkspace`，仅提供时经 `RecordDetailDrawer → BoundRecordDetailDrawer.extraSections` 挂载内部 `DetailWorkspaceSections`，未提供时不改变既有抽屉行为。新增可消费类型 `DetailWorkspaceSectionsConfig` / `DetailWorkspaceProvider` 等并从 `packages/ui` 导出。五区组合：关联为可选 snippet provider（无 core provider 契约）；附件、活动、版本差异为可选 provider/snippet，provider 默认分别由真实 `FileList`、`AuditTimeline`、`VersionDiffViewer` 渲染；审计默认使用现有 `AuditLogProvider`，经 `withValidatedAuditProvider(...).get({ resource, meta: getProviderMeta(resource, { recordId }) })` 读取，读取门禁只复用父记录读取契约 `useCan({ resource: resourceName, action: 'show', id: recordId })`。五区统一位于 `${resourceName}:${recordId}` key 内，异步区销毁时 abort 并丢弃非当前结果，缺少配置显示 unavailable、provider 失败显示 error，不渲染旧数据或伪造网络数据。
- 本轮红绿与回归（均为 `packages/ui` 单文件独立运行）：先新增 `detail-workspace.test.svelte.ts`，通过真实 `AutoTableInteractionsHarness → AutoTable → 详情抽屉` 消费；生产未接入时红测 `2 failed`、原始 exit code 非 0、duration `14.80s`。最小接入后同文件绿测 `2 passed`、原始 exit code `0`、duration `14.45s`（pi 自测）。用例先缓存 B，再打开 A，断言关联探针、附件、活动、审计、版本差异五区显示 A；关联探针进入局部 `active` 后切换到已缓存 B，断言 A 内容消失、B 内容出现、局部状态重建为 `idle`，provider 只收到对应 `resourceName/recordId` 且切换后无 A 请求；另一用例断言四区缺配置为 unavailable、附件 provider 对 B 拒绝后显示错误态、A 数据不残留且原始错误文本不泄露。回归：`detail-contract.test.svelte.ts` `46 passed`、exit `0`、duration `21.88s`；`auto-table-interactions.test.svelte.ts` `48 passed`、exit `0`、duration `27.58s`；`git diff --check` exit `0`。本轮未运行 Playwright，也未运行全仓 test/build/typecheck。
- 本轮仍未验收：真实附件/关联/活动/版本历史/审计服务，真实 RBAC、租户/字段授权与服务端持久化；版本差异真实空态/错误/冲突语义、附件/关联权限；真实浏览器/读屏、发布包、消费者生产构建和部署。本次只证明真实 AutoTable 消费者路径的五区挂载、作用域、A→B 重建与 fail-closed 接口，不把组件独立能力或 provider 接口存在外推为业务数据闭环。
- 本轮真实浏览器补记（B3-05）：新增独立 `DetailWorkspaceBrowserFixture.svelte`、`detail-workspace.spec.ts`、`playwright.detail-workspace.config.ts`，在既有企业 fixture `App.svelte` 增加 `view=detail-workspace` 路由；真实挂载 `AutoTable + detailWorkspace`，不使用测试宿主。执行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts`，**24/24 passed**、原始 exit code `0`、duration `16.4s`（4 场景 × Chromium/WebKit/Firefox × desktop/narrow，端口 4213，`reuseExistingServer: false`），`git diff --check` 原始 exit code `0`。覆盖：详情打开后五区标题与真实 `FileList`/`AuditTimeline`/`VersionDiffViewer` 内容可见且 provider scope 绑定记录 1；附件 provider 首次失败显示通用 Retry、不泄露私有诊断、重试后恢复且调用 2 次；键盘 Escape 关闭抽屉并把焦点还给详情按钮；受控 `show` 拒绝时列表可见但详情按钮/抽屉/工作台均不出现，详情与五区 provider 读取均为 0。用例均断言 `pageerror` 为空，narrow 无横向溢出；截图 30 张在 `output/playwright/detail-workspace-browser-20261022/`。该证据使用受控内存 provider 与受控权限，**不等同真实后端或真实 RBAC**，未覆盖对象 A→B 五区联动、真实服务/持久化、真实租户/字段授权、读屏、发布包或部署。详见 [detail-workspace-browser-20261022.md](../evidence/detail-workspace-browser-20261022.md)。
- 浏览器审查修正补记（VersionDiffViewer 工具栏窄屏裁切；pi 为唯一 writer，未提交/推送/部署）：主线程抽查 `output/playwright/detail-workspace-browser-20261022/webkit-narrow-attachments-failed.png` 发现 `Unified` 按钮右侧被裁切，说明页面级无横向溢出不能代替局部控件几何断言。先只在 `detail-workspace.spec.ts` 首个场景加窄屏断言（两个模式按钮必须完全位于所有 `overflow: hidden/clip/auto/scroll` 祖先与视口内，并用真实点击切换 Unified/分栏）；生产未改时单 project 红测 `1 failed | 3 passed`、原始 exit code `1`、duration `9.0s`，失败于 `detail-workspace.spec.ts:122`，裁切祖先为 `DIV`。最小修复只复用既有 hashed 工具类别名：工具栏/按钮组 `flex-wrap`、标题块 `min-w-0`、按钮 `flex-shrink: 0`；未新增 CSS/设计 token/字体随视口缩放，未改语义色。修复后同 project `4 passed`、exit `0`、`8.5s`；全矩阵 pi 自测 `24/24 passed`（原 4 场景全部保留）、exit `0`、`43.8s`，主线程独立复跑全矩阵 `24/24 passed`、exit `0`、`38.2s`，两次独立记录、不合并；截图 30 张重新生成。主线程抽查 `webkit-narrow-attachments-failed.png` 确认 `Side by Side` / `Unified` 两个模式按钮不裁切；`git diff --check` exit `0`，四个新增浏览器文件与证据文档空白检查无问题。此时序关系：此前 pi `24/24`、exit `0`、`16.4s` 与主线程 `24/24`、exit `0`、`16.5s` 均在 `untrack` 修复**之前**，只作历史保留；当前 `untrack` 修复后 pi 单测为 `9/9`、exit `0`、`15.64s`，主线程已独立复跑同一单文件为 `9/9`、exit `0`、`17.16s`，两次独立记录、不合并。故 `43.8s` / `38.2s` 的本轮浏览器结果是修复后新证据，不与旧 `16.4s/16.5s` 合并。未运行全仓 test/build/typecheck；未做像素级视觉回归、320px 更窄视口或长文案换行验证；不据此宣称真实服务/RBAC、详情 A→B 五区浏览器联动、读屏、发布或部署完成。详见 [detail-workspace-browser-20261022.md](../evidence/detail-workspace-browser-20261022.md)。
- 本轮 A→B 浏览器补记（详情工作台；pi 为唯一 writer/执行者，未提交/推送/部署，既有脏改动保留）：在既有真实浏览器夹具中启用本地受控 `RouterProvider` 与 `syncWithLocation=true`，通过抽屉内 fixture 用户级 `Switch to previous/next record` 按钮调用 `router.go` 改写真实 `detail` route，不使用关闭再打开模拟同一抽屉切换，也不直接操作组件私有状态。受控 deferred provider 先显示 A 五区；切到 B 且 B 四个异步区仍 pending 时，A 五区文本立即消失并显示 B 关联标记/真实 loading；resolve B 后五区显示 B；再让 A 的附件迟到成功、活动/审计/版本迟到失败，B 内容不被覆盖且无错误态、不泄露迟到诊断；详情与四区 provider 每次调用均绑定 `detail-workspace-records`、recordId `1/2` 与对应 `meta.recordId`。补充“抽屉内切换后 Escape 必须清空真实 detail route”断言后，生产未改时单 project 红测 `1 failed`、原始 exit code `1`、duration `11.9s`，真实 route 仍为 A；最小修复 `AutoTable` 记录 `detailOpenedId`，当前记录已不同于打开记录时用既有 `writeURLState({ detailId: undefined })` 清空，否则保留原 `back()`。修复后同单 project 新场景 `1 passed`、exit `0`、`2.0s`，同 project 5 场景 `5/5`、exit `0`、`4.9s`；全矩阵 pi 自测 **30/30 passed**（原 4 场景 + 新增 A→B，共 5 场景 × Chromium/WebKit/Firefox × desktop/narrow）、原始 exit code `0`、duration `26.5s`，`git diff --check` exit `0`，截图 54 张。该 `30/30、26.5s` 为本轮新增结果，与主线程上轮 `24/24、38.2s`、pi 上轮 `24/24、43.8s` 分开记录、不合并。该证据使用受控 RouterProvider、受控内存 provider 与受控权限，不证明真实服务端取消/延迟语义、真实后端、真实 RBAC、租户/字段授权、读屏、发布或部署。详见 [detail-workspace-browser-20261022.md](../evidence/detail-workspace-browser-20261022.md)。
- 本轮 A→B→A 浏览器修复补记（详情工作台；pi 为唯一 writer，未提交/推送/部署）：上一轮 `closeDetail()` 只比较打开记录与当前记录，A→B→A 后两者相同但历史顶部仍为 B。仅修改 `AutoTable.svelte` 的详情关闭生命周期、`detail-workspace.spec.ts` 必要断言/类型与本证据文档、B3-05 条目。生产未改时单 project 红测 `--project=chromium-desktop -g "without returning to B"` → `1 failed`、原始 exit code `1`、duration `12.4s`，真实 route 仍为 B；最小修复记录详情路由是否在历史中切换过，关闭时仅在切换过时用既有 `writeURLState({ detailId: undefined })` 清空，否则保留原 `back()`。修复后同一单 project 绿测 `1 passed`、exit `0`、duration `2.6s`；`--project=chromium-desktop` 全组 `6/6 passed`、exit `0`、duration `8.2s`。最终全矩阵 pi 自测 **36/36 passed**（6 场景 × Chromium/WebKit/Firefox × desktop/narrow）、exit `0`、duration 约 `1.0m`；主线程独立复跑同一配置 **36/36 passed**、exit `0`、duration 约 `1.0m`，两次独立记录、不合并。`git diff --check` exit `0`。修复前 `30/30、26.5s` 仅作历史保留，不与 A→B→A `36/36` 合并。该证据使用受控 `RouterProvider`、受控内存 provider 与受控 `AccessControlProvider`，不证明真实后端、真实 RBAC、租户/字段授权、真实服务端延迟/取消、跨页面历史恢复、读屏、发布包或部署。详见 [detail-workspace-browser-20261022.md](../evidence/detail-workspace-browser-20261022.md)。
- 本轮同事件切换 provider 配置对象 + recordId 浏览器补记（详情工作台；pi 为唯一 writer，主线程审查，未提交/推送/部署，既有脏改动保留）：补明确缺口——此前浏览器五区用例只切换 recordId，未在同一次用户事件更换整个 `detailWorkspace` provider 配置对象身份。仅修改 `DetailWorkspaceBrowserFixture.svelte`、`detail-workspace.spec.ts`、`detail-workspace-browser-20261022.md` 与本条目，未改生产代码、未新增版本 API。fixture 由 `createSections(provider)` 生成两套独立配置对象图，provider 闭包捕获固定 `A`/`B` 身份写入调用日志（不读取可变当前 label），relations snippet 拆为 A/B 两版并渲染 `detail-workspace-relations-provider`；新增抽屉内用户按钮 `detail-workspace-switch-provider-next` 在同一次 `onclick` 内切换 `activeProvider` 并调用真实 `router.go`。受控 deferred 控制面改为按 `provider`+`recordId`+`section` 区分 pending，新增 `settleFor(provider, recordId, outcome, sections?)`，保留原 `settle`/`pending` 兼容，原 6 场景未改写。新增两场景：①A 五区已显示→同事件切 B/record 2→B pending 时 A 五区立即清空→B 成功显示 `attachment-record-2-B.txt` 等，精确断言 A 只有 record 1 调用、B 只有 record 2 调用（各 1 次、完整 scope `{resourceName,recordId,meta:{recordId}}`）且最终次数不变；②A 仍在途→同事件切 B/record 2→B 显示→A 附件迟到成功、活动/审计/版本迟到失败，pending 同时含 `A:1:*` 与 `B:2:*`，B 内容不被覆盖、无错误态、无 `pageerror`、不泄露迟到诊断。运行：新场景 `--project=chromium-desktop` 首次 `1 passed | 1 failed`（场景二误把仍挂起的 A:1 排除在 pending 期望外，属断言修正，非生产问题），修正后同命令 `2 passed`、exit `0`、`3.2s`；同 project 全组 `8 passed`、exit `0`、`7.1s`；全矩阵（8 场景 × 三引擎 × 两视口）**48/48 passed**、exit `0`、duration `41.7s`（本轮独立结果，不与历史 `36/36`、`30/30`、`24/24` 合并）；截图 90 张；`git diff --check` exit `0`。该证据仍为受控内存 provider/受控 RouterProvider/受控权限，不证明真实服务端取消/延迟语义、真实后端、真实 RBAC、租户/字段授权、读屏、发布或部署。
- 授权约定纠正（后续审查）：项目没有既有 `audit/read` 动作，不能把猜测当作产品授权规范。最终审计权限是父记录 `show`，默认审计读取只复用父记录 `show` 契约，未硬编码虚构的 `audit` 资源；独立审计授权仍由宿主/后端控制，本轮未完成独立审计 RBAC，不能据此声称独立审计授权已验收。`detail-workspace.test.svelte.ts` 已删除专门 `audit/read` 用例（父记录授权用例已覆盖，并在该用例中补充拒绝/撤销后默认审计 provider 不被调用的真实 `show` 检查）并撤除宿主 `auditReadAllowed` 模拟分支；当前单文件 pi 自测为 `8 passed`、exit `0`、duration `11.13s`，主线程随后独立复核同一单文件为 `8 passed`、exit `0`、duration `10.83s`，两次独立运行分开记录、不合并；`git diff --check` exit `0`。此前含该用例的 `9 passed`、exit `0`、duration `11.11s` 与更早的 `2 passed` 均为历史计数，不与当前 `8/8` 合并。独立审计 RBAC、真实 Provider、浏览器/读屏、发布仍未验收。
- 版本选择契约只读审计（2026-10-23，历史记录，2026-10-27 已由用户决策解除阻塞）：只读核对 `VersionDiffViewer`、`DetailWorkspace` versions provider、记录版本 API 与既有 tests/docs。结论：不存在明确的“选中记录版本 → oldValue/newValue”公开契约。现有 `DetailWorkspaceVersionData { oldValue, newValue, ... }` 与 `versions` provider/snippet 只把当前 scope 的旧/新载荷交给真实 `VersionDiffViewer`；`DetailWorkspaceProvider` scope 仅有 `resourceName`/`recordId`/`meta`，没有版本 ID/版本列表/选中动作，`packages/core/src` 也未定位记录版本 read API 或 schema。既有 `detail-workspace.test.svelte.ts` 已覆盖 versions 的加载、记录 A→B、迟到失败与父记录 `show` 拒绝，但没有“选择历史版本”的输入，不能当作本契约证据。按约束未凭空新增版本 API、选择状态或后端 schema，也未新增重复通用异步/静态渲染测试；仅更新证据文档与本矩阵，运行 `git diff --check` 原始退出码 `0`。2026-10-27 用户已决策：保留宿主 `oldValue/newValue` 差异展示；版本列表/选择/恢复由业务宿主负责；SVAdmin 不提供版本服务/list/select/restore。先前“需产品契约”的阻塞据此关闭，不得再把该范围当作待决策本地缺口或重复补本地 case。

### B3-06 权限与组织管理

- 原始要求：继承、拒绝原因、字段权限、服务端边界。
- 直接证据：[roles-settings-feedback-20261022.md](../evidence/roles-settings-feedback-20261022.md)、[roles-settings-locale-20261022.md](../evidence/roles-settings-locale-20261022.md)、[permission-matrix-form-identity-20261022.md](../evidence/permission-matrix-form-identity-20261022.md)、[permission-matrix-browser-20261022.md](../evidence/permission-matrix-browser-20261022.md)、[permission-matrix-fail-closed-20261022.md](../evidence/permission-matrix-fail-closed-20261022.md)、[user-management-query-scope-20261021.md](../evidence/user-management-query-scope-20261021.md)。
- 证据覆盖边界：证据覆盖角色读取/保存/重试、权限实例隔离、语言切换、本地授权按钮和跨浏览器；`permission-matrix-fail-closed-20261022.md` 记录 `isGranted` 仅在严格返回 `true` 时显示已授权，严格 `false` 仍可切换，其他值/继承值/未知状态/抛错一律渲染为未按下且禁用、不回调也不提交宿主表单；该行为不新增继承或拒绝原因协议，不等于真实 RBAC。真实 RBAC、继承、拒绝原因和字段权限仍未证明。
- 仍未证明的验收：服务端 RBAC/字段权限/拒绝原因、跨用户并发、真实租户授权、读屏和发布。
- 下一项可执行动作：本地非布尔决策 fail-closed 已由窄回归和主线程独立复核覆盖（pi 基线 7/7，新增红测 4 failed / 7 passed，修复后 pi 11/11，主线程独立 11/11、exit `0`、duration 4.19s）；不再重复该窄用例。下一步只能在获得真实 RBAC/组织服务与授权后验证继承、拒绝原因、字段权限和服务端边界，不得用本地 fail-closed 结果外推。模块为 `packages/ui` PermissionMatrix/RolesSettings。
- 2026-10-23 无障碍语义补记：仅修改 `PermissionMatrix.svelte`、`RolesSettings.svelte` 及直接回归测试。权限按钮保留既有 `aria-label`，并以 `aria-describedby` 关联当前角色、资源和动作的上下文；角色按钮增加 `aria-pressed`；PermissionMatrix 成功/警告反馈使用 `role="status"` + `aria-live="polite"`，错误反馈使用 `role="alert"` + `aria-live="assertive"`；RolesSettings 保存期间稳定容器暴露 `aria-busy="true"`。主线程独立复跑 PermissionMatrix **15/15**、RolesSettings 关联 **21/21**、PermissionMatrix 浏览器矩阵 **6/6**（Chromium/WebKit/Firefox × desktop/narrow）和 RolesSettings 浏览器矩阵 **66/66**，均 exit `0`；`git diff --check` exit `0`。pi 同轮单测结果为 15/15、21/21，作为独立记录保留，不合并计数。该证据仍不等于屏幕阅读器实机、真实 RBAC/组织服务、真实租户授权、服务端并发写入、发布或部署完成。
- 外部依赖：真实 RBAC/组织服务、屏幕阅读器、发布授权。
- 状态：本地非布尔授权决策 fail-closed 已验证（pi 与主线程独立结果分开记录），文档其余部分未全部复跑；真实 RBAC、继承、拒绝原因、字段权限、跨用户并发、真实租户授权、读屏和发布仍未验收；局部证据不足；需外部验收。

### B3-07 审批中心

- 原始要求：待办、历史、意见、状态迁移与冲突。
- 直接证据：[approval-center-refresh-feedback-20261022.md](../evidence/approval-center-refresh-feedback-20261022.md)、[approval-center-idempotent-retry-20261022.md](../evidence/approval-center-idempotent-retry-20261022.md)、[approval-center-version-conflict-20261022.md](../evidence/approval-center-version-conflict-20261022.md)、[approval-center-browser-20261022.md](../evidence/approval-center-browser-20261022.md)、[approval-center-cross-browser-20261022.md](../evidence/approval-center-cross-browser-20261022.md)、[approval-action-error-feedback-20261022.md](../evidence/approval-action-error-feedback-20261022.md)。
- 证据覆盖边界：证据覆盖刷新/提交互斥、意见草稿、幂等键复用、失败恢复、`VERSION_CONFLICT` 后保留对话框/意见/待办状态且不误报成功，以及跨浏览器。本轮另新增可选 `conflict-action` fixture 模式与独立 `approval-center-conflict.spec.ts` / `playwright.approval-conflict.config.ts`：真实点击 Approve、填写意见、Confirm，断言冲突提示在 dialog 内、意见保留、dialog 未关闭、原 pending 可见、不出现 approved，transition 恰好一次且 `expectedVersion`/`comment`/上下文精确；随后 Cancel 并 Refresh 读回受控服务端 `current` 状态，旧动作消失。该浏览器配置在 Chromium/WebKit/Firefox 的 desktop/narrow 共 **6/6 passed**、原始 exit code `0`，端口 `4221`，截图在 `output/playwright/approval-center-conflict-20261022/`；主线程独立复核最新同一配置为 **6/6 passed**、exit `0`、duration `6.2s`，pi 的 **6/6 passed**、exit `0`、duration `7.2s` 作为独立记录保留，两者不合并。主线程已抽查 `webkit-narrow-conflict.png`，意见、冲突提示与 Confirm/Cancel 在视口内且无明显文字遮挡；该抽查不是读屏认证。这些仍是本地受控内存 Provider，不证明真实服务端幂等、版本冲突或状态迁移；版本冲突组件用例在未改生产代码时直接通过，本轮未制造生产改动。
- 仍未证明的验收：真实审批 Provider、服务端版本冲突/去重、权限、历史一致性、读屏和发布。
- 下一项可执行动作：本地受控组件契约与真实浏览器冲突路径已补；下一步只能在获得真实审批 Provider/服务端授权后验证真实版本冲突、幂等与状态迁移，不得用本地 fixture 结果外推。本轮版本冲突组件契约回归 pi 自测为 `20/20 passed`、exit `0`、`8.35s`；主线程唯一已确认单测结果为同一命令 `20/20 passed`、exit `0`、`6.89s`。此前 `19/19 passed`、`13.64s` 没有当前可验证执行证据，已从本轮结果移除，不能作为主线程基线或本轮结果。两次当前结果分开记录、不合并；模块为 `packages/ui` ApprovalCenter。
- 外部依赖：真实审批 Provider、版本/幂等后端、屏幕阅读器、发布授权。
- 状态：组件契约已验证且主线程独立复核最终同一命令（`20/20 passed`、exit `0`、`6.89s`；pi 自测 `20/20`、`8.35s` 单独保留；`19/19`、`13.64s` 无本轮执行证据，不能作为本轮结果）。真实浏览器冲突路径已由新增配置验证：主线程独立复核最新同一配置 `6/6 passed`、exit `0`、`6.2s`，pi `6/6 passed`、exit `0`、`7.2s` 作为独立记录保留（三引擎 desktop/narrow，端口 `4221`）。主线程抽查 `webkit-narrow-conflict.png` 未见明显遮挡，但不构成读屏认证。未修改生产代码或 Provider 协议；真实审批 Provider、RBAC、服务端冲突/幂等、历史一致性、读屏与发布仍未验收；局部证据不足；需外部验收。

### B3-08 任务与通知中心

- 2026-10-24 最新跨引擎证据：主线程独立运行专属
  `playwright.task-list.cross-browser.config.ts` **36/36，exit 0，30.0s** 和
  `playwright.notifications.config.ts` **6/6，exit 0，9.9s**，覆盖三个引擎、
  两个视口。初次任务 30/36 的六项失败来自固定 Tab 顺序假设；修正为有界真实
  键盘遍历，保留焦点、动作和非提交断言，未改生产组件。下文 Chromium-only
  与“跨浏览器矩阵待补”为阶段历史；真实服务、读屏、发布仍未验收。

- 后续独立复核（2026-10-22）：主线程在最终修正版执行 `bunx vitest run src/components/task-action.test.svelte.ts`，**49/49 passed**、exit `0`、`7.58s`；`git diff --check` exit `0`。下文“主线程修正后结果未记录”描述的是 pi 交付时点，现已补齐，不合并两次运行。

- 原始要求：刷新恢复、任务状态、重试和取消能力声明。
- 直接证据：[task-list-query-feedback-20261022.md](../evidence/task-list-query-feedback-20261022.md)、[task-list-capabilities-20261022.md](../evidence/task-list-capabilities-20261022.md)、[task-list-selection-20261022.md](../evidence/task-list-selection-20261022.md)、[task-list-browser-20261022.md](../evidence/task-list-browser-20261022.md)、[task-submit-refresh-capabilities-20261022.md](../evidence/task-submit-refresh-capabilities-20261022.md)、[task-action-default-feedback-20261022.md](../evidence/task-action-default-feedback-20261022.md)、[notification-settings-error-feedback-20261022.md](../evidence/notification-settings-error-feedback-20261022.md)。
- 证据覆盖边界：证据覆盖查询归属、能力缺失、选择/重试/取消、默认失败提示、时间显示和通知设置；`task-action-default-feedback-20261022.md` 记录同一任务重试/取消共享在途声明、重复点击与兄弟动作零额外调用、失败释放、选择状态保持、能力缺失不渲染动作。后续审查修正卸载释放 claim 的并发窗口：新增真实 TaskList `failed→running` 反例后单文件为 **3 failed / 46 passed（49）**，最小修复后 pi 同命令 **49/49 passed**、exit `0`、`7.57s`；新增检查还覆盖 Provider/tenant/taskId 独立发起与卸载后重新挂载同任务仍锁定。主线程修正前启动的 45/45 属于旧基线，本轮不代写主线程修正后结果，也不与 pi 合并。真实任务服务、持久化恢复、服务端幂等/取消、跨浏览器错误态和读屏未证明。
- 仍未证明的验收：真实任务/通知 Provider、持久化任务恢复、服务端幂等/取消、跨浏览器完整矩阵、读屏和发布。
- 下一项可执行动作：本地组件并发契约已补并复跑；下一步只能在获得真实任务 Provider/服务端授权后验证真实重试/取消并发、幂等、权限与最终状态，不得用本地 stub 结果外推。
- 外部依赖：真实任务/通知服务、屏幕阅读器、发布授权。
- 状态：同任务动作互斥组件契约本轮已验证（pi 与主线程均为最终修正版 49/49，且 `git diff --check` 通过）；文档记录的其余部分未全部复跑；真实任务/通知 Provider、持久化任务恢复、服务端幂等/取消、跨浏览器完整矩阵、读屏和发布仍未验收；局部证据不足；需外部验收。

- 最新本地消费者复核（2026-10-23）：pi 与本线程均在 `scripts/fixtures/enterprise-ui` 目录独立运行 `bunx playwright test --config playwright.task-list.config.ts --reporter=list`，各为 **12/12 passed、exit 0**；本线程 `9.9s`。覆盖 Chromium desktop/narrow 的任务详情、键盘可达性、表单提交隔离、窄屏横向滚动、失败脱敏和显式重试恢复。此前从仓库根目录运行同配置产生 `4 passed / 8 failed`，失败均为 fixture 相对截图目录的 `EACCES`，不计产品结果；真实任务服务、持久化、RBAC、读屏和发布边界不变。
- 查询契约补强（2026-10-23）：pi 在 `task-list-query.test.svelte.ts` 新增 3 个组件级回归，主线程独立复跑最终 **23/23 passed、exit 0**、`git diff --check` 通过；覆盖 `pagination`/`filters`/`sorters`/`meta` 原样透传、`params` 变化触发新查询并显示新结果、旧请求迟到不覆盖新参数结果。未改生产代码；仍不证明真实 HTTP/任务服务、AbortSignal 取消、连续快速切换、DLQ 参数、租户隔离、持久化、读屏或发布。
- 租户查询边界补强（2026-10-23）：pi 仅扩展测试 Host 的 `tenant` 输入并新增两条组件级回归，主线程独立复跑最终 **25/25 passed、exit 0**、`git diff --check` 通过；覆盖 provider.list 收到当前 `meta.tenantId`、租户切换触发新查询，以及旧租户迟到结果不覆盖新租户结果。未改生产组件；仍不证明真实 HTTP/RBAC、服务端租户隔离、持久化、读屏或发布。
- 2026-10-23 通知设置浏览器补记：主线程独立运行 `playwright.notifications.config.ts`，桌面与窄屏 **2/2 passed**、exit `0`、4.6s；覆盖失败时单一错误归属与保存草稿保持。该结果仍是受控 fixture，不证明真实通知服务、持久化、RBAC、读屏或发布。

### B3-09 多标签工作区

- **当前更正（2026-10-27，替代下方旧记录）**：显式 `maxTabs`、逻辑 `id+path`
  LRU、固定/dirty/active/closable 保护已实现；`workspace-tab-state` 的 `clear()`
  回读确认、失败关闭信封与同 storage 共享阻断已实现。完全不可写 storage 的跨新
  运行时删除仍不保证，`storage: 'failed'` 必须由宿主处理；淘汰策略已确定，不再
  等待产品选择。下方 2026-10-24 及更早的“待产品确认淘汰策略”“新适配器读取旧
  持久化数据未解决”等记录均为历史，已被本段替代；历史 `13/13`、`81/81` 不冒充
  当前计数。当前证据引 [closeout B3-09 三引擎复验](enterprise-ui-closeout-20261024.md#b3-09-三引擎生命周期矩阵复验2026-10-26)
  与 [跨窗口/分发续接](enterprise-ui-closeout-20261024.md#本地分发与跨窗口续接复验2026-10-26)。

- 2026-10-24 导航依赖审查：字体延迟和 Firefox 系统代理路径已有受控/连接地址
  证据，专属测试隔离外部字体并按引擎配置启动参数。主线程最终定向三引擎
  **9/9**（50.9s），ESLint/diff 通过；未重跑全 78 条，历史偶发超时唯一根因
  仍未完全确定。旧 context-proxy 配置的 **17/18** 不被后续通过掩盖；
  见 `../evidence/workspace-navigation-readiness-20261024.md`。
- 2026-10-24 最新 SPA 续接：菜单离开被 URL 同步阻止、SPA 最新滚动丢失均已修复。
  新增真实菜单往返与资源清理断言在三引擎通过；全局监听重入不叠加、延迟布局
  显式释放也已覆盖。主线程最终专属矩阵 **77/78**（7.7m），Firefox 一例
  `reload` 等待超时，隔离复跑 **1/1**；根因未确认，不记录为一次 78/78。
  目标严格类型 **0**，定向 ESLint/diff 通过，5187 登录/菜单 smoke 通过。
  见 `../evidence/workspace-lifecycle-cross-browser-20261024.md`。
  下文 SPA/跨引擎未覆盖说明保留作历史，不再作为当前缺口；
  跨窗口、真实服务、读屏、发布与偶发刷新超时仍未验收。

- **跨实例关闭清理当前复验（2026-10-24）**：主线程适配器单文件
  **20/20**、严格类型 **0**、生产文件 lint/diff 通过；UI build 后真实 example
  workspace **24/24（2.5m）**。删除失败会尝试写关闭信封；同 storage 对象共享
  阻断只在新快照写入回读一致后退休。不同 wrapper 的持久化关闭信封、失败
  recapture 和静默 no-op 均有单测。完全不可写时跨刷新删除仍不保证，
  不能据此关闭生产存储、跨窗口和外部验收。
- **滚动边界当前复验（2026-10-24）**：主线程独立 Chromium workspace
  **24/24（2.4m）**、目标严格类型 **0**、定向 ESLint/diff 通过。
  已覆盖受控晚显示、非活动标签恢复、真实水平 owner 刷新恢复、存储不可用的
  会话内切换、取消后切换/刷新不复活旧位置、静止观察者/rAF 不空转。
  测试专用生产包装已移除。真实慢 Provider、SPA 清理计数、跨引擎与跨窗口、
  权限/生产存储/读屏/发布仍待验收；见
  `../evidence/workspace-scroll-boundaries-20261024.md`。下方 16/16 等为历史阶段。
- **2026-10-24 当前消费者补记**：真实 AutoForm 编辑标签和关闭保护已接入，
  公开 `onDirtyChange` 与实际 guard 共用真实表单状态，覆盖非原生关系选择器、
  取消保留、保存清 dirty、确认关闭清理、刷新不恢复草稿。主线程独立 reset
  **13/13**、表单契约 **102/102**、UI build 后 workspace 浏览器 **16/16**
  （1.1m，Chromium）、定向 ESLint/diff 通过。下方旧缺口及计数保留为历史；
  当前仍缺完整滚动/跨窗口、真实身份/Provider/RBAC、读屏和发布。详见
  `../evidence/workspace-tabs-consumer-20261024.md` 的“真实 dirty 回调修正”。

- 当前状态补记（2026-10-24 收尾）：最终生产源码 UI 定向 build exit 0（仅既有
  `import.meta.env` 打包警告）；build 结束后独立运行 workspace 专属 spec
  **12/12 passed**、exit 0、约 1.2m，12 项实际执行无 skip，为本轮最新浏览器结果
  （Chromium），与下文历史 12/12 分属不同批次，不合并计数。逐文件测试仍为
  `auto-table-interactions` 59/59、`list-state` 20/20、`saved-list-views-model`
  30/30，均 exit 0；8 个目标 Svelte/TS 定向 ESLint 与 `git diff --check` exit 0。
  局部类型检查把虚拟源 `AutoTable`、`DraggableHeader`、
  `AutoTableIdentityHydrationHost` 与真实源 `list-state.svelte.ts`、
  `saved-list-views.svelte.ts`、`saved-list-views.ts` 一并纳入
  strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess/
  noPropertyAccessFromIndexSignature、`skipLibCheck:false`，完整目标
  syntactic + semantic 诊断总数 **0**；此前 AutoTable 的 6 个 TS7006 是前轮漏纳
  `DraggableHeader` 虚拟源造成的类型丢失，不是基线错误。对应回归已去掉诊断
  message 正则过滤，改为断言完整目标 diagnostics 为 `[]`。覆盖 scope 退休、
  首帧请求隔离、首次身份延迟保留、新 session 隔离、受控分页排序、活动 saved
  view 标记；真实 dirty 表单消费者已由后续 `AutoForm.onDirtyChange` 修正接入，
  完整滚动边界、跨窗口、真实后端/RBAC/存储、读屏与发布仍未验收。下文的
  12/12、9/9、8/8、7/7 等均为历史阶段记录，保留不累计。

- 最新滚动刷新续接：example 显式注入 adapter sessionStorage，pagehide 采样
  可见面板，跳过隐藏 DOM 的假 0，hydrate 后有界等待表格高度恢复滚动。
  主线程最终专属 spec **9/9**、exit `0`、37.0s（8 desktop + 1 窄视口），
  局部严格类型 0，定向 ESLint/diff 通过。直接证据为正常加载时活动标签的
  纵向刷新恢复与关闭重开归零；水平/非活动/SPA 重返/慢数据/存储失败未验收。
  查询/草稿恢复仍未完成；后面的 7/8 项为历史阶段结果，不累计。

- 最终 example 增量：工作区局部 grid 收缩与标题换行修复后，主线程独立
  专属 spec **8/8**、exit `0`、32.5s（7 desktop + 1 场景内设置 390x844）。
  元素级边界与最终截图均已核对；仅 Chromium，不将其称为完整跨引擎矩阵。
  下文 7/7 为增加局部布局用例前的阶段结果。

- example 消费者续接（2026-10-24）：新增实际菜单 `/workspace`，复用现有 CRM
  资源与 AutoTable，并保留每个已挂载实例的搜索/分页。主线程审查后 pi 修复
  默认标签刷新复活、最后标签关闭 URL、隐藏前滚动采样与空态历史 URL；
  主线程最终独立 `playwright.workspace-tabs.config.ts` **7/7**、exit `0`、
  26.1s（Chromium desktop；其中滚动场景实际执行，未 skip）。
  当前标签集合/活动标签按 example identity 显式 sessionStorage 保存，不等于
  查询/滚动持久化或生产租户隔离。共享 QueryClient 不删除，避免误清其它消费者；
  不声称缓存回收。修复 AdminApp `Component` 本地别名与声明生成旧类名冲突后，
  example 使用正常包入口；UI build 通过，三个接入文件局部严格类型诊断为 0。
  证据：[workspace-tabs-consumer-20261024.md](../evidence/workspace-tabs-consumer-20261024.md)。
  本地真实草稿、离开工作区后的查询/滚动恢复、跨窗口、真实 Provider/存储、
  读屏、性能与发布仍未验收。下文旧的“无消费者”描述保留为阶段历史。

- 最新状态（2026-10-24）：已实现显式 `maxTabs`、逻辑 LRU、原子准入及受保护标签规则；
  主线程淘汰单测 37/37、关闭保护 29/29、受控浏览器 24/24。下文“尚未实现淘汰”
  为阶段历史，不再作为当前缺口；以 `b3-09-tab-eviction-decision-20261023.md`
  的最终消费者验证和 `enterprise-ui-remaining-20261023.md` 为准。真实宿主、Provider、
  生产存储、读屏及发布仍未验收。

- 原始要求：路由/查询/草稿/滚动恢复、关闭保护与淘汰。
- 直接证据：[multitab-close-protection-20261022.md](../evidence/multitab-close-protection-20261022.md)、[multitab-state-restore-20261022.md](../evidence/multitab-state-restore-20261022.md)、[multitab-state.spec.ts](../../scripts/fixtures/enterprise-ui/multitab-state.spec.ts)、[MultiTabStateBrowserFixture.svelte](../../scripts/fixtures/enterprise-ui/MultiTabStateBrowserFixture.svelte)；[MultiTabKeepAlive.svelte](../../packages/ui/src/components/MultiTabKeepAlive.svelte)、[workspace-tab-state.ts](../../packages/ui/src/components/workspace-tab-state.ts) 与 [multitab-gantt.test.svelte.ts](../../packages/ui/src/components/multitab-gantt.test.svelte.ts)、[multitab-close-protection.test.svelte.ts](../../packages/ui/src/components/multitab-close-protection.test.svelte.ts)、[workspace-tab-state.test.svelte.ts](../../packages/ui/src/components/workspace-tab-state.test.svelte.ts)。
- 证据覆盖边界：既有断言只覆盖渲染、Space 激活和刷新。首轮真实组件关闭保护红测 **7 failed / 7**，修复后 **10/10**。第二轮主线程复核指出实例替换/固定/不可关闭/卸载与重复点击、批量交叉风险，新增 8 条 deferred 反例（**8 failed / 7 passed**），修复后 **15/15**。第三轮审查发现拒绝后无法重试、`Object.defineProperty` 变异调用方对象且指纹误删同内容冻结新实例、批量同时启动多个确认，新增 3 条反例（**3 failed**）后修复至 **18/18**。第四轮审查发现 `splice` 变异调用方数组、冻结数组抛错、`visibleTabs` 只覆盖列表、未删除的已允许 intent 留在 WeakMap、卸载后继续调用后续 guard；新增 4 条反例（冻结数组单关/全关、plain 数组最后关闭后按钮消失、目标消失取消后重新 guard、卸载后停止后续 guard），旧版下 **4 failed / 18 skipped**，最终修复后单文件 **22/22 passed**，`git diff --check` 通过。实现改为组件内统一关闭操作锁、对象引用捕获、批量顺序确认、最后一次 immutable filter 赋值；不改写调用方数组/对象，不再使用 WeakMap 授权缓存。第五轮新增显式 `WorkspaceTabState` 适配器与真实标签栏消费者宿主，先写红测（适配器模块未解析，**0 test / 1 failed**），实现后修正持久化损坏用例的读取方式，最终单文件 **6/6 passed**；覆盖切换保留查询/滚动、草稿关闭保护、版本化快照刷新恢复、租户/标签/path 隔离、损坏快照忽略、关闭清理与卸载 dispose。第六轮主线程复核不通过：持久化读取把 `draft: "true"`、对象 query、负/非有限 scroll 归一化为合法快照，clear 在 removeItem 抛错后同实例仍可回读，真实宿主未在初始挂载恢复也未在卸载前 capture。同一单文件新增 5 条反例后红测 **4 failed / 7 passed（11）**；修复为严格版本化信封和值类型校验、clear 失败 tombstone 与 `{ memoryCleared, storage }` 显式结果、宿主首次挂载恢复并在卸载前保存当前查询/滚动，最终 **11/11 passed**。适配器不接管路由，淘汰仍未实现。第七轮新增专属真实浏览器 fixture（直接挂载真实
`MultiTabKeepAlive` + 适配器，注入带 `b3-09-fixture:` 前缀的受控 session storage），
在 Chromium desktop/narrow 覆盖两标签查询/滚动互不串、切回恢复、冻结标签数组后草稿关闭
保护、清除草稿后关闭、重开同 id 不恢复旧快照；先用始终放行的 `onbeforeclose` 得到
**2 failed / 2**，恢复后 pi **2/2 passed**、exit `0`、`2.8s`；主线程随后独立复跑
**2/2 passed**、exit `0`、`3.0s`，截图保存于
`output/playwright/multitab-state-browser-20261022/`；相关适配器单测复跑 **11/11**、
`git diff --check` exit `0`。适配器单文件 pi 与主线程均为 **11/11**。该浏览器验收只覆盖
本地受控 fixture，不是真实产品路由或后端完成。
- 仍未证明的验收：真实产品路由接入、Provider/查询缓存协同、浏览器前进后退与跨标签页恢复、淘汰策略、内存/性能、读屏和发布；持久化仅验证注入式 storage 契约，生产 storage 选型未定。三引擎 desktop/narrow 的受控 fixture 当前为 **12/12**（历史 6/6 保留，不冒充当前），不再把跨浏览器本地矩阵列为当前缺口。
- 2026-10-23 主线程扩展跨引擎配置：同一受控 fixture 已从 Chromium desktop/narrow 扩展为 Chromium/WebKit/Firefox × desktop/narrow，主线程独立复跑 **6/6 passed**、exit `0`、13.4s；用于验证当前标签状态隔离、草稿关闭保护和快照清理，不扩大为真实路由、Provider、淘汰策略或读屏验收。
- 2026-10-23 tab DOM 语义补记：当前 `MultiTabKeepAlive` 将关闭按钮置为 tab 的独立兄弟节点，并为 tab 增加显式 `aria-label`、关闭动作 `aria-describedby` 与 presentation 外层语义；主线程独立复跑关闭保护单测 **23/23**、浏览器矩阵 **6/6**（Chromium/WebKit/Firefox × desktop/narrow），均 exit `0`。仍不等于屏幕阅读器实机验收。
- 2026-10-24 标签状态与键盘增量：managed，pi 为唯一 writer，主线程独立审查，未提交/发布/部署。`workspace-tab-state.ts` 在同 id 已有内存快照且 `path` 不匹配时直接返回 `undefined`，不再读旧 storage 覆盖内存，修复 storage.setItem 失败后旧 path restore 使新 path 草稿丢失。新增测试覆盖 `capture`/`markDraft` 独立接管、`false` 清草稿、旧 path 不可读，以及新适配器仍读旧 storage 的未解决风险；主线程最终单文件 **13/13 passed、exit 0、5.39s**。`MultiTabKeepAlive` 支持 ArrowLeft/ArrowRight 循环、Home/End、唯一 roving tabindex、active 无匹配时第一个可达、Enter/Space 保持激活，并为 tablist 增加 `aria-orientation="horizontal"` 静态语义，不改关闭保护/API/淘汰策略；主线程 `multitab-close-protection` 单文件 **29/29 passed、exit 0**（上一阶段 28/28 保留为历史）。新增真实键盘浏览器场景与两份 query 恢复；主线程 `playwright.multitab-state.config.ts` 为 Chromium/WebKit/Firefox × desktop/narrow **12/12 passed、exit 0、12.5s**，其中旧 6 场景 + 新增 6 场景，不能声称新增 12；该 12/12 仍是前一阶段键盘实现证据，未因本轮仅增加静态 aria 属性重复运行。两个生产模块 ESLint 通过，`git diff --check` 通过；`workspace-tab-state.test.svelte.ts` 仍有 3 个原有非空断言 lint 错误，`multitab-state.spec.ts` 仅旧 scroller 未使用 lint 错误（新 invoice 未使用已删除），不称全文件 lint 通过。历史 11/11、23/23、28/28、6/6 保留标历史，不冒充当前。未跑全仓测试；真实路由/Provider/生产 storage/淘汰策略/读屏/发布仍未验收，narrow 不是移动视觉验收，新适配器读取旧持久化数据的风险仍未解决，整体未完成。
- 下一项可执行动作（历史，已被本节顶部 2026-10-27 更正替代）：先由产品确认 [B3-09 淘汰策略决策记录](enterprise-ui-remaining-20261023.md#b3-09-多标签工作区) 中的标签数量上限、LRU、固定/dirty 标签与存储边界，再补 `maxTabs`/LRU 窄用例；真实路由/Provider 接入需另立消费者任务，不能由适配器单测外推。
- 外部依赖：真实路由/存储、性能环境、发布授权。
- 状态（历史，已被本节顶部 2026-10-27 更正替代）：历史 **22/22**、**11/11**、15/15、18/18、**28/28**、6/6 均为历史记录，保留标历史，不冒充当前。2026-10-24 当前：关闭保护单文件 **29/29**、标签状态适配器单文件 **13/13**、Chromium/WebKit/Firefox × desktop/narrow 受控浏览器 fixture **12/12**（旧 6 场景 + 新增 6 场景，属前一阶段键盘实现证据，未因静态 `aria-orientation` 重复运行）；生产组件 ESLint 与 `git diff --check` 通过。查询/滚动/草稿快照契约由显式适配器覆盖，并补齐键盘 roving tabindex 与双 query 恢复；但 clear 的跨新实例持久化删除仍未保证，新适配器读取旧持久化数据的风险仍未解决，真实产品路由/Provider 接入、生产 storage 选型、淘汰策略、内存/性能、读屏和发布仍未验收，局部证据不足；需产品决策与外部验收。

> B3-09 文档状态补充（2026-10-24）：上方较早的阶段记录中“新适配器读取旧
> 持久化数据的风险仍未解决”属于历史快照。当前 v1 已对未登录 fallback 保留
> 旧键只读兼容，显式身份不回退旧匿名键，未知版本、损坏或关闭信封 fail closed，
> 不做猜测迁移。最新定向证据见
> [workspace-tab-storage-compatibility-20261024.md](../evidence/workspace-tab-storage-compatibility-20261024.md)；
> 真实路由、生产 storage、性能、读屏和发布仍未验收。

### B3-10 仪表盘

- 最新复核（2026-10-22）：截图 helper 修正后主线程独立专属矩阵 **18/18 passed**、
  exit `0`、`1.2m`；抽查新 WebKit 窄屏详情截图确认淡入结束、字段和返回按钮可见。
  下文“新截图待主线程复核”为 pi 交付时状态，现已补齐，不与历史测试次数合并。
- 原始要求：全局筛选、时间范围、钻取与错误状态。
- 直接证据：[dashboard-query-feedback-20261021.md](../evidence/dashboard-query-feedback-20261021.md)、[dashboard-enterprise-contract-20261022.md](../evidence/dashboard-enterprise-contract-20261022.md)、[dashboard-workspace-consumer-20261022.md](../evidence/dashboard-workspace-consumer-20261022.md)、[dashboard-collapsible-hook/README.md](../evidence/dashboard-collapsible-hook/README.md)、[surface-query-feedback-20261021.md](../evidence/surface-query-feedback-20261021.md)、[svar-resource-query-feedback-20261021.md](../evidence/svar-resource-query-feedback-20261021.md)。
- 证据覆盖边界：`dashboard-query-feedback-20261021.md` 覆盖多查询错误归属、局部重试、未知占位、Surface/SVAR 错误文案和折叠钩子。`dashboard-enterprise-contract-20261022.md` 新增并验证 `DashboardQuery.timeRange`（UTC ISO、日历合法性与顺序）、`DashboardDrilldown` 类型化公开契约、`DashboardView` 受控 `timeRange`/`onDrillDown`、metric/text 钻取、失败后清空旧数据并用当前筛选重试，以及筛选变化后丢弃迟到响应。主线程审查追加严格日历与反应式嵌套修改：首轮红测 core **1 failed**、组件 **3 failed / 3 passed**；第二轮红测 core **1 failed / 9 passed**、组件 **3 failed / 6 passed**，覆盖 `2026-02-29`/`24:00`、真实宿主原位修改 `filters[0].value`/`timeRange.from`、加载/失败隐藏旧数据、迟到响应丢弃和钻取绑定已加载查询。第三轮只补 UI：红测 **3 failed / 12 passed（15）**，覆盖钻取同步抛错/异步拒绝脱敏提示、二次点击成功清理、切查询/卸载隔离、Provider 篡改 request 后载荷仍独立，以及无回调时保留 `href` 链接；修复后组件 **15/15**、`git diff --check` 通过，Core 本轮未修改未重跑（主线程当前 `10/10` 独立保留）。该证据是组件与解码器契约，不是内置筛选栏、真实业务闭环或真实 Provider 验收。`dashboard-workspace-consumer-20261022.md` 进一步把消费者提升到 example 真实页面入口：`example/src/features/dashboard/DashboardWorkspace.svelte` 接入 `AdminApp` 的 `/` dashboard snippet（`LazyDashboard` → `Dashboard.svelte`），Provider 每次通过 `adminContext.getDataProvider().getList` 读取 movements/orders/todos，失败直接 reject，刷新/重试重新读取；region 映射既有仓库并拒绝未知值，日期按 UTC 契约校验，三类指标标签显式标注 warehouse/date/all 口径。上一轮真实入口 **4/4、11.8s/11.9s** 只证明控件、URL 和页面存在，不证明聚合正确或钻取明细，现作为历史证据保留。续轮先红后绿：单文件数据测试首次目标模块缺失、0 test；真实入口补齐记录/未知 region 断言后修复前 **4 failed / 2 passed**；修复后单文件 **4/4 passed**、exit `0`、`639ms`（最终复跑 `677ms`），真实入口 Chromium desktop/narrow **6/6 passed**、exit `0`、`12.8s`（最终复跑 `13.4s`）；fixture 复用同一组件仅注入受控 Provider，**6/6 passed**、exit `0`、`4.7s`（最终复跑 `4.8s`），另覆盖受控失败脱敏提示与 `Retry`。钻取现展示已筛选 movement/order/open-todo 记录及 `recordLink`，刷新后同条件恢复，不再只显示 Target id。本轮继续修正日期契约：`dashboard-workspace-data.ts` 删除自写 `validInstant`/字符串顺序比较，改复用 core `decodeDashboardQuery`；新增 `.1Z`/`.10Z` 同刻合法与 `.11Z`/`.1Z` 同秒逆序红测，修复前单文件 **2 failed / 4 passed（6）**，修复后 **6/6 passed**、exit `0`、`1.29s`。真实 entrance e2e 新增实际点击 `Initial receiving` → `/stock_movements/show/1` 详情（record id/`Initial receiving`/`Quantity`）→ 页面 `Back` 恢复精确筛选、钻取和两条 records → 刷新再恢复，不使用 `page.goBack()` 冒充。专属配置扩展为 Chromium/WebKit/Firefox × desktop/narrow，最终 **18/18 passed**、exit `0`、`1.0m`、`workers: 1`；初次并行全矩阵 **17/18**，firefox-narrow 在 `page.reload`/登录导航超时，单跑通过、串行全矩阵通过，该并发超时保留为执行环境记录。`git diff --check` exit `0`；本轮未跑全量测试/架构检查/typecheck。主线程随后独立复核上一版：浏览器 **18/18 passed、1.2m**，example 配置单文件 **6/6 passed、1.10s**，`git diff --check` exit `0`；主线程首个从根目录未带 example 配置的 vitest 因 `$state` 得到 **0 test**，随后按实际 example 配置运行成功，该错误命令仅独立记录、不计入单测结果。主线程抽查发现旧 `webkit-narrow-detail.png`/`chromium-desktop-detail.png` 捕获淡入低 opacity 中间态，不能作为稳定视觉证据。本轮只改专属 e2e 截图 helper：`page.screenshot({ animations: 'disabled' })`，详情截图遍历容器及祖先等待有限 `getAnimations()` 完成并断言 computed `opacity >= 0.999`，不使用 sleep、不改生产视觉、不放松断言；pi 重跑 **18/18 passed、exit 0、1.4m**，`git diff --check` exit `0`，新 detail 截图待主线程复核；按指令未重跑未改 core/数据单测。本地演示/受控 Provider 仍不是真实 Dashboard 后端、RBAC 或生产路由验收。
- 仍未证明的验收：生产 Dashboard 全局筛选控件/URL 状态、真实时间范围聚合口径、真实 metric/text 钻取业务闭环、真实 Provider/慢请求取消/错误码映射、RBAC/跨租户、读屏、跨浏览器、SSR、发布和部署。
- 下一项可执行动作：真实 example `/` 入口已完成显式筛选/日期、hash 恢复、三类 metric 钻取记录与 `recordLink`、真实详情→页面返回→刷新恢复、未知 region 拒绝和 Provider 失败/重试，并完成 Chromium/WebKit/Firefox desktop/narrow 专属矩阵。下一步只能在获得真实 Dashboard Provider 与服务端授权后验证真实聚合口径、时间范围边界、详情权限、RBAC/跨租户和失败码，不得用本地演示数据外推。模块为 `packages/ui` DashboardView、`packages/core` dashboard contract、example dashboard 页面与 enterprise-ui 消费者 fixture。
- 独立复核：主线程最终 UI 单文件 **15/15 passed**、exit `0`、`8.10s`；Core 单文件 **10/10 passed**、exit `0`、`61ms`，两文件分别执行；`git diff --check` exit `0`。
- 外部依赖：真实 Dashboard Provider、服务端聚合/时间范围契约、RBAC、屏幕阅读器、浏览器环境、发布授权。
- 状态：全局筛选/时间范围透传与严格日历校验、真实反应式宿主的嵌套原位修改重载、metric/text 钻取事件与失败脱敏反馈、筛选竞态丢弃旧响应、失败清空旧数据与当前条件重试、钻取绑定独立已加载查询的组件契约已验证；真实 example `/` 入口的筛选/时间控件、hash 刷新恢复、精确聚合、Provider 失败/重试、未知 region 拒绝、带 `recordLink` 的钻取记录、实际详情→页面返回→刷新恢复和 core `decodeDashboardQuery` 日期契约已由主线程独立复核 **18/18（1.2m）**、example 配置单文件 **6/6（1.10s）**、diffcheck `0`；截图 helper 修复后 pi 与主线程分别 **18/18**，新主线程结果 `1.2m`，WebKit 窄屏详情截图已抽查稳定。旧低 opacity 截图已作废。真实 Provider、RBAC、读屏、SSR 和发布仍未验收；局部证据不足；需外部验收。

## 6. 批次四：按需扩展条目

### B4-01 Kanban / Scheduler / Gantt

- 原始要求：领域级交互与可替换引擎。
- 直接证据：[kanban-move-persistence-20261022.md](../evidence/kanban-move-persistence-20261022.md)；[KanbanBoard.svelte](../../packages/ui/src/components/KanbanBoard.svelte)、[kanban-board.test.svelte.ts](../../packages/ui/src/components/kanban-board.test.svelte.ts)、[GanttChart.svelte](../../packages/ui/src/components/GanttChart.svelte)、[gantt-chart.test.svelte.ts](../../packages/ui/src/components/gantt-chart.test.svelte.ts)。
- 证据覆盖边界：本轮选择 Kanban 真实组件做窄范围前端契约验证，仅修已有组件缺陷，不代表用户已选择可替换引擎、Scheduler 或排程产品。首轮先写红测覆盖跨列移动异步持久化回执、服务端拒绝后回滚与脱敏重试、`canMoveCard` fail-closed、重复提交互斥和 scope 隔离；修复前单文件 **5 failed / 20 passed（25）**，修复后 **25/25 passed**、exit `0`、约 `6.1s`。第二轮继续收敛权威回执直接边界：错误 id、错误目标列、无效结构、`null` 回执不得提交，乐观卡片回源并显式 `Retry`；回执提交后被回调持有方修改不得改变已提交卡片；卸载后的异步成功/失败不得回调或交付。无效回执与卸载边界在现有实现下本已通过，未伪造失败；实际红测为对象图别名 **1 failed / 31 passed（32）**，修复后 **32/32 passed**、exit `0`、约 `6.4s`。`git diff --check` 两轮均 exit `0`。实现使用项目既有 `snapshotPlainData` 安全快照分离回执对象图，并保留统一校验、回滚和重试路径。收尾复核确认 `snapshotPlainData` 从 `@svadmin/core/schema` 导入、回执解码先拒绝非对象值再做安全快照，新增英文注释已改为中文。当前工作区再次复跑单文件 **32/32 passed**、exit `0`、约 `6.44s`，`git diff --check` exit `0`。未实现后端排程、领域持久化服务或可替换引擎，也未扩展到 Gantt/Scheduler。台账原文为“按需扩展”；组件契约通过不构成领域交互、引擎替换或 Scheduler 完成的证明。
- 仍未证明的验收：产品是否选择该场景、真实领域持久化与冲突合并、服务端排程、可替换引擎、真实 RBAC/跨租户、性能、读屏、跨浏览器和发布。上述本地回执/卸载边界已可本地验证，不再列为只能等后端。
- 下一项可执行动作：仅在获得真实领域后端与授权契约后，补“服务端回执字段/冲突版本/跨租户拒绝”联调用例；不得用本轮前端回执测试外推 Scheduler/Gantt 或引擎替换完成。Kanban 已固定“异步回执提交、拒绝回滚/脱敏重试、回执安全快照、权限 fail-closed、重复提交互斥/作用域隔离、卸载后不回调”边界。
- 外部依赖：真实领域后端与授权契约、发布授权。
- 状态：Kanban 前端窄契约已验证（首轮红测 **5 failed / 20 passed**，修复后 **25/25**；第二轮红测 **1 failed / 31 passed**，修复后 **32/32**；两轮 diffcheck `0`；收尾复核复跑 **32/32**、exit `0`、约 `6.44s`，diffcheck `0`）。已有证据文档记录的上一轮主线程独立复核为 **32/32 passed**、exit `0`、duration **6.53s**；该结果明确属于上一轮，不是本轮复跑，与本轮 pi 及收尾结果分别记录、不合并。后端排程/引擎替换/真实领域持久化仍未验收，局部证据不足；需外部验收。不扩展到 Gantt/Scheduler。

### B4-01 最新复核补记（2026-10-23）

Kanban 创建链路单文件由 pi 与本线程独立复跑最终 **36/36 passed、exit 0**，`git diff --check` 通过；新增 pending 重复点击只提交一次、scope 切换后旧成功/失败回执隔离、创建回执快照防后续对象变异。未改生产代码；真实领域后端、服务端幂等、跨租户 RBAC、浏览器/读屏和发布仍未证明。

同一单文件随后补充卡片级无障碍回归，pi 与本线程独立复跑最终 **37/37 passed、exit 0**；pending move 时仅移动卡片为 `aria-busy="true"`，其他卡片保持 `false`，回执完成后恢复。生产组件未改。

### B4-02 Pivot / Spreadsheet

- 原始要求：服务端聚合、完整公式引擎、许可和包体积。
- 直接证据：未定位 `docs/evidence/` 中的验收报告；仅定位 [PivotTable.svelte](../../packages/ui/src/components/PivotTable.svelte)、[SpreadsheetView.svelte](../../packages/ui/src/components/SpreadsheetView.svelte)、[pivot-table.test.svelte.ts](../../packages/ui/src/components/pivot-table.test.svelte.ts)、[spreadsheet-safety.test.svelte.ts](../../packages/ui/src/components/spreadsheet-safety.test.svelte.ts) 的源码/测试声明；另有 [enterprise-ui-correctness.md](enterprise-ui-correctness.md) 记录有界表格公式边界。
- 证据覆盖边界：台账原文为“按需扩展”；本地的有界 Pivot/Spreadsheet 测试声明不能证明服务端全量聚合、完整公式引擎、许可或包体积。
- 仍未证明的验收：服务端聚合重授权、完整公式引擎、XLSX/第三方许可、包体积/性能预算、发布和部署。
- 下一项可执行动作：先做产品场景与许可决策；若选择 Pivot，则在 `pivot-table.test.svelte.ts` 和 `pivot-export.test.svelte.ts` 固定“服务端查询快照 + 全量导出任务回执”窄用例；若选择 Spreadsheet，则延续 `spreadsheet-safety.test.svelte.ts` 的资源上限断言。模块为 `packages/ui` Pivot/Spreadsheet。
- 外部依赖：产品决策、服务端聚合/导出服务、许可审查、发布授权。
- 状态：按需待产品决策；局部证据不足；需外部验收。

### B4-03 Workflow / DecisionTable

- 原始要求：版本、发布、模拟、审计、执行结果。
- 直接证据：未定位 `docs/evidence/` 中的验收报告；仅定位 [DecisionTable.svelte](../../packages/ui/src/components/DecisionTable.svelte)、[pdf-spreadsheet-decision.test.svelte.ts](../../packages/ui/src/components/pdf-spreadsheet-decision.test.svelte.ts)、[workflow-boundaries.test.svelte.ts](../../packages/ui/src/components/workflow-boundaries.test.svelte.ts) 的源码/测试声明。
- 证据覆盖边界：台账原文为“按需扩展”；DecisionTable 的本地边界声明不证明版本、发布、模拟、审计或执行结果。
- 仍未证明的验收：工作流版本/发布/模拟/审计、决策表执行结果、服务端编排、权限、读屏和发布。
- 下一项可执行动作：先做产品场景决策；若选择 DecisionTable，则在 `pdf-spreadsheet-decision.test.svelte.ts` 固定“规则命中/无命中/执行失败”窄用例；工作流版本化与发布不在本组件内自行扩展。模块为 `packages/ui` DecisionTable/工作流边界。
- 外部依赖：产品决策、工作流/规则后端、发布授权。
- 状态：按需待产品决策；局部证据不足；需外部验收。

### B4-04 富文本 / 代码 / 文档

- 原始要求：大内容、安全、版本、只读与编辑边界。
- 直接证据：[richtext-field-contract-20261021.md](../evidence/richtext-field-contract-20261021.md)、[toolbar-upload-lifecycle-20261021.md](../evidence/toolbar-upload-lifecycle-20261021.md)、[editor-upload-recovery-20261021.md](../evidence/editor-upload-recovery-20261021.md)、[code-editor.test.svelte.ts](../../packages/ui/src/components/code-editor.test.svelte.ts)。
- 证据覆盖边界：证据覆盖富文本字段身份、上传回执/重试、编辑器上传恢复和代码编辑器本地测试声明；台账原文为“按需扩展”，没有大内容、版本、完整安全或文档协作验收。
- 仍未证明的验收：大内容性能、HTML/粘贴安全、版本差异、只读/协作边界、真实上传服务、读屏、许可和发布。
- 下一项可执行动作：先做产品场景决策；若选择富文本，则先只读核对 [editor-upload-recovery-20261021.md](../evidence/editor-upload-recovery-20261021.md) 记录的现有测试声明与 `packages/ui/src/components/richtext-field-contract.test.svelte.ts`，确认缺口才补“大文档只读 + HTML 粘贴净化”单测；若选择代码编辑，则先核对 `code-editor.test.svelte.ts` 再固定大文件/只读边界。模块为 `packages/ui` 富文本/代码编辑器。
- 外部依赖：产品决策、上传/文档服务、许可审查、发布授权。
- 状态：按需待产品决策；局部证据不足；需外部验收。

## 7. 当前优先级最高的三个本地动作

1. **B3-01 资源数据工作台**（本地可复核）：新增的两个窄用例已由 pi 自测 34/34、原始 exit code 0 通过；主线程在最终加强版本后独立复核同一文件 34/34、原始 exit code 0、duration 14.18s，并确认 `git diff --check` exit 0。审查修正过程中曾出现一次中间态失败，不计入最终结果，仅作为审查修正过程保留；最终加强版通过。新增覆盖“首次列表失败→显式重试→选择→真实详情抽屉→编辑导航（资源 ID/查询正确、无写入）”与“列表可读但详情/编辑拒绝时不暴露入口、不读取详情、不写入”；编辑导航不等于编辑提交闭环。旧“列表刷新失败应强制关闭已授权独立详情”的未确认假设已在 [resource-workspace-audit-20261022.md](../evidence/resource-workspace-audit-20261022.md) 纠正；历史 pi 32/32 与主线程 32/32 分开保留，`auto-table-interactions` 48/48 不替代本消费者流程。续轮编辑提交受控消费者证据在本版补强后，pi 自测 35/35、原始 exit code 0、duration 12.90s，`git diff --check` exit 0；本版主线程随后独立复核 35/35、原始 exit code 0、duration 13.50s，`git diff --check` exit 0，本版由待复核改为已复核。本版新增断言服务端返回与草稿不同的规范化 title、失败后列表仍为初始 title 且草稿保留、成功后列表显示服务端规范化值、刷新调用数增加且筛选/分页不变、保存后重新查询当前选择并经真实 `Process selection` 验证 `onBatch` 为 `[2]`、保存期间无导航。初版记录单独保留：pi 自测 35/35、原始 exit code 0、duration 28.40s，主线程初版独立复核 35/35、原始 exit code 0、duration 13.42s，两次独立运行不合并。历史 34/34 基线单独保留。新增真实源码消费者浏览器证据：三引擎 desktop/narrow **18/18 passed、原始 exit code 0、duration 29.9s**、`git diff --check` exit 0；主线程随后已独立复跑当前配置 **36/36 passed**、exit `0`，不再是待复核状态。覆盖键盘 Retry、真实分页/搜索/选择、详情关闭保留查询、快速编辑失败草稿与精确 2 次 update、show/edit 拒绝 fail-closed；真实 Provider/RBAC、服务端持久化、真实设备/读屏及发布授权仍未验收；完整编辑路由已由新增真实 `AdminApp` 单文件浏览器闭环补充（Chromium desktop 1/1 passed、原始 exit code 0），浏览器本地路径已经执行，不归为必须等待外部。
1. **B3-01 收口状态**：资源工作台消费者浏览器已由主线程独立复跑 **36/36 passed、exit 0**；完整编辑路由 **1/1 passed、exit 0**。窄屏全屏 Drawer 的 overlay 指针限制已明确记录，生产样式尺寸模型已修正，测试未使用 `force`；后续不再重复本地同场景矩阵，真实 Provider/RBAC、读屏和发布仍是外部验收。
2. **B3-02 共享视图**（本地可复核，部分需外部环境）：`saved-list-views.test.ts`（38/38）与 `saved-list-views-model.test.svelte.ts`（23/23）均已由 pi 自测与主线程独立复核，exit 0，两文件分开运行；分别覆盖系统/团队 scope、权限 metadata、未知字段、版本 receipts 与远端保存/默认视图/旧响应隔离。真实源码消费者浏览器 18/18 已由 pi 自测与主线程独立复核分别确认（两次均 18/18 passed、exit 0；主线程另确认 `git diff --check` exit 0 并抽查 webkit-narrow 失败弹层截图控件在视口内、无横向溢出），新增完整 Provider 查询 `toEqual`、团队 scope/mutation state 精确断言、失败弹层展开截图与 narrow 控件边界检查；首轮测试误把搜索折进 `state.filters` 已修正为 `state.search` 独立、filters 为空，不是实现缺陷。后续只在确认真实服务或浏览器/读屏缺口时推进外部验收；不重复添加已存在用例，不猜造未知字段删除语义，不把模型层单测或本地受控 Provider 外推为真实后端。
3. **B3-03 导入导出中心**（本地可复核，部分需外部环境）：`import-wizard.test.svelte.ts` 与 `export-contract.test.svelte.ts` 均已由 pi 自测与主线程独立复核（分别 70/70、59/59，exit 0），两文件分开运行；两者均为 stub/mock 本地证据。本轮新增真实源码消费者浏览器证据，Chromium desktop **3/3 passed**，后续 Chromium/WebKit/Firefox × desktop/narrow 全矩阵 **18/18 passed、exit 0**，并已由主线程独立复核当前专属矩阵 **30/30 passed、exit 0**；覆盖非法映射预校验阻断、合法导入部分失败真实失败 CSV download、ExportButton 任务恢复显式 artifact download 和窄屏无横向溢出。上述证据不证明真实服务端持久化/全量导出、读屏或发布。不把 ImportDropzone 等同导入中心，不重复添加同场景用例。

已验收的 B1-02/B2-11 Schema 拒绝单文件 61/61 不再列为下一动作；显式拒绝只闭环安全边界，完整 Schema 受控引用适配仍属 B2-11 产品决策。B2-11 的不支持 Schema 浏览器拒绝路径已有本地三引擎两视口 24/24 证据，并已由主线程独立复核；读屏仍为外部依赖。B1-03 的完整公式引擎/完整 Excel 属 B4-02 按需扩展，B2-02 自绘日历不是原始明确要求，全量时区等无界要求也不作为无限补 case 依据。真实 Provider、RBAC/租户、屏幕阅读器、发布和部署继续列为外部依赖；总体完成度不作宣称。
