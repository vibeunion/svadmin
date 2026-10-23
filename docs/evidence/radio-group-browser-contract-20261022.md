# RadioGroup 必填、i18n 与 Tab 边界契约

## Task Contract

- parent：`docs/evidence/radio-group-isolation-20261021.md`；
  source：用户要求继续直到全部完成；
  reason：路线图仍把 RadioGroup 的必填/真实源码跨浏览器验收列为未闭环，
  且未命名组的原生 `required` 可能在每个独立 radio 上产生 `valueMissing`。
- 本轮续接 parent：本文件上一轮记录；source：主线程审查退回；
  reason：固定英文提示违反企业国际化，Tab 边界依赖不完整的全页元素表，
  custom validity 的生命周期同步和 named 表单标签点击证据仍需补强。
- 本轮中断续接：上一 pi 进程在主线程中断（exit 130）时没有产出最终结果，
  不能视为完成；本轮只读取当前文件继续剩余修改，不重做已通过的初始
  16/16 与 48/48。
- 目标：使用 `scripts/fixtures/enterprise-ui` 的真实源码消费者，在
  Chromium/WebKit/Firefox 两视口验证命名与未命名组的标签唯一性、键盘/Tab
  隔离、RTL、原生必填提交、禁用恢复、父级赋值/清空回调计数，并补齐
  i18n、contenteditable/inert/aria-disabled 宿主 Tab 边界、窄屏焦点可见性、
  `name=""` 与省略 name 等价、custom validity 生命周期及外层 fieldset
  禁用恢复后的未命名 required 校验；只对真实红证据做最小修复。
- 非目标：不修改 `SegmentedControl`、样式、公开 API、宿主字段名、选项值、
  原生命名分组语义或表单归属；不引入伪字段名、异步数据协议、服务端授权、
  读屏认证或发布流程；不创建全局 focus 框架；不扩展到其他组件缺陷；不声称
  完整原生 reset、读屏或发布完成。
- 写入范围：`packages/ui/src/components/RadioGroup.svelte` 与其单一测试文件；
  `radio-group-isolation.test-host.svelte` 仅最小扩展 `emptyName` 开关；
  新增 fixture、专属 spec 与 Playwright 配置；`App.svelte` 仅已有 import/route；
  本证据、路线图与迁移说明的 RadioGroup 段落。浏览器截图只写入被忽略的
  `output/playwright/radio-group-browser-contract-20261022/`。
- 编排：medium / managed；pi 为唯一 writer；主线程已完成独立专项复核
  （2026-10-22，见“独立复核”）。
- 验证命令：仅 `packages/ui` 内 bunx vitest 单文件、专属 Playwright 配置，
  以及 `git diff --check`；不运行全仓、构建、全量类型或其他测试文件。

## Given / When / Then 验收

```gherkin
Given 同一页面有两个命名或未命名 RadioGroup 实例
When 检查所有 radio 的 id、label 关联并用 Tab/Shift+Tab 移动
Then 每个实例的 id 唯一、标签只指向自身输入，每组仅一个 Tab 入口

Given 一个共享表单内有两个未命名 RadioGroup
When 在第一组用真实方向键、Home/End 选择并跳过 disabled 选项
Then 焦点与值留在第一组，第二组值和回调不变

Given 一个未命名 RadioGroup 外层方向为 RTL
When 使用真实 ArrowLeft/ArrowRight 移动
Then 左右方向语义反转，上下方向顺序不变

Given 两个独立表单各含 name="visibility" 的必填组
When 点击各自的 label 文本选择不同值并提交
Then 每个表单的 FormData 精确只有自身一个值，空提交被原生校验阻止

Given 共享表单内有一个未命名 required RadioGroup 和一个普通未命名组
When 未选择提交，再在当前 required 组选择有效值后提交
Then 未选择时宿主提交计数不变；选择后宿主可提交，且 FormData 不出现伪造字段

Given 整组 disabled 或外层 fieldset disabled
When 点击选项、尝试提交并重新恢复
Then 值不被用户操作改变、提交结果不含禁用值，恢复后可以正常选择与提交

Given 未命名 required 组被外层 fieldset disabled 包裹且当前无选择
When 恢复外层 fieldset 后检查表单
Then 未命名 required 组仍然无效，选择本组有效值后才恢复有效

Given 父组件持有 RadioGroup 的值
When 父级清空或重新赋值
Then 输入状态同步且不会多发 onchange

Given 未命名组启用 required 且当前无有效选择
When 切换中文/英文 locale
Then custom validity 使用现有 validation.required 文案，值和 onchange 计数不变

Given 未命名组在 name/required/disabled/options/父级值之间切换
When 重新渲染或清空选择
Then 不残留旧的 custom validity，命名组仍保留原生 required

Given 同表单两个未命名 RadioGroup 之间插入 contenteditable、inert radio
或 aria-disabled=true 且非 disabled 的宿主 button
When 从第一组按 Tab
Then 不跳过 contenteditable 和宿主 button，不聚焦 inert radio，
也不被组件接管普通原生 radio

Given 两个 name="" 的 RadioGroup 位于同一表单
When 从第一组按 Tab
Then name="" 与省略 name 一样按未命名组处理，Tab 进入第二组，
且不产生表单字段

Given 窄屏上第二组位于视口下方
When 从第一组按 Tab 进入第二组
Then 平台滚动使获焦 radio 进入视口，焦点可见
```

## 状态

- 上一 pi 进程被主线程中断（exit 130），无最终结果；本文件此前曾保留
  16/16、48/48 以及后续未复核数字，均不能作为本轮完成证据。
- 本轮由 pi 继续当前文件并实际执行下列单文件 Vitest、专属 Playwright 与
  diff check；这些数字是 pi 自测结果，单独标识，不与独立复核混同。
- 主线程已于 2026-10-22 完成独立专项复核：单文件 Vitest 20/20，专属
  Playwright 81 passed、3 skipped，`git diff --check` 通过，并已检查
  RadioGroup 当前 diff；详见“独立复核”。
- 当前任务不是整体完成：真实读屏、服务端授权、真实消费者构建、发布和
  部署仍未验收。

## 本轮红测与修复记录

### 产品与实现修正

1. `sequence.indexOf(contained[0])` 和 `contained[contained.length - 1]` 在
   `noUncheckedIndexedAccess` 下可能为空。现在先取首尾元素并显式守卫，
   再检查索引是否落在 sequence 中，避免空数组或索引 -1 时误算目标。
2. 受控 Tab 目标曾使用 `focus({ preventScroll: true })`，窄屏键盘焦点可能
   停在视口外。恢复 `focus()` 平台滚动，并增加窄屏真实浏览器断言：第二组
   原本在视口下方，按 Tab 后必须获焦且完整进入视口。
3. `name=""` 曾被 `[name]` 属性选择器当作命名组，导致 Tab 接管判断与
   `name` 省略不一致。现在只把非空 `input.name` 视为原生命名分组；
   `name=""` 与省略 name 一样使用未命名组的 Tab、校验和序列化语义。
4. `aria-disabled="true"` 和 `aria-hidden="true"` 不是原生不可 Tab。此前
   tabbable 过滤会越过这类宿主 button 直接跳到下一组；现在只排除原生
   `:disabled`、`[hidden]`、`[inert]` 和不可见元素。新增红测：同表单两组
   之间有 `aria-disabled=true` 且非 disabled 的宿主 button，Tab 必须先到
   该 button，不能由组件接管跳到第二组。
5. 外层 fieldset disabled 恢复后，未命名 required 的空值仍须校验。当前
   validity 同步基于选项首个 enabled 输入，不监听整个 DOM；新增真实浏览器
   断言确认恢复后 `checkValidity()` 仍为 false，选择本组值后才变 true。

### 前一轮已修正并保留

1. 未命名 required 的提示改为复用 `@svadmin/core/i18n` 的
   `useTranslation().t('validation.required')`，随 locale 更新。
2. custom validity 的 `$effect` 先读取全部依赖，再清理并重建 validity，
   避免切换 name/required/disabled/options/value 后残留旧错误。
3. Tab 接管收敛到当前表单内多个未命名 RadioGroup 的必要场景，contenteditable
   宿主视为 Tab 停靠点，普通原生 radio 交还浏览器；先聚焦成功再取消默认行为。

### 测试代码与预期修正

1. `@testing-library/svelte` 的 `rerender` 会合并 props，省略 `name` 不会
   清除旧值；生命周期用例显式传入 `name: undefined`。
2. 标签唯一性用例只检查 `[data-svadmin-radio-group] input[type="radio"]`，
   不把边界用原生 radio 算进组件输入。
3. Playwright 的 `toBeEnabled()` 会把 `aria-disabled="true"` 视为 disabled；
   宿主 button 用例改为断言原生 `disabled` 属性为 false，同时保留
   `aria-disabled="true"` 属性断言，避免测试预期与 ARIA 语义混淆。
4. WebKit 默认键盘导航不会把普通 button 作为 Tab 停靠点；宿主 button 增加
   `tabindex="0"`，明确它本来就是可聚焦宿主停靠点，再验证组件不得越过它。
   这不是产品绕过，而是让三引擎共享同一宿主 Tab 前提。

### 真实红绿数量

- 单文件 Vitest：最终 20/20 passed。新增 `name=""` 等价用例 1 项。
- 专属 Playwright：14 个用例 × Chromium/WebKit/Firefox × 桌面/窄屏 = 84 项；
  最终 81 passed、3 skipped（窄屏焦点可见性用例在桌面项目按预期跳过）。
- 本轮首次完整 Playwright 运行：75 passed、6 failed、3 skipped。6 项失败全部
  是同一宿主 button 用例的 `toBeEnabled()` 测试预期错误；修正后 WebKit 两项
  仍失败，定位为 WebKit 默认不 Tab 到无 tabindex 的 button，补
  `tabindex="0"` 后最终 81 passed。
- 本轮接手时代码已包含中断进程留下的部分修复，因此新增产品回归用例没有留下
  修复前失败快照；上述红绿数量均为本轮实际执行结果，不引用未复跑的旧数字。
- 每个 Playwright 用例的 `pageerror` 集合均为空（`afterEach` 断言）。
- 截图位于被忽略的
  `output/playwright/radio-group-browser-contract-20261022/`，共 6 张：
  `chromium|webkit|firefox` × `desktop|narrow`。已确认文件生成，未逐张
  人工认证像素细节。
- `git diff --check`：通过。
- 未运行全仓测试、构建、全量类型检查或其他测试文件；未修改依赖或跳过断言。

## 最终结果

以下均为 pi 本轮实际执行。

```sh
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/radio-group.test.svelte.ts
```

- 20/20 passed。
- 覆盖 i18n 中英往返、custom validity 生命周期、`name=""` 等价、原生未命名
  radio 边界和既有隔离/RTL/Tab/禁用用例。
- i18n 用例验证中英往返后提示分别为 `此字段为必填项` 和
  `This field is required`，值和 onchange 计数不变。

```sh
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.radio-group.config.ts --reporter=line
```

- 81/81 passed，3 skipped（桌面跳过窄屏焦点可见性用例）。
- Chromium、WebKit、Firefox × 1440x1000 / 390x844。
- 新增覆盖：`name=""` 未命名组 Tab、aria-disabled 宿主 button 不被越过、
  窄屏 Tab 后焦点进入视口、外层 fieldset disabled 恢复后未命名 required
  仍无效。
- named 表单隔离用例真实点击 label 文本，确认 FormData 分别为 `personal`
  和 `company`。

## 独立复核

- 复核方：主线程，独立于上述 pi 自测；复核日期 2026-10-22。
- `packages/ui` 内
  `bunx vitest run --config ./vitest.config.ts src/components/radio-group.test.svelte.ts`
  exit 0，20/20 passed。
- 根目录
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.radio-group.config.ts --reporter=line`
  exit 0，81 passed、3 skipped（48.7s）；3 项 skipped 为桌面项目按预期跳过
  窄屏焦点可见性用例。
- `git diff --check` exit 0；主线程已检查 RadioGroup 当前 diff。
- 本节仅确认该专项复核已完成，不改变整体非完成边界；真实读屏、服务端授权、
  真实消费者构建、发布和部署仍未验收。

## 剩余边界

- 禁用语义按原生浏览器行为验收：整组 disabled 或外层 `fieldset disabled`
  时用户操作不改变值、值不进入 FormData；恢复后选择和提交正常。表单本身
  是否可提交仍遵循浏览器对 disabled 控件的免校验规则，本任务不伪造阻止。
- 未命名 required 使用组件内 custom validity，真实读屏软件是否播报必填
  状态尚未验收；提交服务端仍必须重新校验。
- Tab 接管只覆盖同一表单内多个未命名组的浏览器缺陷边界，仍依赖当前表单
  顺序和可聚焦元素可见性；不重写整页 focus 框架，也不覆盖跨 shadow root、
  跨 iframe 或宿主自定义 Tab 顺序。
- WebKit 的 button Tab 停靠受平台键盘导航影响；宿主需要自行保证普通 button
  的真实可聚焦前提（本用例显式 `tabindex="0"`），组件不为宿主创造额外停靠点。
- 未完成真实消费者构建、真实服务端权限联调、正式发布或部署；其他组件
  发现的边界不在本轮扩展范围内。
