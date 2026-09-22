---
title: 生态适配器
description: 基于 Svelte 生态包的按需适配器
---

有些能力更适合由 Svelte 生态持有，但仍需要一致的 svadmin 表面。这些**按需适配器**
在 svadmin 的无障碍与设计 token 契约下包一层生态包。它们从独立子路径导出，
因此默认的 `@svadmin/ui` 入口保持零新增依赖；`create-svadmin` 会把它们登记进生成的
`svadmin.ai.json` 组件目录。

| 适配器 | 子路径 | 生态包 |
| --- | --- | --- |
| `CodeEditor` | `@svadmin/ui/code-editor` | `svelte-codemirror-editor` + `codemirror` |
| CodeMirror 语言预设 | `@svadmin/ui/code-editor/presets` | `@codemirror/lang-json`、`@codemirror/lang-javascript`、`@codemirror/lang-sql`、`@codemirror/lang-markdown` |
| `JsonEditor` | `@svadmin/ui/json-editor` | `svelte-jsoneditor` |
| `QRCode` | `@svadmin/ui/qr-code` | `qrcode` |

## 只安装你实际导入的包

生态包声明为**可选 peer 依赖**：

```bash
# 代码编辑器
bun add svelte-codemirror-editor codemirror

# 代码编辑器语言预设
bun add @codemirror/lang-json

# JSON 编辑器
bun add svelte-jsoneditor

# 二维码
bun add qrcode
```

## CodeEditor

`CodeEditor` 在挂载时动态加载 `svelte-codemirror-editor`。在模块就绪之前，
或未安装时，会渲染可访问的 `<textarea>` 兜底，表单不会因此不可用。

```svelte
<script lang="ts">
  import CodeEditor from '@svadmin/ui/code-editor';
  import { json } from '@codemirror/lang-json';

  let value = $state('{ "warehouse": "north" }');
</script>

<CodeEditor bind:value lang={json()} lineNumbers lineWrapping ariaLabel="查询编辑器" />
```

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `value` | `string`（可绑定） | `''` | 编辑器内容 |
| `lang` | CodeMirror `LanguageSupport` | — | 由宿主传入语言扩展 |
| `theme` | CodeMirror `Extension` | — | 编辑器主题 |
| `extensions` | `Extension[]` | — | 额外扩展 / 快捷键 |
| `placeholder` | `string` | `Write code…` | 空态文案 |
| `editable` / `readonly` | `boolean` | `true` / `false` | 编辑控制 |
| `lineNumbers` / `lineWrapping` | `boolean` | `true` | 编辑器外观 |
| `tabSize` | `number` | `2` | 缩进宽度 |
| `ariaLabel` | `string` | `Code editor` | 兜底 textarea 的无障碍名称 |
| `onchange` | `(value: string) => void` | — | 编辑时触发 |
| `onready` | `(view) => void` | — | 返回 CodeMirror `EditorView` |

语言与主题扩展请留在应用内。不要在适配器里导入所有语言包，否则可选依赖就失去意义。

### 语言预设

`@svadmin/ui/code-editor/presets` 重导出可直接使用的 CodeMirror 语言支持。
只安装你实际导入的语言：

```svelte
<script lang="ts">
  import CodeEditor from '@svadmin/ui/code-editor';
  import { json } from '@svadmin/ui/code-editor/presets';

  let value = $state('{ "warehouse": "north" }');
</script>

<CodeEditor bind:value lang={json()} lineNumbers />
```

可用预设：`json`、`javascript`（TypeScript 传 `{ typescript: true }`）、`sql`、
`markdown`，以及原始语言对象 `javascriptLanguage`、`typescriptLanguage`、
`jsxLanguage`、`tsxLanguage`。

## JsonEditor

`JsonEditor` 在挂载时动态加载 `svelte-jsoneditor`。在模块就绪之前，或未安装时，
渲染带校验的 `<textarea>` 兜底，并通过 `onerror` 上报解析错误。

```svelte
<script lang="ts">
  import JsonEditor from '@svadmin/ui/json-editor';

  let payload = $state({ warehouse: 'north', count: 12 });
</script>

<JsonEditor bind:value={payload} mode="tree" height="24rem" ariaLabel="Payload" />
```

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `value` | `unknown`（可绑定） | `undefined` | 解析后的 JSON 值 |
| `mode` | `'tree' \| 'text' \| 'table'` | `'tree'` | 编辑模式 |
| `readonly` | `boolean` | `false` | 只读时隐藏菜单/导航栏 |
| `height` | `string` | `22rem` | 编辑区高度 |
| `ariaLabel` | `string` | `JSON editor` | 无障碍名称 |
| `onchange` | `(value: unknown) => void` | — | 变更时的解析后值 |
| `onerror` | `(message: string) => void` | — | 兜底解析错误 |

基础样式由该包随组件提供。暗色模式请在应用入口引入
`svelte-jsoneditor/themes/jse-theme-dark.css`。

## QRCode

`QRCode` 基于 `qrcode` 渲染清晰的 SVG，不依赖 canvas，因此 SSR 与测试环境都可用。
颜色默认走语义 token，并保留静默区边距以保证识别率。

```svelte
<script lang="ts">
  import QRCode from '@svadmin/ui/qr-code';

  const enrolmentUri = 'otpauth://totp/SVAdmin?secret=…';
</script>

<QRCode value={enrolmentUri} size={180} ariaLabel="扫码绑定" />
```

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | — | 要编码的内容；为空时渲染占位 |
| `size` | `number` | `160` | 渲染尺寸（px） |
| `margin` | `number` | `4` | 静默区宽度（模块）；建议 ≥ 4 |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | 等级越高容错越强但更密集 |
| `color` / `background` | `string` | `var(--foreground…)` / `var(--background…)` | 模块与背景色 |
| `ariaLabel` | `string` | `QR code` | 无障碍名称；不要包含密钥 |

绑定 URI 与 token 属于敏感数据：只通过 props 传递，切勿写入日志、埋点或无障碍名称。

## 边界

只有当薄封装确实带来价值时才提供适配器。其余能力直接指向生态包，绝不 vendor，
见[生态覆盖对照](/zh-cn/guides/ecosystem-coverage/)。