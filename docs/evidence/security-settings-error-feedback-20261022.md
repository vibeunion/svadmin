# Security Settings 错误反馈

## 续接约定

- parent: `api-settings-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: 安全设置读取、MFA、密码及会话撤销会把 Provider 原始诊断交给页面或通知。
- goal: 五条失败路径使用本地化通用提示，空异常也有反馈，保留密码本地校验、
  用户确认、失败保留和再次操作成功的契约。
- scope: SecuritySettings、builtin-safety-followup 单文件、本文与路线图。
- non-goals: 不修改 AuthProvider/SessionProvider 协议、真实 MFA 注册流程、
  服务端授权、凭据记录或其他安全页面；不提交、发布或部署。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. Given 安全读取失败，When 展示错误，Then 通用提示且无原诊断；重试恢复会话。
2. Given MFA 或会话撤销失败，When 显示通知，Then 完整通知载荷仅含通用文案，
   原状态保留，取消不写入，重新确认后可成功。
3. Given 密码输入无效，When 提交，Then 保留具体本地校验且不调用 Provider。
4. Given 密码异常、失败返回或空异常，When 提交失败，Then 通用反馈且保留输入；
   再次成功后清空三个密码输入，不改提交参数。

## 证据

- `bunx vitest run src/components/builtin-safety-followup.test.svelte.ts`：**27/27**。
- 新增密码三种失败恢复、单会话两种失败恢复；既有 MFA 与其他会话撤销用例保留
  取消、失败保持、成功恢复的行为断言，并改为严格通用通知载荷。
- 读取与密码远程错误保存为布尔标记，在模板中翻译。异常及失败返回的
  `error.message` 不再进入组件展示路径；本地密码校验仍提供具体原因。

## 边界

- 未执行浏览器、读屏、语言切换专项、真实 Auth/Session Provider 或发布构建。
- 未修改 MFA 的未知/不可用能力状态、并发保护或请求作用域模型，这些不由本次
  错误展示回归证明完成。宿主应在自己的 Provider 日志中保留诊断，本轮不新增
  日志或诊断回调。

## 浏览器续接验收（2026-10-22）

- parent: 本文本地安全设置错误反馈。
- source/reason: 用户继续；补齐 Security Settings 的真实页面交互与窄屏状态证据。
- scope: Security 专用 fixture、browser.spec.ts、专项配置及本文/计划；不修改
  AuthProvider、SessionProvider 或 MFA 协议。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.security-settings.config.ts`：
  **4/4 通过**，desktop 1440x1000 与 narrow 390x844。
- 密码场景验证：失败以内联通用文案展示，当前/新/确认密码均保留；成功重试
  后三项清空，Provider 原始诊断不出现。
- 会话场景验证：取消确认不调用 Provider；失败保留 Windows/Edge 会话并可
  再次确认，成功后只移除该会话，当前 Safari 会话仍保留。
- 读取场景验证：失败时不展示旧会话，只显示一个错误和 Retry；恢复后显示
  会话并清除错误。截图位于 `output/playwright/security-settings/`，包含
  password/revoke/read 的桌面与窄屏状态及恢复截图。
- 边界：本地 Auth/Session Provider stub，通知写入 fixture 状态区；不证明真实
  密码/MFA/会话服务、内置 Toast 外观、读屏、跨浏览器或消费者发布构建。

## 续接：MFA 未知状态边界（2026-10-22）

- 发现浏览器读取失败截图中 MFA 开关曾显示“disabled”，把未知状态误导为
  明确关闭，并可能允许用户操作。
- 修复为 `true | false | null` 三态：读取失败/读取中为未知文案并禁用开关；
  只有 Provider 明确返回后才显示启用或禁用文案并允许操作。
- 缺少 `getMfaState` 时同样保持未知，不把可选能力缺失解释为关闭；函数入口
  额外拒绝未知、读取失败、加载中和重复操作。
- 定向回归更新为 **27/27**；Security 浏览器专项重新执行为 **4/4**，并复核
  窄屏读取失败截图中的未知文案与禁用开关。真实 MFA Provider、读屏、跨浏览器
  和发布验收仍未关闭。
- 新增直接拒绝 `getMfaState` 后点击页面 Retry 的恢复用例；Provider/租户切换
  迟到回执、写入 pending 防重复和语言切换仍未在本轮直接覆盖。
