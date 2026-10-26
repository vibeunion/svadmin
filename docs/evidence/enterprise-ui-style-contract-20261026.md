# 企业 UI 样式契约审计（2026-10-26）

## 范围

- 工作区：`/Users/zhd/workspace/svadmin`。
- 目标：只审查当前 dirty 工作区中 `packages/ui` 与 `packages/surface` 的新增/修改组件，确认语义颜色 token、Tailwind 边界和现有样式契约没有被破坏。
- 只运行样式相关的最小检查；不改公共 API，不做全仓重构，不提交、推送、发布或部署。
- 审计开始时工作区已经存在大量 dirty 修改；这些修改全部保留。

## 审计结论

- dirty diff 中新增/修改的 `packages/ui` 组件没有发现裸 Tailwind 调色板工具类、裸 hex 或 `rgb/hsl` 颜色字面量。
- `packages/ui` 组件颜色契约测试通过；组件使用语义 token 或既有生成类。
- 本轮 dirty 的 `packages/surface` 组件改动集中在错误消息/本地化和已有 `surfaceMetric` 样式复用，没有新增颜色字面量或裸 Tailwind 调色板工具类。
- `packages/ui/src/app.css`、兼容性 CSS、生成 CSS，以及 `packages/surface/src/styles/editor.css` 中的既有 token fallback/编译产物不属于本轮新增样式行，未在本任务中修改。
- 没有发现属于当前修改、且可以无产品决策直接修复的源码样式失败，因此没有修改源码或测试实现。

## 命令与退出码

### `bun run check:styles`

- 退出码：`1`。
- 失败发生在 `scripts/check-style-boundary.mjs` 的安装依赖图审计，不是组件颜色契约或 CSS 测试失败。
- 原始失败输出：

  ```text
  AssertionError [ERR_ASSERTION]: Style boundary violations:
  installed dependency graph: @pandacss/config
  installed dependency graph: @pandacss/core
  installed dependency graph: @pandacss/dev
  installed dependency graph: @pandacss/extractor
  installed dependency graph: @pandacss/generator
  installed dependency graph: @pandacss/is-valid-prop
  installed dependency graph: @pandacss/logger
  installed dependency graph: @pandacss/node
  installed dependency graph: @pandacss/parser
  installed dependency graph: @pandacss/plugin-lightningcss
  installed dependency graph: @pandacss/plugin-svelte
  installed dependency graph: @pandacss/plugin-vue
  installed dependency graph: @pandacss/postcss
  installed dependency graph: @pandacss/preset-base
  installed dependency graph: @pandacss/preset-panda
  installed dependency graph: @pandacss/reporter
  installed dependency graph: @pandacss/shared
  installed dependency graph: @pandacss/token-dictionary
  installed dependency graph: @pandacss/types

  19 !== 0
  error: script "check:styles" exited with code 1
  ```

- 只读核对当前 tracked `package.json`/`bun.lock` 未发现 `@pandacss/*` 依赖；因此该失败归类为当前 `node_modules` 安装图边界，不归因于本轮 dirty UI/Surface 源码，也未通过删除依赖或重装来掩盖问题。

### `bun run --cwd packages/ui test:css`

- 退出码：`0`。
- 结果：`55` 个测试通过，`0` 失败，`0` 跳过。
- 覆盖静态 CSS、条件 CSS、native CSS entry、Tailwind recipe、无 Tailwind 契约和 Surface 样式契约。

### `bun test packages/ui/src/component-color-tokens.test.ts`

- 退出码：`0`。
- 结果：`4` 个测试通过，`0` 失败，`27` 个断言通过。
- 覆盖所有 `packages/ui/src/components/**/*.svelte` 的裸调色板工具类与裸 hex 扫描。

### `git diff --check`

- 退出码：`0`。
- 未发现空白错误。

### 干净依赖图复验

为区分源码/lockfile 结果与共享 `node_modules` 残留，主线程只将未声明的
`node_modules/@pandacss` 目录临时移入 `/tmp`，运行门禁后立即恢复原目录；没有删除
依赖、修改源码或 lockfile。

- `bun run check:styles`：exit `0`。
- 输出：`Style boundary passed: workspace manifests, aliases, lockfile, installed graph, production imports, CSS entries, and parser integrity.`
- 恢复后再次确认 `node_modules/@pandacss` 的 19 个包仍在，工作区 tracked 文件未因
  该操作改变。

## 实际修改文件

本任务没有修改 `packages/ui` 或 `packages/surface` 源码，也没有修改测试实现；只新增本证据文档：

- `docs/evidence/enterprise-ui-style-contract-20261026.md`

## 未覆盖边界

- `check:styles` 的安装依赖图失败仍需在干净、与仓库 lockfile 一致的依赖安装环境中重新验收；本轮不删除共享 `node_modules`，不改变依赖声明。
- 本审计不等同于全量类型检查、全量单元测试、浏览器视觉回归、生产部署或在线验收。
- 既有 CSS fallback 和生成 CSS 的历史契约没有被本轮改动，也没有在本任务中扩大范围重构。

## 结论

本轮未发现当前 dirty UI/Surface 组件破坏语义颜色 token 或裸颜色边界，因此按要求不改源码。CSS 契约测试和组件颜色测试通过；唯一失败是安装依赖图中的 19 个 `@pandacss/*` 残留，已保留原始输出并明确为环境边界，不能宣称 `check:styles` 全部通过。

主线程在隔离该残留后复验 `check:styles` 通过，证明仓库声明依赖和样式边界本身通过；
共享 `node_modules` 仍含未声明残留，后续应在干净依赖环境运行正式门禁，不应把共享环境
中的第一次失败归因于源码。
