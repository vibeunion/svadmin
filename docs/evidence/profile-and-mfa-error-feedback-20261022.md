# Profile 与 MFA 错误反馈

## 续接约定

- parent: `settings-enterprise-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: 共享 ProfilePage 和 MFA 登记页仍直接展示 Auth/Enrollment Provider
  原始异常，影响多个账户设置入口。
- goal: 统一身份读取、资料保存、密码更新、头像上传、MFA 登记/验证失败反馈，
  保留草稿、同文件重试、作用域隔离和敏感数据边界。
- scope: `ProfilePage.svelte`、`TwoFactorAuthPage.svelte` 及两组现有定向测试。
- non-goals: 不修改 AuthProvider/MfaEnrollmentProvider 协议，不处理头像存储
  取消/回收，不宣称真实身份服务、浏览器或读屏验收完成。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

### 头像与读取续接

- parent: 本文上一轮资料/密码与 MFA 反馈；source: 用户要求继续直至全部完成。
- reason: 头像上传未捕获拒绝、失败回执静默，身份查询失败时资料区空白。
- scope: ProfilePage 头像与读取分支、profile-auth-scope 单文件；沿用 medium /
  managed 与唯一 writer，协议和真实服务验收仍不在此局部闭环内。

## 验收结果

1. Profile 资料保存的 throw、空 Error、非 Error 和 `success:false` 均显示
   `common.operationFailed`，不泄露诊断；失败后保留名称并可再次保存。
2. Profile 密码更新的 Provider 失败均脱敏；失败保留密码草稿，再次成功后
   清空敏感字段。
3. MFA begin/verify 的诊断、空 Error、非 Error 均脱敏；失败后仍可重试，
   验证码草稿保留，恢复码不会在成功前展示。
4. 头像上传的异常和 `success:false` 均脱敏；上传处理中阻止重复请求，清空
   原生文件值后同一文件可再次选择；作用域切换后的迟到失败不污染新页面。
5. 身份读取失败不显示空资料区，显示通用错误并可通过 Retry 恢复。
6. 原有租户/Provider 代际隔离、非法验证码本地校验和成功通知保持不变。

## 定向验证

- `bunx vitest run src/components/profile-auth-scope.test.svelte.ts`：
  **14/14 通过**。
- `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：
  上一轮 **32/32 通过**；本次头像/读取续接未修改 MFA，也未重复运行该文件。
- `git diff --check`：通过。
- Bohr 只读复核：无新增 P0/P1/P2 阻断。

此前真实 Auth/MFA Provider、浏览器、读屏、
跨浏览器、语言切换和消费者发布验收仍未关闭。本轮没有提交、推送、发布或部署。

## 浏览器续接验收（2026-10-22）

- parent: 本文 Profile/MFA 本地错误反馈。
- source/reason: 用户继续；补齐资料、密码和 MFA 登记流程的实际页面证据。
- scope: Profile/MFA 专用 fixture、browser.spec.ts、专项配置及本文/计划；
  不修改 AuthProvider、MfaEnrollmentProvider 协议或真实安全服务。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.profile-mfa.config.ts`：
  **4/4 通过**，desktop 1440x1000 与 narrow 390x844。
- Profile 验证资料保存失败保留姓名草稿并可成功更新；密码失败保留当前、
  新密码和确认值，成功后全部清空，诊断不泄露。
- MFA 验证登记失败可重试；验证码验证失败保留验证码，恢复码在成功前不出现；
  成功后只显示返回的恢复码。
- 已检查窄屏失败截图：
  `output/playwright/profile-mfa/narrow-profile-failed.png`、
  `narrow-password-failed.png`、`narrow-verify-failed.png`，长标题、
  错误文案和输入控件未相互遮挡；同时生成桌面和 Profile 恢复截图。
  后续 MFA 成功态只做 DOM 断言，不再生成恢复码截图；旧本地截图仅含合成值。
- 独立只读复核建议已补齐完整密钥/恢复码否定断言及单一 alert，
  fixture 校验验证码和密码参数；姓名通过保存后重新读取的值验证。
  调用次数和并发并非本轮浏览器覆盖项。
- 边界：本地 Auth/MFA stub 与 Chromium；不证明真实身份服务、恢复码持久化、
  剪贴板、读屏、跨浏览器、语言切换或消费者发布构建。
