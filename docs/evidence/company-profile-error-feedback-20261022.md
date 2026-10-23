# Company Profile 错误反馈

## 续接约定

- parent: `member-directory-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: 组织资料读取/保存失败会直接展示 OrganizationProvider 原始异常。
- goal: 读取失败使用通用错误和重试，保存失败使用通用错误并保留编辑值；
  再次保存恢复，保持 OrganizationProvider 参数和成功状态。
- scope: CompanyProfilePage、builtin-pm-repairs 单文件及本文。
- non-goals: 不修改 OrganizationProvider 协议、组织权限、审计或 SettingsEnterprisePage
  的复合页面状态。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收与边界

1. Given 读取/保存异常为诊断、空 Error 或非 Error，Then 不显示原文。
2. Given 读取失败，Then 不显示空组织资料；重试恢复表单。
3. Given 保存失败，Then 保留输入；再次保存成功并显示成功状态。
4. `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：**29/29**。
   覆盖诊断、空 Error、非 Error 的读取/保存失败；读取重试恢复表单，保存失败
   保留编辑值，再次提交成功且调用次数/结果保持。
5. Bohr 只读复核无已确认 P0/P1/P2 阻断；建议的成功后告警消失、第二次保存
   精确参数断言已补齐并再次通过 **29/29**；读取失败也断言不显示空组织资料。
6. `git diff --check` 通过。

## 续接证据：字段身份与浏览器恢复

- parent: 本文上一轮错误反馈；source: 用户“继续”；reason: 固定字段 ID 与缺少浏览器证据。
- scope: CompanyProfilePage、既有 builtin PM 测试、enterprise-ui 的组织资料 fixture/
  路由/浏览器用例/专用配置，以及本文和总计划。其余语义和 Provider 协议保持不变。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。
- `CompanyProfilePage` 使用 `$props.id()` 为组织名称 label/input 生成实例级 ID，
  避免同页多实例时 label 指向错误输入框。
- builtin PM 单文件现为 **33/33**：新增双实例 label focus、ID 唯一、草稿隔离和
  Provider 写入隔离断言；原有错误恢复断言保持。
- `bunx playwright test --config=./playwright.company-profile.config.ts`：**4/4**，
  Chromium 桌面/窄屏均通过。覆盖读取失败不误报空态、Retry 恢复真实组织名、保存
  失败保留草稿、第二次保存提交精确草稿并显示成功状态，以及双实例输入/写入隔离。
- 已检查 `output/playwright/company-profile/desktop-save-failed.png` 和
  `output/playwright/company-profile/narrow-save-failed.png`：窄版内容区
  内错误提示位于表单下方，输入值和 Save 操作仍可见，无溢出或遮挡。
- `git diff --check` 通过。

仍未覆盖真实组织 Provider、读屏、语言切换和发布构建；浏览器证据使用本地 fixture，
不等同于已发布消费者包或生产验收。
