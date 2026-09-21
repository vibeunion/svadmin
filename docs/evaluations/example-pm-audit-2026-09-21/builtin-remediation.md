# 内置 UI 整改实施与验证记录

主任务的最终浏览器接入验收与后续补修结果见 [整改执行记录](remediation.md)；下文各表中的“交主任务”保留该 writer 当时的验证边界。

## 追加验收：成员表格手机最小宽度修复

2026-09-21，继四页手机截图人工复核后，仅修改 `packages/ui/src/components/account/MemberDirectory.svelte` 及本报告；没有修改全局样式或 example。以下新证据更新文末较早的待验状态，其余未验收边界不变。

- 根因不是 Tailwind 漏生成：`min-w-lg` 已存在于生成 CSS，`--container-lg` 也为 32rem；浏览器最终被 `packages/ui/src/app.css:2901` 的 `.layout-clean-flat [data-svadmin-content-page] table { min-width: 0; }` 覆盖，计算最小宽度为 0px。
- 修复采用组件自带的 Svelte scoped style：`.member-directory-scroll > table.member-directory-table { min-width: var(--container-xl, 36rem); }`。局部选择器只约束该成员表格，优先于全局收缩规则；不使用 important，不改变其他表格。该规则经现有 svelte-package 流程进入 dist 组件，由 example 的 Svelte 编译链生效，而非仅替换未生成的 utility class。
- 继续保留外层 `overflow-x-auto`，使表格内部横滚；姓名、邮箱、角色不再全部压缩到手机可视宽度。
- `bun run --cwd packages/ui test src/components/builtin-pm-repairs.test.svelte.ts`：12/12 通过。
- `bun run --cwd packages/ui build`：退出码 0，dist 已更新；仍有已记录的 import.meta.env 可移植性警告。
- 5190 实例在 WebKit、390×844 手机视口逐页重新加载验证如下。不是重新执行全部 337 路由，也不替代先前主任务的全量 scan。

| 路由 | 表格计算最小宽度/实际宽度 | 容器宽度/scrollWidth | 实际 scrollLeft | 页面横溢出 | 搜索空态与清空恢复 |
| --- | --- | --- | --- | --- | --- |
| `/account/members/members-starter` | 576px / 576px | 358 / 576 | 150 | 无 | 空态可见，恢复 4 人 |
| `/account/members/team-members` | 576px / 576px | 358 / 576 | 150 | 无 | 空态可见，恢复 4 人 |
| `/account/members-starter` | 576px / 576px | 358 / 576 | 150 | 无 | 空态可见，恢复 4 人 |
| `/account/team-members` | 576px / 576px | 358 / 576 | 150 | 无 | 空态可见，恢复 4 人 |

新截图保留在 `output/playwright/pm-remediation-20260921/spa/{026,027,319,320}-mobile-width-fix.png`，未覆盖原 jpg。人工检查 027 新图确认姓名、邮箱单行可读，角色列通过内部横滚查看；四页均有计算尺寸和滚动证据。搜索返回是否保留不属于本次承诺，本次未扩展持久筛选行为。

P3 旧别名面包屑归属交接：`packages/ui/src/components/Breadcrumbs.svelte:25` 的 findMenuTrail 仅精确匹配菜单 href；`:41` 使用匹配结果，后续 fallback 仅识别资源/CRUD 路径，`:89` 在仅剩首页时不显示。`example/src/exampleMenuCatalog.ts:505–506` 仅登记 `/account/members/...` 正式路径，但 UI 的 router-state 与 AdminApp 同时支持短别名。因此旧别名匹配不到菜单，不是 MemberDirectory 内容问题。应由主任务选择在 Breadcrumbs 的内置路由规范化层处理别名，或宿主统一跳转正式路径；本分工没有修改这部分。

日期：2026-09-21。
工作区：`/private/tmp/svadmin-tailwind-openui`。
审计基线：[builtin.md](./builtin.md)，补充共享组件问题来自 [business.md](./business.md)。

## 范围与结论

- 本分工是 managed 模式下的 UI 组件唯一 writer，实施范围为 `packages/ui/src/components/`。本报告由用户单独授权写入。
- 保留已有迁移及其他分工修改；未提交，未改 core、example App、package manifests 或 lock，未新增 npm 依赖。
- 已完成下表所列 UI 代码修复，并完成直接相关测试、UI build、dist 更新。不能将这些证据表述为全部路由、真实服务或浏览器验收通过。
- example 本机通知偏好与 users 目录装配由主任务负责；本分工提供并验证可接入的 provider API，不把整个组件库降为只读 demo。
- 最新 ShowPage 已移除 `history.length > 1` 后退逻辑。无显式可信内部返回目标时回资源列表，不以历史长度推断同应用来源。

## 逐项对应 builtin.md 发现

“实现闭环”表示审计所指源码缺陷已修复，不等同于生产或浏览器验收。

| 审计发现 | 实施与行为变化 | 自动化证据 | 状态与未验证边界 |
| --- | --- | --- | --- |
| P1：2FA 假验证 | TwoFactorAuthPage 使用可选登记 provider，begin 返回真实密钥，verify 成功后才展示该次恢复码；拒绝非六位数字，处理请求失败和 provider 切换后的过期响应；无服务时不生成模拟安全材料；复制等待实际结果 | builtin 回归覆盖缺能力、拒绝验证码、成功恢复码及过期登记响应 | 实现闭环；真实身份验证器绑定、恢复码可用性、剪贴板与浏览器流程未验收 |
| P1：导入任意文件随机成功 | ImportMembersPage 删除计时器与随机计数，复用 ImportWizard 的 CSV 解析、预览、校验、权限与真实写入；显示实际成功/失败数；明确导入记录不自动发送邀请/欢迎邮件 | ImportWizard 直接相关测试 70/70 | 实现闭环；成员入口真实文件浏览器操作、example 刷新后的数据一致性待主任务验收 |
| P1：账户与通知假保存 | UserProfilePage 复用已有 ProfilePage 的真实 auth 能力；CompanyProfilePage 独立读写 OrganizationProvider，不受身份策略查询影响；SettingsPlainPage 复用 ProfilePage、NotificationsSettings、SecuritySettings；通知偏好经 provider load/save，缺服务禁用，保存失败保留输入，提交中禁用，支持宿主范围说明 | builtin 回归覆盖组织保存、缺偏好存储、保存失败及保存后重新进入读取 | 实现闭环；个人资料真实后端、组织故障/权限及 example 本机持久化浏览器验收未完成 |
| P2：邀请、复制、下载、导出空动作或误导成功 | 新 MemberDirectory 从 provider 读取真实目录，邀请需可选 invite 成功返回，失败不报成功；链接仅使用真实 invitationUrl，复制等待结果；MembersStarter 移除假发送和无行为模板控件，转入真实导入流程；SecurityLog、TeamCrew 导出筛选后示例数据；TeamCrew 邀请转到成员管理；SettingsSidebar 改接 ProfilePage、IntegrationsSettings、AppearanceSettings，保留 API 能力边界 | builtin 回归覆盖真实目录可读但无邀请能力、邀请拒绝不显示成功 | 实现闭环；下载文件、复制失败、侧栏各分支和浏览器导航待验。未声称实现邮件发送或完整成员生命周期 |
| P2：审计失败未进入页面错误态 | AuditLogViewer catch 设置持续错误，提供实际请求重试，加载时清除旧结果；不再只依赖短暂 toast | builtin 回归覆盖失败可见、重试成功后清除错误 | 实现闭环；真实审计服务、分页故障与浏览器观感待验 |
| P2：账单/安全被无关查询失败连带阻断 | 缺陷位于 example DomainWorkspacePage，不在 UI writer 范围 | 本分工没有相关验收证据 | 范围外交接主任务，不计入本分工关闭 |
| P2：安全危险操作缺确认 | SecuritySettings 撤销单会话、其他会话、关闭 MFA 加确认；ApiSettings 撤销凭据、删除 Webhook 加确认；确认动作绑定当前请求作用域，作用域改变时清除；保留原 provider 写入与失败路径 | enterprise provider 回归 8/8，含凭据取消零写入、确认后写入、会话撤销确认 | 实现闭环；Webhook、关闭 MFA、撤销其他会话的全部取消/失败组合未新增逐项行为测试；真实服务待验 |
| P3：示例与业务事实混淆 | PublicProfile、NFT、TeamCrew、SecurityLog 加 ReferenceNotice，明确示例内容、本地连接状态和示例导出；GetStarted 不再预置假完成，明确当前会话清单不代表实际配置；通知/成员 provider 可附 description 说明真实范围 | builtin 回归覆盖两个 description 的展示及目录只读说明保留 | 实现闭环；所有 family/变体的首屏、移动端和文案浏览器验收由主任务进行 |

## 共享组件及额外修复

| 项目 | 当前实现 | 验证与边界 |
| --- | --- | --- |
| AutoForm 复制标题 | clone 模式优先使用复制标题，不再落入创建/编辑标题 | 已实现并打包；未新增专属克隆标题行为测试，待浏览器验证 |
| ShowPage 返回上下文 | 优先显式 onBack；其次 returnTo prop 或 routerProvider.parse().params 中的 returnTo，要求内部 `/` 路径并拒绝 `//`、反斜杠和换行；否则 list(resourceName)。不再调用无来源证明的历史后退 | detail-contract 44/44，含历史长度 10 仍回列表、外部/协议相对/反斜杠路径拒绝、内部查询保留、宿主回调优先及详情严格类型检查。example 来源链接由 Hooke/主任务接入，本分工不写 example |
| 角色页翻译 key | PermissionMatrix 针对缺失 permissions 翻译 key 提供中英文 fallback，并保留宿主翻译优先 | builtin 回归验证不显示原始 permissions key。未改 core 翻译源 |
| About 版本占位 | 支持可选 version；构建占位未替换时显示“开发构建（未提供版本）”，不显示原始占位 | builtin 回归验证开发构建提示及无原始占位；未据此声明发布版本已验证 |

认证/错误页中的 Login、Register、ForgotPassword、UpdatePassword、ErrorPage 本轮未改；builtin.md 对这些页主要列出 mock 边界与浏览器交接，不应将它们算作本轮新修复或真实邮件/密码恢复已验收。

## API 与宿主接入

AdminApp 增加以下可选 props，不要求新增外部依赖：

```ts
interface NotificationPreferences {
  email: { security: boolean; activity: boolean; reports: boolean };
  push: { security: boolean; activity: boolean; reports: boolean };
  sms: { security: boolean };
}
interface NotificationPreferencesProvider {
  description?: string;
  load: () => Promise<NotificationPreferences>;
  save: (preferences: NotificationPreferences) => Promise<void>;
}
interface DirectoryMember {
  id: string;
  name: string;
  email: string;
  role: string;
}
interface MemberDirectoryProvider {
  description?: string;
  list: () => Promise<DirectoryMember[]>;
  invite?: (email: string) => Promise<void>;
  invitationUrl?: string;
}
interface MfaEnrollmentProvider {
  begin: () => Promise<{ secret: string }>;
  verify: (code: string) => Promise<{ recoveryCodes: string[] }>;
}
```

- `notificationPreferencesProvider` 转传到 SettingsPage 的通知页和 SettingsPlainPage；内部子组件 prop 名为 `preferencesProvider`。
- `memberDirectoryProvider` 转传 TeamMembersPage 与 MembersStarterPage 的专页及旧别名；页面 prop 名为 `memberProvider`，MemberDirectory 的 prop 名为 `provider`。没有 invite 仍可正常读目录。
- `mfaEnrollmentProvider` 转传 `/2fa` 与 `/authentication/branded/2fa`；TwoFactorAuthPage prop 名为 `enrollmentProvider`。
- 两种 description 都在有 provider 且有非空文案时以纯文本说明展示，通知说明位于设置顶部，目录说明位于表单前。无 invitation capability 的原有只读提示保留。
- 主任务已报告添加 example accountDemo.ts/App 装配；本分工只验证组件 provider 合同，不替主任务声明实际 example 浏览器持久化已通过。
- 建议本机通知 demo 文案：“仅保存本机演示偏好，不会变更实际通知渠道。”建议目录文案：“目录来自本机样例用户，未接入真实邀请服务。”
- 真实 provider 需负责授权、数据持久化、邀请发送、MFA 验证；UI 成功只能依据该 provider 返回。宿主应提供与当前账户/租户绑定的实例或方法，不能把本机存储描述成远端渠道配置。
- 类型分别定义于 NotificationsSettings.svelte、account/MemberDirectory.svelte、TwoFactorAuthPage.svelte 的模块脚本；dist 已生成对应声明。本轮未修改包根导出。

core 翻译后续可补 `permissions.title/description/roles/noRoles/currentRole/noneSelected/toggleHint/conflicts/resources/noResources`；本分工没有修改 core 文件，也不要求等待翻译补齐才能显示可读 UI。

## 全部源码改动路径

以下均相对于工作区根目录，仅列本分工触及的源码/测试，不包含其他分工迁移变更。

```text
packages/ui/src/components/AboutSettings.svelte
packages/ui/src/components/AdminApp.svelte
packages/ui/src/components/ApiSettings.svelte
packages/ui/src/components/AuditLogViewer.svelte
packages/ui/src/components/AutoForm.svelte
packages/ui/src/components/NotificationsSettings.svelte
packages/ui/src/components/PermissionMatrix.svelte
packages/ui/src/components/SecuritySettings.svelte
packages/ui/src/components/SettingsPage.svelte
packages/ui/src/components/ShowPage.svelte
packages/ui/src/components/TwoFactorAuthPage.svelte
packages/ui/src/components/account/CompanyProfilePage.svelte
packages/ui/src/components/account/GetStartedPage.svelte
packages/ui/src/components/account/ImportMembersPage.svelte
packages/ui/src/components/account/MemberDirectory.svelte (新增)
packages/ui/src/components/account/MembersStarterPage.svelte
packages/ui/src/components/account/SecurityLogPage.svelte
packages/ui/src/components/account/SettingsPlainPage.svelte
packages/ui/src/components/account/SettingsSidebarPage.svelte
packages/ui/src/components/account/TeamMembersPage.svelte
packages/ui/src/components/account/UserProfilePage.svelte
packages/ui/src/components/content/ReferenceNotice.svelte (新增)
packages/ui/src/components/export-reference.ts (新增)
packages/ui/src/components/network/TeamCrewTablePage.svelte
packages/ui/src/components/network/UserCardsNFTPage.svelte
packages/ui/src/components/profile/PublicProfilePage.svelte
packages/ui/src/components/builtin-pm-repairs.test.svelte.ts (新增)
packages/ui/src/components/builtin-pm.test-host.svelte (新增)
packages/ui/src/components/enterprise-providers.test.svelte.ts
packages/ui/src/components/detail-contract.test-host.svelte
packages/ui/src/components/detail-contract.test.svelte.ts
```

本文件 `docs/evaluations/example-pm-audit-2026-09-21/builtin-remediation.md` 是独立授权的文档输出。ImportWizard 测试本轮执行但不是本分工新增修改；现存该测试文件的其他 diff 不归入本分工。

## 验证命令与结果

全部在 `/private/tmp/svadmin-tailwind-openui` 执行，各文件单独运行，没有全仓测试。

| 命令 | 本轮最近结果 | 证据范围 |
| --- | --- | --- |
| `bun run --cwd packages/ui test src/components/builtin-pm-repairs.test.svelte.ts` | 12/12 通过 | provider 边界、实际通知存取、目录、组织保存、MFA、审计重试、描述及版本/翻译 |
| `bun run --cwd packages/ui test src/components/enterprise-providers.test.svelte.ts` | 8/8 通过 | 企业 provider 合同及新危险确认的部分分支 |
| `bun run --cwd packages/ui test src/components/import-wizard.test.svelte.ts` | 70/70 通过 | 复用导入器直接回归；不等同成员页浏览器文件操作 |
| `bun run --cwd packages/ui test src/components/detail-contract.test.svelte.ts` | 44/44 通过 | 返回目标、详情行为与该测试内的严格编译检查 |
| `bun run --cwd packages/ui build` | 最新执行退出码 0 | ShowPage 最终修复后重新打包，dist 已更新 |
| `git diff --check -- packages/ui/src/components` | 通过 | UI 实施整体差异格式检查 |
| `git diff --check -- packages/ui/src/components/ShowPage.svelte packages/ui/src/components/detail-contract.test-host.svelte packages/ui/src/components/detail-contract.test.svelte.ts` | 通过 | 最后返回逻辑修复差异检查 |

以上四个测试文件最近通过数量合计 134，分别在相应变更后执行，非最终 SHA 下的一次全量套件结果。早期详情测试曾报 `params.returnTo` 违反索引签名访问规则，已改为 `params['returnTo']` 后完整重跑 44/44 通过。

测试中出现 svelte2tsx 缺少 source map 的工具警告，不阻断通过。UI build 出现 `import.meta.env` 可移植性警告，仍以退出码 0 完成；未在本分工扩展处理无关构建警告。

## dist 与验收状态

- 已运行完整 UI build，不是只运行 CSS 或只改 src。执行链包含 Tailwind/native styles、svelte-package、build-static-css 与 postbuild-css。
- 构建生成/更新 `packages/ui/dist/` 下对应组件、声明和 CSS，并按现有构建规则更新样式生成产物；没有手工修改 dist 或其他 scope 源码。
- 曾直接核对 dist 中 AdminApp 三个新 provider props、通知和目录 description 声明、About 版本兜底及 ShowPage 返回实现。最终返回修复后再次 build 成功。
- 未运行全仓类型检查；详情测试中的严格编译仅证明其定义的局部检查范围。svelte-package 成功不能替代全仓类型验收。
- 未运行本轮全部 example 路由桌面/移动端浏览器验收，未验证真实邀请邮件、真实 MFA、生产通知渠道、线上持久化与发布包安装。主任务继续承担浏览器巡检。
- 未进行提交、发布、部署或生产写入。当前构建和测试进程均已结束。

## 主任务待验清单

1. 用 builtin.md 全量路由表覆盖 family、变体与旧别名，确认 AdminApp 转传、无意外回退、首屏和移动端正常。
2. example 通知偏好修改后离开/返回及刷新，确认实际本机持久化、账户隔离与 description 均正确；不要表述为真实通知渠道生效。
3. example members 显示 users 同源目录；未接 invite 时不可发送；导入入口完成真实 CSV 预览/写入/结果，并明确与邀请不同。
4. 验证危险确认取消、失败保留记录，以及 Webhook、MFA 关闭、其他会话等尚未逐项覆盖的分支。
5. 验证示例 JSON 导出、剪贴板成功/失败、侧栏切换、错误重试与焦点可用性。
6. Hooke/主任务在 WorkspaceRecordLinks/BusinessShowPage 接入显式 returnTo，验证来源筛选/标签保留；从外站或书签直达且无可信来源时应回资源列表。
7. 单独记录 DomainWorkspace 查询解耦与错误重试的主任务证据，不能用本报告代替该范围验收。
