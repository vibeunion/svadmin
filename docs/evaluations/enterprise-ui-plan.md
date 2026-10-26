> Integration update: recursive form and preserved-host-filter contracts supersede the original scalar-only scope below. See `../architecture/enterprise-ui-reconciliation.md`. Original validation counts are historical, not current-head approval.

# 企业级 UI 补全：历史计划与验收边界

> 当前逐项验收矩阵：[enterprise-ui-acceptance-matrix-20261022.md](enterprise-ui-acceptance-matrix-20261022.md)。

2026-10-22 TreeSelect 续接真实源码消费者：修复上游延迟打开聚焦覆盖树内导航，
保留默认搜索框初始焦点及 Escape 回焦；展开与级联选择共用同一次加载，
搜索命中的懒父项可用 Right 加载，初始聚焦遇宿主卸载时不访问失效面板。
随后补齐搜索 ArrowDown、单一 roving Tab 入口、树/搜索命名、递归子组
ownership、失败项键盘重试和虚拟窗口焦点；Firefox 额外修复滚动树容器的
Tab 停靠点；随后修复失败重试期间重复按键误提交、鼠标按钮操作后的焦点承接，
并稳定异步前序插入后的节点 ID。随后清空/删除显式关闭面板并回焦触发器，
真实键盘验证不重开、不重复提交。随后补齐共享请求的禁用恢复、同键树替换、
loader 替换 × 旧成功/失败 × 新旧完成顺序，以及父子选择所有权交接，
新增 14 项，随后修正触发器内嵌套交互结构并补齐空名称、层叠和鼠标操作，
新增结构回归 4 项，当前定向组件 94/94；真实消费者矩阵新增鼠标场景后为
三引擎两视口 **72/72**。
此前三引擎两视口十一场景重复两次 132/132，本轮未重跑，
不将旧浏览器结果视为新增交叉失效组合的证据；本轮 72/72 覆盖了当前
TreeSelect 结构场景。随后补齐外部输入和多实例切换的关闭回焦：
窗口焦点离开旧实例时主动关闭，外部输入继续接收字符，第二实例的搜索和
Escape 回焦不被旧实例覆盖；组件保持 94/94，完整 TreeSelect 浏览器矩阵
更新为 **78/78**（三引擎两视口十三场景）。共享加载失效的旧/新响应排列
仍只有组件证据，不将 78/78 外推为真实 Provider 或发布验收。
完整 onlyLeaf 模式、真实读屏或发布仍未关闭；见
`../evidence/tree-select-keyboard-load-20261022.md`、
`../evidence/tree-select-tab-aria-20261022.md` 与
`../evidence/tree-select-outside-focus-20261022.md`。

2026-10-22 TreeSelect onlyLeaf 边界续接（parent
`../evidence/tree-select-outside-focus-20261022.md`）：补齐祖先 disabled 经搜索
命中后代、以及无 `loadChildren` 的 `hasChildren` 父项不可当作叶子提交，
single/multiple 各覆盖。组件定向单文件 **118/118**（上一轮 onlyLeaf 增量 20 项
后为 114/114，本轮新增 4 项），onlyLeaf 浏览器两个场景三引擎两视口 **12/12**，
同一 TreeSelect 完整浏览器矩阵 **90/90**；本轮未改生产组件。浏览器未覆盖全部
retry/empty/disabled 新排列，未发布、未接真实 Provider、未做读屏；见
`../evidence/tree-select-leaf-only-20261022.md`。

2026-10-22 Cascader 浏览器续接：定位连续方向键焦点被上游延迟自动聚焦覆盖，
接管本组件打开/关闭聚焦，并在退列前聚焦父项。保留自然连续键盘操作，
新增重开和 Escape 回焦检查；组件单文件 18/18，Chromium 窄屏键盘重复 5/5，
三引擎两视口两场景重复两次 24/24。只关闭这组本地交互验收，
不等同完整 Tab、读屏、动态叶节点移除后的焦点或发布验收。
见 `../evidence/cascader-browser-followup-20261022.md`。

2026-10-22 补齐 FilterBuilder 集合/范围的组标签、可编辑值无效状态与错误摘要
关联；错误节点使用实例前缀，修正后移除描述引用，集合标签保持原有样式。
定向单文件 48/48（含局部严格类型检查），见
`../evidence/filter-value-feedback-20261022.md`。未将 DOM 证据等同真实读屏或
新增场景浏览器验收，查询编译和历史条件保留算法未修改。

随后新增 FilterBuilder 真实源码消费者浏览器场景，覆盖嵌套数值规则、范围错误、
错误索引变化、无效期间不提交部分查询及恢复后的类型化嵌套载荷；
Chromium/WebKit/Firefox × 桌面/窄屏 **6/6**。证据仍见
`../evidence/filter-value-feedback-20261022.md`。屏幕阅读器、真实 Provider、
全部集合边界和发布验收仍未关闭。

2026-10-22 续接 StepsForm 取消确认：移除关闭时即时销毁弹层的 key，
避免与上游延迟自动聚焦冲突。补齐 Enter 打开、正反 Tab 循环、Cancel/Escape
保留草稿及焦点恢复、单次确认导航、确认后重开取消的状态重置。
组件单文件 88/88；浏览器三引擎两视口 12 组合重复两次，24/24。
见 `../evidence/steps-form-cancel-confirmation-20261022.md`。
路由为计数 stub，不替代真实离开、读屏或发布验收。

2026-10-22 续接 RolesSettings 状态国际化：角色读取失败与缺少能力改为保存
状态码、渲染时按当前 locale 翻译；权限动作标题改为派生值，权限读取错误沿用
现有状态标记并补齐语言切换回归。中英文往返不重复
读取，保存中切换不解锁、不重复写入；修复前新增场景 2 项失败，修复后定向单文件
18/18。见 `../evidence/roles-settings-locale-20261022.md`。
本轮不关闭 PermissionMatrix 全量文案、真实 RBAC、读屏、浏览器或发布验收。

随后补齐 PermissionMatrix 的实例和表单语义：角色选择框使用实例级 ID，
角色切换与权限操作按钮显式为 `type="button"`，嵌入 form 不误提交；真实 Svelte
form 宿主确认权限回调单次、宿主 submit 仍有效；授权按钮补齐
`aria-pressed`，并验证受控角色/授权变化及 Enter/Space。直接回归 5/5，
RolesSettings 关联回归 18/18。见
`../evidence/permission-matrix-form-identity-20261022.md`。
真实读屏、完整文案、真实 RBAC、跨浏览器和发布验收仍未关闭。

随后补齐 PermissionMatrix 真实消费者浏览器证据：两实例角色隔离，桌面侧栏
Enter、窄屏原生 select/label 焦点、权限 Enter/Space 授予与撤销、
`aria-pressed`、单次回调及宿主 form 不误提交；Chromium/WebKit/Firefox ×
桌面/窄屏 **6/6**。见 `../evidence/permission-matrix-browser-20261022.md`。
这仍不等同真实 RBAC 服务、屏幕阅读器、服务端冲突或发布部署验收。

2026-10-22 继续补齐 PermissionMatrix 操作控件国际化：权限按钮 aria-label 使用
`permissions.toggleAction` 插值词条，不再固定为英文 `Toggle`；locale 往返时保留
当前角色、授权状态、可操作时的焦点和保存中的禁用状态；动作名称中的 `$&`、`$$`
按原文保留，不触发字符串替换语义。PermissionMatrix 定向回归 7/7，
RolesSettings 关联回归 20/20，`git diff --check` 通过。真实读屏、真实 RBAC、
分发包与发布验收仍未关闭。

2026-10-22 续接 StepsForm 复合首错聚焦和错误节点实例隔离：按当前步骤顶层字段
的显示顺序聚焦可操作控件，不再误选嵌套同名子字段；同资源多实例错误 ID 独立。
组件单文件 84/84（含局部严格类型检查），专属三引擎两视口浏览器矩阵 60/60，
新增双实例 Enter 校验与独立提交、服务端数组拒绝后回跳聚焦及修正。
见 `../evidence/steps-form-error-focus-20261022.md`。
完整 Tab 顺序、真实读屏和分发发布验收仍未关闭。
独立复核随后补齐禁用 fieldset 祖先判断：保留第一 legend 例外，并继续检查外层
fieldset，防止内层例外绕过外层禁用。四项有效回归先失败后通过，单文件现为
88/88；相关细节仍见上述证据。fieldset 专项尚无真实浏览器覆盖。
随后新增单行数组与 Review 步骤的正反向 Tab、Enter 新增/返回/保存验证，
三引擎两视口 6/6。步骤切换后手动设置局部起点，不代表整页连续焦点恢复、
取消弹窗或真实读屏完成。命令及边界仍见上述证据。

2026-10-22 续接 StepsForm 数组草稿契约：新增行不再因内部 Symbol 被 Core 拒绝，
连续输入保持行节点和焦点，步骤往返保留业务值；tenant/provider 替换使旧缓存失效。
单文件 70/70（含局部严格类型检查），见
`../evidence/steps-form-array-contract-20261022.md`。本轮没有新增浏览器、edit 迟到响应、
读屏或发布验收；表单引擎统一仍未整体完成。
随后增加真实源码 StepsForm 浏览器 fixture，完成三引擎两视口 48/48：
数组连续输入与步骤往返、tenant/provider 切换、edit 迟到成功/失败与 dirty
refetch 后提交。证据见同上文件。复杂首错、多实例错误 ID、完整键盘与读屏、
分发包和部署验收仍未关闭。

2026-10-22 续接 AutoForm/ErrorSummary 真实浏览器关联：两个同构表单验证帮助与
错误关联、首错聚焦、摘要按钮 Enter 跳转、成功提交和实例隔离；组件专项 47/47，
Chromium/WebKit/Firefox 桌面与窄屏 6/6。见
`../evidence/auto-form-error-summary-browser-20261022.md`。
尚不证明完整 Tab 顺序、复杂字段、真实读屏、Provider 或发布验收。

随后在真实 AutoForm 数组场景发现并修复 ArrayField 内部行身份 Symbol 被
Core 纯数据草稿快照拒绝的问题；仅在 AutoForm 写入入口剥离本组件的两个已知
标记，未知 Symbol/访问器仍按 Core 契约拒绝。数组专项 23/23、复合焦点 14/14，
浏览器三引擎两视口普通/数组场景合计 12/12。证据见
`../evidence/auto-form-error-summary-browser-20261022.md`。
后续补充以权威快照引用确认 UI 行身份归属，避免快照往返后丢失焦点/文件行身份；
反射异常回交 Core 统一拒绝，表单契约单文件 101/101。该修复仍未替代完整复杂
字段、读屏和消费者发布验收；Provider 替换/资源作用域切换浏览器专项另为
三引擎两视口 12/12。Core 同作用域默认值与外部刷新保留草稿，显式 reset 尚无
AutoForm 公共 UI 入口，均不误报为已完成。
本专项为 create 模式，未覆盖 edit 查询、refetch 或迟到响应隔离。
随后补齐 edit 模式真实 `getOne` 延迟成功/失败、资源与 Provider 切换、
同作用域 dirty draft refetch：三引擎两视口合计 30/30，AutoForm 专项累计
浏览器 54/54；证据见
`../evidence/auto-form-error-summary-browser-20261022.md`。显式 `form.reset()`
仍没有公共 UI 入口，未伪造为已验收。

2026-10-22 补齐 JsonSchemaForm 控件及对象/数组组的帮助文本与错误关联，
修正辅助节点 ID 与合法字段名碰撞、null 控件缺失错误关联的问题。
定向单文件 49/49，见 `../evidence/schema-form-description-association-20261022.md`。
随后使用真实源码组件完成 Chromium/WebKit/Firefox × 桌面/窄屏 × 四条条件路径
浏览器验收 24/24，覆盖帮助/错误关联、隐藏引用、恢复聚焦、修正后错误移除和
ID 唯一性。证据仍见上述文件；DOM 断言不等于读屏认证，未验收新分发包或部署。

2026-10-22 补齐 JsonSchemaForm 条件隐藏字段的解析错误生命周期：隐藏字段不再
阻断当前提交，重新显示后未修正错误仍阻断。自身/对象/数组三种路径在旧组件下
均失败，最终单文件 44/44（含局部严格类型检查）；core 根值处理未修改。
见 `../evidence/schema-form-hidden-parse-errors-20261022.md`。本次条件错误的
浏览器、读屏和消费者构建未验收，不据此关闭完整 Schema 表单。

随后补齐上述条件错误的真实浏览器场景：字段、对象、数组及数组行内字段四种
路径，通过键盘 `1e` 触发并断言原生 badInput，Chromium/WebKit/Firefox 桌面与
窄屏共 24/24，检查隐藏提交、恢复错误聚焦和修正后的精确载荷/提交次数。
证据仍见 `../evidence/schema-form-hidden-parse-errors-20261022.md`。这更新本地
浏览器边界，不关闭读屏、新分发包、真实后端或完整 Schema 表单验收。

2026-10-22 补齐 JsonSchemaForm 对不支持 Schema 的显式拒绝：内部/外部 `$ref`、
`oneOf` 和未知关键字命中现有子集断言时，SPA 与 Lite 均显示表单级错误、零输入
控件、禁用提交且不调用提交/错误回调；问题路径由内部模块
`readRecursiveSchemaForm(...).issues` 的 `unsupported-schema` 定位，不是公开
组件 API，UI 只保留表单级通用错误。首轮 4 个失败是测试期望路径写错，修正后
定向单文件 61/61（exit 0），主线程已独立复跑并审查 12 个新增测试；未修改实现
源码。见 `../evidence/schema-form-unsupported-schema-20261022.md`。
B1-02 原始正确性不要求完整 `$ref`/`oneOf`；完整 Schema 受控适配属于 B2-11。
这只证明“拒绝而非静默降级”的安全边界，不替代 B2-11，也未实现引用解析，也未
验收浏览器/读屏、新分发包、真实后端或完整 JSON Schema。

2026-10-22 续接 SecuritySettings 会话撤销互斥：单会话与批量撤销共用函数层
pending 门禁，阻止 DOM 禁用更新前同步重入。移除本轮门禁时新增三例均失败，
恢复后定向单文件 39/39；取消、失败保留与重试沿用同文件回归。
见 `../evidence/security-session-revoke-pending-20261022.md`。本轮未构建分发包、
未执行浏览器或真实 Provider 验收，不关闭整体安全页或企业级路线图。

2026-10-22 随后拆分 SecuritySettings 的读取与写入作用域代际：读取 Retry 只推进
`securityReadId`，Provider/租户替换才推进写入 `scopeId`，避免读取重试取消在途
密码、MFA 或会话动作的 finally。新增交叉完成顺序与旧作用域读取回执场景，反向
耦合实验使 6/8 新场景失败，恢复后安全专项定向回归 47/47。证据见
`../evidence/security-session-revoke-pending-20261022.md`。这仍不关闭真实安全
Provider、读屏、跨浏览器或发布验收。

同日重建 UI 包与示例消费者：UI `build`、示例 `svelte-check`（0 errors / 0 warnings）
及 `build:example`（10740 modules）均通过，并在示例 manifest 依赖产物中定位
SecuritySettings 的最新代际与动作门禁。证据见
`../evidence/enterprise-consumer-build-20261022.md`。这只关闭当前改动进入本地
消费者构建的证据，不关闭 registry 发布、真实 Provider、读屏或生产部署。

2026-10-22 续接统一 SettingsEnterprisePage 的读取、策略/组织保存与身份源
测试失败反馈，空 Error 不再跳过加载错误态；保留草稿与重试恢复，并补齐
连接测试按钮的中英文词条。单文件回归 25/25，见
`../evidence/settings-enterprise-error-feedback-20261022.md`。这只关闭该页本地
错误反馈契约，不关闭真实 Provider、浏览器、读屏、语言切换或发布验收。

2026-10-22 又统一 ProfilePage 的身份读取、资料/密码/头像失败反馈，以及
TwoFactorAuthPage 的登记/验证失败反馈；诊断、空 Error、非 Error 和失败返回
均不再直接展示，失败草稿可重试，同一头像文件可重新选择，MFA 恢复码仍只在
Provider 验证成功后显示。身份读取失败显示通用错误并支持 Retry。定向回归分别为
14/14 与 32/32，见
`../evidence/profile-and-mfa-error-feedback-20261022.md`。这只关闭共享认证页面
的本地错误反馈契约，不关闭真实 Auth/MFA Provider、浏览器、
读屏或发布验收。

2026-10-22 又补齐 ApprovalCenter 的刷新与提交状态闭环：刷新期间清理旧详情并
禁止重复刷新/操作，审批提交期间禁止刷新，操作失败在对话框内显示通用文案并保留
意见草稿供重试。定向回归 11/11，见
`../evidence/approval-center-refresh-feedback-20261022.md`。这只关闭审批中心的
本地状态反馈契约，不关闭真实审批 Provider、权限边界、服务端并发冲突、浏览器、
读屏、跨浏览器或发布验收。

同日继续补齐审批原样重试的幂等标识：同一加载上下文中最近一次失败请求的
版本、动作、意见和目标不变时复用键；载荷变化或成功/重载/作用域替换后不沿用
旧键，并验证旧作用域迟到成功不会清除新作用域重试标识。定向回归 19/19，见
`../evidence/approval-center-idempotent-retry-20261022.md`。本地标识复用不等于
服务端已实现去重，也不承诺跨刷新/跨标签页恢复；真实 Provider 验收仍未关闭。

审计时间线随后将默认空态、操作者前缀及状态标签接入中英文词条，保留宿主标题、
事件描述、标签和时间戳；操作者名称独立渲染，避免插值改写特殊字符。语言切换
不改变 loading/error/forbidden/filtered-empty 的旧事件隐藏边界。定向回归
17/17，见 `../evidence/audit-timeline-localization-20261022.md`。
这只关闭 AuditTimeline 本地默认文案与状态契约，真实审计、浏览器、读屏和发布
验收仍未关闭。

任务列表随后对齐详情查询门禁：显式 `enabled:true` 不再覆盖外部数据模式或
缺少 Provider 的读取限制，失败后的读取重试入口与函数均服从统一 `canRead`。
真实 `useTaskList`/QueryClient 单文件回归 7/7，涵盖禁用/恢复及普通/DLQ 重试，
见 `../evidence/task-list-read-gate-20261022.md`。真实任务服务、浏览器、读屏
和发布验收仍待完成。

任务列表随后补齐 Provider 能力边界：普通队列仅依赖 `list`，DLQ 仅依赖
`listDlq`；能力缺失时显示配置/服务不可用状态，不显示未经确认的计数、旧记录
或 Retry，补充能力后可恢复，静态任务模式不受影响。真实 QueryClient 定向回归
12/12，见 `../evidence/task-list-capabilities-20261022.md`。DLQ 迟到回执仅由
共享代码路径间接覆盖，真实任务服务、浏览器、读屏和发布验收仍未关闭。

任务列表选择交互随后补齐能力匹配与事件隔离：没有 `onSelect` 不展示无效
Details，Retry/Cancel 不再同时触发行选择；隐藏操作列但支持选择时，标题
提供原生可聚焦按钮。定向真实 QueryClient 回归 17/17，见
`../evidence/task-list-selection-20261022.md`。本地按钮/事件语义不等于浏览器
Tab/Enter/Space 或读屏验收，任务中心整体仍未关闭。

任务列表选择交互随后补齐本地 Chromium 浏览器证据：桌面 1440x1000、窄屏
390x844 的 Tab/Enter/Space、Cancel 不附带选择、表单非提交、隐藏操作列的
标题入口及内部表格横向滚动均通过，共 8/8。见
`../evidence/task-list-browser-20261022.md`。这更新了前段的浏览器待验收边界，
但只覆盖静态任务 fixture；真实任务服务、读屏、跨浏览器和发布仍未验收。

任务列表随后以任务 ID 加出现序号替代数组索引 key，避免刷新重排导致原任务
的 pending 动作锁随行 ID 变化而丢失；重复 ID 仍完整展示，替换任务重建行。
真实 QueryClient 单文件回归 20/20，见
`../evidence/task-list-row-identity-20261022.md`。重复 ID 的出现序号不构成
业务实体消歧，前述静态浏览器证据也不覆盖本轮重排场景。

任务提交后的手动刷新随后遵循当前 Provider 能力：仅刷新支持的普通/DLQ 队列，
不通过 refetch 绕过 disabled 查询；读取拒绝不变成提交失败，不重复任务写入。
TaskQueueDrawer 单文件 41/41，见
`../evidence/task-submit-refresh-capabilities-20261022.md`。本地 mock 仅验证调用
边界，不等同于真实 QueryClient 网络行为或完整任务提交验收。

任务中心随后统一时间显示：复用既有 `parseDisplayDate` 区分 civil 与 instant，
三处任务组件随应用语言重算，非法值使用统一占位，不新增时区配置。相关单文件
回归在 `TZ=America/Los_Angeles` 下为 52/52，覆盖跨 UTC 日界 instant，见
`../evidence/task-time-display-20261022.md`。真实浏览器时区、读屏和发布验收仍待完成。

任务 Retry/Cancel 按钮随后补齐无宿主 `onError` 时的默认失败提示，复用已有
动作作用域隔离与统一词条，关联按钮说明；重试开始清理错误，语言切换不发请求。
已有 `onError` 仍由宿主反馈，不叠加默认提示。动作单文件 38/38，见
`../evidence/task-action-default-feedback-20261022.md`。真实服务、浏览器错误态布局、
读屏和发布包样式仍待验收，前述正常态浏览器结果不覆盖本次失败提示。

默认动作反馈随后补齐本地 Chromium 的 Cancel 失败与恢复证据：桌面与窄屏
专项共 10/10，检查错误说明关联、诊断隐藏、显式恢复、不附带选择/表单提交，
并检查失败截图中的完整换行。见
`../evidence/task-action-default-feedback-20261022.md` 的浏览器续接验收。
随后补齐同一 fixture 的 Retry 失败与恢复证据，专项共 12/12；这更新了 Retry
本地 Chromium 错误态边界，但仍不关闭真实服务、持久化状态刷新、读屏、
跨浏览器与发布包验收。

企业设置随后统一身份源测试入口：卡片不再把测试动作标为 Connect/Manage，
顶部与卡片入口共享处理中禁用状态，函数层也拒绝并发测试；定向回归 28/28。
本地 Chromium 企业设置 fixture 的桌面/窄屏测试 2/2，见
`../evidence/enterprise-connection-action-20261022.md`。这只证明本地入口、
失败恢复和迟到回执隔离，不关闭真实身份源连接、读屏、跨浏览器或发布验收。

API Settings 随后补齐主内容读取失败、密钥创建和凭据撤销的浏览器恢复证据；
desktop/narrow 共 4/4，确认失败不泄露诊断、草稿与已有记录保留，读取失败只
有一个 Retry，恢复后回到真实结果。见
`../evidence/api-settings-error-feedback-20261022.md`。这只覆盖本地
CredentialProvider stub 与 Chromium，不关闭真实存储、读屏、跨浏览器或发布
验收。

API Settings 后续补齐密钥/Webhook 创建的函数层并发门禁；单文件回归扩展为
31/31，并以移除守卫的失败回放证明测试捕获重复写入。浏览器 4/4 保持不变；
真实服务端幂等和取消仍未验收。

Security Settings 随后补齐密码和会话浏览器证据：密码失败保留三项输入并可
成功清空，会话撤销支持取消、失败保留与成功移除，读取失败只保留一个 Retry；
desktop/narrow 共 4/4。见
`../evidence/security-settings-error-feedback-20261022.md`。这只覆盖本地
Auth/Session stub 与 Chromium，不关闭真实安全服务、读屏、跨浏览器或发布验收。

随后修正 Security Settings 的 MFA 未知状态：读取中、读取失败和缺少
`getMfaState` 均不再显示“已关闭”或允许操作，只有明确返回值才进入启用/禁用
状态；组件回归更新为 27/27，浏览器回归仍为 4/4。证据见
`../evidence/security-settings-error-feedback-20261022.md`。

Security Settings 随后补齐密码提交函数的 pending 门禁，防止 DOM 禁用前及
在途期间的重复 submit。新增成功/抛错/失败结果及 Provider 替换后旧回执
隔离回归，安全单文件 **36/36**；既有 Chromium 恢复流程 **4/4**。见
`../evidence/security-password-pending-20261022.md`。本轮未重建包，不把此前
消费者构建与跨浏览器结果作为新门禁的验收；新增定向 WebKit/Firefox 恢复回归
为 **8/8**，仍不覆盖并发场景的真实浏览器提交。

Profile 与 MFA 随后补齐资料保存、密码更新、登记和验证码验证的浏览器证据；
desktop/narrow 共 4/4，确认敏感草稿在失败时保留，恢复码在成功前不展示。
见 `../evidence/profile-and-mfa-error-feedback-20261022.md`。这只覆盖本地
Auth/MFA stub 与 Chromium，不关闭真实身份服务、读屏、跨浏览器或发布验收。

认证页面随后修复固定输入 ID：Profile、Security、MFA 均使用实例级 ID 前缀；
新增单测 3/3，双实例浏览器验收 6/6，确认标签、焦点、输入和回调不跨实例串联。
见 `../evidence/auth-field-identity-20261022.md`。这只关闭本地字段身份契约，
不关闭真实密码管理器、读屏、跨浏览器或发布验收。

Notifications Settings 随后补齐读取失败、单一 Retry、保存失败草稿保留和成功
载荷的浏览器证据；desktop/narrow 共 2/2。见
`../evidence/notification-settings-error-feedback-20261022.md`。这只覆盖本地
Provider stub 与 Chromium，不关闭真实通知存储、读屏、跨浏览器或发布验收。

MemberDirectory 随后补齐本地 Chromium 浏览器恢复与字段实例隔离：读取失败不误报
空目录，邀请失败保留邮箱并可再次发送，搜索/邀请输入的焦点、ID、筛选和状态不跨
实例串联；desktop/narrow 共 4/4。见
`../evidence/member-directory-error-feedback-20261022.md`。真实目录 Provider、
读屏、语言切换、跨浏览器和发布验收仍未关闭。

企业设置浏览器专项随后扩展到读取重试、策略和组织保存失败恢复，共 4/4，
覆盖桌面/窄屏及完整成功载荷；见
`../evidence/settings-enterprise-error-feedback-20261022.md`。
通知使用 fixture status 出口，不宣称真实 Toast、读屏、Provider 或发布包验收。

随后发现并修复 SettingsEnterprisePage 策略/组织保存的函数层重复写入风险：
增加独立 pending 门禁，参数化回归验证同步重复触发各自只发一次，且两区互不
阻塞；企业 Provider 单文件 **30/30**，企业浏览器 **4/4**。见
`../evidence/enterprise-save-pending-20261022.md`。真实服务端幂等、跨标签页、
读屏和发布验收仍未关闭。

ApprovalCenter 随后补齐本地 Chromium 的读取失败重试和审批动作失败恢复证据，
桌面/窄屏共 2/2；失败对话框保留意见，重试复用完整幂等载荷。见
`../evidence/approval-center-browser-20261022.md`。真实审批 Provider、读屏、
跨浏览器和发布验收仍未关闭。

随后执行示例消费者交付构建：`bun run build:example` 成功，原生样式边界检查
报告 `747 selectors; component aliases covered`，Vite 完成 `10738 modules
transformed`。见 `../evidence/enterprise-consumer-build-20261022.md`。这只证明
现有包产物能被示例消费者构建；进一步核实发现 UI dist 落后于本轮源码，因此首次
构建不证明新改动已集成，也不证明类型检查、registry 发布包或线上验收。

随后重建 UI 包，再构建示例成功（10740 modules transformed），从示例 manifest
定位 CompanyProfile JS 并确认通用错误词条和字段实例 ID 已进入产物；
`bun run --cwd example check` 退出 0，Svelte 为 0 errors/0 warnings。
详情和产物哈希见上述消费者证据；`import.meta.env`、KaTeX 和大 chunk 风险保留，
不等同于全包重建或生产验收。

ApprovalCenter 同一恢复场景在 WebKit/Firefox 桌面与窄屏通过 4/4，见
`../evidence/approval-center-cross-browser-20261022.md`。仅证明该场景的本地跨引擎
行为，不关闭全体组件、读屏、服务端幂等或真实 Provider 验收。

随后将账户与设置恢复场景扩展到 WebKit/Firefox 的桌面/窄屏矩阵，覆盖
CompanyProfile、MemberDirectory、Enterprise、API、Security、Profile/MFA、
字段身份和 Notifications，共 **64/64**；见
`../evidence/account-settings-cross-browser-20261022.md`。这批结果关闭这些
本地 fixture 的第二引擎回归，但不关闭真实 Provider、读屏软件、生产浏览器版本
或发布包验收。

## 当前状态入口（2026-10-21）

下文是 2026-09-19 的原始任务约定和初始状态，不是当前待办清单。
后续已加入递归 Schema 表单、类型化集合筛选、工作簿与剪贴板等实现；
不能仅凭下表的“待实施”重复开发，也不能仅凭组件文件存在宣布完成。

本次工作区对 FilterBuilder、JsonSchemaForm、SpreadsheetView 的包内专项测试
分别得到 38/38、41/41、122/122 通过，包含各自测试文件内的严格类型检查。
范围、命令和未验收项见
[`../evidence/enterprise-foundation-audit-20261021/README.md`](../evidence/enterprise-foundation-audit-20261021/README.md)。
当前使用与约束见 `enterprise-ui-correctness.md`；本线程的页面、反馈及视觉要求
分别以 `../ENTERPRISE_PRODUCT_SYSTEM.md`、`../ui-state-matrix.md` 和根目录
`DESIGN.md` 为准。

批次二至四的原始需求全部保留，尚未逐项核对的能力不视为完成。本次未做
全仓测试、真实服务验收、发布或部署；历史 PR/CI 结果不能充当当前验收结果。

任务中心续接修复了 TaskList、TaskDetails 和 TaskQueueDrawer 的查询归属反馈：
读取失败显示 DataState 与当前列表/详情重试，初始加载不再伪装为空列表，错误
期间隐藏旧行和详情操作；读取中的刷新受限，恢复后显示对应记录。
TaskQueueDrawer 单文件 32/32，另有真实 `useTask`/QueryClient 集成回归 5/5，见
`../evidence/task-list-query-feedback-20261022.md`。前者使用 mock query，
后者使用真实查询 hook 和本地 stub Provider；
不关闭真实 Provider、持久化恢复、Provider 能力缺失、浏览器或任务中心整体
验收。

批次二续接已修复三个数值公开包装的 `bind:value` 传播，并通过定向测试 7/7、
局部严格类型检查和三视口浏览器走查，见
`../evidence/numeric-input-binding-20261021.md`。随后接入统一 enterprise
源码消费者 fixture，补齐 Number/Money/Percent 的真实标签查找、键盘编辑、
null/0、金额原单位、百分比缩放、父值回填与清空；Chromium/WebKit/Firefox
三引擎两视口共 12/12，证据见
`../evidence/numeric-input-cross-browser-20261022.md`。DatePicker 入口 2/2、
TreeSelect 47/47 仅作为本轮只读基线，不关闭日期、选择器或整批验收。

2026-10-21 又修复了 UI 包级严格检查中剩余的 10 项类型错误，涉及状态反馈
可选属性、页面示例菜单触发器、测试索引收窄和 recipe 索引访问；包级
`svelte-check` 当前为 0 errors / 0 warnings，定向回归和证据见
`../evidence/ui-contract-type-recovery-20261021.md`。这只关闭了当前类型门槛，
不关闭批次二至四的组件能力、真实消费者、无障碍、跨浏览器或发布验收。

日期与时间公共入口随后补充了真实父组件绑定、instant 表单序列化、范围逆序
草稿和三视口 Chromium 走查，证据见
`../evidence/date-time-picker-binding-20261021.md`。随后接入统一 enterprise
源码消费者 fixture，补齐 civil/instant 两种模式下四个入口的真实标签、父值
回填、清空和范围两端保持；Chromium/WebKit/Firefox 三引擎两视口共 12/12，
证据见 `../evidence/date-time-picker-cross-browser-20261022.md`。这只证明当前
四个入口的基础跨浏览器绑定链路，不关闭完整日历面板、禁用日期、时区边界、
读屏或批次二验收。

选择控件随后补充了 `RadioGroup` 与 `SegmentedControl` 的父组件绑定和表单
语义回归，并修正 `SegmentedControl` 对 `T | undefined` 未选择值的公开类型，
证据见 `../evidence/choice-binding-20261021.md`。这只关闭当前选择控件的
基础绑定/类型门槛，不关闭异步选择器、关系选择器或整批验收。

随后又修复了 `RadioGroup` 的多实例标签与焦点隔离：输入采用实例级 ID；
未命名组在共享表单中采用组内方向键、Home/End 和单 Tab 入口；
命名组继续保留原生分组和表单序列化。主测试 15/15、关联回归合计 9/9，
Chromium 四组视口/命名矩阵及共享表单探针通过，证据见
`../evidence/radio-group-isolation-20261021.md`。这只关闭本地隔离契约，
不关闭完整必填校验、异步/关系选择器、跨浏览器、读屏或批次二验收。

随后补齐 `RadioGroup` 的必填与真实源码跨浏览器契约：未命名组不再依赖
空 `name` 会跨实例聚合的原生 `required`，改为组件内 custom validity，
选中本组值后允许提交且不产生伪造字段；命名组保留原生分组与精确 FormData。
上一轮 48/48、16/16 经主线程复跑后审查退回，原因包括固定英文提示、Tab
全页元素表遗漏 contenteditable/inert 边界以及 custom validity 生命周期不完整。
后续 pi 进程在主线程中断（exit 130）时未产出最终结果，本轮续接当前文件并
进一步修正 Tab 首尾索引守卫、窄屏焦点滚动、`name=""` 与省略 name 等价、
aria-disabled 宿主 button 不得被越过，以及外层 fieldset disabled 恢复后的
未命名 required 校验。最终单文件 20/20；Chromium/WebKit/Firefox 两视口
84 项中 81 passed、3 skipped（桌面跳过窄屏焦点用例），证据见
`../evidence/radio-group-browser-contract-20261022.md`。主线程已独立复跑该
专项，单文件 20/20、Playwright 81 passed/3 skipped，具体证据见原证据文件；
仍不能写成整体完成。这只关闭当前必填/标签/键盘/禁用恢复的浏览器契约，
不关闭完整原生 reset、真实读屏、服务端授权、真实消费者构建、发布或其他
选择器组件验收。

随后补齐 `SegmentedControl` 的真实源码消费者跨浏览器契约：单文件
7/7；主线程审查退回后补充真实自然 Tab/Shift+Tab 路径、父级外部赋值与清空
不触发 `onchange`、表单宿主真实 Enter/Space 累计以及 ArrowUp 覆盖；
Chromium/WebKit/Firefox 两视口共 60 项中 57 passed、3 skipped
（桌面跳过窄屏焦点用例），覆盖多实例 radiogroup/aria-label/aria-checked
隔离、Arrow/Home/End/Enter/Space、RTL、整组禁用恢复、禁用选项跳过以及
初始 disabled selected 值保留、受控值指向 disabled/被移除选项时保留值且
roving 入口可用、表单宿主不被内部 button 提交，以及窄屏无横向溢出和焦点
可见。随后补充单个选项 disabled 动态切换恢复：先选择该选项，再切换为
disabled，确认原生 disabled/aria-disabled、真实指针点击与 Arrow/Home/End
都不能选中它且 value/回调保持；恢复后该选项重新进入可用导航序列，roving
tabindex 仍只有一个入口，再次选择只增加一次回调。补充后单文件仍为 7/7，
专属 Playwright 六组项目共 66 项中 63 passed、3 skipped。各轮均未出现
组件红证据，因此未改组件实现或公开 API。证据见
`../evidence/segmented-control-browser-contract-20261022.md`。主线程已在 pi
自测之外独立复跑并确认本轮结果：`packages/ui` 单文件 7/7、专属 Playwright
原始 exit 0（本轮 66 项中 63 passed、3 skipped，三引擎两视口）、
`git diff --check` exit 0，并检查了 spec 与动态 disabled fixture，确认未修改
组件。此前“单选项动态切换恢复未覆盖”已关闭并转为已覆盖；pi 自测与主线程
独立复核分开记录。这只关闭当前真实源码消费者的本地跨浏览器契约，不关闭
读屏认证、真实 Provider/后端联调、服务端授权、真实发布包消费、发布构建或
其他选择器能力；不能写成整批
选择控件或企业 UI 整体完成。

异步选择器续接补充了 `ComboboxField` 的键盘进入/退出契约：按钮支持
Enter/Space/上下方向键打开，搜索或命令面板获得焦点；Escape、单选和清空
按路径恢复焦点，多选保持弹层与连续选择焦点，Tab 离开时收起且不抢外部
焦点；加载更多已与 Command option 导航隔离。定向回归 32/32，Chromium
八组矩阵通过，证据见 `../evidence/combobox-keyboard-recovery-20261021.md`。
这只关闭本地键盘/焦点契约，不关闭异步选择器整批、跨浏览器、读屏或真实
权限联调。

2026-10-22 又补齐 Combobox 触发按钮与结果列表的实例级 aria-controls：
关闭时清除关联，重新打开复用自身 ID，多实例互不串扰。单文件 33/33，
含局部严格类型检查，见 `../evidence/combobox-listbox-association-20261022.md`；
该结果只证明 DOM 语义关联，不等同于读屏认证。随后接入统一 enterprise
源码消费者 fixture，补齐真实 DataProvider 列表、Enter/Space 打开、搜索输入、
选项选择、Escape 回焦和双实例关联；Chromium/WebKit/Firefox 三引擎两视口共
6/6，证据见 `../evidence/combobox-cross-browser-20261022.md`。这关闭基础
消费者键盘/弹层关联契约，不关闭分页、取消搜索、真实 Provider 权限、读屏或
异步选择器整批验收。

关系选择器续接补充了 Dialog 的统一关闭清理：取消、Escape、右上角关闭和
遮罩关闭都会丢弃未提交草稿，清空搜索、分页累积项和待执行防抖；确认仍只
提交一次，并保留 Dialog 上游的触发按钮回焦。权限、租户、禁用或 Provider
作用域变化时也不会继承旧搜索或草稿；新 Provider 在作用域清理完成前不发起
查询，避免短暂携带旧搜索、页码或选中 ID。定向回归 23/23，Chromium 两视口
共 12 条路径通过，失败回放与验证边界见
`../evidence/relation-picker-dismissal-20261021.md`。这只关闭本地关闭路径
与作用域清理契约，不关闭真实 Provider 授权、跨浏览器、读屏或完整关系
选择器验收。

2026-10-22 补齐 RelationPicker 搜索模式切换：关闭搜索清理防抖、条件、页码与
累积结果，但保留当前选择草稿；作用域使用字段比较，查询在模式同步完成后才
启用，避免发送旧页码请求。定向测试 26/26，另覆盖同一 Provider 对象切换
`dataProviderName` 时的草稿和作用域清理，见
`../evidence/relation-picker-search-mode-20261022.md`。该场景已在 Chromium、
WebKit 的两视口、两搜索阶段及缓存/重新读取矩阵下通过 16/16，并记录截图；
Firefox、读屏与真实 Provider 仍未验收，不外推为完整关系选择器认证。随后接入
统一 enterprise 源码消费者 fixture，补齐真实 Dialog 的分页草稿、搜索输入、
取消不提交、重开清理和 Provider/tenant 作用域替换；Chromium/WebKit/Firefox
三引擎两视口共 6/6，证据见 `../evidence/relation-picker-cross-browser-20261022.md`。
这关闭当前关系选择器基础消费者路径和 Firefox 回归，不关闭真实 Provider 授权、
服务端查询一致性、读屏或完整异步关系选择器验收。

Cascader 续接补充了已展开面板的禁用保护：组件禁用或祖先节点禁用后，
后代选项同步禁用，不能通过旧面板提交；清空入口改为带名称的独立图标按钮，
清空后收起并回焦触发按钮；窄视口面板宽度受限，列在面板内部横向滚动。
定向回归 11/11，Chromium 两视口 10 条路径通过，证据见
`../evidence/cascader-disabled-contract-20261021.md`。这只关闭本地禁用与清空
契约，不关闭完整级联键盘导航、异步级联、跨浏览器、读屏或真实权限验收。

上传组件续接补充了原生表单一致性：选择与拖放共用类型/大小校验，非法文件
不占名额；分批选择、移除和拒绝替换后，`input.files`、`FormData` 与队列一致。
原生重置清空队列，被取消的重置保持原状，同栈重新选择不恢复旧附件；
异步上传继续独立于原生 multipart 与 reset。新定向测试 22/22，既有主测试
28/28、重入测试 5/5，Chromium 两视口 14 条路径通过，证据见
`../evidence/file-upload-native-contract-20261021.md`。这不关闭 ImportDropzone、
FileList、完整上传无障碍/国际化、跨浏览器或真实存储会话验收。

ImportDropzone 随后补齐了选择与拖放的统一导入入口：保留选择即导入的公开
语义，去除重复确认入口；默认单文件，可显式开启多文件；输入类型、数量校验
失败不调用宿主；Promise 导入处理中锁定入口，失败提供通用错误与可重试按钮，
处理器替换和卸载隔离迟到回执。定向测试 21/21，Chromium 两视口 12/12，
证据见 `../evidence/import-dropzone-contract-20261021.md`。这只覆盖 Dropzone
本地交互，不关闭 FileList 的下载/移除闭环、导入任务持久化、读屏与真实服务端
验收。随后接入真实源码消费者夹具，补充原生文件 input 的有效选择、重复选择
锁定、类型拒绝、失败重试、宿主表单隔离和处理器替换后的迟到回执；Chromium/
WebKit/Firefox 三引擎两视口共 18/18，证据见
`../evidence/import-dropzone-cross-browser-20261022.md`。这关闭本地组件、
源码消费者和跨浏览器文件输入/键盘反馈契约，不关闭真实导入接口、解析安全、
任务持久化、权限/租户隔离、屏幕阅读器或消费者发布验收。

FileList 随后补齐了宿主回调式附件操作：新增可选预览入口；下载、预览、移除
按行独立互斥，异步失败显示通用错误并恢复操作；显式 DataState 优先，旧行、
旧回调和卸载后的迟到回执被隔离，组件不直接消费 URL 或擅自删除文件。定向测试
26/26，另修复重复业务 ID 的 keyed each 冲突并记录重复 ID 重排边界；
Chromium 两视口 12/12，证据见
`../evidence/file-list-actions-20261021.md`。随后接入真实源码消费者夹具，补齐
键盘触发、同行互斥、失败重试、文件替换后的迟到回执、重排与重复 ID 场景；
Chromium/WebKit/Firefox 三引擎两视口共 36/36，见
`../evidence/file-list-cross-browser-20261022.md`。这只关闭本地行级交互、
真实源码消费者和跨浏览器布局/键盘契约，不关闭真实下载签名、预览渲染、服务端
删除、审计、权限/租户隔离、屏幕阅读器或消费者发布验收。

ErrorSummary 已补齐默认名称、多实例标题关联、同字段多错误与动态翻译；
定向单文件测试 8/8，通过重复字段用例复现并修复了 `each_key_duplicate`。
上一轮未经执行的 4/4 声明已撤回，证据见
`../evidence/form-error-summary-contract-20261021.md`。DOM 属性不等于读屏播报
验收；完整 FormField 帮助文本、读屏软件、跨浏览器和消费者发布仍待验收。

FieldRenderer 随后分离了业务字段键与内置控件 DOM ID：多实例标签、选项组和
日期范围两端不再共享字段键 ID；原生提交 `name` 不变，支持显式 `id`，
自定义 children 保持既有默认目标。定向单文件 27/27，证据见
`../evidence/form-field-identity-20261021.md`。这不关闭无 ID 接口的复合控件、
自定义内容隔离、帮助文本、真实读屏或消费者发布验收。

帮助文本续接新增可选 `FieldDefinition.description`，以纯文本渲染并使用实例级
ID，与既有 errorId 合并；默认控件 ID 不再拼业务键，避免 `description` / `label`
字段与内部语义节点碰撞。同一表单定向文件扩展为 47/47，证据见
`../evidence/form-field-description-20261021.md`。无描述接口的复合控件及实际
读屏仍未验收，不将局部支持视为整个 FormField 规范完成。

上传字段后续已接入名称、说明/错误关联和无效状态，禁用选择入口拦截点击与键盘；
定向单文件 10/10，包括反馈更新时原生提交值不变和动态禁用恢复。证据见
`../evidence/file-upload-field-feedback-20261021.md`。其他复合控件和真实读屏仍待验收。

2026-10-22 又统一 FileUpload 的操作名称、状态和拒绝原因展示，错误区不再直接
输出宿主异常文本；保留 `UploadItem.error` 与 `onReject` 的既有机器契约。上传主
测试 36/36、生命周期回归 9/9，证据见
`../evidence/file-upload-i18n-20261022.md`。这只关闭本地文案与错误脱敏，不关闭
真实存储、读屏、跨浏览器或消费者国际化验收。随后接入真实源码消费者夹具，
验证上传中取消、取消后重试、旧上传结果隔离、类型/大小拒绝、宿主表单隔离和
窄屏无横向溢出；Chromium/WebKit/Firefox 三引擎两视口共 12/12，证据见
`../evidence/file-upload-cross-browser-20261022.md`。这关闭 FileUpload 的源码
消费者和跨浏览器基本操作契约，不关闭真实存储、multipart、服务端清理幂等、
并发冲突、权限/租户隔离、屏幕阅读器或发布验收。

2026-10-22 续接修复了失败尝试的临时会话回收：已登记 `uploadId` 的上传在失败后
不再于 `finally` 丢失尝试上下文，移除、单文件替换、作用域替换和卸载会以原
尝试捕获的回调分别按 `remove`/`replace`/`scope-change`/`unmount` 回收一次；
重试前先按 `replace` 回收旧失败会话，再以新幂等键上传，迟到回收不污染新尝试。
成功附件不进入回收路径。审查退回后补充成功通知守卫：宿主在 success 的
`onChange` 中同步卸载或同步抛错时，成功尝试仍不会被 `cancelUpload` 回收，
也不会进入待回收集合。重试只发起异步回收，不等待回收完成即开始新上传。
上传单文件 45/45，证据见
`../evidence/file-upload-failed-cleanup-20261022.md`。这只关闭宿主回调生命周期
契约，不关闭真实后端回收、鉴权、持久化清理、跨标签页或生产清理验收。

2026-10-22 又补齐 TaskQueueDrawer 对可选任务列表能力的反馈：缺少 `list` 或
`listDlq` 时不再误显示空列表，关闭对应查询、刷新和筛选，隐藏旧记录/数量并
给出明确的服务能力提示；Provider 替换后恢复列表。定向测试 34/34，证据见
`../evidence/task-queue-capabilities-20261022.md`。这只关闭组件本地能力门禁，
不关闭真实 Provider、浏览器、读屏、持久化任务恢复或发布验收。

任务提交随后也统一为通用本地化失败提示，空 Error 不再隐藏错误；三类异常
均保留名称/JSON 草稿，失败不刷新列表，再次成功后关闭表单并刷新。
TaskQueueDrawer 同一文件最终 37/37，见
`../evidence/task-submit-error-feedback-20261022.md`。mock 提交回归不证明真实
Provider 幂等、持久化或浏览器验收。

审批操作随后统一通过、驳回、转交的异常反馈，三类失败不泄露 Provider 诊断，
保留审批意见/原因/目标并支持重试；定向回归 13/13，见
`../evidence/approval-action-error-feedback-20261022.md`。这只关闭审批卡片本地
反馈契约，不关闭真实审批权限、并发冲突、服务端状态迁移、浏览器或读屏验收。

角色权限设置随后补齐读取/保存失败反馈与显式 Retry，避免权限读取失败自动循环，
缺少能力时锁定操作；同时修复原生角色下拉未向父级传播导致权限不切换的问题。
定向回归 13/13，见 `../evidence/roles-settings-feedback-20261022.md`。这只关闭
本地 RBAC 页面状态与切换契约，不关闭真实授权边界、并发冲突、浏览器、读屏或发布验收。

随后补齐真实 RolesSettings 消费者浏览器夹具：角色读取失败重试、权限读取期间
不显示未知授权、失败保留角色选择区、保存失败回读、角色切换后旧请求迟到失败
隔离；Chromium/WebKit/Firefox × 桌面/窄屏 **12/12**。证据见
`../evidence/roles-settings-feedback-20261022.md`。该夹具使用本地可控 Provider，
仍不关闭真实 RBAC、屏幕阅读器、并发冲突或发布验收。

RolesSettings 浏览器专项随后增加缺少权限读取能力路径：显示明确能力提示，
保留角色选择入口，无授权操作或 Retry，切换角色不触发额外读取/写入。
完整专属配置重跑 **18/18**，仍仅为本地 Provider 夹具证据。

继续分别验证 Provider/tenant 替换下的旧权限请求迟到成功与失败；使用相同角色
ID、不同授权，确保新角色和权限不被旧回执污染，无额外 Toast 或读写。
专属浏览器配置 **42/42**，不包含在途写入或真实服务端租户授权证明。

随后补齐在途保存替换：旧写成功/失败先于新写完成，新写仍锁定、不被旧响应
触发回读或 Toast，完成新写后恢复；Provider/tenant 分别验证。
专属配置最终 **66/66**，不等同后端取消、原子写入或跨用户并发冲突验收。

树与级联选择器续接已将标签、说明/错误关联传到实际触发按钮，并补面板 dialog
语义、实例 ID、打开/关闭关联、动态显式 ID 与 Escape 焦点恢复。同一单文件
13/13，证据见 `../evidence/hierarchical-field-feedback-20261021.md`；
仍不关闭 AutoForm 首错聚焦、其他复合控件、原生提交或真实浏览器/读屏验收。

数组字段续接已补齐父级说明/错误关联、实例分组命名和禁用传播；禁用时阻止增删、
嵌套字段修改并退出隐藏 JSON 的原生提交，恢复后回归最新受控值。定向测试
8/8，证据见 `../evidence/array-field-feedback-20261021.md`。随后补齐上下移动、
边界禁用、移动行输入/附件归属、外部替换隔离和嵌套外层 JSON 提交，定向测试
22/22，Chromium 两视口 10/10，包含普通 `$state` 宿主、真实受控宿主的单次通知、
文件字节和替换隔离，
证据见 `../evidence/array-row-reorder-20261021.md`。拖拽排序、服务端排序、
multipart 行索引、跨浏览器/读屏和整体批次验收仍待完成。

Transfer 续接完成字段 group/说明/错误/禁用语义、面板全选命名、禁用与单项禁用
守卫、行与复选框事件隔离、键盘选择、受控数据变化后的选中集合清理，以及
搜索开关清理和双侧输入命名；定向测试 26/26，Chromium/WebKit 两视口左右矩阵
8/8，证据见 `../evidence/transfer-field-feedback-20261021.md`。
关系选择器和真实读屏仍待验收。

关系字段反馈续接已验证外层 label、说明/错误更新、菜单及焦点保持，并修复
单选/多选 hidden input 的 disabled 提交边界。ComboboxField 重置、缓存与防抖
改用作用域字段比较，避免纯反馈更新误清理。定向字段契约 7/7，独立复核无
明确 P0/P1/P2，见 `../evidence/relation-field-feedback-20261021.md`。
该结果不关闭完整 FormField、浏览器或读屏验收。

复合选择字段随后补齐了 `FieldRenderer` 的原生 FormData 契约：树选择单选使用
业务 key 标量，多选和穿梭框使用重复 `key[]`，级联路径使用单个 JSON 字段；
禁用期间不提交，恢复后使用最新受控值。定向测试 12/12，相邻层级、Transfer
及字段契约回归 33/33，证据见
`../evidence/compound-field-native-contract-20261021.md`。这只关闭本地原生
提交编码，不关闭服务端解码、真实浏览器/读屏或消费者发布验收。
同类续接又修复 Boolean、Images、Tags、Rate 隐藏值的 disabled 传播，
同一字段测试最终 17/17，Tags 既有文件 3/3；两者合计 20/20。
复杂嵌套提交仍待验收。

AutoForm 复合字段首错聚焦随后已按顶层字段容器和页面 DOM 顺序修复，不再只查
`aria-invalid`；会跳过 hidden、disabled、inert、`aria-disabled` 和不可用
fieldset 控件，并保留首个 legend 例外。新增定向测试 14/14，AutoForm 可访问性
与表单契约回归 148/148，证据见
`../evidence/auto-form-compound-focus-20261021.md`。这只关闭本地 DOM 聚焦
契约，真实浏览器、读屏、富文本编辑器和消费者发布验收仍待完成。

已注册富文本编辑器分支随后完成本地字段契约：实际 Tiptap contenteditable 接收
实例 ID、字段标签、说明/错误和必填语义；反馈更新不重建编辑器或丢失选区，
disabled 隐藏值退出 FormData、工具栏/浮动菜单隐藏，Lazy 包装器不制造重复 ID；
preset/扩展配置变化仍可重建。随后补充 drop/paste 异步生命周期，旧回执在禁用、
恢复、只读、preset 重建、卸载和处理器替换后均被丢弃，恢复后的新上传仍可写入。
真实 Tiptap 定向测试 20/20、editor 构建通过、Lazy 回归 1/1，证据见
`../evidence/richtext-field-contract-20261021.md`。这只关闭本地组件契约，
独立复核确认本地上传回执 P2 已关闭。工具栏上传子组件、真实浏览器、读屏、
上传服务或消费者发布验收仍待完成。

工具栏 ImageUpload 随后补齐请求代际、关闭/重开、禁用/恢复、handler 替换及
实例销毁隔离，并锁定上传期间的重复操作与模式切换；随后增加通用失败反馈和
剩余队列显式重试。真实 Tiptap 单文件最终 41/41，见
`../evidence/toolbar-upload-lifecycle-20261021.md` 和
`../evidence/toolbar-upload-retry-20261021.md`。这不关闭主编辑区 drop/paste
失败恢复、真实服务端取消/清理、浏览器或读屏验收。

复杂嵌套数组的可序列化值随后统一由外层 JSON 原生提交，内部字段保留编辑和
校验，不再以子字段名重复提交；独立 ArrayField 和原始 File 二进制通道保留。
定向文件最终 11/11，独立复核无新增阻塞，见
`../evidence/nested-array-native-contract-20261021.md`。多行附件按行归属、
重排、后端解码和真实浏览器/读屏仍未验收。

主编辑区 drop/paste 随后补齐本地上传任务反馈、单项重试及本地移除；同步抛错与
Promise 拒绝均被捕获，任务按编辑器实例/代际隔离，宿主正文替换清除旧任务，
插入点与原粘贴选区随主交易及追加交易映射，多任务反序完成也保持各自锚点。
单文件当前 72/72，证据见
`../evidence/editor-upload-recovery-20261021.md`。移除不等于服务端取消；
真实浏览器、读屏、临时文件回收和消费者发布验收仍待完成。

编辑器 Props 随后提升为可命名的公开 `EditorProps`，并从包入口导出；编辑器、
UI 和示例依赖顺序构建成功，懒加载消费者的不可命名 Props 警告消失。既有
`import.meta.env`、大 chunk 和 KaTeX 导入提示仍未处理，不能把此次构建等同于
完整消费者发布验收。

批量操作栏续接补齐默认中英文语义、总数选择计数、区域无障碍名称和处理中
状态：处理中保留选择上下文、锁定清除并将自定义动作区设为 `inert`，恢复后
继续操作；清除按钮显式不提交原生表单；稳定播报节点位于 busy 区域外。
定向测试 15/15，默认布局 Chromium 两视口的鼠标/键盘禁用恢复与语言切换通过，
证据见
`../evidence/batch-action-bar-contract-20261021.md`。这只关闭公共操作栏本地
交互与语言契约，不关闭 AutoTable 服务端幂等、部分成功、取消、跨页全选协议、
读屏或完整批次三验收。

AutoTable 已复用公共批量操作栏：保留 `data-svadmin-batch-toolbar`、权限与
数字主键行为，并覆盖显式选择 pending、失败保留、部分失败和全量匹配归零后
清除；单条删除不会误显示批量栏。删除模型新增筛选条件代际隔离，旧请求在筛选
变化后仍完成但不再改写新上下文的选择或错误状态。定向测试分别为
`auto-table-interactions` 48/48 与 `list-deletion` 27/27，证据见
`../evidence/auto-table-batch-toolbar-20261021.md` 和
`../evidence/list-deletion-criteria-isolation-20261021.md`。这仍不关闭服务端
幂等、真实取消、跨页全选服务协议、浏览器/读屏或发布验收。

Cascader 随后补齐列内上下/Home/End、右键进入子列、左键返回父级和顶层关闭
回焦；方向键浏览不提交，Enter/Space 仍保留按钮激活，实例间面板查询互不串扰。
定向测试 16/16，Chromium 1440x900 与 390x844 键盘流程通过，证据见
`../evidence/cascader-keyboard-20261021.md`。这只关闭本地键盘路径，不关闭
异步级联、跨浏览器、读屏或真实权限验收。

2026-10-22 进一步统一 Cascader 显式叶节点的路径边界：残留 children 不再
生成后代列或路径标签，已展开分支变成叶节点后立即移除后代列，宿主受控值不被
自动改写。定向测试 18/18，新增两例在旧实现下失败，证据见
`../evidence/cascader-leaf-boundary-20261022.md`；新增场景浏览器截图与焦点
恢复仍未验收，不沿用旧键盘浏览器结果充当新场景证明。

TreeSelect 随后修复了预展开节点只能展开、不能由用户折叠的问题：引入实例内
展开覆盖表，保留宿主 `expanded` 作为初始状态；搜索自动展开结束后恢复用户状态，
外部树替换清理旧覆盖，内部懒加载不重置其他分支，禁用节点不能通过键盘折叠绕过
守卫。随后补齐节点及祖先禁用期间的异步退休：旧 loads、busy、错误和级联选择
尝试不能越过禁用边界，恢复后新请求仍可继续。定向测试 60/60，证据见
`../evidence/tree-select-expansion-20261021.md` 与
`../evidence/tree-select-disabled-load-20261022.md`。复核又补出嵌套父级选择中
子节点禁用可能误报失败的边界，最终定向测试 62/62；这只关闭展开和节点异步
生命周期的本地契约，不关闭真实 Provider 权限、跨浏览器、读屏或完整树验收。

InfiniteList 随后修复了按分页索引复用行 DOM 的问题：刷新重排时草稿跟随带类型
的业务 ID，记录替换不会继承旧行状态；跨页重复 ID 使用出现序号保持全部 Provider
记录而不产生重复 key；资源、租户和 Provider 实例作用域变化时，即使返回相同 ID，
也不会复用上一作用域的行 DOM。定向契约测试 58/58，旧索引 key 回放可稳定复现
刷新重排与记录替换失败，证据见 `../evidence/infinite-list-row-identity-20261021.md`。
这只关闭本地行身份契约，不关闭跨浏览器、读屏或真实 Provider 性能验收。

API Settings 后续修复读取、创建密钥/Webhook、撤销密钥和删除 Webhook 的
原始异常展示：页面和通知统一使用本地化通用失败文案，读取失败以状态标记
保存；失败保留草稿/记录并可重新操作。安全专项单文件 16/16，见
`../evidence/api-settings-error-feedback-20261022.md`。这不关闭设置页整体
真实 Provider、浏览器/读屏或发布验收。后续将密钥和 Webhook 的共享读取
状态提升到主内容区：加载/失败不显示空态，错误只保留一个重试入口，恢复后
显示实际结果。安全专项 18/18、Enterprise Provider 11/11；Chromium 4/4，
WebKit/Firefox 桌面与窄屏共 8/8。证据见
`../evidence/api-settings-error-feedback-20261022.md`。仍不关闭真实
CredentialProvider、内置 Toast 读屏或发布验收。

Security Settings 后续统一安全读取、MFA、密码和会话撤销的失败反馈，不再透传
Provider 原始诊断；保留本地密码校验、取消不写入、失败保持与成功重试。
安全专项单文件 23/23，见 `../evidence/security-settings-error-feedback-20261022.md`。
这不关闭 MFA 能力状态、并发保护、真实 Provider、浏览器/读屏或发布验收。

NotificationsSettings 后续将读取/保存错误改为状态标记和通用本地化文案；
空异常不再丢失反馈，读取失败阻断编辑，保存失败保留草稿并支持再次保存。
单文件补齐局部中英文往返后为 20/20：读取/保存错误随语言更新，切换不增加
请求、不丢失编辑值，保存重试仍携带原草稿。见
`../evidence/notification-settings-error-feedback-20261022.md`；
真实存储、浏览器/读屏、全局国际化和发布验收仍待完成。

MemberDirectory 随后统一读取/邀请失败反馈；空异常读取失败不误报空目录，
邀请失败保留邮箱，本地格式校验不被旧通用错误遮盖，修正后仍可成功。
又补齐发送期间重试门禁和 Provider 替换下的迟到邀请隔离，单文件 26/26，见
`../evidence/member-directory-error-feedback-20261022.md`。
真实目录服务、浏览器/读屏、语言切换和发布验收仍待完成。

CompanyProfilePage 随后统一组织资料读取/保存失败反馈；三类异常均不泄露原文，
读取失败可重试，保存失败保留编辑值并可再次成功。随后补齐组织名称字段实例 ID，
并验证双实例 label focus、草稿和 Provider 写入隔离；builtin PM 单文件 33/33，
浏览器配置 4/4（桌面/窄屏），见 `../evidence/company-profile-error-feedback-20261022.md`。
这不关闭复合 Enterprise Settings 页面、真实组织 Provider、读屏、语言切换或发布验收。

## 原始计划（2026-09-19）

基线：`ee01ea0b52285bd3129447cd0b2ddb0c114f45ce`（2026-09-19）。
来源：用户批准执行企业级 UI 补全方案。当前批次不代表整个路线图完成。

## 任务约定

- 目标：先修复查询、表单与电子表格中的数据正确性问题，再按下表推进企业组件能力。
- 保持 Svelte 5、现有公开入口、Tailwind recipes/原生 CSS 和预生成样式分发；不引入 TSX、第二套 Provider 或任意 AI 执行接口。
- 写入范围：独立分支上的 UI 正确性实现、对应测试与本验收文档。不修改默认表格引擎、Surface 写权限、依赖锁、发布流程或生产数据。
- 协调：单写入者；风险为 medium；managed 验证计划。当前会话没有可调度的独立审查进程，记录为 interruption_recovery：独立审查待 PR 完成，不将自动测试冒充独立人工审查。
- 验证顺序：纯函数边界测试 → 组件回归 → 仓库类型/构建/样式/应用测试。未执行的验证必须明确列出。
- 交付：独立 PR；不自动合并、发版或部署。

## 批次一：正确性（原始执行范围）

| 能力 | 验收要求 | 初始状态 |
| --- | --- | --- |
| FilterBuilder | 嵌套 AND/OR 可往返；无效/不可编辑条件不得被静默丢弃；类型化条件值；深度与数量限制 | 实施中 |
| JsonSchemaForm | 展示和提交共享默认值；数值枚举不变成字符串；清空数字不变为零；验证失败不能提交 | 实施中 |
| SpreadsheetView | 移除动态代码求值；公式循环、错误、非法语法和资源上限有确定结果 | 实施中 |
| 回归与兼容 | 保留现有入口；增加正反向测试；记录验证证据及未通过项 | 待验证 |

批次一的门禁按上表原始正确性范围执行：SpreadsheetView 不以完整公式引擎或完整
Excel 兼容作为批次一门禁，它们属于按需 B4-02；DatePicker/DateRangePicker 的
自绘完整日历不是原始明确要求，不作为必需门禁；完整时区等无界要求也不作为
无限补 case 的依据。

## 后续能力台账（2026-09-19 初始状态，不是当前缺口判定）

| 批次 | 能力 | 对标方向 | 状态 |
| --- | --- | --- | --- |
| 2 | NumberInput / MoneyInput / PercentInput | 精度、区域格式、空值与零、字段契约 | 区域格式最小契约已实施（三种显式 locale，三引擎两视口 30/30）；读屏/发布/部署待外部验收 |
| 2 | DatePicker / DateRangePicker | 日期/范围、禁用日期、快捷范围、键盘 | 待实施 |
| 2 | TimePicker / DateTimePicker | 时间点、时区、跨日、输入与展示一致 | 待实施 |
| 2 | RadioGroup / SegmentedControl | 选择与导航语义、键盘与禁用状态 | 待实施 |
| 2 | 异步 Select / MultiSelect / AutoComplete | 搜索取消、分页、虚拟化、选中回显 | 待实施 |
| 2 | Tree / TreeSelect / Cascader | 异步树、半选、父子策略、完整键盘路径 | 待实施 |
| 2 | 实体与关系选择器 | 跨页选择、资源授权、租户切换隔离 | 待实施 |
| 2 | Upload / Dropzone / FileList | 会话、进度、取消、重试、预览 | 待实施 |
| 2 | FormField / ErrorSummary | 帮助/错误关联、焦点、统一布局 | 待实施 |
| 2 | 表单引擎统一 | AutoForm、分步、弹窗、抽屉、动态列表共享状态与校验 | 待实施 |
| 2 | 完整 Schema 表单 | 嵌套、数组、条件与外部引用的受控适配 | 待实施 |
| 3 | 资源数据工作台 | 查询、选择、详情、编辑、恢复和权限成品封装 | 待实施 |
| 3 | 共享视图 | 个人/团队/系统作用域、默认视图、失效字段 | 待实施 |
| 3 | 导入导出中心 | 预校验、试运行、任务持久化、全量导出、失败报告 | 部分实现（本地预校验与 dry-run；服务端任务/全量导出待实施） |
| 3 | 批量操作 | 已选/当前页/全部匹配范围、部分成功、幂等与取消 | 待实施 |
| 3 | 详情工作台 | 关联、附件、活动、审计、版本差异 | 待实施 |
| 3 | 权限与组织管理 | 继承、拒绝原因、字段权限、服务端边界 | 待实施 |
| 3 | 审批中心 | 待办、历史、意见、状态迁移与冲突 | 待实施 |
| 3 | 任务与通知中心 | 刷新恢复、任务状态、重试和取消能力声明 | 待实施 |
| 3 | 多标签工作区 | 路由/查询/草稿/滚动恢复、关闭保护与淘汰 | 待实施 |
| 3 | 仪表盘 | 全局筛选、时间范围、钻取与错误状态 | 待实施 |
| 4 | Kanban / Scheduler / Gantt | 领域级交互与可替换引擎 | 按需扩展 |
| 4 | Pivot / Spreadsheet | 服务端聚合、完整公式引擎、许可和包体积 | 按需扩展 |
| 4 | Workflow / DecisionTable | 版本、发布、模拟、审计、执行结果 | 按需扩展 |
| 4 | 富文本/代码/文档 | 大内容、安全、版本、只读与编辑边界 | 按需扩展 |

### 当前状态索引（2026-10-23）

上表保留 2026-09-19 的初始台账，不作为当前完成判定。当前复核口径如下：

- B2-01、B2-04、B2-05、B2-06、B2-10 与 B3-03 的本地子范围已有直接测试或浏览器证据；
  B2-06 当前采用纯叶子值级联，B2-10 已覆盖表单 reset、提交状态、关闭保护、
  旧回执隔离和 `aria-busy`，B3-03 的 dry-run 仍是客户端预检，不是服务端试运行。
- B2-11 已验证 `$ref`、`oneOf`、外部 URI 等输入 fail-closed；受控引用解析仍需
  产品/安全契约，不能把拒绝证据当作完整 Schema 支持。
- B3-01、B3-02、B3-03、B3-05、B3-08、B3-09 的受控本地路径已有部分或完整证据；
  真实 Provider/RBAC/租户、版本历史模型、标签淘汰策略、持久化、读屏、发布和部署
  仍按 `docs/evaluations/enterprise-ui-remaining-20261023.md` 及验收矩阵分别处理。
- B2-09 的错误摘要、字段级说明/错误 IDREF、数组父级分组与行身份已有定向证据；
  但行级/子字段错误需要新的错误路径模型，不能在无消费者契约时凭空新增
  `rowErrors` 或索引格式；复合控件全矩阵、完整 Tab、真实读屏、服务端错误映射和
  发布仍未关闭。
- B3-08 的任务列表/DLQ 与通知偏好本地状态、错误恢复、Provider 切换和实例隔离
  已有定向证据；任务持久化、业务取消与传输层取消、通知存储一致性、真实权限/
  租户隔离、读屏、发布和部署仍由 Provider/服务端及外部验收负责。
- B3-10 的 Dashboard 查询、筛选/时间范围 URL 恢复、错误重试、迟到响应隔离和
  metric/text 钻取已有本地及受控消费者证据；真实聚合口径、网络取消、错误码、
  RBAC/租户、SSR/持久化、读屏、发布和部署仍未关闭。
- 未经产品确认，不新增 TreeSelect 的父值/strict 模式、Schema resolver、版本
  `VersionProvider` 或多标签 `maxTabs/LRU` 公共 API。

## 通用完成标准

每项至少记录：公开 API、数据正确性、加载/失败/重试、权限/身份/租户隔离、键盘和屏幕阅读器、国际化、性能场景、真实消费者构建、许可、对应提交的测试证据。

存在组件文件不等于完成企业级验收。SVAR 已合并，不重复接入；已加载记录导出不等于服务端全量导出。Surface 保持其受控协议边界。

### 2026-10-22 角色权限管理补充

RolesSettings 已补齐读取状态边界：角色和权限分别使用 loading、error/retry
与可编辑态；读取未完成时不再渲染具有误导性的空角色或全未勾选矩阵，权限读取
失败时保留角色选择区并隐藏权限操作按钮。保存失败后的权限回读也不复用旧按钮
节点，只有成功回读后才恢复操作。

本轮直接测试为 `scoped-provider-actions.test.svelte.ts` 20/20 与
`permission-matrix.test.svelte.ts` 5/5。该结果只覆盖本地 Provider stub 和组件
契约，不关闭真实 Provider、读屏、跨浏览器、并发冲突或发布验收。

## 原始验证记录

制定本计划时尚未声明任何新增代码或整仓回归通过。2026-10-21 的局部复核
记录见本文开头；未覆盖的验收仍保持未完成，不由新测试计数自动关闭。

2026-10-22 Cascader 异步真实源码消费者续接：保留原静态两场景，新增
`async=true` fixture 模式，通过公开 `hasChildren`/`loadChildren` 由宿主控制
resolve/reject 与祖先原地 disabled。三引擎两视口覆盖键盘 Right 加载与共享
单请求、失败通用提示及键盘 Retry、原地禁用作废旧响应且新结果不被覆盖；
必需 30/30 真实通过，另有 6 个 `test.fail` 保留键盘 Retry 成功后焦点仍留在
父项的组件缺口（三引擎两视口均复现）。`git diff --check` 通过；未跑全仓、
组件单测、typecheck、build 或发布。见
`../evidence/cascader-async-loading-20261022.md`。该结果不关闭真实读屏、
请求取消/超时、真实 Provider、完整交互矩阵或发布验收。

2026-10-22 Cascader 键盘 Retry 焦点归属修复：先新增“加载态替换聚焦 Retry”
组件回归，旧实现 **1 failed / 42 passed**，修复后 **43/43 通过**；随后将
`cascader.spec.ts` 的独立 `test.fail` 转正且不降低断言。三引擎两视口
Playwright 达到 **36/36 正常通过**（原必需 30/30 加 6 个原预期失败的焦点
回归全部真实通过），键盘 Retry 焦点场景 6/6。`git diff --check` 通过；未跑
全仓、typecheck、build 或发布。详见
`../evidence/cascader-async-loading-20261022.md`。该结果不关闭真实读屏、
请求取消/超时、真实 Provider、完整交互矩阵或发布验收。

2026-10-22 RelationPicker 第二页失败恢复：新增多选草稿跨页失败/重试用例，第二页
失败时只显示通用错误、Confirm 禁用且不提交、草稿保留；Retry 成功后两页记录
可用、原草稿仍勾选，Confirm 精确提交一次 `[1,2]`，恢复后 Cancel/Escape 不提交。
单文件组件测试 **31/31**；专属 Playwright 矩阵 **24/24**（4 场景 × 三引擎 ×
两视口），包含真实键盘在重试在途时重复激活不产生第二页重复请求或误提交。
排查中的首轮红色来自测试持有已卸载节点，非产品缺陷；同一 tick 双激活探针在
无生产加固时也通过，故本轮未修改 `RelationPicker.svelte`。`git diff --check`
通过；未跑全仓、typecheck、build 或发布。见
`../evidence/relation-picker-page-recovery-20261022.md`。该结果不关闭真实
Provider/授权、请求取消或超时、读屏、完整交互矩阵或发布验收。

### 2026-10-22 ComboboxField 关闭搜索生命周期补充

ComboboxField 将 Escape、触发器、焦点离开、外部点击和禁用关闭统一收敛到
`closeMenu` → `resetSearch`：取消未执行的搜索 debounce，清空搜索输入与
已应用查询，页数回到 1，并丢弃累计选项；关闭不调用 `onchange`，宿主
`value` 和多选已确认值保持不变。重开从空搜索第一页开始，延迟 apply 增加
打开状态、输入值、作用域和禁用校验；搜索在途的旧结果不可选，清空后恢复，
迟到旧响应由查询 key 与 loaded 作用域/搜索匹配隔离。

红测首轮 **7 failed / 34 passed**，其中 1 项为新增测试自身类型收窄错误；
产品侧 6 项覆盖 5 条关闭路由和已执行多页搜索重开。最小修复后单文件
`combobox-field.test.svelte.ts` **42/42 passed**。专属
`playwright.combobox.config.ts` 三引擎两视口 **24/24 passed**，fixture
提供真实分页与延迟旧搜索响应，按公开输入/关闭/重开 API 执行。
`git diff --check` 通过；未跑全仓、typecheck、build 或发布。本轮不承诺
外部真实 Provider 请求取消，不宣称网络请求已 `Abort`，不关闭真实
Provider/授权、读屏、完整交互矩阵或发布验收。见
`../evidence/combobox-search-dismissal-20261022.md`。

### 2026-10-22 日期与时间公开入口策略浏览器验收

四个日期/时间公开入口通过 `?view=date-time&policy=1` 接入真实源码消费者，
保留原 BindingHost civil/instant 场景。每个策略输入使用独立原生 form，断言
`checkValidity`、原生 submit 计数和精确 FormData，而不是只比较 UI 值。
覆盖 DatePicker `disabledDate` 保留无效 draft/旧 bound 并阻止提交、修正后只
提交新值；DateRangePicker 逆序拒绝与修正、限制快捷范围不可选、有效 preset
原子更新两端；DateTimePicker instant `America/Los_Angeles` 的
`2026-03-08T02:30` gap 拒绝及 `03:30` 提交 `10:30Z`，以及
`2026-11-01T01:30` fold 默认 reject 和宿主显式 earlier/later 分别提交
`08:30Z`/`09:30Z`。上述预期复用现有 core/date-time 确定值，未新增时区算法。

专属 `playwright.date-time.config.ts` 三引擎两视口 **30/30 passed**，其中旧
场景 12/12、新增策略场景 18/18；`git diff --check` 通过；未跑全仓、
typecheck、build 或发布。控件仍是原生 input 包装而非自绘日历，fixture stub
不代表真实后端。最终无失败；首轮唯一红测来自新增测试额外断言快捷选择后
select 复位占位值，与产品现状不符，该非验收断言已移除，必需断言未弱化。
见 `../evidence/date-time-policy-browser-20261022.md`。

### 2026-10-24 B3-09 多标签消费者当前补记

#### 2026-10-26 生命周期矩阵复验

清理上一轮遗留的 fixture Vite 进程后，当前
`playwright.workspace-tabs.cross-browser.config.ts` 完整执行 **81/81 passed**，
exit `0`，耗时 **10.3m**，无 skip；Chromium/WebKit/Firefox desktop 各 **27/27**。
此前 77/78、78/78、15/15 等结果继续保留为历史阶段，不与本次重复累计。该结果
收口当前本地 workspace 生命周期、真实菜单 SPA、标签关闭/驱逐和刷新恢复的三引擎
矩阵；真实后端/Provider、生产 storage、跨窗口、读屏、发布部署与在线验收仍未关闭。

最终生产源码 UI 定向 build exit `0`（仅既有 `import.meta.env` 打包警告）；
build 结束后独立运行 workspace 专属 spec **12/12 passed**、exit `0`、约 1.2m，
12 项实际执行无 skip，为本轮最新浏览器结果（Chromium），与历史 12/12 分属
不同批次，不累计。局部类型检查纳入 svelte2tsx 虚拟源 `AutoTable`、
`DraggableHeader`、`AutoTableIdentityHydrationHost` 及真实源
`list-state.svelte.ts`、`saved-list-views.svelte.ts`、`saved-list-views.ts`，
在 strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess/
noPropertyAccessFromIndexSignature、`skipLibCheck:false` 下完整目标
syntactic + semantic 诊断总数为 **0**；此前 AutoTable 的 6 个 TS7006 是前轮
漏纳 `DraggableHeader` 虚拟源导致的类型丢失，不是基线错误。对应回归改为断言
完整目标 diagnostics 为 `[]`。真实 dirty 表单消费者已由后续
`AutoForm.onDirtyChange` 修正接入基础关闭保护；完整滚动边界、跨窗口、
真实后端/RBAC/存储、读屏与发布部署仍未验收，本文其余历史结论不变。
见 `../evidence/workspace-tabs-consumer-20261024.md`。
