# svadmin Admin UI Design Kit v0.1

本目录把可追溯的设计参考、现有代码资产与实际创建的 Figma 文件关联起来。
这是设计资产交付，不是另一套运行时主题，也不是全站视觉改版。

## 打开已有 Figma 文件

[已有 Figma 文件（本地迁名不代表远程文件已更名）](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF)

[基础样张](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF?node-id=7-10) · [Button 组件集](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF?node-id=8-53)

已创建81个变量（32个基础颜色、32个语义颜色别名、17个尺寸变量）、6种文本样式、6种明暗阴影样式和24个 Button 变体。颜色与尺寸来自现有代码，不是从第三方截图猜测的值。变量均设定用途范围和 WEB code syntax。

前一轮已读取基础样张与 Button 结构并检查截图。Button 提供可编辑 Label，变体覆盖 Light/Dark、default/outline、sm/default/lg 和 default/disabled。这是公开 API 子集，不含全部外观、图标、加载与焦点状态；样张宽度140px，未认证为完整自适应实现。

## 新增：可运行的浏览器样例

[运行说明、状态矩阵与验收边界](./preview/README.md)。`preview/` 使用构建后的真实 Svelte 组件与普通 CSS，包含 Input/Badge 状态页，以及客户列表、详情、设置三类页面。支持中文/英文、明暗主题、桌面/窄屏；密度只传给支持此 API 的组件。

搜索、查看后返回、重试、输入、文件选择、模拟保存与反馈生命周期在浏览器真实运行；所有数据是合成记录，没有生产后端请求。源码与构建产物由同一专项工作流校验。生成截图只用于设计评审，不自动等于视觉设计已获批准。

```sh
bun install --frozen-lockfile
bun run --cwd packages/ai-elements build
bun run --cwd packages/ui build
node design/admin-ui/preview/run.mjs
```

预览地址为 `http://127.0.0.1:4179`。专项工作流会生成可运行静态站点、状态截图、完整结果及源码哈希；以对应提交的实际结果为准，不引用旧提交绿灯证明新代码。

**浏览器样例不是 Figma 同步。** 本轮复查仍遇到 Starter MCP 读取限额，没有改动已有 Figma 节点或将 pending 状态改为完成。

## Figma 未完成项与账户限制

当前账户最多三页，文件采用“基础与说明／组件／页面模式”。Light 和 Dark 是两个独立单模式变量集合，不是一键切换的双模式集合。

Input、Badge 和三类页面的 Figma 图层仍未创建；第三页是空的预留页。Code Connect 因席位要求未启用，`figma-map.json` 是普通源码映射，不是已发布 Code Connect。不得将此交付称为完整 Figma UI Kit，不得绕过账户额度或权限。

原有未完成项保留在 `handoff.json`；浏览器后续任务在 `preview/task.json`。恢复时先读取原文件，使用已返回的真实节点 ID，不重新创建同名文件或删除未知节点。

## 设计来源与边界

视觉决定由根目录 `DESIGN.md` 与经过审查的 svadmin 实现共同管理。当前资产参考清单仅保留 Park Foundations，用于参考变量与组件组织。本次不复制第三方图层、商标、字体或商业素材；文件级许可仍为 pending，不得随 npm 包再分发。目录与任务标识已规范为 admin-ui；历史需求仅作摘要，原始记录保留在 Git 历史。

最初交付基于 Svelte + Bits UI + Panda CSS；这是历史背景，不是当前运行时约束。当前 UI 已迁移到 Tailwind，primitive/product recipe 合并于 `packages/ui/src/recipes.ts`。本套件不新增运行时依赖。页面模式契约用于设计验收，不是 SurfaceRenderer schema；模拟权限也不代替后端授权。

## 单一来源与生成格式

`source.json` 固定历史 Figma 代码来源及尺寸映射，其中已删除的 Panda recipe 路径仅为历史 provenance，不再作为文件读取目标。`runtime-source.json` 单独固定当前 stylesheet/recipe 路径与 Git blob，并关联历史基线。生成器读取当前明暗主题并检查运行时哈希；来源改变仍会失败，不能继续给旧 Figma 文件贴“同步”标签。

生成 `light.tokens.json`、`dark.tokens.json` 与 `figma-seed.json`。前两者采用 DTCG 2025.10 结构化 color/dimension 及引用形式，仅支持本套件所需类型，不是完整 DTCG 校验器。元数据分别记录运行时来源与历史 `dimensionsRevision`；17 个尺寸没有重新宣称为当前 recipe 几何验收结果。快照不取代现有 CSS/Tailwind 运行时来源。

Figma 颜色采用 sRGB 投影；Light/success、Light/warning、Dark/primary、Dark/ring、Dark/accent-foreground 有色域裁剪。DTCG 保留原始 OKLCH，figma-seed 单独标记裁剪，不能宣称两个渲染器无损或像素一致。尺寸换算明确假设根字号16px。

已记录但未强行改动：DESIGN.md 的 spacing sm/lg 为8/24px，现有 Panda 基础尺度为0.75/1.25rem（16px根字号下为12/20px）。套件采用数值尺度命名，不把文档命名冲突变成未经审查的组件几何改动。

## 设计快照验证

只需 Node.js 22 或更新版本，不安装项目依赖：

```sh
node --test design/admin-ui/build.test.mjs design/admin-ui/preview/model.test.mjs
node design/admin-ui/build.mjs
node design/admin-ui/build.mjs --check
```

快照输出位于 `test-results/admin-ui-design-kit/`；真实组件浏览器样例输出位于 `test-results/admin-ui-browser/`。专项通过仅证明各自声明的检查，不代表全部应用、无障碍合规、完整 Figma 库或发布验收通过。

文件职责：`source.json` 固定来源；`references.json` 记录许可；`contract.json` 是页面目标；`figma-map.json` 记录已知节点；`handoff.json` 保留 Figma 阻断；`build.mjs` 与 `build.test.mjs` 负责快照；`preview/` 负责实际浏览器样例及独立验收。
