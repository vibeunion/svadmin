# 企业 UI 分发与构建复验（2026-10-26）

## 范围

- 工作区：`/Users/zhd/workspace/svadmin`。
- 目的：在当前已有 dirty 工作区上复验企业 UI 的本地构建、示例构建和发布包检查。
- 本任务不新增产品能力，不修改 `packages/ui` 公共 API，不提交、推送、发布、部署。
- 既有 dirty 修改全部保留；本任务未修改源码或既有文档。
- 构建脚本生成的 `packages/*/dist` 与 `example/dist` 属于既有忽略产物，按仓库约定保留。

## 核心命令

### `bun run build:packages`

- 退出码：`0`。
- 结果：12 个发布相关 workspace 包完成构建，包含 `@svadmin/ui`、`@svadmin/surface`、
  `@svadmin/editor`、`@svadmin/lite`、`@svadmin/auth-utils`、`@svadmin/sso` 等。
- 原始非失败提示：

  ```text
  @sveltejs/package found the following issues while packaging your library:
  Avoid usage of `import.meta.env` in your code. It only works in apps bundled with Vite.
  Consider using packages like `esm-env` instead which works with all bundlers or without bundling.
  ```

  该提示来自当前已有代码的打包兼容性检查，本轮未修改源码或构建配置。

### `bun run build:example`

- 退出码：`0`。
- 结果：Vite 完成示例生产构建，`10774 modules transformed`，构建耗时约 `12.56s`。
- 原始非失败提示包括：
  - `no Svelte config found .../example - using default configuration.`
  - `state_referenced_locally`：`DashboardWorkspace.svelte` 捕获默认参数初始值。
  - `INEFFECTIVE_DYNAMIC_IMPORT`：KaTeX 同时存在动态与静态导入。
  - `Some chunks are larger than 500 kB after minification.`
- 以上为构建 warning，不影响本次命令退出码；本轮不把它们表述为性能或行为验收通过。

### `bun run pack:check`

- 退出码：`0`。
- 结果：33 个 workspace 发布包的 tarball 清单检查通过。
- `@svadmin/ui`：`1033 tarball entries verified`。
- packed consumer 检查通过：
  - `consumer imports passed`
  - `consumer type imports passed`
  - `packed npm install passed`
  - `packed bin shim doctor passed`
  - `packed doctor clean passed`
  - `packed doctor drift passed`
  - `packed upgrade dry-run passed`
  - `packed guidance migration passed`
  - `packed infer generation passed`
  - `pnpm@11.11.0 strict packed consumer passed`
  - `packed AI Elements Vite SSR consumer passed`
  - Surface `workspace-packed` 与 `minimum-supported` consumer 均构建通过
- peer consumer 解析到统一的 `svelte@5.57.1`。
- forbidden dependencies 检查通过；可选 Markdown peer 缺失被识别为 optional，不构成失败。

## 发布入口与声明核对

使用只读 Node 审计解析当前 `packages/*/package.json`：

- 检查 package：`33`。
- 检查 `exports`/`types` 目标：`267`。
- 检查通配导出目标：`22`，均至少匹配一个实际分发文件。
- manifest 目标缺失：`0`。
- 所有当前发布包的入口和类型声明目标均存在于源码工作区或已生成的 `dist` 中。
- `@svadmin/ui@0.88.1` 的 `exports` 主入口、`rendering`、CSS、组件通配入口、
  `code-editor`、`json-editor`、`qr-code`、`design-contract`、`recipes` 与
  `component-registry` 目标均可解析。
- `@svadmin/ui`：500 个可同路径比较的 `.svelte` 源文件与 `dist` 文件逐字节一致，
  字节不一致数为 `0`。

该核对证明当前本地源码已进入对应的分发目录，并且声明目标存在；不等同于 registry
上的发布包、消费者线上安装或部署产物已验收。

## 工作区保护

- 核心命令前后，已有 tracked dirty 文件和未跟踪文件仍保留。
- 本任务只新增本文件：
  `docs/evidence/enterprise-ui-distribution-revalidation-20261026.md`。
- 未修改 `packages/ui` 公共 API；未提交、推送、发布或部署。

## 未覆盖边界

- 不覆盖全量单元测试、全量浏览器矩阵、屏幕阅读器实机验收或移动端验收。
- 不覆盖真实认证、真实对象存储、服务端版本冲突/幂等/取消/任务持久化协议。
- 不覆盖远程 Schema 一致性、生产 RBAC、registry 发布、部署和在线验收。
- 本地 `dist`、tarball 和 packed consumer 通过，不代表生产服务或线上发布完成。
- 当前企业级 UI 整体状态仍需结合其他验收证据判断，不能仅凭本轮分发复验改称整体完成。

## 结论

本地分发/构建复验通过：三个核心命令均为退出码 `0`，发布入口与类型声明目标完整，
`@svadmin/ui` 可直接比较的 Svelte 分发文件与源码一致。原始失败输出：无；本轮没有核心
命令失败，因此未执行失败中止路径。

## 主线程独立复验

主线程随后在同一工作区独立复跑：

- `bun run build:packages`：exit `0`；
- `bun run build:example`：exit `0`，`10774 modules transformed`；
- `bun run pack:check`：exit `0`，`@svadmin/ui` `1033 tarball entries verified`；
- `git diff --check`：通过。

主线程结果与 pi 结果一致；warning 仍仅限上文记录的既有构建提示，不作为失败或性能
验收通过的依据。
