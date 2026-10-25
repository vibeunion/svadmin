# Enterprise Settings 错误反馈

## 续接约定

- parent: `company-profile-error-feedback-20261022.md`；source: 用户继续。
- reason: 复合企业设置页仍直接展示 Provider 异常，空 Error 会跳过错误态。
- goal: 统一读取、策略保存、组织保存和身份源测试的失败反馈，保留重试与草稿。
- scope: SettingsEnterprisePage、enterprise-providers 单文件、common.test 中英文词条、
  本文及企业 UI 计划。
- non-goals: 不改 Provider 协议、权限、审计、页面布局、并发操作模型或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. Given 读取抛出诊断、空 Error 或非 Error，When 页面加载失败，Then 显示
   通用错误和重试，不显示空身份源或可编辑策略；重试成功恢复表单。
2. Given 策略或组织保存失败，When 用户仍需提交，Then 保留草稿，显示通用
   失败通知；再次保存成功，发送的参数与输入一致。
3. Given 身份源测试抛出异常或返回 success:false，When 收到失败回执，Then
   不展示原始诊断；操作恢复可用，再次测试成功显示成功通知。
4. Given 默认英文词典，When 打开企业设置，Then 连接测试按钮显示 Test，
   而不是 common.test；中文词典同步补齐“测试”。

## 验证结果

- 在 `packages/ui` 执行
  `bunx vitest run src/components/enterprise-providers.test.svelte.ts`：
  **25/25 通过**，本轮新增 14 个用例。
- 首次执行暴露缺失的 common.test 词条；尝试 defaultValue 回退无效后读取
  本地翻译实现，改为补齐中英文词典。最终用例严格匹配 Test。
- 保留已有策略正整数校验、Provider 参数、成功通知和请求代际判断。
- Bohr 只读复核：本轮 P2 已关闭，无新增 P0/P1/P2。
- 本轮未运行全量测试、包级类型检查、构建或浏览器测试。

真实 Provider、语言切换、读屏、跨浏览器和消费者发布验收未关闭。
本轮没有提交、推送、发布或部署，不能视为企业级规范整体完成。

## 续接：浏览器读取和保存恢复

- parent: 本文状态契约及 `enterprise-connection-action-20261022.md` 的浏览器入口；
  source: 用户继续完成原始范围；reason: 既有浏览器用例仅覆盖身份源测试。
- scope: 既有 EnterpriseSettingsFixture、browser.spec.ts、企业设置 scoped config
  及证据文档，不修改产品源码或 Provider 协议。
- risk/orchestration: medium / managed；主线程 writer，Bohr 只读 verifier。
- `bunx playwright test --config=./playwright.enterprise-settings.config.ts`：
  **4/4**，包含桌面/窄屏身份源测试和新增读取、策略保存、组织保存失败恢复。
- 读取失败不误报未配置身份源；重试恢复服务返回的组织名和策略数值。
  fixture 读取计数为 2，证明首轮失败后只执行一次 Retry 读取。
  保存失败保留草稿、隐藏诊断；成功提交完整策略载荷和精确组织名称，
  同时验证尝试次数，组织保存后按钮恢复为无变更禁用态。
- 已查看 `output/playwright/enterprise-settings/desktop-save-failed.png`。
  页面草稿与操作可见；通知由 fixture 的 status 出口展示，**不证明真实 Toast**
  的位置、可见时长或读屏播报。本地源码配既有构建 CSS 也不等于发布包验收。
- 并行运行时因共享 4189 端口失败，随后分别串行执行成功；失败运行不计为通过。

真实 Provider、读屏、跨浏览器、语言切换及发布验收继续保留。
