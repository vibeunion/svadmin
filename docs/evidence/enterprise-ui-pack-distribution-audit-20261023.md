# B1-04 分发产物审计

- 日期：2026-10-23
- 范围：`@svadmin/ui` 的源码、`packages/ui/dist`、npm tarball 与 packed consumer
- 目的：确认当前源码是否已进入分发产物，并区分 UI 自身 pack 结果与全仓发布门禁
- 本轮未修改生产源码、未发布、未部署

## 结论

`@svadmin/ui` 的 tarball 文件清单、入口和 packed consumer 检查通过。此前审计发现
的源码与 dist 不一致已通过定向 UI build 刷新；当前本地 dist 已同步到本轮源码，
但发布、部署与全仓行为兼容验收仍未完成：

- `packages/ui/dist` 被 `.gitignore` 忽略，Git 未跟踪；
- 定向 build 后，关键源码组件（包括 `MultiTabKeepAlive.svelte`、
  `ModalForm.svelte`、`LoginPage.svelte`、`FilterToolbar.svelte`、`DashboardView.svelte`
  和 `ImportWizard.svelte`）均已进入 dist；`FilterToolbar.svelte` 逐字节复核一致；
- 本地生成 dist 仍不是 Git 发布基线，真正的 registry 发布和部署尚未发生。

独立审查补记：执行 agent 在重建后核对 504 个可同路径比较的 `.svelte/.css`
文件，全部存在，仅 `app.css` 不同；该文件由发布 CSS 构建展开 import，属于预期
转换。TypeScript 转换为 JavaScript/声明文件，不能以同名 `.ts` 是否存在判断缺失。

### 示例消费者

主线程执行 `bun run --cwd example check`：exit `0`，0 errors / 3 个既有
Dashboard 默认参数 warning；`bun run build:example`：exit `0`，
10774 modules transformed，4.19s。保留 KaTeX 混合导入和大 chunk 提示，
不作为性能验收通过。

## 验证

### UI 包自身

命令：

```text
bun run --cwd packages/ui build
bun run pack:check
```

结果：

- UI build 退出码 `0`；仅保留 `import.meta.env` 兼容性提示；
- 随后执行根 `bun run build:packages`，12 个发布相关 workspace 包均退出 `0`；
- `@svadmin/ui: 1023 tarball entries verified`
- UI tarball 满足 `scripts/check-package-packs.ts` 对入口、
  `AdminApp.svelte`、`LazyPage.svelte`、`app.css`、`app.theme.css`、CSS 内容和
  测试/源码泄漏的检查；
- packed consumer 的入口导入与类型导入阶段通过，npm install、packed bin shim
  doctor、packed doctor、升级 dry-run、guidance migration 和 infer generation
  阶段通过。

### 全仓 pack 门禁

默认 npm 配置使用 `https://registry.npmmirror.com` 时，`bun run pack:check`
在 UI peer-tree 安装阶段因镜像返回 `404`、缺少
`@vibeunion/devtools-devframe@0.1.0` 而失败。该错误不是 `@svadmin/ui` tarball
缺文件或 CSS 内容断言失败。

随后在全包重建完成后，以只读环境覆盖方式使用官方 registry 重跑：

```text
npm_config_registry=https://registry.npmjs.org bun run pack:check
```

结果：exit `0`。完整门禁通过，包括 workspace tarball 清单、packed consumer
入口/类型导入、npm install、pnpm strict peer tree、禁止依赖检查、packed CLI
doctor、Surface workspace-packed/minimum-supported 两组消费者构建，以及
AI elements packed consumer。

## 发布边界

当前可以声明“本地 UI build 已刷新，完整 pack 门禁在官方 registry 环境通过”，
但不能声明：

- registry 发布包可安装；
- 全仓行为兼容或全量测试通过；
- 生产部署或在线验收完成。

默认 mirror 仍存在环境阻断；后续 CI/发布环境应固定可用 registry 或验证 mirror
同步状态。pack 门禁结果仍需单独区分本地构建、registry 发布、部署和在线验收。

## 2026-10-24 增量

本轮仅闭环 DateRangeInput 修复的本地产物与消费者构建，不扩展新组件。
主线程执行 UI build、example check、example build，全部 exit `0`。
example check 为 0 errors / 3 个既有 Dashboard warning；生产构建
10774 modules transformed、5.25s，仍有 KaTeX 混合导入和大 chunk 提示。
主线程确认 dist 中 presets 的两个 ARIA 属性存在；独立审计确认
DateRangeInput 源码与 dist 逐字节一致。

本次未重跑完整 `pack:check`；10 月 23 日 pack 结果不覆盖此次源码增量。
本地 build 不证明 tarball 安装、浏览器反馈行为、读屏、registry 发布或部署。
收尾主线程独立复跑 `auto-form-accessibility.test.svelte.ts`：48/48、exit `0`、
10.30s；`doc:sync` 验证 33 packages，`git diff --check` 通过。未提交、推送或发布。
