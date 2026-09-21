---
title: 企业组件升级迁移
description: 企业组件数据契约与异步关系选择器的升级说明。
---

本页记录企业组件的破坏性升级。升级后请先完成数据契约迁移，再替换组件版本。

## 升级顺序

本次升级同时扩展了 Core、UI、Lite、AI Elements 和 DevTools 契约。建议按以下顺序
执行，避免先替换组件、后补 Provider 而导致运行时状态不完整：

1. 先升级 `@svadmin/core`，补齐资源 Schema、任务、导入导出、日期时间和新企业
   能力所需的类型；需要 XLSX 的应用同时安装 `exceljs`。
2. 升级 `@svadmin/ui`，按本文迁移表替换新增或行为变化的组件，并确认公共入口
   导出来自发布包而不是 `example` 内部路径。
3. 需要无 JavaScript 或 SSR 的应用再升级 `@svadmin/lite`，检查对应的降级组件和
   `PARITY.md`，不要把 Lite 的原生回退误认为已执行后端操作。
4. 使用 AI 会话组件的应用将导入路径迁移到 `@svadmin/ai-elements`；使用
   DevTools trace、诊断或事件契约的应用新增 `@svadmin/devtools-contract`。
5. 最后更新 Provider 和宿主后端，完成真实资源、租户、权限、任务、文件和审计
   验收，再发布应用。

建议先在独立分支锁定一组兼容版本，完成编译和定向测试后再批量更新生产依赖。
本次升级不需要数据库迁移；如果宿主为新任务、审批、导入导出或 XLSX 增加了后端
实现，应由宿主项目单独维护其数据库和部署迁移。

## 版本与依赖检查

升级后确认以下项目：

- `@svadmin/core` 与 `@svadmin/lite` 的版本范围相容，避免 Lite 仍锁定旧的 Core
  上限；
- `exceljs` 仅在使用 `@svadmin/core/spreadsheet-xlsx` 时作为可选 peer dependency
  安装，浏览器端按应用打包策略处理体积；
- `@svadmin/ui` 的 `devframe` 与 `esm-env` 由包自身声明，消费者不应依赖仓库根目录
  的传递安装；
- Storybook 只加载 `packages/ui/stories`，不把组件源码目录中的测试辅助文件发布为
  story；
- 删除外部设计连接配置后，设计 Token、组件契约和测试仍以代码仓库为唯一事实来源，
  不再依赖外部设计工作区或 MCP 配置。

## 发布前检查

至少完成以下本地检查：

```sh
bunx vitest run --root packages/core src/task-hooks.test.svelte.ts
bunx vitest run --root packages/ui src/components/import-wizard.test.svelte.ts
bunx vitest run --root packages/ui src/components/table-contract.test.svelte.ts
bun run check:parity
bun run pack:check
git diff --check
```

涉及完整包构建、Storybook、SSR 或真实宿主后端的项目，应在上述定向检查通过后，
按项目自己的发布流水线补做对应验收。本文的本地测试不能替代消费者安装、浏览器
交互、后端权限、文件下载、任务执行或线上部署证明。

## 责任边界

SVAdmin 只负责浏览器端组件、Core/Lite 数据契约、Provider 接口、状态隔离、
输入校验、取消与冲突提示，以及本页所述的迁移约束。SVAdmin 不实现宿主业务的
服务器端，也不因提供了某个接口类型就表示后端已经部署或通过在线验收。

以下能力仍由宿主业务后端负责：

- 数据库、对象存储、文件上传与临时对象回收；
- 任务队列、异步导入导出、进度持久化和服务端取消；
- 资源、租户、字段、操作者和团队共享权限校验；
- 服务端查询、聚合、文件解析、幂等、并发版本控制和审计；
- API、Worker、存储策略、监控以及生产部署。

迁移时应把 SVAdmin 的 Provider 或回调连接到已有的后端接口，并在后端重新校验
所有客户端提交的数据。不能把 `scopeKey`、`disabled`、组件显示状态、隐藏字段、
下载地址或前端成功回调当作授权、持久化、取消、回滚或事务完成的证明。

## 三层交付矩阵

评估“企业级能力”时，必须按交付层分别记账，不能因为 `example` 页面能演示，
就把能力标记为 `@svadmin/ui` 已完成，也不能因为 UI 提供了 Provider 类型，
就把宿主后端标记为已实现。

| 层级 | 应交付的内容 | 不能据此推断的内容 |
| --- | --- | --- |
| `packages/core` | 类型、数据契约、值解析、边界校验、Provider/回调协议、作用域隔离规则 | API、数据库、认证授权、任务执行或持久化已经存在 |
| `packages/ui` | 可发布组件、交互状态、无障碍语义、错误/空/加载/只读状态、公共入口导出和组件测试 | 真实资源数据、服务端权限、全量查询、事务或生产性能 |
| `packages/lite` | SSR/无 JS 语义降级、原生表单/链接、与 Core 契约的降级映射和对齐测试 | Lite 已替宿主执行查询、写入、鉴权或后台任务 |
| `example` | 页面组合、演示数据、示例 Provider、路由、视觉与浏览器验收 | UI 包公共 API 的唯一来源，或真实后端/生产验收证据 |
| 宿主应用/后端 | API、认证授权、数据库、任务/审批/审计执行、文件存储、部署和在线验收 | SVAdmin 已经替宿主完成这些实现 |

因此，每项能力的状态至少记录为：`UI 契约`、`UI 实现`、`Lite 降级`、
`example 接入`、`宿主接入`。只有前四项都有对应证据，才能称为 SVAdmin
前端能力已完成；最后一项必须由宿主项目单独验收，不能由本仓库代验。

## 企业能力台账

下表是当前仓库的交付口径。`有限支持`表示已有明确边界和测试，不表示完整领域
引擎；`宿主负责`表示 SVAdmin 只提供接入契约，不能由本仓库测试代替。

| 能力 | `@svadmin/ui` | `@svadmin/lite` | `example` | 最终责任 |
| --- | --- | --- | --- | --- |
| 表单、字段值和错误定位 | 已完成：`AutoForm`、`FieldRenderer`、`ErrorSummary` | 原生表单降级 | 有组合和交互验收 | 宿主提交时重新校验 |
| 递归筛选与保存视图 | 已完成：递归条件、范围/集合值、视图隔离 | 原生查询参数/表单降级 | 由资源页面接入 | 宿主授权和查询执行 |
| 异步关系/选择器 | 已完成：分页、搜索、跨页选中、失败重试、作用域隔离 | 原生选择/链接降级 | 页面组合验收 | 宿主提供候选数据和权限 |
| 导入、导出和任务反馈 | 已完成：预览、幂等键、恢复、取消/重试回调 | 原生上传/下载表单 | 示例 Provider 演示 | 宿主任务、文件和持久化 |
| 审批、仪表盘、详情工作台 | 已完成前端契约和状态组件 | 原生列表/动作降级 | Provider 组合演示 | 宿主审批、聚合、审计和授权 |
| Spreadsheet | 有界公式、循环/资源限制、工作簿 JSON、可选 XLSX 适配器 | 原生表单提交 | 尚未作为真实后端验收 | XLSX 解析策略和文件授权由宿主决定 |
| Gantt | 有界依赖、里程碑和时间线展示 | 原生表格/链接 | 可展示组件 | 工作日历、自动排程和关键路径不属于当前包 |
| Pivot/分析 | 有界本地聚合、钻取和导出契约 | 原生链接/导出 | Provider 演示 | 服务端全量聚合和分析任务 |
| 认证、数据库、API、Worker、审计持久化 | 不实现 | 不实现 | 仅可使用演示 Provider | 宿主后端和生产环境 |

台账中的“已完成”只表示该层有源码、公共入口和定向证据；不表示所有业务场景、
浏览器性能、生产部署或宿主后端已经验收。发布前仍需根据目标应用补做真实消费者
安装、SSR/挂载、浏览器交互和宿主在线验收。

## UI 与 example 边界

`packages/ui` 是可发布的组件包，交付组件、类型、Provider 契约、状态隔离和定向
组件测试；它不能依赖 `example` 的演示数据、路由、localStorage 数据库或演示账号。

`example` 是可运行的示例应用，负责演示资源契约、菜单、页面组合和本地 Provider。
示例中的页面、演示数据、假登录、localStorage 持久化和视觉验收不能反向定义
`@svadmin/ui` 的公共 API，也不能作为真实后端授权、审计、任务执行或生产性能证据。

迁移或验收时必须分开记录：

- UI 证据：`packages/ui/src` 的组件测试、Core 契约测试、包入口导出和类型检查；
- example 证据：`example/src` 的页面组合、示例 Provider、路由和应用级浏览器验收；
- 宿主证据：真实 API、数据库、任务/审批执行、授权、审计和部署验收。

共享视图写入回执解码可传入第三个参数 `{ id, source, expectedVersion }`：
`decodeSavedListViewMutationResult(receipt, allowedColumnIds, expected)`。
写入调用方应传入本次请求的快照；解码器拒绝其他视图或来源的回执，以及更新成功但
版本未前进的回执。创建使用 `expectedVersion: null`。这不替代调用方在异步等待后
检查租户、身份和请求是否仍有效；既有两参数调用仅执行结构校验。

## SegmentedControl

新增 `SegmentedControl`，从 `@svadmin/ui` 导入，用于视图模式等单选状态切换。
传入 `options: { value: string; label: string; disabled?: boolean }[]`、
`value`、必填的 `ariaLabel` 和 `onchange`；支持双向绑定 `value`。
选项值必须唯一。方向键循环跳过禁用项，Home/End 跳到首尾可用项，
RTL 下左右键反转；重复选择当前值不会再次触发回调。

它使用 radio group 语义，不代替带面板关联的 Tabs，也不是原生表单字段。
将原有一组“模式切换”按钮迁移到此组件时，保留稳定的选项值，把模式更新集中在
`onchange`；不要把导航命令或提交动作转换为单选选项。

## RadioGroup

新增 `RadioGroup`，用于表单中的互斥值选择。它使用原生 radio 输入和
`fieldset/legend` 语义，支持 `name`、`required`、`disabled`、`invalid`、
`describedby`、选项说明和双向绑定。`RadioGroup` 与 `SegmentedControl` 不互换：
前者提交表单字段，后者只负责视图模式切换。

```svelte
<RadioGroup
  name="visibility"
  legend="可见范围"
  options={[
    { value: 'personal', label: '仅自己' },
    { value: 'team', label: '团队成员' },
  ]}
  bind:value={visibility}
/>
```

迁移时不要用按钮点击状态代替 radio 值，也不要仅通过颜色表达当前选项。
服务端仍需按资源契约重新校验提交值。

## TagsInput

新增 `TagsInput`，用于标签、关键词和多值文本字段。组件支持逗号分隔或回车
添加、重复值去重、输入法组合期间不误提交、空输入退格删除最后一项、
`maxItems`、删除按钮、禁用和错误状态。

```svelte
<TagsInput
  name="labels"
  bind:value={labels}
  maxItems={20}
  ariaLabel="标签"
/>
```

设置 `name` 时，已添加的标签会以同名 hidden input 重复提交；输入框本身只代表
当前草稿，不会覆盖已添加值。服务端仍需限制长度、数量和允许的标签内容，不能把
客户端去重或数量限制当作安全校验。

## Slider

新增 `Slider`，用于单个数值的连续或步进选择。绑定值始终是 `number`，默认范围
为 `0..100`、步长为 `1`；支持 `min`、`max`、`step`、`name`、键盘操作、禁用、
错误状态和可选的 `showValue`。

```svelte
<Slider
  name="completion"
  ariaLabel="完成率"
  min={0}
  max={1}
  step={0.01}
  bind:value={completion}
  showValue
/>
```

`Slider` 只提供单值滑块，不代表 `RangeSlider` 已完成；双端范围仍应使用
`RangeSlider`。服务端仍需按数值 Schema 重新检查范围和精度。

## RangeSlider

新增 `RangeSlider`，用于双端数值范围。绑定值为
`{ min: number; max: number }`，组件会在输入时保持 `min <= max`，并为两端提供
独立的键盘操作、无障碍名称和可选的 `minName/maxName` hidden inputs。

```svelte
<RangeSlider
  ariaLabel="价格"
  min={0}
  max={10000}
  step={100}
  minName="price_min"
  maxName="price_max"
  bind:value={priceRange}
/>
```

两个端点共享同一数值范围，但不是日期范围控件；日期筛选继续使用
`DateRangeInput`。客户端的顺序约束不能替代宿主服务端的权限、范围和精度校验。

## ColorPicker

新增 `ColorPicker`，用于主题、标记和资源颜色字段。它使用原生
`input[type="color"]`，绑定值为标准六位十六进制字符串，例如 `#336699`，
并支持 `name`、必填、禁用、错误和无障碍属性。

```svelte
<ColorPicker
  name="accent"
  ariaLabel="强调色"
  bind:value={accent}
/>
```

组件不负责颜色对比度、品牌色白名单或服务端权限校验；这些规则仍应由字段契约
和宿主应用定义。

## Rate

新增 `Rate`，用于离散评分字段。它使用 radio group 语义，支持清除、方向键、
Home/End、禁用、必填和 hidden input 表单提交；绑定值为 `0..count` 的整数，
默认评分数量为 5。

```svelte
<Rate
  name="quality"
  ariaLabel="质量评分"
  bind:value={quality}
/>
```

`Rate` 是离散评分控件，不替代连续数值的 `Slider`，也不提供半星或自定义图标
协议。服务端仍需重新校验评分范围和当前资源权限。

## TimePicker / DateTimePicker

新增 `TimePicker` 和 `DateTimePicker` 作为时间输入的明确公共入口。它们分别是
`DateTimeInput mode="time"` 与 `DateTimeInput mode="datetime"` 的类型化封装，
继续共享原有的 `min/max`、`disabledDate`、时区、instant 模式和无障碍属性。

```svelte
<TimePicker bind:value={startTime} />
<DateTimePicker
  valueMode="instant"
  timeZone="Asia/Shanghai"
  bind:value={scheduledAt}
/>
```

需要纯日期时使用 `DatePicker`，需要日期范围时使用 `DateRangePicker`；
不要把这些命名入口视为不同的后端日期协议。

## AutoForm 错误总览

`AutoForm` 提交产生字段错误时，默认在表单顶部显示错误总览。总览只包含当前
可见且已渲染字段，按字段定义顺序排列；每项显示字段标签和错误文本，并可聚焦对应
控件。字段控件仍保留原有 `aria-invalid` 与 `aria-describedby`，因此总览不是对字段
错误关联的替代。错误关联 ID 现在按表单实例生成；字段 `name` 和业务字段 ID 不变。
总览会在字段容器内聚焦第一个可操作控件，因此数组、选择器和自定义字段渲染器不应再
依赖某个固定的 `name` 选择器。无需总览时传入 `showErrorSummary={false}`。

需要在 `AutoForm` 之外复用同一行为时，从 `@svadmin/ui` 导入 `ErrorSummary`，
传入 `{ fieldKey, label, message }[]`。提供 `onfocusfield` 时，错误项使用按钮并
回调字段键；不提供时只呈现静态错误文本，适合服务端渲染或只读错误页。组件只负责
展示和定位，不执行校验、不提交表单，也不替宿主解释后端错误码。

Lite 使用 `LiteErrorSummary`，传入相同语义的错误条目；条目可额外提供 `fieldId`，
组件会输出原生 `#fieldId` 链接。Lite 不注入点击处理器、不读取浏览器状态，也不负责
把服务端字段错误转换成条目；宿主应在服务端 action 返回时完成错误映射，并为对应
控件提供稳定的 `id`。不要把 `LiteErrorSummary` 当作 SPA `ErrorSummary` 的交互实现。

## FilterBuilder

`FilterBuilder` 现在只接受递归的 `Filter[]` 条件树。逻辑组通过
`{ operator: 'and' | 'or', value: Filter[] }` 表示，字段条件仍使用
`{ field, operator, value }`。

## 资源列表闭环迁移

资源列表闭环由 `AutoTable`、`VirtualTable`、`FilterBuilder`、
`ExportButton` 和 Core 导出契约组成。它只负责浏览器端状态、Provider 调用
和 Lite 的语义降级，不包含服务器端查询或任务执行。

### API 变更

这是不向下兼容的迁移：

1. 将列表筛选统一为 Core 的 `Filter[]`。搜索、字段筛选和递归逻辑组在提交
   `DataProvider.getList` 或导出任务时都必须使用同一份筛选快照。
2. 客户端导出继续省略 `taskName`；后台导出改为显式提供 `taskName`、
   `taskProvider` 和幂等键。后台模式不会读取当前列表页，也不会自动回退为
   浏览器导出。
3. `VirtualTable` 只在 SPA 中提供固定行高的窗口渲染。Lite 使用完整原生表格，
   调用方必须改用服务端分页或限制返回数量。
4. `FilterBuilder` 不再接受旧的 `logicalOperator` 平铺属性，必须迁移为递归
   `{ operator, value }` 条件组。

### 推荐迁移

```svelte
<AutoTable
  resourceName="orders"
  exportTaskName="orders-export"
  exportTaskProvider={taskProvider}
  exportTaskIdempotencyKey={requestKey}
  exportFormat="xlsx"
  exportMaxItemCount={50000}
/>
```

没有后台任务时，删除任务相关属性并保留本地 CSV 导出：

```svelte
<AutoTable resourceName="orders" />
```

Lite 页面不复用 SPA 虚拟滚动或任务轮询。应由宿主页面提供服务端分页数据、
原生筛选表单和受保护的导出链接；`LiteExportButton` 只呈现链接或表单动作，
不执行查询、生成文件、保存任务状态或判断下载权限。

### 宿主责任

宿主应用必须在服务端重新校验资源、租户、操作者、筛选、排序、格式和数量上限。
任务执行、文件生成、对象存储、下载授权、过期回收、幂等持久化、审计和部署均
属于宿主后端，不属于 `@svadmin/core`、`@svadmin/ui` 或 `@svadmin/lite`。
前端的权限隐藏、`scopeKey`、幂等键和导出成功回调都不能作为服务端授权或事务
完成的证明。

### 迁移验收

升级后至少分别验证：

- UI：列表加载、服务端分页、排序、递归筛选、列配置、批量选择、空/错/加载状态；
- 导出：本地导出和任务导出二选一，任务请求包含筛选/排序/格式/数量上限；
- Lite/SSR：无 JavaScript 时仍能提交筛选、翻页和受保护的导出动作；
- 宿主：真实 API、任务队列、文件下载授权、租户隔离和审计。

仓库中的 UI/Core/Lite 测试只能证明前三项，不能替代宿主后端或线上验收。

旧的 `logicalOperator` 属性已移除。原先的平铺条件：

```ts
[
  { field: 'status', operator: 'eq', value: 'published' },
  { field: 'views', operator: 'gte', value: 100 },
]
```

如果业务语义是 OR，需要显式改为：

```ts
[
  {
    operator: 'or',
    value: [
      { field: 'status', operator: 'eq', value: 'published' },
      { field: 'views', operator: 'gte', value: 100 },
    ],
  },
]
```

嵌套条件不再被展平。服务端序列化、URL 查询参数和保存视图应直接保存完整
`Filter` 树，并在读回后验证序列化往返不改变逻辑结构。

编辑器无法安全表达的运算符、字段类型或值会以只读条件保留，不会在点击“应用”时
静默降级为文本或丢失。新建或编辑的条件如果未填完整，也不会触发 `onApply`；
组件会显示校验提示，调用方不要再依赖“应用时自动删除空条件”的旧行为。
数字枚举与同文字符串枚举（例如 `2` 和 `'2'`）编辑后保留各自类型。

`@svadmin/lite` 的 `LiteFilterBuilder` 也已移除 `logicalOperator`，使用
`filters[0][operator]`、`filters[0.value.0][field]` 这类嵌套字段名提交条件树。
Lite Server Adapter 会把这些字段还原为同样的 `Filter` 树；自定义 SvelteKit
action 仍需保留这些字段，不要再按旧的 `filter_field_0` 平铺协议解析。
结构化筛选查询现在是严格协议：未知字段、不可筛选字段、非法操作符、类型不匹配的
值、重复属性、稀疏索引、空值操作符携带值或超过深度/节点/输入长度限制时返回
HTTP 400，并且不会调用 `DataProvider.getList`。空逻辑组会保留为
`{ operator, value: [] }`，不再被静默删除。此解析器不替代服务端资源授权。

协议最多允许 300 个属性条目、1000 个树节点、根节点以下 32 层，索引需连续且
使用无前导零的十进制数，最大索引 1000；路径、属性和值累计最多 64000 个
UTF-16 码元，单条路径最多 400 个码元。应用仍需在请求入口限制整个 URL 大小。
重复字段不再采用“最后一个值获胜”的策略。

迁移时必须处理 400 错误并保留用户查询供修正，不能收到错误后重试无筛选查询：

- 布尔值使用 `true/false`，数字使用有限十进制数；数值零和布尔假不被删掉。
- 空文本按空字符串保留，与缺失 `[value]` 区分；空值操作符 `null/nnull` 则不传
  `[value]`，不能用空字符串代替。
- 数值字段支持比较、集合和有序范围操作；布尔和枚举支持 `eq/ne` 以及 `in/nin`，
  均支持 `null/nnull`。`between/nbetween` 只对有限数值开放，必须传恰好两个
  有序端点。
  标量枚举按可信字段选项还原类型；同文数字/字符串选项无法由原生标量文本协议区分时
  明确拒绝，不再猜测类型。当前 Lite 协议使用
  `filters[path][values.0]`、`filters[path][values.1]` 的索引字段传输集合；
  不要把逗号分隔文本当数组，也不要混用 `[value]` 与 `[values.N]`。
  集合最多 100 项，索引必须从 0 连续排列，不允许稀疏、重复或带前导零的索引。

SPA 与 Lite `FilterBuilder` 现在按字段类型显示可编辑操作符：数值类显示比较、集合
及范围操作符；布尔和枚举显示 `eq/ne/in/nin`；日期/时间显示比较操作符，文本显示
文本、比较和集合操作符，
以上均包含 `null/nnull`。`startswith/endswith` 可直接编辑，不再出现空操作符选项。
金额、评分与普通数值一样使用数值编辑器，空输入不再被作为文本或零提交；
筛选值沿用存储单位，不应用金额展示精度或字段录入上下限（筛选阈值不等于录入值）。
可编辑草稿在应用时重新校验当前字段与操作符，字段定义变化后不会直接提交旧草稿。
Lite 筛选器的表单 ID 按组件实例生成；如果页面同时渲染多个筛选器，不需要再手动
修改提交按钮的 `form` 关联，也不要继续依赖固定的 `#lite-filter-form` 选择器。
读入但当前字段定义无法编辑的条件会显示为只读，保留字段、操作符和值的展示，
并附带 `filters[path][invalid]` 拒绝标记；标准解析器返回 400，原生控件不会把它
改成第一个可见选项。此隐藏文本不是类型保真的值协议，自定义 action 也必须拒绝
该标记并由宿主提供修正或显式删除流程，不能忽略标记后执行查询。
读入但不符合当前字段契约的历史条件仍以只读方式保留，应用时原样回传，避免编辑器
偷偷改写查询；服务端仍会按资源契约拒绝不支持的条件。

集合编辑不对值排序或去重，保留业务传入顺序；可编辑草稿中的空集合、非法枚举、
非有限数字和逆序数值范围会阻止应用；读入时就非法的历史条件仍按上述只读策略保留。
数字 `0`、布尔 `false`、空文本以及数字/字符串
同文枚举值都按原始类型传递。字段定义、选项禁用状态或操作符变化后会重新校验，
不能把旧的标量值静默转换成集合，也不能把集合压缩成一个逗号字符串。

原生集合成员按可信字段类型解码。数字使用有限十进制文本，布尔使用 `true/false`，
文本直接保留；枚举成员使用 `JSON.stringify(option.value)`，例如数字选项的字段值为
`2`，字符串选项的字段值为 `"2"`（包含引号）。服务端解析后重新核对允许且未禁用的
选项。不要把 SPA 下拉框的选项索引提交到该协议。

```text
filters[0][field]=amount
filters[0][operator]=between
filters[0][values.0]=0
filters[0][values.1]=100.5
```

规则路径仍可嵌套，例如 `filters[0.value.1][values.0]`。数组成员也计入原有的
300 个属性条目及 64000 码元限制；100 项只是单个集合上限，不保证多个最大集合可以
放入同一 URL。日期/时间范围暂未开放，不能把带不同时区偏移的时间点按字符串排序。

Lite 当前可原生编辑已渲染的集合成员，但跨值形状切换（标量、集合、范围、空值）
以及添加/删除成员仍需宿主重新渲染表单；未重绘时的标量/集合混用会被服务器拒绝，
不会猜测转换。SPA 已提供成员增删及形状切换。此项不代表高级筛选器、关系筛选或
Lite 无 JavaScript 的完整条件构建流程已全部完成。

升级 UI/Lite 时同步升级 Core。服务端纯筛选工具入口为 `@svadmin/core/filter-values`，
不要为了服务端值校验加载 UI 或浏览器运行时；后端仍须独立执行授权和查询限制。

## JsonSchemaForm

`JsonSchemaForm` 递归处理 `object` 和 `array`，以包含 Schema 默认值的解析视图
渲染，SSR 也能直接显示未编辑的默认值。提交前会使用 Core 的受限 Schema 校验，
提交回调收到经过可见性投影的独立数据快照；校验失败不会调用 `onsubmit`，并将焦点
移到第一个错误控件。绑定值只在编辑或提交时更新，不会为了补默认值而反复改写调用方
传入的对象。

枚举按原始类型回写，`2` 与 `"2"`、`null` 与 `"null"` 不再混淆。
`option.value` 改为 `__json_enum_0` 这样的索引令牌，索引只在当前可信 Schema
内有效；业务代码不能把令牌作为业务值保存。数值输入为空时回写 `undefined`，
不会伪造为 `0`。对象中明确存在的 `undefined`、`null`、`false` 和空数组均优先
于默认值；只有缺失属性才补默认值。新增数组项也会获得递归默认值。

当前支持的约束包括 `required`、`enum`、`minLength`、`maxLength`、`pattern`、
`minimum`、`maximum`、`minItems` 和 `maxItems`。未知 Schema 关键字、循环结构、
非法正则、超过 1000 个节点或超过 32 层的 Schema 会被拒绝，不再静默渲染一个
不完整的表单。

条件字段使用 `visibleWhen`，条件路径从表单根开始，只能引用无条件的标量控制字段：

```ts
{
  properties: {
    mode: { enum: ['basic', 'advanced'] },
    secret: {
      type: 'string',
      visibleWhen: { path: ['mode'], equals: 'advanced' },
    },
  },
}
```

条件不满足时字段不会渲染、不会出现在提交数据中；本地草稿仍保留，条件恢复后可继续
编辑。Lite 原生表单只有在页面重新渲染时才能根据新条件切换分支；服务端解码会重新
按可信 Schema 判断可见性，并拒绝隐藏字段伪造、可见字段缺失和约束违规。

迁移时请检查：

- `onsubmit` 是否允许嵌套对象和数组；
- 后端是否区分缺失字段、`undefined`、`null` 和空字符串；
- 业务默认值是否应覆盖调用方传入值。调用方传入值优先于 Schema 默认值；
- 是否需要在提交前对数组长度和嵌套字段做服务端校验。

`LiteJsonSchemaForm` 采用原生表单传输：字段名为 `data:["profile","enabled"]`
这样的完整 JSON 路径键，数组长度为 `length:["tags"]`。字段名中的括号或下划线
不会被误解为路径分隔符。DOM id 现在按组件实例生成，仅用于 label 关联，
不要再依赖旧的固定 id。

服务端使用自己保存的可信 Schema 解码（不要接受客户端提交的 Schema）：

```ts
import { decodeSchemaFormData } from '@svadmin/lite';

const data = decodeSchemaFormData(trustedSchema, await request.formData());
// 随后执行完整 Schema 校验、业务约束和当前身份授权，再持久化。
```

解码器还原枚举原始值、有限数字、安全整数、布尔及数组，拒绝缺失控件、
重复标量、未知 `data:` / `length:` 字段、错误令牌和非法数字。
结构最多访问 1000 个节点、深度 32 层，已读取的字段值总长不超过 1000000
个 UTF-16 码元。服务端仍需限制 HTTP 请求体大小。
非协议字段（例如 CSRF token）留给应用处理。解码器只支持本节列出的约束，不承诺
支持全部 JSON Schema 关键字；更复杂的 `oneOf`、引用和跨字段业务规则仍须在服务端
命令边界单独校验。

迁移注意：

- 未填写数值或枚举解码为 `undefined`，文本为空字符串；普通复选框解码为
  `boolean`，不是三态控件，不能靠它传递 `null` 或缺失值。
- 原生 checkbox 同名提交隐藏的 `false`，勾选时再提交 `true`；不要用
  `Object.fromEntries(formData)` 丢掉重复值后再解码。
- 服务端必须使用渲染时对应的可信 Schema 版本，枚举重排会改变索引令牌含义。
- 条件控制字段必须是无条件标量；不要把一个条件字段再作为另一个条件字段的控制器。
- `minItems` 和 `maxItems` 现在同时约束 SPA 与 Lite 的增删按钮；迁移时不要再
  依赖提交时才发现数组长度错误。
- Lite 在传入 `action` 时为数组增删按钮生成 `schemaFormAction` 原生提交字段。
  有 JavaScript 时仍在当前页面即时增删；无 JavaScript 时按钮提交 `add/remove` 动作，
  服务端应使用可信 Schema、当前用户和当前数组快照重新校验后生成下一次页面。
  使用 `encodeSchemaFormArrayAction` 生成动作值，使用 `decodeSchemaFormArrayAction`
  严格解码；不要直接信任路径或索引，也不要把动作字段当作已完成的数据写入。

服务端统一使用 `decodeSchemaFormSubmission(schema, formData)` 应用动作。返回
`{ kind: 'draft', data }` 时仅重新渲染表单，不能写入业务资源；返回
`{ kind: 'submit', data }` 时才进入授权后的业务提交。该函数校验数组路径、
可见性、索引、增删后的长度边界和结构预算，新增项采用 Schema 默认值。
数组动作跳过必填等最终值约束，允许继续编辑未填写完整的草稿，但不跳过传输
格式校验。增删按钮使用 `formnovalidate`，最终提交仍由服务端严格校验。
旧 `decodeSchemaFormData` 遇到数组动作会拒绝，避免旧 action 意外保存编辑草稿。
CSRF 等非协议字段仍由宿主处理；宿主必须校验请求来源、身份、Schema 版本和
资源权限。此处提供原生提交协议及解码回归，不代表真实浏览器无 JS 流程已经验收。

## SpreadsheetView

公式不再通过 `new Function()` 执行。当前解析器支持数字、单元格引用、
`+ - * /`、括号以及数值 `IF(condition, whenTrue, whenFalse)`、`SUM`、`AVG`、
`COUNT`、`MIN`、`MAX` 的单元格范围。

公式错误的显示值：

- `#CYCLE!`：公式引用形成循环；
- `#VALUE!`：公式语法、单元格引用或除零错误；
- `#LIMIT!`：公式长度、依赖深度、计算步数或范围大小超过限制。

不再支持任意 JavaScript 表达式。调用方如果依赖自定义函数或脚本，应迁移到
受控的服务端计算或单独的公式扩展协议，不要要求消费者放开 CSP 的
`unsafe-eval`。

`SpreadsheetView` 默认限制工作表为 `1000` 行、`100` 列、`10000` 个单元格、
`32` 个工作表；单元格文本、公式长度、公式递归深度、范围大小和整表计算步数
也有上限。可通过 `limits` 传入更严格的值，但不能提高框架安全上限。超过网格、
工作簿或单元格内容限制时，组件显示错误状态并禁用编辑和导出，不会静默截断
数据。各表的 `id` 必须唯一，更新已有表时沿用其 `id` 并提供合法尺寸。

| `limits` 字段 | 默认值（也是可配置上限） |
|---|---:|
| `maxRows` / `maxCols` | 1000 / 100 |
| `maxCells` / `maxSheets` | 10000 / 32 |
| `maxCellLength` | 10000 字符 |
| `maxFormulaLength` | 1000 字符，含 `=` |
| `maxFormulaDepth` | 32 层，计算公式引用、括号和一元操作符的解析深度 |
| `maxRangeCells` | 10000 |
| `maxFormulaSteps` | 每份活动表数据快照累计 50000 步 |

活动表所有单元格文本合计最多 1000000 个 UTF-16 码元。非正整数、非有限值和
缺省限制回退为默认值；大于上限的配置按上限执行。依赖缓存和计算预算由当前
活动表共享，不因重绘或导出重新计算；数据变化后重新计算。
引用必须在声明的行列范围内，不再把越界单元格隐式当作零。
`1 2` 这类无效表达式不再通过移除空格拼成数字。

CSV 导出使用核心编码器，文本中的 `=`, `+`, `-`, `@` 以及制表符、换行前缀会
被加上单引号前缀。公式导出的是未做界面舍入、未加千分位的计算结果，而非原始
公式；数值采用 JavaScript 浮点精度，不是任意精度财务计算。CSV 没有额外列名行。
下载对象 URL 在激活后延迟 10 秒回收。不要把导出的 CSV 当作可信 HTML 或业务
授权证明，服务端仍须按不可信文件处理。

这是一次不向下兼容的契约调整：原先依赖任意尺寸、超大公式或 `new Function`
表达式的调用方必须迁移到受限公式语法，或者把计算迁移到服务端。Lite 版本是
原生表单语义降级：仅提交受限尺寸内的原始单元格和 `sheetId`，不在浏览器执行
公式、切换工作表或客户端导出；服务端必须重新校验尺寸、公式和权限。
Lite 支持同名的前五个网格/文本限制以及 `readonly`，不接收公式引擎限制。
单元格字段名为 `cell_A1`、`cell_AA1` 等；服务端应通过授权后的 `sheetId`
选择工作表，不要信任隐藏字段或原生输入的 `maxlength`。

本次是内置轻量公式解析器的安全收敛，不是完整电子表格引擎验收。
高级函数、专业引擎及性能与无障碍验收仍需单独交付。

SPA 的矩形多格选区现在支持原生复制事件，分别写入正确转义的 TSV
（`text/plain`）和 CSV（`text/csv`）。复制的是未做显示舍入的计算值，不是原始公式；
危险文本前缀会加单引号，制表符、引号和换行保留在字段内。单格复制仍使用原生
输入框文本选择语义。只读模式允许复制；区域复制不修改数据、不进入编辑历史。
需要完整保留公式和格式时使用工作簿 JSON，不要把外部剪贴板当可信公式来源。
工具栏“填充选区”或 `Ctrl/Cmd+D` 会将左上角单元格复制到矩形选区；
单行或单列选区如果前两个单元格是严格的有限十进制数，会按两者的差值生成后续数字；
矩形选区、带前导零的文本、公式或其他无法安全识别的值仍按复制或公式平移处理。
种子原文保留，后续数字按两个种子中的最大小数位数生成，使用 JavaScript 浮点运算，
不是精确财务计算；超过 20 位小数、非有限结果或绝对值超过安全整数上限时整批拒绝。
原来依赖单列数字重复复制的调用方需注意此行为变化；它不承诺完整 Excel 自动填充语义。
公式中的相对 A1 引用按行列偏移调整。引用越界、
目标容量不足或任一单元格无效时整批拒绝，不写入部分结果；填充作为一次编辑
进入撤销/重做历史。区域填充支持 `$A$1`、`A$1`、`$A1` 等绝对行列引用：
绝对的行或列不会随目标位置偏移，普通 A1 引用会按行列偏移。现在支持受限的
跨表 A1 引用（`Sheet1!A1`、`'收入明细'!B2` 及同表区间），引用的工作表、
单元格边界、循环和计算预算仍会严格校验；跨表自动填充和高级 Excel 填充语义
仍未支持。

### 工作簿 JSON 协议

Core 根入口新增 `parseSpreadsheetWorkbook`、`serializeSpreadsheetWorkbook`、
`snapshotSpreadsheetWorkbook` 和相应工作簿类型。格式为：

```json
{
  "protocolVersion": 1,
  "activeSheetId": "summary",
  "sheets": [{
    "id": "summary",
    "name": "Summary",
    "rows": 2,
    "cols": 2,
    "cells": { "A1": "=1+1", "B2": "001" },
    "formats": { "A1": { "numberFormat": "number", "decimalPlaces": 2, "bold": true } }
  }]
}
```

该协议完整保留所有工作表、原始单元格文本和公式，不求值、不转换数字字符串。
可选格式支持 `numberFormat: general | number | percent`、`decimalPlaces: 0..20`、
`bold`、`italic` 和 `align: left | center | right`；格式也可应用于范围内的空白单元格。
未知字段、重复表 ID、无效活动表、越界坐标和无效格式均拒绝整份工作簿，返回
`undefined`，不截断或部分导入。快照不会执行访问器，也不返回原输入引用。

每表沿用 1000 行、100 列、10000 格上限；最多 32 表；整本单元格文本合计
1000000 个 UTF-16 码元，JSON 文本最多 10000000 个码元。
这些额外的整本限制用于控制导入导出体积，不能用来放宽组件限制。
导入后调用方还需执行自身更严格的 `limits`、业务校验及权限检查。

SPA `SpreadsheetView` 现在提供独立的“导出工作簿”和“导入工作簿”操作。
导出默认下载或通过 `onworkbookexport(json)` 回调交付完整 JSON；导入使用原生
JSON 文件选择，先做大小、协议、工作表和当前 `limits` 校验，再显示确认动作。
确认后整本替换并作为一次编辑进入撤销/重做历史；读取期间作用域、权限式只读状态
或当前数据发生变化时，待确认文件失效。原有“导出 CSV”仍只导出活动表的
计算值。工作簿导出失败或任一表超出当前组件限制时按钮禁用，不生成部分文件。
导入失败、文件过大或作用域变化均不改动当前工作簿。
Lite 仍只提供原生表单提交，不提供客户端工作簿下载。

SPA 已支持活动单元格或矩形选区的粗体、斜体、左右/居中对齐、数字/百分比格式和
0..20 位小数设置。每次操作只更新对应格式属性，保留各格其他格式及选区外数据；
整批格式修改作为一次操作进入撤销/重做历史并触发一次 `onchange`。
工具栏显示活动单元格的格式，粗体/斜体切换以该单元格为基准统一应用到选区。
只读模式呈现导入的格式但不显示编辑控件；活动可编辑单元格仍显示原始文本，
离开该单元格才显示格式化值。常规模式保留 `001` 等原始文本；显式数字或百分比
格式可将有限十进制数值文本用于展示计算，文本和公式本身不变。
CSV 仍导出未格式化的值，JSON 保留格式元数据；Lite 不提供这些格式控件。

JSON 仍不是 XLSX。Core 新增可选 `exceljs` 适配器
`serializeSpreadsheetXlsx(workbook, { exceljs })` 和
`parseSpreadsheetXlsx(bytes, { exceljs, signal })`，会在有界校验后写入或读取真实 XLSX
二进制；从 `@svadmin/core/spreadsheet-xlsx` 导入，调用方必须安装可选依赖
`exceljs`。可以注入引擎，省略时会延迟导入；默认 Core 根入口不导出该适配器。
导入按文件字节、工作表、行列、单元格和单元格文本大小限制执行，保留公式原文和
基础格式；XLSX 不保存 SVAdmin 的内部表 ID，导入后以工作表名称作为稳定 ID。
导出会拒绝非法 Excel 工作表名、重复名称和受保护名称；普通文本原样保留，
只有带 `number` / `percent` 格式且能无损转换的十进制文本才写成数值。
公式按文本写入，不执行或重算不可信输入；活动工作表和声明的空白网格边界也会保留。
导出结果仍需由服务端按授权和文件策略
处理，不能把浏览器导出当作业务凭据。

`SpreadsheetView` 只有在传入 `xlsxexporter(workbook)` 时才显示 XLSX 操作。
适配器返回的二进制必须是有限大小的 ZIP/XLSX 文件；组件默认下载
`workbook.xlsx`，也可通过 `onxlsxexport(bytes)` 接管交付。导出期间重复点击会被
阻止，数据、作用域、适配器、接收回调变化或组件卸载会使旧结果失效；失败只显示
通用错误，不展示底层异常。未注入适配器时不会假装支持 XLSX，也不会自动加载
`exceljs`。

XLSX 导入可直接使用上述 Core 适配器，也可注入自定义
`xlsximporter(bytes, limits, signal)`；未注入时仍只接受 JSON。自定义适配器必须自己
执行真实 ZIP/XLSX 解析、条目与解压体积限制、公式和工作表限制，并在失败时返回
`undefined`；组件负责文件选择、作用域隔离、工作簿快照校验和确认导入。
适配器替换、作用域/数据变化、只读或卸载会中止 `signal` 并丢弃迟到回执；
适配器必须自行响应信号，中止 Worker 或解析任务。传入的字节和限制为独立副本。
不要把文件扩展名、ZIP 头或文件大小检查当作安全解析证明。Core 适配器是有界解析
入口，不是完整 Excel 兼容层；高级函数以及专业性能和无障碍验收仍需单独验收。
不要把旧的
SpreadsheetML `.xls` 导出或工作簿 JSON 当作 XLSX 兼容证明。

### 编辑历史与作用域

SPA 提供撤销/重做图标按钮。每次有效的单元格输入、增加行、增加列和新建工作表
都是独立事务；相同值不重复记录，撤销后重新编辑会清空重做分支。恢复历史时也恢复
事务对应的活动工作表，并重新触发 `onchange`，不代表服务端已持久化或支持并发合并。

每侧历史最多 100 条，且序列化数据累计最多 2000000 个 UTF-16 码元，超限优先淘汰
最早的记录；单份工作簿超出此历史容量时会清空该侧历史，编辑本身仍然可用。
这是序列化数据容量上限，不是浏览器进程内存上限。

`onchange` 现在收到独立快照，修改回调参数不再反向修改组件或历史。
只读模式隐藏历史按钮并拒绝编辑与历史操作。外部替换 `sheets`（即使内容相同）、
检测到响应式数据内容变化、更改 `limits` 的有效值或更改 `scopeKey` 都会清空历史。
需要受控绑定时使用 `bind:sheets`；不要在每次回调中创建新数组再回灌，否则视为外部刷新。
普通非响应式对象的原地修改不保证被检测，外部更新应替换数组。

多租户或多记录页面复用组件时必须传入随身份改变的 `scopeKey`，例如
`JSON.stringify([tenantId, resource, recordId])`。清空历史不会自动清空显示数据，
宿主仍须同时替换或清空 `sheets`；此标识不能替代服务端授权。
Lite 仍是原生提交语义，不提供客户端历史或接收 `scopeKey`。

### 区域选择与粘贴

SPA 现在支持以单元格为起点的矩形选择：点击起点后按住 Shift 点击终点，或使用
Shift 加方向键扩展区域。工具栏的清空按钮只清空当前区域，并作为一个可撤销事务提交。
普通输入仍只编辑焦点单元格；区域选择不会把单元格输入框变成多值控件。

粘贴优先读取 `text/csv`，否则读取 `text/plain` 并按 TSV 解析。解析使用受限的
Papa Parse 协议，保留带引号字段、换行、空单元格和文本类型，解析阶段不计算公式或自动转换
数字。纯文本中的逗号保留为单元格内容，不猜测为 CSV 分隔符。目标区域从当前选区的
左上角开始，整个矩形必须在当前工作表内且满足行列、
单元格、单元格文本和总文本限制；任何一项失败都会拒绝整次粘贴，不会部分写入。
整次粘贴可以用一次撤销恢复。粘贴内容来自不可信剪贴板，公式仍只按本组件的受限
语法计算，不能借此执行 JavaScript。

剪贴板文本最多 1000000 个 UTF-16 码元、1000 行、100 列和 10000 个单元格，
单元格最多 10000 个码元；组件配置的更严格限制仍然生效。空白行和空值不被跳过，
仅忽略末尾行终止符产生的最后一个空记录；非矩形数据、畸形引号被拒绝。
越界时不会自动扩展工作表，整块粘贴会阻止原生输入框的回退粘贴，避免只改写一格。
粘贴原样保留公式引用，不提供复制公式时的相对引用平移。切换工作表会重置选区。

旧宿主若自行监听 `paste` 并写入 `sheets`，应删除重复写入逻辑，改用组件的
`onchange`；否则可能产生两个历史事务。Lite 不提供区域选择、粘贴或客户端清空，
仍只提交原生网格字段，服务端必须重新校验字段名、尺寸和权限。

## KanbanBoard / LiteKanbanBoard

SPA 看板的移动和新增现在按受控写入处理，升级时必须调整回调契约：

- `oncardmove(cardId, targetColumnId, targetIndex)` 可以返回 Promise。组件只显示临时
  预览；Promise 成功后才写入绑定的 `cards`，失败不会伪造成功，并显示回滚提示。
- `canMoveCard(card, targetColumnId)` 必须同步返回权限结果。返回 `false` 或抛错时不产生
  预览和回调；后端仍必须重新检查租户、权限、状态和并发版本。
- `oncardmoveerror` 只接收原始错误通知，组件不会把 Provider 私有错误直接展示给用户。
  业务应在宿主记录审计和冲突信息。
- `oncardadd(columnId, title)` 必须返回包含服务端唯一 `id`、标题和列 ID 的完整卡片，
  才会加入绑定值。组件不再生成 `Date.now()`/随机本地 ID，也不把“请求已发出”当成功。
- `scopeKey`、列/卡片数据或回调作用域改变后，旧移动/新增回执不能覆盖新数据。
  宿主刷新出的权威数据优先；迟到失败不会覆盖外部刷新。

看板最多 200 列、1000 张卡片；列和卡片标识、标题必须为非空文本，卡片必须引用
已存在的列，标签最多 100 项，描述最多 10000 个字符。非法或重复数据整体显示错误，
不渲染部分看板。

SPA 提供列下拉移动、同列上移/下移、拖放三条写入路径，它们共用同一权限和回滚流程；
仅在提供持久化回调时启用。没有回调时看板是只读展示。加载、错误、重试、空状态和
键盘操作均有明确语义。

`LiteKanbanBoard` 仍是 SSR 原生表单边界：它不接收 SPA 的 `oncardmove`、
`canMoveCard`、`oncardadd` 或本地回滚回调。跨列移动、排序、权限、幂等和冲突处理
需要额外的服务端页面/命令承接；当前原生表单仅输出新增请求，不会生成移动和排序请求。
`formAction` 仅接受站内绝对路径或 `?/action` 查询形式；新增输入含 `required` 和
1000 字符上限，服务端仍须重新校验。Lite 也提供容量/数据校验、加载/错误/空状态、
`retryHref` 原生恢复链接。因此台账改为语义降级。服务端不要
信任隐藏字段中的列 ID 和标题，必须按当前租户、权限及版本重新读取并校验。

本轮没有把看板宣称为离线同步或并发合并引擎；需要多人同时编辑时，业务命令应带版本
或幂等键并返回冲突结果。

## PivotTable / LitePivotTable

两种透视表共用 `@svadmin/core/pivot` 的有界聚合模型。升级 UI 或 Lite 时必须同时
升级到包含该入口的 Core 版本，不能混用旧 Core。发布时需同步收紧 Lite 的 Core
依赖范围；本说明不代表新版本已经发布。

### 数据与数值语义

- 维度只接受字符串、有限数字、布尔值和空值。数字 `1` 与字符串 `"1"`、
  布尔值与同文字符串不再合并。缺失属性、`undefined` 与 `null` 归入同一个空值组，
  空字符串仍是独立组；对象、数组、非有限数字拒绝展示。
- 维度值中的 `:::` 不再造成交叉单元格碰撞。当同一轴的展示名称存在歧义或空字符串，
  该轴所有字符串标签统一显示 JSON 引号，原始业务值不变。
- `sum`、`avg`、`min`、`max` 只接受有限 `number`；`null`、缺失值和 `undefined`
  不参与计算。数字字符串、空字符串、布尔值、`NaN`、`Infinity` 会使整个结果报错，
  不再强制转换或静默归零。请在进入组件前按字段契约清洗数据。
- `count` 按记录数统计，不读取数值字段；它不是“非空数值的数量”。
- 没有记录或没有有效数值的单元格显示 `—`，真实零显示 `0`。整份输入为空时显示空状态。
- 行、列和总计直接聚合原始记录，不把分组均值再次简单平均。
- 数值使用 JavaScript 浮点精度，默认展示最多两位小数，不是任意精度财务引擎。
  求和溢出时整体报错；需严格十进制精度的金额统计应在服务端完成。

例如旧数据 `{ amount: "100.50" }` 必须先校验并转换为 `{ amount: 100.5 }`；
不要用 `Number(value) || 0` 处理未填或非法数据。原先期待数字和字符串维度合并的
业务，应在数据边界明确统一维度类型，而不是依赖组件隐式转换。

### 容量与状态

硬上限为 10000 条记录、行列维度各 200 个、交叉矩阵 40000 个单元格，
单个字符串维度最多 1000 个 UTF-16 码元。超限会停止渲染结果并提示错误，
不会截断后输出看似完整的合计。聚合一次构建索引，渲染不再逐单元格扫描输入。
这些是安全上限，不是大规模浏览器交互性能的验收结论。

两种组件新增 `loading`、`error`、`ariaLabel`。加载或出错时不显示旧表格；
状态文案随当前国际化作用域变化。表格使用原生行列标题语义。

```svelte
<PivotTable
  data={authorizedRecords}
  rowField="department"
  columnField="category"
  valueField="amount"
  loading={query.isLoading}
  error={queryErrorMessage}
  onRetry={() => query.refetch()}
/>
```

`formatValue` 仅接收有值的数字，空单元格不调用格式化器。格式化器抛错或返回空文本时，
回退显示原始数字；返回值作为文本转义，不执行 HTML。Lite 也支持此属性。
SPA 使用 `onRetry` 回调；Lite 使用 `retryHref="/reports?retry=1"` 原生链接，
仅接受不含控制字符、空白或反斜杠的站内绝对路径，不支持远端地址和可执行协议。

### 能力边界

本地 `data` 模式只聚合明确传入、已授权的数据，不执行资源查询或远端取消。
传入当前页只得到当前页统计，不能标成整个资源的总计；宿主必须负责作用域切换时
清空旧数据和屏蔽迟到请求。SPA 现在可通过 `onDrillDown` 显式启用单元格钻取；
未提供回调时单元格保持普通文本。

钻取回调收到独立的 `PivotDrilldown` 快照，包含 `resource`、非空 `scopeKey`、
三个维度字段、聚合器、原始行列维度值、筛选树和 `meta`。它只代表当前已授权
聚合单元格，不代表浏览器已经加载该单元格的原始记录；宿主应使用这些条件重新发起
受授权的明细查询，并在服务端再次检查资源、租户、权限和筛选。切换作用域或查询后，
旧表格不会自动替新作用域发起钻取。

迁移接入时，回调可以直接使用收到的 `filters` 发起明细查询：它保留原筛选树，
并在顶层以 AND 语义追加行、列维度约束，不需要宿主再次拼接。
空维度使用 `{ operator: 'null', value: null }`，其他维度使用 `eq`，
数字、字符串和布尔值保留原始类型。回调返回 Promise 时，当前表格的钻取按钮
在等待期间禁用；失败显示通用错误，不展示服务端异常详情。
`scopeKey` 只是隔离标识，不能替代服务端授权。

Lite 支持通过 `drilldownHref(input)` 输出安全站内钻取链接，并已通过无浏览器运行时的
SSR 组合测试；组件构造与 SPA 相同的
`PivotDrilldown` 请求，但不执行客户端查询。接入需显式提供 `resource` 和非空
`scopeKey`，可同时传入 `filters/meta` 保留原查询。加载、错误和不存在的交叉单元格
不生成钻取链接；合计项不支持钻取。链接回调异常时保留数值显示，不输出内部异常。
宿主服务器必须从可信会话确定身份、租户和当前权限并重新授权查询明细，
不能把客户端 `scopeKey` 当作授权凭据。跨站、控制字符、协议型和无效回调地址会被丢弃。
专业分析引擎仍待单独交付，
不要把服务端预聚合行当原始记录传入后再计算 `avg` 或 `count`。

### 导出请求契约

Core 新增 `buildPivotExportRequest(query, scopeKey, format)`，从 `@svadmin/core/pivot`
或 Core 根入口导入。它返回独立纯数据快照；无效查询、空作用域、超过 4000 字符的
作用域或不支持的格式返回 `undefined`。格式默认 `csv`，也支持 `json`、`xlsx`。

```ts
const body = buildPivotExportRequest({
  resource: 'orders',
  rowField: 'region',
  columnField: 'status',
  valueField: 'amount',
  aggregator: 'sum',
  filters: currentFilters,
}, currentScopeKey, 'xlsx');
```

请求结构为 `{ protocolVersion: 1, kind: 'pivot', scopeKey, format, query }`。
宿主可将该请求交给专用后台任务处理器，不能交给只识别原始记录导出的旧处理器。
后端应重新检查身份、资源权限、字段权限和筛选范围，按 `query` 计算完整透视结果；
不得使用浏览器已加载数据代替全量聚合，也不得信任 `scopeKey` 作为授权凭据。

此 API 只建立请求契约，不提交任务、不生成文件、不授予下载权限。
SPA 新增 `PivotExportButton`，从 `@svadmin/ui` 导出。它提交专用的
`PivotExportRequest`，不会调用原始记录 `useExport`，并通过现有 `TaskProvider`
轮询任务回执。任务完成后才显示下载，下载结果必须经过同源地址和格式校验；
Pivot 回执还必须包含并匹配 `kind`、`taskName`、`idempotencyKey`、`scopeKey` 和
`requestFingerprint`，错配或缺字段的恢复任务不会显示下载；
重复点击不会重复提交，已有 `initialTaskId` 只恢复任务，权限、租户或作用域变化
会清理旧任务上下文。失败不会回退到浏览器当前页导出。

```svelte
<PivotExportButton
  query={pivotQuery}
  scopeKey={currentScopeKey}
  taskName="pivot-orders-export"
  idempotencyKey={requestKey}
  format="xlsx"
/>
```

`PivotExportButton` 仍要求服务端任务处理器按全量查询重新授权和聚合；任务回执、
对象存储下载授权、审计和过期处理必须由服务端实现。Lite 可通过 `exportHref`
输出安全站内原生链接，导航到服务端导出页面，不执行客户端导出。
任务取消/重试的业务接入仍需宿主通过任务中心完成。

### 服务端聚合

`PivotTable` 新增 `provider`、`resource`、`scopeKey`、`enabled`、`filters`、`meta`。
默认还会通过已注册的 `AccessControlProvider` 检查资源 `show` 权限；
可设置 `accessCheck={false}` 关闭这次浏览器侧提示检查，但不能关闭服务端授权。
`PivotProvider.aggregate(query)` 接受经过纯数据快照和结构校验的查询，返回
`PivotPayload`。类型及 `snapshotPivotQuery`、`decodePivotResult` 从
`@svadmin/core/pivot` 导出。

```svelte
<script lang="ts">
  import type { PivotProvider } from '@svadmin/core/pivot';

  const provider: PivotProvider = {
    async aggregate(query) {
      const response = await fetch('/api/order-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!response.ok) throw new Error('聚合请求失败');
      return response.json();
    },
  };
</script>

<PivotTable
  {provider}
  resource="orders"
  scopeKey={analysisScopeKey}
  enabled={canAnalyze}
  rowField="department"
  columnField="category"
  valueField="amount"
  aggregator="avg"
/>
```

宿主仍须让 `analysisScopeKey` 表达业务授权范围及权限版本，不能将它当作授权凭据。
SPA 异步 Provider 模式额外绑定 Core 认证会话及管理上下文租户：切换认证 Provider、
租户或通过 Core 登录/登出流程改变会话，即使业务 `scopeKey` 未变，也会隐藏旧结果、
隔离缓存并丢弃迟到响应。认证会话不可用期间显示不可访问状态，不读取缓存或请求聚合。
绕过 Core 直接修改外部登录状态时，宿主仍需主动更新作用域或禁用组件。
作用域缺失、查询无效或 `enabled=false` 时不调用 Provider。更换 Provider、查询、
作用域或禁用后会隐藏旧结果并忽略迟到响应；这不等于取消服务端请求。
失败仅显示通用错误，内置重试按钮重新发出当前查询，不展示 Provider 私有异常。

返回值为 JSON 对象：

```json
{
  "rows": [{ "key": "department:sales", "value": "sales", "label": "销售" }],
  "columns": [{ "key": "category:books", "value": "books", "label": "图书" }],
  "cells": [{ "rowKey": "department:sales", "columnKey": "category:books", "value": 12 }],
  "rowTotals": [{ "key": "department:sales", "value": 12 }],
  "columnTotals": [{ "key": "category:books", "value": 12 }],
  "grandTotal": 12
}
```

每个轴键必须唯一，单元格引用必须属于声明的轴，重复单元格和缺失轴汇总会拒绝整份
结果。稀疏矩阵可省略无数据单元格；汇总与值只能为有限数字或 `null`。服务端直接计算
行、列及总计，组件不会从局部分组均值反推全量均值。轴各最多 200 项、单元格最多
40000 项；服务端与传输层仍须限制响应大小和执行成本。

SPA 与 Lite 均支持 `aggregateData={authorizedPayload}`，可在服务端预取后直接 SSR；
异步 Provider 不在 SSR 阶段调用。输入优先级为 SPA `provider`、`aggregateData`、本地
`data`，不要混用来源。Lite 不执行客户端 Provider 请求，更新仍由页面导航完成。

这是聚合展示与异步适配协议。SPA 在已注册管理上下文中会先执行资源 `show`
权限查询，并在权限 Provider、查询或作用域变化后丢弃旧结果；这只是浏览器侧
呈现控制，不是授权证明。可选 `cache` Provider（必须提供稳定的 `providerKey`）会以包含
数据源命名空间、查询快照和 `scopeKey` 的不可变缓存键读写聚合结果；权限检查始终先于
缓存读取。组件在基础缓存键之外还编码 Core 认证会话版本和管理上下文租户，旧缓存键
不再命中，不自动迁移旧缓存。会话键用于当前运行时隔离，不承诺跨刷新复用。
默认不缓存，宿主仍须更新业务权限版本。缓存接口只负责浏览器侧复用，
不替代服务端授权、失效和敏感数据策略。
`cache.get(key)` 返回聚合回执或 `undefined`，`cache.set(key, payload)` 接收独立快照，
两者都可同步或异步。同一缓存中不同数据源必须使用不同 `providerKey`；缓存有效期、
容量及主动失效由适配器负责。读取异常或非法缓存回执视为未命中，写入异常不遮蔽有效
聚合结果。作用域过期后不再发起聚合或新的缓存写入；已经发出的写入不能撤回。
这个可选接口尚不代表统一资源查询缓存或请求去重已经交付。静态 `data`、
`aggregateData` 及 Lite 的预授权数据仍须由宿主在身份变化后清理；上述自动隔离只覆盖
SPA 异步 Provider。钻取回调保留业务 `scopeKey`，不把内部缓存会话键当作服务端授权信息。
后端必须独立校验资源、字段、筛选及租户权限，`scopeKey` 和 `enabled` 不是授权证明。
现有本地数据消费者无需改变数据格式；原来把服务端预聚合记录交给 `data` 的调用方
应改为上述回执结构，否则平均值和计数仍可能有错误语义。

Lite 的数据计算契约相同，但恢复动作是整页导航而非客户端回调，因此能力台账标为
语义降级，不再标注完整 1:1 对齐。本轮聚焦测试覆盖聚合、类型区分、容量、状态、
重试、格式化异常与无浏览器运行时的服务端输出；未宣称完成读屏、性能或 hydration 验收。

## GanttChart / LiteGanttChart

两种组件共用 `@svadmin/core/gantt` 的时间线校验，需与包含该入口的 Core 同步升级。
现在支持受约束的任务依赖和零时长里程碑校验，但仍不是工作日历或自动排程引擎。

### 破坏性调整

- `totalDays` 必须为 1 至 366 的整数；不再接受负值、小数、无穷大或任意大范围。
- 任务 `id` 必须为非空且唯一的字符串，标题不能只含空白；两者长度最多 1000
  个 UTF-16 码元。
- `startDay` 为从 0 开始的非负整数，普通任务的 `durationDays` 为正整数。任务区间必须完整
  落在当前时间线内，不能再依赖越界条形或隐式截断。
- `progress` 可缺省，否则必须是 0 至 100 的有限数字，允许小数。
  `status` 只接受 `planned`、`in_progress`、`completed`、`delayed`。
- 可选 `dependencies` 保存同一批任务中的前置任务 ID；依赖必须存在、不能重复或成环，
  且前置任务结束日不能晚于当前任务开始日。`milestone: true` 只允许零时长事件。
  里程碑 `startDay` 必须小于 `totalDays`；SPA/Lite 显示独立标记和可访问事件名称，
  不把它画成占用一日的任务条。依赖错误整体拒绝时间线，不渲染部分任务。
- 最多 1000 个任务，且 `任务数 × totalDays` 不得超过 40000。
  整批依赖最多 10000 条；拓扑检查使用迭代算法，零时长事件组成的循环也会拒绝。
  无效输入和超限均显示错误，不渲染部分时间线。
- SPA 时间条宽度严格对应持续时间，不再以 4% 强制最小宽度。
  短任务仍可通过整行选中；未配置 `onselecttask` 的行是只读分组，不再伪装成按钮。
- 配置选择回调后支持点击、Enter 和 Space，任务可访问名称包含起止天数、
  状态和已提供的进度。Lite 表格提供行列标题和覆盖日期的文本替代。
- Lite 标题改为与 SPA 一致的本地化标题，状态不再直接显示内部英文枚举。

宿主若需要展示跨窗口任务，应先明确裁剪规则并保留真实原始起止日期；不要把裁剪后的
时长当作业务任务真实时长提交。依赖只提供 Finish-to-Start 的数据校验，不会自动移动
任务或计算关键路径；日期、时区、非工作日和任务授权仍由应用或专业引擎负责。

两种组件新增 `loading`、`error` 和 `ariaLabel`，加载/错误期间隐藏旧任务，
空输入显示空状态。SPA 用 `onRetry` 请求宿主重新加载；Lite 用站内绝对路径
`retryHref` 进行原生导航，路径限制与透视表一致。
组件不自己发起请求、执行写入、取消远端任务或屏蔽宿主请求的迟到响应。

升级时请清理越界任务、重复标识、无效进度、缺失/循环依赖和旧英文文案断言，并按
范围分批展示大时间线。依赖字段是新增可选输入，不配置时保持原有时间线行为。
本轮证据为聚焦模型/组件测试及无浏览器运行时的 SSR 输出，
不代表真实读屏、浏览器性能、hydration 或完整调度能力已经验收。
Lite 因不提供客户端选择回调、使用原生导航恢复，台账改为语义降级。

## TreeSelect

多选模式采用级联叶子值语义：选择一个父节点会选中其所有可选叶子节点，
取消父节点会移除这些叶子值。绑定值只保存叶子节点，不再保存父节点和子节点
的混合列表。父节点的全选和半选状态由当前叶子值自动推导。

```svelte
<TreeSelect
  multiple
  options={departments}
  value={selectedTeamIds}
  onchange={(next) => selectedTeamIds = next}
/>
```

需要懒加载的节点使用 `hasChildren: true`，并提供 `loadChildren`。组件会在首次
展开节点时请求子节点，并在请求期间保持展开控件忙碌状态：

```svelte
<TreeSelect
  options={departmentRoots}
  loadChildren={async (node) => fetchTeams(node.value)}
/>
```

迁移时请检查：

- 后端筛选参数是否期待父节点值；如需要父节点语义，应在提交边界显式聚合；
- 是否将 `value` 中的父节点当作已选项保存；
- 是否仍有重复的外部错误提示或重试控件；
- 自定义包装器是否保留 `Arrow`、`Home`、`End` 键盘路径和 `aria-checked="mixed"`。

当前懒加载失败会显示脱敏错误状态和重试按钮，调用方不需要自行拼接错误文案。
并行展开不同分支是安全的，重复点击同一分支不会创建重复请求。组件会忽略
卸载、禁用、加载函数更换或外部替换数据树之后返回的旧结果，但不会取消已经
发出的 Promise；如果业务需要取消网络请求，应在 `loadChildren` 内使用
`AbortController`，并在组件作用域变化时自行终止请求。
多选模式点击含未加载分支的父节点时，会递归加载该子树的可选分支，再一次性
更新全部可选叶子值；禁用分支及其后代不参与祖先级联。加载过程中父节点显示忙碌状态，
重复选择同一父节点不会重复发出请求。加载失败不改变原选择，父节点显示脱敏错误
及重试入口；重试复用已加载数据，而不是重新获取全部分支。

禁用状态现在同时阻止后代的直接点击、Enter/Space 选择和异步展开，
而不只影响祖先级联。已展开的后代仍可查看和移动焦点，但标记为 `aria-disabled`，
搜索不会解除继承的禁用状态。原先只禁用父节点、仍允许选择后代的用法需要迁移：
不要在该分支父节点设置 `disabled`，改为明确禁用不可操作的叶子节点。
此调整不会静默删除已经绑定的值，调用方仍需在提交边界重新校验权限和可选范围。

搜索只改变可见节点，不缩小父节点的级联范围：全选、取消全选和半选状态均基于
原始子树。尚有未加载分支时，即使当前已知叶子全部选中，父节点仍显示半选，
而不是错误地宣称整组已选中。原先依赖搜索后只选择可见叶子的调用方需要调整。

单次自动级联最多访问 10,000 个节点、发出 100 次子节点加载、进入 64 层后代。
超过任一限制会保留原选择并提示重试或缩小分支；这是客户端保护上限，
不是“支持万节点交互性能”的验收声明。需要跨更大范围选择时，使用后端明确授权
的整组操作，不要依赖客户端自动遍历代替服务端批量命令。

改选其他节点、清空、移除已选项、替换绑定值、切换数据源、禁用或卸载，
都会使进行中的旧级联选择失效，不会在迟到响应后覆盖新选择；已经加载的数据
可以留在当前树中，但没有提交的选择不会被补交。`onlyLeafSelectable` 模式通过
点击或键盘只展开父节点；单选允许选父节点时，不会为了选父节点加载整棵子树。
树的键盘导航现在限制在当前 `TreeSelect` 实例内，多实例页面不会互相抢焦点；
节点 DOM 键同时包含值类型，字符串 `"1"` 与数字 `1` 不再被当成同一个节点。
自定义包装器如果自行实现键盘导航，应保留同样的实例范围和类型区分。

当可见节点达到 200 个时，TreeSelect 默认切换到固定行高窗口化渲染：
默认行高为 36px、视口高度为 280px，窗口前后各保留 5 行。`itemHeight` 只接受
32-100px 的整数，`viewportHeight` 只接受 120-800px 的整数；非法值回退默认值。
窗口化只减少 DOM 挂载量，不改变搜索、父子级联、已选叶子值或后端请求范围。
`ArrowUp/Down`、`Home/End` 在窗口之间移动焦点时会自动滚动，树项继续暴露
`aria-level`、`aria-posinset` 和 `aria-setsize`。

若旧包装器依赖所有节点同时存在于 DOM，需迁移到按稳定节点 ID 管理状态，
或者显式传 `virtualized={false}`。组件不提供任意行高或拖拽排序。虚拟化不等于
远程分页、服务端搜索或权限过滤；调用方仍须在 Provider 边界完成数据裁剪与授权。
搜索和外部根数组替换会将窗口复位到顶部；内部懒加载不会主动复位滚动位置，
可见列表缩短时窗口会钳制到有效范围。当前聚焦测试覆盖 10000 个已加载节点的
DOM 窗口、键盘跨窗口导航和离屏选择，不代表完成浏览器性能测量或人工读屏验收。

数据树采用不可变更新契约：外部替换节点、子节点或数据源时必须赋值新的
`options` 根数组，不要原地修改节点。根数组替换会废弃所有待处理的子节点请求；
组件自身补充子节点不会废弃其他分支的请求。保持 `loadChildren` 函数引用稳定，
仅在加载数据源改变时替换。

原先依赖加载失败后父节点仍被展开的包装器需要调整：失败时保持未展开，
用户可以通过内置重试按钮重新加载。原始异常不会显示在界面中，如需记录，
在 `loadChildren` 中捕获、记录后重新抛出。升级后应至少验证空树、加载中、
失败重试、并行分支、切换数据源和卸载后的迟到响应。

## VirtualTable

`VirtualTable` 现在明确是 SPA 的固定行高虚拟窗口，不是通用表格引擎。
`itemHeight`、`height` 和 `overscan` 会向下取整，分别限制在 16–1000 px、
16–4000 px 和 0–100；非法输入分别回退为 44、360 和 4（高度 0 也视为非法）。
这意味着原先依赖极小行高或任意 overscan 的消费者需要调整配置。
`rowKey` 指定字段中已提供的标识必须在当前数据集中唯一且为有限数字或字符串，
否则组件显示错误并停止渲染，避免 keyed 行错配；数字 `1` 与字符串 `'1'` 保持区分。
缺失或 null 标识仍降级为位置键，仅适合不重排的静态数据；可编辑行、排序和刷新场景
必须提供稳定标识，不应依赖位置键保存行内状态。

新增 `scopeKey` 用于身份、租户或资源查询作用域切换。作用域改变会将滚动位置
复位到顶部，并重建窗口内的行以清除行片段局部状态；普通数据刷新不会复位。
数据缩短时滚动位置会自动钳制，避免视口停在空白区域。组件同时提供 `loading`、
`error`、`onRetry` 和空状态：加载或错误期间不显示已有记录，只有显式配置
`onRetry` 才显示重试入口。它不负责发请求、鉴权或清除调用方缓存；宿主必须在切换
权限/租户时清理旧 `items`，不能只改变 `scopeKey` 后继续传入旧租户数据。

组件暴露表格行列和绝对行号的 ARIA 语义，可用 `ariaLabel` 提供业务名称。
滚动区域支持上下方向键、PageUp/PageDown、Home/End；这些操作只滚动窗口，
不冒充可编辑网格的逐格焦点导航，也不会截获行内控件的按键。自定义 `rowSnippet`
仍由调用方提供匹配列顺序的 `role="cell"`，并确保内容符合固定行高。
虚拟窗口离屏行会卸载，编辑草稿应由宿主按稳定标识保存，不能只存在行内局部状态。

```svelte
<VirtualTable
  items={loadedRows}
  columns={columns}
  scopeKey={`${tenantId}:${resourceName}`}
  loading={isLoading}
  error={loadError}
  onRetry={reload}
/>
```

Lite 的 `LiteVirtualTable` 不提供客户端虚拟窗口，仅输出原生表格。迁移时必须在
服务端分页、限制返回记录量，或改用 SPA `VirtualTable`；不能继续把 Lite 的
“固定表头”描述为已经支持大数据虚拟化。`rowSnippet` 仍要求固定行高，动态行高、
列拖动、编辑、服务端全量导出和无限数据源不属于本组件承诺。
本轮聚焦测试使用 10,000 条已加载记录验证 DOM 窗口和行号边界，不代表已完成
真实浏览器性能测量、SSR hydration 或完整辅助技术验收。

## TreeTable

`TreeTable` 的选择值仍是节点 ID 数组，但父节点现在根据整个可选子树计算
`checked` 和 `indeterminate`。点击半选父节点会补齐可选后代；再次点击全选父节点
会清除整棵可选子树。`record.disabled === true` 的节点及其后代不参与选择，
不会因为父节点全选而被写入 `selectedKeys`。
注意这里仍保留可选父节点自身的 ID，与 `TreeSelect` 的纯叶子值协议不同。
新增的 `disabled` 记录字段是选择控制标记：原先使用同名业务字段的消费者需明确
是否期望它禁用选择。此标记不代替服务端权限校验；组件级 `disabled` 禁止选择
与展开折叠，但不会禁用调用方 `rowActions` 内部自行定义的业务按钮。

组件现在校验主键、列键、重复 ID、非法 ID、错误的 children 结构，并限制单棵树
最多 10,000 个节点、从根层级 0 起最多 64 层后代。非法数据只显示错误状态，
不挂载交互式树表格；行主键不能缺失，数字 `1` 和字符串 `'1'` 是不同标识。
切换 `scopeKey` 会清除选择、展开状态和行焦点；普通数据刷新会保留仍存在的选择，
但会移除已经不存在、重复或禁用的 ID，并在发生变更时调用 `onselect`。
当前选择仅属于整棵传入树，不支持用同一数组暗中保留服务端其他分页的已选 ID。
调用方应在切换租户或权限作用域时提供新的 `scopeKey` 并同步清理旧数据；
仅更换 `scopeKey` 不会替调用方获取或授权新数据。

新增 `loading`、`error`、`onRetry` 和 `ariaLabel`。键盘支持上下移动、Home/End、
左右展开折叠或移动到父子节点、Enter/Space 选择。首列也会经过 `customCell`，
且保留树缩进与展开按钮；自定义内容应保持列布局和可访问名称。
行导航不截获内部按钮/输入框的键盘事件。组件新增以下可组合的客户端能力；
组件现在支持固定行高的客户端虚拟化；服务端全量树查询仍不由组件提供。

### 排序、筛选与根分页

- 列定义的 `sortable: true` 显示排序按钮，按升序、降序、无排序循环。
  `bind:sort` 使用 `{ key, direction: 'asc' | 'desc' } | undefined`；
  `onsortchange` 接收变更。排序在每一层同级节点内进行，不打散父子结构，
  不修改输入数组，相同值保持源顺序。
- `filterable` 显示搜索框，`bind:filterText` 为搜索文本，
  `filterKeys` 默认使用所有展示列。匹配子节点时保留祖先路径并临时展开；
  匹配父节点时保留其已加载子树。搜索期间禁用展开/折叠按钮，不修改显式展开状态；
  清空搜索恢复显式展开状态。搜索不自动请求尚未加载的后代。
  搜索只处理字符串、数字和布尔值，不执行对象的自定义字符串转换。
- `pageSize > 0` 启用根节点分页，最大 1000；子节点跟随根节点，
  不拆到另一页。`bind:page` / `onpagechange` 可控制和监听页码。
  搜索、排序、页大小或 `scopeKey` 改变时回到第一页；
  数据减少时将页码收紧到有效范围。默认 `pageSize=0` 不分页。
- 选择及父节点半选状态基于完整已加载树，分页或筛选不会清除其他页的选择。
  在筛选结果上勾选父节点仍选择它的完整已加载子树，包括当前隐藏的后代。
  这不是“选择所有服务端匹配记录”，也不代表尚未加载的后代已被选择。

### 异步子节点

```svelte
<TreeTable
  {data}
  columns={[{ key: 'name', label: '名称', sortable: true }]}
  filterable
  pageSize={25}
  scopeKey={tenantScope}
  loadChildren={loadDepartmentChildren}
  canLoadChildren={(record) => record['hasChildren'] === true}
/>
```

`loadChildren(record, id)` 返回该节点的直接子节点数组。默认只有缺少 `children`
数组的节点可懒加载；推荐提供 `canLoadChildren`，避免将叶子节点误认为可展开节点。
返回 `[]` 表示已确认叶子节点并缓存，不会重复请求。加载失败提供行内重试，
错误信息脱敏；未完成请求按节点去重，加载期间折叠不会在请求结束后强行展开。
“全部展开”仅作用于当前页已加载分支，不会自动向后端请求整个未知树。

响应在合并前经过纯数据快照和整树主键、节点数量、深度检查；
跨分支重复 ID、循环数据或非法 `children` 不进入缓存，也不替换现有正常行。
新加载后代不会自动继承原有父节点选择，父节点重新计算半选状态。

`scopeKey`、根 `data` 引用、加载函数、加载判断函数、主键/子键配置、
禁用/加载/错误状态变化时，旧异步请求失效且懒加载缓存清空。
同一函数和同一数据引用应保持稳定；刷新根数据时使用新数组。
切走再切回、卸载以及旧请求结束，都不能更新新作用域或解除其忙碌状态。
界面隔离不取消后端请求；后端授权、网络取消和错误审计仍由宿主实现。

升级时应验证：根分页与子树完整性、筛选后父节点选择范围、排序后键盘顺序、
刷新后的缓存重建、空子节点、失败重试，以及租户切换时迟到响应不回写。

### 固定行高虚拟化

设置 `virtualized` 后，TreeTable 只渲染当前窗口及 `overscan` 行；索引、选择、
半选、筛选、排序、懒加载和 `aria-rowindex/aria-rowcount` 仍按完整已展开结果集计算。
`height` 默认 360，`rowHeight` 默认 40，二者都会被限制在合理范围；动态行高、
跨行合并和拖拽调整行高不受支持。虚拟化要求内容能在固定行高内显示，较长内容应由
自定义单元格自行截断或提供详情入口。

虚拟化滚动区域会在 `scopeKey`、筛选、排序、页大小和分页变化时复位。Home/End、
上下方向键跳转到窗口外节点时会先滚动再恢复焦点；内部按钮和输入控件仍不被行导航
截获。虚拟化只减少浏览器 DOM，不改变客户端内存中的完整索引，也不替代服务端
分页、游标查询或权限过滤。十万条以上的业务数据仍应优先使用服务端树查询和
明确的子节点协议，不应仅把 `virtualized` 当作容量证明。

迁移时需新增验证：桌面视口滚动到首行和末行、键盘跳转、筛选后窗口定位、
分页与虚拟化同时开启、懒加载子树进入窗口，以及权限/租户切换时滚动位置和旧请求
均被清理。

2026-09-19 本地 Chromium 验收：在 `1440x900`、`1920x1080` 桌面视口检查
300 行、40px 固定行高，首屏挂载 16 行；Home/End 可回到首末行并聚焦，
末行可完整到达、表头保持固定，未出现页面横向溢出。另外验证了 150 根节点分页的
外部页码更新会归零滚动位置，以及 500px 宽单列长名称的失败重试按钮可点击并恢复加载。
这些证据不代表读屏软件、所有自定义单元格或十万级数据性能已经验收。

Lite 的 `LiteTreeTable` 仍是无脚本的递归原生表格：不提供展开折叠、选择、
半选、键盘树导航或作用域状态。需要这些能力时使用 SPA `TreeTable`；
SSR 页面应在服务端完成数据裁剪、权限过滤和树结构校验。

## NumericInput

新增 `NumberInput`、`MoneyInput` 和 `PercentInput`，并已接入
`FieldRenderer` 的 `number`、`currency`、`percent` 字段。

数值组件的绑定值统一为 `number | null`：空输入回传 `null`，输入 `0` 保持为
数字零，不再用字符串或 `0` 伪造空值。可通过字段定义传递：

```ts
{
  key: 'completion',
  label: '完成率',
  type: 'percent',
  scale: '1',
  min: 0,
  max: 1,
  step: 0.01,
  precision: 1,
}
```

`PercentInput` 的 `scale: '1'` 表示绑定值使用 `0..1`，界面显示
`0..100%`；`scale: '100'` 表示绑定值本身使用百分数。`MoneyInput` 的
`currency` 只负责输入上下文和展示标识，不改变金额的数值单位。

迁移时请检查：

- 是否仍把空数值解析为 `0` 或空字符串；
- `min`/`max`/`step` 使用的是存储单位还是显示单位；
- 百分比字段是否统一选择 `scale: '1'` 或 `scale: '100'`；
- 服务端 Schema 是否接受 `null`，以及是否需要将空值转换为缺失字段。

## DateTimeInput

新增 `DateTimeInput` 和 `DateRangeInput`，并已接入 `FieldRenderer` 的
`date`、`time`、`datetime`、`daterange` 字段。

同时新增 `DatePicker` 和 `DateRangePicker` 作为 date-only 的公开入口。它们只是
`DateTimeInput mode="date"` 与 `DateRangeInput mode="date"` 的类型化封装，不引入
第二套值、时区或校验语义：

```svelte
<DatePicker bind:value={publishedOn} />
<DateRangePicker bind:value={reportRange} />
```

需要时间、时区或跨日时间范围时继续使用 `DateTimeInput`/`DateRangeInput`，不要把
`DatePicker` 当作 datetime 控件。迁移时可以直接将原先手写的 date 输入替换为
`DatePicker`，将两端 date 输入组合替换为 `DateRangePicker`；绑定值和
`disabledDate`、`min/max`、`required`、无障碍属性的语义保持不变。

当前输入契约使用浏览器原生值：

- `date`：`YYYY-MM-DD`；
- `time`：浏览器时间输入值；
- `datetime`：默认使用本地 `datetime-local` 值，仅显式启用下方 instant 模式时转换时区；
- `daterange`：`{ start: string | null, end: string | null }`，允许半开放范围。

civil 日期范围控件使用另一端的值收紧原生 `min/max`，不会放宽调用方传入的外部边界。
清空一端后恢复外部边界。原生表单校验用于检查起止顺序；绕过原生提交的应用仍须
在提交边界验证，不应把输入回调视为有效数据回执。没有设置 `required` 时允许半开放
范围，设置后两端都必填。空范围编辑始终回传完整 `{ start, end }`，未填端为 `null`。
两个输入默认提供本地化名称，可用 `startAriaLabel/endAriaLabel` 覆盖；`FieldRenderer`
还会附带业务字段名称。`time` 范围按同一天处理，跨午夜区间须使用带日期的值。

`DateRangeInput` 现支持 `valueMode="instant"`、`timeZone` 和 `disambiguation`。
必须同时设置 `mode="datetime"`；资源字段使用
`dateInput: { rangeMode: 'datetime', valueMode: 'instant', timeZone: 'Asia/Shanghai' }`。
范围端点及快捷范围必须使用带 `Z` 或显式偏移的 ISO 时间点，不能把旧本地值简单加 `Z`。
用户编辑后输出 UTC ISO；未编辑端点和快捷范围保留输入的合法偏移表示。

instant 模式中 `min/max` 和 `disabledDate` 仍按显示时区的 civil 值校验；
起止顺序额外按时间戳比较，通过原生自定义有效性约束阻止逆序草稿提交。
不会把另一端的本地钟面值作为原生 `min/max`，否则夏令时回拨期间真实有序的时间段
可能被误拒绝。单值 `DateTimeInput` 新增的 `minInstant/maxInstant` 是独立时间点边界，
只在 instant 模式使用，与 civil 边界同时生效。

已有合法偏移值已明确选择夏令时重复小时中的时间点，回显及未改值不再次消歧；
编辑为新的歧义时间时仍采用 `disambiguation`（默认拒绝），不存在的本地时间始终拒绝。
快捷范围按端点所含偏移判断，无需重新选择重复小时；非法配置、越界或逆序快捷范围
整体拒绝。未填一端仍可输出 `null`；服务端必须重新检查范围完整性、时间顺序及业务规则。

### 明确的时间点模式

单个 `datetime` 字段可设置：

```ts
{
  key: 'occurredAt',
  label: '发生时间',
  type: 'datetime',
  dateInput: {
    valueMode: 'instant',
    timeZone: 'Asia/Shanghai',
    disambiguation: 'reject',
  },
}
```

直接使用 `DateTimeInput` 时同名属性含义一致。instant 模式绑定值必须是带 `Z` 或
明确偏移量的 ISO 字符串，编辑输出统一为 UTC ISO 字符串，空值仍为 `null`。
不接受纯日期、无偏移量 datetime 或宽松的日期文本。原生输入显示配置时区的本地时间，
配置 `name` 时由隐藏字段提交 instant，不再把显示值作为同名字段提交。
`min/max` 和 `disabledDate` 仍使用显示时区的本地日历值，不接受 UTC 边界字符串。

时区缺失/无效、非 datetime 模式误配 instant、非法绑定值和不可用草稿都会产生原生
表单校验错误。切换时区只重新展示原时间点，不触发修改回调。
夏令时不存在的本地时刻始终拒绝；重复时刻默认拒绝，业务明确指定 `earlier` 或
`later` 后才选择其中一次。毫秒精度和非整小时时区偏移保留，不能把消歧失败当作空值保存。

底层转换采用 `@internationalized/date`。`@svadmin/core/date-time` 提供独立的
`civilDateTimeToInstant`、`formatCivilDateTime`、`parseDateTimeInstant`，无需加载
Svelte 组件；Core 包新增该运行依赖，升级消费者时应安装同批 Core/UI 构件。
服务端须按相同业务时区与消歧规则重新校验，运行环境的时区数据库也需保持一致。

单值和范围的 instant 模式均为显式启用，不会自动迁移旧数据，也不会改变纯日期、
时间或默认 civil 模式的协议。现有无偏移时间必须由业务确认来源时区后显式迁移，
不能简单追加 `Z`。导入转换与筛选编辑器的统一接入仍需继续完善。

```ts
{
  key: 'activePeriod',
  label: '生效区间',
  type: 'daterange',
}
```

现在可通过 `DateRangeInput` 的 `presets` 提供快捷范围，并通过 `DateTimeInput`
和 `DateRangeInput` 的 `disabledDate(date)` 拒绝业务禁用日期。快捷范围必须同时满足
格式、外部 `min/max`、起止顺序和禁用规则；不符合条件的选项会禁用，不能绕过校验。
单个输入遇到禁用值时保留浏览器草稿以便修正，但不会触发 `onchange`，并设置原生
`customValidity` 与 `aria-invalid`。

`disabledDate` 接收无时区的 `YYYY-MM-DD`，用于 `date` 和 `datetime` 的日期端点；
`time` 模式不调用它。规则抛错视为不可选。范围内部的工作日、连续可用性或排班冲突
不由端点校验推断。快捷范围由宿主提供稳定值，例如：

```svelte
<DateRangeInput
  presets={[{ label: '本月', value: { start: '2026-09-01', end: '2026-09-30' } }]}
  disabledDate={(date) => closedDates.has(date)}
/>
```

宿主按业务时区生成“今天/本月”等动态范围，不能在服务端和浏览器各自取不同的今天。
新增 `DateRangePreset` 类型从 UI 根入口导出；也可通过 Core 导出的
`DateInputOptions` 为资源字段配置 `dateInput`，由 `FieldRenderer` 统一传递：

```ts
{
  key: 'period',
  label: '有效期',
  type: 'daterange',
  dateInput: {
    rangeMode: 'datetime',
    min: '2026-09-01T00:00',
    max: '2026-09-30T23:59',
    step: 60,
    disabledDate: (date: string) => closedDates.has(date),
    presets: [{
      label: '夜班',
      value: { start: '2026-09-19T22:00', end: '2026-09-20T06:00' }
    }]
  }
}
```

`dateInput.min/max` 使用原生日期/时间字符串，与数值字段的 `min/max` 独立；
`rangeMode` 仅用于 `daterange`，单值输入由字段 `type` 决定。
依赖标准 `FieldRenderer` 的表单无需自建日期组件；使用自定义字段渲染器的宿主需
自行传递策略。`presets` 只对范围字段生效；`disabledDate` 是可信宿主函数，
不能从 AI/Surface JSON 配置加载可执行代码。

这是 UI 输入策略，不是资源 Schema 或服务端授权规则；导入、筛选、服务端写入尚不会
自动执行此配置，提交前须使用可信资源 Schema/业务校验。升级后不合法的输入不会再直接触发回调，
宿主若需要观察无效草稿，不应从已接受值推断。

本版本仍不提供逐日自绘日历、时区转换或复杂日历面板。`disabledDate` 不会使原生
日历弹层自动逐日置灰，因此需要在提交边界再次调用同一规则。业务必须明确
租户时区和服务端存储格式，不能把本地 `datetime-local` 值直接当作 UTC 时间。

迁移时请检查：

- 后端是否将 `datetime-local` 明确解释为租户时区或用户时区；
- 半开放范围是否允许只有开始或只有结束；
- 纯日期是否禁止在序列化时附加午夜时区；
- 快捷范围是否使用固定的纯日期/本地时间值，并覆盖禁用日期与边界日期；
- 服务端是否重复执行 `disabledDate` 对应的业务规则，而不是信任浏览器控件状态。
- 表单回显是否保留浏览器控件要求的字符串格式。

### 日期时间展示

`FieldDisplay` 现在为 `datetime` 和 `time` 注册经过类型校验的 `DateField`，
分别展示日期加时间和纯时间，不再落入“未注册字段”状态。

`DateField` 区分无时区日历值与真实时间点：

- `YYYY-MM-DD`、不含偏移的 `YYYY-MM-DDTHH:mm[:ss[.SSS]]`、
  `HH:mm[:ss[.SSS]]` 保持原日期/钟面时间，不随浏览器或
  `options.timeZone` 改变。非法日期、24 点、越界分钟或秒返回 `nullLabel`。
- 日历值的 `title` 和 `format="iso"` 保留输入，不再伪造 `Z` 后缀；
  `relative` 对无时区值使用普通日期展示，不猜测它与当前时间的距离。
- 带 `Z`/偏移的时间、数字毫秒时间戳及 `Date` 仍表示真实时间点，
  可以通过 `options.timeZone` 展示到指定时区。格式化配置非法时回退到原日历值
  或时间点 ISO 文本，不再隐式使用机器默认日期格式。

这是展示语义调整。旧调用方若依赖把生日、账期或本地预约时间转换到浏览器时区，
须改为明确传入真实时间点；业务时区转换仍由宿主负责，不将“无时区值不跨天”
等同于已实现夏令时歧义解析或租户时区转换。

## Schema 表单升级步骤

`JsonSchemaForm` 与 `LiteJsonSchemaForm` 现在共享 `@svadmin/core/schema-form`
中的受限 Schema 契约。此次升级不是对旧表单接口的兼容扩展：未知关键字、错误类型、
循环 Schema 和超限结构会被拒绝，调用方应在初始化组件前完成 Schema 迁移。

支持的结构包括 `object`、`array`、`string`、`number`、`integer`、`boolean` 和
`null`，以及 `enum`、`required`、长度/数值/数组数量约束。未提供初值的 `null` 字段
初始化为 `null`（显式传入的值不会被自动纠正）；旧实现中将其当作空字符串、
缺失字段或只读文本的调用方，需要在提交适配层改为显式处理 `null`。

条件显示使用扩展关键字 `visibleWhen`，不是完整 JSON Schema 的 `if/then/else`：

```ts
{
  properties: {
    mode: { enum: ['basic', 'advanced'] },
    details: {
      type: 'object',
      visibleWhen: { path: ['mode'], equals: 'advanced' },
      properties: { name: { type: 'string' } },
    },
  },
}
```

条件路径必须从根对象开始，只能引用无条件的标量字段；`equals`、
`notEquals` 和 `exists` 可组合，组合关系为 AND。数组 `items` 节点不允许使用
`visibleWhen`，因为数组项隐藏后的索引和提交投影没有稳定的通用语义；需要按行控制
显示时，应把条件字段放在数组项对象内部，并由业务层决定行级状态，或拆分为多个
明确的数组字段。

SPA 表单会保留隐藏字段的本地草稿，但提交时会移除隐藏字段；Lite 表单会在服务端
解码时执行同样的投影，并拒绝隐藏字段伪造、缺失可见字段、重复字段和约束违规。
因此服务端必须使用 `decodeSchemaFormData`，不能直接信任浏览器提交的字符串。

迁移步骤：

1. 同步升级 `@svadmin/core` 与使用的 UI/Lite 包，确保 Core 提供 `./schema-form`
   子入口。将展示自定义字段迁移到组件外；`format`、`oneOf`、`if/then/else`
   等不支持的约束必须迁移到业务校验或其他支持的表单，不能仅删除并丢失校验。
2. 将空值策略明确为“缺失”或 `null`；必填 `string` 遵循 JSON Schema 的存在语义，
   空字符串需要额外配置 `minLength`。
3. 将条件控制器提升为根对象下的无条件标量字段，删除数组项上的 `visibleWhen`。
4. SPA 使用 `onsubmit(preparedData)`；Lite 使用 `decodeSchemaFormData` 后再进入
   领域命令或 RPC。不要把表单校验当作权限、状态机或业务授权校验。

无脚本 Lite 页面切换条件后需要服务端回显，不承诺客户端即时联动。
`pattern` 仅接受可信配置；长度限制不等于正则执行时间隔离，不应接收用户提供的正则。

## ComboboxField

`ComboboxField` 现在支持 `multiple` 受控多选。多选时绑定值必须是
`(string | number)[]`，清空回传空数组；单选仍使用标量值，清空回传 `null`。
不要在同一个字段中混用两种值形状。

```svelte
<ComboboxField
  resource="users"
  multiple
  value={memberIds}
  onchange={(next) => memberIds = next as (string | number)[]}
/>
```

已选值会通过 `getMany` 单独回显，因此当前搜索结果不包含已选记录时仍能显示。
Provider 必须实现 `getMany`，并返回请求的全部 ID；缺失或重复 ID 会被视为无效响应，
不会静默把已选值改成错误记录。租户、Provider 或资源作用域变化时，旧请求结果会被丢弃。

迁移时请检查：

- `multiple` 关系字段是否把默认值从标量改成数组；
- 清空逻辑是否从 `null` 改为 `[]`；
- 表单提交是否按数组生成重复的字段值，而不是提交 JavaScript 数组字符串；
- Provider 的 `getMany` 是否支持跨页已选项回显，并保持租户权限边界。

### 远程选项分页

`ComboboxField` 默认从一次请求 999 条改为每页 50 条，并提供“加载更多”入口。
新增 `fetchSize` 属性，接受 10–200 的整数，省略或非法值均回退为 50。
此默认值只影响该组件，不改变其他 `useSelect` 调用方。

```svelte
<ComboboxField
  resource="users"
  multiple
  fetchSize={50}
  value={memberIds}
  onchange={(next) => memberIds = next as (string | number)[]}
/>
```

- Provider 的 `getList` 必须按 `pagination.current/pageSize` 分页，并返回当前筛选
  的 `total`。不能忽略分页参数或把当前页长度冒充全量匹配数量。
- 搜索在 300ms 防抖后应用并回到第一页，已加载选项清空；加载后续页保留当前搜索
  条件。等待搜索或查询返回期间不允许选取旧结果。
- 多选保留跨页 ID，已选标签仍由独立查询回显。累积结果按原始类型区分 ID，
  数字 `1` 与字符串 `"1"` 不合并；同一 ID 跨页重复时更新标签而不重复展示。
- 加载失败提供本地化错误与重试，重试当前失败页，不自动跳到下一页。
- 资源、Provider、租户、认证会话、权限 Provider、字段投影或分页容量改变后，
  清理累积选项并关闭菜单；旧请求不能重新填回新作用域。
- 这是逐页加载，不是虚拟化、游标分页或固定结果快照。已加载页可能因服务端数据变化
  发生位移；需要一致性快照时由 Provider/后端实现。未加载页不能当成不存在的选项。

当前组件定向测试 11 项通过，覆盖分页搜索、多选回显、失败重试、租户隔离、
容量回退和中文空状态；不代表完成万条选项性能或人工读屏验收。

### 静态单选与多选字段

SPA `FieldRenderer` 的 `select` 回调现在保留 `field.options` 的原始值类型；
数字 `2` 与字符串 `"2"` 不再混淆。清空统一回写 `null`，不再回写空字符串。
升级时移除调用方为修复旧字符串行为而添加的强制数值转换，并在提交契约中处理 `null`。
选项值仍只支持字符串和数字，不新增布尔或对象类型。

可见单选控件使用内部 `option:N` 令牌，`name` 转移到同字段的隐藏输入；
不要把令牌保存为业务数据，也不要依赖 `select[name=...]` 定位控件。
原生表单提交仍为业务值的字符串表示，不是类型保真的 SPA 回调协议；
服务端仍需按可信字段契约解码，同文数字/字符串选项不能仅凭 FormData 区分。
空字符串选项可在 SPA 回调中与清空的 `null` 区分，但二者原生提交均为空文本。

单选、多选均尊重选项级 `disabled`。已经选中的禁用值保留回显，
多选复选框和标签删除按钮都不能修改它；字段整体禁用时隐藏输入也不参与原生提交。
禁用控件不是服务端授权或不可变字段校验的替代品。此调整仅覆盖 SPA `FieldRenderer`，
不代表 Lite 表单引擎已完成类型化协议统一。

## FileUpload

新增 `FileUpload` 作为文件字段的统一上传外壳。组件只接收文件和
`AbortSignal`，上传 URL、签名、租户凭据和存储授权必须由调用方的
`upload(file, { signal, onProgress })` 会话回调处理，浏览器不会接触 service role
或管理 token。

组件内置类型/大小/数量预校验、拖放、多文件、进度、取消、失败重试和错误状态。
旧的原生文件输入可以迁移为：

```svelte
<FileUpload
  name="attachment"
  accept="application/pdf"
  upload={uploadWithSignedSession}
  onChange={(items) => files = items}
/>
```

当提供异步 `upload` 时，`name` 不会再写入原生 `<input>` 的表单字段，
避免异步上传和外层 multipart 表单重复提交同一文件；不提供 `upload` 时仍保留
原生 `name`，适用于普通表单提交。单文件模式重新选择文件表示替换原文件，
不会因为已有一个文件而被数量上限拒绝。
异步模式选择后会清空原生输入以允许再次选择同名文件，因此 `required` 不再作为
原生输入校验生效；宿主必须在提交业务表单时根据 `onChange` 返回的成功条目校验
必填附件，并将可信的服务端附件标识提交给业务接口。

迁移时请检查：

- 是否把存储凭据写入浏览器或组件 Props；
- 上传取消后是否由服务端会话安全回收未完成对象；
- 重试是否具备幂等键，不能把同一文件重复写成多个业务附件；
- 表单是否在成功回调后保存服务端返回的资源 URL，而不是本地文件名。

取消会立即把条目标记为 `cancelled`，不再等待上传回调拒绝。
`UploadSession` 新增 `idempotencyKey` 与 `setUploadId(uploadId)`。每次上传尝试有
独立随机键，上传实现应在同一次尝试的网络重试中复用它；用户点击重新上传则创建
新键。服务端创建临时上传会话后调用 `setUploadId`，也可在回执返回 `uploadId`。
ID 必须非空、最多 200 字符，同一次尝试不能更换 ID。

传入 `cancelUpload(file, { uploadId, idempotencyKey, reason })` 后，取消、移除、
替换、作用域变更和卸载会尝试回收未完成上传；取消后才登记的 ID 也会触发回收。
回收使用原尝试捕获的回调，不调用新租户的回调。同一次尝试最多自动调用一次，
宿主负责网络重试和持久化回收队列。没有 ID 或回调时不声称回收成功。
条目的 `cleanupStatus` 为 `pending/success/error`；`success` 仅表示宿主回调
已正常完成，宿主必须先核实服务端回收结果再 resolve，不能将 HTTP 已受理当成删除完成。
旧回收结果不会覆盖新尝试，移除或卸载后不再发送条目状态回调。

服务端必须独立鉴权，并先关闭上传会话、拒绝后续写入再回收临时对象，
否则忽略取消信号的上传仍可能在回收后重新写入。浏览器关闭不保证网络请求完成，
仍需服务端过期回收；已成功的业务附件不会由此自动删除。
此扩展是客户端生命周期契约，不是某个存储后端的回收部署或在线验收证明。
即使上传实现忽略 `AbortSignal`，旧请求的成功、错误和进度回调也不会覆盖取消后的状态。
重试使用独立会话；旧请求的结束不会解除新请求的取消能力。
移除文件、单文件模式替换文件或卸载组件都会中止并丢弃旧会话，
卸载后不再触发 `onChange`。成功后迟到的进度也会被忽略。
当文件数量超过 `maxFiles`，每个超额文件都会触发 `onReject`，并在组件中显示
被拒绝列表；`maxFiles` 不是正安全整数时会回退为单选 1 个或多选 10 个。
更换 `upload` 函数会废弃旧上传作用域：正在上传的条目标记为 `cancelled`，
旧会话的进度、成功和错误回执均不会更新新作用域。这里的取消仍只表示客户端
不再接受旧回执，不等于服务端取消或回滚。
组件不会自动识别闭包内部的身份或租户变化；调用方应在作用域变化时更换
`upload` 函数，或使用 Svelte `{#key scopeKey}` 重建组件。切换身份/租户时推荐重建，
以同时清除已成功的附件条目；仅更换函数不会删除已有条目，也不会自动重新上传。

这些保证只针对客户端状态，不表示服务端已回滚。若取消前服务端已保存文件，
仍须通过上传会话查询、幂等键和回收策略避免重复附件或遗留对象。

### Lite 原生上传

SSR 页面使用 `@svadmin/lite` 导出的 `LiteFileUpload`。它提供可见原生文件输入，
不需要 hydration，也不包含内层 `<form>`；外层表单必须使用 POST 和 multipart 编码：

```svelte
<script lang="ts">
  import { LiteFileUpload } from '@svadmin/lite';
  let { form } = $props();
</script>

<form method="POST" action="?/upload" enctype="multipart/form-data">
  <LiteFileUpload
    name="attachments"
    label="附件"
    accept="application/pdf"
    multiple
    required
    error={form?.uploadError}
  />
  <button type="submit">上传</button>
</form>
```

调用方必须实现 `upload` 服务端 action，使用
`(await request.formData()).getAll('attachments')` 读取多文件。
`accept` 只是浏览器选择提示，不是安全校验。服务端必须重新检查必填、文件内容类型、
大小、数量及当前用户和租户权限，并通过受控存储服务持久化文件。
`createCrudActions` 不会自动提供这个自定义上传 action。

Lite 不接受 SPA 的 `upload`、`onChange`、`maxFiles` 或 `maxSize` 属性；
限制应配置在服务端，失败信息通过 `error` 回显。失败后用户需要重新选择文件提交，
不承诺客户端进度、取消、拖放队列或自动重试。原有 `LiteFileInput` 可以继续使用；
需要无脚本文件选择状态时，改用这里的可见原生输入。此能力在矩阵中标记为
`fallback`，不是完整行为对齐。

## ImportWizard

导入向导将原始 CSV/JSON 文件和字段映射交给核心 `useImport`：
所有行通过资源 `create` Schema 预校验后才开始写入，并校验 Provider 回执。
不要再依赖缺失 Schema 时仍能写入的行为。

### 容量与停止提交

`ImportWizard` 和 `useImport` 新增 `maxRows`、`maxBytes`，
默认也是硬上限：10000 条记录、50 MiB（52428800 字节）。
调用方只能传入更小的正整数；无效配置直接拒绝，不静默提高或放宽。
Core 在读取文件前通过原生 Blob 大小校验字节数，并在写入前检查记录数；
向导在进入映射前也会检查。超限不截断导入，Core 返回
`IMPORT_LIMIT_EXCEEDED`，`writeMayHaveSucceeded` 为 `false`。
大文件需要转交服务端任务流程，不能继续依赖无限浏览器内存。

执行中新增“取消”动作，复用核心 `reset()` 废弃执行令牌，不另起一套导入循环。
取消后停止后续提交、隐藏不再可信的进度和统计，并忽略迟到结果；页面明确提示
已发出的请求可能已经写入，不能把此动作当作远端取消、事务回滚或安全自动重试。
批量 Provider 的一个已发出批次仍可能全部写入。关闭窗口与作用域切换原有的隔离行为保留。

未配置 `taskName` 时仍是当前页面内的本地导入流程，不是持久化任务中心；
需要刷新恢复、服务端取消和幂等提交时必须迁移到下方的服务端任务模式。
任务附件可使用下方对象引用模式；存储上传服务仍由宿主提供，不内置存储凭据。

### 服务端导入任务模式

`ImportWizard` 现在可通过 `taskName`、`taskProvider` 和
`taskIdempotencyKey` 切换到服务端任务模式。向导仍先在浏览器完成文件解析、列映射
和可信创建 Schema 预校验；通过后只提交一次任务，不再在浏览器循环调用
`DataProvider.create/createMany`。任务提交回执中的 `id` 通过 `onTaskSubmitted`
交给宿主保存，重新挂载时使用 `initialTaskId` 恢复查询：

```svelte
<ImportWizard
  resourceName="posts"
  taskName="import-posts"
  taskProvider={taskProvider}
  taskIdempotencyKey={idempotencyKey}
  initialTaskId={savedTaskId}
  onTaskSubmitted={(id) => saveTaskId(id)}
/>
```

任务 `body` 使用版本化协议：

```ts
{
  protocolVersion: 1,
  resource: 'posts',
  fileName: 'posts.csv',
  mapping: { title: 'title', quantity: 'quantity' },
  records: [{ title: 'First', quantity: 2 }]
}
```

后端必须重新读取可信资源契约、租户、操作者权限和任务参数，不能信任隐藏字段、
文件名、映射或浏览器预校验。`taskIdempotencyKey` 必须由宿主按文件内容、映射、
资源和授权作用域稳定生成；提交未确认时不要生成新键重试。任务 Provider 的
`submit/get/cancel` 需要返回同一任务 ID，组件会按当前租户、认证会话、权限、
Provider 和路由作用域隔离旧任务回执。

任务完成结果必须是：

```ts
{
  succeeded: number,
  failed: number,
  failedRows?: Array<{ row: number, error: string }>
}
```

数量合计不得超过导入上限，失败行号不得重复，失败行列表长度不得大于失败数；非法结果只显示协议
错误，不显示 Provider 私有诊断。任务完成后组件停止轮询，运行中任务可通过
`TaskProvider.cancel` 取消。取消不回滚已经执行的服务端写入，部分失败重试必须由
后端任务协议提供新的、可审计的失败行重试命令。

### 对象存储引用模式

当任务不应携带全部 `records` 时，传入 `taskArtifactProvider`。向导先上传原文件，
再以版本 2 协议提交受校验的 artifact 引用：

```svelte
<ImportWizard
  resourceName="orders"
  taskName="import-orders"
  taskProvider={taskProvider}
  taskArtifactProvider={artifactProvider}
  taskIdempotencyKey={idempotencyKey}
/>
```

任务请求改为：

```ts
{
  protocolVersion: 2,
  resource: 'orders',
  fileName: 'orders.csv',
  mapping: { amount: 'amount' },
  artifact: {
    artifactId: 'upload-session-object-id',
    fileName: 'orders.csv',
    size: 52428800,
    contentType: 'text/csv'
  }
}
```

`artifactProvider.upload()` 的回执必须符合 `ImportArtifact`：ID 非空且不超过
200 字符，文件名不超过 255 字符，大小为不超过 50 MiB 的安全整数，可选 MIME
字符串不超过 200 字符。回执会被快照，访问器、循环对象、伪造的大小或私有诊断都会
被拒绝。任务请求不会同时包含 `records`；服务端应从受授权的对象存储会话读取原文件，
重新校验对象归属、大小、内容、映射、资源 Schema、租户和操作者权限。

上传会话必须由宿主实现权限绑定、过期、单次消费或幂等复用、取消后的垃圾回收和内容
扫描。浏览器不能持有存储密钥，也不能把 `artifactId` 当作永久公开 URL。
上传输入包括 `file`、`fileName`、`size`、`resource`、`idempotencyKey` 和 `signal`。
向导从任务幂等键派生稳定的上传键；Provider 必须将同键绑定同一内容，不同内容复用同键
必须拒绝。关闭、卸载、作用域或上传 Provider 变化会中止信号，即使上传忽略信号并返回，
也不会继续提交任务。回执的文件名和大小必须与本次文件一致，但这不能证明存储对象内容真实。
`taskIdempotencyKey` 仍覆盖原文件内容、映射、资源和授权作用域；上传成功但任务提交
未确认时，必须复用同一对象和同一键查询任务，不得重新上传生成第二个对象。
当前向导仍会读取文件以完成列映射和资源创建 Schema 预校验；该模式消除任务请求中的
重复行数据和请求体膨胀，不等于已经交付流式解析或无限大文件支持。需要真正超出浏览器
解析内存的文件，应另建分块上传加服务端预览协议。

新增可选 `retryTaskName`，例如 `retry-import-posts`。只有已完成任务的合法结果含有
`retry: { receiptId: 'receipt-1', rows: [2] }` 且配置了该命令名时，才显示
“重试可恢复失败行”。`rows` 必须非空、不重复、全部属于同一结果的 `failedRows`；
`receiptId` 是不超过 200 字符的非空不可变回执标识，不是凭据。

按钮通过 `TaskProvider.submit(retryTaskName, options)` 提交：

```ts
{
  idempotencyKey: JSON.stringify(['import-failed-rows', 'parent-1', 'receipt-1']),
  body: {
    protocolVersion: 1,
    operation: 'retry-failed-rows',
    resource: 'posts',
    parentTaskId: 'parent-1',
    receiptId: 'receipt-1',
    rows: [2]
  }
}
```

行号升序提交；不包含原始记录、不调用本地 `create`、不使用整任务 `retry`。
未确认提交不会自动重发；手动再次提交使用相同父任务/回执生成的同一幂等键。
后端必须保持回执及对应可恢复行集合不可变，按租户和操作者授权任务、资源和回执，
验证所选行确实未成功写入，以事务/写入回执去重，并原子地创建和记录父子任务关系。
同一键的重复提交返回同一子任务，不得再次执行原父任务；不能确认写入状态的行不可签发
为可恢复行。权限校验、持久化幂等及事务实现属于宿主后端，组件测试不证明后端实现正确。

新任务回执 ID 不能等于父任务 ID。提交确认后向导跟踪子任务，
`onTaskSubmitted` 返回子任务 ID，宿主应更新保存值；子任务的完成统计仅代表本次重试，
不是原始文件累计统计。没有回执/命令配置、失败/取消而非完成的任务不会显示入口。
升级验收需覆盖重复点击、未知提交结果后同键重试、迟到响应、关闭恢复、权限变更，
以及真实后端“不重复写入已成功行”的证据。现有本地导入不会自动转换为该任务协议。

这是显式启用的新任务协议：没有配置 `taskName` 时仍使用原有本地 Provider
导入；配置了 `taskName` 却缺少任务 Provider 或幂等键时直接拒绝，不回退到本地
写入。当前浏览器任务载荷包含映射后的记录，受 `maxBytes` 限制；大文件不应把
全部内容塞进任务 `body`，应先接入受授权的对象存储上传会话，再让任务只接收对象
引用。任务数据库、刷新后任务恢复和跨客户端可见性由 `TaskProvider` 后端实现，
不能用组件内状态或 `useImport` 的完成回调代替。

`taskProvider` 省略时响应式使用管理上下文的任务 Provider。`initialTaskId` 只在
挂载时读取，宿主应在完成身份授权后挂载；资源、租户、认证、权限 Provider、
任务 Provider 或任务配置切换后会清理它，不在新作用域自动查询旧 ID。
`onTaskSubmitted` 仅表示提交已确认，不表示导入完成；`onSuccess` 在当前界面读取到
通过校验的完成摘要时触发，重新打开可能再次触发，不能用于记账或保证仅执行一次。
任务提交期间关闭窗口会丢弃迟到回执，宿主须按原幂等键从后端查询恢复。
浏览器不自动保存任务或原始文件，不自动重试未确认的提交；失败行重试必须使用上面的
显式命令配置和服务端回执，不能从本地错误数组推断可以再次写入。

迁移时请检查：

- 空文件、非记录数组 JSON、重复 CSV 表头和列数错误会阻止继续操作。
- JSON 数组、对象、布尔值和 `null` 保留原始类型，不再转成字符串。
- 空数值字段视为缺失值，不再变为 `0`；必填数值因此会在写入前报错。
- 布尔字符串只转换明确的真/假值，未知字符串不会静默转成 `false`。
- 映射不得把多列写入同一个目标字段，也不得把所有列都忽略。
- 映射确认阶段直接复用 Core 的资源 `create` Schema 校验全部映射行，报错只显示
  首个非法记录的序号（不含 CSV 表头，不是包含换行单元格的物理行号），不回显数据。
  错误时留在映射步骤，可修正映射或返回重选文件。必填性以 Schema 为准，不另外
  使用字段展示元数据维护第二套校验。真正执行前 Core 仍重新读取、解析和校验文件，
  此步骤不是服务端试运行，也不保证唯一性、授权或业务状态检查成功。
- CSV 枚举文本仅在精确匹配唯一且未禁用的选项时转为该选项的原始值。同文数值与
  字符串选项（如 `2` 与 `"2"`）会拒绝，不猜测类型；可改用 JSON 保留枚举类型。
  CSV 的 `json` 字段必须是合法 JSON 文本；JSON 文件中该字段原有的字符串则不再次
  解析，数组、对象、`null` 保持原值。
- `onSuccess` 仅在取得当前作用域的完整处理结果后触发，可能包含部分失败；
  调用方必须检查 `failed`。解析失败、预校验失败及作用域失效不会触发该回调。
- 关闭弹窗或切换资源、租户、Provider、认证会话、权限会清空预览及结果。
  已发出的写入不保证回滚；重新导入前，应查询服务端记录并确认幂等策略。
- 向导使用 `import` 权限和资源 `canCreate` 控制入口，但后端仍必须独立授权。

失败 CSV 只包含失败的提交记录及核心清理过的错误消息，不回显 Provider 的私有异常。
下载文件名会把资源名限制为安全的 ASCII 文件名字符，资源名为空或完全被清理时
使用 `resource-import-errors.csv`，去除前后点、下划线和连字符，并限制资源名前缀
最多 100 字符，避免把资源标识直接当作路径片段。对象 URL 在
下载触发后延迟回收，宿主不应立即复用或手动撤销该 URL。
下载失败记录后，先核对服务端是否已写入，不能把网络错误直接当作可安全重试。

## 保存视图的用户隔离

`AutoTable` 的保存视图、活动视图、列显示和列顺序现在额外按认证身份 ID 隔离。
配置 `AuthProvider` 后，组件通过 `useGetIdentity()` 获取经校验的非空字符串 `id`；
身份查询中、失败、会话不可用或缺少 ID 时不读取/写入这些偏好，保存视图入口禁用。
不会用邮箱、显示名或共享的 anonymous 键代替缺失的用户 ID。
没有配置认证的应用继续使用资源、Provider 和租户作用域，这不提供多用户隔离。

迁移要求：

- `getIdentity()` 返回稳定且在该应用认证域内唯一的 ID，多个身份来源不能复用含义不同
  的同一 ID。数字用户 ID 应在认证适配器中明确转换为稳定字符串。
- 新偏好键在现有资源/Provider/租户键后增加用户段。已认证应用不自动导入无用户归属
  的旧键；旧数据保留不删除，需由宿主确认所有权后显式迁移，不能默认归给首个登录用户。
- 身份或租户作用域变化会关闭视图选择弹层、清空命名草稿并加载新作用域偏好；
  身份不明期间不会把空状态写回前一用户的键。显式 URL 查询仍由现有 URL 优先规则处理，
  宿主切换账号时应同步清理不应跨身份保留的路由参数。
- 个人视图在未配置 `savedViewProvider` 时仍只在同源浏览器本地生效，不是授权凭据，
  也不是加密存储。配置 Provider 后，团队/组织/指定成员范围、版本冲突和跨设备
  同步由 Provider 实现；SVAdmin 只校验请求与回执，不能替宿主持久化。

定向回归覆盖身份延迟、用户 Provider 切换、缺失 ID、旧键不自动迁移及其他用户键不被覆盖。

### 团队与系统视图

可通过新增的 `savedViewProvider` 注入服务端共享视图。相关类型从 `@svadmin/ui` 导出：

```svelte
<script lang="ts">
  import { AutoTable, type SavedListViewProvider } from '@svadmin/ui';

  const savedViewProvider: SavedListViewProvider = {
    async list(scope) {
      const query = new URLSearchParams({
        resource: scope.resourceName,
        provider: scope.providerName,
        tenant: String(scope.tenantIdentity ?? ''),
      });
      const response = await fetch(`/api/list-views?${query}`);
      if (!response.ok) throw new Error('读取共享视图失败');
      return response.json();
    },
  };
</script>

<AutoTable resourceName="orders" {savedViewProvider} />
```

接口直接返回视图数组，每项包含 `id`、`name`、`state` 和可选的
`source: 'team' | 'system'`、`default: true`。`state` 必须包含 `search`、`filters`、`sorters`、
`pagination: { current, pageSize }`、`columnVisibility`、`columnOrder`。
缺省来源按团队视图处理。默认只读；启用写入需 Provider 提供对应的 `save/remove`，
视图明确返回 `readOnly: false` 和正整数 `version`。缺少能力或版本时不能修改已有共享视图。
非法筛选/排序字段会使该视图被拒绝，已移除的列显示/顺序配置会被过滤。

迁移和接入边界：

- 不配置 Provider 时保持个人本地视图行为；已有个人存储无需转换为远程协议。
- 服务端必须根据当前会话重新校验资源、租户和团队权限，不能信任客户端 scope 或用户 ID。
- 身份未就绪时不请求；作用域变化或组件销毁后丢弃旧响应，更换 Provider 时先清空旧选项。
  加载中显示加载状态；读取失败显示错误和重试入口，不再把失败伪装成“没有团队视图”。
  重试只接受当前作用域的回执，不影响列表读取。
- 同 ID 的远程视图在选择器中优先，个人记录不被覆盖或删除。建议服务端使用独立 ID 前缀。
- 共享视图默认需手动选择应用，不自动应用服务端默认视图，也不在刷新后自动恢复共享视图。
  如果业务明确需要默认视图，可传入 `applyRemoteDefaultView`；组件只会在没有 URL 查询
  状态、没有个人活动视图时应用唯一的 `default: true` 视图。多个默认项或默认项不合法
  时全部不自动应用，避免由服务端返回顺序隐式决定结果。
  外部受控分页/排序优先；每个资源、身份和租户作用域最多成功应用一次默认初始化。
  空列表、多个默认项或读取失败不会消耗初始化机会；重试或替换 Provider 后，
  若得到唯一默认项且用户尚未操作，仍可应用。
  用户已搜索、筛选、保存或手动选择视图后，迟到响应和 Provider 替换不覆盖当前查询。
  保存默认仍为个人本地视图；配置 `save` 后可以显式选择团队或系统归属。
  同归属同名视图使用已有版本更新，新视图使用新 ID 与 `expectedVersion: null`。
- 版本冲突保留当前查询，阻止再次写入，用户需刷新视图后重新确认；不自动覆盖或合并。
  请求期间禁用重复操作，作用域或 Provider 变化后忽略旧回执。
  默认项现在可以通过 `SavedListViewProvider.setDefault` 管理。该方法必须携带
  `id`、`source`、当前 `expectedVersion` 和目标 `default` 值；成功回执仍使用
  带版本的保存回执。前端成功后会重新读取完整共享视图集合，因为取消一个默认项
  或设置新默认项可能同时改变同一作用域中的其他视图。冲突、非法回执、作用域切换
  和组件卸载都会丢弃结果。

  可见范围管理通过可选 `updateAccess` 接入，`readOnly`、视图来源和默认标记不能
  被浏览器端自行提升。未提供该方法时，不显示范围编辑控件。

#### 可见范围迁移

共享视图可返回 `access: { mode, subjectIds }`。`mode` 为 `team`、`organization`
或 `restricted`；前两种要求空 `subjectIds`，指定成员要求 1 至 200 个唯一、
非空、无首尾空白的字符串 ID（每项最多 200 字符）。未知字段、重复 ID 或非法
组合会导致该视图被拒绝，而不是降级成更宽的可见范围。缺少 `access` 时显示未配置，
不会默认推断为团队可见。

`updateAccess(scope, { id, source, expectedVersion, access })` 只修改可见范围。
UI 支持范围选择、成员目录查询候选和已选成员管理；Provider 可选实现
`listAccessSubjects(scope, { query, limit })` 返回 `{ id, label, description? }[]`。
未提供该查询能力时，UI 保留受限成员 ID 输入作为无目录降级路径，成员 ID 本身不能
包含分隔逗号。宿主负责根据会话返回可见成员、解析 ID、校验成员归属及授权，并在
一个版本化操作中更新范围。不得把可见范围当作编辑或管理授权。

成功返回 `{ ok: true, version, view }`，其中版本必须递增，视图 ID、来源和
`access` 必须与请求一致（成员顺序可以不同）。缺少范围或返回其他范围不视为成功。
冲突返回既有 `VERSION_CONFLICT` 回执；前端保留草稿并禁用继续写入，直到刷新。
成功后重新读取共享集合，以处理当前用户可能不再拥有访问权的情况。
切换 Provider、身份或租户时清理权限草稿并忽略旧响应。

这是新增可选契约，未接入的消费者无需修改；已返回同名自定义 `access` 字段的
Provider 必须迁移至上述结构。角色授权、独立编辑者/管理者配置、成员目录数据和
实际授权与持久化实现仍属于宿主业务，不属于 SVAdmin。

服务端写入契约现在提供 `SavedListViewProvider.save` / `remove` 的类型边界：
写入必须带资源、Provider、租户和身份作用域，以及显式的 `expectedVersion`：
创建使用 `null`（仅不存在时创建），更新和删除使用读取到的正整数版本。服务端
必须原子比较版本，不接受无版本的覆盖写入。保存还必须明确 `source`。
成功回执为 `{ ok: true, view, version }`；版本不匹配必须返回
`{ ok: false, code: 'VERSION_CONFLICT', current, version }`，客户端不能覆盖服务端
最新版本。使用 `decodeSavedListViewMutationResult` 解码回执，未知字段、非法列、
筛选、排序、版本或私有错误详情会被拒绝。删除成功使用独立回执
`{ ok: true, id, version }`，其中 `id` 必须匹配请求，`version` 必须大于请求版本，
表示删除后的版本（例如墓碑版本）；不能返回保存成功回执代替删除确认。
删除冲突沿用上述包含 `current` 的冲突回执。宿主仍需实现实际授权、版本比较、
持久化和跨设备同步。前端失败提示不会证明后端未执行，重试前应刷新确认。

## 审批中心契约

新增 `ApprovalProvider`、`ApprovalRecord` 和版本化状态迁移解码器，用于在现有
`ApprovalActionCard` 之上构建待办、历史和意见界面。该模块只定义前端边界：
宿主仍负责审批规则、最终授权、事务、附件访问和状态持久化。

```ts
import type { ApprovalProvider } from '@svadmin/core';

const approvalProvider: ApprovalProvider = {
  async list(context, query) {
    // 服务端必须重新校验 context.tenantId、操作者和 query。
    return fetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ context, query }),
    }).then(response => response.json());
  },
  async get(context, id) {
    return fetch(`/api/approvals/${encodeURIComponent(id)}`, {
      headers: { 'x-tenant-id': String(context.tenantId) },
    }).then(response => response.json());
  },
};
```

### 数据和迁移边界

- `ApprovalRecord` 必须包含 `id`、正整数 `version`、当前 `status`、申请人、
  `allowedActions`、附件引用和有序历史。未知字段、重复 ID、非法时间或超过限制的
  列表整体拒绝，不渲染部分可信数据。
- `allowedActions` 只描述当前界面可展示的动作，不是授权证明。迁移提交前仍需用
  服务端重新检查动作、操作者、租户和业务状态。
- 状态迁移必须携带原记录 `expectedVersion` 和幂等键。意见和转交目标是否必填由
  当前记录的 `allowedActions` 声明；前端不会自行把“审批”推断成固定状态。
- 成功回执必须返回同一审批 ID 且版本递增；并发修改返回
  `{ ok: false, code: 'VERSION_CONFLICT', current }`。冲突时保留当前页面意见草稿，
  不自动覆盖或合并服务端历史。
- 附件目前只接受安全的 ID/名称引用，不接受 Provider 返回的任意下载 URL。下载、
  预览、签名和附件权限由宿主提供受授权的后续接口。
- `list` 支持 `pending/history` 两个前端视图、页码、页大小和搜索文本；前端不得
  用当前页数据伪装完整待办数量或历史。页面切换、租户、身份或 Provider 变化时，
  旧列表和旧迁移回执必须丢弃。

这是新增契约，不会自动把旧 `ApprovalActionCard` 转换成审批中心。旧组件仍可用于
单条回调场景；迁移到待办中心时必须保存审批 ID、版本和幂等键，并由宿主提供
`ApprovalProvider`。服务端审批实现、附件存储、通知和审计不属于 SVAdmin。

### ApprovalCenter 接入

从 `@svadmin/ui` 导入 `ApprovalCenter`，通过 `provider` 传入上述适配器。
可选 `requestContext` 接收完整的租户、请求和追踪标识；省略时使用当前管理上下文
的租户创建请求上下文。组件支持待办/历史、搜索、分页，以及当前记录允许的动作。
意见和转交目标满足动作要求后才允许确认。

分页、搜索或作用域变化会关闭动作草稿并重新加载；Provider、租户或认证会话变化
后，旧列表和旧动作回执不再更新当前页面。组件已提供中英文界面文案、基础键盘和
表单语义，但真实读屏、浏览器跨视口和宿主端到端验收仍由发布方完成。此隔离不取消
已经提交的服务端操作，不能作为操作未执行的证明。

## RelationPicker

新增 `RelationPicker`，用于用户、组织、商品、资源等实体关系字段的选择。
它属于前端选择交互，不实现服务端搜索、授权或持久化：

```svelte
<RelationPicker
  resource="users"
  multiple
  value={assigneeIds}
  onchange={(next) => assigneeIds = Array.isArray(next) ? next : []}
  optionLabel="name"
/>
```

### 行为边界

- 选择器通过资源契约和 `DataProvider.getList` 读取分页数据，默认使用记录的
  `id` 作为提交值；展示标签由 `optionLabel` 决定。
- 多选在弹窗内使用草稿状态。翻页会保留已勾选的 ID；取消不会触发
  `onchange`，只有确认后才提交新值。
- 已提交但当前页未加载的 ID 会保留，并通过 `getMany` 回显其标签。服务端必须
  对 `getList`、`getMany` 重新执行当前用户、租户和资源权限校验。
- 搜索、租户、认证会话、资源契约或 Provider 变化时，旧请求的结果不得恢复
  旧选项或旧草稿；无列表权限或认证会话不可用时，选择入口禁用且不发起列表请求。
- 全量匹配选择仍属于 `AutoTable` 的批量选择语义，不要把 `RelationPicker`
  的已选 ID 当作服务端“全部匹配”授权。

### 破坏性迁移

如果旧代码把 `ComboboxField` 当作关系弹窗选择器：

1. 需要把 `value` 和 `onchange` 显式迁移到 `RelationPicker`；
2. 多选值统一为 `(string | number)[]`，单选清空值统一为 `null`；
3. 不再依赖前端拼接详情链接或缓存标签作为权限依据；
4. 宿主 Provider 必须实现分页 `getList`，并在需要回显时实现严格的
   `getMany`；服务端最终授权、租户隔离和关系完整性校验保持在宿主侧。

## 多标签工作区

`MultiTabKeepAlive` 的标签栏现在使用标准 `tablist`/`tab` 语义。迁移自旧版时，
不要再依赖 `div[role="button"]` 或只监听 Enter：标签支持 Enter 和空格键激活，
当前标签通过 `aria-selected` 表示，关闭、刷新和关闭全部按钮必须保留可识别名称。
`pinned` 标签仍不可关闭，关闭当前标签后由组件选择相邻可用标签。

标签状态仍由调用方负责持久化和路由同步；组件不会替宿主保存 URL、查询参数、草稿、
权限或后端数据。跨租户或身份切换时，调用方必须清理不属于新作用域的标签，不能把
标签栏中的可见状态当作授权凭据。

## DashboardView

新增 `DashboardProvider` 和 `DashboardView`，用于把仪表盘快照、指标和文本小组件
统一接入当前租户上下文。Provider 必须返回带正整数 `version` 的快照；组件会拒绝
未知字段、重复组件或指标 ID、空指标小组件、无文本的小组件，以及非内部路径的
指标链接。指标链接只接受 `/path` 或 `#anchor`，外部跳转由宿主显式提供其他导航
能力，不应直接把 Provider 字段当作任意 URL。

```svelte
<DashboardView
  provider={dashboardProvider}
  dashboardId="operations"
  requestContext={requestContext}
  filters={[{ field: 'region', value: 'east' }]}
/>
```

`DashboardView` 负责加载、空态、错误态、刷新和作用域内的旧响应丢弃；服务端仍
负责仪表盘授权、指标计算、筛选校验、缓存和审计。切换 Provider、租户、认证会话、
仪表盘 ID 或筛选条件后，旧快照不能继续渲染。旧的静态 `MetricStrip` 页面不会自动
迁移，调用方需要把数据读取迁移到 `DashboardProvider`，并保留原有业务授权。

### 资源详情扩展

`RecordDetailDrawer` 新增 `extraSections` 插槽，用于宿主放置已授权的附件、活动、
审计或关系内容。插槽只有在当前记录通过显示权限检查且详情成功加载后才渲染；它
不会改变 `DataProvider` 的记录契约，也不会替宿主读取、下载或写入服务器数据。
迁移旧的自定义详情抽屉时，应把扩展内容迁移到该插槽，并在租户、身份或记录变化
时由宿主清理自己的异步状态。

## ResourceOperationsPage

资源工作台不再把所有列表行为固定在页面内部。现在可以通过 `tableProps` 向每个布局中的
`AutoTable` 传入分页、排序、列渲染器和批量操作插槽：

```svelte
<ResourceOperationsPage
  resourceName="orders"
  workspaceStyle="operations"
  eyebrow="运营"
  title="订单"
  description="订单处理"
  actionLabel="新建订单"
  tableProps={{
    pagination: { current: 1, pageSize: 25 },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    batchActions,
  }}
/>
```

迁移时请检查：

- `resourceName` 由工作台拥有，`tableProps.resourceName` 不允许覆盖页面资源。
- `tableProps` 会同时传给当前布局中的列表；如果业务需要不同列表，应拆分页面而不是依赖布局内部
  的隐式差异。
- `batchActions` 现在接收 `{ selectedIds, selection }`。普通勾选时
  `selection.scope` 为 `selected`，`selection.ids` 是跨页保留的明确 ID，
  `selection.currentPageIds` 是当前页的已选 ID。选择状态不是授权凭据，后端必须在
  FA RPC、领域 API 或受信任 Edge Function 中重新检查租户、权限、状态和幂等性。
- 需要支持全量匹配操作时，显式设置 `allowSelectAllMatching`。点击“选择全部匹配记录”后，
  `selection.scope` 为 `all`，不再传完整 ID，而是传递当前 `filters`、`sorters`、`total`
  和当前页明确排除的 `excludedIds`。服务端必须按查询重新授权和执行，不能把 `total` 或当前页 ID 当作全量 ID。
  内置批量删除只支持 `selected`；全量删除必须由业务批量命令自行实现。
- 同一资源下翻页保留已选 ID；切换租户或撤销列表权限时会清理选择状态。
  不要在页面外缓存旧租户的 ID。
- **行为变更**：搜索或筛选条件生效后，清空普通选择与全部匹配选择；分页、排序不清空。
  页头“全选当前页”只影响当前页，取消当前页选择不会删除其他页的已选 ID。
- `allowSelectAllMatching` 默认关闭，`AutoTable` 和 `ListPage` 均支持；
  工作台通过 `tableProps` 传入。启用前必须将旧的仅处理 `selectedIds` 的回调迁移为
  按 `selection.scope` 分支处理；`all` 模式下 `selectedIds` 为空数组，
  `selection` 没有 `ids` 或分页属性。类型可从 `@svadmin/ui` 导入 `BatchSelection`。
- 全部匹配模式下可取消单行，并跨页保留 `excludedIds`；重新勾选从排除列表移除。
  `all` 分支新增必填的 `excludedIds` 数组，调用方必须传递并处理它；旧批量命令在支持
  排除前应关闭 `allowSelectAllMatching`，不能忽略此字段后执行全部记录。
  排除 ID 保留数字和字符串类型差异。页头复选框仍退出整个全量选择，
  “清除选择”、查询或作用域变化、关闭全量选择能力会清空排除列表。
  `total` 仍为查询总数，界面显示的选择数量扣除排除项，只是估算而非执行数量证明。
  列表加载或报错时不渲染业务批量操作插槽，调用方不能依赖插槽始终挂载。
- `all` 是动态查询，不是冻结的数据快照；`total` 是当前列表返回的数量，仅用于展示，
  不保证实际执行时数量不变。回调获得独立的查询副本，后端仍需限定资源、
  Provider、租户、权限及允许的筛选字段，负责确认、幂等与执行回执。
  表格不会遍历加载全部页，也不直接执行全量命令；不要缓存回调数据跨作用域使用。
- 如果旧页面直接在多个布局分支中复制 `<AutoTable {resourceName} />`，迁移为
  `<AutoTable {...tableProps} {resourceName} />`，并保留资源名放在 spread 之后。

当前已提供真实 Provider 组合测试，覆盖 15 种工作台布局、分页、排序、搜索、跨页选择、
租户切换、Provider 切换、旧查询迟到成功/失败、权限撤销后的迟到响应，以及资源身份
不可被 `tableProps` 覆盖；新增当前页取消选择、全量查询范围、排除 ID 跨页恢复、
内置删除隔离、搜索变更与全量选择失效测试，当前测试文件共 32 项通过。该测试使用 `DataProvider`、
`QueryClientProvider` 和实际 `ResourceOperationsPage`/`AutoTable` 组合，不是只测
属性转发的浅层 mock。

新增卸载后迟到查询结算回归会捕获 `derived_inert`，当前该定向场景未产生警告；
这不等于已完成真实浏览器下所有布局的卸载/重挂载验收，发布前仍需保留浏览器级
生命周期验证。

## 升级检查

1. 更新调用方的 `FilterBuilder` 数据，移除 `logicalOperator`。
2. 为 Schema 表单补充嵌套对象、数组和枚举类型测试。
3. 扫描电子表格公式，移除自定义 JavaScript 表达式。
4. 检查 `TreeSelect` 多选值是否只包含叶子节点，并验证 200+ 节点窗口化的焦点、
   搜索复位和级联选择。
5. 检查数值字段的空值、零值和百分比缩放契约。
6. 检查日期、时间和日期范围的时区与半开放范围策略。
7. 检查关系多选的数组值、`getMany` 回显和清空契约。
8. 验证保存视图、URL 查询和服务端请求的条件树往返。
9. 在真实消费者中执行严格类型检查和浏览器挂载验证。
10. Lite 文件上传改用 multipart POST，补齐服务端文件校验、授权和错误回显。
11. 已完成 `ResourceOperationsPage` 的真实 Provider 集成测试；升级时继续运行该测试，
    并在发布前处理文档中记录的 `derived_inert` 生命周期警告。
12. 审批中心迁移到 `ApprovalProvider`，确认动作带有 `expectedVersion` 和幂等键，
    并验证冲突回执不会覆盖当前记录。
13. 仪表盘迁移到 `DashboardProvider`，确认筛选输入和返回快照都通过契约解码。
14. 资源详情扩展迁移到 `RecordDetailDrawer.extraSections`，确认附件、活动和审计
    内容只由宿主在已授权详情成功后渲染。

## TaskQueueDrawer

### 任务列表请求的租户元数据

`useTaskList` 现在把管理上下文通过 `tenantAdapter` 解析得到的租户元数据合并到
`TaskProvider.list(params)` 与 `listDlq(params)` 的 `params.meta`。例如默认适配器
传入 `{ meta: { tenantId: 'tenant-1' } }`，已有分页或筛选参数继续保留。
调用方 `params.meta` 中与租户适配器同名的字段以当前上下文为准，不能覆盖当前租户；
其他业务元数据保留。每次调用传入独立数据副本，Provider 修改入参不影响下一次刷新。

迁移时，请将原先只读取顶层参数或依赖隐式闭包租户的列表适配器改为读取
`params.meta`；不得把整个 `params` 无差别拼入后端筛选条件。显式提供的 `meta`
必须是普通数据对象，不能是字符串、数组或 `null`。未配置租户上下文时不自动生成
租户元数据。此变更只涉及 `list/listDlq`，不改变 `get/cancel/retry` 的 ID 参数签名。
宿主仍必须根据真实会话重新授权；前端附带租户信息不是服务端隔离的证明。

### 取消与重试的作用域

`CancelTaskButton` 和 `RetryTaskButton` 共用作用域执行器。不传 `taskProvider`
时响应式跟随当前管理上下文；不再在初始化时固定旧 Provider。发送请求前检查能力、
禁用和认证会话可用性，同一按钮的当前请求完成前不重复提交。

任务 ID、租户、Provider、认证会话、路由或权限 Provider 发生切换，以及组件卸载后，
旧回执不会触发成功/失败回调或刷新新作用域。切走再切回也不会重新接纳旧回执；
新作用域可独立提交，旧请求结束不会解除新请求的忙碌状态。

迁移时请检查：

- `onSuccess`、`onError` 只服务发起操作的当前界面，不应依赖它们记账或保证全局通知；
  持久化状态及审计由服务端负责。
- 返回任务 ID 必须与请求一致。非法回执和 Provider 异常会通过 `TaskError` 脱敏，
  `writeMayHaveSucceeded` 为真时必须先重新读取服务端状态，再决定是否重试。
- 切换作用域不取消已发出的服务端操作，也不回滚；这层防重复只作用于当前按钮，
  跨按钮、刷新、跨客户端的幂等仍由后端提供。
- 查询缓存刷新失败不会被报告为写入失败；成功回调异常也不会触发失败回调或重发写入。
- `disabled` 和 Provider 方法存在性不是授权凭据，服务端仍须独立校验操作者、
  租户、任务状态及允许的取消/重试迁移。

本项有 22 个真实管理上下文与 QueryClient 组合断言通过；不代表持久化任务存储、
刷新后恢复或导入导出任务接入已经完成。

任务队列抽屉现在从当前管理上下文响应式读取 `TaskProvider`。提交任务后，只有当
Provider、租户、路由和认证会话仍与提交开始时一致，才会更新当前抽屉的选中任务、
关闭提交表单并刷新列表。

迁移时请检查：

- 不要在页面外长期缓存 `getTaskProvider()` 的结果；需要跟随租户或 Provider 切换时，
  通过上下文提供任务 Provider，或显式传入当前 Provider。
- 关闭抽屉、切换租户、Provider 或认证会话后，旧提交的成功/失败回执不会污染新表单。
- 提交刷新失败不会覆盖已成功取得的任务回执；调用方仍应通过任务详情和服务端状态确认最终结果。
- `idempotencyKey` 仍由业务调用方提供，组件不会替业务决定重复任务是否合并。

### 任务查询的认证会话

`useTask` 和 `useTaskList`（包括 DLQ）现在按认证会话隔离缓存。登录进行中或登出后，
读取结果暂时为 `pending`，不继续展示上一会话的数据；旧会话保存的 `refetch`
不会发起新请求，也不会返回当前会话的数据。重新登录成功后，即使 Provider 与任务 ID
都没有改变，也会重新查询，而不是复用旧用户的缓存。

- 不要手工拼接任务查询缓存键；其参数新增了内部认证会话标识。
- 不要把旧 `refetch` 长期保存在页面外。需要刷新时读取当前 Hook 的 `refetch`。
- 原有 `refetchInterval`、后台轮询和任务错误码保留。
- 查询错误类型为 `unknown`；使用 `instanceof Error` 或明确的错误契约缩窄后读取字段。
- 迟到的查询结果、错误及通知被隔离，不等于远端任务已取消。
  这部分只覆盖任务读取；任务提交、取消、重试仍需各自的授权与幂等控制。

`useTaskSubscription` 现在也绑定认证会话、租户、Provider 和组件生命周期。
登录、登出、切换租户、替换认证 Provider 或卸载组件时，旧订阅会先失效再退订；
迟到的任务事件和错误不会再调用新会话的回调。新会话就绪后组件会重新订阅。
Provider 的退订实现必须幂等，因为组件会在作用域变化和卸载时主动调用。

`useSubmitTask` 在认证切换期间、登出后拒绝发起新提交，返回
`QUERY_SESSION_SUPERSEDED`。已发出的提交不会因界面切换而自动取消：

- 仅租户变化、认证会话未变时，成功提交仍使提交时租户的列表失效。
- 认证会话失效时不再触发列表失效，以免刷新新会话的数据。
- 作用域变化或组件卸载后，通知及 hook 配置中的 `mutationOptions.onSuccess/onError`
  不再执行。
- `mutateAsync` 仍返回提交结果或抛出错误，底层 mutation 状态并未按会话屏蔽。
  单次 `mutate` 传入的回调、调用方的 `await` 后续逻辑，以及已返回句柄的
  `wait/cancel/retry/subscribe` 不在本次保护范围；调用方仍需检查自己的作用域。

需要取消、重试或幂等键时，应在 `TaskProvider` 和服务端任务协议中显式提供。
不能把界面隔离当作服务端授权、取消或事务回滚的证明。

这是不向下兼容的生命周期语义调整：依赖旧订阅继续跨登录接收事件、或依赖旧提交
完成后更新新租户界面的包装器，需要改为在当前会话中重新读取任务。

## Export 服务端任务模式

`useExport` 和 `ExportButton` 新增 `taskName`、`taskProvider`、
`taskIdempotencyKey`、`initialTaskId`、`onTaskSubmitted`。未提供 `taskName` 时
仍使用浏览器分页导出；提供后只提交任务，不调用 `DataProvider.getList`，
也不会在任务失败时回退到浏览器导出。两种模式均需在 `QueryClientProvider`
和管理上下文内使用。

```svelte
<ExportButton
  resource="orders"
  taskName="export-orders"
  taskIdempotencyKey={exportRequestKey}
  onTaskSubmitted={rememberTaskId}
/>
```

`taskProvider` 默认响应式读取管理上下文。提交必须提供非空任务名和幂等键；
恢复仅需任务名、Provider 和 `initialTaskId`，不会重新提交。
`initialTaskId` 只在挂载时读取；恢复另一任务应重新挂载组件。宿主应按用户、
租户和资源保存任务 ID，不能把任意历史 ID 直接带入新用户的界面。

### 后端协议

`TaskProvider.submit(taskName, options)` 的 `options.body` 为：

```json
{
  "protocolVersion": 1,
  "resource": "orders",
  "format": "csv",
  "filters": [],
  "sorters": [],
  "maxItemCount": 50000
}
```

未设置数量上限时省略 `maxItemCount`。`options.idempotencyKey` 保留业务提供的键，
`options.meta` 包含解析后的资源和租户元数据；服务端不能把这些浏览器字段当作授权。
完成任务的 `result`（或 `result_data`）必须严格符合：

```json
{
  "downloadUrl": "/api/export-artifacts/task-123",
  "format": "csv",
  "fileName": "orders.csv"
}
```

`format` 必须与请求一致，只允许 `csv`、`json`、`xlsx`；服务端 `xlsx` 应提供真正的
XLSX 文件，默认扩展名为 `.xlsx`。本地历史 SpreadsheetML 导出仍为 `.xls`。
`fileName` 可省略；提供时长度最多 200，以 ASCII 字母或数字开头，其余仅允许
字母、数字、点、下划线、连字符。不接受额外结果字段、路径型文件名和对象访问器。

下载地址仅允许同源 HTTP(S)（含相对地址），不允许跨站、内嵌凭据、
`javascript:`、`data:` 或 `blob:`。对象存储应经同源授权下载端点返回文件内容，
不可简单重定向到外部地址；前端不能验证下载响应内容或服务端重定向链。
服务端仍需对下载进行授权、过期处理、文件类型校验和审计。

### 调用方迁移

- 任务模式的 `triggerExport()` 在提交成功时返回 `[]`，不返回导出的行，
  也不代表后台任务已完成。`isLoading` 仅表示提交请求，`isTaskPending` 表示等待任务终态。
- 已拥有任务 ID 时重复调用不会再次提交，包括已完成、失败或取消状态。
  新业务请求使用新的幂等键；失败任务的重试和取消由任务中心或对应任务按钮承担。
- `mapData` 不能与任务模式一起使用，会在提交前报 `INVALID_RESOURCE_INPUT`。
  原有客户端映射需移至服务端受信任处理器。筛选、排序、格式和数量上限通过
  `useExport` 配置。`ExportButton` 现在可传入 `filters`、`sorters`、`maxItemCount`、
  `format` 和 `meta`，任务模式会将这些参数快照到任务请求；未传入时才使用资源默认查询
  与 CSV 格式。不要把客户端 `meta` 当作授权证明。
- 完成只暴露 `artifact`，不自动下载；用户操作时调用 `downloadTask()`。
  `ExportButton` 完成后显示“下载”；查询失败显示“重试”，只重读任务而不重新提交。
  `download: true` 不会改变任务模式的显式下载语义。
- `error` 表示提交/终态/下载错误，`taskError` 表示任务读取错误；
  使用 `refetchTask()` 重读。不要在界面外长期保存刷新函数。
- `useExport` 的 `enabled: false` 阻止执行和结果展示，撤销后清除已拥有任务；
  `ExportButton` 自动接入导出权限。自定义 Hook 调用方需提供自己的权限状态。
  租户、Provider、认证、资源、任务配置或权限作用域变化后，旧回执不会归属新界面。
  任务模式下筛选、排序、数量上限和格式变化也会使旧任务失效，不能继续显示旧任务的
  下载结果；需要新请求时生成新的幂等键。
  这不会取消已发送的后端任务，服务端仍需独立授权和实现幂等。
- 没有后台任务实现的消费者继续使用本地导出，不要仅添加一个 `taskName`。

当前证据为本地真实管理上下文与 QueryClient 组合测试及下载地址边界测试；
未包含真实任务存储、对象存储、跨客户端恢复、浏览器下载验收或部署证明。
