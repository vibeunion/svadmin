# 业务模块边界

业务页面按 `features/<业务模块>` 组织。模块可以公开资源契约、查询、命令、
页面入口和业务组件；模块内部文件不得被其他模块直接导入，跨模块协作必须
经过公开 `index.ts` 或核心层契约。

单个 TypeScript/Svelte 源文件默认不超过 800 行。历史大文件登记在
`scripts/architecture-boundaries.json`，只允许拆分或保持，不能继续增长。

每个 `example/src/features/<module>` 必须提供 `index.ts` 作为公开入口。
`example/src/pages` 已废弃且不得重新加入页面文件；新增页面只能归属业务
Feature。

新业务代码不得继续放入 `src/pages`。迁移现有页面时，按照
`docs/architecture/feature-migration.md` 将页面、契约、查询和命令移动到
`features/<业务模块>`，并删除旧路径；项目不承诺旧页面路径兼容。

`bun run check:architecture` 检查文件大小和 feature 私有相对导入，并已接入
根类型检查。它不替代 TypeScript、Svelte 检查或运行时 schema 校验。

跨模块导入必须使用目标模块的 `index.ts` 页面入口或 `data.ts` 纯数据入口；
直接导入目标模块的页面、资源实现或内部状态文件会被架构门禁拒绝。

当前已迁移的业务模块包括 `catalog`、`people`、`calendar`、`crm`、`mail`、
`operations`、`ai`、`property`、`domain`、`case`、`dashboard`、`showcase`
和 `resource`。`src/pages` 不再承载任何应用页面入口。
