# Admin UI 产品设计整合（2026-09-19）

历史需求摘要（非用户原话）：完成管理界面的参考研究与实施，并继续整合。原始用户记录保留在 Git 历史。不是重做技术选型，也不是把付费模板改名分发。

## 主线与参考

在 `0f6c4ad` 的六组产品布局 recipes 上整合 main `8f068fb`，保留主线 ContentPageShell、ContentPageHeader、MetricBlock 的 recipes、可读的 primitive 回退以及 Surface 工作流修复。唯一的双方源码冲突为 `packages/ui/panda.config.ts`：同时登记两组 recipes，所有有限变体都预生成。不回退主线、强推或改变后端权限。

历史参考研究摘要见 `reference-decisions.md`，原始记录保留在 Git 历史。列表/详情、筛选、空状态和操作层级是本项目的实现决定；Metronic 仅补充账户/API 页面组织，DashLite/Vuexy 仅补充公开可见的页面范围与组件组织。此处不声称本次重新核对远程页面。当前资产参考清单仅保留 Park 及其未完成许可门禁，不引入供应商 CSS、React、SDK、字体或未授权 Figma 图层。

## 新的可见修正

检查此前提供的资源列表截图时，深色“Pending/待审核”的文字近乎不可读。`StatusBadge` 原来把适用于实心 warning 背景的 `warning-foreground` 用在浅色混合背景上。

新增 `productStatus` 单部件 recipe，沿用五种既有状态、主题前景和状态颜色。标签背景与 card 混合，文字与 foreground 混合；不支持 color-mix 时使用 foreground/muted 的可读回退。没有新增一套品牌调色板。保留 status、label、class API，新增 data-svadmin-status 供状态检查；状态仍同时以文字表达。

七组 recipes 共 37 个部件。原有六组布局仍控制节标题、工具栏、主次工作区、设置分组/字段与业务列表。新的可见改变是修复标签可读性，不是声称与旧图像素一致。

## 来源与同步

`source.json` 与 `figma-map.json` 保留实际 Figma 创建时的 `c919363` 来源，不改写历史。最初 `runtime-source.json` 固定 #444 的 primitive blob，其 subtle/destructive 回退可读性检查不代表 Figma 同步。

2026-09-21 源码合同续修：当前 d5196a87 已删除 Panda primitive/product recipe 文件，统一来源为 `packages/ui/src/recipes.ts`，生成器与浏览器证据哈希改读该文件。components.css 相对历史基线仅增加侧栏宽度/RTL 规则，16 个明暗颜色角色未变；完整 CSS blob 仍严格固定在 runtime-source 中，未来漂移仍失败。历史 source、Figma map、pending 状态均不改写，figmaSynchronized 继续为 false。17 个尺寸作为历史映射保留，不声称新 recipe 的几何或浏览器视觉已经审核通过。

生成器和预览分别校验真实 CSS/recipe blob；未审查的漂移仍失败。新的运行时来源记录不包含第二套颜色值。Figma 本次读取 `8:53` 仍报 Starter MCP 限额，没有写入；其 Input、Badge 和三张页面图层继续待完成。

## 验收范围

既有19状态 × Light/Dark × 中文/英文扩展到1440×900、1920×1080、390×844，即228项；完整交互增至6组，键盘/媒体偏好仍2组。组件页增加全部五种状态的实际渲染文字对比度检查，阈值4.5:1，不宣称整体 WCAG 认证。测量使用浏览器解析后的不透明 sRGB 前景和背景；截屏稳定门禁仍保持连续PNG逐字节相同，没有遮罩或容差放宽。

当前本地已完成真实 Panda、AI/UI 构建，37项资产/模型/捕获测试、17项发布 CSS 契约、13项 Svelte 行为测试，目标 lint 和样例 Svelte 检查0错误/0警告。依赖来自已核验的既有工具链快照，不冒充本轮冻结安装。本地 Chromium 对本机地址返回 ERR_BLOCKED_BY_ADMINISTRATOR，未尝试绕过；浏览器与冻结安装的最终验收交给当前提交的 GitHub Actions。后续结果必须绑定实际运行的 SHA。

`SVADMIN_CHROMIUM_EXECUTABLE_PATH` 仅用于经授权的本地浏览器选择，CI 默认使用 Playwright 安装的浏览器；实际版本记录在 report.json。不修改浏览器管理策略。

PR #438 在完整当前验收和设计评审前保留 Draft，本轮不合并主线、不发布或部署。
