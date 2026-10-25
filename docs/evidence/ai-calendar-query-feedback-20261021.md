# AI 与日历查询反馈归属

## 任务约定

- 日期：2026-10-21；parent：`ENTERPRISE_PRODUCT_SYSTEM.md` 查询错误规则；
  source：用户“继续”；reason：AI 与日历已有内联错误和重试，但仍发送默认
  错误通知，AI 写入失败也会同时通知和展示页面提示。
- 主要任务：查询会话后继续本地分析，失败保留问题与历史；读取日程并可原地重试。
- 目标：每次失败由一个反馈区域承接；AI 不在会话列表不可用时误建或误改会话。
- 非目标：不改视觉体系、资源 Schema、AI 收藏读取策略，不接外部模型，
  不改变本地演示的只读查询语义，不提交、推送或部署。
- 写入范围：`AiWorkspacePage.svelte`、`CalendarWorkspacePage.svelte`、
  `pm-business-pages.test.ts` 与 `BusinessPmHarness.svelte` 的助手注入入口、
  产品规范及本证据。
- Delegation Decision：medium / managed；主线程唯一写入者，
  一名只读 verifier，独立核查错误归属和失败恢复。
- 状态：本批本地实现与定向回归完成；真实模型、权限及发布验收未完成。

## 验收场景

```gherkin
Given 会话或日程读取失败
When 用户再次重试失败并随后恢复
Then 只有一个内联错误，原始错误不外露，仅重读当前资源且不修改业务记录

Given 会话列表仍在加载或读取失败且问题已输入
When 用户尝试发送
Then 保留问题、不调用助手或写入会话，恢复读取后可以继续

Given 本地助手返回结果但新建或更新会话失败
When 用户检查列表后重试发送
Then 问题保留、原历史不变，失败仅在页面显示，恢复后只写入目标会话

Given 用户确认清理本地会话
When 删除失败或用户随后重试成功
Then 失败保留原历史及收藏，成功才清理记录，不产生重复错误通知

Given AI 模板或运行信息视图不使用会话列表
When 用户进入或切换到这些视图
Then 不因隐藏的会话查询产生无归属错误，返回会话视图后恢复读取
```

## 验证

- `bun run --cwd example test -- test/pm-business-pages.test.ts`：
  AI/日历收尾时为 124/124；Dashboard 增补后 10:44 再跑为 145/145，退出 0。
  总数还包含其他业务页面，不将其全部视为 AI/日历测试。
- `packages/core` 中执行
  `bunx vitest run --config vitest.config.ts src/mutation-feedback.test.svelte.ts`：
  29/29，包括定向类型检查、24 个通知矩阵场景和 4 个批量部分失败场景。
  该验证完成后三个 Hook 未再修改；不使用无 test script 的
  `bun run --cwd packages/core test` 充当测试证据。
- `bun run --cwd example check`：0 errors / 0 warnings。
- 只读 verifier Ampere 已完成本批复核，无未处理阻断项。
- 浏览器实际注入 AI 列表读取失败：一个内联错误、发送禁用、输入保留，
  重试恢复；临时破坏的演示数据库 JSON 已恢复。
  证据：`output/playwright/ai-query-error-20261021.png`。
- 视觉走查采用 `ai-workspace-desktop-stable-20261021.png`、
  `ai-workspace-mobile-stable-20261021.png`、
  `calendar-mobile-stable-20261021.png`，均位于 `output/playwright/`。
  初次布局过渡期截图不计入验收；日历错误恢复由行为测试证明，
  不把 ready 截图说成浏览器错误注入。
- 核心验证存在非阻断的 source map/localStorage 工具警告；
  不代表外部模型、真实权限、真实服务或发布验收。

## 前置能力补充约定

- parent：本任务；source：用户连续完善授权与当前 API 核查；
  reason：严格 `useCreate`、`useUpdateMany`、`useDeleteMany` 仅接受
  resource/enabled/overtimeOptions，不支持上一轮交接建议的通知关闭配置。
- 写入范围增补：三个 Hook 的 options 与 notify 分支，以及单一
  `mutation-feedback.test.svelte.ts` 与其必要 fixture。
- 只增加 `successNotification?: false` / `errorNotification?: false`；
  未设置时保持原通知。关闭通知不跳过错误抛出、认证处理、审计、缓存刷新、
  live 发布或调用方回调，不扩展其他写入 API。
- 风险与编排保持 medium / managed，同一只读 verifier 核查。
- 验收：三个 Hook 分别覆盖默认通知、只关错误、只关成功、全部关闭，
  自定义 NotificationProvider 与内置 Toast 均验证，失败仍抛出、成功仍刷新。

## 复核后恢复边界

- parent：本任务；source：只读 verifier 的已确认问题；
  reason：清理历史原本忽略收藏持久化失败并宣称全部成功。
- 在原页面写入范围内区分“历史删除失败”和“历史已删但旧收藏清理失败”。
  收藏重试只保存当前收藏状态，不再次删除历史；后续新收藏不会被旧重试清空。
- 最终回归包含该恢复边界：历史已删但收藏保存失败明确提示部分完成，
  重试只持久化当前收藏，不重复删除，也不覆盖后续新增收藏。
  最终计数见上方验证，先前 120/120 与 24/24 不作为最终完整结果。
