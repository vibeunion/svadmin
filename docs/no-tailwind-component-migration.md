# Tailwind/OpenUI component migration

本文档已替换旧的 no-Tailwind/Panda 迁移说明。当前方案是 Tailwind v4
作者构建、`tailwind-variants` recipe、Bits UI 交互和预编译 CSS 分发。

权威说明见 [Tailwind/OpenUI migration](./architecture/tailwind-openui-migration.md)；
AI 编写元数据见 `@svadmin/ui/component-registry`。shadcn-svelte 只用于生成
可审查的候选源码，不作为运行时依赖或模型执行入口。

历史截图、提交和安全证据中的旧名称只代表当时的基线，不代表当前构建链、
依赖或公开 API。当前门禁：

```sh
bun run check:ui-style
bun run check:surface-style
bun run check:openui
```
