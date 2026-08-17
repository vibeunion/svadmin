---
title: Flow 画布
description: 以可选插件方式添加拖拽节点画布，而不耦合 svadmin 核心
---

`@svadmin/flow` 是面向 Svelte 5 图编辑器的可选浏览器端包。它提供 Svelte Flow 画布和可访问的模板调色板；图结构、权限、持久化和运行语义仍由宿主应用负责。

它不会把 `@xyflow/svelte` 加入 `@svadmin/core` 或 `@svadmin/ui`；只有需要节点画布的应用才安装它。

```bash
bun add @svadmin/flow svelte
```

在渲染画布的路由或布局中导入一次样式：

```ts
import '@svadmin/flow/flow.css';
```

## 构建可拖拽编辑器

```svelte
<script lang="ts">
  import { FlowCanvas, FlowPalette, type FlowEdge, type FlowNode } from '@svadmin/flow';
  import '@svadmin/flow/flow.css';

  let nodes = $state<FlowNode[]>([
    { id: 'start', type: 'input', position: { x: 80, y: 80 }, data: { label: '开始' } },
  ]);
  let edges = $state<FlowEdge[]>([]);
  let number = 0;

  const palette = [
    { id: 'review', type: 'default', label: '人工审核', data: { label: '人工审核' } },
    { id: 'finish', type: 'output', label: '结束', data: { label: '结束' } },
  ];

  function addNode({ template, position }) {
    number += 1;
    nodes = [...nodes, { id: `${template.id}-${number}`, type: template.type, position, data: template.data }];
  }
</script>

<div class="editor-layout">
  <FlowPalette items={palette} />
  <FlowCanvas bind:nodes bind:edges onitemdrop={addNode} showMiniMap />
</div>
```

`FlowPalette` 会写入包专用的 JSON 拖拽负载。放到 `FlowCanvas` 后，`onitemdrop` 会收到选中的模板和 flow 坐标。由宿主创建节点，因而可以分配 ID、限制节点类型并决定数据模型。用户拖拽、连线、选择或删除元素时，画布会同步更新 `nodes` 与 `edges`。

## 公开 API

| 导出 | 用途 |
| --- | --- |
| `FlowCanvas` | 双向绑定的图画布；可选背景、控制器、缩略图和调色板放置回调。 |
| `FlowPalette` | 仅文本且键盘可访问的调色板，支持点击选择和浏览器拖拽。 |
| `FlowNode`、`FlowEdge` | Svelte Flow 节点和边的类型别名。 |
| `FlowPaletteItem`、`FlowItemDropDetail` | 由宿主拥有的调色板与放置契约。 |
| `encodeFlowPaletteItem`、`decodeFlowPaletteItem`、`readFlowPaletteItem` | 自定义调色板或放置目标的辅助函数。 |

如需可信的自定义组件，可把原生 Svelte Flow 的 `nodeTypes` 和 `edgeTypes` 传给 `FlowCanvas`。宿主工具栏需要 `fitView()` 或 `screenToFlowPosition()` 时，使用 `onready`。

## 安全与持久化边界

- 调色板负载只是 UI 传输数据，不是信任或权限边界。所有待保存图都必须在服务端按不可信输入校验。
- 本包不会保存、发布、执行或授权图。租户隔离、版本控制、审计、业务状态流转和执行仍由宿主后端负责。
- 保持在客户端使用；它不是 SSR 图渲染器。
- 不要将节点标签或模板数据作为原始 HTML 渲染；内置调色板只渲染纯文本。
