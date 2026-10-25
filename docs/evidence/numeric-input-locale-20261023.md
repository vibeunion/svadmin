# 数值入口显式 locale 区域格式证据

- parent: `enterprise-ui-plan.md` 批次二 B2-01 NumberInput / MoneyInput / PercentInput
- source: B2-01 原始要求“精度、区域格式、空值与零、字段契约”；本轮为主线程返修，
  保持既有显式 locale 范围，不扩产品 locale 矩阵
- Delegation Decision: managed；pi 为唯一 writer，主线程只读审查；未提交、推送、
  发布或部署
- scope: `NumericInput.svelte` 与三个公开包装、`numeric-format.ts`、
  `FieldRenderer.svelte` 数值分支、定向单测/type fixture、Playwright 数值
  fixture/spec、`packages/ui/src/index.ts` 公开导出

## 产品范围收敛

产品未给出无界区域矩阵，因此本轮只承诺以下明确集合：

```ts
export const NUMERIC_INPUT_LOCALES = ['en-US', 'de-DE', 'zh-CN'] as const;
export type NumericInputLocale = (typeof NUMERIC_INPUT_LOCALES)[number];
```

| 能力 | 契约 |
| --- | --- |
| 默认行为 | 不传 `locale` 时保持既有 `type="number"` 路径，展示、解析、步进、回调和 DOM 语义不变 |
| `locale` | 仅接受上述三个字面量；`FieldRenderer` 把字段字符串原样交给 `NumericInput`，不静默回退默认 number；不支持的值进入显式不可提交状态 |
| 展示格式 | `Intl.NumberFormat` 输出千分位与区域小数分隔符；金额保留 `currency` 代码作为独立上下文标识，不改变存储单位 |
| 原生提交 | locale 文本输入不再带 `name`；每个字段只有一个同名 hidden 控件，提交规范化存储值（如 de-DE `1.234,50 -> "1234.5"`、percent `scale="1"` `25,5 -> "0.255"`）。`null -> ""`、`0 -> "0"`、disabled 不提交 |
| 精度/舍入 | `precision` 夹取到 `0..20`，只影响展示；回调与 FormData 仍使用未按精度舍入的存储值 |
| 步进 | `step` 缺省且无精度时 DOM 仍为 `step="any"` + `role="spinbutton"`，Arrow 使用默认 1；显式更小 `step` 不被展示精度 `Math.round` 吃掉；`scale="1"` 百分比按显示单位步进并换算回存储单位，有限值保护后夹取 `min`/`max` |
| 解析 | 只接受可选负号、数字、当前 locale 的分组分隔符和一个小数分隔符；空串映射 `null`，`"0"` 映射数字 `0` |
| 非法混合输入 | 如 en-US 的 `1.234,5`、de-DE 的 `1,234.5`、空格分组、字母、指数、超长文本均拒绝；不写值、不触发 `onchange`、不渲染原始错误文本 |
| 非法草稿 | 保留用户错误草稿供修正，设置 i18n `validationMessage`、`aria-invalid="true"` 和原生 `setCustomValidity`；`requestSubmit` 被阻止，hidden 值暂停提交；修正后清除；外部值更新或 locale 变化可重置草稿 |
| locale 切换 | en-US -> de-DE 等变化时清空旧编辑草稿并按新 locale 重新展示当前存储值，不把旧分隔符串重新解释为新 locale 数字 |
| 组合输入 | `compositionstart` 与 `isComposing` 的中间文本只保留草稿，不提交；`compositionend` 或之后首个最终有效数字只提交一次；disabled 时输入与 ArrowUp/Down 均无回调 |
| 无障碍 | 文本输入显式 `role="spinbutton"`、受支持时 `lang`、`aria-valuenow/min/max`，并保留标签与 `%`/货币可见上下文 |

未支持边界：其他 locale、操作系统级真实剪贴板粘贴、真实输入法/读屏软件、发布包
和部署。`Intl` 仍可能按自身规则舍入展示值；本轮不新增银行家舍入或写回舍入策略。

## 先红后绿

新增 `packages/ui/src/components/numeric-input-locale.test.svelte.ts` 后先运行旧实现：

```sh
cd packages/ui
bunx vitest run src/components/numeric-input-locale.test.svelte.ts --reporter=verbose
# 12 failed | 3 passed (15)
```

红测逐项覆盖：

- locale 文本输入仍带 `name`，FormData 读到 `1.234,50` 而非 `1234.5`；percent 未提交 `0.255`；
- 非法混合草稿未设置 `validationMessage`/`aria-invalid`，`requestSubmit` 可继续；
- 错误草稿失焦被旧值覆盖；外部值更新未清理错误态；
- en-US -> de-DE 后仍保留旧 `1.5`/旧分隔符草稿；
- 不支持 locale 静默回退 `type="number"`，FieldRenderer 同样吞掉 locale；
- composition 中间文本被提交，disabled 仍触发回调；
- 默认 `step="any"` 时 Arrow 无步进，显式 `0.001` 被 precision=2 舍入成 `1.24`，
  percent 小步长被精度放大。

其中 1 条失败来自测试装载器误把 `.ts` type fixture 送入 `svelte2tsx`；修正装载器后，
类型 fixture 保持为独立严格编译用例，不把测试代码错误算作产品红测。返修过程中又补
1 条“locale 切换清错误草稿”用例，因此最终文件为 16 条。修复后同一文件：

```sh
bunx vitest run src/components/numeric-input-locale.test.svelte.ts
# 16/16 passed
```

## 定向结果（修复过程历史记录）

```sh
cd packages/ui
bunx vitest run src/components/numeric-format.test.ts
# 28/28 passed

bunx vitest run src/components/numeric-input.test.svelte.ts
# 18/18 passed

bunx vitest run src/components/numeric-input-locale.test.svelte.ts
# 16/16 passed
```

- 区域格式辅助函数：三 locale 展示/解析、精度展示舍入、空值/null、零、负数、
  非法混合输入拒绝且响应不包含原始文本；`addNumericStep` 覆盖显式小步长、
  科学计数小数、负零、`Infinity`/`MAX_VALUE` 有限值保护。
- 组件：locale 三格式、默认 `type="number"` 兼容、金额/百分比写入值、
  `null`/`0` 区分、required/disabled 原生提交、非法草稿阻止提交与修正清除、
  动态 locale 清草稿、unsupported 显式不可提交、composition 单次提交、
  disabled Arrow 无回调、默认 any 步进 1 与 percent `min`/`max` 夹取。
- 严格局部 type 测试实际运行：用现有 `svelte2tsx` + TypeScript 编译
  `number/money/percent` 三个包装与 `numeric-input-locale.test.type-fixture.ts`，
  断言受支持 locale 可赋值、`fr-FR`/`en-GB`/`ja-JP` 仍被 `@ts-expect-error` 拒绝。
- 额外最小 tsconfig 定向 `svelte-check` 仅包含四个数值组件、`numeric-format.ts`
  和 type fixture：**0 errors / 0 warnings**；未执行全仓 `svelte-check` 后过滤错误。
- `FieldRenderer.svelte` 单文件检查中数值分支的 `locale`/`describedby` 兼容错误已
  清除；该文件及其依赖仍报告 6 条既有 `Cascader`/array metadata 等其他边界错误，
  未在本轮数值范围内修改。

## 真实浏览器结果（修复过程历史记录）

```sh
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.numeric.config.ts --max-failures=1
```

**54/54 passed**，退出码 0。矩阵为 Chromium / WebKit / Firefox × 1440px 桌面 /
390px 窄屏，每个引擎两视口各 9 个用例。

新增/更新专属场景：

- 原生表单：de-DE 金额与 percent 各只有一个同名控件，FormData 为
  `{"amount":"1234.5","rate":"0.255"}`；required `null` 阻止提交，`0` 可提交，
  disabled 字段不进入 FormData；
- 非法混合草稿保留并设置 `aria-invalid`/`validationMessage`，`requestSubmit`
  不提交；用户修正后恢复合法并提交规范化值；
- en-US -> de-DE 切换清旧草稿，旧 `1,234.5` 不被 de-DE 重新解释；unsupported
  `fr-FR` 渲染 `type="text"` + 不可提交错误态；composition 中间文本不提交，最终
  `2,345.75` 单次提交；
- `step="any"` 仍为 spinbutton 且 Arrow 默认 +1；显式 `step="0.001"` + `precision=2`
  Arrow 后存储 `1.23556`，未被展示精度吞掉；
- en-US：初始 `1,234.50`、真实键盘逐字符输入、文本插入、混合输入拒绝后保留草稿；
- de-DE 金额：`1.234,50`、负数 `-1.234,50`、混合输入拒绝后保留草稿并修正；
- zh-CN 百分比 `scale="1"`：`25.0`、`25.5 -> 0.255`、零与清空 `null` 区分，
  窄屏无横向溢出。

“粘贴”路径使用 Playwright `fill` 的真实文本插入，并配合 `pressSequentially`
键盘输入；本轮浏览器 composition 用真实 `CompositionEvent`/`InputEvent` 驱动，
但没有断言操作系统剪贴板快捷键或真实中文/日文 IME 候选词，因此不把 OS 剪贴板和
真实 IME 产品流程列为已证明。

## Diff 检查

```sh
git diff --check -- \
  packages/ui/src/components/NumericInput.svelte \
  packages/ui/src/components/NumberInput.svelte \
  packages/ui/src/components/MoneyInput.svelte \
  packages/ui/src/components/PercentInput.svelte \
  packages/ui/src/components/FieldRenderer.svelte \
  packages/ui/src/components/numeric-format.ts \
  packages/ui/src/components/numeric-format.test.ts \
  packages/ui/src/components/numeric-input.test.svelte.ts \
  packages/ui/src/components/numeric-input-locale.test.svelte.ts \
  scripts/fixtures/enterprise-ui/NumericInputsFixture.svelte \
  scripts/fixtures/enterprise-ui/numeric.spec.ts
# 退出码 0
```

## 最后数据边界审查

仅审查 `NumericInput.svelte` locale 分支及直接测试，未扩大默认 `type="number"` 兼容范围。
新增 3 条单文件用例，先红后绿：

- 外部受控值超出 `min`/`max`：`type="text"` 的 `min`/`max` 不自带 constraint validation，
  旧实现允许 `requestSubmit` 并提交越界 hidden 值；现由 locale 错误派生、复用
  `localeErrorMessage`/`setCustomValidity` 阻断提交并禁用 hidden，且不伪造 `onchange`；
  恢复合法值后清空错误和 `aria-invalid`。
- 外部 `NaN`/`Infinity` 及 percent `scale="1"` 的 `value * 100` 显示溢出：
  旧实现显示空串但允许提交空 hidden 值；现进入同一错误阻断，不把空串或不可信值提交。
- 组合输入：`localeComposing`/`event.isComposing` 时 ArrowUp/Down 被阻止且无回调，
  组合未结束 `requestSubmit` 被阻止，不提交旧存储值；结束后合法文本只回调一次，
  非法文本保持错误阻断，修正后再提交。

```sh
cd packages/ui
bunx vitest run src/components/numeric-format.test.ts
# 30/30 passed
bunx vitest run src/components/numeric-input.test.svelte.ts
# 18/18 passed
bunx vitest run src/components/numeric-input-locale.test.svelte.ts
# 19/19 passed
```

专属浏览器配置新增 3 个 native `requestSubmit` 场景，覆盖外部越界/`NaN`/`Infinity`
阻断与恢复、percent 显示溢出阻断与恢复、composition 期间 Arrow/提交流程：

```sh
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.numeric.config.ts --max-failures=1
# 72/72 passed
```

未运行全仓测试、格式化、提交、推送或部署。

## 主线程最终复核

以下承接上一执行阶段的独立复核结果，本次文档收尾未重复运行测试：

- `numeric-format.test.ts`：30/30，exit 0。
- `numeric-input-locale.test.svelte.ts`：20/20，exit 0。
- `numeric-input.test.svelte.ts`：18/18，exit 0。
- `playwright.numeric.config.ts`：72/72，exit 0，三引擎 × desktop/narrow。

首次主线程浏览器复核为 71/72：Firefox narrow 中外部值从 `-1` 切换到
`NaN` 后仍显示旧草稿 `-1`。修复清理非有限外部值对应的 `localeDraft`，
并将 NaN/Infinity/百分比显示溢出的 `displayNumber` 归为 null；
hidden 值清空且禁用，错误态继续阻止提交。新增回归后组件用例增至 20 条，
最终独立浏览器复跑 72/72。首次失败与历史 54/54 不合并为最终结果。

辅助函数同时修复极小步长 `addNumericStep(0, 1e-13)` 被截成零的问题：
去除 12 位硬上限，安全缩放最多 15 位，超出时回退 Number 加法；
非有限结果保留原值。上述 30 条辅助函数用例包含该边界。

## 外部依赖

- 真实读屏软件、真实输入法候选词流程、操作系统剪贴板、其他 locale 产品范围确认；
- 发布包、生产部署与最终验收仍需外部环境执行；
- 本轮未执行全仓测试、格式化、提交、推送或部署。
