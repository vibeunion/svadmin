# Notification Settings 错误反馈

## 续接约定

- parent: `security-settings-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: 通知偏好 Provider 的读取/保存异常会把原始诊断直接渲染到页面。
- goal: 读取失败使用通用错误和重试，保存失败使用通用反馈；保留本地开关状态、
  重试和再次保存成功，不改变偏好 Provider 协议。
- scope: `NotificationsSettings.svelte`、builtin PM 回归和本文。
- non-goals: 不改变通知投递、偏好 schema、Provider 日志或发送协议。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收与证据

1. Given 读取异常含私有诊断，Then 只显示通用错误，不显示空配置；重试恢复真实
   偏好。
2. Given 保存异常含私有诊断，Then 只显示通用失败反馈，开关状态保留；再次保存
   成功。
3. `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：**18/18**。
   覆盖私有诊断、空 Error 和非 Error 的读取/保存失败及成功恢复；读取失败
   无开关、保存禁用，保存失败保留草稿，不额外读取。
4. 首轮两条既有测试期望原 Provider 诊断而失败，已改为通用文案及 HTML
   不包含诊断，保留其参数、次数、单告警和状态保持断言。
5. Bohr 只读复核未发现新增 P0/P1/P2 阻断；`git diff --check` 通过。

## 续接：局部语言切换验证

- parent: 本文错误反馈修复；source: 用户继续；reason: 补齐已标记未覆盖的局部
  语言切换证据。scope: builtin-pm-repairs 单文件、本文与路线图；不改生产组件。
- risk/orchestration: low / managed；主线程唯一 writer，新增测试由单文件确定性
  回归验证，并交由 Bohr 只读复核测试断言。
- 复用 `renderWithI18n` / `TestI18nScopeHost`，未新增重复测试宿主。
- Given 读取失败，When 英文→中文→英文，Then 通用错误随语言变化，保存仍禁用，
  `load` 始终一次。
- Given 编辑后保存失败，When 英文→中文→英文，Then 通用错误随语言变化，
  同一开关 DOM 和编辑值保持不变，load/save 均一次；再次保存成功后错误消失，
  第二次 save 携带原编辑草稿，load 仍一次。
- `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：**20/20**，
  两条新增用例均通过；`git diff --check` 通过。

## 边界

- 未覆盖真实通知存储、浏览器、读屏和消费者发布构建；语言切换仅覆盖局部错误态
  scope，不外推为全局国际化验收。
- 错误保存为布尔状态，模板翻译；不新增诊断回调，宿主日志不受此次改动影响。

## 浏览器续接验收（2026-10-22）

- parent: 本文局部语言切换验证。
- source/reason: 用户继续；补齐 Notifications Settings 的页面加载、保存失败和
  草稿恢复证据。
- scope: 通知专用 fixture、browser.spec.ts、专项配置及本文/计划；不改通知
  Provider 协议或投递服务。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.notifications.config.ts`：
  **2/2 通过**，desktop 1440x1000 与 narrow 390x844。
- 读取失败时只有一个错误和 Retry，保存按钮禁用、开关不渲染；恢复后按邮件分区
  修改 `Security Alerts`，保存失败保留草稿且不泄漏诊断，成功重试后断言完整
  `NotificationPreferences` 载荷。
- 截图位于 `output/playwright/notifications/`，生成桌面/窄屏读取失败、
  保存失败和恢复态。已人工检查 `narrow-save-failed.png`，错误文案、开关与
  分区无明显遮挡；不将全页截图等同于全部键盘与读屏验收。
- 首轮测试因邮件/推送存在同名 `Security Alerts` 产生严格定位冲突，已改为
  按 `Email Notifications` 分区定位后重跑通过。
- 独立复核发现 fixture 初始值与组件默认值相同，已将 Provider 返回的
  `sms.security` 改为 `false` 并在恢复后断言短信开关和完整保存载荷，重新执行
  2/2 通过；读取结果不再可能被默认值伪造。
- 边界：本地 Provider stub 与 Chromium；不证明真实通知存储、通知投递、
  内置 Toast 外观、读屏、跨浏览器或消费者发布构建。
