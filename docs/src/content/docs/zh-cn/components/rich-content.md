---
title: 富文本内容渲染
description: Lite 的 Markdown 与富文本字段如何服务端渲染存量内容
---

`MarkdownField` 与 `RichTextField` 在 SSR 阶段渲染存量内容：没有客户端编辑器、没有 hydration、也不引入 sanitizer 依赖。取值先整体转义，再只重建固定的 Markdown 子集或固定的 HTML 白名单。

## 使用哪个渲染器

| 存量值形态 | 渲染器 | 字段 |
| --- | --- | --- |
| 纯文本或 Markdown（`# 标题`、`- 项`、`**粗体**`） | Markdown 渲染器 | 两者 |
| HTML（`<p>…`、`<strong>…`） | 白名单清洗 | `RichTextField` 展示/编辑预览 |

含 HTML 标签的值走清洗器，其余走 Markdown 渲染器，因此宿主可以只存其中一种形态。

## 支持的 Markdown

| 语法 | 输出 |
| --- | --- |
| `# H1` … `###### H6` | `<h1>`…`<h6>` |
| `**粗体**`、`__粗体__`、`*斜体*`、`_斜体_`、`~~删除~~` | `<strong>`、`<em>`、`<s>` |
| `` `code` `` | `<code>` |
| ```` ```lang ```` 围栏代码块 | `<pre><code class="language-lang">` |
| `- 项`、`* 项`、`1. 项` | `<ul>` / `<ol>` |
| `- [x] 完成`、`- [ ] 待办` | 带禁用复选框的任务列表 |
| `> 引用` | `<blockquote>` |
| `---`、`***`、`___` | `<hr />` |
| `\| a \| b \|` 且带分隔行 | 带 `align` 属性的 `<table>` |
| `术语` + `: 定义` | `<dl><dt><dd>` |
| `文字[^note]` + `[^note]: 说明` | 编号 `<sup>` 引用与带回跳链接的脚注区 |
| `[文字](https://…)`、`[文字](/path)` | `<a rel="noreferrer">` |

其它语法保留为字面文本，不会被静默丢弃：缺少分隔行的表格仍会显示源码，而不是整段消失。

## 富文本 HTML 白名单

`RichTextField` 渲染时仅保留：

```
p strong b em i u s br hr ul ol li blockquote code pre h1 h2 h3 h4 h5 h6
a[href|title] img[src|alt|title] table thead tbody tfoot tr th[align] td[align]
input[type=checkbox][checked|disabled]
```

其余标签被移除但保留文本：

- `script`、`style`、`iframe`、`object`、`embed` 整块连同内容删除
- 事件属性（`onclick`、`onerror` 等）永不复制
- 其它表单控件（如 `input[type=text]`）直接丢弃
- 未知标签被解包（去标签保文本），不会渲染

## 链接与图片策略

所有 `href` 与 `src` 都经过与 Lite 其它位置一致的 `toSafeHref`：

- 允许：`http`、`https`、`mailto`、`tel` 与相对路径
- 拒绝：`javascript:`、`data:`，以及含控制字符或不可见字符的地址
- 被拒属性整体消失，只留下链接文字或图片 alt
- 渲染出的链接始终带 `rel="noreferrer"`

## 标题锚点与目录

`renderMarkdown` 在需要时可让文档结构可链接：

```ts
renderMarkdown(source, { headingIds: true, tocLevels: 3 });
```

- `headingIds` 为标题生成稳定、去重的 `id`（`## Usage`、`### Usage` → `usage`、`usage-2`）；默认关闭，短片段输出保持不变。
- 仅含 `[toc]` 的一行会被替换为 `<nav class="lite-toc">`，链接到收集到的标题；只要存在该指令，即使未开启 `headingIds` 也会生成 id。
- `tocLevels`（默认 `3`）限制进入目录的标题层级。

## 在线示例

Lite 示例应用用一条路由演示全部能力：

```bash
bun run --cwd packages/lite/example dev
# 打开 http://localhost:5173/lite/rich-content
```

覆盖 show/edit 两种模式、带对齐的表格、任务列表、脚注、定义列表、洞察卡片、可选富文本评论与通知，以及宿主注入的高亮钩子。SSR 契约测试会断言该页面渲染出上述结构且**不含** `<script>`。

## 使用位置

| 位置 | 行为 |
| --- | --- |
| `MarkdownField` | 展示模式与编辑器下方均走 Markdown 渲染器 |
| `RichTextField` | HTML 值走白名单清洗，文本值走 Markdown 渲染 |
| `LiteInsightCard` | 渲染服务端预先算好的洞察内容（Markdown 或白名单 HTML） |
| `LiteCommentThread` | 默认纯文本；显式设置 `richContent` 后按 Markdown 渲染正文 |
| `LiteNotificationCenter` | 默认纯文本；设置 `richContent` 后渲染描述 |
| `LiteActivityFeed` | 默认纯文本；设置 `richContent` 后渲染备注正文 |

评论正文默认保持字面文本，因为参考组件按纯文本渲染，parity 结论跟随参考实现。

## 代码高亮钩子

围栏代码块可交给**可信的服务端**高亮器处理；Lite 不自带任何高亮依赖。

```ts
import { configureMarkdownRenderer } from '@svadmin/lite';

configureMarkdownRenderer({
  // 返回可直接渲染的 HTML（如 Shiki/Prism 的服务端输出），
  // 返回 undefined 则保留转义后的纯文本代码块。
  highlight: (code, language) => shikiHighlight(code, language),
  codeBlockClass: 'lite-code-block',
});
```

- 单字段覆盖：`LiteMarkdownField` / `LiteRichTextField` 支持 `renderOptions`；`LiteInsightCard` 同名属性。
- 仅对带语言标记的围栏块调用；行内代码不会进入该钩子。
- 返回值按原样插入，须视为可信 HTML：不要把未经处理、会回显标签的用户输入交给高亮器。
- 钩子返回 `undefined` 时，回退为转义代码 + `language-*` 类名。

零依赖的完整示例见示例应用：`packages/lite/example/src/lib/highlight.ts`，示例内容位于 `packages/lite/example/src/lib/rich-content-sample.ts`。SSR 验证（`bun run check:lite:ssr`）会断言渲染页面仍包含目录、标题 id、表格对齐、任务列表、脚注、定义列表与高亮 token，防止示例与渲染契约漂移。它识别注释、字符串、数字与关键字，逐段转义，遇到不支持的语言返回 `undefined`。可直接作为起点，也可替换为 Shiki/Prism 的服务端输出并按请求或构建缓存结果。

## 代码 token 主题

高亮输出使用 span 类名（`tok-keyword`、`tok-string`、`tok-number`、`tok-comment`、`tok-function`、`tok-type`）。

`lite.css` 保持 IE11 基线，使用**字面色值**；现代基线可额外引入可选主题，用自定义属性驱动同一套调色板（字面色值作为回退）：

```ts
import '@svadmin/lite/lite.css';
import '@svadmin/lite/lite-code-theme.css'; // 可选，需要 CSS 变量支持
```

```css
.lite-code-block {
  --lite-token-keyword: #7FD1FF;
  --lite-token-string: #9BE39B;
  --lite-token-number: #FFC17A;
  --lite-token-comment: #A9AEB8;
  --lite-token-function: #C4A7FF;
  --lite-token-type: #7FD1FF;
}
```

在任一预览容器（或单个代码块的 `.lite-code-block`）上覆盖变量，所有 token 类名随之生效，无需为每个容器、每个 token 各写一份样式。需要维持 IE11 基线的宿主只引入 `lite.css`，保留字面调色板即可。

## 编辑面

两个字段都保留原生 `textarea` 编辑源码，并在其下方显示服务端渲染的预览，因此无 JavaScript 的页面既能阅读格式化内容，也能提交修改。

没有工具栏、没有所见即所得选区模型、也没有客户端清洗器——这是刻意边界，决策记录与 parity 影响见仓库内 `docs/architecture/ssr-rich-content-boundaries.md`。

## SSR 保证

- 渲染器是纯函数：不触碰 DOM、`window` 与定时器，SSR 与测试输出一致
- 预览样式保持 IE11 安全：纯 HTML 标签、无 `display: grid`、无 CSS 变量
- Lite 的 IE11 契约测试会扫描每个组件的样式，预览样式同样受该门禁约束

## 测试

| 契约 | 测试 |
| --- | --- |
| Markdown 子集、表格、任务列表、转义、链接策略 | `packages/lite/src/components/fields/rich-content.test.svelte.ts` |
| 字段在 show/edit 两种模式的渲染 | `packages/lite/src/components/fields/LiteFields.test.svelte.ts` |
| 富文本永不产生可执行脚本或事件处理器 | `packages/lite/src/security.test.integration.ts` |