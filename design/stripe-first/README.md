# svadmin Stripe-first Design Kit v0.1

本目录把可追溯的设计参考、现有代码资产与实际创建的 Figma 文件关联起来。
这是设计资产交付，不是另一套运行时主题，也不是全站视觉改版。

## 打开已创建的设计文件

[Figma：svadmin · Stripe-first Design Kit v0.1](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF)

[基础样张](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF?node-id=7-10) · [Button 组件集](https://www.figma.com/design/r02lMyLBPoaNS3gep3TNRF?node-id=8-53)

实际完成：81 个变量（32 个基础颜色、32 个语义颜色别名、17 个尺寸变量）、6 种文本样式、6 种明暗主题阴影样式，以及 24 个 Button 变体。颜色与尺寸来自现有代码，不是从 Stripe 截图猜测的值。变量均设定用途范围和 WEB code syntax。

基础样张和 Button 已通过 Figma 结构读取及截图检查。Button 提供可编辑 Label 属性；24 个变体覆盖 Light/Dark、default/outline、sm/default/lg 和 default/disabled。它只是公开 Button API 的一个子集，不包含全部外观、图标、加载与焦点状态。当前 Button 样张宽度为 140px，尚未认证为完整的自适应内容实现。

## 未完成项与账户限制

Figma 当前账户只允许三页，因此使用“基础与说明／组件／页面模式”的结构。Light 和 Dark 是两个独立的单模式变量集合，不是一个可一键切换的双模式集合。

继续创建 Input 时，Figma 返回 Starter MCP 调用额度已用尽。Input、Badge 和三类页面模式尚未创建；第三页目前只是空的预留页。不得把此交付称为完整 UI Kit。Code Connect 的访问检查也因当前席位不满足要求而失败；`figma-map.json` 是普通源码映射，不是已经发布的 Code Connect。

这些未完成项保留在 `handoff.json`。恢复后应先读取现有节点，复用返回的真实 ID，不能重新创建同名文件或删除未知节点。不得绕过账户额度或权限限制。

## 设计来源与边界

视觉决定由根目录 `DESIGN.md` 与经过审查的 svadmin 实现共同管理。Stripe Connect 官方 Toolkit 用于研究产品结构，Park Foundations 用于研究变量和组件组织；本次没有复制第三方 Figma 图层、商标、字体或商业素材。外部文件级许可仍为 pending，不得随 npm 包再分发。

运行时保持 Svelte + Bits UI + Panda CSS，不新增 Tailwind、React、Stripe SDK 或 Ark UI 依赖，也不改动 PR #436。页面模式契约用于后续设计验收，不是直接交给 SurfaceRenderer 的 schema。

## 单一来源与生成格式

`source.json` 固定代码来源及经过审查的尺寸映射。生成器从 `packages/ui/src/components.css` 读取明暗主题，并检查 Git blob 哈希；源文件改变时会失败，要求先审查新的来源版本，而不是继续给旧 Figma 文件贴上“同步”的标签。

生成文件包括 `light.tokens.json`、`dark.tokens.json` 和 `figma-seed.json`。前两者使用 DTCG 2025.10 的结构化 color/dimension 与 token 引用形式，范围限于本套件支持的类型，不是完整 DTCG 校验器。它们是代码生成的设计快照，不取代现有 CSS/Panda 作为运行时来源。

Figma 接受的颜色为 sRGB 投影；Light/success、Light/warning、Dark/primary、Dark/ring、Dark/accent-foreground 有色域裁剪。DTCG 快照保留原始 OKLCH 数值，`figma-seed.json` 单独标记裁剪，不能声称两个渲染器无损或像素完全一致。尺寸转换明确假设根字号为 16px。

已记录但未强行修改的差异：DESIGN.md 的 spacing sm/lg 为 8/24px，现有 Panda 基础尺度为 0.75/1.25rem（16px 根字号下为 12/20px）。本套件使用数值尺度命名，避免把文档名称冲突悄悄变成组件几何变化。

## 验证与生成

仅需要 Node.js 22 或更新版本，不安装项目依赖：

```sh
node --test design/stripe-first/build.test.mjs
node design/stripe-first/build.mjs
node design/stripe-first/build.mjs --check
```

输出位于 `test-results/stripe-first-design-kit/`，专项工作流会保留生成快照、源码映射和测试日志。工作流通过只证明设计资产提取与契约检查成功，不证明全部业务组件、完整应用、无障碍合规或发布条件已经通过。

## 文件职责

- `source.json`：不可变来源、颜色角色、尺寸映射与已知差异。
- `references.json`：官方入口、参考用途及许可状态。
- `contract.json`：列表、详情、设置模式的目标契约，明确未实现状态。
- `figma-map.json`：已返回的 Figma 节点 ID、组件属性和代码位置。
- `handoff.json`：已完成检查、真实阻断与恢复步骤。
- `build.mjs` / `build.test.mjs`：无依赖的快照生成器与正反例测试。
