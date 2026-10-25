# 导入导出中心 B3-03 本地真实浏览器消费路径（2026-10-23）

## 范围

- 只新增专属浏览器 fixture、Playwright spec、专属配置和 App fixture 路由，不修改 `ImportWizard.svelte`、`ExportButton.svelte` 或 core 实现。
- 真实挂载 `ImportWizard` 与 `ExportButton`，使用真实 `provideAdminContext`、`QueryClientProvider` 和受控本地 `DataProvider` / `TaskProvider`。
- 使用用户级操作（选择文件、点击 Start import / Download / Download failed CSV）和浏览器真实 download 事件；不调用组件内部私有方法。
- 每个用例在 `beforeEach` 导航前注册 `pageerror`，在 `afterEach` 统一断言零页面错误，避免漏掉初始化阶段异常。
- 导出场景在导航前注册 download 计数；按钮就绪后断言计数为 0，点击并读取 artifact 后断言恰好为 1，同时任务提交计数仍为 0；不依赖单次 `waitForEvent` 只捕获后一次下载。
- 未运行全仓测试，仅由 pi 运行专属 Playwright 单文件；不宣称主线程已运行。未提交、未推送、未部署。

## 执行命令与结果（pi 自测）

在仓库根目录运行：

```bash
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts
```

实际结果：

- 3 passed (3.8s)，原始 exit code 0
- 项目：`chromium-desktop`（Desktop Chrome），单 worker
- `git diff --check` 原始 exit code 0
- 上述仅为 pi 本地自测结果，不代表主线程或发布门禁已执行。

首轮曾失败一次，原因是专属 fixture 同时渲染导入模态框与导出按钮，模态框遮罩阻断了导出点击；已在 fixture 中按 `panel=import|export` 隔离两个面板，并把按钮定位改为真实可访问名，不是生产组件缺陷，也未修改生产代码。

## 实际覆盖

### 1. CSV 映射预校验阻止非法提交

- 通过真实文件输入选择 `title,quantity` CSV，其中第 2 条 `quantity` 为非数字。
- 自动映射后点击 `Start import`；预校验发生在该点击之后、任何 `DataProvider.create` 写入之前，而不是点击之前。
- 断言页面出现 `Row 2` 预校验错误，仍停留在映射步骤，`DataProvider.create` 调用为 0，fixture 记录的成功写入为空，`onSuccess` 未触发。
- 这验证的是组件已有逐行 `parseContractCreateInput` 预校验；不是新增或虚构的“试运行 API”。前一版报告把预校验写成“点击前”，本版已修正。

### 2. 合法映射导入与部分失败报告真实下载

- 合法 CSV 共 3 行；受控 `DataProvider.create` 对 `Reject me` 行返回失败，对另外两行成功。
- 断言 `onSuccess` 收到精确 `{"succeeded":2,"failed":1}`，`create` 调用 3 次，成功写入仅为 `Alpha` 与 `Gamma` 两行。
- 页面显示 `1 records failed to import.`。
- 点击 `Download failed CSV`，捕获真实浏览器 download：文件名为 `browser-import-import-errors.csv`。
- 对报告内容做整份精确断言：`title,quantity,_error_reason` 加唯一的失败行 `Reject me,3,Import failed`，没有 `Alpha`、`Gamma` 等成功行，也不包含受控 Provider 的私有错误文本。
- 当前 API 没有独立的“试运行/干跑”入口；合法路径是“客户端映射预校验后执行真实 create 写入”，本证据不把它冒充为服务端试运行。

### 3. ExportButton 任务恢复后的显式下载

- 在导航到导出场景前注册 download 监听并累计真实下载事件。
- `ExportButton` 通过 `initialTaskId` 恢复受控 `TaskProvider.get` 返回的 completed 任务，不触发 `submit`；按钮就绪后断言 download 计数为 0、任务提交计数为 0、任务读取计数非 0。
- 按钮由处理中状态切换为显式 `Download`，点击并读取 artifact 后断言 download 计数恰好为 1，任务提交计数仍为 0。
- 下载文件名为 `browser-export_export.csv`，内容精确为受控同源 artifact 的 5 条记录（含表头共 6 行）。
- 该用例验证“任务恢复 + 显式 artifact 下载”路径；artifact 是本地受控静态文件，不是真实服务端全量导出，也不证明服务端任务持久化或进程重启恢复。
- `ExportButton` 当前 props 未暴露 `pageSize`，组件层不能像测试 host 直接配置 `useExport` 的逐页大小；因此本项选择现有可执行的任务恢复显式下载路径，不把默认 `pageSize=20` 的客户端读取冒充分页导出或服务端全量导出。

## 证据边界与未闭环项

- 仅 Chromium desktop；WebKit/Firefox 与 narrow 视口未覆盖，保留为后续跨引擎缺口。
- `DataProvider` / `TaskProvider` / 下载 artifact 均为本地受控 fixture；fixture 的 `getList` 仅返回空列表，已移除未使用的 `ExportRow` / `exportRecords` 和分页切片路径，不用它制造分页导出证据。本证据不证明真实服务端持久化、授权/租户隔离、失败报告下载鉴权或任务进程重启恢复。
- 不证明服务端全量导出、大文件性能/超时、真实对象存储、真实浏览器下载策略差异或发布包。
- 未做读屏/真实设备验收；`ImportDropzone` 的既有选择/重试证据不作为本项中心证据。
- 仍不宣称 B3-03 整体完成；本文件只补本地真实浏览器消费路径。
## 主线程独立复核

- 修正版专属命令 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts`：Chromium desktop 3/3 passed、exit 0、3.9s，与 pi 自测分开记录。
- 已检查 fixture 的真实 ImportWizard/ExportButton 挂载，以及测试中的零写入、成功行精确值、失败 CSV 全文、恢复导出任务后点击前零下载/点击后一次下载和 submit 零调用断言；pageerror 在导航前注册。
- 该轮仅新增测试基础设施，不修改生产组件。独立试运行、真实持久化/授权、服务端全量导出和其他浏览器/读屏仍未验证。

## 2026-10-23 跨引擎/narrow follow-up（pi 自测）

- 本轮只改测试基础设施：`playwright.import-export-center.config.ts` 扩展为 Chromium/WebKit/Firefox × desktop/narrow 共 6 个项目，`workers: 1`，仍只运行同一 `import-export-center.spec.ts` 的 3 个场景，没有新增或复制用例；`ImportExportCenterFixture.svelte` 与生产组件未改。
- 在 `import-export-center.spec.ts` 增加窄视口无横向溢出断言：仅当项目名以 `narrow` 结尾时检查 `document.documentElement.scrollWidth <= window.innerWidth`，保留导航前注册的 `pageerror` 收集与 `afterEach` 零页面错误断言。
- 先确认原配置基线：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts --project=chromium-desktop`，3/3 passed、exit 0、3.7s。
- 配置扩展后再次单独运行 `--project=chromium-desktop`，3/3 passed、exit 0、3.9s。
- 再运行全矩阵：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts`，**18/18 passed、原始 exit code 0、18.1s、单 worker**；项目为 `chromium-desktop`、`chromium-narrow`、`webkit-desktop`、`webkit-narrow`、`firefox-desktop`、`firefox-narrow`，每个项目 3/3。`results.json` 记录 `expected=18`、`unexpected=0`、`flaky=0`。
- 本轮未改生产组件，未提交、未推送、未部署；既有脏改动保留。以上均为 pi 本地自测，主线程独立复核待补。
- 覆盖边界不变：受控 `DataProvider` / `TaskProvider` 与同源静态 artifact，不是真实服务端导入/导出、任务持久化、授权/租户隔离、失败报告下载鉴权或大文件性能证据；也不证明真实设备、读屏或发布。

## 三引擎独立复核

- 主线程执行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts`：18/18 passed、exit 0、17.6s；项目为 Chromium/WebKit/Firefox × desktop/narrow。与 pi 自测 18/18、18.1s 独立记录。
- 已检查配置和既有断言保持不变；新增的是窄屏页面级无横向溢出，不等于内部所有控件无裁切，也不代表真实移动设备或读屏验收。
- 本轮不修改生产组件，不证明真实服务端任务/授权/持久化、独立试运行、服务端全量导出或发布。


## 2026-10-23 本地 dry-run 增量（pi 自测，待主线程独立复核）

- 生产入口：`ImportWizard.svelte` 新增公开 `dryRun`/`onPreview`；`@svadmin/core` 新增 `ImportPreviewResult`/`ImportPreviewFailure` 与安全失败构造，`@svadmin/ui` 重新导出这两个类型。dry-run 复用现有 CSV/JSON 解析、列映射、类型转换与 `parseContractCreateInput` 逐行预校验，不调用 `useImport.handleChange`、`DataProvider.create/createMany`，不提交或轮询 `TaskProvider`。
- 类型化结果：`{ totalRows, importableRows, failedRows: [{ row, error }] }`；`row` 为 1-based 记录序号（不含表头），失败原因固定为安全文本 `Invalid import input`，不回显解析器或 Provider 诊断。普通导入行为保持不变，未设置 `dryRun` 时仍进入既有真实写入路径。
- 组件单文件：在 `packages/ui` 运行 `bunx vitest run --config ./vitest.config.ts src/components/import-wizard.test.svelte.ts`，**74/74 passed、原始 exit code 0**。既有 70 个普通导入/任务/失败报告用例全部通过；新增 4 个 dry-run 场景覆盖合法行类型化计数、非法行原因、解析器私有诊断不外泄、租户切换后预览清空，并断言 `create`/任务提交均为 0。
- 真实浏览器：专属 fixture 增加 `panel=preview`，真实挂载 `ImportWizard` 并使用用户可操作的 `Preview import` / `Back to import`。先运行 `bunx playwright test --config playwright.import-export-center.config.ts --project=chromium-desktop`，**4/4 passed、原始 exit code 0**；再运行完整专属配置，**24/24 passed、原始 exit code 0、24.1s、单 worker**（Chromium/WebKit/Firefox × desktop/narrow，每个项目 4/4）。新增场景使用 2 行 CSV（1 行合法、1 行非法），断言预览回调精确为 `{"totalRows":2,"importableRows":1,"failedRows":[{"row":2,"error":"Invalid import input"}]}`，页面显示 `Row 2: Invalid import input`，`create` 0 次、成功写入为空、无 `Start Import`；点击 `Back to import` 返回映射后仍为 0 次写入，窄视口保留无横向溢出断言。
- 证据边界：dry-run 是客户端预检，不调用服务端只读校验，不是服务端试运行；不证明唯一性、真实授权/租户隔离、业务状态检查、任务持久化、服务端全量导出、读屏或发布。本轮未修改真实后端、`ImportDropzone` 或其他无关组件，未提交、未推送、未部署，既有脏改动保留。

## 2026-10-23 dry-run 修正与 onPreview-only 正式导入证据（主线程独立复核）

- 修正预览文案与语义：中英文 summary 改为“本地校验通过/失败”计数，不再使用 `can be imported` 这类可能被理解为服务端可导入的表述；hint 明确只做客户端解析、映射和创建规则校验，不保证服务端导入成功。`importableRows` 保留兼容，但类型注释明确它只代表本地 schema 校验通过。预览失败行改用 i18n `import.previewFailedRow` 渲染，不再硬编码 `Row`。
- 修正 dry-run 任务隔离：`dryRun=true` 与 `initialTaskId`/`taskName` 同时存在时，不再恢复任务 UI，不调用 `TaskProvider.get/submit/cancel`，不调用 artifact `upload`，也不显示 `Cancel`/`Retry`。切换到 `dryRun` 或离开 `dryRun` 时清理已恢复任务、提交尝试和上传控制器；正常非 dry-run 的 `initialTaskId` 恢复行为不变。
- 修正 `onPreview` 边界：观察者收到的是隔离且冻结的快照，不是组件内部预览对象；同步抛错和异步拒绝均被捕获，不产生未处理异常，也不能篡改预览 UI。
- 修正普通导入预校验：普通 `Start Import` 恢复首错早停，只报告第一条非法行；`Preview import` 才聚合全部失败行。
- 新增 onPreview-only 真实操作场景：`panel=preview-import` 先用真实文件输入预览 2 行合法 CSV，点击 `Back to import` 返回映射（这一步只是返回映射，不是正式导入），随后把 `Map quantity` 改为忽略，点击 `Start import` 因缺少必填字段被 `Row 1` 阻断且 `create` 0 次、写入为空；再把映射改回 `quantity` 并点击 `Start import`，真实写入 Alpha/Beta 两行，`onSuccess` 为 `{"succeeded":2,"failed":0}`。该场景证明“预览后返回映射”和“正式导入”是两条不同路径，正式导入仍会重新校验并真实写入。
- 单测补权限撤销、关闭/重开、provider 切换清理预览，以及 dry-run 初始化/模式切换任务隔离、观察者异常/异步拒绝、冻结快照隔离；既有用例保留。主线程独立运行 `bunx vitest run --config ./vitest.config.ts src/components/import-wizard.test.svelte.ts` 为 **83/83 passed、原始 exit code 0**。
- 专属浏览器主线程独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.import-export-center.config.ts` 为 **30/30 passed、exit 0、29.5s、单 worker**（Chromium/WebKit/Firefox × desktop/narrow，每个项目 5/5）。
- pi 自测单独保留：新增红测 **8 failed / 75 passed**；修复后单测 **83/83**，Chromium desktop **5/5**，完整浏览器 **30/30、29.8s**。主线程单测耗时 **11.49s**，与 pi 运行不合并计数。
- 执行记录：主线程首次单测从根目录调用了不存在的配置，未执行测试；改用 `packages/ui` 工作目录后通过。首次浏览器启动因 4195 端口仍占用而退出；等待 pi 会话结束后独立重跑通过，未复用其他进程。定向 `git diff --check` 退出 0。
- 边界不变：仍为本地受控 `DataProvider`/`TaskProvider` 和静态 artifact，不是真实服务端试运行、真实任务持久化、服务端全量导出、下载鉴权、真实授权/租户、读屏或发布证据；本轮未提交、未推送、未部署。
