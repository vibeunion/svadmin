# B2-11 `oneOf` 显式分支续接契约（2026-10-24）

- source: 用户要求继续企业级规范，并仅实施 B2-11 `oneOf` 显式分支。
- parent: `enterprise-ui-unblock-contract-20261024.md`、
  `enterprise-ui-remaining-decisions-20261024.md` 第 4 节。
- reason: 内部 `$ref` 已按独立契约完成；`oneOf` 仍是明确列出的本地剩余项，
  不能用“继续拒绝 `oneOf`”冒充完成。
- orchestration: managed；本轮 pi 为唯一代码 writer，主线程负责独立审查与
  定向验证。保留既有 dirty 改动，不提交、不推送、不构建、不发布、不部署。
- 写入范围：`packages/ui` 下 `oneOf` 相关的 Schema 类型、引用展开 helper、
  递归编译/校验 helper、`JsonSchemaForm.svelte`，以及两个直接单文件测试；
  不修改 workspace 草稿、core 业务或 example 消费者。

## 决策

1. **只支持显式 discriminator 分支**。接受的形状为：
   ```json
   {
     "oneOf": [
       { "type": "object", "properties": { "kind": { "const": "a" }, "a": { "type": "string" } } },
       { "type": "object", "properties": { "kind": { "const": "b" }, "b": { "type": "number" } } }
     ],
     "discriminator": { "propertyName": "kind" }
   }
   ```
   每个分支必须是对象；`propertyName` 对应属性必须来自 `const` 或 `enum`。
   支持分支整体通过内部 `#/$defs/...` 引用展开；分支内的属性引用继续使用既有
   内部引用边界。
2. **不猜测分支**。禁止“第一个通过校验的分支”、字段相似度、默认顺序或
   隐式 fallback。未提供 discriminator 的 `oneOf` 仍显式拒绝，保持现有
   `unsupported-schema` 边界，不静默降级。
3. **显式选择 UI 由 discriminator 驱动**。表单渲染一个分支选择器，选项来自
   各分支 discriminator 属性的 `const`/`enum` 值；切换时写入 discriminator，
   并删除仅属于其他分支的旧字段。选择器不是业务自动推断。
4. **稳定错误契约**（内部 helper 暴露 `code` + JSON Pointer；组件继续只显示
   表单级通用错误）：
   | code | 场景 | Pointer |
   | --- | --- | --- |
   | `oneOf-invalid` | `oneOf`/`discriminator`/分支形状不合法、分支缺少 selector | `/.../oneOf` 或具体分支 |
   | `oneOf-unsupported` | 缺少 discriminator、出现不支持的 discriminator 形状 | `/.../oneOf` 或 `/.../discriminator` |
   | `oneOf-unselected` | 数据缺少 discriminator 值，或值不匹配任何分支 | `/.../<propertyName>` |
   | `oneOf-ambiguous` | 多个分支 selector 重叠，或运行时匹配到多个分支 | `/.../oneOf` |
   文案可国际化；`code` 与路径语义稳定。
5. **有界、无副作用**：
   - 继续使用 `SCHEMA_FORM_LIMITS`（深度 32、节点 10,000）与既有内部引用
     上限；`oneOf` 分支数上限 256。
   - `discriminator` 与根 Schema 一样按数据属性（descriptor）读取；其
     `propertyName` accessor 在编译期以 `oneOf-invalid` 拒绝，绝不执行 getter。
   - 根级 `oneOf` 与字段级共用同一显式 discriminator：`JsonSchemaForm` 在根部
     渲染选择器，未选择或歧义时继续失败关闭，不渲染空表单、不静默接受判别值。
   - 不执行 getter、不访问网络、不 fetch/XHR/import、不读 storage/env。
   - 不修改输入 Schema 或输入值；重复解析结果一致。
6. **分支切换不误提交旧字段**：提交和递归校验前先按当前 discriminator
   选择分支，并剪除仅属于未选分支的键；剪除产生新对象，不改写外部 `value`。
   若未选择或歧义，保留拒绝并给出上述稳定错误。
7. **默认值边界**：未选择分支时绝不根据默认值、字段相似度或顺序猜测分支；
   也不因分支默认值自动切换 discriminator。只有在 discriminator 已显式存在
   （初始值或用户选择）后，才按该唯一分支补齐缺失字段的默认值，且不覆盖
   已有值或显式 `undefined`。必填、类型与约束继续来自同一份展开后 Schema。

## 明确未完成 / 不承诺

- 不支持无 discriminator 的 `oneOf` 自动分支选择、OpenAPI `mapping`、
  `anyOf`/`allOf`/远程 `$ref`、完整 JSON Schema。
- 不承诺真实服务端 TypeBox 一致性、业务授权、跨租户字段权限、读屏实机、
  新分发包、发布或部署。
- 不修改 Lite 表单、core 业务或 example 消费者；`oneOf` 当前只在
  `JsonSchemaForm` 的受控递归子集中生效。

## 定向验收命令

```bash
cd packages/ui
bun run test -- src/components/enterprise/recursive-schema-form.test.ts
bun run test -- src/components/json-schema-form-enterprise.test.svelte.ts
```

浏览器最小覆盖（可复用 fixture 独立入口 `/oneof.html`，不改其他视图）：

```bash
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.schema-oneof.config.ts --reporter=line
```

覆盖根级/字段级显式选择、分支默认值、只读继承、分支切换后旧字段不提交、
未选择 discriminator 的可见错误、歧义 selector 与 accessor 的失败关闭；
配置扩展为 Chromium/WebKit/Firefox × desktop/narrow，并阻断非本地网络。

附加只读检查：`git diff --check` 与目标文件 diff 审查。结果记录在最终报告；
本文件是实施契约，不是通过证明。
