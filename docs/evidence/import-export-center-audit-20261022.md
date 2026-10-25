# 导入导出中心 B3-03 当前状态复核（2026-10-22）

## 范围

- 仅复核 `packages/ui` 的导入向导测试与导出契约测试，判断 B3-03 已有覆盖与缺口。
- 两个测试文件**分别独立运行**，不合并成一次命令：
  - 首轮只运行 `src/components/import-wizard.test.svelte.ts`，`src/components/export-contract.test.svelte.ts` 仅做只读代码核对。
  - 续轮（本文件追加段落）只运行 `src/components/export-contract.test.svelte.ts`，不再运行导入向导文件。
- 不将 `ImportDropzone` 的选择/校验/失败重试等同导入导出中心，不将测试内 stub provider 外推为真实服务能力。
- 未新增或修改实现代码。

## 执行命令与结果（首轮：ImportWizard，pi 自测）

在 `packages/ui` 运行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/import-wizard.test.svelte.ts
```

实际结果：

- Test Files：1 passed (1)
- Tests：70 passed (70)
- Duration：13.54s
- 原始 exit code：`0`

同时执行 `git diff --check`，原始 exit code：`0`。本轮未提交。

## 测试实际覆盖（import-wizard.test.svelte.ts，已运行）

该文件通过 `import-wizard.test-host.svelte` 挂载 `ImportWizard`，使用测试内 `DataProvider`、`TaskProvider`、`ImportArtifactProvider` 与 `permission` stub。

### 1. 预校验

- 映射后、提交前逐行预校验，非法行阻断任务提交且不回落本地写入（`Row 2`）。
- 缺失必需映射、重复目标映射、确定性类型错误均在进入写入/提交前阻断。
- 空/歧义 CSV、非法 JSON、非法 JSON 数组形态在映射前失败关闭。
- 文件大小、CSV/JSON 行数限制在读取或映射前阻断；core importer 对 `maxBytes`/`maxRows`/非法限制失败关闭。
- 任务模式下缺少 `taskName`、幂等键或 `taskProvider` 时拒绝提交，不回落本地写入。
- 权限 `permission.can` 拒绝或 `canCreate=false` 时禁用文件选择，不能启动导入。
- 畸形 artifact 回执（如 `Infinity` size）失败关闭，不提交任务。

### 2. 任务持久化 / 恢复

- 新挂载时通过 `initialTaskId` 从 `taskProvider.get` 恢复服务端任务，展示成功/失败计数，不重新读文件、不重新提交。
- 关闭再打开后仍恢复同一任务状态（`Running` / `Succeeded` 计数）。
- 恢复的任务可经 `taskProvider.cancel` 取消。
- 租户切换时清除已恢复任务，不再用旧任务 ID 查询新租户。
- 任务提交只发生一次；重复点击不清除/不重复提交，携带固定幂等键。
- 大负载先上传一次 artifact，再只提交校验后的 artifact 引用，不提交 `records`。

### 3. 失败行引用重试

- 仅使用服务端授权回执中的失败行引用提交 `retry-failed-rows`，携带 `parentTaskId`、`receiptId`、`rows`，并跟踪子任务。
- 未确认提交后使用同一幂等键与同一 payload 重试；不自动重试、不回显传输错误。
- 拒绝指向父任务的 retry 回执。
- 缺失 retry command、缺失 receipt、父任务失败时不提供重试入口。
- 非法 retry receipt（空 rows、重复行、空 receiptId、行号为 1 等）被 `snapshotImportTaskResult` 拒绝。
- 租户/关闭/权限变化后迟到 retry 回执被忽略，不回调、不查询子任务、不本地写入。

### 4. 失败报告

- 部分失败时展示真实成功/失败计数，并提供 `Download Failed CSV`。
- 失败 CSV 含 `_error_reason`，不包含 provider 私有错误文本。
- 下载文件名对资源别名做清洗（去除路径穿越、回退为 `resource`、截断超长名）。
- blob URL 延迟回收，避免下载未开始即撤销。

### 5. 权限 / 租户 / 迟到回执

- 权限拒绝阻止文件选择与任务启动。
- 提交、artifact 上传、失败行 retry 在租户/关闭/权限/provider/artifactProvider 变化或卸载后被作废；迟到回执不回调、不查询、不写入。
- 租户/关闭切换后旧恢复任务与迟到本地写入均不残留。
- 畸形终态任务结果不显示成功计数，失败关闭。

## 首轮只读核对、续轮已运行（export-contract.test.svelte.ts）

首轮仅阅读源码核对声明，未执行该文件，因此下列内容当时**不构成首轮运行证据**；续轮已单独运行该文件，结果见下方“续轮”段落：

- 契约绑定全量导出：逐页校验、非法后页不下载部分结果、`pageSize`/filter/format/limit 校验、零限制不取数。
- 重复触发合并、首次 await 前捕获选项、旧失败不污染新作用域。
- 资源/租户/provider/contract/metadata 变化或卸载后取消迟到下载与回调。
- 错误脱敏、不执行诊断 getter、错误回调中重试状态隔离。
- 任务化导出：提交 scoped export task、不读取 list 页、幂等键、按钮 query/format/limit 透传、mapped export 拒绝任务化。
- 任务恢复与显式下载、非法/不安全下载地址失败关闭、已恢复 artifact 在 tenant/provider/permission/key/filters/sorters/limit 变化后丢弃。
- 未授权按钮不 dispatch。

**首轮状态：未运行。续轮已单独运行，且已完成主线程独立复核，见下方段落。**

## 续轮：export-contract.test.svelte.ts 单文件运行（pi 自测）

本轮只运行导出契约单文件，不新增代码，不重复运行 `import-wizard.test.svelte.ts`。

在 `packages/ui` 运行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/export-contract.test.svelte.ts
```

实际结果：

- Test Files：1 passed (1)
- Tests：59 passed (59)
- Duration：12.49s
- 原始 exit code：`0`

随后在仓库根目录执行 `git diff --check`，原始 exit code：`0`。本轮未提交。

### 实际覆盖（已运行）

该文件通过 `export-contract.test-host.svelte` 挂载真实导出按钮与 `useExport` 契约，使用测试内 `DataProvider`、`TaskProvider` 与 `downloadData`/`downloadExportArtifact` mock。

- 契约绑定全量导出：逐页校验；后页非法时不下载、不返回部分结果；`pageSize`/filter/format/limit 非法时在 dispatch 前拒绝；零限制不取数也不下载。
- 重复触发合并、首次 await 前捕获选项（含 mapper/callback/filters/sorters），旧失败不污染新作用域，卸载后拒绝已保留调用。
- 资源/租户/provider/contract/metadata 变化或卸载后取消迟到下载与回调；错误脱敏、不执行诊断 getter、错误回调中重试状态隔离。
- 任务化导出：提交 scoped export task 且不读取 list 页；幂等键与按钮 query/format/limit 透传；mapped export 拒绝任务化。
- 任务恢复与显式下载；非法/不安全下载地址失败关闭；已恢复 artifact 在 tenant/provider/permission/key/filters/sorters/limit 变化后丢弃；未授权按钮不 dispatch。

### 边界（保持首轮口径）

- 以上仍是内存 stub provider / task provider 与 mock 下载函数的单测证据，不代表真实导出任务服务、对象存储、权限服务或多租户服务。
- 未覆盖真实全量导出后端、真实下载鉴权、大文件性能、浏览器与读屏、发布授权。
- `export-contract.test.svelte.ts` 与 `import-wizard.test.svelte.ts` 是两次独立运行，不能互相当作对方证据；本文件首轮 ImportWizard 结论仍以其自身 70/70、exit 0 为准，ExportContract 以其自身 59/59、exit 0 为准。

**状态：pi 自测完成（59/59、exit 0、`git diff --check` exit 0），主线程独立复核已完成（同一单文件命令 59/59、exit 0、`git diff --check` exit 0），见下方主线程复核段落。**

## 证据边界

- 以上运行证据基于内存 stub provider / task provider / artifact provider，不代表真实导入任务服务、文件存储、权限服务或多租户服务。
- 未覆盖真实服务端任务持久化与进程重启恢复、真实全量导出后端、真实失败报告下载鉴权、大文件性能、浏览器与读屏、发布授权。
- `ImportDropzone` 的已记录证据只覆盖拖放选择/校验/失败重试，不等同 ImportWizard 导入中心。
- 本地 `provider.create` 路径仍由若干兼容用例覆盖，但任务化导入用例已断言任务模式下不发生本地写入。

## 主线程独立复核（2026-10-22，覆盖 ImportWizard 与 ExportContract）

> 两次复核分别对应首轮 `import-wizard.test.svelte.ts` 与续轮 `export-contract.test.svelte.ts`，均为单文件独立执行，不合并命令。

### ImportWizard（已独立复核）

- 独立环境：主线程在 `packages/ui` 独立执行 `bunx vitest run --config ./vitest.config.ts src/components/import-wizard.test.svelte.ts`，结果 70/70 通过、原始 exit code `0`。
- 独立执行 `git diff --check`，原始 exit code `0`。
- 独立确认真实：首轮仅运行 `import-wizard.test.svelte.ts`；`export-contract.test.svelte.ts` 首轮未运行，当时只有只读声明核对。
- 独立确认边界：未将测试内 stub provider / task provider / artifact provider 外推为真实导入导出中心能力，未将 `ImportDropzone` 等同导入导出中心。
- 结论：ImportWizard 的本地任务恢复、失败行引用重试、预校验、失败报告证据状态为**已独立复核**（70/70、exit 0）。

### ExportContract（已独立复核）

- 独立环境：主线程在 `packages/ui` 独立执行 `bunx vitest run --config ./vitest.config.ts src/components/export-contract.test.svelte.ts`，结果 59/59 通过、原始 exit code `0`。
- 独立执行 `git diff --check`，原始 exit code `0`。
- 独立确认真实：该文件与 `import-wizard.test.svelte.ts` 分开运行，不与导入用例合并，也不互相当作对方证据。
- 独立核对关键断言：未授权按钮不 dispatch；任务恢复后仅显式下载、不自动下载；非法/不安全导出结果 fail-closed；scope（资源/租户/provider/contract/metadata/permission）变化后迟到回执被丢弃、不回调不下载。
- 独立确认边界：测试使用内存 stub provider / task provider 与 `downloadData`/`downloadExportArtifact` mock，不外推为真实导出任务服务、对象存储或权限服务。
- 结论：ExportContract 的导出契约证据状态由“pi 自测待复核”改为**已独立复核**（59/59、exit 0、`git diff --check` exit 0）。

### 共同证据边界

- 上述两个文件均只是 **stub/mock 的本地单测证据**，不代表真实导入/导出任务服务、文件存储、真实权限/租户服务。
- 未覆盖真实服务端任务持久化与进程重启恢复、真实全量导出后端、真实下载鉴权、大文件性能、浏览器、读屏与发布授权。
- 真实服务、浏览器、读屏与发布**均未验收**；不能以本次本地单测外推为端到端验收。

## 复核分工

- pi 自测（首轮 ImportWizard）：上述 70/70、exit 0、`git diff --check` exit 0，均在本轮本地完成。
- 主线程独立复核（首轮 ImportWizard）：已完成同一命令复跑（70/70、exit 0）、`git diff --check` exit 0；已确认 `export-contract.test.svelte.ts` 首轮未运行及文档标记；已确认未将 stub/`ImportDropzone` 外推为真实导入导出中心。
- pi 自测（续轮 ExportContract）：`export-contract.test.svelte.ts` 59/59、exit 0、`git diff --check` exit 0，为独立单文件运行。
- 主线程独立复核（续轮 ExportContract）：**已完成**，单独复跑同一命令得到 59/59、exit 0，`git diff --check` exit 0；已确认与 ImportWizard 分开运行，并核对未授权按钮、任务恢复显式下载、invalid result fail-closed、scope change 迟到回执四项。
- 主线程独立复核（ImportWizard）：**已完成**，70/70、exit 0，`git diff --check` exit 0。
- 共同边界：两文件均为 stub/mock 本地单测证据，真实服务、浏览器、读屏、发布均未验收。
