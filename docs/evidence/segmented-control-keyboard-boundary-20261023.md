# SegmentedControl 键盘边界（修饰键与原生禁用继承）

## Task Contract

- 续接：B2-04 / `segmented-control-browser-contract-20261022.md`。
- 目标：只补齐 SegmentedControl 的两个键盘边界：组合键不得被组件拦截；
  继承祖先 `fieldset[disabled]` 时，合成键盘事件不得绕过平台禁用。
- 非目标：不改变样式、公开 API、选项值、受控值语义或其他组件；不扩展
  Shift 组合键（现有规范未要求）；不修改依赖、锁文件或测试超时配置；
  不提交、推送或部署。
- 编排：managed / medium；pi 为唯一 writer，主线程为独立 reviewer。
- 写入范围：`SegmentedControl.svelte`、`segmented-control.test.svelte.ts`、
  `SegmentedControlFixture.svelte`、`segmented-control.spec.ts`、本证据，
  以及矩阵 B2-04。

## Given / When / Then 验收

```gherkin
Given 一个 enabled 的 SegmentedControl
When 对 Arrow/Home/End/Enter/Space 叠加 Alt、Ctrl 或 Meta 后触发 keydown
Then 组件不 preventDefault，不移动焦点、不改变值、不调用 onchange

Given 同一个控件收到未叠加修饰键的相同按键
When 触发 ArrowRight、Enter 或 Space
Then 保持原有导航与选择交互

Given SegmentedControl 的按钮继承祖先 fieldset[disabled]
When 平台将该按钮判定为 :disabled
Then 合成 keydown 不会触发 preventDefault、焦点移动、值变化或 onchange；
     真实浏览器只验证真实可操作性，不伪造点击绕过平台禁用
```

## 先跑基线

在 `packages/ui` 执行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/segmented-control.test.svelte.ts
```

结果：**7/7 passed**，原始 exit code **0**。

## 最小红测

新增三组测试：Alt/Ctrl/Meta 与现有处理键组合、未修饰键保持原交互，以及
祖先 disabled fieldset 下的合成键边界。happy-dom 不实现祖先 fieldset 的
`:disabled` 继承，因此单元测试沿用现有 RadioGroup 约定：
`matches(':disabled')` 只模拟平台禁用判定；浏览器侧另测真实禁用状态。

修复前单文件 Vitest：**12 项中 8 passed、4 failed**，原始 exit code **1**。
失败点为三个修饰键用例与 fieldset 用例，均显示 `defaultPrevented` 被错误
置为 `true`，证明 `handleKeydown` 会拦截组合键并修改值。

## 最小修复

`SegmentedControl.svelte` 的 `handleKeydown` 在原有 `disabled`/`option.disabled`
判断上增加：

- `event.altKey`、`event.ctrlKey`、`event.metaKey` 任一为真时直接返回；
- 当前事件目标必须是 `HTMLButtonElement`；
- 当前目标为原生 `:disabled`（含祖先 disabled fieldset 继承）时直接返回。

未修改按键分支、RTL、roving tabindex、公开 API 或样式。Shift 组合键未扩张。

修复后单文件 Vitest：**12/12 passed**，原始 exit code **0**。

## 浏览器新增 case

fixture 新增 `Native fieldset disabled` 区域：祖先 `fieldset` 初始 disabled，
提供真实 `Toggle native fieldset disabled` 按钮。spec 新增
`SegmentedControl inherits a disabled fieldset without pointer bypass and recovers via keyboard`：

- 先逐个断言 Table/Board/Calendar/Timeline 原生 disabled；
- 用真实鼠标坐标点击未选中的 Board，不使 `force`；若禁用失效则会改值和
  回调，因此同时断言值仍为 table、回调计数仍为 0、Table 仍 checked 且
  Board 未 checked；
- 恢复 fieldset 后，从 Table 用真实 `ArrowRight` 到 Board，断言焦点、值、
  checked 与回调计数 1。该用例不声称已测禁用状态下的 Tab 顺序。

另新增真实修饰键场景 `SegmentedControl does not act on modifier-composed arrow keys`：
在既有 Keyboard view 上先用真实点击选中 Table，再对焦点项实际执行
`page.keyboard.press` 的 `Control+ArrowDown`、`Alt+ArrowDown`、
`Meta+ArrowDown`，每次断言焦点、值、checked 和回调计数不被组件改变；
随后普通 `ArrowRight` 验证原导航/选择行为。选用 ArrowDown 避免浏览器
历史跳转，未使用 `dispatchEvent` 伪造键盘。

组合键在浏览器侧只验证“处理器不主动选择/移动焦点”，不承诺组件阻止浏览器
原生组合键默认动作，也不承诺不产生原生 click；组件未新增 onclick 过滤。
`keydown` 不 `preventDefault` 由单文件 Vitest 直接证明；浏览器侧没有把
“组件执行前后的根监听器”当作 `defaultPrevented` 证据，因为那需要在全部
事件处理结束后读取。

首次完整执行专属配置时，新 fixture 的 `aria-label="Fieldset disabled view"`
与既有 `"Disabled view"` 发生 Playwright role name 子串匹配冲突，导致既有
禁用用例 strict mode 失败（6 failed，exit 1）。已将新标签改为
`"Fieldset inherited disabled"` 后复跑完整配置。

修复轮完整执行（早期结果，已由后续 78 项运行取代；该次曾使用按行 reporter
参数，按本轮勘误不再保留错误命令）：结果 **72 项中 69 passed、3 skipped**，
原始 exit code **0**。3 个 skipped 仍为桌面项目按设计跳过窄屏焦点用例。
未出现浏览器导航超时。

## pi 自测结果

- 单文件 Vitest 基线：7/7 passed，exit 0。
- 红测：12 项中 4 failed，exit 1。
- 修复后单文件 Vitest：12/12 passed，exit 0。
- 本轮浏览器新增/修改场景单独执行（grep 两个 case，三引擎两视口）：
  12/12 passed，原始 exit code 0，12.5s。
- 专属 Playwright 完整配置本轮最终执行一次：78 项中 75 passed、3 skipped，
  原始 exit code 0，55.2s；3 个 skipped 仍为桌面项目按设计跳过窄屏焦点用例。
- 本轮未重跑未改动的单文件 Vitest；上述 12/12 为修复轮记录。
- 未运行全仓测试、构建、全量类型检查或全量 Playwright。
- 未修改依赖/锁文件/超时配置，未使用 `any` 或 `@ts-ignore`，未提交、推送或部署。

## 主线程独立复核（已完成）

以上浏览器与禁用场景为 pi 进程自测结果。主线程已独立复核单文件 Vitest：
**12/12 passed、原始 exit code 0、duration 2.20s**，其中包含 svelte2tsx
source map 缺失警告，但没有退出失败。

主线程随后独立执行专属浏览器命令：

```bash
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.segmented-control.config.ts --trace retain-on-failure --output output/playwright/segmented-control-keyboard-review-20261023
```

主线程原始输出开头为 `Running 78 tests using 1 worker`，覆盖
chromium/webkit/firefox × desktop/narrow。正式汇总为 **75 passed、3 skipped、
原始 exit code 0、duration 52.2s**，无失败，使用原始专属配置且未放宽断言。
3 个 skipped 是桌面项目既有的窄屏焦点条件跳过（编号 12、38、64 的
`narrow layout has no overflow and keeps focus visible`），未把跳过计为通过。
主线程随后发送文档指令时因 shell 反引号误触发了一次重复运行；该次汇总显示的
53.5s 属于非计划重复运行，不计入正式证据，也不与正式 52.2s 混写，未保留其完整
日志。pi 结果仍按上文单独记录，不与主线程结果合并。

主线程浏览器侧已独立确认以下内容：

- 真实修饰方向键（Control/Alt/Meta+ArrowDown）不改变焦点、值或回调，普通
  `ArrowRight` 保持原导航/选择行为；
- 祖先 fieldset 禁用时，真实指针点击不能绕过 `:disabled`，恢复 fieldset 后
  真实键盘交互可回到 Board；
- 浏览器新增 case 只验证真实可操作状态，没有伪造点击、`dispatchEvent`
  冒充键盘或放宽既有断言。

组合键不 `preventDefault` 以及祖先 fieldset 下合成键盘事件被守卫，均只由单文件
Vitest 直接证明；浏览器不承担这两项 `defaultPrevented` 或合成事件守卫的证据。

本项主线程单测与浏览器复核均已完成，可由“待复核”改为“已复核”；但该结论
仍不构成读屏认证、发布包消费、真实后端/RBAC 联调或部署验收，也不等于
真实产品页面、真实权限或跨应用消费者闭环已验收。
