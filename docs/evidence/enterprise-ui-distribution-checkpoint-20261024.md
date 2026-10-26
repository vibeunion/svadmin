# 企业级 UI 本地分发检查点（2026-10-24）

## 环境与范围

- 工作区：`/Users/zhd/workspace/svadmin`，本地 dirty 工作区。
- 环境边界：本检查点只涉及本地构建与打包检查，不连接生产或测试服务器，
  不写远端状态。
- 编排：managed；`@svadmin/*` 构建与 `pack:check` 由 pi 执行，主线程负责
  独立审查与产物字节核对。
- 范围：验证当前源码可生成可分发的 `@svadmin/ui@0.88.1` tarball，并核对
  关键 dist 文件与当前工作区构建结果一致。
- 非范围：不重新执行 example、浏览器行为矩阵或全量行为兼容检查；不代表
  registry 发布、部署、在线验收或真实服务/读屏验收。

## 执行命令与日志

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `bun run build:packages` | exit `0`，12 个发布相关 workspace 包构建完成 | `output/enterprise-ui-distribution-20261024/svadmin-build-packages.log` |
| `npm_config_registry=https://registry.npmjs.org bun run pack:check` | exit `0` | `output/enterprise-ui-distribution-20261024/svadmin-pack-check.log` |

- 构建日志保留既有 `import.meta.env` 提示：该提示说明相关代码只在 Vite
  打包环境可用，本轮未因此修改源码或构建配置。
- 日志与产物位于 `output/` 下，属于本地证据，不随源码入库。

## 分包检查结果

- `@svadmin/ui`：`1031 tarball entries verified`。
- 入口与类型：consumer imports、consumer type imports 均通过。
- CLI：packed bin shim doctor、doctor clean、doctor drift、upgrade dry-run、
  guidance migration、infer generation 均通过。
- npm/pnpm peer：`packed npm install passed`；`pnpm@11.11.0 strict packed
  consumer passed`，Svelte 版本解析一致。
- AI elements：strict 类型消费者通过，packed Vite SSR 消费者通过，覆盖
  `@tanstack/svelte-query`、`@xyflow/svelte`、`@xyflow/system`、`katex`、
  `streamdown-svelte`。
- Surface：workspace-packed 与 minimum-supported 两组消费者构建通过。

## 产物与摘要

- tarball：`output/enterprise-ui-distribution-20261024/svadmin-ui-0.88.1.tgz`
- SHA256：`5bd0b5077fa7d624291c37cf645638cb4423e0ba62020b8065f45f832111e027`
- 该摘要只标识本次本地 tarball，不等同 registry 上的发布产物。

## 与当前 dist 的逐文件核对

主线程通过 `tar -xOf` 从上述 tarball 取出文件，与当前 `packages/ui/dist`
比较，确认以下 7 个文件字节一致：

| 文件 | 结果 |
| --- | --- |
| `dist/index.js` | 字节一致 |
| `dist/index.d.ts` | 字节一致 |
| `dist/components/FileUpload.svelte` | 字节一致 |
| `dist/components/FileUploadField.svelte` | 字节一致 |
| `dist/components/AutoForm.svelte` | 字节一致 |
| `dist/components/MultiTabKeepAlive.svelte` | 字节一致 |
| `dist/components/workspace-tab-state.js` | 字节一致 |

该核对证明上述文件未出现 tarball 与当前构建目录的漂移，不覆盖未列出的
其他文件，也不替代行为测试。

## 未覆盖与边界

- 本轮未重新执行 example 构建、浏览器矩阵或全量行为检查；不得将 `pack:check`
  通过表述为行为兼容全绿。
- 所有源码未修改，原始 dirty 状态保持不变；本检查点只新增/追加文档。
- 未提交、推送、发布或部署；tarball 仅为本地生成物。
- 未新增测试候选；可选的 B4 领域场景仍按需评估，不视为必做项。
- B1-04 仅关闭当前分发复验闭环；整体仍为 `PARTIAL`。
- 仍未确定：B2-11 外部 Schema 策略、B3-09 跨刷新草稿政策、服务端协议与
  外部真实服务验收、B4 按需场景选择。

## 状态

- 本地分发检查点：通过（构建 + 官方 registry 下 pack 检查 + 关键 dist
  字节核对）。
- 企业级 UI 整体：`PARTIAL`，外部契约、真实服务、读屏与发布部署仍待输入。

## 主线程预览烟测补记

- 构建后重启本线程持有的本地 5187 预览进程，新 PID 为 `29654`。
- Chromium 实际打开登录页，使用预填 demo 登录，通过侧栏进入多标签工作区；
  工作区标题可见，`pageerror` 为空，执行退出码 `0`。
- 仅隔离非业务字体样式请求并关闭测试浏览器系统代理；未伪造登录或业务响应。
- 截图：`output/playwright/workspace-distribution-smoke-20261024.png`。
- 这是本地示例入口烟测，不是浏览器矩阵复跑，也不代表真实后端或生产验收。
