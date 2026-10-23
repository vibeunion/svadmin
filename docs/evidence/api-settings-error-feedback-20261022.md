# API Settings 错误反馈

## 续接约定

- parent: `task-queue-capabilities-20261022.md`；source: 用户继续完成企业级规范。
- reason: CredentialProvider 的诊断信息可能包含内部 URL、权限细节或服务端实现
  信息，页面和通知不应直接展示 Provider 异常文本。
- goal: API Settings 的读取、创建、撤销和删除失败统一展示本地化通用文案，
  同时保留成功状态、重试入口和 Provider 调用契约。
- scope: `ApiSettings.svelte`、现有安全回归、Enterprise Provider 测试和本文。
- non-goals: 不改变 CredentialProvider 类型、错误对象、审计日志或服务端响应。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收

1. Given 读取异常包含私有诊断，When API Settings 展示错误，Then 只显示通用
   本地化文案，不出现原始诊断。
2. Given 创建、撤销或删除异常包含私有诊断，When 通知用户，Then 通知只显示
   通用失败文案，不出现原始诊断。
3. Given Provider 后续恢复，When 重新加载或重试，Then 原有成功路径和数据更新
   仍然可用。

## 验证与边界

- `bunx vitest run src/components/builtin-safety-followup.test.svelte.ts`：**16/16**。
  覆盖两类读取失败恢复、两类创建失败恢复、撤销失败（异常/失败返回）恢复、
  Webhook 删除失败恢复。通知断言完整通用载荷，不只检查页面文本。
- `bunx vitest run src/components/enterprise-providers.test.svelte.ts`：**11/11**。
- Bohr 只读复核未发现已确认 P0/P1/P2 阻断；异常 getter 不被读取未做专项
  断言。`git diff --check` 通过。
- 读取错误保存为布尔状态，渲染时翻译；不读取异常 message，空 Error 也有反馈。
- `Promise.all` 读取状态的后续修复见下节，不再把清空的 Webhook 数组误报为空。
- 原失败通知透传已改变，Provider 返回和调用参数保持原样；宿主应在自己的
  Provider/日志层保留诊断。本轮不新增诊断回调。
- 首轮断言错用了 `Something went wrong`，修正为既有 `Operation failed` 后通过。
- 未执行真实浏览器、读屏、语言切换专项、真实 CredentialProvider、服务端审计
  或消费者发布构建；不声明整个 API 设置页达到完成标准。

## 续接：共享读取状态

- parent: 本文错误脱敏；source: 用户继续；reason: 同次读取失败时 Webhook
  区域仍显示成功空态。scope: ApiSettings 主内容状态、上述两份测试、本文和路线图；
  risk/orchestration: medium / managed，主线程 writer，Bohr 只读 verifier。
- 主内容区统一显示一个 loading/error DataState；成功后才渲染密钥和 Webhook
  两组，错误有且仅有一个重试入口。侧栏创建密钥和 Provider 协议保持原样。
- Given 初始请求未完成，Then 无成功空态和 Webhook 操作；When 请求失败，
  Then 一个告警和重试入口；When 重试，Then 重新显示 loading；When 成功，
  Then 按真实结果显示空态或记录。
- 定向安全回归 **18/18**，包含两种恢复结果与每路准确两次读取；
  Enterprise Provider 回归 **11/11**。多实例标签测试改为等待读取完成，
  保留全部八个标签的唯一性/关联及权限隔离检查。
- 中间尝试各区域独立 error 被单告警测试识别为重复反馈，已收敛为主内容区
  统一归属。未新增浏览器截图；布局与真实读屏仍未验收。

## 浏览器续接验收（2026-10-22）

- parent: 本文共享读取状态续接。
- source/reason: 用户继续；为 API Settings 的主内容错误态、创建和撤销恢复
  补齐真实浏览器证据。
- scope: API 专用 fixture、现有 browser.spec.ts、专项配置及本文/计划；
  本轮不修改生产组件、Provider 协议或读取失败期间的侧栏创建行为。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.api-settings.config.ts`：
  **4/4 通过**，desktop 1440x1000 与 narrow 390x844。
- 创建/撤销场景验证：失败时创建草稿和已有凭据仍保留，Provider 原始诊断不
  出现；再次创建成功展示一次性密钥，再次撤销成功移除记录。
- 读取场景验证：首屏失败只显示一个 `alert` 和一个 Retry，不显示空的
  Webhook 成功态或添加入口；Retry 成功后显示真实凭据并移除错误态。
- 截图位于 `output/playwright/api-settings/`：
  `desktop-create-failed.png`、`narrow-create-failed.png`、
  `desktop-revoke-failed.png`、`narrow-revoke-failed.png`、
  `desktop-read-failed.png`、`narrow-read-failed.png` 及恢复截图。
  人工检查确认窄屏表单字段、错误反馈和恢复入口没有互相遮挡。
- 边界：fixture 使用本地 CredentialProvider stub；不证明真实密钥/ Webhook
  存储、服务端审计、读屏、跨浏览器或消费者发布构建。
  创建/撤销通知由自定义 NotificationProvider 输出到 fixture 状态区，不证明
  内置 Toast 的布局、播报或通知去重。Webhook 创建/删除、复制密钥、加载中
  延迟和调用次数并非本轮浏览器覆盖项。
- 首次 fixture 在 Provider 读取中递增响应式计数，引起 effect 循环；
  修正为非响应式计数后重新执行。随后修正不属于 Playwright 的
  `getByDisplayValue` 查询和弹窗 Portal 定位，最终四项通过。

## 跨浏览器复验（2026-10-22）

- parent/source：`account-settings-cross-browser-20261022.md` 已有 64/64 矩阵；
  用户继续完成企业级规范。本次为既有场景复验，不是新增引擎或路径覆盖。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.account-settings.cross-browser.config.ts --grep 'API settings'`。
- WebKit desktop/narrow 与 Firefox desktop/narrow 共 **8/8** 通过。
- 覆盖创建/撤销失败时保留草稿和记录、恢复后成功更新，以及主内容读取失败
  的单一错误态/Retry 与恢复；截图由现有 fixture 生成。
- 仍未证明真实 CredentialProvider、内置 Toast 读屏播报、服务端审计、生产
  包发布或线上存储。

## 续接：创建并发门禁（2026-10-22）

- parent: 本文浏览器续接验收；source: 用户继续完成企业级规范。
- scope: 两个创建提交函数、既有安全回归单文件、本文和计划。
  non-goals: 不改变读取失败期间的创建行为、删除并发、Provider 协议或服务端幂等。
  risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读复核。
- 发现密钥与 Webhook 提交函数只依赖按钮的 `disabled` 渲染，没有函数层
  `submitting` 守卫；同一事件栈可以向 Provider 发出两次写入。
- 两个提交入口在调用 Provider 前共享同步门禁并保留原草稿有效性检查；
  处理中仍锁定两组表单，失败后保留草稿并允许一次重试。
- `builtin-safety-followup.test.svelte.ts` 新增密钥/Webhook 的成功和失败
  并发矩阵，验证同一入口只调用一次、另一表单不被误提交；最终定向回归
  **31/31**。移除守卫的回放确实稳定失败 4 项，恢复守卫后重新通过。
- 本轮没有新增浏览器场景；已有 API Settings 浏览器 **4/4** 仍覆盖失败
  恢复，不把单测并发结果外推成真实服务幂等。
