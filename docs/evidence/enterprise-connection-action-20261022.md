# 企业身份源测试操作契约

## 续接约定

- parent: `settings-enterprise-error-feedback-20261022.md`。
- source/reason: 用户要求继续完成企业级规范；身份源卡片的 Connect/Manage
  文案与实际测试行为不符，卡片可绕过顶部测试按钮的处理中状态。
- goal: 身份源测试命名准确，同页仅允许一个测试请求在途，恢复后可显式重试。
- scope: SettingsEnterprisePage、IntegrationCard 的可选动作配置、
  enterprise-providers 单文件测试及本证据；不改变 Provider 协议或连接状态。
- non-goals: 不实现连接/解绑/管理流程，不新增自动重试，不扩大授权模型。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 企业设置展示已连接或未连接身份源
When 用户选择卡片上的 Test
Then 仅测试对应身份源，不把测试描述为连接或管理

Given 任一身份源测试尚未完成
When 用户再次激活顶部按钮或其他卡片
Then 入口禁用且函数守卫保证只发出一个测试请求

Given 测试失败
When 用户再次测试
Then 保留原有安全反馈，入口恢复并允许一次新请求

Given Provider 已替换且新测试正在进行
When 旧测试迟到成功或失败
Then 不通知新上下文，也不解除新测试的处理中状态
```

## 验证状态

- `packages/ui` 定向回归
  `bunx vitest run src/components/enterprise-providers.test.svelte.ts`：
  **28/28 通过**，覆盖入口命名、同步事件栈并发门禁、失败恢复和 Provider
  替换后的迟到回执。
- `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.enterprise-settings.config.ts`：
  **2/2 通过**，desktop 1440x1000 与 narrow 390x844。检查顶部和卡片入口
  的禁用状态、失败恢复、重新测试目标与无 `pageerror`。
- 人工检查
  `output/playwright/enterprise-settings/desktop-pending.png` 与
  `output/playwright/enterprise-settings/narrow-pending.png`：测试中的
  `Testing...` 与卡片 `Test` 均不可重复触发；窄屏内容未出现操作遮挡。
- 边界：fixture 使用本地 stub Provider，完成回调只模拟 Provider 回执；
  不证明真实连接建立、身份源持久化、服务端并发控制、读屏、跨浏览器或
  消费者发布。
