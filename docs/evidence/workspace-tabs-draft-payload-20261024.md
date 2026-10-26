# 工作区标签草稿载荷第一阶段（2026-10-24）

## 最新独立复验

主线程审查 pi 实现后，独立执行：

- `cd packages/ui && bunx vitest run --config ./vitest.config.ts src/components/workspace-tab-state.test.svelte.ts`
  **43/43**，exit 0，6.63s。
- `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.multitab-state.config.ts --project chromium-desktop --project firefox-desktop --project webkit-desktop`
  **18/18**，exit 0，22.9s；包含新草稿场景 2 × 3 引擎及原有标签行为回归。
- 适配器、直接测试、`MultiTabStateBrowserFixture.svelte` 和
  `multitab-state.spec.ts` 定向 ESLint：exit 0；`git diff --check`：exit 0。
- 浏览器报告：`test-results/multitab-state-results.json`；
  截图：`output/playwright/multitab-state-browser-20261022/*-desktop-draft-payload-*.png`。
  目录日期为既有测试配置，以上结果实际运行于 2026-10-24。主线程检查 Chromium
  恢复截图；夹具仅证明交互行为，不作为产品视觉验收。

补齐的安全与生命周期边界：

- 写入与恢复共享深度 32、总节点 10,000 的限制，根对象计入预算；
  恢复先检查完整草稿大小，再过滤白名单。
- 显式用户键使用 `:user:<encoded id>:<tab>`，与匿名兼容键分离。
  不规范化用户标识，`x` 和 ` x ` 不合并；空白用户/租户不启用草稿。
- 显式身份恢复须精确匹配 envelope 的 `userId`；复制白名单配置，
  恢复也拒绝危险字段键，避免调用方修改白名单后越界。
- `markDraft(false)`、`capture({ draft: false })`、
  `capture({ draftData: undefined })` 都清除载荷；仅省略草稿字段时保留。
  草稿启用时清除后的持久化写入失败也报告 `storage-failed`，不保证刷新后已删除。
- 受控浏览器 fixture 仅在 `draftPayload=1` 显式启用。真实输入触发快照，
  刷新后输入仍为空，点击 Restore draft 才恢复，Discard 后刷新不复活；
  用户/租户切换不可见旧草稿，返回原作用域可恢复。全过程不调用业务 Provider。

本阶段本地实现与上述验证完成。example AutoForm 的业务接入、真实身份/后端
冲突、跨设备同步、读屏实机、分发包与部署仍未验收。下文为初版记录，
旧 30/30 和“未修改 fixture”不代表本次最新状态。

## 范围

本阶段只扩展 `packages/ui/src/components/workspace-tab-state.ts` 的本地状态适配器：
新增可选草稿载荷 `draftData` 的类型、白名单过滤、纯 JSON 校验、大小限制和诊断接口。
未修改 `example/`、浏览器 fixture、服务端接口或部署配置。

## 实现

- 导出递归纯 JSON 类型 `WorkspaceDraftJsonValue`、`WorkspaceDraftJsonObject`，并导出
  诊断类型 `WorkspaceDraftDataIssue`。
- `WorkspaceTabViewState` 增加可选 `draftData`；`WorkspaceTabStateAdapterOptions`
  增加 `userId`、`draftFields`、`maxDraftBytes`。
- 只有同时提供 `userId`、`draftFields` 和 `storage` 时才启用草稿载荷持久化；
  否则维持旧的 query/scroll/draft 视图快照行为。
- `draftFields` 是顶层字段白名单。白名单缺失或为空时不保存 `draftData`；
  白名单外字段直接丢弃，不影响同次 capture 的 query/scroll/draft。
- 存储键包含 tenant、user、tab。无 `userId` 时使用固定 `anonymous` 身份，
  同时保留对旧 tenant+tab 键的只读回退；写入统一使用含 user 的新键。
- 仅接受 `null`、布尔、字符串、有限数字、数组和普通对象。拒绝 `undefined`、
  `NaN`/`Infinity`、`Date`、`File`/`Blob`、`Map`/`Set`、函数、`Symbol`、访问器、
  稀疏数组、循环引用，以及 `__proto__`、`constructor`、`prototype` 键。
- 默认 `maxDraftBytes` 为 65536，按 `JSON.stringify` 后的 UTF-8 字节计算。
  超限或非法时不写入 `draftData`，其它状态仍按原语义保存。
- `getLastDraftDataIssue()` 返回 `disabled`、`empty-allowlist`、`invalid`、
  `too-large`、`storage-failed` 或 `undefined`。`capture` 返回类型不携带诊断。
- 持久化 envelope 中的 `draftData` 非法时，整条快照按不可恢复处理；不会只丢弃
  草稿后继续恢复 query/scroll。
- `capture`、`restore`、`markDraft`、`clear`、`dispose` 保持既有内存、tombstone
  和持久化清理语义；清理失败仍通过关闭信封和共享 tombstone 隔离旧快照。

## 验证

- `packages/ui/src/components/workspace-tab-state.test.svelte.ts`：30 项通过，
  覆盖刷新恢复、默认兼容、白名单过滤、user/tenant/tab/path 隔离、非法值拒绝、
  64 KiB 超限、非法持久化整条拒绝、清理失败隔离和旧键只读回退。
- 定向 ESLint：`workspace-tab-state.ts`、`workspace-tab-state.test.svelte.ts`、
  `index.ts` 通过。
- `git diff --check`：通过。

## 边界

本证据只证明适配器层的本地快照与草稿载荷契约。未实现或未验证服务端持久化、
跨设备同步、真实用户验收、浏览器端消费者集成或部署行为。
