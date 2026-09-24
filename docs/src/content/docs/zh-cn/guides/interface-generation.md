---
title: 界面生成规范
description: 信息预算、反馈归属、页面状态与 AI 验收规则
---

svadmin 遵循**自身的 Admin UI 设计原则**。外部设计系统只补齐特定行为与场景，
不能混合成一套新的视觉主题。运行时视觉采用 Stripe 风格与企业简洁风；完整的
优先级矩阵见仓库的 `DESIGN.md`。

先阅读七条[设计原则](/zh-cn/guides/design-principles/)，再使用本文确定状态归属
和 AI 验收细节。

## 参考体系

| 参考对象 | 参考内容 | 不复制的内容 |
| --- | --- | --- |
| svadmin 设计原则 | 层级、克制、中性表面、精确的产品语气 | 外部品牌视觉身份 |
| Stripe 风格提示词 | 受控紫色主色、技术网格、分层阴影、上浮/按压反馈 | Stripe 品牌素材与营销渐变 |
| 企业简洁风提示词 | 中性企业表面、间距、焦点偏移、不超过 200ms 的动效 | 纯蓝配色或复制 utility 规则 |
| Fuse / Midone / Skote | 导航解剖、页面家族、工具栏/表格/表单组合 | 供应商 CSS、字体、Logo、配色和标记 |
| [Refine](https://refine.dev/docs/) | Resource、CRUD 流程、Provider 状态、变更归属 | React 实现与 UI 主题 |
| [Ant Design](https://ant.design/components/overview/) | 反馈选择、表单、结果页、空/加载状态、数据密度 | 蓝色主题、圆角、阴影、组件外观 |
| [shadcn/ui](https://ui.shadcn.com/docs) | 可访问组合、语义变体、源码归属组件 | React API 与默认样式 |
| [Carbon](https://carbondesignsystem.com/) / [PatternFly](https://www.patternfly.org/components/) | 企业通知生命周期、错误/空状态、运营页面布局 | 品牌 token 与视觉身份 |
| [Metronic](https://keenthemes.com/metronic/tailwind/demo1/) | 页面家族覆盖与缺失场景 | 视觉风格、装饰、排版 |

Refine + Ant Design 适合作为**行为参考实现**：Refine 管理资源与变更状态，
Ant Design 提供成熟的反馈和数据模式。svadmin 应在 Svelte 中复现契约，
而不是复刻界面。

## 页面信息预算

每个生成页面先回答四个问题：

1. 页面唯一的主要工作流是什么？
2. 哪个未解决状态会阻塞或改变工作流？
3. 每个事实、数字和状态由哪个界面位置负责？
4. 用户解决问题后，哪些内容必须消失？

从页头到主工作区，最多出现一个全宽、高权重的持久提示。说明文案只有在
补充约束、后果、范围或恢复路径时才有价值，不得复述标题、标签、按钮、
文件名、Badge、进度值或表格总数。

## 反馈决策表

核心不变量：**one event -> one primary feedback surface**。

| 情况 | 主反馈面 | 生命周期 |
| --- | --- | --- |
| 字段校验错误 | 字段内联消息 | 直到修正 |
| 成功且无需后续操作 | Toast | 3 秒 |
| 成功使页面进入完成状态 | 新的页面/局部状态，并关闭自动 Toast | 直到跳转或重新开始 |
| 结果不完整且需要用户处理 | `FeedbackNotice tone="warning"` | 直到解决 |
| 阻塞失败或权限边界 | `FeedbackNotice tone="danger" priority="blocking"` | 直到解决或关闭 |
| 仍然相关的非阻塞上下文 | `FeedbackNotice tone="info"` | 相关期间 |
| 可撤销变更 | Undoable Toast | 与撤销窗口一致 |

`FeedbackNotice` 有意不提供 success 变体。底层 `Alert` 为兼容性保留 success，
但不能作为页面级普通变更成功的默认方案。

当页面自行展示完成状态时，关闭 Hook 的自动通知：

```ts
const forgot = useForgotPassword({ successNotification: false });

const form = useForm({
  resource: 'orders',
  action: 'create',
  successNotification: false,
});
```

只有存在重复投递可能时才使用事件 key：

```ts
notification.success('委托单已保存', 3000, {
  key: `order:${orderId}:save:${revision}`,
});
```

key 表示事件身份，不能使用翻译后的提示文案作为全局去重依据。

## OCR 场景修正

OCR 完成后，文件名、识别字段数、已确认数量和表格已经证明识别成功，
不应再增加一个全宽、长期存在的成功横幅重复这些事实。

正确层级是：

- 识别成功使用 3 秒 Toast，或上传控件内的紧凑状态；
- “3 个字段待补充”是唯一持久、可行动的 warning notice；
- notice 旁最多放一个“去补充”主操作；
- 所有缺失字段补齐后，notice 立即消失。

## AI 生成验收门

出现任一情况即拒绝生成结果：

- 同一成功同时出现在 Toast、标题、说明、Alert、Badge 和数据中；
- 首屏出现多个高权重持久提示；
- 说明面板只是在描述附近已有的控件或结果；
- 卡片嵌套，或仅为装饰给页面分区加卡片；
- 反馈没有归属、没有消失条件，或包含多个主操作；
- 桌面或移动端存在重叠、裁切、横向滚动，或反馈挤走主操作。

新的 `create-svadmin` 项目会在根目录获得 `DESIGN.md` 和 `AGENTS.md`，
让编码 AI 在生成 UI 前直接读取并执行这些规则。

已有项目可以先预览，再仅补齐缺失文件，不会覆盖本地规范：

```bash
bunx @svadmin/create guidance .
bunx @svadmin/create guidance . --write
```

## Vibe Coding 页面样板

`vibe` 提供开发者优先的客户管理 starter，包含列表、详情、分组表单、工作台、
设置和审批六类可修改 Svelte 页面。先查看机器可读目录，再预览生成计划：

```bash
bunx @svadmin/create vibe catalog
bunx @svadmin/create vibe catalog --query "审批"
bunx @svadmin/create vibe inspect approval
bunx @svadmin/create vibe init customer-admin --preset enterprise
bunx @svadmin/create vibe init customer-admin --preset enterprise --write
```

目标目录必须不存在；命令不覆盖已有项目，不安装依赖，不连接模型或生产服务。
`catalog --query` 按页面 ID、组件名和中英文标签检索，多个词必须全部匹配；
`inspect <pageId>` 输出 JSON，包含实际页面源码、资源契约、应用装配、
设计规则、预览路径和验收要求。它是只读参考上下文，不是单页安装器，
也不会读取或覆盖客户当前项目。修改已有项目时，必须先核对客户自己的实现。

### 编码助手 MCP 接入

`vibe mcp` 通过标准输入输出提供独立的只读页面材料服务。它不启动 HTTP 端口，
不连接模型，不读取客户项目，也不复用面向业务数据的 `@svadmin/mcp` 服务。

当前源码可先在仓库中运行 `bun run --cwd packages/create-svadmin build`。
在支持 stdio MCP 的编码助手中，配置 `node` 和构建产物的绝对路径。
以下为常见 JSON 配置格式，具体配置位置和字段以客户端为准：

```json
{
  "mcpServers": {
    "svadmin-vibe": {
      "command": "node",
      "args": [
        "/absolute/path/to/svadmin/packages/create-svadmin/dist/index.js",
        "vibe",
        "mcp"
      ]
    }
  }
}
```

这不会自动修改编码助手的全局配置。使用 npm 安装版本时，应指向该安装的
`dist/index.js`，并先确认所用版本已发布这一功能；本地构建通过不代表已发布。
服务的依赖必须随 CLI 一起安装，不能只复制 `dist/index.js`。

| 工具 | 参数 | 返回 |
| --- | --- | --- |
| `svadmin_vibe_search` | `{"query":"审批"}`；`{}` 列出全部 | 六类页面的匹配元数据 |
| `svadmin_vibe_inspect` | `{"page":"approval"}` | 源码、契约、演示 Provider、设计和验收约束 |
| `svadmin_vibe_preview` | `{"page":"approval","viewport":"mobile"}` | 随包 PNG，可选 `desktop` / `mobile` |

工具只接受已知页面和有限参数；不能传入任意文件路径、项目目录、URL 或写入指令。
推荐顺序是检索页面、读取上下文、查看桌面与移动参考，再修改客户自己的代码。
参考图不是客户当前界面的截图，也不是本次修改已通过验收的证据。

### 生成项目验证

在生成目录中运行：

```bash
bun install
bun run check
bun run dev
```

可选预设：`operations`（高密度运营）、`enterprise`（标准企业）、
`collaboration`（轻量协作）。预设统一控制页面密度、内容宽度、表单列数、
详情布局和主题，不是仅换主色。

编码助手先读取 `svadmin.vibe.json`、`svadmin.ai.json`、`DESIGN.md`，
再按 `.agents/skills/svadmin-vibe/SKILL.md` 选择页面、读取实际组件 API、
修改源码并验收。客户源码无需依赖模型即可运行。

### 模块边界

生成项目的 `ARCHITECTURE.md` 明确应用装配、业务模块、资源契约和
Provider 的职责。跨模块只能引用公开 `index.ts` 或不依赖 Svelte 的 `data.ts`；
不允许引用其他模块的私有组件、Store 或 `@svadmin/*/src`、`dist`。

`bun run check` 先运行 `check:architecture`，再做类型检查。
检查器解析 TypeScript 与 Svelte 的两个脚本块，覆盖静态引用、重导出、
类型引用和字符串动态导入；计算型动态导入与无法解析的路径别名会失败。
这是代码组织约束，不是安全沙箱，也不代替服务端权限、租户隔离或审计。

```bash
bun run build
bunx playwright install chromium
bun run test:ui
```

浏览器验收生成桌面和移动端截图，并检查基础交互和页面级横向溢出。
截图不自动证明审美合格；品牌契合度仍由客户确认。
预览使用内存数据，刷新即恢复；审批仅为 UI 样板，真实权限、审计、持久化
和服务端审批规则必须另行接入。无代码生成仍限定在 Surface 支持的目录与策略内。
