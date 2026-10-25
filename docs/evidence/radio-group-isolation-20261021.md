# RadioGroup 多实例标签隔离

## 续接任务

- parent：`choice-binding-20261021.md` 的未验收项；
  source：用户要求继续完善企业组件直至完成；
  reason：当前 input ID 仅由 `name` 与选项值拼接，同页未命名实例或
  不同表单的同名实例会重复，标签可能指向其它实例的输入。
- 目标：实例之间的标签 ID 唯一，标签点击和未命名组键盘操作只更新所属组件；
  不改变宿主字段名、选项值、表单归属、绑定或回调契约。
- 非目标：不自动改写同一表单中相同 `name` 的原生 radio 分组语义，
  不引入自动字段名，不重做样式、权限、异步查询或整个选择器体系。
- 写入范围：RadioGroup、其单一测试文件、一个隔离测试宿主、本证据、
  迁移说明的 RadioGroup 小节和计划入口；浏览器产物仅存放于忽略的
  `output/playwright/radio-group-isolation-20261021/`。
- Delegation Decision：medium / managed；主线程唯一写入，Bohr 单名只读复核；
  全局企业级目标仍保持进行中，不由本次修复缩减。

```gherkin
Given 同页存在多个未命名或不同表单内同名的 RadioGroup
When 点击第二组选项的文字标签
Then 仅第二组回写，所有输入 ID 与标签关联均独立

Given 两个独立表单均包含 name="visibility" 的单选字段
When 各自选中不同选项并序列化
Then 每个表单只包含各自的选择值，宿主字段名不被重写

Given 选项值或宿主字段名包含空格、引号或空字符串
When 渲染并选择选项
Then 自动 ID 合法且唯一，原始选项值不被改写

Given 同一个表单内有两个未命名 RadioGroup
When 用户用方向键移动或循环选择
Then 焦点和选择都留在当前组件，跳过禁用项且只触发一次回调
```

## 键盘续接约定

- parent：本文件的标签隔离验收；source：持续用户目标与本轮浏览器探针；
  reason：ID 修正后，Chromium 在同一表单的第一组末项按 ArrowDown 会跳到
  第二组，并将第二组值改为 `personal`。
- 续接目标：仅对未命名组增加组内方向键、Home/End 与单 Tab 入口；
  使用原生 input 点击传播 `change`，保持 FormData 中没有虚构字段名。
- 写入边界不变，风险与编排仍为 medium / managed，一名只读复核者。
  命名组继续使用原生 `name`、方向键和表单归属，不改同名组的浏览器语义。
- 不以模拟 DOM 的 `labels.length` 重复同一标签作为浏览器事实；
  当前 Chromium 实测每个输入仅一个关联标签。

## 验收边界

先证明旧实现回归失败，再做最小实现修复。真实浏览器同时核对标签点击、
命名组的原生键盘及未命名组的组件内键盘；不能据此证明所有必填、跨浏览器
或屏幕阅读器场景都已完成。

## 当前结果

在 `packages/ui` 使用现有 Vitest 配置执行：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/radio-group.test.svelte.ts
```

- `radio-group.test.svelte.ts`：15/15，退出 0；覆盖字段集语义、实例级 ID、
  任意选项值、标签归属、禁用项、整组禁用、未命名组方向键/Home/End、
  RTL、单 Tab 入口以及平台禁用边界。
- `choice-binding.test.svelte.ts` 与 `segmented-control.test.svelte.ts`：
  合计 9/9，退出 0；父组件绑定、表单序列化、外部赋值和清空回归保持通过。
- `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig packages/ui/tsconfig.json --threshold error`：0 errors /
  0 warnings。
- `git diff --check`：通过。
- Chromium 本机证据保存在
  `output/playwright/radio-group-isolation-20261021/`：`verify.js` 在
  1440x900 与 390x844 下运行命名/未命名组合，共 4 组全部通过，
  `pageErrors: []`。验证了六个输入的 ID 唯一、每个输入关联一个标签、
  两个表单值隔离，以及命名组的原生方向键。
- `probe-unnamed.js` 共享表单探针通过：第一组末项向下循环后，
  第一组值为 `personal`、第二组仍为 `company`，焦点留在第一组；
  Tab/Shift+Tab 在每组唯一入口间移动。外层禁用 `fieldset` 下
  `disabled: true, intercepted: false`，两个组的值保持不变。
- 已查看 `named-390.png` 和 `unnamed-1440.png`，未见明显遮挡；
  其余截图未逐张人工认证。
- 键盘选择使用目标原生 input 的 `focus()` 与 `click()`，保留原生
  `change` 冒泡和一次公开回调；重复选择当前值不重复回调。
- Bohr 对最终实现独立只读复核：此前单 Tab 入口、共享表单测试、
  原生 change 三项均已关闭，未发现明确 P0/P1/P2 阻塞。按建议增加第二组
  DOM `checked` 不变的断言后，单文件重新执行 15/15 通过；复核者没有
  独立重跑浏览器脚本。
- 临时 `svadmin-radio` 浏览器和 4200 端口验证服务均已关闭。

本轮关闭的是 RadioGroup 的多实例标签/焦点隔离与本地绑定回归，不代表
完整必填校验、异步/关系选择器、跨浏览器与读屏认证、真实消费者构建、
真实服务联调、提交、发布或部署已经完成。Happy DOM 对显式/嵌套 label
可能重复计数；父级 `fieldset` 禁用继承也存在模拟差异，相关浏览器事实
以 Chromium 探针为准，不为模拟环境改写生产行为。
