---
title: 组件弹射 (Swizzle)
description: 一键弹射官方组件源码以进行深度定制
---

`svadmin swizzle` 命令实现了 Vibe Coding **4-Tier Escape Hatch Ladder** 的第四级（源码级逃逸）。允许将 `@svadmin/ui` 官方组件源码一键复制到你的本地项目中自由魔改。

## 查看可弹射组件列表

```bash
bunx @svadmin/create swizzle --list
```

输出：

```text
Available ejectable components for `svadmin swizzle`:

  AutoTable            Declarative data table with sorting, filtering, selection, and pagination
  AutoForm             Schema-driven form with validation, dirty tracking, and responsive layout
  ModalForm            Dialog-based modal form with submit and cancel lifecycle
  DrawerForm           Slide-over drawer form for detail editing without page leaves
  Sidebar              Application navigation sidebar with collapsible menu tree and badge indicators
  ThemeSwitcher        Theme mode toggle (light, dark, system) and color palette picker
  RecordDetailDrawer   High-density record preview and detail drawer
```

## 弹射组件到本地

运行以下命令（默认干运行预览）：

```bash
bunx @svadmin/create swizzle AutoTable --write
```

组件将被解构至本地 `src/components/svadmin/AutoTable.svelte`，你可以在此文件中任意修改布局、样式或增删插槽。
