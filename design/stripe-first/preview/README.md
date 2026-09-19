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
```

专项工作流输出 `test-results/stripe-first-browser/`：可运行静态站点 `site/`、截图浏览 `index.html`、逐场景 `report.json`、截图及源文件哈希。解压 artifact 后，可用 `python3 -m http.server 4179 --directory site` 预览，无需为消费端安装 Panda/Tailwind。不要直接用 file:// 打开 ES 模块入口。

预定矩阵为 19 场景 × 两种主题 × 两种语言 × 两种视口（1440/390px）= 152 项；另有四组交互序列。结果只有实际工作流成功后才算通过。构建失败、只生成截图或此前 PR 的绿灯都不能替代本次结果。

## 与 Figma 分开验收

2026-09-19 本轮复查 `get_metadata(6:4)` 仍返回 Starter MCP 限额，未绕过限额读写。`figma-map.json` 与原有节点保持不变，Input、Badge 和三类页面的 Figma 状态仍为 pending。这里的浏览器样例不能当作 Figma 已同步、与 Figma 像素一致、完整产品交互或 WCAG 合规证据。

下一次恢复 Figma 时，用这些真实组件样例作实现参照，先读取现有文件并核对 source.json；不要重建同名文件，不要覆盖未审查的主题差异。
