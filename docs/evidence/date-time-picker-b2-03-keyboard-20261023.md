# B2-03 TimePicker / DateTimePicker 真实键盘专项（2026-10-23）

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二 B2-03；
  source：用户要求续接 B2-03 真实键盘缺口；reason：用真实 Tab/键位验证公开
  `TimePicker`/`DateTimePicker` 的绑定、回调和原生表单序列化，并确认原生
  键盘清空是否可提交空值。
- Delegation Decision：low / managed；pi 唯一 writer，主线程只读审查；
  未改生产组件，未提交、推送、发布或部署。

## 写入范围

- 新增 `scripts/fixtures/enterprise-ui/DateTimeKeyboardFixture.svelte`：
  独立小 fixture，真实挂载公开 `TimePicker`、`DateTimePicker`，civil 模式；
  包含前置按钮、后置按钮、禁用 time/datetime、原生 `<form>` 提交、绑定值/
  `onchange` 计数/`FormData` 输出。
- 新增 `scripts/fixtures/enterprise-ui/date-time-keyboard.spec.ts`。
- 新增 `scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts`
  （Chromium/WebKit/Firefox desktop）。
- `scripts/fixtures/enterprise-ui/App.svelte` 增加
  `?view=date-time-keyboard` 路由。
- 本证据与验收矩阵 B2-03 记录。

未改 `TimePicker`、`DateTimePicker`、`DateTimeInput`、现有 fixture/spec，
未扩展时区、instant 或自绘面板。

## 执行前核对

已读 `DateTimeInput.svelte`、`TimePicker.svelte`、`DateTimePicker.svelte`、
`date-time.spec.ts`、`date-time-picker-binding.test-host.svelte` 与
`date-time-picker-binding.test.svelte.ts` 的既有断言。现有测试已覆盖父值
赋值/清空、civil/instant 绑定、禁用日期策略和合成 input 禁用抑制；没有真实
Tab 进入、真实键盘修改 segment、键盘清空后的原生 validity/`FormData`、禁用
字段 Tab 跳过与 `FormData` 排除。因此只补这些缺口，不重复既有断言。

## 真实按键方式与原生差异（2026-10-23 修正）

- 前置按钮 `focus()` 后按 `Tab`，断言目标 input 获得焦点；未使用 `fill`、
  未用 `evaluate` 写 value、未 `dispatchEvent` 冒充键盘。
- TimePicker：聚焦后按 `ArrowUp`，三引擎均从 `09:30` 变为 `10:30`，绑定值
  与 `onchange` 计数一致。
- DateTimePicker：聚焦后按 `ArrowUp`，三引擎均改变当前原生 segment 并同步
  绑定/计数；不同引擎落点不同（Chromium/Firefox 先改月份，WebKit 先改年份），
  因此只断言“值改变且绑定与输入一致”，不把某个引擎的 segment 顺序写成契约。
- 分段选择语义（修正）：原生 segmented time/datetime 输入中 `Control+A`
  不保证全选所有分段；聚焦后按 `Control+A Backspace` 仍只删除当前分段。
  因此本轮不再把 `Control+A + Backspace` 当作“清空全部”的契约，所有清空
  都改用逐段真实 `Backspace`/`ArrowRight`。
- 单分段删除：删除小时（time）或月份（datetime）后，原生 `value` 立即变为
  空串、控件绑定同步为 `null`，但浏览器仍保留其余分段的内部状态，
  `validity.badInput === true`。
- 补回数值：随后用真实键盘键入 `11`，原生输入重建完整值——time 为
  `11:30`（分钟保留）、datetime 为 `2026-11-21T09:30`（年/日/时间保留），
  `badInput` 消失、`checkValidity()` 为 true，绑定与 `onchange` 同步。
- 逐段清空的原生边界（修正旧结论）：只清一部分分段时 `badInput=true`、
  `checkValidity()=false`，原生表单阻止提交；把**所有**分段都用真实键盘
  清空后 `badInput=false`、`checkValidity()=true`，原生表单接受空字符串。
  三引擎一致：time 需 3 次 `Backspace`（中途 `ArrowRight`），datetime 需 6 次。
  旧证据“逐段 Backspace 也无法消除 `badInput`”是错误归因。
- 输入事件计数存在引擎差异：补回完整值时 Chromium/WebKit 记 3 次、Firefox
  记 2 次 `input`；断言只要求计数增加且最终绑定/`FormData` 与输入值一致，
  不把某个引擎的事件次数写成契约。
- 禁用：`Tab` 均跳过禁用 time/datetime；Chromium/Firefox 焦点落到后置按钮，
  WebKit 落到 `BODY`（Safari 原生 Tab 遍历差异）。WebKit 在 `BODY` 上按
  `Backspace` 会触发历史后退而不是输入清空，因此该引擎不按此键；这是原生
  差异记录，不是用 skip 掩盖断言。
- `evaluate` 仅用于只读读取 `document.activeElement` 与
  `HTMLInputElement.validity/checkValidity()`。

## 上一轮“生产修复”已撤回（2026-10-23 审查结论）

- 上一轮 pi 在 `DateTimeInput.svelte` 新增 `clearKeyPending`、
  `handleKeydown`、`clearEmptyBadInput` 与 `onkeydown`，并对空值临时切换
  `input.type` 以清除 `badInput`，随后在矩阵把 B2-03 标为“已修复”。
- 该修复的回归：任意分段删除都会让 `input.value` 为空/`badInput`，修复据此
  清空原生内部状态，等于丢弃其他仍然有效的分段；再次键入该分段时无法重建
  完整值（time 停留在空值并重新出现 `badInput`）。同时“临时 type 切换”
  改变了可见原生控件类型，属于不可保留的实现。
- 上一轮记录的 Chromium 4/4、三引擎 12/12 是 pi 初版伪通过：旧 spec 用
  `Control+A Backspace` 假定一次清空，没有“删除单个分段再补回”的保护场景，
  因此回归未被测出。12/12 只代表旧断言下通过，不是最终有效验收结果。
- 本轮已全部撤除上述生产改动：`git diff` 对
  `packages/ui/src/components/DateTimeInput.svelte` 为空；未保留
  `clearKeyPending`/`handleKeydown`/`clearEmptyBadInput`/`onkeydown`，
  也未保留临时 `type` 切换或任何 `test.fail`/skip。未改动其他既有源码。

## 新契约与红绿证据

- 仅重写专属单文件 `scripts/fixtures/enterprise-ui/date-time-keyboard.spec.ts`，
  共 7 条：两条 Tab+`ArrowUp` 分段编辑；两条“删除单分段后补回”保护场景
  （time 小时、datetime 月份），断言其余分段保留、`badInput` 恢复、完整值
  回调与 `FormData` 一致；一条部分清空的原生边界（`badInput` 阻止提交）；
  一条逐段全部清空后提交空值；一条禁用跳过/无回调/不入 `FormData`（保留
  Chromium/Firefox 与 WebKit 的焦点差异分支）。
- 红测（先）：临时恢复上一轮修复版 `DateTimeInput` 后，Chromium desktop
  **4 passed / 3 failed**（两条保护场景 + 一条原生边界），失败点是修复清除了
  单分段删除后的 `badInput`，证明回归存在。测试本身未使用 expected failure。
- 绿测（后）：仅撤销本轮生产变更后，Chromium desktop **7 passed**；随后
  Chromium/WebKit/Firefox desktop **21 passed（7×3）**，exit 0。
- 未保留 `test.fail`、未 skip、未把 expected failure 记为 passed；没有弱化为
  “只断言没报错”，两条保护场景都断言具体完整值和 `FormData` 载荷。

## 本轮实际结果

```sh
bunx playwright test \
  --config scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts \
  --project=chromium-desktop --reporter=line
```

- 修复版（红测）：Chromium desktop 4 passed / 3 failed，exit 1。
- 撤销生产变更后（绿测）：Chromium desktop **7 passed**，exit 0。

```sh
bunx playwright test \
  --config scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts \
  --reporter=line
```

- Chromium/WebKit/Firefox desktop：**21 passed**（每引擎 7 条正常契约），
  exit 0；无 expected failure、无 skip。
- `git diff --check`：exit 0。
- `git diff packages/ui/src/components/DateTimeInput.svelte`：空，本轮生产变更
  已完全撤回。

## 范围与未覆盖

- 范围：专属 spec 重写、本证据、验收矩阵 B2-03 归因修正；fixture、Playwright
  配置与 `App.svelte` 路由未再改动；生产源码保持原样；未提交、推送、发布或
  部署，未运行远程环境操作。
- 未运行全仓测试、typecheck、build、日期 policy 矩阵、时区专项或部署流程。
- 原生 `badInput` 不是公开可编程清理的稳定契约，本轮只记录其真实边界，
  不尝试在生产代码中清理；如需“只清部分分段也能直接提交空值”，应作为
  独立产品/契约变更另行授权。
## 主线程最终复核

- 独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts`：Chromium/WebKit/Firefox desktop 21/21 passed、exit 0、12.3s。
- 已检查删除单分段后重新填写的明确值断言，以及 TimePicker 全部分段清空后的原生表单提交；不将 DateTimePicker 部分分段编辑外推为其全部清空已覆盖。
- `DateTimeInput.svelte` 本轮生产 diff 为空。此前清除 badInput/临时切换 type 的改动已撤回，不保留造成分段数据丢失的修复；Control+A 并非可靠的原生分段全选契约。
- 最终有效结果无 test.fail/skip，旧带 expected failure 的 12 次运行不能称为 12 条契约通过。本轮保留测试基础设施，不宣称真实设备、读屏或其他 locale 完成。

## 本轮补充：DateTimePicker 逐段全部清空（2026-10-23 续接）

- 动机：上一轮只覆盖 TimePicker 全部分段清空；DateTimePicker 的逐段全部清空仍是缺口，未由此前的部分分段编辑或 ArrowUp 场景外推。
- Delegation Decision：low / managed；pi 唯一 writer，主线程只读审查；未改生产源码，未提交、推送、发布或部署。
- 写入范围：仅 `scripts/fixtures/enterprise-ui/date-time-keyboard.spec.ts` 新增一条场景；fixture 无必要改动，保持原样。
- 场景：`clearing every datetime segment with real keys leaves time intact and submits an empty meetingAt`。
  - 前置按钮 `focus()` 后真实 `Tab` 进入 `DateTimePicker`（`Keyboard datetime`），断言初值 `2026-09-21T09:30`。
  - 仅用真实 `Backspace` + `ArrowRight` 逐段清空，共 6 轮；未使用 `fill`、未用 `evaluate` 写 value、未重设 `type`、未 `dispatchEvent` 冒充键盘。
  - 断言输入值为空串、`datetime-bound` 为 `null`、`validity.badInput === false`、`checkValidity() === true`；同时断言独立 `TimePicker` 仍为 `09:30`、`time-bound` 仍为 `09:30`。
  - 点击 `Submit keyboard form` 后断言提交计数为 1，`FormData` 精确为 `{"meetingTime":"09:30","meetingAt":""}`，即 `meetingAt` 为空而 `meetingTime` 保持 `09:30`。
- 各引擎原生分段顺序存在差异，但该场景所需按键（逐段 Backspace/ArrowRight）在 Chromium/WebKit/Firefox 均实际可复现；未使用 `test.fail`/skip，未放宽上述关键断言。
- 复跑结果：

```sh
bunx playwright test \
  --config scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts \
  --reporter=line
```

- Chromium/WebKit/Firefox desktop：**24 passed（8×3）**，exit 0，13.8s。
- `git diff --check`：exit 0；`git diff packages/ui/src/components/DateTimeInput.svelte` 为空，生产源码不可改且本轮无变更。
- 状态：本条只补上 DateTimePicker 逐段全部清空的事实证据；B2-03 整体仍未标记完成。未运行全仓测试、typecheck、build、时区/日期 policy 矩阵或部署流程，也不证明其他 locale、读屏和真实设备。

## DateTimePicker 全部分段清空补充

- pi 补充逐段真实按键场景后，主线程独立复跑 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.date-time-keyboard.config.ts`：Chromium/WebKit/Firefox desktop 24/24 passed、exit 0、15.8s；pi 24/24、13.8s 独立记录。
- 新增场景不使用 `fill` 或脚本写值：逐段 `Backspace`/`ArrowRight` 清空 DateTimePicker，断言绑定 `null`、`badInput=false`、`checkValidity=true`，提交后 `meetingAt=""`，独立 TimePicker 仍为 `09:30`。
- `DateTimeInput.svelte` 仍无本轮生产改动；该结果只完成浏览器原生键盘边界，不证明真实设备、读屏、服务端或发布。
