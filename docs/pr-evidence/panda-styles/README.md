# Panda / native CSS compatibility

## 实施范围

UI 和 AI Elements 发布预生成 CSS，不要求消费端安装 Tailwind 或 Panda。Panda 只作为 UI 构建依赖，用于新语义 tokens 和 recipes。旧样式保留为可审查的原生 CSS，避免删除编译器时改变布局、主题变量、交互状态、动画或 color-mix 降级规则。

`packages/ui/styles-compatibility.json` 固定迁移前提交、CSS SHA-256、各原生源文件哈希及完整规则树摘要。测试保留选择器、声明和级联顺序，不把格式化差异误当样式差异。

`app.css` 是普通 CSS。`app.theme.css` 仅保留旧宿主可选的主题元数据兼容入口；库本身不安装、调用 Tailwind。`--tw-*` 兼容变量和已生成动画不是活动编译依赖，不应直接全局替换或删除。

## 语义变体

默认 `svadmin/v1` Catalog 不接受新增字段，保持原协议严格性。显式使用 `styledSurfaceCatalog` / `svadmin/styled-v1` 后，可为 metric 选择 tone 和 density，为 resource-table 选择 density。枚举来自共享设计契约，构建时预生成全部公开组合。

模型只输出合法组件 props，不输出 CSS、类名、任意 token、recipes 或可执行代码。字段权限仍经过 SurfacePolicy 校验。OpenUI Lang 的完整解析/流式适配不在本次迁移实现中。

## 验证与边界

`Panda style compatibility` 工作流只读仓库，在当前提交执行构建、原生 CSS 回归、Surface 测试、类型检查和 Chromium 组件测试。任一门禁失败，工作流最终失败；中间 continue-on-error 只用于保留其他检查的诊断，不允许带失败通过。

截图和 provenance.json 保存在该次运行的 `panda-style-compatibility` artifact 中。截图对应真实 MetricWidget、ResourceTableWidget、按钮和输入控件；不是完整后台应用测试、IE 浏览器测试或后端授权证明。没有完整成功的 provenance.json 时不得宣称整组浏览器验证通过。

测试矩阵：1440×900、1920×1080、390×844，浅色/深色；默认组件与原 CSS 像素对比；语义变体、加载/空/错误态、禁用、文件输入、焦点和横向溢出。

修改兼容 CSS 时必须明确评审并有新的视觉证据；不得只为使哈希测试通过而静默更新基线。
