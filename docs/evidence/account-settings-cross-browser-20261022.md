# 账户与设置恢复场景跨浏览器证据

- parent: 各页面本地 Chromium 证据：
  `company-profile-error-feedback-20261022.md`、
  `member-directory-error-feedback-20261022.md`、
  `settings-enterprise-error-feedback-20261022.md`、
  `api-settings-error-feedback-20261022.md`、
  `security-settings-error-feedback-20261022.md`、
  `profile-and-mfa-error-feedback-20261022.md`、
  `notification-settings-error-feedback-20261022.md`
- command:
  `bunx playwright test --config=./playwright.account-settings.cross-browser.config.ts`
- scope: 本地 enterprise-ui fixture 的账户/设置错误恢复与字段身份场景
- source: 用户要求继续至原范围完成；reason: 原有恢复证据仅覆盖 Chromium。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不改产品源码、Provider、锁文件、发布或部署状态。

## 结果

- WebKit desktop/narrow、Firefox desktop/narrow 共 **64/64** 通过。
- 共 16 个既有用例乘 4 个浏览器/视口项目；覆盖读取失败重试、保存/邀请恢复、敏感草稿保留、
  MFA 状态和字段实例 ID/focus 隔离；API、Security、Profile/MFA、Notifications
  均在两个引擎和两个视口执行。
- 首次运行前使用项目当前 Playwright runner 安装匹配 WebKit 2336 与 Firefox 1538；
  不修改仓库依赖或锁文件。
- 本次 runner 为 Playwright 1.62.1；WebKit 26.5，Firefox 153.0。
- 初次配置使用带 `^` 的 grep 导致未匹配完整测试标题，退出 1；去掉错误锚点后
  实际执行 64 项并全部通过，不把无测试运行计为通过。
- 本矩阵使用受控 Provider fixture，不等同于真实服务端、权限、读屏软件、生产
  浏览器版本或发布 registry 包；本轮该矩阵自动生成截图，未逐张人工视觉检查，
  不将此前 Chromium 截图检查算作新引擎的视觉验收。
