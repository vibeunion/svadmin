# 邮件跨刷新一致性后续整改

日期：2026-09-21。承接 [business-remediation.md](business-remediation.md) 的 pendingMove / sentDraftId 局限。

## 当前状态

已读取 pm-spec。用户明确授权本 writer 独占修改 inMemoryDb 的邮件专属原子入口；原子入口、Mail UI替换和查询失效策略已实施。

本轮唯一 writer 范围为 MailWorkspacePage、inMemoryDb邮件入口、邮件专属helper、新单文件测试及本报告。不修改其他页面或共享包。

## JTBD 与边界

用户移动邮件或将草稿发送到本地 Sent 后，不需要记住中间状态；刷新、存储拒绝和重试不能导致重复邮件或源记录错误残留。

不接入真实邮件投递、不连接生产、不修改共享包、不全仓测试。保留既有写信、草稿、回复、转发、折叠恢复与未保存保护。

## 方案决策

当前 provider 的 create/delete 分别保存整库，getDb/saveDb 为私有方法。新增外部 helper 无法通过现有公开接口一次提交跨文件夹变化。

仅增加 localStorage 恢复日志不足以证明幂等：存在目标记录已经提交、恢复日志尚未提交的中断窗口。用正文匹配也不能区分内容相同的独立邮件。不采用这些方案冒充可靠恢复。

优先方案：在 inMemoryDb 中增加邮件专属原子入口，移动或发送均在一份数据库副本上完成目标新增和源删除，最终仅调用一次 saveDb。继承现有“存储失败不先提交 memory”的保证。页面移除两阶段 pendingMove/sentDraftId 状态，改为调用原子操作并刷新相关查询。

已实现 `moveLocalMail` / `sendLocalMail` 两个同步入口，不增加泛用事务框架。

实际文件：

- `example/src/pages/MailWorkspacePage.svelte`
- `example/src/providers/inMemoryDb.ts` 的邮件专属入口
- `example/src/providers/mail-operations.ts`
- `example/test/mail-atomic-operations.test.ts`（新单文件）
- 本报告

## 三条验收

```gherkin
Scenario: 移动成功后刷新没有重复或残留
  Given 收件箱存在一封邮件
  When 移动到归档并刷新页面
  Then 源记录消失且目标恰好增加一条
  And 不依赖组件内恢复标记

Scenario: 本地发送与草稿清理同时完成
  Given 用户正在编辑已保存草稿
  When 发送到本地Sent成功并刷新页面
  Then Sent恰好增加一条且原草稿消失
  And 未发生真实邮件投递

Scenario: 存储失败后刷新重试不会产生部分成功
  Given 浏览器存储拒绝邮件移动或发送的提交
  When 操作失败后刷新并重试
  Then 失败时源和目标均保持原样
  And 重试成功只产生一次目标写入
```

## 实施闭环

| 风险 | 实现 |
| --- | --- |
| pendingMove跨刷新丢失 | 移动在同步副本上删除源、增加目标，saveDb一次校验并提交。没有组件内pendingMove；失败不提交任何一边 |
| sentDraftId跨刷新丢失 | 从草稿发送在同一提交中新增Sent并删除草稿。没有后续清理阶段/清理按钮；重新用已删草稿ID发送会在保存前失败 |
| 保存拒绝先改memory | 保持原saveDb先storage.setItem成功再memory赋值；新入口复用该顺序 |
| 读取失败用旧memory覆盖存储 | getDb新增默认false的requireStorageRead开关；仅邮件原子入口传true。读取失败时拒绝邮件写入，其他CRUD行为不变 |
| 输入/整库无效 | TypeBox检查邮件输入；saveDb复用parseDemoDatabase整库schema校验；源不存在、同文件夹移动、非法收件地址、空主题/正文都在提交前失败 |
| 绕过授权或provider替换 | mail-operations检查当前provider必须是本地inMemory实例，无tenant，无其他资源provider；检查资源canCreate/canDelete、auth.check、认证session当前性、目标create和源delete权限；等待期间provider/auth/access/router/resources/mount变化则拒绝 |
| 提交后查询缓存陈旧 | useInvalidate使当前文件夹、Inbox、Archive、Draft、Sent的resourceAll失效；再读取当前和Inbox。隐藏文件夹再次进入时读取新状态，当前列表及Inbox未读数更新 |
| 刷新失败诱导重复发送 | 提交成功立即清空已发送编辑器并反馈成功；查询失败单独提示“写入已完成”并提供只读刷新按钮，不把已提交写入变为发送失败 |

原子范围是单一JavaScript执行环境中的同步整库副本操作及一次localStorage.setItem，**不是跨标签页并发事务、服务器事务或真实邮件投递**。localStorage不可用的非浏览器环境沿用内存示例模式，不承诺刷新持久化。没有额外操作日志或独立持久化键，因此不存在目标写入与恢复日志之间的提交间隙。

这关闭了旧 business-remediation 中邮件两阶段跨刷新恢复信息丢失的局限；其他页面边界不变。

## 验证命令与结果

已执行：

```sh
bun run --cwd example test test/mail-atomic-operations.test.ts
bunx svelte-check --tsconfig example/src/pages/tsconfig.pm-check.json
git diff --check -- example/src/pages/MailWorkspacePage.svelte example/src/providers/inMemoryDb.ts example/src/providers/mail-operations.ts example/test/mail-atomic-operations.test.ts
```

最终单文件验证 **15/15通过**（包含“写入成功、读取失败、只重试读取”）；页面专项检查 **0 errors/0 warnings**；diff检查通过。未构建共享包、未运行全仓测试。

本轮邮件代码冻结：**2026-09-21 15:38:16 Asia/Shanghai**。无提交；此时间之后只补文档与差异检查。

新单文件覆盖：移动单次保存与过期ID重试、草稿发送同时清理、新邮件无草稿、两类写入失败后storage/memory不变与重建调用方重试、无效输入/源不存在、读取失败不覆盖、目标create/源delete权限拒绝、其他provider、资源能力拒绝、未登录/宿主变化/卸载取消、页面移动重挂载、草稿失败重挂载后成功、提交成功后查询失败的只读恢复。

## 测试交接与剩余边界

- 主任务应更新旧综合文件 `example/test/pm-business-pages.test.ts` 中以下两条针对被删除的两阶段机制的测试，不应恢复旧实现以满足断言：
  - `retries a partial mail move without copying the destination twice`
  - `cleans up a sent draft after partial failure without sending it twice`
- 上述旧测试通过mock deleteMany失败来制造半完成状态；新原子入口不会调用deleteMany，也不会出现旧清理按钮。新单文件已用存储拒绝、单次setItem、重挂载和过期源ID断言替代。该综合文件不在本轮独占writer范围，未擅自修改，不宣称旧综合19项本轮仍全部通过。
- 七个mail_*页面需由主任务补验原子移动/发送、拒绝写入后刷新、未保存草稿保护。本writer用Svelte挂载/重挂载定向测试验证，不冒称本轮真实浏览器已通过。
- 多标签页并发写同一整库仍是现有localStorage示例的边界；本轮不升级数据库或提供跨标签锁，不作生产事务承诺。

## 独立复核追加：源身份与授权等待

独立复核指出15项首轮测试没有覆盖max+1复用ID、重复源ID及等待期间原地授权变化，因此首轮“拒绝过期ID重试”不能等同于已解决身份复用。本节补充修复，保留前述历史结果。

### 最小范围修复

- `resource-schemas.ts` 仅邮件schema新增可选 `mailRevision`，旧本地数据无需迁移，其他资源schema不变。
- `inMemoryDb.ts` 对邮件create/createMany/update/updateMany和原子移动/发送生成provider拥有的随机版本。即使调用方提供旧版本，也不能让新建/更新沿用它。非邮件ID与版本策略不变。
- `mail-source.ts` 对完整源记录生成固定键序指纹，包含版本而非仅trim后的正文。原子move必须提供expectedSource；从草稿send必须同时提供draftId与expectedSource。
- 提交在当前数据库副本中要求源ID恰好匹配一条，并比较完整指纹。缺失、多条同ID、版本或字段变化都在删除/新增/保存之前拒绝。
- `MailWorkspacePage.svelte` 从列表读取快照产生移动指纹；打开草稿时固定编辑基线，提交时不重新抓取新源来“校准”旧请求。成功保存草稿后，基线仅更新为该次保存返回的版本。
- `mail-operations.ts` 每次授权await返回以及最终提交之前重检全部相关资源能力，而非只比较resources数组身份；认证会话revision继续受captureAuthSession保护，另外重新auth.check并对比getIdentity的id/email，防止同一auth对象直接退出或换身份却绕过对象引用检查。
- 完整数据校验仍复用saveDb；拒绝重复ID仅针对当前邮件源，不扩展为全库迁移/唯一性重构。

### 增补验收

```gherkin
Scenario: ID复用不能把新草稿当成旧草稿
  Given 已发送草稿2且新建相同内容的草稿再次得到ID2
  When 重放旧源快照的发送请求
  Then 请求在提交前失败
  And 新草稿仍存在且Sent没有再次新增

Scenario: 重复源ID不能依次重复发送或移动
  Given 当前源文件夹中存在两条相同ID记录
  When 连续尝试使用该ID发送或移动
  Then 每次请求均拒绝且两边都不改变

Scenario: 授权等待期间身份或权限改变
  Given 请求正在等待创建或删除权限检查
  When 同一auth对象切换身份或退出，或资源原地将canDelete改为false
  Then 恢复后的请求不提交任何邮件变化
```

新增回归覆盖草稿2删除后原样重建且ID仍为2、重复草稿ID两次发送、重复收件ID移动、授权期间源内容更新、同auth对象身份变化/退出、最后权限检查期间canDelete原地撤销，以及UI草稿已打开后被同ID新草稿替换。

主任务已将原综合文件两条旧断言更新为atomic断言并报告19/19；本writer未改该综合文件。前述测试交接已由主任务处理，不再列为待同步。

追加轮最终证据：

- `bun run --cwd example test test/mail-atomic-operations.test.ts`：**23/23通过**。
- `bunx svelte-check --tsconfig example/src/pages/tsconfig.pm-check.json`：**0 errors / 0 warnings**。
- 目标文件 `git diff --check`：通过。
- 无build、无全仓测试、无提交。
- 本轮更新冻结时间：**2026-09-21 15:57:31 Asia/Shanghai**；取代15:38:16首轮冻结时间。
- 真实浏览器补验仍交主任务，特别是保存草稿后发送、源被另一视图替换后的拒绝与输入保留。UI挂载回归不冒称浏览器全流程验收。
