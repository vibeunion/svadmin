# 安全设置密码提交门禁

- parent: `security-settings-error-feedback-20261022.md`
- source: 用户持续目标；reason: 密码提交仅依赖按钮 disabled，函数缺少忙碌判断。
- scope: SecuritySettings 密码提交流程、builtin-safety-followup 单文件、本文和总计划。
- non-goals: 不修改密码策略、AuthProvider 协议、MFA、会话撤销或服务端幂等。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验收

1. Given 有效密码草稿，When 同步重复提交且请求未完成，Then Provider 只写一次。
2. Given 请求抛错或返回失败，When 再次提交，Then 保留三项输入、再次发送原草稿；
   成功后清空并解锁。
3. Given 旧请求未完成，When 替换身份 Provider 并启动新请求，
   Then 旧成功/失败不能改写新草稿、错误、通知或忙碌标记。

## 验证

- 实现仅在 `handlePasswordChange` 的 `preventDefault()` 后新增
  `if (changingPassword) return`，不改变验证、参数、回执判断和提示归属。
- 首先运行新增测试：31 通过、5 失败，失败均为预期一次调用实际两次。
  修复后 `bunx vitest run src/components/builtin-safety-followup.test.svelte.ts`
  **36/36**，同时覆盖成功、抛错、失败结果和旧 Provider 成功/失败回执。
- `bunx playwright test --config=./playwright.security-settings.config.ts`
  **4/4**（Chromium 桌面/窄屏）。只覆盖既有读取/密码/会话恢复，
  不宣称该浏览器配置已覆盖新增同步重复提交及 Provider 切换场景。
- 同一 browser.spec 通过
  `bunx playwright test --config=./playwright.account-settings.cross-browser.config.ts --grep 'Security settings'`
  定向执行 **8/8**（WebKit/Firefox × 桌面/窄屏 × 两条恢复用例）。
  此结果仍是恢复流程非回归，不代替新的并发场景浏览器证明。
- Bohr 只读复核确认函数门禁、失败重试和旧回执隔离覆盖符合目标，无代码阻断；
  其指出的“验证结果待记录”文档状态已更新为本节实际结果。
- 本轮未重建 UI dist、示例或 registry 包；前轮构建与跨浏览器结果不视为
  本次新 guard 的产物验收。

真实服务端幂等、跨标签页、读屏、发布和整体企业规范仍未完成。
