# 无显式 id 复合控件的说明/错误关联复核

## 任务约定

- parent：B2-09 FormField / ErrorSummary；source：`form-field-description-20261021.md` 未覆盖的复合控件描述链。
- reason：复核 `FieldRenderer` 在没有宿主显式 `id` 时，未接收 `controlId` 的复合控件是否仍把生成的说明 ID 与 `errorId` 关联到可访问控件。
- goal：只读核对现有契约；仅在确认生产缺口时最小修复。本轮确认生产契约已正确，组件未改。
- 非目标：不改变校验、原生提交、焦点算法、布局；不覆盖真实读屏、全部 Tab 顺序或跨浏览器发布。
- 范围：`packages/ui/src/components/field-renderer-advanced.test.svelte.ts`、本文与验收矩阵 B2-09。
- 风险与协作：low / **managed**；pi 为唯一 writer，主线程独立审查（独立复核与复核结论均不写入生产代码）。
- 当前环境无 agmesh，以本文记录续接；不提交、推送、发布或部署。

## 只读结论

`FieldRenderer` 在未传 `id` 时使用实例级 `controlId`/`descriptionId`，并把
`descriptionId` 与宿主 `errorId` 合并为 `describedBy`。以下复合控件没有把
`controlId` 作为自身主焦点 ID，但仍直接接收 `describedBy`：

- `tags`：`TagsInput` 内部文本输入框设置 `aria-describedby`。
- `rate`/`rating`：`Rate` 的 `role="radiogroup"` 容器设置 `aria-describedby`。
- `multiselect`：分组容器与每个复选框设置 `aria-describedby`、`aria-invalid`。
- `images`：每个 URL 文本框设置 `aria-describedby`、`aria-invalid`。
- `array`：`ArrayField` 顶层分组设置 `aria-describedby`、`data-invalid`。

因此不需要为这些入口补传 `id`，也不需要修改生产组件；本轮只补直接回归断言。

## 验收

```gherkin
Given FieldRenderer 未收到宿主显式 id
And 同页渲染两个相同业务 key 的实例
And 每个实例都有各自说明与真实宿主错误节点
When 渲染 tags、rate、multiselect、images 或 array
Then 两个实例生成的说明 ID 互不相同
And 每个可访问节点的每个 IDREF 都能在文档中解析到活节点
And 其中恰好解析到本实例的说明节点与本实例的宿主错误节点
And 不解析到另一实例的说明或错误节点
And 控件暴露 invalid 状态
```

动态更新与清除（同一参数化用例内）：

```gherkin
When 实例 A 更新说明文本
Then A 的 IDREF 仍指向同一个说明节点
And 实例 B 的说明/错误关联与 invalid 不变
When A 先移除错误、再移除说明
Then 移除错误后只剩说明 IDREF 且 invalid 收敛
And 移除说明后不再有说明/错误 IDREF 与 invalid 标记
And B 的说明、宿主错误与 invalid 仍完整
```

`multiselect` 同时断言分组容器（`[data-svadmin-field] > [role="group"]`）与每个
复选框（`[role="checkbox"]`）。

## 执行记录

定向单文件命令（工作目录 `packages/ui`）：

```bash
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/field-renderer-advanced.test.svelte.ts
```

- 首版（只比较 `aria-describedby` 字符串、`errorId` 指向不存在节点）：**22/22，主线程复核 6.65s**。该版本未验证同业务 key 多实例隔离与动态清除，故不构成充分证据。
- 本轮修正版：改为创建真实宿主错误节点、同页两个同 key 且不传显式 `id` 的实例、逐 IDREF 解析到活节点并断言不串实例，并覆盖说明更新、先移除错误再移除说明的收敛；`multiselect` 同时覆盖分组与 checkbox。
- 修正版本线程结果（含“每个选择器必须命中”防空洞断言）：**22/22、原始 exit code 0、6.54s**；`git diff --check` 原始 exit code 0。
- 主线程独立复核修正版：**22/22、exit 0、6.55s**；`git diff --check`
  exit 0。修正版已完成本地窄契约复核，但不扩大为真实读屏或发布验收。

## 未验证边界

- 未覆盖 `ArrayField` 行级分组、`Transfer`、`TreeSelect`、`Cascader`、`DateRangeInput`、富文本和文件上传的同类组合；其既有分支已有独立证据，但不在本轮新增断言内。
- 未运行真实浏览器、屏幕阅读器、全仓测试/typecheck/build、发布包或部署。
- 修正版主线程独立复核尚未执行。
