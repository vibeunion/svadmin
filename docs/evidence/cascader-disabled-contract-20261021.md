# Cascader 禁用与清空契约

## 续接约定

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二树/级联选择；
  source：用户继续完善企业级实用性；reason：当前仅有三个展示用例，
  已展开面板没有组件禁用和祖先禁用保护，清空控件缺少名称与完整键盘行为。
- 目标：组件或祖先禁用后不能从已展开后代提交；清空操作有名称，支持点击、
  Enter 和 Space，不触发弹层打开或重复回调。
- 清空入口沿用已有 Combobox 的独立图标按钮模式，避免将可交互控件嵌入另一个
  按钮；局部触发/清空宽度分配是实现该无障碍契约的必要改动，不重做面板布局。
- 非目标：不重写布局、树选择策略、异步数据接口、键盘树导航或数据源生命周期；
  不修改 TreeSelect、Popover、颜色 token、服务端授权或用户已绑定的值。
- 写入范围：`Cascader.svelte`、`cascader.test.svelte.ts`、必要的测试 fixture、
  本证据、迁移说明与路线图入口。独立浏览器产物仅保存于忽略的 output 目录。
- Delegation Decision：medium / managed；主线程唯一写入，Bohr 唯一只读复核。
- 状态：本地实现、定向回归、Chromium 验证和独立复核已完成；
  不提交、推送、发布或部署，不关闭整体企业级目标。

## 验收场景

```gherkin
Given 已经展开到子节点的级联选择器
When 宿主将整个组件设置为 disabled
Then 已显示选项禁用，不能提交，原有值保持不变

Given 已展开或已绑定路径中的父节点被禁用
When 尝试选择它的后代
Then 后代也禁用；允许的其他分支不受影响

Given 有已选路径且允许清空
When 点击清空或用 Enter/Space 激活
Then 清空一次且不打开弹层，按钮具有可访问名称

Given 组件被禁用
When 宿主更新受控值或重新启用
Then 外部值仍可正确显示，重新启用后可以正常选择
```

## 当前证据

- 旧实现失败回放：11 项中 7 项失败、4 项通过，确认已展开面板的选项缺少
  组件/祖先禁用状态，清空控件无可访问名称。失败断言未全部到达后续交互
  步骤，不能把每条断言之后的行为都称为已回放的缺陷。
- 修复后 `packages/ui/src/components/cascader.test.svelte.ts`：
  **11/11**，退出码 0；覆盖已展开禁用、祖先传递、根树替换、清空名称、
  受控值更新，以及既有三项展示测试。键盘测试检查原生按钮语义及 click
  回调，真实 Enter/Space 默认行为由浏览器单独验证。
  在 `packages/ui` 运行：

  ```sh
  node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/cascader.test.svelte.ts
  ```

  本项只运行该单文件与差异检查，未运行全仓套件或包级类型检查。
- 实现保持路径值和 `changeOnSelect` 协议；不改变 TreeSelect、Popover、服务端
  权限或异步接口。清空按钮使用现有 `Button`，避免按钮内嵌套交互元素。
- Chromium：1440x900、390x844 两个视口，各自验证清空点击、Enter、Space，
  弹层打开后禁用与恢复、祖先禁用和允许分支，共 **10/10**，`pageErrors: []`。
  真实浏览器确认 Enter/Space 会激活独立清空按钮，清空不打开弹层并恢复触发
  按钮焦点；禁用不会提交旧面板，重新启用后可继续选择。
- 浏览器脚本为 `output/playwright/cascader-disabled-contract-20261021/verify.js`；
  已查看 `control-1440.png` 和 `panel-390.png`。验证页使用本地静态选项，
  不是生产权限或异步服务验收；`svadmin-cascader` 浏览器和 4203 端口临时服务
  已关闭。
- Bohr 对最终 diff 只读复核：无明确 P0/P1/P2 阻塞；确认直接 handler 与
  原生 `disabled` 同时保护，祖先断链会停止路径查询，清空没有嵌套交互元素。
- `git diff --check` 通过。尚未执行跨浏览器、读屏、真实权限、消费者发布构建、
  提交、发布或部署。

## 浏览器续接

- parent：本轮独立清空布局验收；source：动画完成后的浏览器几何检查；
  reason：闭合触发区无溢出，但展开三级面板在 390px 视口宽达 482px。
- 仅限制 Cascader 面板最大宽度为视口减 32px，复用已有列容器的横向滚动，
  不更改全局 Popover 或菜单结构。浏览器脚本增加动画结束后的面板溢出断言。
  编排仍为 medium / managed，主线程写入、Bohr 复核。
- 修复后重新运行组件单文件 11/11 和浏览器 10/10，`pageErrors: []`；
  已查看重新生成的 `panel-390.png`，面板在视口内，横向滚动保留在面板内部。
  `panel-stable-390.png` 是修复前的失败证据，不是最终验收截图。
