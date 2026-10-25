> 2026-10-21：以下内容按当前组件源码校准。原始标量表单及拒绝所有未知宿主筛选的设计已被后续集成取代，参见 `../architecture/enterprise-ui-reconciliation.md`。历史 PR/CI 不代表当前工作区验收。

# Enterprise UI correctness — batch one

本批对应 `enterprise-ui-plan.md` 中的第一批正确性工作，不代表企业级组件路线图整体完成。保留三个现有公开组件入口、Svelte 5、Tailwind recipes/原生样式和现有 Provider/Surface 边界；没有新的运行时样式编译器、默认网格切换、发布或部署。

## FilterBuilder

- 嵌套 AND/OR 可编辑，隐式顶层 AND 与显式分组包装可无损往返。
- 根据字段约束操作符和标量类型。数值选项不会转换成字符串；集合/范围使用 `FilterCollectionInput` 编辑，保留元素原始类型和端点顺序。
- 无法编辑的原始宿主条件只读保留，可无损往返；元数据到达后可解锁支持的条件。仅未改变的已捕获宿主条件可以走保留路径，不能把新草稿标成只读来绕过校验。
- 新建或编辑条件中的未知字段、不匹配操作符/值、不完整条件、空组及超预算结构阻止整次应用，通过 `onInvalid` 回报，绝不只应用有效子集。原始宿主空组保留，与新建空组区别处理。
- `reset()` 显式清空查询；未填写的新规则不会被静默丢弃。空查询 `[]` 有效。
- SPA 保留 `onApply`、`onReset`、`logicalOperator` 和公开方法；`disabled` 同时约束控件和公开方法。Lite 不提供 `logicalOperator`，宿主应使用完整递归 `Filter[]` 作为跨端传输和保存视图的格式。
- 编辑预算：12 层、256 个公开节点、单个集合最多 1000 项。不支持对象型值及自定义操作符；日期区间控件、共享视图和完整关系查询界面仍属后续批次。

## JsonSchemaForm

- 当前递归处理 `object`、`array` 和标量，是受限 Schema 子集，不是完整 JSON Schema 实现。
- 默认值只填充不存在的自有键；显式 `undefined` 表示用户清空，不会重新灌回默认值。空数字不变为零，枚举保留数值/字符串/布尔/null 的区别。
- 当前公开约束包括必填、类型、枚举、数值和字符串边界、正则及数组长度。`visibleWhen` 只引用无条件标量控制字段，隐藏字段不渲染、不提交，但保留本地草稿以便恢复。组件保留 Core Schema 与递归适配器两条受限路径，均不接受时拒绝表单；Core 可用时由其决定可提交数据，共用子集保留递归适配器的错误码。不能把一个内部辅助函数的支持范围直接外推为完整 Schema 支持。
- 提交使用独立 JSON 快照；对象中的清空字段被省略。循环、非 JSON 值、稀疏数组和原型键被拒绝。
- 提供 `onvalidationerror`、`onerror`、`disabled` 和 `readonly`；异步提交期间阻止重复提交，失败保留草稿。数据、Schema 或回调作用域变化后不让旧提交结果覆盖当前状态。
- 字段具有独立实例 ID、标签/提示/错误关联，提交校验失败聚焦首个无效字段。中英文文案使用实例 `locale` 或当前树的 i18n 作用域。
- Schema 深度最多 32、节点最多 1000，枚举最多 1000 项；未知关键字、循环和非法正则拒绝。`$ref`、`oneOf` 等完整 Schema 能力和业务授权仍由受控服务端承接。
- Lite 使用完整路径的原生表单协议和可信 Schema 解码，区分增删数组的草稿动作与最终提交；不能把草稿动作当作持久化成功。本地组件测试不等于无 JavaScript 浏览器或真实服务端验收。

## SpreadsheetView

- 当前组件使用有界公式求值，不执行用户提供的 JavaScript；不能把历史独立公式辅助模块的限制当作现有组件限制。
- 支持十进制与科学计数、四则/一元运算/括号、单元格/绝对引用/范围，以及 SUM、AVG/AVERAGE、COUNT、MIN、MAX。
- 循环、除零、错误引用、非法语法和资源超限返回确定错误，不执行表达式副作用。
- 公式栏从当前工作表及选中单元格派生，输入处理直接使用本次事件值；只读模式阻止写入、加行、加列和加表。
- CSV 数值导出不经过界面舍入/区域格式；文本危险公式前缀与 CSV 引号分别处理。
- 默认限制为 1000 行、100 列、10000 单元格、32 工作表；公式长度 1000、深度 32、范围单元格 10000、求值步数 50000，使用公开 `limits` 约束。
- 聚合文本上限 1,000,000 同时由 UI 聚合渲染检查和 core `SPREADSHEET_WORKBOOK_LIMITS.maxTotalText` 工作簿快照边界执行；UI 公开 `limits` 不单独暴露该项。
- `spreadsheet-safety.test.svelte.ts` 已覆盖默认与无效尺寸、`maxRows`/`maxCells`/`maxSheets` 覆盖、单单元格与聚合文本、公式长度/深度/范围/步数（含自定义步数），以及超限覆盖不能突破默认上限。2026-10-22 本轮复核未发现需要新增红测的源码缺口。
- 已有工作簿、剪贴板、撤销及可选 XLSX 适配入口；异步适配结果需遵守 `scopeKey`、数据和接收方归属。只读不能写入，失败可以显式重试。当前仍不宣称完整 Excel 兼容、大表虚拟化或工作簿级性能保证。

## 本地专项验证（2026-10-21）

在 `packages/ui` 使用现有锁定工具链，一次执行一个直接相关文件：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/filter-builder.test.svelte.ts
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/json-schema-form-enterprise.test.svelte.ts
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/spreadsheet-safety.test.svelte.ts
```

结果依次为 38/38、41/41、122/122，各自文件的严格类型检查包含在内。
这些组件及上述测试文件本次没有代码改动。详细边界见
[`../evidence/enterprise-foundation-audit-20261021/README.md`](../evidence/enterprise-foundation-audit-20261021/README.md)。

## 浏览器与交付边界

本次构建 `@svadmin/ui` 与企业 fixture 后，执行
`scripts/fixtures/enterprise-ui/browser.spec.ts`，Chromium 10/10 通过。
本机配置复用 `playwright.enterprise.config.ts`，只指定现有 Chromium 路径、
本地报告目录和新启动的 preview 服务，没有修改测试用例或跳过断言。
覆盖生产 CSP、提交、筛选、公式、只读；1440x900、1920x1080、390x844
三种视口的亮暗主题各捕获 ready/invalid 状态，共 12 张截图。

报告及本机配置位于 `output/playwright/enterprise-foundation-20261021/`。
只检查了两张代表性截图，不能将此描述为全套视觉、无障碍或跨浏览器认证。
历史 PR #434 的 Actions 报告不作为当前版本证明。本次未重跑完整应用构建、
真实 Provider 集成或全部企业级路线图；没有提交、发布或部署。
