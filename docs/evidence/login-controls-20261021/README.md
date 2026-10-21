# 登录控件后续验收

## Task Contract

- parent: PR #530，基线 `78c7a7fd`。
- source: 用户“继续”，承接提交、push、PR 和合并 main 的授权。
- reason: #530 明确保留登录页重复标签、图标间距问题，密码显隐按钮还不支持 Tab。
- goal: 保持现有认证协议，修复登录控件视觉与键盘操作，并归档可复现证据。
- non-goals: 密码强度算法改写、认证后端、npm 发布、部署、其他业务页面重构。
- risk: medium，共享 PasswordInput 影响注册、重置和设置页。
- orchestration: managed；当前会话唯一写入者，Socrates 独立只读复核。
- scope: LoginPage、PasswordInput、相关 CSS、定向组件/浏览器测试、认证文档和证据。
- ownership: 仅修改当前隔离树；保留并行 `fix/password-input-layout-20261021` 和共享主树未提交内容。
- execution: locally-verified；整合并行 #532 后重新验证最终候选。

## 验收场景

1. Given 默认或自定义密码文案，When 打开 LoginPage，Then 只显示一个关联到密码框的标签，忘记密码操作保留。
2. Given 空值、输入值或显式明文状态，When 桌面/窄屏明暗主题渲染，Then 图标与文本区域分离、显隐按钮留在字段内，无横向溢出。
3. Given 密码输入框获得焦点，When Tab、Enter、Space、Shift+Tab，Then 显隐按钮可操作且不提交表单、不丢值，焦点可见。
4. Given disabled 或校验错误，When 操作控件或恢复可用状态，Then 禁用输入和按钮不可操作，错误关联保留并可清除。
5. Given 本地校验失败或受控服务拒绝，When 修正并重试，Then 错误反馈、焦点和认证调用契约不回归。

## 状态矩阵

| 范围 | 结果 |
| --- | --- |
| PasswordInput 默认/外置唯一标签、Tab/Shift+Tab、Enter/Space、禁用跳过与恢复、强度显示 | 单文件 5/5 |
| 真实认证页面与 Supabase/PocketBase 适配器契约 | 单文件 9/9 |
| app-css、component-color-tokens | 分别 14/14、4/4 |
| 默认/自定义品牌、LoginPage、带忘记密码入口的 LoginPage | Chromium 32/32；1440x900、1920x1080、390x844、320x640 × 明暗主题 |
| 空值、填入、明文状态的账号/密码图标与文字间距 | 真实元素边界与文本区域比较，间距至少 4px，按钮不超出字段 |
| 双向键盘顺序、焦点环、错误反馈与受控认证失败后重试 | 浏览器通过；错误保留当前输入焦点，不声称自动定位错误字段 |

使用源码 `app.css` 构建受控夹具；`browser-report.json` 保存源码 SHA-256。
截图来自本次浏览器运行；未覆盖 #530 历史目录。`git diff --check` 和改动文件 ESLint 通过。
没有运行全仓测试，也不代表生产身份服务或 npm 发布验收。

## 复现

```sh
TMPDIR=/tmp bun run --cwd packages/ui test password-input.test.svelte.ts --maxWorkers=1
TMPDIR=/tmp bun run --cwd packages/ui test auth-contract.test.svelte.ts --maxWorkers=1
AUTH_SHELL_EVIDENCE=docs/evidence/login-controls-20261021 node --test packages/ui/scripts/auth-page-shell.browser.test.mjs
git diff --check
```

## 远端边界

#530 已合并，但其 CI run `39531047653` 的 `Lint & Test` 失败在依赖安全审计
（follow-redirects、hono、vite），不是本轮 UI 单测失败。旧 `UI PR Evidence`
初次失败是正文缺少状态矩阵/已完成 diff 检查，正文已修正；重跑结果单独核实。
此处不把 mergeable 或已合并等同于 CI 全绿。依赖升级不混入本次 UI 修复。
