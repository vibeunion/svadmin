# JsonSchemaForm 不支持 Schema 的显式拒绝（2026-10-22）

## 范围

审计矩阵 B1-02 正确性边界与 B2-11 安全边界的定向动作：对 `$ref`、`oneOf`、外部引用和未知关键字验证“拒绝而非静默降级”，并保留合法递归 object/array 的既有边界。显式拒绝只闭环安全边界，不实现也不替代 B2-11 的受控引用适配。仅修改定向测试文件；未修改 JsonSchemaForm、LiteJsonSchemaForm 或 core 实现，未提交、未构建分发包、未部署。

## 当前契约与边界

- `@svadmin/core/schema-form` 的 `assertSchemaFormSchema` 对未知关键字、非法结构和超限结构抛出 `TypeError('Invalid schema form configuration.')`；`prepareSchemaFormValue` 与 lite 的 `decodeSchemaFormData` 复用同一断言。
- `JsonSchemaForm` / `LiteJsonSchemaForm` 在 schema 不被任一已发布子集接受时关闭表单：渲染表单级 `role="alert"`，不渲染任何输入控件，提交按钮禁用，提交不会调用 `onsubmit`。
- 组件目前没有按字段展示 schema 配置错误的公开 UI 契约，也没有稳定的 schema 错误码回调。问题路径来自内部模块 `readRecursiveSchemaForm(schema).issues` 的 JSON Pointer 路径与 `unsupported-schema` 码，不是公开组件 API；UI 只显示表单级通用错误。本证据只断言该现有内部行为，没有新造错误码、文案或公开 API。

## 新增用例

文件：`packages/ui/src/components/json-schema-form-enterprise.test.svelte.ts`，四组输入：

| 输入 | 期望定位路径 | 现有观察 |
| --- | --- | --- |
| 内部 `$ref`（同时含 `$defs`） | `/field/$ref`（另有 `/$defs`） | 拒绝 |
| `oneOf` | `/choice/oneOf` | 拒绝 |
| 外部 `$ref` (`https://example.com/...`) | `/field/$ref` | 拒绝 |
| 未知关键字 `format` | `/field/format` | 拒绝 |

每组覆盖三层：

1. `readRecursiveSchemaForm` 返回精确路径的 `unsupported-schema` 问题，`assertSchemaFormSchema`、`prepareSchemaFormValue`、`decodeSchemaFormData` 均抛错。
2. SPA `JsonSchemaForm` 显示表单级 alert、零输入控件、提交按钮禁用；即使派发 submit，`onsubmit`、`onvalidationerror`、`onerror` 均不调用。
3. `LiteJsonSchemaForm` 显示 alert、零输入控件、提交按钮禁用，原生 FormData 解码抛错。

合法递归 object/array、默认值、条件隐藏、数组边界等既有用例保持通过。

## 红绿与独立复核

命令（在 `packages/ui` 下运行该单一文件）：

```bash
bunx vitest run src/components/json-schema-form-enterprise.test.svelte.ts
```

- 首次运行：4 个新增 helper 用例失败，原因是测试期望路径写成 `/property/...`，而实际 schema 键为 `field`/`choice`；失败均由测试路径错误引起，不是实现红证据。组件与 Lite 层 8 个新增用例首次即通过。
- 修正期望路径后：`1 passed (1)`，`61 passed (61)`，原始 exit code `0`。
- `git diff --check`：原始 exit code `0`。
- 主线程已独立运行同一单文件命令（61/61，exit 0）、独立执行 `git diff --check`（exit 0），并审查 12 个新增测试；Schema 证据与本矩阵记录已独立复核。

## 未覆盖边界

- 未验证真实浏览器、读屏、新分发包或部署。
- 未实现也不声称支持 `$ref` 解析、`oneOf` 分支或外部引用加载；这些输入仍被显式拒绝。
- UI 只显示表单级通用错误，不显示 schema 问题路径；路径定位当前只有内部模块 `readRecursiveSchemaForm` 的 issues，不是公开组件 API，也未导出为包根公共 API。
- 未验证服务端 TypeBox/业务授权、完整 JSON Schema 能力或错误码稳定性。
- 本次证据包含 pi 自测与主线程独立复核；仍不关闭浏览器/读屏、新分发包、真实后端或完整 JSON Schema 等外部验收。
