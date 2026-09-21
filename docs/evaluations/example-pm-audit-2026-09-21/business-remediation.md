# 根 Example 业务页面整改闭环

日期：2026-09-21。对应原审计：[business.md](business.md)。

状态：页面代码整改及定向测试完成。本文保留 writer 交接时的验证边界；主任务随后完成 Mail、Case 关键流程、手机重点复拍及最终 check/build，追加结果见 [整改执行记录](remediation.md)。不是生产业务全项验收通过。

业务页面代码冻结于 **2026-09-21 14:37:53（Asia/Shanghai）**。本报告补写不改变该冻结时间。无提交、发布、部署或全仓测试。

## 范围与证据

- 本 writer 修改 `example/src/pages/**`、直接相关的 example 测试。本报告新增在用户要求的 docs 目录。
- Office、资源注册及共用 CRUD 能力、UI ShowPage、provider 存储失败修复和认证示例由主任务或其他 writer 负责，不冒领。
- 使用 `pm-spec`：优先恢复主任务和可验证操作，隔离加载/空/错误状态，减少嵌套卡片及低价值摘要。
- 浏览器证据仅认本 worktree 的 **5190**。5173 旧 Vite 缓存和5174其他 worktree 的截图均排除。
- 本地路径均以 `/private/tmp/svadmin-tailwind-openui` 为工作目录。下表文件相对 `example/src/pages/`。

## 移动端统计明确结论

**Calendar、Todo 已修；CRM 同类问题也已修。**

| 页面 | 当前源码位置 | 改动与证据 |
| --- | --- | --- |
| Calendar | `CalendarWorkspacePage.svelte:98` | 从三个竖排 MetricBlock 改为 `dl.grid.grid-cols-3`，无卡片摘要约70px高。390×844人工查看确认月份、切月按钮、星期栏和当月空态进入首屏 |
| Todo | `TodoWorkspacePage.svelte:147` | 同样改为紧凑三列，展示进度、高优先级、完成数；不再以长优先级分布撑高首屏。冻结后手机首屏交主任务复拍 |
| CRM | `CrmDashboardPage.svelte:74` | 金额、加权预测、最大机会改三列摘要，长值允许换行；冻结后手机首屏交主任务复拍 |

Calendar 证据：`output/playwright/pm-business-fix/calendar-compact-mobile-5190.png`。此前未压缩摘要的截图不能替代这一冻结后证据。

## 逐项审计闭环

“已修/已测”只覆盖该行明确列出的行为；没有以零 pageerror 替代内容或交互验收。

| 原审计问题 / 文件 | 已实现闭环 | 验收结果 / 剩余边界 |
| --- | --- | --- |
| Todo P1：状态仅页内、新建空动作、看板不遵循筛选；P2：窄列挤压 | `TodoWorkspacePage.svelte` 调用 provider 更新 status/completed；新建进入 create；主看板使用筛选集合；采用本地当天；列宽和动作区重排、辅助区折叠、手机统计压缩；请求失败不显示为空 | 专项验证完成后重挂载、新建、日期/完成筛选、查询失败、存储拒绝；主任务 CLI 另确认完成后刷新持久化及 completed 正确。手机最终截图由主任务收口 |
| Calendar P1：星期错位、新建无效、手机无法切月；P2：固定日期/下一项/周月口径 | `CalendarWorkspacePage.svelte` 使用星期一偏移与实际当前月，下一项只取未来未完成项；create与议程详情可达；月统计正确；加载/空/错误恢复；标题及切月适配手机、选中日期内部去嵌套边框 | 偏移日期纯函数已测；5190手机切月已操作；冻结后紧凑首屏已人工查看。历史样例数据落在6月，当前9月为空不属于加载失败 |
| AI P1：固定回复冒充分析、新会话依赖已有记录、模板等空动作 | `AiWorkspacePage.svelte` 从 context.chatProvider 获取实际结果；空会话可新建并保存摘要；模板填问题、收藏、复制、运行信息和有确认的清理历史均有动作；三态可恢复 | 专项验证真实 provider 回复建档及取消/确认清理；主任务 CLI 验证新会话实际 read-only MCP 返回2条低库存。当前 provider 只读样例数据、无外部模型；完整 transcript 仅页会话存在 |
| Mail P1：编辑/保存/发送/归档无动作；P2：未读计数与目录误导 | `MailWorkspacePage.svelte` 七文件夹、独立 Inbox 未读、搜索/未读筛选；本地草稿和 Sent、回复/转发、归档/恢复、标已读；按目录显示标题；错误保留内容 | 保存/发送/归档已测；不投递真实邮件。旧 Mail 无效分类链接不再引导到不匹配的通知视图，未虚构标签数据 |
| Mail 追加：收起丢稿、离开无保护、部分成功重复操作 | 收起后“继续编辑”保留内容；新建替换草稿会确认；beforeEach、页面链接及 beforeunload 保护未保存修改；发送成功后清理草稿失败提供独立清理操作；当前页移动重试只删除源记录 | 专项覆盖收起恢复、取消文件夹离开、存储失败、移动二阶段失败不重复复制、发送后清理不重发。主任务接手浏览器 Mail。pendingMove 非持久化事务，离开/刷新前和失败提示明确警告跨重挂载不要再移动，应检查目标后清理源记录 |
| CRM P1：缺记录操作、最高机会/阶段比例错误；P2：虚构备注及重复内容 | `CrmDashboardPage.svelte` 四家族 CRUD入口、搜索、实际完成跟进；最大机会排序、比例真实、备注来自 outcome；保留 tasks/notes/reports；手机统计压缩 | 页面类型与业务测试环境通过；各 CRM 视图完整浏览器交互未穷尽。不宣称真实客户消息投递 |
| 房产 P1：主操作/收藏无效、视图不筛选、今日混入所有预约 | `RealEstateWorkspacePage.svelte` 四家族记录入口；文本/市场/类型/状态/价格筛选；session 收藏及失败反馈；今日预约按当天计数；区域分布替代虚构坐标地图 | 已实现、待主任务浏览器关键筛选复验。schema 缺租售委托和坐标，明确以挂牌/空置条件展示，不宣称真实地图或完整租售业务模型 |
| Dashboard P1：样本充总量、历史叫今日；P2：错误范围污染与百分比 | `Dashboard.svelte` 汇总与3条预览分离；销售/出入库记录不再称今日；指标及辅助查询独立状态；库存占比有总量分母；show链接通过统一 helper 回到原上下文 | 口径已修，主任务全路由扫描提供页面加载证据。辅助查询所有组合故障及动态 Surface 导入失败重试未形成穷尽专项，不宣称所有异常路径全覆盖 |
| Domain P1：无关查询失败阻断；P2：记录动作隐藏、完成项目消失 | `DomainWorkspacePage.svelte` 按家族启用依赖；主/关联查询分离、重试/空态；记录详情/编辑目录；已完成项目保留；通知已读、模板/邀请码复制、会话撤销反馈；records URL同步 | 专项验证 warehouse 不受 supplier 失败和已完成项目可见；旧通知 direct/support/feedback 不声称真实分类。跨家族所有动作浏览器验证未穷尽 |
| Operations P1：主要队列无处理入口、查询失败扩散 | `OperationsWorkspacePage.svelte` 详情/编辑入口、主/关联错误隔离、重试/空态、records URL同步；reorder_rules 启用必需仓库查询，purchase/sales 不依赖无关仓库 | 补货仓库解析和销售隔离失败用例通过；泛型编辑是记录维护，不是库存过账或真实审批命令 |
| UserManagement P1：权限效果丢失、完整记录不继承角色筛选；P2：虚构日期/范围错乱 | `UserManagementPage.svelte` 摘要保留 allow/review/deny；完整记录继承角色筛选；AI/Mail设置按范围；移除拼接加入日期；账号状态和实际日志时间；状态与记录入口；团队信息折叠、去内部卡片边框 | 原4项用户目录操作/筛选通过；新增角色权限效果专项通过。没有据此声称全部权限身份组合验证完成 |
| Case P1：无证据可完成、阶段绕过、不可篡改声明不实 | `CaseWorkspacePage.svelte`、`case-workspace.svelte.ts` 强制接受/执行记录/图片+倍率前置；改记录使后续完成失效；明确页内模拟审签/交付与活动列表。`case-actions.ts` 沿用并调用受保护状态方法 | `case-actions.test.ts` 4/4，主任务接手浏览器门禁。同步本地案例不调用持久化 provider，不能声称刷新保存、真实签名或不可篡改。存储失败用例覆盖真实调用 provider 的 Todo/Mail |
| DesignPrinciples P2：重置不清搜索、筛选假动作、静态Pass | `DesignPrinciplesPage.svelte` reset清查询/筛选；高级筛选实际改变结果和计数；完成入口有效；静态Pass改待核验；保留组件展示 | 原专项1/1。主任务确认002复扫正常；首次冷启动空截图不能推导页面永久空白，不因该报告另改页面 |
| 详情返回上下文 P2 | `WorkspaceRecordLinks.svelte`、`workspace-links.ts` 统一编码当前完整路由/query为 returnTo，拒绝外部返回目标；Dashboard复用helper | helper专项通过。UI ShowPage 接受returnTo/返回策略由其他writer负责；不为各页面散落拼接相同逻辑 |
| 共用状态/日期/收藏 | `WorkspaceQueryState.svelte`、`workspace-policy.ts`、`workspace-session.ts` 提供加载/空/失败重试、本地日期和任务视图判断、收藏读取及保存失败反馈 | 对应消费用例覆盖；不改UI包、office或全局CSS |
| 纯工作区CRUD、Office、共享表单/ShowPage | 不在本writer所有权内，交主任务及相应writer | 不因页面测试通过而替其签收；以各自整改报告为准 |

## 验收场景

```gherkin
Scenario: 任务成功和失败都反映真实持久化结果
  Given 工作区存在未完成任务
  When 完成任务后刷新并进入 completed
  Then 任务仍为已完成且看板仅展示符合筛选的记录
  And 若存储拒绝则显示失败且不伪造完成

Scenario: 草稿收起和取消离开不会丢失内容
  Given 用户输入尚未保存的邮件
  When 收起后继续编辑或取消切换文件夹
  Then 原收件人主题正文保持不变
  And 保存失败保留输入且不显示成功

Scenario: 部分成功不会造成重复发送或复制
  Given 目标邮件写入成功但源记录删除失败
  When 在当前页面重试清理
  Then 只删除源记录而不再次创建目标
  And 跨刷新操作的限制明确显示

Scenario: 手机日历优先显示主任务
  Given 390x844视口和一个月视图
  When 页面加载完成
  Then 紧凑摘要与月份切换进入首屏且不重叠
  And 2026年7月1日按星期三排列

Scenario: 案件完成必须有证据且不冒充真实审计
  Given 案件尚无执行记录和本地证据
  When 尝试推进执行证据或报告阶段
  Then 未满足前置条件不能完成对应门禁
  And 页面说明演示数据及签署不具备生产持久化或不可篡改保证
```

## 检查命令与结果

在本worktree根目录运行；均为当前页面直接相关的单文件测试，不是全仓套件。

| 命令 | 最终已观察结果 |
| --- | --- |
| `bun run --cwd example test test/pm-business-pages.test.ts` | 19/19；冻结时最后一轮通过 |
| `bun run --cwd example test test/case-actions.test.ts` | 4/4 |
| `bun run --cwd example test test/user-management-page.test.ts` | 4/4 |
| `bun run --cwd example test test/design-principles-page.test.svelte.ts` | 1/1 |
| `bunx svelte-check --tsconfig example/src/pages/tsconfig.pm-check.json` | 冻结后0 errors、0 warnings |
| `git diff --check -- example/src/pages example/test/pm-business-pages.test.ts example/test/fixtures/BusinessPmHarness.svelte example/test/case-actions.test.ts` | 通过 |

测试文件新增：`example/test/pm-business-pages.test.ts`、`example/test/fixtures/BusinessPmHarness.svelte`。更新：`example/test/case-actions.test.ts`。既有用户管理与设计原则测试不为绕过断言而删减。

主任务补充证据：5190全部337路由扫描结束0 pageerror/overflow；Todo刷新持久化/completed正确；AI新会话实际只读MCP低库存结果2条。主任务的存储provider 9/9、accountDemo 5/5及mockAuth移除外部头像依赖不计入本writer测试数。

## tsconfig.pm-check.json 的用途与必要性

文件：`example/src/pages/tsconfig.pm-check.json`。

- `extends: "../../tsconfig.json"` 指向 example/tsconfig.json，沿用相同编译规则，不通过放宽严格性消除错误。
- 将入口收窄到当前目录 Svelte 页面和日期/收藏 helper；被页面导入的其他 TS 文件仍会随依赖检查。排除该目录测试入口。
- 用于多人并行整改时快速反馈页面writer负责范围，不要求重复运行整个example检查。
- **不是应用运行或构建必需配置，也不是发布门禁。**不包含全部App、provider、测试夹具、路由组合；不能替代 `bun run --cwd example check`、真实浏览器和build。
- 本轮保留作可复现专项检查入口；长期是否保留可由主任务决定。删去该文件不改变业务行为，只失去报告中这条窄范围检查命令。主任务已接手最终example级检查，不以此配置声称整应用类型通过。

## 剩余局限与交接

1. 主任务接手 Mail、Case 浏览器关键流程，最终 full example check/build；页面writer不重复Todo/AI已通过的CLI行为。
2. 冻结后应补拍 Calendar/Todo/CRM 手机首屏；Calendar已有人工截图证据，Todo/CRM不能仅凭同样类名宣布视觉验收通过。
3. 移动邮件是两阶段本地操作，不是原子事务。当前页重试已防重复；pendingMove不跨重挂载保存，明确警告重新进入后检查目标、清理源记录。
4. AI无外部模型、邮件无真实投递、房产无真实地图、Case无生产存档/签署、Operations无实际过账引擎。核心本地可实现动作已实现，未用禁用来替代可修工作流。
5. 未穷尽多权限身份、所有组合故障、并发删除、收藏存储损坏及浏览器后退等场景；此报告不声称生产完备性。
6. 未挂载旧页面不是本轮路由修复成果；原审计中的死代码分类继续有效，未扩展清理无关文件。

主扫描启动后涉及实质补修的路由家族：七个 `mail_*`、`ai_conversations`、`reorder_rules`、`purchase_orders`、`sales_orders`、`calendar_events`、`todos`、四个 `crm_*`。DesignPrinciples冷启动空截图复查未触发新业务改动。
