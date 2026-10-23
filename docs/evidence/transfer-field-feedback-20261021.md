# Transfer 字段反馈续接

## 任务约定

- parent：`array-field-feedback-20261021.md`；source：继续完成既有 FormField 规范。
- reason：Transfer 只有视觉面板标题，没有字段级 group、说明/错误描述和
  全选控件的可访问名称；FieldRenderer 也未透传这些属性。
- goal：Transfer 接收实例 ID、标签关联、描述、无效和禁用语义；FieldRenderer
  透传并保持双列表移动、搜索和受控值协议；补禁用选择守卫及行/复选框事件隔离。
- 非目标：改变移动算法、分页/虚拟化、权限、原生提交、跨浏览器和读屏软件验收。
- medium / managed；当前线程唯一 writer，Bohr 唯一只读 verifier。
- 不提交、推送、发布或部署；无 agmesh 命令，本文记录续接。

## 验收

```gherkin
Given 两个相同业务键的 Transfer 字段
When 读取字段组和说明/错误描述
Then 各自 group 只引用本实例标签和描述

Given Transfer 禁用或校验错误
When 用户读取状态或操作全选
Then group 暴露禁用/无效状态，全选按钮有面板名称且操作协议不变

Given 用户搜索并移动项目
When 反馈属性动态更新
Then 搜索结果、已选项和 onchange 参数保持原语义
```

## 状态

- 定向命令（在 `packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/transfer-field-feedback.test.svelte.ts`。
- 首轮 0/3 暴露测试查询与实际一/三参数回调契约不一致；修正测试并补禁用选择守卫后
  8/8，补键盘 Space、禁用项全选状态后 12/12。按复核建议仅拦截 Enter/Space，
  增加宿主 Escape 冒泡回归后最终 **13/13**。
- 覆盖同页实例 group/说明/错误隔离、搜索与移动、三参数组件回调、
  FieldRenderer 一参数回调、禁用/单项禁用、事件冒泡隔离、全选状态和键盘选择。
- 续接回归左右两侧受控 `dataSource`/`targetKeys` 变化：已删除、禁用或移到
  另一侧的旧选中不会复活；当前侧仍存在且未禁用的选择在搜索隐藏和反馈更新
  后保留。旧实现该组回归 8 例失败，修复后定向测试 **23/23**。
- Bohr 只读复核未发现明确 P0/P1/P2；确认既有组件与字段层回调契约未改变。
- `git diff --check` 通过。本轮仅完成本地 DOM/事件契约；权限、原生提交、
  跨浏览器、真实读屏和关系选择器验收未完成。

## 选中集合续接契约

- parent/source: 本文字段反馈任务 / 用户继续完善请求。
- reason: 受控数据变化后旧选中仍参与计数和按钮可用状态，恢复记录会复活勾选。
- scope: Transfer 内部选中集合、同一测试文件、本文与路线图；
  medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不改变搜索开关、全部移动语义、宿主受控值或回调协议。
- Given 选中记录被删除、禁用或移到另一侧，When 宿主更新并恢复数据，
  Then 失效勾选不复活，其他有效勾选保留，不自动通知 onchange。
- Given 仅有一个选中项，When 该项消失，
  Then 选中计数清零、移动所选按钮禁用。
- Given 有效选中项被搜索隐藏，When 更新反馈或替换等价数据，
  Then 保留勾选，移动时只通知一次且参数不变。
- Bohr 对该增量只读复核无明确 P0/P1/P2；23/23 为主线程运行结果。
  本次未直接测试宿主 `$state` 原位修改 `item.disabled` 或
  `targetKeys.splice()`，也未补充真实浏览器验收。

## 搜索生命周期续接

- parent/source: 上述选中集合续接 / 用户继续完成企业级规范请求。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- reason: `searchable` 关闭后旧关键词仍作用于列表，重新开启时用户无法确认或
  清除隐藏条件；两侧搜索输入也缺少可区分的公开名称。
- scope: 仅清理 `searchable` 开关变化时的左右搜索文本，并为输入补充对应面板
  的 `aria-label`；不清理选中集合、不改变受控值和移动回调。
- Given 用户已输入任一侧搜索词并选中记录，When 关闭再恢复搜索，
  Then 两侧搜索词清空、记录恢复显示、原选中保留且移动仍只触发一次。
- 定向测试：`26/26`；Bohr 只读复核无 P0/P1/P2。
- 故障回放：保留输入命名、仅移除搜索清理 effect 后，使用
  `bunx vitest run src/components/transfer-field-feedback.test.svelte.ts -t 'search is disabled'`
  得到 3 失败 / 23 跳过，均因隐藏过滤未清理；恢复后完整单文件再次 26/26。
- 本地真实浏览器矩阵：Chromium、WebKit × 左右侧 × 1440/390，共 `8/8`；
  Space 选择、搜索隐藏/恢复、单次移动和横向溢出断言通过，`pageErrors: []`。
  运行脚本与截图位于
  `output/playwright/transfer-selection-20261022/verify.cjs`。
- 复现时在仓库根目录运行
  `bunx vite --config output/playwright/transfer-selection-20261022/vite.config.ts`，
  再运行 `node output/playwright/transfer-selection-20261022/verify.cjs`。
  WebKit 使用 `BROWSER=webkit` 和匹配本机浏览器的 `PLAYWRIGHT_MODULE`；
  没有更改仓库依赖。临时服务与 CLI 浏览器会话均已关闭。
- 截图人工查看 Chromium 390 与 WebKit 1440；其他截图由脚本生成但未逐张人工
  检查。截图是搜索恢复后的移动前状态；移动后受控值与回调由脚本断言。
  早期手动截图 `transfer-chromium-1440.png` 实为热更新后的 1280 初始状态，
  不计入矩阵证据；有效文件名为 `{chromium,webkit}-{left,right}-{1440,390}.png`。
  Firefox、真实 Provider、读屏软件和发布验收仍未完成。
