# Surface 源错误用户可见诊断审查（2026-10-27）

## 当前复核结果

语言/绑定 follow-up 已由主线程独立复验：SurfaceRenderer 单文件 **24/24**
通过（exit 0、2.60s），定向 ESLint 与 diff check 通过。缓存错误切换语言不
重新请求，渲染期绑定错误也在自定义 widget 入口统一本地化。契约见
[语言与绑定边界](../evaluations/enterprise-surface-source-localization-contract-20261027.md)。
下方原始 21/21 记录保留其历史边界，整体仍 PARTIAL。

## 范围

- parent: `docs/evaluations/enterprise-ui-closeout-20261024.md` 的 Surface 错误反馈规范。
- source: 用户持续目标“继续，直到全部完成”；reason: 主线程有界审查发现源错误
  在自定义 widget 入口仍可能包含内部字段诊断。
- orchestration/risk: managed / medium；pi 唯一代码 writer，主线程独立 verifier。

有界审查 `packages/surface/src/components/SurfaceRenderer.svelte` 的
`sourceCache.set` 错误文案派生。仅修改该文件的错误码到 i18n 文案映射、
`packages/surface/src/localization.ts` 的通用无效数据文案、对应最小直接回归
和本证据文档。未改共享依赖、DataProvider、Surface 公共数据契约或宿主
`onError` 诊断接口；未提交、推送、发布或部署。整体企业级验收仍为 `PARTIAL`。

## 审查结论

- `provider_result_not_json` 的 `state.error.message` 来自 runtime 投影校验，
  可能包含资源策略中的字段名和 JSON 结构校验细节（例如
  `Field "PRIVATE_DIAGNOSTIC" is not JSON serializable`）。它属于宿主诊断，
  不应作为终端用户可见状态文本。
- `binding_pointer_not_found` 当前文案是固定英文诊断，但同属投影/绑定失败，
  不应由 `sourceCache.set` 直接透传为客户端可见 message。
- 内置 Metric/Chart/Table/Detail/Activity 组件已通过
  `surfaceErrorMessage` 按错误码本地化，因此默认组件此前未暴露原文；但自定义
  Surface widget 可以直接渲染 `data.error.message`，所以 source state 仍应
  在进入组件前收敛为稳定文案，不能依赖每个消费者自行脱敏。

## 实现

- `SurfaceRenderer.svelte` 对 `provider_result_not_json` 与
  `binding_pointer_not_found` 统一使用 `activeMessages.invalidData`，不再使用
  `state.error.message`。
- 保留既有语义分支：`access_denied` 使用 `accessDenied`；其余
  `access_check_failed` / `provider_failed` 继续使用 `providerUnavailable`。
- `localization.ts` 新增可选 `invalidData` 文案：英文
  `Surface data is invalid`，简体中文 `Surface 数据无效`。可选字段保持既有
  `SurfaceMessages` 覆盖调用的兼容性，`resolveSurfaceMessages` 始终返回默认值。
- 宿主 `onError` 仍接收源加载诊断；既有回归继续断言
  `provider_result_not_json` 的宿主诊断保留原始投影文本，与用户可见 state
  的收敛边界分离。

## 最小直接回归

`packages/surface/src/SurfaceRenderer.test.svelte.ts` 新增两个 locale 用例，
通过 `test/fixtures/DiagnosticEchoWidget.svelte` 模拟会直接渲染
`data.error.message` 的自定义 widget。Provider 返回包含
`PRIVATE_DIAGNOSTIC` 字段的非 JSON 值，以触发 provider 结果投影失败。

断言：

1. 自定义 widget 只看到 `Surface data is invalid` / `Surface 数据无效`；
2. 页面 DOM 不包含 `PRIVATE_DIAGNOSTIC`；
3. 页面 DOM 不包含原始 `not JSON serializable` 诊断细节。

## 执行结果

```text
cd packages/surface
bunx vitest run --config ./vitest.config.ts src/SurfaceRenderer.test.svelte.ts
21 passed (1 file), exit 0, duration 3.61s

bunx eslint packages/surface/src/localization.ts \
  packages/surface/src/components/SurfaceRenderer.svelte \
  packages/surface/src/SurfaceRenderer.test.svelte.ts \
  packages/surface/test/fixtures/DiagnosticEchoWidget.svelte \
  --max-warnings 0
exit 0

git diff --check
exit 0
```

## 未覆盖边界

- 主线程已独立复验该单文件：**21/21 passed、exit 0、3.56s**；目标四文件
  ESLint `--max-warnings 0` 和 `git diff --check` 通过。保留 Node 的既有
  localStorage 实验提示，不影响退出状态。
- 主线程审查确认新增 messages 字段为可选，不要求旧宿主补字段；两个 locale
  用例直接经 renderer 向自定义 widget 交付错误状态，未 mock 错误文案分支。

## Follow-up：语言切换与渲染期绑定边界（2026-10-27）

契约：`docs/evaluations/enterprise-surface-source-localization-contract-20261027.md`。

### 缺口确认

- 源错误在加载时经 `sourceCache.set` 写入本地化文案；随后切换
  `locale`/`messages` 时，缓存状态不会重新加载，自定义 widget 会继续显示
  旧语言。
- `resolveSurfaceSourceData` 在渲染期生成的 `binding_pointer_not_found`
  不经过 `sourceCache.set`，自定义 widget 仍可直接看到固定英文内部诊断。

### 最小修复

- `SurfaceRenderer.svelte` 新增统一呈现函数 `presentSurfaceData`：所有
  widget 可见的 error state（含加载缓存与渲染期绑定错误）都按当前
  `activeMessages` 重新映射错误码文案。
- `sourceCache.set` 复用同一函数；渲染模板在交付 widget 前再次应用该边界。
  切换语言只重算展示，不改变请求身份，因此不新增 Provider 或权限请求。
- `onError` 仍由 source cache 在加载期携带原始诊断触发，未被展示层映射替换；
  加载隔离、刷新与缓存所有权语义保持不变。

### 直接回归

`packages/surface/src/SurfaceRenderer.test.svelte.ts` 新增：

1. 由 `DiagnosticEchoWidget` 直接渲染缓存错误；先 en 渲染，再切 zh-CN 与
   自定义 `messages.invalidData`，断言文案更新，且 `getList`、权限 `can`、
   `onError` 调用次数均保持 1。
2. en/zh-CN 两个 locale 下，对渲染期缺失绑定指针使用自定义 widget，
   断言只看到 `Surface data is invalid` / `Surface 数据无效`，DOM 不含
   固定英文内部诊断，且不触发 `onError`。

### 执行结果

```text
cd packages/surface
bunx vitest run --config ./vitest.config.ts src/SurfaceRenderer.test.svelte.ts
24 passed (1 file), exit 0, duration 2.41s

bunx eslint packages/surface/src/localization.ts \
  packages/surface/src/components/SurfaceRenderer.svelte \
  packages/surface/src/SurfaceRenderer.test.svelte.ts \
  packages/surface/test/fixtures/DiagnosticEchoWidget.svelte \
  --max-warnings 0
exit 0

git diff --check
exit 0
```

### 限制

- 仅执行单文件回归、目标 ESLint 与 diff check；未运行全量测试套件。
- 整体企业级验收仍为 `PARTIAL`；未提交、推送、发布或部署，保留全部既有
  dirty 改动。

- 未运行 `packages/surface` 全量测试、全仓 lint/typecheck 或浏览器矩阵；本轮
  只证明该错误码分支的最小直接回归。
- 未验证真实 Provider、真实 RBAC/租户/字段授权、读屏、发布包或部署。
- 宿主若自行把 `onError` 原始诊断直接展示到 UI，仍可能泄露；该宿主接入责任
  不在本次 `sourceCache.set` 用户可见 state 收敛范围内。

当前证据关闭本项本地错误反馈收敛缺口，不扩大为企业级真实后端或发布完成。
