# Customer Workspace

Svelte 5 + svadmin 的可修改页面样板，包含列表、详情、分组表单、工作台、
设置和审批六类页面，以及三套应用级设计预设。不是已接通后端的业务产品。

`previews/` 随包提供六类页面的桌面与移动端参考截图。它们用于挑选样板，
不能代替客户修改后的重新验收；实际结果以本地 `test-results/` 为准。

## 本地运行

```bash
bun install
bun run check
bun run dev
```

在编码助手中提出需求即可，例如：

> 基于当前客户工作台，把全站调整为高密度运营，保留客户 CRUD 和跟进流程。
> 先读取 svadmin.vibe.json 和设计规范，修改后运行检查并查看移动端截图。

`AGENTS.md` 提供通用规则，`.agents/skills/svadmin-vibe/SKILL.md` 提供生成与
验收流程。其他助手可以直接读取该文件。`svadmin.vibe.json` 可检索页面源码、
组件、预设、状态与验收入口；已安装组件的声明才是 API 事实源。

## 设计与业务

- `src/design-selection.ts`：初始预设。
- `src/design.svelte.ts`：品牌名称、主题、密度、宽度、表单列数、详情布局。
- `src/features/customers/`：六类页面及 TypeBox 资源契约。
- `src/resources.ts`：字段与导航元数据。
- `src/svadmin.config.ts`：替换数据、身份和权限 Provider 的唯一入口。
- `src/demo/provider.ts`：内存演示数据；刷新页面即恢复，不上传任何数据。

工作区设置仅在当前会话内生效，持久默认值请修改设计配置。内置主题选择仍遵循
svadmin 已保存的个人偏好，不应把颜色选择当成授权或数据隔离。

客户与跟进支持创建、编辑，审批支持修改结果及意见；删除不开放。
审批样板仅演示 UI，不具备真实审批流、不可变审计或服务端权限控制。
接入生产前必须实现这些能力，并移除演示 Provider 和开发状态开关。

## 验收

```bash
bun run build
bunx playwright install chromium
bun run test:ui
```

Playwright 自动启动本地开发服务，生成桌面与移动端截图到 `test-results/`，
检查页面、交互、浏览器异常和页面级溢出。宽表格允许在自己的滚动区内横向滚动。
视觉品味、品牌一致性、真实权限和业务正确性仍需要人工验收。

开发状态可以通过 URL 查询参数切换，例如 `/?scenario=empty#/customers`：
`empty`、`loading`、`error`、`denied`、`partial`、`readonly`。生产构建不读取该开关。

## 演进边界

这是一条开发者生成路径，不内置模型调用或密钥管理。没有承诺任意应用生成；
无代码仪表盘仍应使用受策略约束的 `@svadmin/surface`。首次接入真实后端时，
同步资源契约、`svadmin.ai.json`、权限与针对性测试，避免 UI 与能力声明漂移。
