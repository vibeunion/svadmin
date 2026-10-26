# 企业级 UI 收口执行记录

## ImportWizard 归一化错误本地化（2026-10-24）

- `ImportWizard` 不再直接展示 Core `HttpError.message`；失败行和失败 CSV 均按
  安全错误码选择本地化文案：容量限制、无效输入行或通用操作失败。
- Provider 抛出的原始诊断、归一化英文 `Import failed` 和失败 CSV 内容均不会
  进入中文界面。
- 主线程独立运行 `import-wizard.test.svelte.ts` **87/87，exit 0**；
  `git diff --check` exit `0`。测试文件仍有工作区既有两处
  `no-non-null-assertion`（881、1024 行），生产组件 ESLint 无新增诊断。
- 边界：任务未确认、文件读取、表头/列数等已有可操作文案保持不变；不证明真实
  导入服务、任务持久化、权限、读屏、发布或部署。整体保持 **PARTIAL**。

## 权限校验失败与拒绝状态区分（2026-10-24）

- `useCan` 增加只读 `isError`，只表示当前权限查询失败，不暴露错误对象或
  Provider 文案；成功返回 `can: false` 仍是正常拒绝，`isError=false`。
- `AutoForm` 与 `AutoTable` 现在分别显示“无权执行”和“权限校验暂不可用”；
  权限服务失败提供重试入口，成功拒绝不显示重试；普通资源查询错误继续使用
  原有数据加载失败路径。
- 新增中英文 `common.permissionDenied` 与 `common.permissionUnavailable`；
  不改变 fail-closed、写入权限按钮或真实 RBAC 协议。
- 主线程独立验证：`useCan.test.svelte.ts` **47/47**；
  `form-contract.test.svelte.ts` + `table-contract.test.svelte.ts` **177/177**；
  目标 ESLint 与 `git diff --check` 均 exit `0`。测试仅有既有 source-map
  缺失提示，不影响退出码。
- 边界：这是前端权限反馈契约，不证明真实 RBAC、租户撤销、服务端字段权限、
  屏幕阅读器、发布或部署；整体保持 **PARTIAL**。

## Core 查询与默认通知本地化收敛（2026-10-24）

- `createQuerySession` 的默认查询失败通知改为当前 locale 的稳定文案，不再
  展示 `Fetch failed` 或 Provider 诊断；显式 `errorNotification` 字符串/回调
  仍保持宿主自定义能力。
- Core 默认错误通知不再拼接任意 `Error.message`；显式配置回调仍可接收原始
  Error，供受信任宿主记录或诊断。
- `SvarDataGrid` 同步补齐默认 label、空/加载/禁用/静态预览、窗口错误和双面板
  区域标签的中英文默认值，保留显式 props 覆盖。
- `pi` 新增直接回归；主线程独立验证：
  `query-source.test.svelte.ts` + `hook-utils.test.svelte.ts` **286/286**，
  `SvarDataGridFeedback.test.svelte.ts` + `svar-resource-table-error.test.svelte.ts`
  **8/8**；目标 ESLint 与 `git diff --check` 均 exit `0`。
- Core 测试仅有既有 source-map/localStorage 环境提示，不影响退出码。
- 边界：显式宿主诊断回调仍可观察原始错误；这不是 Provider、RBAC、读屏、
  发布或部署验收。整体保持 **PARTIAL**。

## SvarDataGrid 内部诊断收敛（2026-10-24）

- 有界复查确认 `SvarDataGrid` 的本地配置校验、数据投影和引擎编辑回调仍可能
  将 `Error.message` 直接写入用户可见的 `role="alert"`。
- 已将三条路径统一为稳定的中英文通用文案：表格配置无效、表格数据无效、
  保存失败；保留现有禁用、重试、状态清理和请求隔离行为，不改变错误对象在
  组件外部的处理方式。
- `pi` 补充真实 `SvarDataGrid` 组件宿主回归，覆盖配置 getter、数据投影和
  编辑拒绝三条路径；主线程独立运行
  `SvarDataGridFeedback.test.svelte.ts` **3/3，exit 0**。
  目标组件、测试和宿主 ESLint `--max-warnings 0` exit `0`；
  `git diff --check` exit `0`；既有真实资源查询错误回归
  `svar-resource-table-error.test.svelte.ts` **1/1，exit 0**。
  首次从仓库根目录运行该单测因包内 Vitest include 过滤导致
  `No test files found`，随后在 `packages/ui` 按项目配置重跑通过。
- `FileUpload` 的失败原文仍只存在于受控 `onChange` 数据契约，组件 DOM 使用
  固定本地化文案；本轮不破坏该既有宿主契约。
- 边界：本项不替代真实 SVAR 引擎、Provider/RBAC、读屏、发布或部署验收；
  整体状态保持 **PARTIAL**，外部真实验收依赖见下方“真实验收解锁条件”。

## ImportWizard 文件读取错误收敛（2026-10-24）

- parent: 本文公开错误组件续接；source: 用户持续目标；
  reason: pi 审查确认 `JSON.parse` 语法异常和 `File.text()` 拒绝会把浏览器原始
  诊断及文件片段写入 `fileError`，而 importer/provider 错误已经由 Core 固定文案
  归一化，不重复修改后者。
- pi 仅修改 `packages/core/src/i18n.svelte.ts`、`ImportWizard.svelte` 和其直接
  测试：新增中英 `import.fileReadFailed`；用内部标记只收敛文件读取/JSON 语法
  异常；保留容量、表头、列数、格式等可操作产品错误，以及 importer/provider
  的既有归一化和重试行为。
- 主线程独立运行 `import-wizard.test.svelte.ts`：**84/84，exit 0，11.33s**；
  `ImportWizard.svelte` 与 `core/i18n.svelte.ts` ESLint 通过；`git diff --check`
  通过。测试文件仍有工作区原有两处非空断言 lint 错误（879、1022 行），本轮
  新增测试未引入新的 lint 错误；局部 `check:types` 另受既有未跟踪 editor 测试
  引入 `bun:test` 阻断，未将其归因本轮。
- 边界：非法 JSON 的用户错误已收敛，但真实浏览器文件权限/编码矩阵、真实
  Provider、读屏和发布仍未验收。未提交、推送、发布或部署；整体仍 PARTIAL。

## 公开错误组件默认安全续接（2026-10-24）

- parent: 本文 `Surface / SVAR 原始诊断收敛续接`；source: 用户持续目标；
  reason: 有界审查发现公开导出的 `ErrorBoundary` 与 `ErrorComponent` 默认会优先
  显示异常原文或未注册的旧 i18n key。
- pi 实施并由主线程审查：
  - `ErrorBoundary` 默认失败界面统一使用
    `error.internalServerErrorDescription`；`console.error` 保留；
    宿主显式 `fallback` 仍可接收原始 Error 和 reset。
  - `ErrorComponent` 默认不显示 `error.message`；标题、描述和重试文案均使用
    宿主旧词条优先、核心已注册词条回退，显式 `title`/`description` 仍优先。
    不再出现 `PRIVATE_DIAGNOSTIC` 或裸 i18n key。
- 主线程独立运行 `error-component.test.svelte.ts` **4/4，exit 0，5.72s**；
  前置同一配置的 ErrorBoundary + ErrorComponent 联测 **4/4，exit 0，6.45s**；
  目标 ESLint 与 `git diff --check` 通过。
- 边界：这是公开组件默认展示安全性，不改变显式宿主 fallback 的诊断能力；
  未证明所有外部消费者、真实读屏或发布包在线行为。未提交、推送、发布或部署；
  整体仍 PARTIAL。

## Surface / SVAR 原始诊断收敛续接（2026-10-24）

- parent: 本文 `SVAR 查询错误续接`；source: 用户持续目标“继续，直到全部完成”；
  reason: pi 有界审查发现另外两条确定的用户可达错误反馈路径直接渲染
  Provider 异常文本。
- pi 实施的最小修复：
  - `AuditLogViewer.svelte` 的 `getAuditLogs` 失败只显示
    `i18n.t('common.error')`，不再把异常原文放入 DOM 或 Toast；
  - `InferencerPanel.svelte` 的 `dataProvider.getList` 失败同样收敛为通用文案，
    保留 request/epoch 失效隔离和重试；
  - 更新直接测试，断言 `PRIVATE_DIAGNOSTIC` 不可见、重试后成功数据恢复。
- 主线程独立复验：`audit-log-viewer-scope.test.svelte.ts` **3/3**，
  `scoped-provider-actions.test.svelte.ts` **22/22**，`builtin-pm-repairs.test.svelte.ts`
  **36/36**，均 exit 0；三组目标 ESLint 通过，`git diff --check` 通过。
  旧 `builtin-pm-repairs` 断言已同步为通用错误契约。
- 边界：这是展示层错误收敛，不改变 Core 错误对象或真实 Provider；测试为
  受控 Provider/本地组件路径，不替代真实 RBAC、读屏或发布验收。未提交、推送、
  发布或部署；整体仍 PARTIAL。

## SVAR 查询错误续接（2026-10-24）

- parent: 本文当前阻塞处置；source: 用户持续目标“继续，直到全部完成”；
  reason: 有界审查发现 `SvarResourceTableView` 从查询错误直接读取 message，
  本地展示层没有独立收敛为统一文案。
- orchestration: managed；pi 单一代码 writer，主线程独立审查与定向验证；
  scope: 该组件的一行错误派生值及一个直接测试、三个测试宿主/替身。
  不修改 Surface 协议、权限模型、真实服务、发布流程或其他 dirty 文件。
- 验收：给定 Provider 首次拒绝并带 PRIVATE_DIAGNOSTIC，失败时显示中文通用
  错误、不出现该诊断且无 Toast；点击刷新后第二次读取成功，错误消失并显示数据。
- 主线程独立运行 `packages/ui` 下
  `bunx vitest run --config ./vitest.config.ts src/components/svar-resource-table-error.test.svelte.ts`：
  **1/1，exit 0，1.36s**；五个目标文件 ESLint `--max-warnings 0` exit 0；
  `git diff --check` 通过。首次 lint 命令把 fixture 路径误写成 `src/test`，
  exit 2，无文件检查结果；已用正确的 `test/fixtures` 路径复验。
- 边界：测试走真实资源查询链、轻量 Grid/Theme 替身，仅验证中文错误反馈与
  恢复，不证明真实 SVAR 引擎、真实 Provider/RBAC、读屏或英文矩阵。
  直接读取 message 是展示层缺口，不据此断言 Core 已实际泄露原始服务端诊断。
  未提交、推送、构建、发布或部署；整体仍 PARTIAL。

## 当前阻塞处置（2026-10-24）

- parent: `enterprise-ui-unblock-contract-20261024.md`；source: 用户“解决阻塞”。
- reason: 续接已完成实现，消除历史决策包与当前状态的冲突，不重新实施已验证能力。
- 本轮为 documentation-only，`safe_skip_reason=documentation-only`；
  主线程唯一文档 writer，pi 只读复核。仅同步关联状态入口，不修改产品代码。
- **已解除**：草稿数据政策、内部 Schema 引用安全契约、显式 oneOf 分支及
  example AutoForm 草稿接入；不再要求用户重复批准这些默认值。
- 本轮独立复验：在 `packages/ui` 分别执行
  `bun run test -- src/components/enterprise/recursive-schema-form.test.ts`：
  **32/32，exit 0，1.64s**；
  `bun run test -- src/components/json-schema-form-enterprise.test.svelte.ts`：
  **81/81，exit 0，10.99s**。后者有依赖 sourcemap 缺失提示，不影响退出码。
  本轮未重跑草稿或浏览器矩阵，下文计数保留为此前独立运行证据。
- pi 只读复核确认旧决策入口混淆了本地完成项和外部依赖；主线程已同步当前索引、
  标注历史快照并修正决策包中的草稿/Schema 当前边界。`git diff --check` 通过。
- **仍为 PARTIAL**：真实服务验收任务 blocked；不是所有本地实现 blocked。
  B2-06 新选择策略、B3-05 完整版本服务及 B4 仍需单独选定范围，不自动扩展。

## B3-09 存储兼容审查收口（2026-10-24）

- 针对“旧 storage 是否必须迁移”的阻塞进行了独立复核。当前 v1 适配器已经
  对未登录 fallback 保留旧 `tenant + tab` 键的只读兼容；显式用户不会读取
  旧匿名键；损坏、版本不匹配和关闭信封不会绕过新键标记回退旧键。
- `clear()` 的 remove/read-back 失败仍返回 `storage: 'failed'`，并保留共享
  tombstone 阻断；只有确认写入并回读新快照后才解除阻断。该行为不承诺跨刷新
  storage 在实现层面一定可删除，调用方必须处理失败结果。
- 主线程独立运行 `packages/ui/src/components/workspace-tab-state.test.svelte.ts`
  **43/43，exit 0，7.34s**；独立证据见
  `docs/evidence/workspace-tab-storage-compatibility-20261024.md`。
- 结论：B3-09 本地旧键兼容/清理不是当前代码阻塞；未知旧版本不做猜测迁移，
  若未来需要迁移必须另立版本映射与保留策略。整体仍为 **PARTIAL**，剩余是
  真实服务、真实身份/RBAC、版本服务、读屏实机及发布/部署授权。

## OrbStack Provider/RLS 真实本地验收（2026-10-26）

- 用户明确授权使用本机 OrbStack 作为测试环境；主线程建立独立 PostgreSQL 18 +
  PostgREST 12 测试栈，不复用 FA 容器、不连接远端环境。
- 真实 HTTP/RLS 验收 **1 pass / 14 assertions / exit 0**：匿名拒绝、租户隔离、
  正常 CRUD、跨租户写入拒绝和独立回读均通过。
- 验收发现 `@refinedev/supabase` 的默认 DELETE 没有返回 representation，导致
  严格 SVAdmin 响应解码失败；已在 `packages/supabase/src/data-provider.ts` 增加
  明确的 `delete + select` 路径，并由上述真实测试验证。
- `@svadmin/supabase` 增加 `@refinedev/supabase@6.0.2` devDependency，使包内真实
  集成测试在干净安装中具备其可选 peer 的测试运行时；peer 约束仍保留为
  `^6.0.2`。
- 证据见 `docs/evidence/enterprise-orbstack-rbac-20261025.md`。本地 Provider/RLS
  阻塞已解除；Supabase Auth、文件存储、业务版本冲突、读屏、发布和部署仍分别
  保持未验收，不将本地 RLS 结果外推为生产 RBAC 完成。

## B3-09 三引擎生命周期矩阵复验（2026-10-26）

- 清理上一轮遗留的 fixture Vite 进程后，完整执行
  `playwright.workspace-tabs.cross-browser.config.ts`，当前 **81/81 passed**，
  exit `0`，耗时 **10.3m**，无 skip；Chromium/WebKit/Firefox desktop 各 **27/27**。
- 该结果覆盖当前 27 个 workspace 用例，包含真实菜单 SPA 往返、关闭/驱逐、刷新恢复、
  草稿恢复边界、滚动取消和 390px 视口场景；不再把 Firefox 隔离重跑与历史矩阵拼接。
- 这项本地生命周期阻塞已解除。真实 Provider/RBAC、生产 storage、跨窗口同步、
  真实读屏、发布部署与在线验收仍保持单独的 `PARTIAL` 边界。

## B2-09 AutoForm 复合字段矩阵复验（2026-10-26）

- 主线程独立执行 `scripts/fixtures/enterprise-ui/playwright.autoform.config.ts`，
  当前 **102/102 passed**，exit `0`，耗时 **2.2m**，无 skip；Chromium/WebKit/Firefox
  desktop/narrow 六个项目各 **17/17**。
- 覆盖错误摘要、ArrayField、DateRangeInput、TreeSelect、Cascader、Transfer、
  RichText、Tags、Multiselect、Images，以及 provider/scope 切换后的迟到响应和
  dirty 草稿隔离。该本地跨浏览器矩阵已收口，不替代真实读屏、上传服务、服务端
  错误映射、Provider/RBAC、发布或部署验收。

## 当前构建与分发复验（2026-10-26）

- `bun run build:packages`：exit `0`；12 个 packages 构建通过，仅保留既有
  `import.meta.env` 打包提示。
- `bun run build:example`：exit `0`；保留既有 Svelte 状态提示、动态导入和大 chunk
  警告，不构成失败。
- `bun run pack:check`：exit `0`；所有 tarball、consumer imports/types、packed npm
  install、bin doctor、peer consumer、SSR 和 Surface packed/minimum-supported 检查
  通过；当前 `@svadmin/ui` 为 **1033 tarball entries**。
- 这些结果证明当前源码可构建、可打包和可被受控消费者解析，不等于 registry 发布、
  部署或在线验收；工作区仍未提交、推送或发布。

### 真实验收解锁条件

| 依赖 | 最小输入 | 完成判据 |
| --- | --- | --- |
| Provider、RBAC 与租户 | 指定测试应用/环境、现有安全登录方式、两个隔离测试租户及低权限身份、允许操作的测试记录范围 | 真实允许/拒绝/撤权与跨租户隔离；不能用 example 内存 Provider 代替 |
| 上传、持久化、冲突与任务 | 对应服务契约、可清理的测试数据、上传/修改/取消权限与清理边界 | 写入后独立读回、版本冲突、取消/幂等及重启恢复按适用契约验收 |
| 服务端 Schema | 实际 Schema 来源、版本和校验接口 | 与客户端同一载荷的接受/拒绝结果一致 |
| 读屏与发布 | 人工读屏安排；发布/部署需另行明确目标与授权 | 记录实机结果；源码构建、分发、部署与在线验收分别记录 |

不要求在聊天中粘贴密钥。未指定测试目标前不尝试连接或写入其他项目环境。
上述输入到位后仅续接相应验收，不用新增框架或重复本地测试替代外部证据。

## oneOf 初版与独立复验

- 2026-10-24：managed，pi 为代码 writer，主线程独立审查与验证；
  范围为嵌套对象的显式 discriminator 分支，不改变整体企业级目标。
- 已加入显式选择器、未选择/歧义错误码与 Pointer、内部引用分支展开、
  切换及提交前旧分支字段清理。主线程发现 discriminator getter 风险后，
  pi 改为 descriptor-safe 读取并补回归。
- 最终递归单文件主线程 **31/31（1.76s）**；企业表单单文件主线程
  **74/74（9.67s）**；独立浏览器 **6/6（3.5s）**，实际为
  Chromium desktop/narrow 各三个场景，不是三引擎。
  目标 ESLint、`git diff --check` 通过。
- 后续已补齐根级 oneOf、显式选择后的分支默认值、根/数组项/字段只读继承，
  以及 selector 写入守卫。最终主线程复验：递归测试 **32/32**、企业表单
  **81/81**，专属浏览器 Chromium/WebKit/Firefox × desktop/narrow
  **42/42（19.3s）**；目标 ESLint 与 `git diff --check` 通过。
- B2-11 本地 oneOf 实现与确定性验收已收口；仍不代表真实服务端 Schema/RBAC、
  实机读屏、发布包或部署验收。契约见 `schema-oneof-contract-20261024.md`。
  未提交、推送、发布或部署。

## 业务草稿浏览器续接结果

- 2026-10-24：修正 workspace 编辑器实例容器为响应式 `$state`，
  身份变化清理移至 `$effect.pre`。刷新后显式恢复可以取得当前实例。
- 冲突测试原先在旧 document 篡改存储，随后被 pagehide 正常快照覆盖；
  现改为新 document 初始化时一次性注入不匹配候选，并断言实际存储基线。
  不忽略 pageerror，不放宽冲突/表单不变/丢弃后刷新不复活断言。
- 最终主线程定向矩阵 `reload shows|stored draft`：
  Chromium/WebKit/Firefox **6/6，48.7s，exit 0**。
  Vitest 单文件草稿 **9/9**、表单契约 **102/102**；
  目标 ESLint 与 `git diff --check` 通过。直接使用 Bun 执行 Svelte 测试的
  初始尝试因缺少 rune 转换失败，已改用项目 Vitest 配置复验通过。
- 此结果关闭 example 内存 Provider 的业务草稿本地浏览器阻塞；
  不证明真实 Provider/RBAC、服务端版本冲突或生产部署。
  `oneOf` 已由上节后续实现收口；整体仍因外部验收保持 PARTIAL。
  未提交、推送、发布或部署。

## 阻塞解除续接

用户“解决阻塞”后按推荐默认值执行，契约见
`enterprise-ui-unblock-contract-20261024.md`，不再要求重复批准模板。

- B3-09：宿主显式启用的字段草稿已实现白名单、64KiB 默认上限、
  有界 JSON、身份精确隔离、恢复复验和清除失败诊断。主线程独立适配器
  **43/43**，受控消费者桌面三引擎 **18/18（22.9s）**。明确点击才恢复，
  丢弃后刷新不复活；不是 example 业务 AutoForm、真实身份或服务端冲突验收。
  见 `../evidence/workspace-tabs-draft-payload-20261024.md`。
- B2-11：有界内部 `$defs` 引用和稳定错误回调已实现，补齐 TypeBox 元数据
  兼容与拒绝边界；主线程递归 **22/22**、企业表单 **69/69**。
  远程引用是本轮明确禁止的能力，不再列作等待批准的本地阻塞。
  见 `../evidence/schema-form-b2-11-boundary-audit-20261023.md`。
- 六个直接变更代码/测试文件的定向 ESLint 与 `git diff --check` 通过。
  未提交、推送、重建分发包、发布或部署。
- 整体仍 **PARTIAL**，但不能再概括为“没有新的产品/安全输入、全部 blocked”。
  oneOf 显式分支和 example 业务草稿接入的本地实现已完成；
  真实 Provider/RBAC、业务冲突/持久化、读屏实机和发布授权才属于外部依赖。
  B4 保持未选择，不自动扩展。下文旧状态保留为历史执行记录。

## 续接契约

- parent: `enterprise-ui-remaining-20261023.md`
- source: 用户“全部完成”
- reason: 在已完成 B3-09 本地消费者验证后继续关闭本地可执行缺口，并逐项标明外部依赖。
- orchestration: managed；pi 分别实施上传初版、浏览器夹具和任务/通知配置，写入范围
  互不重叠；原 writer 结束后主线程补齐组合生命周期，负责独立验证与记录，
  并另行执行最终只读审查。
- risk: medium；保留现有 dirty 工作区，不提交、推送、发布或部署。
- goal: 补齐文件字段的数据流与生命周期，以及已有任务/通知场景的跨引擎验证。
- non-goals: 不虚构上传后端、版本服务、Schema 外部解析服务、RBAC 或领域应用；
  不把受控 Provider、浏览器 DOM 或窄屏测试称为真实服务、读屏或移动视觉验收。

## 文件字段验收

```gherkin
Scenario: 上传中的表单不能提交
  Given 表单使用宿主提供的上传回调
  When 文件仍处于等待或上传状态并触发保存
  Then 不调用资源创建或更新接口

Scenario: 成功结果只提交可序列化引用
  Given 上传返回 url 或 uploadId
  When 上传完成后保存表单
  Then 表单提交包含引用且不包含 File 对象

Scenario: 失败可恢复
  Given 上传失败且表单仍属于原作用域
  When 用户重试并成功
  Then 可以提交新的引用且旧尝试不覆盖新结果

Scenario: reset 和作用域切换隔离迟到结果
  Given 上传尚未完成
  When 表单 reset 或资源及 Provider 发生变化
  Then 旧尝试被退休且迟到结果不能修改当前表单

Scenario: 编辑回显
  Given 资源已有可序列化文件引用
  When 编辑表单加载
  Then 用户可识别既有附件且不需要重新上传
```

## 执行状态

- B2-09 文件动作浏览器续接：用真实 AutoForm 必填校验生成错误，键盘到达既有
  附件移除、队列取消/重试/移除，验证错误描述、pending 提交阻断、成功后错误
  清理与精确引用载荷。主线程新增两场景三引擎两视口 **12/12**（23.5s），
  目标 ESLint/diff 通过；未改生产代码。见
  `../evidence/b2-09-file-action-browser-20261024.md`。下文“未做浏览器键盘”
  是上一阶段边界，本次仅关闭上述动作路径，真实读屏和服务仍未验收。
- B2-09 文件动作反馈：队列取消/重试/移除及既有附件移除复用字段说明/错误
  关联，未改变上传状态机或公开错误模型。主线程独立反馈单文件 **13/13**
  （9.83s），目标 ESLint/diff 通过；双实例、活 IDREF 与动态清理有 DOM 证据。
  见 `../evidence/b2-09-composite-followup-20261024.md`。未重建分发包，不作为
  浏览器键盘/读屏、服务端错误映射或发布完成。
- B3-09 导航测试依赖续接：受控字体延迟重现导航阻塞；独立连接地址实验确认
  Firefox 仅 context bypass 仍访问本机系统代理，已改为 browser-launch 层
  关闭系统代理。只修改专属测试配置及字体隔离，不改产品或业务断言。
  主线程最终定向三引擎 **9/9**（50.9s），ESLint/diff 通过；
  中间旧配置 **17/18** 失败记录保留，不据新 9/9 宣称全矩阵或长期稳定。
  详见 `../evidence/workspace-navigation-readiness-20261024.md`。
- B3-09 真实 SPA 生命周期续接：修复离开工作区被 URL effect 拉回，以及卸载后
  无法采集最新滚动位置。三引擎均通过新增的菜单离开/重返、同 document、
  观察者/rAF/scroller 与全局监听清理及重入不叠加断言；布局夹具改为显式释放。
  主线程最终完整矩阵 **77/78**（7.7m），Firefox 一例刷新等待超时；
  该例隔离复跑 **1/1**，根因未确认，不拼接为 78/78。目标严格类型 **0**、
  定向 ESLint/diff 通过；本地 5187 真实登录/菜单 smoke 通过。
  详见 `../evidence/workspace-lifecycle-cross-browser-20261024.md`。
  下文“尚缺 SPA 清理计数/三引擎覆盖”属于历史阶段；真实服务、读屏、发布以及
  Firefox 偶发刷新超时仍未关闭。
- B3-09 适配器跨实例关闭清理：删除后回读确认才报 cleared；失败时尝试持久化
  关闭信封并保留同 storage 对象内的共享阻断。重新 capture/markDraft 在本地
  可用，但仅在新快照写入且回读一致后退休共享阻断，防止失败写入复活旧快照。
  主线程独立适配器 **20/20**、完整目标严格类型 **0**、生产文件 lint/diff
  通过；UI build 后 workspace **24/24（2.5m）**，是本轮最新产物回归。
  删除和关闭信封均无法写入时，跨刷新仍不能保证删除；详见
  `b3-09-tab-eviction-decision-20261023.md` 当前契约。
- B3-09 滚动边界续接：修复真实水平滚动位置恢复、迟到布局恢复，以及用户取消
  后切换/刷新复活旧位置；观察者改为增量注册，静止页面不再持续 observe/rAF。
  主线程独立 workspace **24/24（2.4m）**、目标严格类型 **0 diagnostics**、
  定向 ESLint/diff 通过。延迟夹具已移至 Playwright，未向产品增加测试 API。
  证据见 `../evidence/workspace-scroll-boundaries-20261024.md`；真实网络、
  SPA 清理计数、跨引擎、跨窗口、真实服务和读屏发布仍不由此关闭。
- B3-09 真实编辑消费者当前复验：已接入公开 `AutoForm.onDirtyChange`，
  不再从 DOM input/change 猜测状态；编辑标签关闭走真实 guard，取消保留草稿，
  保存后清 dirty，确认关闭清理适配器。主线程独立单文件 reset **13/13**、
  表单契约 **102/102**，UI build 后 workspace 浏览器 **16/16（1.1m）**，
  定向 ESLint/diff 均通过。仅 Chromium/example 内存 Provider，不恢复草稿
  内容；真实身份切换、完整滚动、跨窗口及外部验收仍未完成。
- B3-09 最新主线程复验：pi 完成初始查询快照的作用域退休、首帧请求隔离、
  首次身份加载保留、新会话隔离、受控分页排序及活动保存视图标记修复。
  最终 AutoTable 单文件 **59/59（19.83s）**，列表状态 **20/20**，
  保存视图模型 **30/30**，均为独立逐文件验证；目标完整严格类型诊断 **0**，
  定向 ESLint/diff 通过。UI build 后 workspace 浏览器 **12/12（约 1.2m）**
  实际执行且无跳过。下文更早的查询恢复缺口及计数是历史记录，以
  `../evidence/workspace-tabs-consumer-20261024.md` 顶部最新证据为准。
  真实 dirty 表单消费者已由后续 `AutoForm.onDirtyChange` 修正接入基础关闭保护
  （见证据文档“真实 dirty 回调修正”）；完整滚动边界和外部服务/读屏/发布仍未完成。
- FileUpload 集成：已补齐 JSON 引用、ArrayField 多队列聚合、上传中的离开确认、
  reset/Provider/上传回调变更的旧队列隔离，以及独立 FieldRenderer 的引用模式。
  主线程最终逐文件验证上传专项 11/11、组合场景 6/6、数组反馈 23/23、
  原生上传 22/22、reset 11/11、严格表单契约 101/101，均 exit 0。
  上传浏览器三引擎两视口 18/18，见 `../evidence/autoform-upload-integration-20261024.md`。
- 上传严格类型续接：主线程发现仅检查调用方夹具不足，pi 将 FileUploadField、
  ArrayField、FileUpload 及共享类型/引用函数纳入直接诊断，修复两处 `$props`
  类型注解及可选参数转发。主线程最终单文件 **102/102**、上传行为 **11/11**，
  定向 ESLint/diff 通过；不代表 FieldRenderer 全文件内部或全仓类型门禁通过。
- 最终只读审查发现单值替换后移除/再上传失败恢复旧引用，以及自定义操作区缺少
  unresolved 禁用信号；主线程已修复，新增两条回归通过，公开 `formActions.isDisabled`
  与 `isLoading` 分离。修复后复跑上传 11/11、组合 6/6、契约 101/101、
  浏览器 18/18，定向 ESLint 与 diff 检查通过。
- B3-09：本地淘汰 37/37、关闭保护 29/29、受控浏览器 24/24 为既有证据。
  新增 example `/workspace` 菜单入口，消费真实 AutoTable、共享 QueryClient 和
  MultiTabKeepAlive，接入搜索/分页隔离、历史导航、会话标签集合与滚动恢复。
  主线程审查发现并交由 pi 修复默认标签复活、最后标签 URL 残留、隐藏前滚动
  采样及空态历史 URL 不一致；最终主线程独立浏览器 **7/7**、exit `0`、26.1s。
  局部严格类型发现并修复页面类型及 AdminApp 声明生成的别名冲突，三个接入
  文件独立诊断 0；定向 ESLint/diff 通过。UI build exit `0`，example check
  0 errors / 3 个既有 Dashboard warnings。来源与边界见
  `../evidence/workspace-tabs-consumer-20261024.md`；不证明真实草稿、刷新后查询/
  滚动快照、共享缓存回收、生产存储、真实服务或读屏。
  随后仅工作区 CSS 修复隐式 grid 的 min-content 挤出；主线程最终专属
  浏览器 **8/8**、exit `0`、32.5s（7 desktop + 1 主动设置 390x844），
  元素边界与最终截图确认按钮/标题不裁切；不等同跨引擎或真实移动设备验收。
  滚动刷新续接复用现有 adapter 的显式 sessionStorage，正常加载下活动标签刷新
  恢复位置、关闭重开归零已由主线程最终 **9/9**、exit `0`、37.0s 验证；
  局部严格类型 0，定向 ESLint/diff 通过。不恢复查询或真实草稿；
  双轴/非活动标签/SPA 重返/慢加载/存储故障的完整边界仍未验收。
- B3-09 最新补记（2026-10-24）：query/page/filter 刷新恢复已由上轮浏览器
  **12/12** 闭环；该 12/12 不是本轮重跑结果。此轮最新源码经主线程独立逐文件
  验证 `auto-table-interactions` **59/59**（exit 0，25.62s）、`list-state`
  **20/20**（exit 0，1.33s）、`saved-list-views-model` **30/30**（exit 0，
  3.28s），8 个目标 Svelte/TS 定向 ESLint 与 `git diff --check` 均 exit 0；
  覆盖 scope 退休、首帧请求隔离、首次身份延迟保留、新 session 隔离、受控
  分页排序及活动 saved view 标记。真实 dirty 表单消费者已由后续
  `AutoForm.onDirtyChange` 修正接入基础关闭保护；仍缺完整滚动边界、跨窗口、
  真实后端与读屏发布验收。详见
  `../evidence/workspace-tabs-consumer-20261024.md`；上文 7/8/9/12 计数保留为
  历史阶段，不累计。
- B2-09 空数组 Add 反馈闭环：仅改 `fields/ArrayField.svelte` 与
  `array-field-feedback.test.svelte.ts`，保留其他 dirty；未新增 `rowErrors`/路径错误
  模型，也未把父级错误关联到每行按钮。Add 入口现在按现有 `describedby`/`invalid`
  协议输出 `aria-describedby` 与 `aria-invalid`，disabled 语义保持。真实 AutoForm
  双实例测试覆盖 Save 后摘要存在、焦点落 Add、说明→错误 IDREF 顺序可解析、实例
  ID 隔离，以及第一份点击 Add 清错后仅保留说明与移除 `aria-invalid`、第二份不受
  影响。pi 自测 **24/24**、exit `0`、8.23s；主线程审查当前差异并独立复跑
  同一单文件 **24/24**、exit `0`、7.88s；两文件定向 ESLint **0**、
  `git diff --check` exit `0`。浏览器续接复用既有 array 用例，pi 验证 Chromium
  desktop；主线程收紧 ID 集合无交集和 Add 可访问描述断言后独立运行
  Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、15.4s。
  覆盖活 IDREF、摘要键盘返回、修正提交和实例隔离。不代表真实读屏验收。
  浏览器文件 ESLint exit `1`：本次范围外四处既有非空断言（1942、1986、
  2316、2317 行）；本增量无诊断。最终 `git diff --check` exit `0`。
  未跑全仓、提交、推送或部署；数组行级/
  子字段错误映射仍待产品/后端路径契约。
- 任务/通知跨引擎：主线程独立复跑任务 **36/36（30.0s）**、通知 **6/6（9.9s）**，
  均 exit 0。初次任务矩阵有 6 项焦点顺序失败，已通过有界真实按键遍历修复测试假设，
  未改生产组件。基础 task-list 配置保持原样，新增专属 cross-browser 配置避免影响
  其他继承配置。证据见 `../evidence/task-notifications-cross-engine-20261024.md`。
- B3-02 共享视图失效列：pi 实施、主线程审查并独立复跑最终模型 **29/29** 与解码
  **38/38**，均 exit 0；按视图身份精确清理本地/远端提示，应用和保存载荷不含失效列，
  作用域切换不泄漏；包含特殊 ID 自身属性写入修复。证据见
  `../evidence/saved-view-stale-fields-20261024.md`。新增真实消费者三引擎两视口
  矩阵由 pi 与主线程分别复核最终 **18/18**；包含关键控件正反向按键遍历及 Escape
  焦点恢复；真实读屏、双语言独立矩阵和真实后端仍未验收。
- 总体状态：PARTIAL。本轮本地实现和确定性验证已收口，原始企业级目标未全部完成；
  后续真实服务验收 blocked 于下列服务/产品契约及授权输入；新提示的本地
  DOM/浏览器及关键键盘链已有证据。原清单中更广泛的组合、
  错误映射和完整交互覆盖仍保留，不因本次窄范围通过而关闭。

## 仍需外部输入

- 真实 Provider、RBAC/租户授权、上传服务、持久化、后端取消与幂等。
- B3-05 版本服务及消费者模型；B2-11 本地 Schema 引用/oneOf 契约已完成，
  真实服务端 Schema 一致性仍未验收。
- B2-06 是否新增 strict/父值回传策略；B4 按需领域场景的选择。
- 读屏实机、性能环境及发布部署授权。

## 本地分发检查点（2026-10-24）

- managed 流程：pi 执行 `bun run build:packages`（12 包，exit `0`）与
  `npm_config_registry=https://registry.npmjs.org bun run pack:check`
  （exit `0`），主线程独立审查产物并做字节核对。
- 结果：`@svadmin/ui` 1031 tarball entries，入口/类型、CLI、npm/pnpm peer、
  AI elements strict 消费与 SSR、Surface workspace-packed/minimum-supported
  均通过；保留既有 `import.meta.env` 提示。
- 产物：`output/enterprise-ui-distribution-20261024/svadmin-ui-0.88.1.tgz`，
  SHA256 `5bd0b5077fa7d624291c37cf645638cb4423e0ba62020b8065f45f832111e027`；
  主线程用 `tar -xOf` 对比当前 dist，7 个关键文件字节一致。
- 边界：未重新执行 example/浏览器/全量行为检查，不将本轮 pack 视为行为
  兼容全绿；所有源码未改，原 dirty 状态保留；未提交、推送、发布或部署。
- 状态：B1-04 仅该次分发复验闭环，不覆盖其后的 Schema/草稿源码增量。
  草稿政策和内部 Schema/oneOf 契约已确定并完成本地实施，远程引用明确禁止；
  整体仍因服务端协议/外部真实验收保持 `PARTIAL`，B4 保持按需未选。
  详见 `../evidence/enterprise-ui-distribution-checkpoint-20261024.md`。

## 阻塞解决复核（2026-10-24）

本轮对上次标记为“阻塞”的四项逐项复核，结论如下：

| 项目 | 当前结论 | 证据 |
| --- | --- | --- |
| B3-05 版本历史 | 没有可安全臆造的本地修复。当前公开契约只有 `oldValue/newValue` 静态差异数据，没有版本 ID、版本列表、选中动作、Provider 回执或权限语义 | `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B3-05 条目 |
| FileUpload / AutoForm | 本地闭环，无新增缺口。成功结果只写 JSON 引用；上传中的 `File` 不进入 AutoForm 草稿；失败、取消、替换、reset、作用域变化和迟到回执均有隔离 | `docs/evidence/autoform-upload-integration-20261024.md` |
| Schema `$ref` / `oneOf` | 本地闭环范围为内部 `#/$defs/...`、有界展开和显式 discriminator；远程引用继续拒绝，不发起网络请求 | `docs/evaluations/schema-oneof-contract-20261024.md` |
| 服务端 Schema | 仍需真实服务契约。客户端通过不等于服务端接受/拒绝结果一致，不能用本地 fixture 关闭此项 | `docs/evaluations/enterprise-ui-unblock-contract-20261024.md` |

主线程本轮独立复验：

- `auto-form-file-upload.test.svelte.ts`：11/11，exit 0；
- `file-upload-composition.test.svelte.ts`：6/6，exit 0；
- `recursive-schema-form.test.ts`：32/32，exit 0；
- `json-schema-form-enterprise.test.svelte.ts`：81/81，exit 0；
- `git diff --check`：exit 0。

因此，原先的“草稿数据政策、内部 Schema 引用安全契约、FileUpload 本地
实现”阻塞已解除，不再重复等待输入。当前仍是 `PARTIAL`，剩余阻塞只包括：
真实 Provider/RBAC/租户与上传服务、持久化/冲突/取消协议、服务端 Schema
一致性、B3-05 版本历史产品契约、读屏实机和发布部署授权。没有这些输入时，
继续修改本地代码只会伪造验收，不应宣称企业级目标全部完成。

## 权限反馈安全补丁（2026-10-24）

pi 审计发现两个仍可到达用户界面的权限反馈路径直接渲染
`AccessControlProvider` 的 `reason`，可能暴露内部策略或服务诊断：

- `ResourceAccessGuard` 现在用 `useCan().isError` 区分“无权执行”和“权限校验
  暂不可用”，两者均只显示 i18n 文案；
- `SvarResourceTableView` 不再渲染 `permission.reason`，权限拒绝与权限查询失败
  分别显示稳定本地化文案；
- 直接回归覆盖拒绝 reason、权限异常诊断、查询异常诊断均不进入 DOM，且查询
  失败后的刷新恢复路径保持不变。

主线程独立验证：

- `svar-resource-table-error.test.svelte.ts`：5/5，exit 0；
- 四个目标 Svelte 文件 ESLint `--max-warnings 0`：exit 0；
- `git diff --check`：exit 0。

这项修复只收敛前端展示层，不证明真实 RBAC、服务端拒绝原因授权、租户隔离、
读屏实机、发布或部署；整体仍为 `PARTIAL`。

## Surface 内容状态反馈补丁（2026-10-24）

继续按统一反馈规范审计后，又完成两项无需产品决策的本地修复：

- `DataState` 的默认错误描述从“重试”改为通用失败文案，只有传入
  `retry` 回调时才显示重试按钮，避免正文和操作重复；
- `MediaThumbnail` 的默认图片错误文案改用 Core i18n，保留显式
  `errorLabel` 覆盖，中文界面不再出现硬编码英文。

主线程独立验证：

- `data-state.test.svelte.ts`：6/6，exit 0；
- `media-thumbnail.test.svelte.ts`：8/8，exit 0；
- 两组目标 ESLint：exit 0；
- `git diff --check`：exit 0。

这两项仍只证明 Surface 展示层契约，不替代真实媒体服务、读屏实机、
发布包或部署验收；整体保持 `PARTIAL`。

## Surface SVAR 引擎配置反馈补丁（2026-10-24）

- `SvarGridWidget` 未配置 SVAR 引擎时改用 `SurfaceMessages.tableEngineUnavailable`
  的统一本地化文案，不再在组件内硬编码中英文；宿主可通过 `messages` 覆盖该文案，
  与其他 Surface 状态反馈保持同一 locale/override 契约。
- 主线程独立验证：`SvarGridWidget.test.svelte.ts` **16/16，exit 0**；
  `packages/surface` `svelte-check` **0 errors / 0 warnings**；目标 ESLint
  与 `git diff --check` 均 exit `0`。
- 该修复只收敛未配置引擎时的本地展示反馈，不证明真实 SVAR 引擎加载、
  Provider/RBAC、读屏实机、发布包或部署验收；整体仍保持 `PARTIAL`。

## Surface 业务组件错误分类补丁（2026-10-24）

- `ResourceDetailWidget` 与 `ActivityFeedWidget` 现在复用统一的
  `surfaceErrorMessage` 映射：权限拒绝、数据无效和其他服务失败分别使用稳定的
  本地化文案，不再把所有错误压成同一个不可用状态；原始 Provider 诊断仍不进入 DOM。
- 新增业务组件回归覆盖 `access_denied` 与 `provider_result_not_json`；
  主线程独立验证 `business.test.svelte.ts` 与 `SvarGridWidget.test.svelte.ts`
  合计 **25/25，exit 0**，相关目标 ESLint 与 `git diff --check` 均 exit `0`。
- 该修复只证明本地 Surface 错误分类契约，不替代真实 Provider/RBAC、服务端
  错误码一致性、读屏实机、发布包或部署验收；整体保持 `PARTIAL`。

## 认证页面错误反馈补丁（2026-10-24）

- 注册、找回密码和重置密码页面不再直接展示 AuthProvider 返回的
  `error.message`，统一使用 `common.operationFailed`；页面已有的必填和密码
  确认等可操作校验文案保持不变。
- 新增认证契约回归，覆盖三类页面的 Provider 私有诊断不可见；主线程第一次
  复验发现测试选择器误匹配认证壳侧栏与主内容的同名标题，已改为明确匹配
  `h1` 后最终 **12/12，exit 0**。目标 ESLint 与 `git diff --check` 均 exit `0`。
- 该修复只证明前端认证错误展示契约，不替代真实认证服务、账号策略、租户、
  读屏实机、发布包或部署验收；整体保持 `PARTIAL`。

## 登录页错误反馈补丁（2026-10-24）

- `LoginPage` 不再直接展示 AuthProvider 的 `error.message`，失败统一使用
  `auth.loginFailed`；本地必填校验、登录成功回调和现有错误关联保持不变。
- 认证契约回归扩展为登录、注册、找回密码、重置密码四类页面；主线程独立验证
  **13/13，exit 0**，目标 ESLint 与 `git diff --check` 均 exit `0`。
- 该修复只证明前端登录错误展示契约，不替代真实认证服务、账号策略、租户、
  读屏实机、发布包或部署验收；整体保持 `PARTIAL`。

## 残余错误反馈路径审计（2026-10-24）

- 对 `packages/ui/src/components` 与 `packages/surface/src/components` 的用户可见
  错误路径做了有界复查。`FileUpload` 的原始上传错误仅保留在宿主
  `onChange` 数据契约，DOM 使用 `upload.failed`/`upload.cancelled`；
  `ImportWizard` 的文件解析文案属于用户可操作的格式、读取和列结构提示；
  Schema、Surface 和表单摘要中的 issue/message 属于本地稳定校验反馈。
- 未发现新的低风险、无需产品或真实服务契约即可安全实施的用户可见诊断泄露；
  不因扫描命中而改写宿主诊断回调或稳定校验文案。
- 本轮保留 `PARTIAL`：真实 Provider/RBAC/租户、服务端 Schema 一致性、版本
  历史契约、读屏实机、发布和部署仍需外部输入或授权。

## B2-06 Tree / TreeSelect / Cascader 默认行为契约与审计结果（2026-10-24）

本轮只做文档契约补记，未修改源码或测试。依据验收矩阵
[B2-06](./enterprise-ui-acceptance-matrix-20261022.md#b2-06-tree-treeselect-cascader)
与剩余项审计
[enterprise-ui-remaining-20261023.md](./enterprise-ui-remaining-20261023.md#4-全部原始编号的当前未完成要求)，
当前本地默认行为确认如下：

- TreeSelect 多选使用叶子值级联；父节点的 `true` / `mixed` / `false` 状态由
  可选择叶子集合推导，父项级联在懒加载完成后一次性提交，失败不产生部分提交。
- TreeSelect 的 `onlyLeafSelectable` 已实现：父节点只展开，不进入提交值；
  禁用节点及其子树不参与可选择叶子集合。
- Cascader 使用完整路径值语义；默认 `changeOnSelect=false` 时仅在叶节点路径
  完成后提交，`changeOnSelect=true` 时允许提交已选择的父级路径。
- 懒加载分支在子节点加载完成前不提交；失败显示稳定错误并支持重试，迟到或
  失效请求不会覆盖当前树。

上述行为已有组件测试、宿主 `bind:options` 证据和异步/半选交叉回归；这表示
当前公开 API 的本地协议已实现，不等同于真实 Provider/RBAC、读屏实机、发布或
部署验收。

以下语义仍属于产品契约，不能从现有推荐默认值推导并擅自实现：

- strict/non-strict 父子选择模式及其公共 API；
- TreeSelect 父节点是否进入 `value` / `onchange`；
- 禁用父节点、禁用子节点对父级半选、全选和既有受控值的具体影响；
- 懒加载未完成、无 loader、空结果和受控值指向未加载节点时的可选、半选、
  自动预加载与提交语义。

因此，B2-06 当前可继续维护和记录上述既有默认协议，但在产品确认前不新增
`strict`、`cascadeStrategy`、父值回传或未加载节点预加载等公共 API。剩余判断与
证据边界见验收矩阵 B2-06 及
[enterprise-ui-remaining-20261023.md](./enterprise-ui-remaining-20261023.md#5-本地功能缺失的-ownership-与可实现性)。

## 本地分发与跨窗口续接复验（2026-10-26）

- B3-09 example 跨窗口标签集合已由 pi 实施并经主线程复验：同一
  `sessionScope` 只同步打开、关闭和 LRU 淘汰；查询缓存、草稿、滚动和业务写入不
  通过 `BroadcastChannel` 传播；专用 Playwright `1 passed`，目标 ESLint、example
  check 和 `git diff --check` 均通过。证据见
  `../evidence/workspace-cross-window-20261026.md`。
- 当前 dirty 工作区的分发复验已由 pi 执行、主线程独立复跑：
  `build:packages`、`build:example`、`pack:check` 均 exit `0`，`@svadmin/ui`
  `1033 tarball entries verified`，33 个发布包入口/声明目标审计通过。证据见
  `../evidence/enterprise-ui-distribution-revalidation-20261026.md`。
- 这两项只关闭本地跨窗口消费方与当前分发一致性复验；不关闭真实认证/对象存储、
  服务端冲突/幂等/取消/任务持久化、服务端 Schema 一致性、版本历史产品契约、
  实机读屏、发布部署或在线验收。整体状态继续保持 `PARTIAL`。

## OrbStack Auth / 对象存储可行性收口（2026-10-26）

- pi 对本机 `orbstack` 做了有界可行性验收；主线程审查证据。
- 当前仓库 compose 只有 PostgreSQL 与 PostgREST，fixture 只有进程内 HS256 JWT
  加 RLS 数据契约；虽然本机缓存了 GoTrue 与 Storage API 镜像，但没有对应的
  数据库迁移、issuer/JWKS、用户生命周期、Storage schema、bucket/object policy、
  backend 或清理契约。
- 因此没有拼接猜测性服务、没有发送 Auth/Storage HTTP smoke，也没有读取远端凭据。
  这不是“镜像不存在”的阻塞，而是本地测试服务契约和 schema 输入缺失。
- 证据见 `../evidence/enterprise-orbstack-auth-storage-feasibility-20261026.md`。
  在获得本地测试专用、可丢弃的服务契约后，才能继续注册/登录/刷新/登出或上传/
  下载/删除/权限拒绝 smoke；整体仍保持 `PARTIAL`。

## 样式契约与依赖环境复验（2026-10-26）

- pi 审查 dirty 的 UI/Surface 修改，`packages/ui` CSS 契约 **55/55**、颜色契约
  **4/4**、`git diff --check` 均通过，未发现新的裸颜色或裸 Tailwind 调色板。
- 共享 `node_modules` 首次运行 `check:styles` 因 19 个未声明的 `@pandacss/*` 残留
  exit `1`；主线程将该目录临时移出并立即恢复后独立复验 `check:styles` exit `0`，
  证明仓库声明依赖、源码样式边界和 lockfile 本身通过。
- 证据见 `../evidence/enterprise-ui-style-contract-20261026.md`。该结果不改变发布、
  真实服务、读屏和在线验收边界；正式 release gate 仍应使用干净依赖环境。

## B2-11 oneOf 跨浏览器复验（2026-10-26）

- 主线程独立运行 `bunx playwright test -c scripts/fixtures/enterprise-ui/playwright.schema-oneof.config.ts --reporter=line`。
- Chromium/WebKit/Firefox × desktop/narrow 共 **42/42 passed**，exit `0`，无 skip。
- 覆盖字段级与根级显式 discriminator、未选择阻断、分支切换清理旧字段、默认值边界、
  readOnly 继承、歧义 selector 和 accessor fail-closed。
- 该结果证明当前本地 oneOf 公开契约在六个浏览器项目下稳定；外部 Schema resolver、
  服务端一致性、真实权限、读屏、发布和部署仍保持独立边界。

## B2-11 受控外部 Schema 引用与总门禁复验（2026-10-26）

- `referenceDocuments` 已形成受控外部引用子集：宿主只能注入已取得的普通文档，
  `$ref` 只按精确 URI 映射解析，外部文档只允许根文档或 `/$defs/<name>` fragment；
  未知 URI、相对/非法 fragment、循环、访问器、非普通对象和预算超限均 fail closed。
- 解析不执行 `fetch`、XHR、动态 import、storage 或环境读取；输入 Schema、引用文档
  和表单值保持不变，渲染、默认值和提交校验共用同一份解析结果。公开导出
  `SchemaFormReferenceDocuments`，Schema 错误通过稳定 code 与 JSON Pointer 反馈。
- 主线程独立验证：resolver + 递归 Schema + 企业表单回归 **119/119，exit 0**；
  `schema-oneof` Playwright **42/42，exit 0**；`bun run check` **exit 0**，
  Svelte 检查为 **0 errors**（保留已有 warning）；`git diff --check` **exit 0**。
- 这项本地阻塞已解除。仍不承诺远程 HTTP resolver、SSRF/鉴权/缓存/完整性、
  服务端 Schema 一致性、真实 Auth/Storage、实机读屏、registry 发布、部署或在线验收；
  总体状态仍为 **PARTIAL**，这些依赖必须分别取得真实契约和验收证据。

## TreeTable 与审批动作错误反馈复验（2026-10-26）

- `TreeTable` 对宿主传入的 `error` 不再直接写入 `role="alert"`，统一映射为
  `common.operationFailed`；树数据/列配置自身无效时优先保留更具体的
  `treeTable.invalidData`，懒加载失败和显式 Retry 仍保持原有行为。
- `ApprovalActionCard` 审查确认三类审批回调已经统一使用稳定失败文案；直接测试补充
  了异常对象、空错误和非 Error 值的恢复路径，保留草稿和重试语义。
- 主线程独立验证：审批卡片 + TreeTable **55/55，exit 0**；目标 ESLint
  `--max-warnings 0` 和 `git diff --check` 均通过。
- 这项展示层缺口已关闭；不扩展为真实审批服务、权限撤销、服务端幂等、读屏、发布或部署完成。

## Surface Provider 错误反馈复验（2026-10-26）

- `SurfaceRenderer`、Surface source cache 和 runtime 现在将 Provider/授权异常的
  用户可见状态统一为稳定文案；宿主 `onError` 仍可接收原始诊断，便于受信任记录。
- `provider_result_not_json`、`binding_pointer_not_found` 等本地结构/绑定校验错误
  继续保留可操作信息，不被泛化为不可区分的服务失败；请求隔离、重试和过期结果丢弃
  行为保持不变。
- 主线程独立验证：Surface 运行时、缓存和三个 Renderer 回归文件 **90/90，exit 0**；
  Surface `svelte-check` **0 errors / 0 warnings**；目标 ESLint 和
  `git diff --check` 均通过。
- 这项 Surface 展示层缺口已关闭；不扩展为真实 Provider/RBAC、服务端错误码契约、
  读屏实机、发布或部署完成。

## Supabase Auth 适配器契约复核（2026-10-26）

- pi 与主线程复核确认 `@svadmin/supabase` Auth provider 已将 SDK/Provider 异常
  归一化为稳定错误码和固定文案；login、register、session/user、logout、password
  update/reset 的响应边界均有严格 schema 校验。
- 已覆盖 session token 与 user ID 一致性、revision 竞态、登录/登出串行化、权限解析
  结果隔离和错误清理；未发现新的本地实现缺口，也未扩展未定义的 MFA/AAL 公共 API。
- 主线程独立验证：`auth-validation.test.ts` **27/27，170 assertions，exit 0**；
  pi 与主线程均确认目标 ESLint 和 `git diff --check` 通过。
- 未覆盖真实 GoTrue、MFA challenge/verify、跨客户端 session 替换和真实租户服务隔离；
  这些仍属于外部服务契约验收。

## B3-05 版本差异本地可访问性收口（2026-10-26）

- pi 对 `VersionDiffViewer`、详情区异步 section 和直接测试做了有界审查；版本历史
  仍只有宿主显式提供 `oldValue/newValue` 的展示契约，没有版本 ID、列表/选择 API、
  恢复动作或独立版本权限契约，因此没有新增历史 schema 或默认版本服务。
- 已实施确定的本地缺口：`Side by Side` / `Unified` 互斥按钮补充
  `aria-pressed`，装饰性 Lucide 图标补充 `aria-hidden="true"`。曾评估的空对象
  通用 empty 状态已撤回，因为空对象可能表示“无变更”或“无历史”，不能凭 UI 猜测。
- 主线程独立验证：`version-diff-viewer.test.svelte.ts` **2/2，exit 0**；目标生产组件
  ESLint `--max-warnings 0` 与 `git diff --check` 均通过。详情 workspace 直接测试
  已在本线程复跑 **9/9**，其余历史测试 lint 问题未扩展到生产组件。
- B3-05 的版本服务、版本列表/选择、版本级空态/错误/权限/冲突语义仍需产品和后端
  契约；真实版本服务、RBAC/租户、读屏实机、发布和部署仍未验收。
