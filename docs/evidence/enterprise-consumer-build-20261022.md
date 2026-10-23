# 企业 UI 示例消费者构建证据

- parent: `enterprise-ui-plan.md` 当前账户/审批浏览器续接
- scope: workspace `example` 的真实 Vite 消费者入口与原生样式边界检查
- command: `bun run build:example`
- source: 用户持续目标；reason: 核实示例消费者是否实际集成本轮改动。
- risk/orchestration: medium / managed；主线程执行构建，Bohr 只读复核证据边界无阻断。

## 结果

- `check-native-style-sources.mjs example` 通过：`747 selectors; component aliases covered`。
- 首次 Vite production build 成功：`10738 modules transformed`，并生成
  `example/dist` 静态产物；该结果后来发现引用的是旧 UI dist，已被下方重建流程
  取代。
- 首次构建的 manifest 指向 `packages/ui/dist`，该目录的 CompanyProfile 仍保留
  固定 `company-name` 和原始异常展示。因此首次成功不能证明本轮源码改动已进入
  消费者。Vite 不执行完整类型检查，不能据此宣称类型门槛通过。
- 构建产生 KaTeX 静态/动态导入混用及超过 500 kB chunk 警告，未作为失败退出，
  也不作为性能验收通过。
- 该结果证明示例消费者可构建，不证明发布 registry 包、真实 Provider、读屏、
  Firefox/WebKit 或生产部署验收。

未提交、推送、发布或部署；`example/dist` 为构建产物，不作为源码变更纳入本轮。

## 重建后的有效证据

- 顺序执行 `bun run build`（`packages/ui`）和根目录 `bun run build:example`，
  均退出 0；第二次示例构建为 **10740 modules transformed**。
- UI 打包提示 `import.meta.env` 对非 Vite 宿主的兼容风险，尚未消除；示例构建
  仍有 KaTeX 混合导入和大 chunk 警告。
- 重建后的 UI dist 中 CompanyProfile 包含 `$props.id()` 和布尔错误状态。
  通过示例 manifest 定位 `assets/CompanyProfilePage-uB8eoAQZ.js`，确认包含
  `common.operationFailed` 和 `-company-name`。该文件 SHA-256：
  `444dea805d0c62fc3f624284f4a91d0e4dd59e274fb6c0e9ba4d5a50479c8cae`。
- 独立执行 `bun run --cwd example check`，退出 0：
  `svelte-check found 0 errors and 0 warnings`，前置示例测试类型检查也退出 0。
- 只证明重建 UI 包后的示例集成和上述类型检查；未将所有其他包重新构建，
  未执行生产 preview 浏览器验收，也未发布 registry 包。

## SecuritySettings 代际修复重建（2026-10-22）

- parent/source：安全页读写代际续接及用户持续目标；本轮只刷新消费者构建证据，
  不修改业务源码、依赖或发布配置。managed，主线程执行，Bohr 只读复核。
- 先执行 `bun run build`（`packages/ui`），再执行
  `bun run --cwd example check` 与 `bun run build:example`。
- UI 包构建退出 0；示例类型检查为 **0 errors / 0 warnings**；示例生产构建
  退出 0，转换 **10740 modules**。
- 示例 manifest 将 SecuritySettings 编译代码收敛在
  `example/dist/assets/NotificationsSettings-CmiXuFAs.js` 依赖链中。该文件
  SHA-256 为
  `cb80ae2ff7c57c4043a572c99e8bb183be4ae16361c9e2bb3e96ebbde2744191`，
  源码 dist 保留 `securityReadId`、`scopeId`、密码 `changingPassword` 函数门禁、
  以及单会话/批量会话 `revoking` 互斥。示例压缩代码对应读取代际 `_e`、
  写入代际 `Q`、密码状态 `Z` 和会话状态 `K`；已检查读取仅自增 `_e`、
  cleanup 同时推进 `Q` / `_e`，三个写入函数分别先检查 `Z` / `K`。
- manifest 中 `SettingsPage.svelte` 与 `SettingsPlainPage.svelte` 均引用上述
  chunk，来源指向 `packages/ui/dist`；UI 包入口导出同样指向 dist，
  `example/vite.config.ts` 无指向 UI src 的 alias。
- 该证据证明当前源码已进入示例消费者构建；仍不证明 registry 发布、真实
  Provider、读屏、跨浏览器或生产部署验收。构建仍保留 `import.meta.env`、
  KaTeX 动态/静态导入及大 chunk 警告。

## DashboardWorkspace 消费者门槛修复（B1-04 follow-up，2026-10-23）

### 主线程独立复核

- `bun run --cwd example check`：exit 0，`svelte-check found 0 errors and 3 warnings`；3 个 warning 均为 `DashboardWorkspace.svelte` 默认参数的既有 `state_referenced_locally`。
- `bun run build:example`：exit 0，10771 modules transformed，built in 4.45s；保留 KaTeX 动静态导入和大 chunk 警告。
- 另以三个独立单文件进程复核 FilterBuilder 48/48（13.02s）、JsonSchemaForm 61/61（12.12s）、SpreadsheetView 122/122（16.00s），均 exit 0。不与 pi 结果合并。
- 该复核基于当前 dirty 工作区，未提交、未发布、未部署。日期按当前任务环境 2026-10-23 记录。

- parent/source：B1-04 消费者验收门槛；主线程确认
  `example/src/features/dashboard/DashboardWorkspace.svelte` 是本目标此前新增的
  工作台消费者，允许对当前 WIP 做最小兼容修复并保留其他修改。唯一 writer 为 pi。
- 工作区身份：HEAD 为 `51ce56238061ede8a3ee3e882f6799a5d896440c`，工作区为
  dirty；`DashboardWorkspace.svelte`、本证据与验收矩阵当前均为 untracked WIP。
  HEAD 不包含这些改动，不能把 HEAD 当作工作区内容身份、验收基线或发布声明。
- 前轮红：`bun run --cwd example check` 出现 1 error，`DashboardView` 的
  `requestContext?: EnterpriseProviderRequestContext` 在
  `exactOptionalPropertyTypes: true` 下与目标 Props 不兼容。
- 本轮修复：仅改消费者传参，从 `@svadmin/core/options` 引入项目已有的
  `definedOptions`，以 `{...definedOptions({ requestContext })}` 省略
  `undefined`；未修改 `DashboardView` 公共 Props，未改其他业务。修复
  `requestContext` 后，同一调用点暴露出 `title` 的同类
  `exactOptionalPropertyTypes` 错误，按同一最小消费者兼容方式将其并入
  `definedOptions({ requestContext, title })`；这是对原“仅 requestContext”
  措辞的范围扩展，已如实记录，仍未放宽 Props 或改动业务。
- 当前绿：`bun run --cwd example check` 退出 0，
  `svelte-check found 0 errors and 3 warnings in 1 file`；3 个 warning 为
  `defaultRegion`/`defaultFrom`/`defaultTo` 的 `state_referenced_locally`，
  不是本轮新增，也不作为验收通过项。`bun run build:example` 退出 0，转换
  `10771 modules`，`built in 4.43s`；仍有 KaTeX 静态/动态导入混用和大于
  500 kB chunk 警告，不作为性能验收通过。`git diff --check` 退出 0，但仅覆盖
  已跟踪文件，本次 untracked 的 WIP 文件不在该 diff 范围。
- 定向三文件测试本轮未执行；既有三文件测试记录来自 pi 自测，不是主线程独立
  复核结果，不能表述为主线程验证。本次只执行上述消费者 check 与构建。
- 未提交、未推送、未发布、未部署；该证据不证明 registry 分发包、真实 Provider、
  浏览器/读屏或生产部署验收。
