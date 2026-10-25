# 待办页查询反馈归属

## 续接约定

- 日期：2026-10-21；基线 HEAD：`51ce56238061ede8a3ee3e882f6799a5d896440c`，
  包含本线程已有未提交改动，不代表该提交的发布验收。
- parent：`ENTERPRISE_PRODUCT_SYSTEM.md` 的查询错误归属规则及
  `infinite-list-recovery/README.md` 的上一组验收。
- source：用户要求继续完善企业级规范。
- reason：待办页已有 `WorkspaceQueryState` 内联错误和重试，查询仍会发送
  默认全局通知，同一个失败会重复反馈。
- 目标：待办页只保留一个查询失败反馈面，支持失败、再次失败和恢复。
- 非目标：不改待办写入、权限、筛选、布局、其他业务页、依赖或发布。
- 写入范围：`TodoWorkspacePage.svelte`、既有
  `pm-business-pages.test.ts`、产品规范适用范围及本证据。
- Delegation Decision：低风险，adaptive 缺少完整运行时能力证据，解析为
  managed；主线程单写入者，复用一名只读 verifier，不增加实现分工。

## 验收

```gherkin
Given 待办查询失败
When 页面显示错误
Then 只有一个内联错误和重试入口且不产生默认通知

Given 待办查询失败
When 用户重试后再次失败
Then 仍可重试且不显示空看板或原始服务错误

Given 待办查询已可用
When 用户再次重试
Then 恢复实际任务且只新增一次读取而不写入任务
```

## 验证状态

直接相关的 `example/test/pm-business-pages.test.ts`：31/31，退出码 0。
本次改动后的测试仍覆盖原有 Domain、Operations、AutoTable 场景，以及新增
Todo 失败、再次失败、恢复、无通知和无任务更新断言。
`git diff --check`：通过。不运行全量测试；不提交、推送、合并、发布或部署。

执行目录为 `example`，命令为：

```sh
node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/pm-business-pages.test.ts
```

一名只读 verifier 复核后无阻断问题；独立复核未执行测试，以上退出状态来自
主线程。本用例监测注入的 NotificationProvider，未单独覆盖无 Provider 时的
内置 Toast 队列；本次未做待办页浏览器、真实服务或完整应用验收。
