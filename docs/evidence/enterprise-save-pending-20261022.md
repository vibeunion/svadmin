# 企业设置保存并发门禁

- parent: `settings-enterprise-error-feedback-20261022.md`
- source: 用户持续目标；reason: 两个保存函数只有 DOM disabled，缺少函数层忙碌门禁。
- goal: 同一保存操作在请求完成前最多一个在途请求；不同保存区保持独立。
- scope: SettingsEnterprisePage、enterprise-providers 单文件测试、本文与总计划。
- non-goals: 不修改 Provider 协议、服务端幂等、权限、布局或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. Given 有效策略和组织草稿，When 同一同步事件栈重复触发两个保存入口，
   Then 各自只调用一次 Provider，两个保存区可独立执行。
2. Given 两个保存请求未完成，When 策略请求成功或失败，
   Then 只解锁策略区，组织保存仍保持忙碌，不产生重复写入。
3. Given 保存失败，When 再次保存，Then 保留草稿并发送正确载荷；
   成功后采用 Provider 回执，按钮和输入恢复相应状态。

## 实施与验证

- `SettingsEnterprisePage.saveSettings` 入口增加 `saving` 门禁；
  `saveOrganization` 入口增加 `savingOrganization` 门禁。
- 新增两个参数化场景，先以未修复实现回放确认重复策略写入会使断言失败，
  修复后重新通过，证明测试捕获的是函数层并发而非单纯按钮 disabled。
- `bunx vitest run src/components/enterprise-providers.test.svelte.ts`：
  **30/30**。
- `bunx playwright test --config=./playwright.enterprise-settings.config.ts`：
  **4/4**（Chromium 桌面/窄屏），覆盖原有企业连接测试和读取/保存恢复。
- `git diff --check` 通过。
- Bohr 只读复核确认无 P0/P1/P2 阻断；同一事件栈的重复调用断言和独立解锁
  断言覆盖本轮函数门禁，不以 DOM disabled 代替。
- 重建 UI 包退出 0，读取 `packages/ui/dist/components/account/SettingsEnterprisePage.svelte`
  确认两处 guard 已进入产物。仍有既有 `import.meta.env` 打包兼容警告。
- `bun run --cwd example check` 退出 0，Svelte 检查 0 errors/0 warnings。
- 随后 `bun run build:example` 退出 0（10740 modules），通过 manifest 定位
  `assets/SettingsEnterprisePage-DKOZo0LG.js`，检查两个保存调用前均读取各自
  busy 状态且同步置为 true。产物 SHA-256：
  `a48514cb8c9f4ffb139008661e89de3781ae30ba7b820131957871fa8d6a871f`。
  KaTeX/大 chunk 警告仍存在；上一轮 64/64 跨浏览器结果不作为新 guard 的证明。

仍未覆盖真实 Provider 的服务端幂等、跨标签页并发、读屏和发布验收；
本地 fixture/单测通过不关闭整体企业规范目标。
