# SVAdmin 五项目标验收矩阵

## 任务边界

- 日期：2026-10-21。
- 来源：用户要求继续完善后台界面，承接已合并的 #525、#529 和认证页面工作。
- 目标：把后台密度/间距/折叠节奏、页面级骨架、认证品牌、键盘/错误/焦点/响应式行为、视觉与无障碍契约收口为可追溯证据。
- 非目标：npm 发布、生产部署、真实身份服务验收、业务后端重构、把受控 fixture 结果包装成线上验收。

## 总矩阵

下表是证据索引，不是“所有界面缺陷清零”声明。尺寸、页面模式、筛选和通知设置沿用已归档的历史结果，本轮仅重跑认证相关与直接关联样式检查。#530 之后的登录控件增量证据见 [login-controls-20261021](./login-controls-20261021/README.md)。

| 目标 | 已落地能力 | 本轮或既有证据 | 结果与边界 |
| --- | --- | --- | --- |
| 1. 密度、间距、折叠节奏统一 | 尺寸迁移参考、紧凑态回归、折叠触发器节奏和焦点环 | [size-migration-reference](./size-migration-reference/README.md)、[ui-state-matrix.md](../ui-state-matrix.md) | Content 48/48、Native 6/6、Fallback 12/12；compact token `128 -> 96 -> 112 -> 128px`。证明本地源码和受控浏览器契约，不证明发布或部署。 |
| 2. 页面级骨架 | `AppShellPage`、`DataPanel`、页面模式和共享页面结构 | [page-patterns](./page-patterns/README.md)、`app-shell-page.test.svelte.ts`、`content/data-panel.test.svelte.ts` | 五类页面模式、主 landmark、跳过链接、侧栏抽屉和详情区域有组件契约。演示数据仅内存有效，不代表所有业务页已迁移。 |
| 3. 认证品牌定制 | `AuthPageShell.brandMark`、稳定宿主 hooks、默认品牌回退、长品牌折行、实例独立标题/说明 ID | [auth-page-shell](./auth-page-shell/README.md)、[auth.md](../auth.md) | 单测 6/6；浏览器 24/24，覆盖默认/自定义品牌和桌面/窄屏明暗主题。真实品牌资源与生产认证服务不在本轮范围。 |
| 4. 键盘、错误、焦点、响应式溢出 | 筛选清除后焦点恢复、错误恢复路径、认证输入错误关联、焦点环和横向溢出检查 | [filter-toolbar-focus](./filter-toolbar-focus/README.md)、[notification-settings-recovery](./notification-settings-recovery/README.md)、[auth-page-shell](./auth-page-shell/README.md)、[page-chrome-geometry](./page-chrome-geometry/README.md) | FilterToolbar 9/9；通知设置 15/15；认证浏览器矩阵无异常、无横向溢出。历史证据与本轮认证重跑分开记录。 |
| 5. 视觉结构与无障碍由测试锁定 | CSS 语义 token、页面状态矩阵、aria 关联、真实视口截图和 diff 检查 | `app-css.test.ts` 14/14、`component-color-tokens.test.ts` 4/4、`auth-page-shell.test.svelte.ts` 6/6、[ui-state-matrix.md](../ui-state-matrix.md) | 视觉结构、标题/说明关联、键盘顺序和错误 live region 有自动化契约。截图来自当前源码/受控 fixture，不等同线上接受。 |

## 证据分层

1. **本轮重跑**：认证壳 6/6、认证适配器契约 9/9、样式 14/14、颜色契约 4/4、认证浏览器 24/24、改动文件 ESLint 和 `git diff --check`。
2. **历史已合并能力**：#525、#529 及其证据目录，用于说明主线已有的页面骨架、尺寸与交互基础。
3. **未证明事项**：远端 CI 当前状态、npm 发布、部署结果、真实业务数据、真实认证/通知服务和所有下游消费者的视觉验收。

## 待处理事项

- #530 保留的密码重复标签、账号图标间距与显隐按钮 Tab 问题已在后续分支修复并整合 #532；组件 10/10、认证契约 9/9、Chromium 32/32、独立密码布局 WebKit 4/4，合并状态独立回读，见[登录控件证据](./login-controls-20261021/README.md)。
- 页面骨架的组件契约和历史样板证据不能替代每个消费项目的集成验收；本轮没有重跑全仓或全部页面。
- 不宣称通过完整 WCAG 审计、所有语言/浏览器组合或真实身份服务验证。

## 当前检查命令

```text
TMPDIR=/tmp bun run --cwd packages/ui test auth-page-shell.test.svelte.ts --maxWorkers=1
TMPDIR=/tmp bun run --cwd packages/ui test app-css.test.ts --maxWorkers=1
TMPDIR=/tmp bun run --cwd packages/ui test component-color-tokens.test.ts --maxWorkers=1
CHROMIUM_PATH=... AUTH_SHELL_EVIDENCE=docs/evidence/auth-page-shell node --test packages/ui/scripts/auth-page-shell.browser.test.mjs
git diff --check
```
