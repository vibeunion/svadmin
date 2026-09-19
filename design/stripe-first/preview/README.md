# Stripe-first browser specimens

这是现有设计任务的可运行浏览器样例，不是新 UI 框架，不是 Figma 图层导入器。
它消费真实 `packages/ui/dist` 中的 Svelte 组件及 `app.css`，不复制 Stripe/Park 的图层、品牌或字体，不重新引入 Tailwind，不修改生产组件，不注册 Surface 权限。

## 四个视图

组件状态页展示 Button 子集、Input 的默认/已有内容/禁用/只读/错误/文件以及 Badge 和语义状态。
客户列表覆盖正常、加载、首次无数据、筛选无结果、失败和无权限。详情覆盖正常、加载、局部失败、整体失败和无权限。设置覆盖正常、待保存、校验失败、保存中、保存成功、失败和只读。

场景控制器用于确定性展示，交互则真实运行 Svelte 绑定：搜索→查看→返回保留输入；重试保留筛选；切换主题/密度不清空搜索；失败保存保留表单；成功只有一处短暂反馈，三秒后清除；异步模拟在导航/销毁后取消。

所有记录为固定合成数据。创建按钮只显示预览说明，保存操作只修改内存。无生产请求、真实账户或邮件。权限开关只验证表现，不代替后端鉴权。密度仅传给本身支持该 API 的表格、筛选和详情组件，不声称全站密度已统一。

## 运行

```sh
bun install --frozen-lockfile
bun run --cwd packages/ai-elements build
bun run --cwd packages/ui build
node design/stripe-first/preview/run.mjs
```

浏览 `http://127.0.0.1:4179`。使用 `--build-only` 仅生成静态构建。

```sh
node --test design/stripe-first/preview/model.test.mjs
node node_modules/svelte-check/bin/svelte-check --tsconfig design/stripe-first/preview/tsconfig.json --fail-on-warnings
bunx playwright install --with-deps chromium
node design/stripe-first/preview/verify.mjs
node design/stripe-first/preview/keyboard.mjs
```

专项工作流输出 `test-results/stripe-first-browser/`：可运行静态站点 `site/`、截图浏览 `index.html`、逐场景 `report.json`、键盘与媒体偏好结果 `keyboard.json`、截图及源文件哈希。解压 artifact 后，可用 `python3 -m http.server 4179 --directory site` 预览，无需为消费端安装 Panda/Tailwind。不要直接用 file:// 打开 ES 模块入口。

预定矩阵为 19 场景 × 两种主题 × 两种语言 × 两种视口（1440/390px）=152项；另有四组交互序列和两组键盘/媒体偏好检查。结果只有实际工作流成功后才算通过。构建失败、只生成截图或此前 PR 的绿灯都不能替代本次结果。

## 明确的无障碍适配

表格在窄屏时保留横向滚动，不伪装成按钮或重写 grid。具名 `role=region`、`tabindex=0` 和可见焦点让键盘用户能够滚动。Svelte 的单点静态提示例外附有原因；没有关闭全局告警。`keyboard.mjs` 检查 Tab 进入、方向键实际滚动、Tab 离开、Enter 打开详情及新的主内容焦点。

依据：[MDN region / scrolling content](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/region_role#scrolling_content_areas_with_overflow_text)。样例只保留一个滚动所有者，不让内部包装器吞掉键盘滚动。

首次真实浏览器矩阵中147项及四组交互通过，但五个列表加载场景的截图不稳定。原先把无限骨架脉冲缩短为0.01ms，并不能停止无限动画。因此交付样式 `motion.css` 在用户选择减少动态效果时停止骨架脉冲，保留占位与 `aria-busy`；普通模式继续动画。这不是截图注入或遮罩，不增加截图差异阈值。两种用户媒体偏好都有真实浏览器断言。

## 与 Figma 分开验收

2026-09-19 本轮复查 `get_metadata(6:4)` 仍返回 Starter MCP 限额，未绕过限额读写。`figma-map.json` 与原有节点保持不变，Input、Badge 和三类页面的 Figma 状态仍为 pending。这里的浏览器样例不能当作 Figma 已同步、与 Figma 像素一致、完整产品交互或 WCAG 合规证据。

下一次恢复 Figma 时，用这些真实组件样例作实现参照，先读取现有文件并核对 source.json；不要重建同名文件，不要覆盖未审查的主题差异。
