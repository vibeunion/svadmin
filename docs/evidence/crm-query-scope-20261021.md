# CRM 查询作用域与反馈归属

## 任务约定

- 日期：2026-10-21；基线 HEAD：`51ce56238061ede8a3ee3e882f6799a5d896440c`，
  包含本线程未提交改动，不是该提交的发布验收。
- parent：`ENTERPRISE_PRODUCT_SYSTEM.md` 的查询错误归属规则。
- source：用户要求继续完善企业级规范；reason：CRM 隐藏资源查询及商机
  统计/列表的重复反馈尚未遵循当前规范。
- 目标：CRM 只请求当前工作区需要的资源；当前资源的失败由
  `WorkspaceQueryState` 内联承接，隐藏资源失败不弹出无上下文通知。
- 非目标：不改 CRM 写入、权限、字段、路由协议或其他业务页。
- Delegation Decision：medium、managed；主线程单写入者，一名只读 verifier。

## 规则

| CRM 视图 | 允许请求 | 失败反馈 |
| --- | --- | --- |
| 客户账户 | `crm_accounts` | 当前列表内联错误和重试 |
| 联系人 | `crm_contacts` | 当前列表内联错误和重试 |
| 商机（含 reports/dashboard） | `crm_deals` | 列表独占加载/失败反馈，成功后显示统计 |
| 跟进、待跟进、跟进记录 | `crm_activities` | 当前列表内联错误和重试 |
| 其他 CRM 资源的 reports/dashboard | 当前资源和 `crm_deals` | 列表与统计各自反馈，仅重试失败范围 |

未进入当前视图的资源不应因为预加载失败打扰用户，也不应被静默请求后
留下无恢复入口。

## 验收

```gherkin
Given 用户打开客户账户
When 商机数据源不可用
Then 只请求客户账户，客户列表可用且没有通知

Given 用户打开商机
When 商机数据源可用
Then 请求商机并显示其列表

Given 当前 CRM 列表读取失败
When 页面显示错误
Then 由列表内联错误提供重试，不显示默认查询通知
```

## 验证

`example/test/pm-business-pages.test.ts`：50/50，退出码 0。覆盖四类资源的
失败/再次失败/恢复、10 种资源/视图组合、无关资源隔离、商机单一加载态、
reports/dashboard 统计局部失败、同组件 hash 切换和账户记录保留。执行目录为
`example`，命令：

```sh
node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/pm-business-pages.test.ts
```

未进行全量测试、浏览器验收、真实服务联调、提交或部署。
未知 `resourceName` 的默认账户回退只有静态核对，同组件 `view` 切换测试不等于
`resourceName` prop 动态替换；这些边界未外推为已验收。
一名只读 verifier 确认不匹配 tasks/notes 导致隐藏请求的问题已关闭，无新增
阻断；独立复核未运行测试。随后邮件用例加入同一测试文件后的 59/59 结果见
`mail-query-feedback-20261021.md`，不改变本文 CRM 的证明范围。
