# 认证页面字段身份隔离

## 续接约定

- parent: `profile-and-mfa-error-feedback-20261022.md`。
- source/reason: 用户继续完善企业级规范；Profile、Security、MFA 页面存在固定
  输入 ID，多实例时可能造成标签、焦点和自动填充归属错误。
- goal: 认证页面的字段 ID、label `for`、焦点和提交回调按实例隔离。
- scope: ProfilePage、SecuritySettings、TwoFactorAuthPage、定向单测、enterprise-ui
  双实例 fixture/browser 场景及本文；不改 Provider 协议。
- non-goals: 不证明浏览器密码管理器、读屏软件或真实认证服务行为。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。

## 验收结果

- `bunx vitest run src/components/auth-field-identity.test.svelte.ts`：
  **3/3 通过**。覆盖 Profile、Security、MFA 两实例的标签关联、焦点、
  自动填充属性和正确 Provider 回调。
- `bunx playwright test --config=./playwright.auth-identity.config.ts`：
  **6/6 通过**，desktop 1440x1000 与 narrow 390x844；每个页面类型各一条
  双实例场景。
- 固定 ID 已改为实例 ID 前缀：Profile 编辑/密码字段、Security 密码字段、
  MFA 验证码字段。公开字段名称、`autocomplete` 和 Provider 参数保持不变。
- 截图位于 `output/playwright/auth-field-identity/`；人工检查窄屏第二实例的
  长标签与输入控件无重叠，点击第二实例标签不会聚焦第一实例。

## 边界

未验收真实密码管理器、读屏、跨浏览器和消费者发布包；旧页面若依赖固定 DOM ID
应迁移到标签或公开语义选择器，不把旧固定 ID 视为公开 API。
