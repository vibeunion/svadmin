# Example 内置路由 PM 只读审计

日期：2026-09-21。工作区：`/private/tmp/svadmin-tailwind-openui`。
方法：已先读 `/Users/zhd/.codex/skills/pm-spec/SKILL.md`；基于真实路由、菜单、渲染分支、事件处理器和 Provider 接线审计。未修改业务代码，未运行测试或浏览器。首屏评价是源码信息架构判断，不是像素/可见区域验收。主代理负责浏览器巡检。

## 范围与判定

- JTBD：查看身份与协作关系、维护账户偏好和组织、管理成员与访问安全、恢复认证、识别错误并继续任务。
- 不做：重设计整个 example；将静态展示页强行升级为线上业务；把 demo 本地存储写入称作真实发送、计费或安全生效。
- 三态记法：E=空，L=加载，R=异常与重试。静态数据的 L/R 为不适用，但应清楚界定展示性质；LazyPage 的模块加载不是业务数据三态。
- 路由来源：`packages/ui/src/router-state.svelte.ts:5–60`；分派：`packages/ui/src/components/AdminApp.svelte:528–630`；example 菜单：`example/src/exampleMenuCatalog.ts:469–535`。
- Settings tab 来源：`packages/ui/src/components/SettingsPage.svelte:60–129`。默认 profile；api-keys→api、audit-logs→audit；未知 tab 无自定义 content 时回退 profile。
- example 接入 `inMemoryDataProvider`、`mockAuthProvider`，未传 SessionProvider/CredentialProvider/IdentityProvider/OrganizationProvider（`example/src/App.svelte:60–74`）。有 Provider 能力分支不等于 example 已接入真实服务。
- 账单/安全资源/邀请并非内置 UI 路由页面：`example/src/components/LazyResourcePage.svelte:61–67` 指向 `DomainWorkspacePage`。下表仍逐项覆盖这些 example 菜单入口，避免遗漏或误归属。

## 覆盖表 A：Public Profile

各 URL 为 hash 路由中的路径；表内明确列出变体，不以代表页替代。

| 路由 | JTBD / 首屏信息 | 动作与状态、反馈/风险 |
|---|---|---|
| `/public-profile` | 看个人作品；姓名、简介、项目数量 | 默认项目两栏；referenceDemoData；搜索空态有，L/R静态不适用；Connect 本地切换 |
| `/public-profile/projects/2-columns` | 人物背景+作品 | 六项切片、ProfileCard；切列链接真实，过滤空态有；未证明项目业务落点 |
| `/public-profile/projects/3-columns` | 扫描更多作品 | 项目网格不展示侧边人物卡；与两栏不仅密度不同，还改变可见项目集合 |
| `/public-profile/activity` | 看近期协作动态 | 三条硬编码活动，时间为英文相对文案；没有动态请求和故障恢复 |
| `/public-profile/teams` | 查看所属团队 | reference teams、统计、人物卡；过滤空态有，非组织成员数据 |
| `/public-profile/profiles/default` | 人物名片/履历 | Alex Chen 静态身份；Connect 仅本地；无持久结果 |
| `/public-profile/profiles/company` | 公司能力与规模 | Acme、员工/项目/团队统计；静态展示，不是当前组织资料 |
| `/public-profile/profiles/gamer` | 玩家身份/战绩 | ShadowFox、等级/段位/胜率；静态展示，不属于办公业务主链 |

证据：`PublicProfilePage.svelte:15–50`（目录 `packages/ui/src/components/profile/`）；`ProfileCard.svelte:63–70`；`ProjectsGrid.svelte:35–37`；`TeamsShowcase.svelte:16`。
参数兜底：`projects/:columns` 只要包含“3”即三栏，其余两栏；未知 `profiles/:variant` 回退 default（`AdminApp.svelte:570–577`）。不把无限参数值枚举为独立功能页面，主代理应补非法参数校验。

## 覆盖表 B：Account 专页及全部旧别名

| 路由（同一行均已追到同一组件） | JTBD / 首屏 | 动作、三态、反馈/危险确认 |
|---|---|---|
| `/account/home/get-started`；`/account/get-started` | 完成上手步骤；清单/进度 | 手动勾选、全部完成均本地；不是实际配置完成证明；无异步L/R |
| `/account/home/user-profile` | 修改个人信息；资料表单 | save 仅400ms延迟；无持久写入、字段失败或保存结果 |
| `/account/home/company-profile`；`/account/company-profile` | 维护公司资料；组织信息表单 | 同上；不同于有 Provider 的企业设置 |
| `/account/home/settings-plain`；`/account/settings-plain` | 简洁偏好设置 | save 仅400ms延迟；状态不跨页面持久 |
| `/account/home/settings-sidebar`；`/account/settings-sidebar` | 分组维护资料/登录/偏好/API | profile/signin/preferences/api 四子面板；开关本地；社交登录按钮无事件；API 无 Provider 时警示、不造假密钥 |
| `/account/home/settings-enterprise`；`/account/settings-enterprise` | 维护组织和身份策略 | 有真实 Provider 读写、加载/错误重试、保存失败反馈和能力禁用；example 未配置；不能当作企业策略已验收 |
| `/account/members/members-starter`；`/account/members-starter` | 邀请首位成员；零成员引导 | 打开邀请面板；本地追加邮箱并显示已邀请；下载模板无动作；没有邮件有效性/远端失败反馈 |
| `/account/members/team-members`；`/account/team-members` | 搜索成员并邀请 | 预置成员+本地过滤/追加；发送不校验合法邮箱；Copy无事件；本地“已邀请”误导 |
| `/account/members/import-members`；`/account/import-members` | CSV批量导入 | 拖拽/选择即模拟进度，随机成功数；选项没有传给导入器；error枚举不代表可达错误态 |
| `/account/security/security-log`；`/account/security-log` | 检索安全事件 | 静态 reference events、本地搜索；导出按钮无事件；无真实数据L/R |

对应目录：`packages/ui/src/components/account/`。具体证据见下文问题列表。

## 覆盖表 C：Settings 与 Account 通用 tab

每行两套路由都经过同一个 SettingsPage 对应组件；`/settings/account` 是菜单实际入口但回退 profile，不是独立“account”组件。

| 全部有效路径/别名 | JTBD / 首屏 | 动作与三态/反馈/危险确认 |
|---|---|---|
| `/settings`；`/settings/profile`；`/settings/account`；`/account/profile` | 维护当前登录身份；姓名/邮箱/头像 | ProfilePage 根据 updateProfile 能力控制保存/头像；mockAuth 无该能力；密码独立 mutation 有验证与反馈 |
| `/settings/appearance`；`/account/appearance` | 配置主题、语言、密度、分页 | 主题API及localStorage实际生效路径；属于本机偏好，不是远端账户保存；无远端L/R需求 |
| `/settings/notifications`；`/account/notifications` | 控制通知渠道和类别 | 开关仅$state，Save只success toast；无持久化、pending或error |
| `/settings/security`；`/account/security` | 改密码、管理MFA和会话 | 缺SessionProvider有警示；密码仍由mockAuth处理；有会话加载/错误/空态分支；接Provider后的撤销动作缺确认，见P2 |
| `/settings/roles`；`/account/roles` | 检查/维护角色权限 | authProvider能力，mock角色权限写localStorage；加载/错误存在；不要称为服务端授权生效 |
| `/settings/integrations`；`/account/integrations` | 查看/连接外部系统 | 默认状态“由宿主提供”；无callback不渲染开关，未伪造已连接；example未接真实集成 |
| `/settings/api`；`/settings/api-keys`；`/account/api`；`/account/api-keys` | 管理凭据/Webhook | 未配CredentialProvider，明确警示+禁用；实现有加载/错误重试/空态；Webhook删除直调缺确认 |
| `/settings/audit`；`/settings/audit-logs`；`/account/audit`；`/account/audit-logs` | 按页看审计记录 | mock日志静态分页；加载有；请求catch仅toast、未设error，失败可能呈空表/旧结果 |
| `/settings/about`；`/account/about` | 确认产品/版本和帮助 | 静态说明页；远端L/R不适用；外部链接可达性留浏览器验证 |

`/settings/:tab`、`/account/:tab` 未识别值回退 profile（`SettingsPage.svelte:110–115`），不意味着 billing、devices 等名字都有内置实现。`/account` 裸路径未注册专页，不能当成“账户首页”。

## 覆盖表 D：Network

| 路由 | JTBD / 首屏 | 动作/状态 |
|---|---|---|
| `/network/user-cards/nft`；`/network/user-cards` | 搜索/连接人员或创作者 | 实为六条固定NFT团队、标签和指标；connect数组本地切换；搜索空态有，L/R静态不适用；与办公团队网络心智不一致 |
| `/network/user-table/team-crew`；`/network/team-crew` | 按角色/部门找到协作者 | 六名固定成员+本地搜索；导出/邀请按钮无事件；不是account成员列表的同一数据源 |

证据：`network/UserCardsNFTPage.svelte:14–30`；`network/TeamCrewTablePage.svelte:16–35`。

## 覆盖表 E：Billing / Security / Referral（example资源页，非内置）

下列入口均到 `example/src/pages/DomainWorkspacePage.svelte`，真实执行 DataProvider hooks，但当前宿主为内存演示数据。通用管理表单不得被解释为支付、终止真实登录或下发网络策略。

| 路由 | JTBD / 首屏信息 | 动作、状态、危险确认 |
|---|---|---|
| `/billing_plans` | 比较套餐；价格/席位/状态 | 套餐卡+资源管理；不是支付checkout；共用L/错误壳，错误无retry |
| `/billing_invoices` | 看账单期间/支付状态 | 账单摘要+资源记录；无真实收款验收证据；共用状态问题 |
| `/billing_subscriptions` | 看套餐、续费、逾期风险 | 订阅组合视图；资源CRUD不等于真实订阅变更 |
| `/security_sessions` | 识别并撤销登录 | 有pendingSessionRevoke和ConfirmDialog、useUpdateMany；当前为内存记录状态，不是SessionProvider吊销 |
| `/security_devices` | 管理设备信任 | 设备资源读写，不是设备注册/注销服务；需区分列表记录和安全效果 |
| `/security_allowed_ips` | 维护网络准入规则 | IP资源读写，不是网关策略下发；需验证格式与锁死风险（本轮未验运行时） |
| `/referral_invites` | 追踪推荐邀请 | 邀请记录资源，不是邮件发送服务；发送/重发落点待主代理浏览器验证 |

以上资源还进入统一动态路由：`/<resource>/create`、`/<resource>/edit/:id`、`/<resource>/:id/edit`、`/<resource>/show/:id`、`/<resource>/:id`、`/<resource>/clone/:id`，由 AdminApp 通用 CRUD 分支及 example resourcePages 决定，不能误称新增内置账单/安全变体。本轮核对入口与域页，CRUD深层每字段校验和删除确认不虚称逐个运行验收。

## 覆盖表 F：认证和错误页

| 路由及别名 | JTBD / 首屏 | 状态、反馈与动作真实性 |
|---|---|---|
| `/login` | 获取访问；账号/密码 | required、提交pending、失败alert有；mock接受任意邮箱+demo密码；成功写localStorage；示例默认凭据明确 |
| `/register` | 创建账户 | 非空/密码一致、pending/error有；mock直接写登录态，不创建真实账户 |
| `/forgot-password` | 恢复访问 | 输入/提交/成功消息、pending/error有；mock只return success，不发信 |
| `/update-password` | 完成重置 | 密码一致校验、pending/error有；mock不存新密码，返回login；与登录仍用demo形成演示闭环缺口 |
| `/authentication/branded/2fa`；`/2fa` | 绑定并验证MFA | intro/scan/verify/recovery四步；任意六字符通过，固定恢复码；无服务端验证，不代表MFA启用 |
| `/authentication/error-404`；`/404` | 解释不存在并回到可用路径 | ErrorPage→SystemErrorState，独立SystemPageShell；错误即主状态，恢复按钮历史/首页行为留浏览器验证 |
| `/authentication/error-500`；`/500` | 故障解释与恢复 | 同上；展示500页不等于后端故障重试成功 |

公共系统路由和2FA权限分支见 `AdminApp.svelte:334–335, 460–510, 546–554`。未知资源的最终404回退不单独算明确菜单变体。

## 有证据问题（严重度按产品可信度/影响）

### P1：2FA 假验证可能使用户误以为安全配置完成

- `packages/ui/src/components/TwoFactorAuthPage.svelte:16–24`：纯本地enabled/step、固定recoveryCodes；verify只检查拼接长度6，未调用SessionProvider/AuthProvider。
- 风险：错误验证码也能进入恢复码步骤，安全承诺与实际状态脱节；这是页面功能完整性问题，不声称已经发生生产认证绕过。
- 建议：无验证能力时明确演示且不宣称已启用；有Provider时仅在验证成功后展示该次生成的恢复码，并处理pending/拒绝/重试。复制应await剪贴板结果，不能先报成功。

### P1：成员导入对任意文件随机宣布成功

- `packages/ui/src/components/account/ImportMembersPage.svelte:47–64`：不读取文件内容；setInterval模拟上传，随机20–69人后complete。`:17–24`选项仅局部状态。
- 风险：错误CSV、非CSV、更新/欢迎邮件选项都无法影响结果，用户无法知道实际完成了什么。
- 建议：明确只演示时禁用真实成功语义；或接解析/预览/确认/实际导入结果，逐行错误可下载，不以随机计数验收。

### P1：账户保存与通知“已保存”无实际存储

- `account/UserProfilePage.svelte:18`、`CompanyProfilePage.svelte:28`、`SettingsPlainPage.svelte:17`：save仅延迟400ms。
- `packages/ui/src/components/NotificationsSettings.svelte:11–14`：偏好在$state，save只弹成功通知。
- 风险：离开/刷新丢失，通知关闭并未真正关闭；与同站Provider驱动的ProfilePage形成冲突心智。
- 建议：统一接Provider或明确只读演示；保存成功必须以后端/明确本地持久写入结果为准；dirty、失败保留输入、重复提交禁用齐备。

### P2：邀请、复制、下载和导出存在空动作/误导成功

- `account/TeamMembersPage.svelte:20,26`：仅追加本地数组即显示invited；邮箱只判非空；Copy按钮无事件，邀请链接固定。
- `account/MembersStarterPage.svelte:17–21,46,61`：发送只更新本地数组；下载CSV无事件；文案“刚刚发送”。
- `account/SecurityLogPage.svelte:21`：Export无事件。
- `network/TeamCrewTablePage.svelte:34`：Export/Invite均无事件。
- `account/SettingsSidebarPage.svelte:45`：GitHub/Google按钮无事件。
- 建议：无能力禁用并说明；有能力须显示pending/error并据结果更新；静态展示可保留但不要冒充可操作生产流程。

### P2：审计日志请求失败未进入页面错误态

- `packages/ui/src/components/AuditLogViewer.svelte:55–64`：catch仅toast.error，未设置error；finally结束loading。
- 风险：临时toast消失后，用户可能把空表/上次页记录误解为当前审计结果。
- 建议：保留明确错误、重试与失败页码，旧数据标注过期；勿将失败当零记录。

### P2：账单/安全页被无关查询失败连带阻断且无显式重试

- `example/src/pages/DomainWorkspacePage.svelte:54–74`：每个域都请求products/categories/suppliers/users/plans，isLoading/hasError聚合全部。
- `:368–370`：错误DataState未提供retry。
- 风险：用户查看会话时，商品查询失败也使页面不可用，无法完成撤销任务。
- 建议：按域声明所需查询，错误定位到该部分并提供重试；会话操作不被无关库存数据阻断。

### P2（接入真实Provider后触发）：安全危险操作确认不一致

- `packages/ui/src/components/SecuritySettings.svelte:123–155`：撤销单会话/其他会话直接调用Provider；页面操作绑定无二次确认。
- `packages/ui/src/components/ApiSettings.svelte:133–145,194`：Webhook删除按钮直接调用deleteWebhook。
- 对照 `example/src/pages/DomainWorkspacePage.svelte:325–344,438–439` 已有会话撤销ConfirmDialog。
- 当前example无Session/CredentialProvider，因此不是当前可点击线上破坏；属于接入前必须补齐的高风险交互合同。
- 建议：确认具体对象、作用范围与不可逆影响；取消零写入；提交时禁用并有失败恢复，不用嵌套弹窗。

### P3：同一站点有多套身份/成员/安全事实，缺少展示与业务的边界

- `profile/PublicProfilePage.svelte:21–34`：Alex/Acme/ShadowFox与reference数据；`network/TeamCrewTablePage.svelte:16–23`另一套固定成员；`example/src/providers/mockAuth.ts:74–84`身份来自登录邮箱。
- 建议：用清楚的示例入口/只读模式表达展示用途；首屏优先“对象、状态、下一步”，不要让账户管理和样式展览共用同一业务承诺。不建议给每块卡片堆解释文字。

## 可保留的正确边界

- ApiSettings、SecuritySettings、SettingsEnterprisePage 在缺少对应Provider时有明确能力提示/禁用，不用假凭据填充；不是“功能故障”。
- IntegrationsSettings 在缺连接状态时显示由宿主提供，不展示可用连接开关（`:43–50`）。
- Appearance 的本地偏好是合理的本机任务；不能因为没有远端loading/error一概判缺陷。
- Public profile/NFT静态浏览没有网络状态并非天然错误；问题在可点击动作的承诺和账户业务入口混放。

## 五组 Gherkin 验收场景

```gherkin
Scenario Outline: 每个内置路由与别名呈现预期页面
  Given 已使用 example 演示账户登录
  When 打开覆盖表 A 至 F 中的一个明确路径
  Then 页面对象与表中 family/变体一致且没有意外回退 profile
  And 首屏主动作对应该页面任务
  And 无 Provider 的动作禁用并说明缺失能力
  # 表中全部路径作为数据集；认证/错误页另以未登录状态执行可达性用例
```

```gherkin
Scenario: MFA 拒绝无效验证码且不产生虚假安全成功
  Given MFA Provider 返回验证码无效
  When 提交六位验证码
  Then 页面停留在验证步骤并显示可重试错误
  And 不显示恢复码且不标记已启用
  When Provider 缺失
  Then 页面不提供会让用户误认真实启用的流程
```

```gherkin
Scenario: 保存偏好失败不丢输入也不宣称成功
  Given 通知偏好修改未保存且存储请求会失败
  When 点击保存
  Then 提交中禁止重复提交
  And 失败后保持修改值并展示错误与重试入口
  When 重试成功并重新进入页面
  Then 读取到已保存值且只在写入成功后提示成功
```

```gherkin
Scenario: 导入与邀请以实际结果报告而不是本地模拟
  Given CSV 含一条有效邮箱和一条格式错误记录
  When 预览并确认导入
  Then 展示真实成功数和逐行错误且遵守所选导入选项
  And 刷新成员页后结果与持久数据一致
  And 无邀请发送能力时不显示“刚刚发送”
```

```gherkin
Scenario: 安全操作可取消且查询错误可以恢复
  Given 安全会话 Provider 可用且商品查询失败
  When 打开会话页并请求撤销其他会话
  Then 会话页不被商品错误阻断且展示受影响范围确认
  When 取消
  Then Provider 撤销调用次数为零
  When 确认后 Provider 返回失败
  Then 保留记录并显示重试错误而不假装撤销成功
```

## 主代理浏览器交接

逐条以表内路径作为巡检数据，不只选代表页；对静态展示、mock本地、Provider缺失三类分别记结论。优先复现2FA任意六位、任意文件导入、通知保存刷新、邀请无效邮箱、导出/复制按钮、审计日志失败。再核对移动端首屏主动作、键盘焦点、空搜索恢复、危险确认取消与表单错误可读性。此次报告只证明源码路径和风险，未声称视觉、网络或线上业务验收通过。
