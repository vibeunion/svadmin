> Integration update: recursive form and preserved-host-filter contracts supersede the original scalar-only scope below. See `../architecture/enterprise-ui-reconciliation.md`. Original validation counts are historical, not current-head approval.

# Enterprise UI correctness — batch one

本批对应 `enterprise-ui-plan.md` 中的第一批正确性工作，不代表企业级组件路线图整体完成。保留三个现有公开组件入口、Svelte 5、Tailwind recipes/原生样式和现有 Provider/Surface 边界；没有新的运行时样式编译器、默认网格切换、发布或部署。

## FilterBuilder

- 嵌套 AND/OR 可编辑，隐式顶层 AND 与显式分组包装可无损往返。
- 根据字段约束操作符和标量类型。数值选项不会转换成字符串；集合/范围暂用 JSON 数组编辑。
- 未知字段、不可筛选字段、不匹配的操作符和值、空组及超出预算的结构都会阻止应用，并通过可选 `onInvalid` 回报。绝不只应用剩余有效规则。
- `reset()` 是显式清空查询；未填写的新规则不会被静默丢弃。空查询 `[]` 有效，但空显式条件组不被当作空查询。
- 支持 `disabled`。原 `onApply`、`onReset`、`logicalOperator` 和公开方法保留。
- 编辑预算：12 层、256 个公开节点、单个集合最多 1000 项。不支持对象型值及自定义操作符；日期区间控件、共享视图和完整关系查询界面仍属后续批次。

## JsonSchemaForm

- 当前是明确的标量 Schema 子集，不是完整 JSON Schema 实现。
- 默认值只填充不存在的自有键；显式 `undefined` 表示用户清空，不会重新灌回默认值。空数字不变为零，枚举保留数值/字符串/布尔/null 的区别。
- 约束覆盖必填存在性、类型、数值边界、倍数、字符串长度、枚举及 `additionalProperties: false`。未知断言和复杂字段必须明确报错，不再静默忽略后提交。
- 提交使用独立 JSON 快照；对象中的清空字段被省略。循环、非 JSON 值、稀疏数组和原型键被拒绝。
- 提供 `onvalidationerror`、`onerror`、`disabled` 和 `readonly`；异步提交期间阻止重复提交，失败可重试。宿主替换数据后，数字解析错误从新值重新计算，不保留旧错误映射。
- 字段具有独立实例 ID、标签/提示/错误关联。中英文分支使用当前树的 i18n 作用域；尚未完成全部语言、读屏和键盘验收。
- 256 个字段、1000 个枚举选项；提交快照深度 32、遍历预算 10000。嵌套对象、数组、`$ref`、条件 Schema、正则 `pattern` 以及完整表单引擎统一留待后续受控适配。

## SpreadsheetView

- 以有界递归下降解析器取代动态代码求值，不要求 `unsafe-eval`。
- 支持十进制与科学计数、四则/一元运算/括号、单元格/绝对引用/范围，以及 SUM、AVG/AVERAGE、COUNT、MIN、MAX。
- 循环、除零、错误引用、非法语法、溢出和资源超限返回稳定错误码；依赖缓存仅存在于一次求值内。
- 公式栏从当前工作表及选中单元格派生，输入处理直接使用本次事件值；只读模式阻止写入、加行、加列和加表。
- CSV 数值导出不经过界面舍入/区域格式；文本危险公式前缀与 CSV 引号分别处理。
- 公式预算：2048 字符、1024 token、递归深度 64、10000 工作量及范围单元格。当前仍是轻量表格，不宣称完整 Excel 兼容、大表虚拟化或工作簿级性能保证。

## 可复现验证

从仓库根目录运行，使用锁定的仓库工具链：

```sh
bun install --frozen-lockfile
bun run --cwd packages/ai-elements build
bun run --cwd packages/ui build
bun run --cwd packages/ui test src/components/enterprise/correctness.test.ts src/components/enterprise-components.test.svelte.ts src/components/filter-builder.test.svelte.ts
bun run vite build --config scripts/fixtures/enterprise-ui/vite.config.ts
bun run playwright install --with-deps chromium
bun run playwright test --config playwright.enterprise.config.ts
```

`.github/workflows/enterprise-ui.yml` 对 PR 精确 head 执行上述测试，保存 JSON 报告、提交号、源文件 SHA-256、完整 diff 和截图。浏览器使用不含 `unsafe-eval` 的生产 CSP，并验证提交、筛选、公式、只读、错误与重试路径。

截图矩阵为 1440×900、1920×1080、390×844 三种 viewport 的亮/暗主题及 ready/invalid 两种状态，共 12 张原始 PNG。采用 fullPage 截图，图片高度可能超过 viewport 高度。截图捕获不等于完整无障碍或全部状态认证。

验收结果以 PR #434 对应提交的 Actions 报告为准。独立审查、整个企业组件路线图和跨浏览器/辅助技术认证不在本批已完成声明中。
