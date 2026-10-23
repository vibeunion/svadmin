# B2-11 完整 Schema 表单边界审计（2026-10-23）

## 范围与动作

审计矩阵 B2-11 的只读核对：确认当前受限 Schema 子集的真实能力，确认
`$ref` / `oneOf` / 外部引用是否有可执行的产品契约，并判断是否需要改生产代码。
本轮未修改 `JsonSchemaForm.svelte`、`enterprise/recursive-schema-form.ts`、
core/Lite/Provider/RBAC 或浏览器宿主；只新增本证据并更新矩阵 B2-11 记录。
未提交、未构建分发包、未部署。

核对文件：

- `packages/ui/src/components/JsonSchemaForm.svelte`
- `packages/ui/src/components/enterprise/recursive-schema-form.ts`
- `packages/ui/src/components/enterprise/json-schema-form.ts`
- `packages/ui/src/components/json-schema-form-state.ts`
- `packages/core/src/schema-form.ts`
- `packages/ui/src/components/json-schema-form-enterprise.test.svelte.ts`
- `packages/ui/src/components/enterprise/recursive-schema-form.test.ts`
- `scripts/fixtures/enterprise-ui/App.svelte`、
  `scripts/fixtures/enterprise-ui/browser.spec.ts`、
  `scripts/fixtures/enterprise-ui/playwright.schema-form.config.ts`
- 既有证据 `schema-form-unsupported-schema-20261022.md`、
  `schema-form-hidden-parse-errors-20261022.md`、
  `schema-form-description-association-20261022.md`

## 当前受限支持的准确边界

- 结构：根节点必须是 object；递归支持 object、array 和标量叶子，深度 32、
  节点上限 `SCHEMA_FORM_LIMITS`。循环、访问器、非普通对象、非法 required、
  非法 min/max、空 items 等 fail closed。
- 标量断言由 `enterprise/json-schema-form.ts` 承担：string / number / integer /
  boolean / enum（含 const 归一到 choices）、required、minimum / maximum /
  exclusive* / multipleOf、minLength / maxLength、nullable 类型数组、readOnly。
- 结构断言由 `recursive-schema-form.ts` 承担：`additionalProperties`、`minItems` /
  `maxItems`、数组逐项错误、JSON Pointer 错误路径。
- core `schema-form.ts` 是另一条更窄但有条件的路径：支持 `visibleWhen` 条件显示，
  不接受 `type` 数组、`readOnly`、`additionalProperties` 等。组件用
  `readRecursiveSchemaForm(...).issues` 与 `assertSchemaFormSchema(...)` 交叉判定：
  递归模型有 issue 且 core 也拒绝时关闭表单；core 可用时由 core 决定可提交数据和
  条件可见性；仅递归模型可用的子集（如 readOnly / nullable 标量）走递归校验。
- 条件显示只在 core 接受该 Schema 时生效；递归适配器不解析 `visibleWhen`。
  这是两个已发布子集的交集边界，不是完整 JSON Schema 引擎。

## 明确拒绝的关键字与原因

| 输入 | 观察 | 是否是缺陷 |
| --- | --- | --- |
| 内部 `$ref` + `$defs` | 拒绝，内部 issue 定位 `/field/$ref`（另有 `/$defs`） | 否，无解析契约 |
| `oneOf` | 拒绝，issue 定位 `/choice/oneOf` | 否，无分支选择契约 |
| 外部 `$ref`（https URL） | 拒绝，issue 定位 `/field/$ref` | 否，无加载/安全契约 |
| 未知关键字（如 `format`） | 拒绝，issue 定位 `/field/format` | 否，不假装已校验 |

拒绝路径分三层：`readRecursiveSchemaForm(...).issues` 给出内部 JSON Pointer；
`assertSchemaFormSchema`、`prepareSchemaFormValue`、Lite `decodeSchemaFormData`
均抛 `Invalid schema form configuration.`；SPA/Lite 表单显示表单级
`role="alert"`、零输入控件、提交按钮禁用，派发 submit 不会调用 `onsubmit`。
这些均已在既有 61/61 单文件用例中覆盖，本轮未新增或改写用例。

## 产品契约判断

仓库中没有为 `$ref` / `oneOf` / 外部引用定义可执行的产品契约：

- 没有引用解析作用域（是否允许 `#/$defs`、相对 URI、远程 URI）。
- 没有外部加载的允许列表、超时、大小限制、鉴权、缓存或 SSRF/完整性策略。
- 没有 `oneOf` 的选择 UI、默认分支、冲突报错或服务端一致性约定。
- 没有公开的 schema 错误码/路径 API；当前路径只来自内部模块。
- 矩阵 B2-11 的“外部引用受控适配”只是原始要求方向，未给出上述决策。

因此显式拒绝是当前正确且安全的边界：静默忽略 `$ref` 会把未校验数据当成合法
提交，远程引用加载则会引入未授权的网络与信任边界。实现引用解析属于新的产品与
安全契约，不是本轮可自行补齐的实现缺口；本轮不实现、不导出内部 issues、不改文案。

## 验证

在 `packages/ui` 执行最相关单文件：

```bash
bunx vitest run src/components/json-schema-form-enterprise.test.svelte.ts
```

结果：`1 passed (1)`，`61 passed (61)`，退出码 0。存在既有 svelte2tsx source map
缺失警告，未修改依赖。`git diff --check` 退出码 0。未运行浏览器用例。

## 未覆盖与主线程待复核

- B2-11 仍未完成：受控引用适配、`$ref`/`oneOf` 解析和外部引用加载均未实现，
  需要产品/安全侧先给出契约。
- 未验证不支持关键字的真实浏览器/读屏表现；浏览器宿主只覆盖标量表单与条件
  Schema（`playwright.schema-form.config.ts` 只跑 conditional 用例），没有
  `$ref`/`oneOf` fixture。
- 未验证服务端 TypeBox/业务授权、新分发包、消费者构建或部署。
- 请主线程复核：本审计结论“无真实实现错误、拒绝即正确边界”是否接受；若接受，
  B2-11 应保持“需外部产品决策/验收”，不以拒绝用例关闭。

## 本线程复核（2026-10-23）

- 只读复核了 `JsonSchemaForm.svelte` 的 `prepared`、提交门禁和
  `readRecursiveSchemaForm`/`assertSchemaFormSchema` 的交叉边界。已有行为是：
  不支持 Schema 在组件内保持 `role="alert"`、不渲染输入控件、禁用提交；
  `onvalidationerror` 仅属于值校验回调，不应被复用来表达配置错误。
- 当前没有公开的 Schema 配置错误码/路径回调。将内部 `issues` 直接导出、
  或新增“结构化诊断”回调，都会形成新的组件契约；在没有消费者需求、错误码
  稳定性和文案/读屏约定前，本轮不擅自设计该 API。现有表单级 alert 已覆盖拒绝
  的可感知状态，详细 JSON Pointer 仅保留在内部审计层。
- 定向复跑：

  ```bash
  bunx vitest run --config ./vitest.config.ts src/components/json-schema-form-enterprise.test.svelte.ts
  ```

  `61/61 passed`，退出码 `0`，未修改生产代码或测试；仅有既存
  `svelte2tsx/index.js.map` 缺失警告。
- 结论不变：没有无需产品/安全契约即可实施的 B2-11 生产修复。后续若要支持
  `$ref`/`oneOf`/外部引用，必须先确定解析作用域、远程加载允许列表、超时/大小、
  鉴权、SSRF/完整性策略、分支选择和公开错误契约。
