# 内置安全与导出补充验证

日期：2026-09-21。工作树：`/private/tmp/svadmin-tailwind-openui`。

## 范围

承接 [builtin-remediation.md](./builtin-remediation.md) 尚未逐项验证的 Webhook 删除、关闭 MFA、撤销其他会话取消/失败，以及下载实际内容、复制失败反馈。managed 分工由本任务独占 UI 安全设置与相关测试；不修改 Breadcrumbs、router、core 或 example。

本轮使用 fake provider 与受控浏览器 API 做确定性组件验证，不需要外部账户。**按主任务要求没有 build，dist 未更新，集成构建由主任务统一执行。** 没有提交、部署、生产写入或全仓测试。

## 复查与真实缺陷

复查了 ApiSettings、SecuritySettings、ConfirmDialog、既有 enterprise-providers 测试及其 host、MemberDirectory、TwoFactorAuthPage、export-reference、SecurityLogPage、TeamCrewTablePage。

1. **MFA 取消确认后错误显示关闭。** 原调用通过 `checked` 与 `onCheckedChange` 连接 Switch；底层 Switch 会先修改自身 bindable 状态，但取消操作没有改变父组件的真实 MFA 状态，导致开关仍显示关闭。新测试先复现该失败。修复仅在 SecuritySettings 使用 getter/setter 受控绑定，界面读取已确认的 `is2faEnabled`，请求 setter 走现有确认/provider 流程。取消、provider 拒绝均保持开启；重试成功后才关闭。不修改共享 Switch。
2. **API 密钥复制失败没有可见反馈。** 原 catch 仅将 copied 设为 false。修复为持续可见的 `role="alert"`，提示手动保存；复制开始清除旧状态，provider 重载或生成新密钥时清除旧错误。异步复制结果按 requestId 和密钥快照检查，避免旧 provider 的复制请求回写当前页面。
3. Webhook/其他会话取消和失败路径、成员链接/恢复码复制失败、示例导出过滤逻辑在新增验证中符合合同，未为这些路径额外改业务行为。

## 直接单文件回归

执行：

```sh
bun run --cwd packages/ui test src/components/builtin-safety-followup.test.svelte.ts
```

最后一次结果：**1 个文件，9/9 通过，退出码 0**。

| 场景 | 验证断言 |
| --- | --- |
| Webhook 删除 | 取消零 provider 写入；失败返回错误通知且记录保留；再次确认成功后才移除；总写入两次 |
| 关闭 MFA | 初始开启；取消零写入且开关保持开启；provider 抛错后开启状态不变并通知失败；重试成功才关闭 |
| 撤销其他会话 | 取消零写入；失败后其他会话仍在；重试成功移除其他会话，当前会话保留 |
| API 密钥复制 | 剪贴板拒绝后出现明确错误与手动保存提示 |
| 成员邀请链接复制 | 剪贴板拒绝后出现 Copy failed，不显示 Link copied |
| MFA 恢复码复制 | 剪贴板拒绝后提示手动保存恢复码，不显示 Copied |
| 复制期间 provider 切换 | 旧复制请求失败不显示旧错误，旧密钥也不残留 |
| 安全日志 JSON 导出 | 实际 Blob 为 application/json；解析内容严格等于当前过滤的事件；文件名正确；无匹配导出 []；对象 URL 回收 |
| 团队 JSON 导出 | 搜索 Sarah 后实际 Blob 仅含其完整记录；文件名正确；无匹配导出 []；对象 URL 回收 |

首次运行 5/7 通过，MFA 开关取消状态失败证实实现缺陷；另一个失败为测试使用了错误的按钮文案，修正为现有 `Sign Out Other Devices`。修复后 7/7 通过，再追加恢复码复制和旧请求隔离，最后 9/9 通过。

首轮失败期间出现一次 `derived_inert` 警告；最后 9 项通过的运行未出现该警告。不将局部运行没有警告解释为共享生命周期问题已关闭；Breadcrumbs/router/core 相关诊断仍归主任务。

## 改动文件

- `packages/ui/src/components/ApiSettings.svelte`：复制失败反馈和异步作用域保护。
- `packages/ui/src/components/SecuritySettings.svelte`：MFA 开关受控绑定。
- `packages/ui/src/components/builtin-safety-followup.test.svelte.ts`：新增直接单文件回归。
- `docs/evaluations/example-pm-audit-2026-09-21/builtin-followup.md`：本报告。

没有修改导出实现、成员目录、2FA 登记组件、共享确认弹窗、翻译、路由或依赖清单。

## 未验证边界与集成交接

- 本轮未 build；主任务需统一构建后再验收实际 example/dist。
- fake provider 证明 UI 取消零写入、失败保留和真实返回驱动状态，不证明真实服务授权、邮件发送、安全策略或生产会话撤销。
- 导出测试捕获实际创建的 Blob 与下载锚点调用，证明内容和文件名；未验收操作系统下载目录中的最终文件。
- 剪贴板失败用受控拒绝模拟，未操作真实系统剪贴板权限。
- 本次只验证指定组件范围，不替代全仓类型检查或全路由浏览器扫描。
