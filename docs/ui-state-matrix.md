# UI State Matrix

行为或布局变更必须同时提供状态矩阵、真实视口截图和当前 diff 检查证据。

## DataState / WorkspaceQueryState

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Initial loading | 首次请求且没有可保留内容 | Skeleton，占位高度稳定 | 不渲染业务内容 |
| Background refresh | 已有内容，`isFetching && !isLoading` | 行内刷新状态，旧内容继续显示 | 不抢焦点，筛选和操作保持可用 |
| Empty | 首次请求完成但没有记录 | 初始空态 | 提供创建或导入入口 |
| Filtered empty | 有活动筛选但无匹配 | 筛选空态 | 提供清除或调整筛选 |
| Error | 请求失败且没有当前结果 | `DataState error` | 只通过 `retry` 恢复 |
| Forbidden | 权限不足 | `DataState forbidden` | 不展示旧内容，不并列重试 |

`refreshing` 不是阻塞状态，不得清空当前列表或详情；`loading`、`error`、
`forbidden` 和初始 `empty` 仍然阻止后续业务布局，避免把旧数据伪装成当前结果。

## MediaThumbnail

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Empty | `src` 为空 | 语义化空态文字，不渲染图片外壳 | 不可放大 |
| Loading | `src` 有值且图片未完成加载 | 保持声明尺寸，显示加载指示 | 不可放大 |
| Error | 图片触发 `error` | 显示 ImageOff 和错误文案 | 不可放大 |
| Loaded | 图片触发 `load` | 显示实际媒体，不伪造占位图 | 可点击放大 |
| Preview | Loaded 后点击缩略图 | Dialog 展示完整媒体 | `Escape` 关闭并恢复焦点 |

## FilterToolbar

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Empty query | 查询为空 | 只显示搜索控件和主操作 | 清除按钮不渲染 |
| Query active | 查询非空 | 清除按钮与输入框同一行 | 点击清除恢复空查询 |
| Collapsed | 高级筛选关闭 | 高级容器卸载，不保留边距/背景 | `aria-expanded=false` |
| Expanded | 高级筛选打开 | 高级内容自适应，不固定高度 | `aria-controls` 指向面板 |
| Initial empty | 首次加载完成但资源没有记录 | 由页面使用 `DataState empty` 表达 | 提供创建、导入或配置入口 |
| Filtered empty | 已有筛选条件但没有匹配结果 | 由页面使用 `DataState filtered-empty` 表达 | 提供清除或调整筛选的恢复路径 |

## Button

| 状态 | 触发条件 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Enabled command | `disabledReason` 为空且 `disabled` 为假 | 主操作可点，无限制提示 | 点击提交命令 |
| Blocked command | `disabledReason` 非空 | 按钮禁用；原生 button/a 不接收 `disabledReason` 属性 | 悬停或聚焦显示原因，按钮不可提交 |
| Disabled without reason | 仅 `disabled` | 与现有禁用按钮相同 | 不额外包裹 tooltip |

`disabledReason` 非空时按钮必须禁用。禁用按钮本身 `pointer-events: none`，因此原因提示挂在外层触发器上，而不是让用户点到后端再看到 403。

链接式按钮禁用时同时阻止点击回调；原因清空后恢复跳转和回调。外层焦点继承 `aria-label` / `aria-labelledby`，图标按钮应提供操作名称。

存在禁用原因时，外层触发器成为 flex/grid 的直接子项。此时通过 `restrictionClass` / `restrictionStyle` 设置 `flex`、`grid-column` 等父级布局属性，`class` / `style` 仍控制内部按钮。需要在原因切换时保持同一布局的调用方，应使用稳定的外部布局容器；包装层布局属性仅在原因非空时生效。

## Collapsible containers

所有折叠容器必须使用 `.svadmin-collapsible` 或 `[data-svadmin-collapsible]` 状态钩子。未展开时清除外层 margin、padding、border、background 和 shadow；不得添加全局 `details:not([open])` 规则。展开时 summary 使用 4px 垂直内边距和 32px 最小高度，隐藏浏览器默认标记，并保留 `focus-visible` 轮廓；容器只保留 1px 底部分割线。侧栏折叠触发器使用 6px 垂直内边距，分组标题上边距为 8px。

## Browser evidence

`e2e/ui-state-contracts.spec.ts` 固定覆盖 `1440x900` 和 `1920x1080`，并验证媒体成功/失败/空态、预览关闭、筛选器展开/折叠、命令按钮启用/禁用原因、横向溢出和空态高度。测试始终在 `test-results/**/screenshots/` 生成按视口命名的截图产物。

当前基线证据保存在 `docs/evidence/ui-state/ui-state-matrix-1440x900.png` 和 `docs/evidence/ui-state/ui-state-matrix-1920x1080.png`，用于 PR 正文引用和后续人工对比。

## Repository audit

`scripts/ui-state-evidence-check.ts` 扫描 `example/src/pages`、`packages/ui/src/components` 和 `packages/lite/src/components`：不得直接拼装无所有者的 `<img>` 预览、不得出现未限定作用域的 `<details>`，也不得使用 160px 以上的固定最小高度制造空入口或空数据占位。看板、权限矩阵、对话框和可滚动编辑器等固定格式控件通过显式白名单保留尺寸约束；新增例外必须先说明交互所有权。

页面状态也必须有唯一归属：错误态的恢复入口由 `DataState` 的 `retry`
拥有，不在其旁边重复渲染独立重试按钮；工作台的主查询在 `loading`、
`error` 或初始 `empty` 时不渲染后续业务布局，局部队列可以在 ready 数据
内部拥有自己的空态。

完整 UI 使用 `MediaThumbnail`，SSR-first 的 `@svadmin/lite` 使用无跨包依赖的 `LiteMediaThumbnail`。详情字段与编辑字段不再分别维护图片加载和失败样式。

保留直接 `<img>` 的范围仅限明确的专用媒体所有者：头像、租户标识、标题图标和个人资料封面组件。它们具有不同的裁剪、上传或身份语义，不属于通用附件/证据预览，不能为了形式统一而错误抽象。

## MultiTabKeepAlive / WorkspaceTabState

标签栏组件只拥有标签选择/关闭交互；查询、滚动、草稿和路由归真实工作区容器。
`createWorkspaceTabStateAdapter` 是显式快照契约，不自动读取 DOM 或写浏览器存储。

| 状态 | 触发条件 | 恢复契约 | 隔离/清理契约 |
| --- | --- | --- | --- |
| Tab switch | 消费方切换标签 | 离开前 `capture`，进入后 `restore` 查询与滚动 | 快照键为租户 + 标签 id，恢复还要求 path 匹配 |
| Initial mount | 真实宿主首次挂载 | 按 active 标签从 storage 恢复查询与滚动 | 不依赖切换回调，恢复后仍受租户/标签/path 约束 |
| Draft tab | 适配器标记草稿 | 真实 `onbeforeclose` 拒绝关闭并保留标签 | 草稿标记清理后同一入口可再次关闭；布尔标记不等于正文恢复 |
| Persisted snapshot | 注入 storage 且新建适配器 | 完整信封和 query/scroll/draft 值类型严格匹配才恢复 | 脏值、非法 JSON、版本不符按未保存处理，不用 normalize 掩盖 |
| Closed tab | 标签关闭 | 不恢复旧查询/滚动，select/卸载不重建快照 | `clear` 返回持久化状态；删除失败时同一实例 tombstone 阻止回读，新实例仍可能回读 |
| Unmount | 消费者宿主卸载 | 先 capture 当前查询/滚动，再释放内存；新宿主同 scope 可恢复 | `dispose` 不删除 storage，持久化生命周期归 storage 所有者 |
| Scope mismatch | 同 id 换租户或 path | 不返回旧快照 | 防止旧标签状态串租户/标签 |
| Eviction | 标签数量上限 | 未实现 | 产品未给出上限、LRU 和固定标签优先级，不猜测 |

定向证据：`packages/ui/src/components/workspace-tab-state.test.svelte.ts` 使用真实
`MultiTabKeepAlive` 消费者宿主；结论与未验收边界见
`docs/evidence/multitab-state-restore-20261022.md`。另有专属真实浏览器 fixture
`scripts/fixtures/enterprise-ui/MultiTabStateBrowserFixture.svelte` 与
`multitab-state.spec.ts`（配置 `playwright.multitab-state.config.ts`），在 Chromium
desktop/narrow 挂载真实组件与适配器，注入带 `b3-09-fixture:` 前缀的受控 session
storage；覆盖两标签查询/滚动隔离、切回恢复、冻结标签后草稿关闭保护、关闭后重开不恢复
旧快照，截图位于 `output/playwright/multitab-state-browser-20261022/`。该 fixture 不是
真实产品路由、Provider 或生产 storage 验收。

## Surface 数据组件

适用于默认 metric、bar-chart、line-chart、resource-table 和内置 SVAR Grid，
不自动约束宿主自定义第三方 Widget。

| 状态 | 展示契约 | 恢复与请求契约 |
| --- | --- | --- |
| Provider 失败 | 单个组件内显示对应本地化不可用提示，不显示原始诊断 | 宿主通过 `refresh(sourceId)` 显式重试 |
| 权限拒绝 | 显示“无权访问”，不展示旧记录或旧 Grid | 拒绝期间不读取数据，重新授权后重新读取 |
| 权限检查异常 | 显示数据不可用，不伪装成确定的拒绝 | 保留原有核心错误归一化和回调契约 |
| 无效返回或绑定缺失 | 显示对应数据无效，不伪装为空数据或零 | 修复源数据或绑定后恢复 |
| 错误期间切换语言/标题 | 安全文案与标题响应变化 | 不产生额外读取，不重复上报同一错误 |
| 刷新途中撤权 | 立即隐藏旧记录与 Grid | 迟到结果不能恢复旧数据 |
| 查询恢复 | 移除错误并显示真实组件数据 | 失败重试不影响未指定的源；宿主负责提交中的入口禁用 |

Surface 包内定向测试验证分源重试和诊断回调；SVAR 的
`scripts/fixtures/svar-grid/surface.spec.ts` 使用真实引擎与受控 HTTP 响应，
验证首次/再次失败、恢复、撤权和重新授权。当前证据与未覆盖边界见
`docs/evidence/surface-query-feedback-20261021.md`。

## 数值公共入口

`NumberInput`、`MoneyInput`、`PercentInput` 必须在包装层保留 `bind:value`，
不能只透传 `value` 而让父级状态停留在旧值。

| 状态/动作 | 值契约 | 回调契约 |
| --- | --- | --- |
| 用户输入数字 | 父级同步为 `number`，金额保持原单位 | 每次输入一次 `onchange` |
| 用户清空 | 父级为 `null`，显示空输入 | 一次 `onchange(null)` |
| 用户输入零 | 父级为数字 `0`，显示零而不是空 | 一次 `onchange(0)` |
| 父级赋值/清空 | 控件响应父值，清空显示为空 | 不额外调用输入回调 |
| 百分比 `scale="1"` | 界面 `25` 对应父值 `0.25` | 不在包装层重复换算 |
| `precision` | 仅决定展示位数，夹取到 `0..20`；存储值不舍入 | 回调收到未舍入数值 |
| `step` 缺省 | 由精度推导 `10 ** -precision`；`scale="1"` 百分比为 `1` | 不在包装层改写用户输入 |
| 不传 `locale` | 保持原 `type="number"` 展示与解析 | 默认行为兼容，不启用区域格式 |
| `locale` 三值集合 | 仅 `en-US`/`de-DE`/`zh-CN`；展示使用 `Intl.NumberFormat` 千分位与区域小数符 | 解析剥离分组符，混合分隔符不写值、不回调、不泄露原始错误 |
| 区域编辑/失焦 | 聚焦展示无千分位编辑文本；失焦恢复区域格式；空串仍为 `null`，`0` 仍为零 | 父值同步不伪造回调；金额单位与百分比缩放不变 |
| 其他 locale / 输入法 / OS 剪贴板 | 未承诺；字段上的未支持 locale 回退默认路径 | 不把 `Intl` 支持范围自动视为已验收 |

当前包内及三视口浏览器证据见
`docs/evidence/numeric-input-binding-20261021.md`；精度、步进与非法值忽略的
源码契约复核见 `docs/evidence/numeric-input-contract-20261023.md`；显式 locale
展示/解析与真实浏览器三引擎两视口证据见
`docs/evidence/numeric-input-locale-20261023.md`。输入法组合输入、真实读屏和
操作系统剪贴板仍不由上述用例外推为已支持。

## Tour / Menu / Calendar / ResizeBox

交互组件必须同时覆盖鼠标、键盘和焦点恢复；只验证“能点击”不算完成。

| 组件 | 状态 | 键盘/焦点契约 | 恢复契约 |
| --- | --- | --- | --- |
| Tour | open / step change / finish / close | `Escape` 关闭，`ArrowLeft/Right` 切换步骤，`Tab` 在面板内循环 | 关闭后焦点回到打开前的元素，背景滚动恢复 |
| Tour | target missing | 居中展示面板，不伪造高亮框 | 目标出现后重新测量，不改变当前步骤 |
| Menu | expanded / collapsed | `ArrowUp/Down` 移动，`Home/End` 首尾，`ArrowRight` 展开，`ArrowLeft` 回到父级 | 折叠态子菜单在 hover/focus-within 时浮出 |
| Menu | disabled | 跳过禁用项，不接收焦点 | 选中值不变 |
| Calendar | month / year navigation | `ArrowLeft/Right` 日移动，`ArrowUp/Down` 周移动，`Home/End` 月首尾 | 年份切换保留选中日期，禁用日期不可选 |
| ResizeBox | idle / dragging / keyboard / reset | `Arrow` 调整，`Shift+Arrow` 大步进，双击重置 | 暴露 `aria-valuenow/min/max`，禁用态不渲染手柄 |

## Progress / NotificationHost / ConfigProvider

| 组件 | 状态 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Progress line | determinate / indeterminate / status | 语义色来自 token，不确定态不声明 `aria-valuenow` | 展示百分比由 `format` 或默认 `Math.round` 决定 |
| Progress circle | determinate / indeterminate | SVG 圆环随 `size/strokeWidth` 缩放 | `showInfo` 时信息在圆环中心 |
| NotificationHost | empty / open / success / warning / danger / info / placement | 支持顶部/底部、左/右四个堆叠位置，移动端不超出视口 | `notification.close`、按 key 替换、超时自动关闭 |
| ConfigProvider | default / compact / sm / rtl | 包装层不改变布局，仅提供配置上下文和 data 属性 | `Button`、`Input`、`Select`、`Badge`、`Tag` 消费默认尺寸；显式 size 覆盖默认值 |

## Tag / EmptyState

| 组件 | 状态 | 视觉契约 | 交互契约 |
| --- | --- | --- | --- |
| Tag | default | 使用 Badge 语义变体与当前字号，不新增硬编码颜色 | 无交互，只展示标签 |
| Tag | checkable | `aria-pressed` 表达选中态，选中态沿用 Badge 的 primary 变体 | 点击或键盘触发 `onchange(!checked)` |
| Tag | closable | 关闭按钮与标签同一基线，图标不挤压文本 | 关闭按钮有独立 `aria-label`，触发 `onclose` |
| Tag | disabled | 降低不透明度，保留可读文本 | 可选中/关闭按钮均禁用，不触发回调 |
| EmptyState | default | 默认图标、标题、描述和操作区 | 语义 `role=status`，不伪造数据 |
| EmptyState | image | 使用 `image`/`imageAlt` 渲染插图，替代默认图标 | 图片失败不影响标题与恢复操作 |
| EmptyState | custom icon | 通过 `icon` snippet 渲染宿主图标 | 图标仅装饰，标题仍承担可访问名称 |

## Page templates

模板是组合壳，不拥有查询。画廊路由 `/templates/{workplace|monitor|...}` 只提供结构示例；真实页面必须在插槽内部拥有 loading、empty、filtered-empty、error、forbidden 的恢复入口。

| 状态 | 归属 | 契约 |
| --- | --- | --- |
| Loading | 持有查询的页面/插槽 | 骨架或状态占位，不渲染旧数据 |
| Empty | 首次查询完成且无记录 | 使用 `DataState empty`，提供创建/导入入口 |
| Filtered empty | 有筛选但无匹配 | 使用 `DataState filtered-empty`，提供清除筛选 |
| Error | 查询失败 | 使用 `DataState error` 的 `retry`，不并列重复重试按钮 |
| Forbidden | 权限拒绝 | 使用 `DataState forbidden`，不渲染旧内容 |

扩展路由：`/templates/analysis-multi`、`/templates/user-info`、`/templates/user-settings`、`/templates/result-error`、`/templates/exception-404`、`/templates/exception-500`。这些路由覆盖 Pro 的多维分析、用户中心、错误结果与 404/500 异常场景；`e2e/templates.spec.ts` 验证每个导航项和独立路由都能渲染对应标题。
