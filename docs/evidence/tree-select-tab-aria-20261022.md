# TreeSelect 键盘入口与树语义

## 续接约定

- parent：`tree-select-keyboard-load-20261022.md`；source：用户继续完成企业级规范。
- goal：关闭树内重复 Tab 停靠点、搜索到树的键盘入口和递归子组归属缺口。
- scope：TreeSelect、同名单文件组件测试、现有企业消费者 fixture/spec 和证据。
- risk/orchestration：medium / managed，主线程单写入者，Hume 只读复核。
- non-goals：不改选择载荷、权限/Provider 协议、样式、标签清除结构；不发布部署。

## 验收与实现

1. Given 搜索框聚焦，When ArrowDown，Then 聚焦首个结果；输入法组合输入与
   带修饰键的输入不触发该导航。
2. Given 树项可见，When 方向键移动焦点，Then 仅当前项为 tabindex=0，
   其他项和内部展开/重试按钮为 -1；Tab/Shift+Tab 在搜索与活动项之间往返。
3. Given 活动项被过滤/替换或移出虚拟渲染窗口，Then 渲染项仍有一个 Tab 入口；
   250 项虚拟列表用 End/Home 跨窗口，DOM 节点数保持有界。
4. Given 递归父项展开，Then aria-owns 指向实际子 group；折叠后引用移除；
   虚拟化保留 level/posinset/setsize，不指向未渲染的 group。
5. Given 加载失败，When 在当前树项 Enter/Space，Then 重试原加载而非提交选择；
   错误描述关联当前项，成功后移除；重试按钮仍支持指针操作。

名称由宿主 ariaLabel/placeholder 和现有 i18n 词条提供，节点 ID 使用实例前缀
加类型化值的 UTF-16 编码，支持空格/非成对代理字符，不因前序插入而变化；
节点名称单独指定，避免拥有子组后把全部后代串入父项名称。
树容器显式 tabindex=-1，避免 Firefox 可滚动容器成为额外 Tab 停靠点。

## 验证记录

- `packages/ui`：`bun run test src/components/tree-select.test.svelte.ts`，76/76，退出 0。
  首次新增测试误写名称 Search，实际词条 Search...；只修正测试预期后通过。
- Chromium 八场景专项：8/8。
- 首次三引擎两视口重复矩阵：70 passed / 1 failed / 25 not run。
  Firefox End 到末项后 Shift+Tab 落到 tree 容器（DIV/role=tree/tabindex=null），
  不是搜索框。显式 tabindex=-1 后，同一 Firefox 场景重复三次 3/3。
- 最终完整浏览器矩阵：
  `bunx playwright test -c playwright.tree-select.config.ts --repeat-each=2 --max-failures=1`，
  132/132；Chromium/WebKit/Firefox × 1440x1000/390x844 × 十一场景 × 两次，无自动重试。
- `git diff --check` 通过。
- 临时虚拟 Tab 落点日志已移除，断言未放宽，没有中途手动补焦。

Hume 只读复核补充：失败重试进行中再次按键可能误入选择；指针操作内部按钮后
方向键不可达；遍历索引 ID 不稳定。已分别增加请求级 retrying 门禁（保留普通
展开中选择）、同步焦点交还所属树项、稳定类型化编码 ID。新增组件 4 项、
浏览器 1 项。Hume 最终只读复核未发现这组增量的新阻断问题，
但未独立运行这些测试。

随后补齐清空/删除回焦：初次仅调用 focus 在打开状态下被 FocusScope 拉回
搜索框（2 项组件失败）；显式关闭面板后回焦触发器，组件恢复 76/76。
新增两个真实浏览器场景：选择后 Escape、Tab 到删除/清空、Enter/Space 激活，
断言载荷为空、回调恰好一次增加、面板不重开、焦点回触发器。全矩阵为上方
132/132。先前 72/72、96/96、108/108 不重复累计。
该后续四行关闭/聚焦改动未再交由独立代理复核。

## 触发器操作结构与共享加载失效续接

### 触发器操作结构

- 原问题：多选标签删除和清空曾是触发器 `<button>` 内的
  `span[role="button"]`，造成嵌套交互控件、非原生键盘语义和表单结构风险。
- 实现：触发器改为无交互后代的原生按钮；可见标签、删除按钮和清空按钮
  使用独立展示层/原生 `button type="button"`，删除/清空仍关闭面板、只回调一次
  并将焦点交还触发器。叠层显式区分 trigger/action 的 `z-index`，避免点击命中
  底层打开按钮。
- 名称：非空 `ariaLabel` 保持宿主名称；空字符串回退到隐藏文本中的已选标签、
  placeholder 或既有词条，避免生成空 accessible name。
- 验收：组件新增 4 项，当前定向单文件 **94/94**；真实消费者新增鼠标删除/
  清空场景，三引擎两视口总矩阵 **72/72**。截图仅作为布局观察材料，不作为读屏
  认证；路径见 `test-results/tree-select-TreeSelect-poi-f03fe--or-clear-without-reopening-chromium-desktop/selection-control.png`。

### 共享加载失效

- parent：本文键盘与共享请求增量；source：用户“继续”。
- reason：共享展开请求加入级联选择后的交叉失效此前缺少直接回归。
- goal/scope：仅补齐 `tree-select.test.svelte.ts` 的请求失效与选择所有权测试，
  更新证据及路线图；本次不改 `TreeSelect.svelte`。
- risk/orchestration：low / managed，当前主线程单写入者，外部执行者 0；
  单文件确定性验证及当前增量检查，不把此前 Hume 复核算作本轮复核。
- non-goals：不扩展标签结构、焦点、onlyLeaf、真实 Provider、样式或发布范围。

验收场景：

1. Given 展开和级联选择共享一次加载，When 懒节点禁用再启用、同键 options
   替换或 loader 替换，Then 旧 busy 退休，新操作使用新请求。
2. Given 新请求尚未结束，When 旧请求先成功或失败，Then 不提交旧选择、
   不展示旧错误、不清掉新请求的 busy。
3. Given 新请求已成功，When 旧请求后成功或失败，Then 新子项、选择与展开
   状态不被覆盖，回调仍恰好一次；新旧顺序共计 3 × 2 × 2 = 12 项。
4. Given 展开请求仍在进行，When 父到子或子到父连续选择，Then 仍只加载
   一次，最终仅提交最后一次选择的范围，共 2 项。

2026-10-22 本轮执行：
`packages/ui` 中 `bun run test src/components/tree-select.test.svelte.ts`，
共享加载增量当时为 **90/90**，包含请求失效新增 14 项；
随后结构契约增加 4 项，单文件更新为 **94/94**。取代先前 76/76 的组件总数，
不重复累计。`git diff --check` 通过。
共享加载增量没有对应的浏览器交叉失效排列；此前 132/132 和随后结构增量
72/72 均不覆盖这些排列。此处只证明组件丢弃过期结果，
不证明底层网络取消、真实租户隔离或服务端授权。

## 验收边界

### `bind:options` 宿主传播补记（2026-10-23）

新增真实 Svelte 宿主 `tree-select-bind-options.test-host.svelte`：宿主使用
`bind:options`，TreeSelect 通过异步 `loadChildren` 加载子节点后，宿主
`output[data-testid="bound-options"]` 观察到包含 `children` 的新根数组。
`tree-select.test.svelte.ts` 当前定向回归为 **136/136 passed**，exit `0`，
`git diff --check` 通过。该结果证明公开绑定的本地消费者契约，不证明真实
Provider、服务端权限、屏幕阅读器或发布部署。

以上 DOM 属性及浏览器键盘证据不等于真实屏幕阅读器认证。
标签删除/清空的嵌套交互结构已有上方修复与回归证据。
完整 onlyLeaf 模式与消费者发布仍需继续完成；onlyLeaf 当前边界证据见
`tree-select-leaf-only-20261022.md`（祖先禁用后代、无 loader 的 hasChildren 父项）；
外部焦点续接证据见 `tree-select-outside-focus-20261022.md`。
共享加载失效组合已获得上述组件证据，尚无对应浏览器与真实 Provider 证据。
虚拟化专项只覆盖 250 项 End/Home/Tab，不声称任意大树或性能指标已验收。
