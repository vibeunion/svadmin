# SegmentedControl 真实源码消费者跨浏览器契约

## Task Contract

- parent：`choice-binding-20261021.md`；
  source：用户持续企业级目标下的本专项；
  reason：此前只关闭基础绑定/类型门槛，没有企业 fixture 下的跨浏览器、
  多实例隔离、禁用恢复、宿主表单与窄屏焦点证据。
- 目标：通过 `scripts/fixtures/enterprise-ui` 的真实 `SegmentedControl.svelte`
  源码消费者，在 Chromium/WebKit/Firefox 的桌面与窄屏验证 radio group
  语义、实例隔离、完整键盘路径、RTL、禁用恢复、受控值不可用、表单按钮
  类型和窄屏布局/焦点；只在真实缺陷存在时做组件最小修复。
- 非目标：不改变公开 API、选项值、受控值语义、样式令牌或业务状态；不引入
  读屏认证、服务端授权、真实消费者构建、发布或部署；不扩展到其他组件。
- 写入范围：新增 `SegmentedControlFixture.svelte`、`segmented-control.spec.ts`、
  `playwright.segmented-control.config.ts`；`App.svelte` 仅新增 import/route；
  本证据与路线图、迁移指南的 SegmentedControl 段落。组件与单文件 Vitest
  仅在实际红证据出现时修改。
- 编排：medium / managed；pi 为唯一 writer，主线程为独立 verifier，已完成专项复核。
- 验证命令：在 `packages/ui` 下执行
  `bunx vitest run --config ./vitest.config.ts src/components/segmented-control.test.svelte.ts`；
  在仓库根目录执行
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.segmented-control.config.ts --reporter=line`；
  以及 `git diff --check`。未运行全仓测试、构建或全量类型检查。

## Given / When / Then 验收

```gherkin
Given 同一 fixture 中存在两个 SegmentedControl 实例
When 检查 radiogroup、aria-label、aria-checked 和 roving tabindex，并分别点击
Then 每个实例的 radiogroup 名称唯一，组内只有一个 tabindex="0"，
     选中值和 onchange 计数只属于被操作实例，另一实例不串值、不串回调
     名称由宿主显式提供，不是组件自动生成；逐项断言非空且互不重复

Given 一个当前没有选中值的 SegmentedControl
When 用 Enter 选择焦点项，清空后改用 Space 选择另一项
Then Enter 和 Space 各只触发一次回调，值和回调计数与焦点项一致

Given 一个包含前置按钮、两个 SegmentedControl 和后置按钮的自然 Tab 区域
When 只把焦点放在前置按钮，然后连续按 Tab 和 Shift+Tab
Then 正向依次进入第一组选中项、第二组选中项、后置按钮，
     反向完整返回第二组、第一组、前置按钮，无需逐次手动 focus

Given 父组件外部赋值或清空 SegmentedControl 的 value
When 真实浏览器触发外部赋值和清空
Then onchange 不增加，随后用户选择只增加一次

Given 一个有 disabled 选项的 SegmentedControl
When 使用 Arrow、Home、End 移动，并用 ArrowLeft/ArrowRight 在 RTL 中移动
Then 方向键跳过 disabled 项，Home/End 到达首尾可用项，RTL 左右方向反转，
     垂直方向保持声明顺序，始终只有一个 roving tabindex

Given 整组 disabled 且含 disabled 选项
When 点击组内选项和 disabled 选项，再恢复组可用后点击可用项
Then 禁用期间值和 onchange 计数不变，恢复后可以正常选择

Given 受控 value 指向 disabled 选项
When 检查初始状态并在 roving 入口按 Enter
Then 受控值保留，disabled 选项保留 aria-checked，roving 入口仍指向可用项，
     初始化不静默触发 onchange，用户选择后才回调

Given 受控 value 指向随后从 options 移除的选项
When 移除该选项
Then value 原样保留，没有选项被伪选，roving 入口仍可用且初始化不触发
     onchange，用户按 Space 后才选择当前入口

Given 一个可动态切换单个选项 disabled 的消费者场景
When 先选择该选项，再切换为 disabled，随后恢复可用
Then 初始选择只增加一次 onchange；disabled 期间原生 disabled 与
     aria-disabled 生效，真实指针点击和 Arrow/Home/End 都不会选中它，
     当前 value 与其他回调计数保持；恢复后该选项重新进入可用导航序列，
     roving tabindex 始终只有一个入口，选择它只再增加一次回调

Given SegmentedControl 位于真实 form 中
When 真实点击文本、重复点击当前项、用 Enter 和 Space 选择不同值、
     用 End 键盘选择并点击提交按钮
Then 内部 button 全部为 type="button"，组件选择不会提交宿主表单，
     每次有效选择只回调一次，只有真实提交按钮增加提交计数

Given 窄屏 390x844 且下方实例位于初始视口之外
When 聚焦下方实例并键盘移动到末项
Then 页面没有横向溢出，获焦项完整落在可视区域内

Given 任一上述浏览器场景
When 页面完成交互
Then 不出现 pageerror
```

## 执行结果

- 单文件 Vitest：在 `packages/ui` 下执行
  `bunx vitest run --config ./vitest.config.ts src/components/segmented-control.test.svelte.ts`，
  **7/7 passed**。
- 专属 Playwright：
  在仓库根目录执行
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.segmented-control.config.ts --reporter=line`，
  **66 项中 63 passed、3 skipped**，原始 exit code 为 0。
  三个 skipped 均为 narrow 焦点用例在 desktop 项目按设计跳过。
- 项目矩阵：`chromium-desktop`、`chromium-narrow`、`webkit-desktop`、
  `webkit-narrow`、`firefox-desktop`、`firefox-narrow`；视口分别为
  1440x1000 与 390x844。
- Playwright runner 为仓库当前 `@playwright/test` 1.62.1；本轮未修改依赖或锁文件。
- 截图写入被忽略的
  `output/playwright/segmented-control-browser-contract-20261022/`，仅作记录，
  未逐张人工视觉验收。
- `git diff --check` 通过。

以上为 **pi 进程自测结果**，与主线程独立复核分开记录；两者都不等于读屏软件认证。

## 主线程审查退回与本轮修正

上一轮提交后，主线程审查退回并指出以下问题；本轮逐项处理，结果如下：

1. 首例“唯一名称”断言比较同一个 Set 的 size，属于恒等式。已改为读取
   `names`，逐项检查非空且 `new Set(names).size === names.length`，并在
   spec/证据中说明名称由 fixture 宿主显式提供，不是组件自动生成。
2. 单 roving tabindex 不能代替真实 Tab。已新增隔离自然 Tab fixture 区域：
   前置按钮和后置按钮显式 `tabindex="0"`；两个 SegmentedControl 的
   `tabindex="0"` 来自组件自身的 roving 入口，不是宿主给组件传 tabindex。
   测试只设置初始焦点，然后连续按 Tab/Shift+Tab 验证完整正反路径，不逐次
   手动 focus。该用例在 Chromium/WebKit/Firefox 两视口实际通过。
3. 表单宿主原用例缺真实 Enter/Space。已改为真实 Enter 选择 Table、Space
   选择 Board、End 选择 Timeline，逐次断言 onchange 精确累计，提交计数
   始终为 0，最后显式提交才变为 1；重复点击当前项不重复回调。
4. 已新增父级外部赋值与清空用例：真实浏览器中赋值为 Timeline、清空为
   `undefined` 均不触发 onchange，随后用户点击 Table 只增加一次。
5. 保留既有实例隔离、键盘、RTL、禁用恢复、受控不可用值、窄屏与截图场景，
   已替换恒等式，保留必要行为断言；RTL 用例新增真实 ArrowUp，现覆盖
   ArrowLeft/Right/Up/Down。
6. 本节如实记录审查退回和本轮修正。主线程随后已独立复核本轮结果，见下节；
   该复核只覆盖本地源码消费者跨浏览器契约，不等于整批验收完成。

## 主线程独立复核

主线程在 pi 自测之外独立复跑并检查了以下内容：

- `packages/ui` 单文件 Vitest：7/7 passed，exit code 0。
- 专属 Playwright：原始 exit code 0，60 项中 57 passed、3 skipped；项目矩阵为
  Chromium/WebKit/Firefox × 1440x1000/390x844，3 个 skipped 均为桌面项目按
  设计跳过窄屏焦点用例。
- `git diff --check`：exit code 0。
- 主线程已检查 `segmented-control.spec.ts` 与 `SegmentedControlFixture.svelte`，
  确认断言与 fixture 宿主设置符合本证据约定。

上述复核独立于 pi 自测，只确认当前本地源码消费者的跨浏览器契约；不构成
读屏认证、真实 Provider/后端联调、真实发布包消费或发布构建验收。

## 单选项 disabled 动态恢复补充

本轮只处理已记录的“单个 option disabled 动态切换后的恢复行为”缺口，新增
fixture 区域 `Dynamic option disabled` 与用例
`SegmentedControl recovers an option after dynamic disabled toggle`。场景先在
可用状态选择 Board，确认 value 变化且 onchange 只增加一次；再通过宿主按钮
切换 Board 为 disabled，断言原生 disabled、`aria-disabled="true"`、
`tabindex="-1"`，并使用真实指针坐标点击而不是 force click，确认 value 与
回调计数保持。随后用 ArrowRight、Home、End 验证 disabled 项被跳过且 roving
tabindex 仍只有一个入口。恢复后 Board 重新可用，从 Table 按 ArrowRight
选择 Board 只增加一次回调，并继续验证 End/Home/ArrowRight 的可用入口序列。

该补充在 Chromium/WebKit/Firefox 的 1440x1000 与 390x844 六组项目中实际
执行通过；fixture 仍保留既有全部场景，没有删除或放宽断言。首次执行即通过，
没有出现可归因于 `SegmentedControl.svelte` 的红证据，因此本轮未修改组件或
单文件测试。以下“执行结果”与“主线程独立复核”中的旧计数为上一轮记录；
当前轮实际为单文件 Vitest **7/7 passed**、专属 Playwright **66 项中 63
passed、3 skipped**、原始 exit code 0，`git diff --check` 通过（见下方补充
记录）。此前记录的“单选项动态切换恢复未覆盖”缺口本轮已经关闭并转为已覆盖；
pi 进程自测与主线程独立复核分开记录于下，二者均不能由 pi 代为主线程宣称
完成，也不等于整批验收。

## 本轮 pi 自测记录（动态恢复补充）

- `packages/ui` 单文件 Vitest：7/7 passed，原始 exit code 0。
- 专属 Playwright：66 项中 63 passed、3 skipped，原始 exit code 0；skipped
  仍为桌面项目按设计跳过窄屏焦点用例。
- `git diff --check`：通过。
- 未修改 `packages/ui/src/components/SegmentedControl.svelte` 或其单文件测试；
  未提交、推送或部署。
- 新增动态场景与既有 pageerror、无横向溢出断言一起在六组项目执行。

## 主线程独立复核（动态恢复补充）

主线程在 pi 自测之外独立复跑并检查了本轮新增的动态单选项 disabled/re-enable
场景，结果与 pi 自测分开记录：

- `packages/ui` 单文件 Vitest：7/7 passed，原始 exit code 0。
- 专属 Playwright：原始 exit code 0，66 项中 63 passed、3 skipped；仍为
  Chromium/WebKit/Firefox × 1440x1000/390x844 三引擎两视口，3 个 skipped
  均为桌面项目按设计跳过窄屏焦点用例。
- `git diff --check`：exit code 0。
- 已检查动态 disabled 的 fixture 与 spec，确认本轮未修改
  `SegmentedControl.svelte` 或单文件测试，断言未被放宽。

上述独立复核只确认当前本地源码消费者的跨浏览器契约，包括新增动态单选项
disabled/re-enable 场景；不构成读屏认证、真实 Provider/后端联调、真实发布包
消费或发布构建验收。

## 键盘边界补充后的浏览器复跑（B2-04 续）

本轮只修改 `segmented-control.spec.ts` 的两个场景。祖先 `fieldset` 禁用用例
改为用真实坐标点击未选中的 Board，先逐项断言关键选项 disabled，确认值、
checked 与回调计数仍为 table/0；恢复 fieldset 后从 Table 以真实 `ArrowRight`
到 Board，断言焦点、值、checked 与计数 1。新增真实修饰键场景，在 Keyboard
view 上用 `page.keyboard.press` 的 Control/Alt/Meta+ArrowDown 断言焦点、
值、checked 与计数不被组件改变，再以普通 ArrowRight 验证原行为；未使用
`dispatchEvent` 冒充键盘。标题与注释不再声称已测禁用状态下的 Tab 顺序，
并删除了原有误导注释。

文档同时限定：修饰键 keydown 处理器不主动选择，不承诺阻止浏览器原生组合键
默认动作或不产生 click，组件也未新增 onclick 过滤。`keydown` 不
`preventDefault` 由单文件 Vitest 直接证明，浏览器侧不以组件执行前后的根
监听器代替全部事件处理结束后的 `defaultPrevented` 读取。

- 新增/修改场景单跑（grep 两个 case，三引擎两视口）：12/12 passed，
  原始 exit code 0，12.5s。
- 完整专属配置最终执行一次：78 项中 75 passed、3 skipped，原始 exit code 0，
  55.2s；3 skipped 为桌面项目按设计跳过窄屏焦点用例。
- 本轮未重跑未改动的单文件 Vitest；主线程独立单测为 12/12、exit 0、
  duration 2.20s，含 svelte2tsx source map 缺失警告但无退出失败。
- 主线程浏览器复核仍待完成；以上浏览器数字为 pi 自测。

## 红测与实现结论

本轮 fixture 与 spec 首次执行即通过，没有出现可归因于
`SegmentedControl.svelte` 的红证据。因此没有修改组件实现，也没有放宽断言、
伪造业务状态或改变公开 API。新增消费者只使用现有 `options`、`value`、
`disabled`、`ariaLabel`、`dir` 与 `onchange`。

## 未验收边界

- DOM/ARIA 断言不等于真实读屏软件（NVDA、JAWS、VoiceOver）认证。
- 没有验证真实后端、权限、租户、服务端校验或业务数据。
- 没有验证真实发布 registry 包消费、完整消费者构建、浏览器历史版本或移动软键盘。
- 没有运行全仓测试、构建或全量类型检查。
- 主线程已独立复核本地专项结果（含本轮动态单选项 disabled/re-enable 场景），
  但未验证上述未验收边界；不能写成整批选择控件或企业 UI 整体完成。
