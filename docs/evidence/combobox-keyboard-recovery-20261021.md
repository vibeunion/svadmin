# ComboboxField 键盘进入与退出

## 续接约定

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二异步选择器；
  source：用户持续要求完善企业级可用性；reason：现有组件已经实现分页、
  搜索和跨页回显，但触发按钮与 Command 搜索之间缺少显式焦点交接，
  关闭后也没有统一的焦点恢复契约。
- 目标：只用键盘即可打开、进入、选择或取消；离开控件时收起而不抢回
  焦点，禁用或作用域变化后不遗留延迟焦点。
- 非目标：不重做视觉、分页、查询缓存、权限协议、绑定 API 或多选选中
  语义；本轮不宣称完整 ARIA/读屏认证或跨浏览器验收。
- 写入范围：`ComboboxField.svelte`、`combobox-field.test.svelte.ts`、
  现有测试 host 的必要选项、本证据、迁移说明和计划入口。浏览器验证页、
  脚本及截图仅保存于忽略的 `output/playwright/combobox-keyboard-20261021/`。
- Delegation Decision：medium / managed；主线程唯一写入，
  Bohr 单名只读复核。沿用现有设计与上游 Command 导航，不引入新设计决策。
- 状态：本地实现、定向回归、Chromium 走查和独立复核已完成；
  不关闭异步选择器整批或整体企业级目标。

## 验收场景

```gherkin
Given 一个启用的远程选择字段
When 点击或用 Enter/Space 打开，或在触发按钮按 ArrowDown
Then 搜索框取得焦点，列表导航仍由现有 Command 处理

Given 弹层中的搜索或选项已获得键盘焦点
When 按 Escape 或完成一次单选
Then 弹层收起，焦点返回同一字段触发按钮，取消不改写选择值

Given 多选字段已打开
When 选择选项、Tab 离开或点击其它控件
Then 多选后保持打开，离开时关闭且不抢走目标控件焦点

Given 字段禁用、资源或租户已经变化
When 之前排队的打开或焦点任务恢复
Then 不重新打开、不把焦点转回旧弹层、不产生选择回调

Given 弹层中的加载更多按钮已获得焦点
When 按 Enter 或 Space
Then 只请求下一页，不触发选项选择，按钮仍可连续分页或用 Escape 退出
```

参考依据：WAI-ARIA APG Combobox Pattern 的进入/退出焦点约定，
以及 Bits UI Command 的既有键盘导航与 `ref` API；实施以仓库实际安装
版本和包装层为准，不仅依赖在线示例。

## 验收边界

通过失败回放证明旧实现的缺口，再检验修复；定向测试与 Chromium 走查分别
记载，不把测试 host 当作真实服务联调或消费者发布验收。

### 运行时续接

- parent：本文件焦点契约；source：本轮 Chromium 和定向失败回归；
  reason：鼠标多选后焦点落在 Command 根节点，分页按钮的 Enter 被上游
  当作选项选择，等待下一页时分页按钮移除导致焦点丢失；窄容器中清空按钮
  还被全宽触发按钮挤出 12px。
- 在原组件范围内补充多选焦点、独立分页按钮及等待/末页焦点路径、
  滚动列表 Tab 顺序和触发/清空按钮宽度分配。没有修改查询协议、Provider、
  分页算法或新增设计体系；编排仍为 medium / managed，单写入者与单复核者。

## 当前结果

- `combobox-field.test.svelte.ts`：合计 32/32，退出 0，包含原有 11 项远程选择
  用例和严格 TypeScript 边界检查。回归覆盖 click/ArrowUp/ArrowDown 打开、
  searchable=false、Escape、单选/清空回焦、多选连续选择、Tab focusout、
  禁用、租户切换、宿主 `onkeydown`、宿主回调主动转移焦点，以及加载更多
  不拦截原生 Enter；真实 Enter/Space 默认点击行为由浏览器验证。
- 旧组件回放：最初新增的 7 项焦点测试全部失败、原有 11 项通过；随后
  Load more 的单项回归在原位置失败，复现 Enter 被 Command 拦截。修复后
  全部通过，未将模拟环境单独的 keydown 当作浏览器完整点击链路。
- 同轮曾执行 `combobox-field.test.svelte.ts` 与
  `select-contract.test.svelte.ts`，当时合计 99/99，退出 0；事件顺序和分页
  断言调整后只重跑当前组件单文件，最终为 32/32。UI 包
  `svelte-check --tsgo-experimental-api
  --tsconfig packages/ui/tsconfig.json --threshold error` 最终为
  0 errors / 0 warnings。本次没有运行全仓测试套件。
- 事件类型收口：初版按钮专用处理器与 Button 的 button/anchor 属性交集
  不兼容。最终使用 `KeyboardEvent` 参数与真实 `HTMLButtonElement` 守卫
  转发宿主事件，未放宽公共 Button 类型。单文件类型回归加载真实 Button
  的类型定义，但仅收集本次修改文件的诊断；最终再次执行 32/32 通过。
- 事件顺序回归覆盖菜单打开时宿主 `onkeydown` 对 Escape 的允许/阻止两种
  场景；`svelte/events` 的 `on(...)` 保留委托事件顺序，宿主可以用
  `preventDefault` 保持菜单打开。分页旧断言已改为检查 `aria-disabled`。
- Chromium 串行矩阵保存在
  `output/playwright/combobox-keyboard-20261021/verify-matrix.js`：
  1440x900 与 390x844 × 单选/多选 × 可搜索/不可搜索，共 8 组全部通过，
  `pageErrors: []`。验证了键盘打开和取消、单选回焦、多选保持菜单和搜索
  焦点、分页按钮键盘操作、Tab 离开、禁用恢复、租户切换、页面无横向溢出。
- 已人工查看 `single-search-1440.png` 与 `multi-search-390.png`；字段、
  清空按钮、弹层和窄屏内容未见遮挡，其他 6 张截图未逐张人工认证。
- 加载更多已移出 `Command.Root`，避免 Command 将按钮上的 Enter 解释为
  当前 option 的选择；请求期间按钮保持在弹层中并通过 `aria-busy` /
  `aria-disabled` 表达状态，最后一页加载后焦点回到选择面。
- 单选和清空在调用公开 `onchange` 前恢复触发按钮焦点；多选在宿主回调后
  仅当焦点仍属于当前 Command 或页面主体时恢复搜索/命令面板焦点，宿主主动
  把焦点移到外部控件时不抢回。
- Bohr 最终只读复核：未发现明确 P0/P1/P2 阻塞；确认
  `searchable=false`、多选、禁用、租户作用域、Tab focusout、Load more
  以及宿主焦点回调边界均有保护。其未独立重跑浏览器，浏览器结论来自本地
  Chromium 串行矩阵。
- `git diff --check`：通过。Vitest 输出的既有 `svelte2tsx/index.js.map`
  缺失提示未导致测试失败。
- 最终事件顺序和测试断言修正后重新运行 Chromium 矩阵，8/8 通过，
  `pageErrors: []`；
  `svadmin-combobox` 浏览器与 4201 端口临时服务均已关闭。截图来自源码
  测试页，不代表发布产物构建或真实业务应用验收。

本轮关闭的是 `ComboboxField` 的本地键盘进入/退出和焦点恢复契约，不代表
跨浏览器、屏幕阅读器认证、万条选项性能、真实 Provider/权限联调、完整
消费者构建、提交、发布或部署已经完成。浏览器矩阵使用测试 Provider，
不替代生产数据或租户授权验收。
