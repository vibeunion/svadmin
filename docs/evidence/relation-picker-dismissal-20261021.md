# RelationPicker 关闭与重新进入

## 续接约定

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二实体与关系选择器；
  source：用户继续完善企业级实用性；reason：当前跨页草稿、取消、租户切换
  已有测试，但 Escape、关闭按钮和外部点击的关闭路径未与取消路径统一验收。
- 目标：所有非提交关闭路径丢弃搜索和草稿，取消未执行的防抖任务；重新打开
  从当前受控值和第一页开始，保持现有 Dialog 焦点恢复。
- 非目标：不改变公开 API、数据查询协议、租户/权限策略、视觉样式和上游
  Dialog；不以本地组件验收替代真实 Provider、跨浏览器或读屏验收。
- 写入范围：`RelationPicker.svelte`、`relation-picker.test.svelte.ts`、
  必要测试 host、本证据、迁移说明及路线图入口。浏览器隔离页与截图存于
  忽略的 `output/playwright/relation-picker-dismissal-20261021/`。
- Delegation Decision：medium / managed；主线程唯一写入，Bohr 唯一只读
  复核。没有新增产品方向或审美决策。
- 状态：本地实现、定向回归、Chromium 验证和独立复核已完成；
  整体企业级目标仍未完成，不提交、推送、发布或部署。

## 验收场景

```gherkin
Given 已搜索并勾选的多选弹窗
When 通过取消、Escape、右上角关闭或遮罩关闭并重新打开
Then 搜索为空且从第一页开始，草稿恢复受控值，未触发 onchange

Given 搜索防抖尚未执行
When 关闭后立即重开并等待原防抖窗口
Then 不向 Provider 发送已取消的搜索

Given 从选择按钮打开弹窗
When 取消或确认关闭
Then 焦点回到原有按钮且确认仅提交一次

Given 租户变化或列表权限被撤回
When 已打开弹窗仍有草稿或搜索
Then 关闭旧弹窗且不提交旧草稿，恢复后不继承旧搜索

Given 已有搜索、页码和选中 ID 的选择器
When 更换 Provider
Then 新 Provider 不接收旧状态，清理后可正常查询并回显宿主重新提供的值
```

## 同范围补充

- parent：本轮作用域清理验收；source：Bohr 独立复核及新增迟到请求用例；
  reason：新 Provider 在清理 effect 执行前收到旧搜索条件，虽然迟到结果未
  覆盖新界面，仍不符合请求隔离要求。
- 在原组件范围增加同步查询门禁：本地搜索/分页/选中回显尚未完成作用域
  清理时，不向新 Provider 发请求。保持旧值失效策略，不改核心查询层或
  服务端授权协议。编排仍为 medium / managed，单写入与单复核。

## 当前证据

- 旧实现失败回放：13 项中 4 项失败、9 项通过，包含原有 7 项测试。
  Escape 和右上角关闭后残留已应用搜索和未执行的搜索文本；取消、确认回焦
  本身通过。首次测试因将 `Search...` 写成 `Search` 而失败，不计为产品缺陷。
- 在关闭修复后增加作用域测试，22 项中 2 项失败、20 项通过：新 Provider
  收到旧搜索条件；新 Provider 的 `getOne` 收到两次旧 ID `9`。门禁修复后
  上述两项通过。没有观察到迟到响应覆盖新界面，不能把请求错误描述为已确认
  的界面数据泄漏。
- 最终单文件回归：**23/23**，退出码 0，包含原有 7 项。执行目录
  `packages/ui`，命令如下；本轮未执行其他测试文件、全仓套件或包级类型检查：

  ```sh
  node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/relation-picker.test.svelte.ts
  ```

- 覆盖取消、Escape、右上角关闭、确认回焦、跨页草稿、防抖取消、租户/权限/
  禁用/Provider 作用域变化、无权限初始挂载、错误重试、旧请求迟到，以及
  Provider 与宿主值同时替换后的新值回显。固定旧 `value=[9]` 在权限恢复后
  仍保持失效，宿主提供新数组后恢复；未自动改变既有安全策略。
- Chromium：1440x900、390x844 两个视口，各自验证取消、Escape、关闭按钮、
  遮罩关闭、待执行搜索取消和单选提交，共 **12/12**。四个关闭路径均验证
  重新打开为空搜索、第一页和未勾选草稿，确认只提交一次，焦点回到入口；
  `pageErrors: []`。浏览器只使用隔离测试 Provider，不是生产授权验收。
- 浏览器脚本为 `output/playwright/relation-picker-dismissal-20261021/verify.js`；
  已查看 `dialog-1440.png` 与 `dialog-390.png`，主要控件和底部操作可见。
  初始页面有一个测试页未提供 favicon 的 404，不属于页面脚本异常。
  `svadmin-relation` 浏览器及 4202 端口临时服务已关闭。
- Bohr 对最终生产 diff 只读复核：无新增明确 P0/P1/P2 阻塞；确认新查询会在
  清理后恢复，宿主换值不会被门禁锁住。复核时为 22/22，随后仅增加了
  Provider 与值同时替换的通过测试，生产实现未再变化。其未独立运行浏览器。
- `git diff --check` 通过。没有更改公开 API、核心查询层、服务端授权策略、
  全局 Dialog 或视觉样式。
- 未执行跨浏览器、真实 Provider/权限服务、读屏认证、消费者发布构建、
  提交、发布或部署；本地结果不关闭完整关系选择器或整体企业级验收。
