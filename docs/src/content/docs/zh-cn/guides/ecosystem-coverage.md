---
title: 生态覆盖对照
description: Ant Design 推荐库在 svadmin 与 Svelte 生态中的对应关系
---

Ant Design 为 React 生态维护了一份[推荐库清单](https://ant-design.antgroup.com/docs/react/recommendation-cn)。
本页把每个分类映射到 svadmin 包、Svelte 生态替代品，或明确标注为缺口。
只有能力由一方包交付或由框架运行时提供时，才标记为已覆盖。

状态图例：✅ 一方实现 · 🔶 部分覆盖或框架提供 · 🧩 交由 Svelte 生态包 · ❌ 一方缺口 · ➖ 不适合后台场景。

| 分类 | Ant Design 推荐 | svadmin 实现 | Svelte 生态 | 状态 |
| --- | --- | --- | --- | --- |
| 可视化图表 | Ant Design Charts / AntV | `BarChart`、`LineChart`、`PieChart`、`AreaChart`、`ScatterChart` | LayerChart、svelte-echarts | 🔶 基础图表；统计图表用 LayerChart |
| 流图 | reactflow | `@svadmin/flow`（xyflow/svelte） | @xyflow/svelte | ✅ |
| Hooks 库 | ahooks | `@svadmin/core` 数据/认证 hooks + `@svadmin/ui` runes hooks：`useMediaQuery`、`useDeviceDetect`、`useClipboard`、`useLocalStorage`、`useDebouncedValue`、`useInterval`、`useEventListener`、`useOnClickOutside`、`useWindowSize` | runed | ✅ |
| 表单 | ProForm / Formily / react-hook-form / Formik | `AutoForm`、`JsonSchemaForm`、`StepForm`、`ModalForm`、`DrawerForm` 与字段组件 | sveltekit-superforms | ✅ |
| 路由 | react-router | `useParsed`、`NavigateToResource`、core 路由、SvelteKit 适配 | SvelteKit | ✅ |
| 布局 / 停靠 | react-grid-layout、react-grid-system、rc-dock | `DraggableGrid`、`ResizableGrid`、`SplitPaneLayout`、`WorkspaceSplitPane`、`MultiTabKeepAlive` | paneforge、svelte-grid | 🔶 无可停靠面板 |
| 拖拽 | dnd-kit | `DraggableRowTable`、`DraggableHeader`、`DraggableGrid`、`KanbanBoard` | svelte-dnd-action | ✅ |
| 代码编辑器 | CodeMirror、Monaco | `CodeEditor` 按需适配器（`@svadmin/ui/code-editor`，基于 `svelte-codemirror-editor`） | svelte-codemirror-editor、svelte-monaco | ✅ |
| 富文本编辑器 | react-quill | `@svadmin/editor`（Tiptap） | svelte-tiptap | ✅ |
| JSON 编辑器 | vanilla-jsoneditor | `JsonEditor` 按需适配器（`@svadmin/ui/json-editor`，基于 `svelte-jsoneditor`）；Schema 表单用 `JsonSchemaForm` | svelte-jsoneditor | ✅ |
| JSON 显示器 | react-json-view | `JsonField`、`CodeField` | — | ✅ |
| 拾色器 | react-colorful、react-color | `ColorPicker`、editor `ColorPicker` | — | ✅ |
| 响应式 | react-responsive | `useMediaQuery`、`useDeviceDetect` | runed | ✅ |
| 复制到剪贴板 | react-copy-to-clipboard | `CopyField`、ai-elements `CopyButton` | — | ✅ |
| 页面 meta | react-helmet-async | SvelteKit `<svelte:head>` | SvelteKit | 🔶 框架提供 |
| 图标 | react-icons / fontawesome | `@lucide/svelte` | lucide-svelte、phosphor-svelte | ✅ |
| 二维码 | qrcode.react | `QRCode` 按需适配器（`@svadmin/ui/qr-code`，基于 `qrcode`） | svelte-qrcode、qrcode | ✅ |
| 顶部进度条 | nprogress | `TopProgressBar` | — | ✅ |
| 应用国际化 | FormatJS / react-i18next | `@svadmin/core` i18n、`useTranslation` | svelte-i18n、inlang | ✅ |
| 代码高亮 | react-syntax-highlighter | ai-elements `CodeBlock`（Shiki）、editor lowlight | shiki | ✅ |
| Markdown 渲染 | react-markdown | ai-elements `Response`（marked/rehype） | mdsvex | ✅ |
| 无限滚动 | @rc-component/virtual-list、react-infinite-scroll-component | `InfiniteList`、`VirtualTable`、`scroll-area` 原语 | @tanstack/svelte-virtual、virtua | ✅ |
| 地图 | google-map-react、react-amap | — | leaflet | ➖ |
| 视频播放 | react-player、video-react、video.js | `MediaPlayer`（原生 video/audio） | vidstack | 🔶 HLS/流媒体用 vidstack |
| 右键菜单 | react-contexify | `context-menu` 原语 | bits-ui | ✅ |
| Emoji | emoji-picker-react、emoji-mart | — | emoji-mart（框架无关） | ➖ |
| 分割面板 | react-split-pane、react-resizable-panels | `SplitPaneLayout`、`WorkspaceSplitPane` | paneforge | ✅ |
| 图片裁切 | antd-img-crop、react-image-crop | `ImageCropper`、`MediaLibraryModal` | — | ✅ |
| 关键字高亮 | react-highlight-words | `HighlightText` | — | ✅ |
| 文字轮播 | react-text-loop、react-fast-marquee | `Marquee` | — | ✅ |
| 动画 | motion、Ant Motion、react-spring | Svelte 过渡 + `tweened` / `spring` | Svelte 运行时、motion-svelte | 🔶 框架提供 |
| 页脚 | rc-footer | `AppFooter` | — | ✅ |
| 数字 / 金额 | react-number-format、react-currency-input-field | `NumberInput`、`NumericInput`、`MoneyInput`、`CurrencyField`、`PercentInput` | — | ✅ |
| 移动端探测 | react-device-detect | `useDeviceDetect` | — | ✅ |
| 应用程序框架 | umi、remix、refine | svadmin 自身、`@svadmin/refine-adapter` | SvelteKit | ✅ |
| 电话输入 | react-phone-number-input | `PhoneField`（展示）、`PhoneInput`（输入） | svelte-tel-input | ✅ |
| AI 对话应用 | Ant Design X | `@svadmin/ai-elements` | — | ✅ |
| 命令行工具 | Ant Design CLI | `create-svadmin`、`agmesh` | — | ✅ |
| PDF | react-pdf、@react-pdf/renderer | `PdfDocumentViewer` | pdfjs-dist、svelte-pdf | ✅ |
| 手势库 | use-gesture | `useSwipe`（基于 pointer） | svelte-gestures | ✅ 简单 swipe；复杂手势用 svelte-gestures |

## 如何阅读这张表

- **✅ 一方实现**：能力已随 `@svadmin/*` 包交付，并遵守与框架一致的租户、
  权限和无障碍契约。
- **🔶 部分覆盖或框架提供**：svadmin 覆盖常见后台场景，进阶或专用变体应交给
  Svelte 生态，表中已给出对应包。
- **🧩 交由生态**：能力刻意由 Svelte 生态包提供。svadmin 只保留集成缝
  （租户、权限、脱敏），不重导出也不 vendor 该依赖。
- **❌ 一方缺口**：既无一方组件，也尚未指定生态包。上表中此列已为空。
- **➖ 不适合**：该分类超出后台框架的产品边界。这里显式记录，避免被误解为遗漏。

## 交由 Svelte 生态补位

以下分类**刻意不**一方实现。它们要么高度专用、依赖沉重，要么超出后台产品边界，
因此直接指向维护中的 Svelte 包，而不是做一层封装。包名就是集成缝；租户、
权限、脱敏决策仍留在 svadmin 代码里。

| 需求 | Svelte 包 | 说明 |
| --- | --- | --- |
| 统计图表 | `layerchart`、`svelte-echarts` | 仪表盘基础图仍用 `BarChart`/`LineChart`/`PieChart` |
| 可停靠面板 | `paneforge` | 栅格与分割布局已由 `ResizableGrid`、`SplitPaneLayout`、`WorkspaceSplitPane` 覆盖 |
| 虚拟列表 | `@tanstack/svelte-virtual`、`virtua` | 一方 `InfiniteList`、`VirtualTable` 已覆盖常规需求 |
| 流媒体视频 | `vidstack` | `MediaPlayer` 仅处理原生 video/audio |
| 复杂手势 | `svelte-gestures` | 简单 swipe/pinch 用 pointer events 即可 |
| Emoji 选择器 | `emoji-mart` + `@emoji-mart/data` | 可选，不进入默认表面 |
| 地图 | `leaflet` + `svelte-leafletjs` | 仅当产品需要地理视图 |

安装示例：

```bash
bun add layerchart
```

不要把这些包 vendor 进 `@svadmin/ui`。保持外部依赖，才能守住框架依赖边界，
并让应用自行锁定版本。若已有薄适配器（`@svadmin/ui/code-editor`、
`@svadmin/ui/qr-code`），见[生态适配器](/zh-cn/components/ecosystem-adapters/)。

## 决定新能力放哪里

只有当能力属于后台核心、依赖轻量、且需要共享 svadmin 的租户/权限/无障碍契约时，
才在 `@svadmin/ui` 新增一方组件。此时必须满足：

1. 使用语义设计 token，而不是硬编码颜色；
2. 支持键盘与屏幕阅读器；
3. 网络、权限与持久化仍由宿主通过 props 注入；
4. 附带同目录测试，并从 `@svadmin/ui` 导出。

否则应交给上表列出的 Svelte 生态包，应用代码只保留集成缝。
绝不要把受委托的包 vendor 进 `@svadmin/ui`。

现有的 `HighlightText`、`Marquee`、`MediaPlayer`、`TopProgressBar`、
`PhoneInput`、`AppFooter`、`ResizableGrid`、`AreaChart`、`ScatterChart`、
`useMediaQuery` / `useDeviceDetect`，以及 `useClipboard`、`useLocalStorage`、
`useDebouncedValue`、`useInterval`、`useEventListener`、`useOnClickOutside`、
`useWindowSize`、`useSwipe` 是**一方实现**的例子。`CodeEditor`（含
`@svadmin/ui/code-editor/presets`）、`JsonEditor`、`QRCode` 是生态包的
**按需适配器**，见[生态适配器](/zh-cn/components/ecosystem-adapters/)。