# Cascader 异步子级加载契约

## 续接契约

- parent: `cascader-leaf-boundary-20261022.md`；source: 用户继续企业级 UI 规范目标。
- reason: 当前 `CascaderOption` 只有 `isLeaf`，没有“声明为分支但子级尚未加载”
  的边界；只要节点没有 `children` 就会被当成叶子立即提交，异步场景会写回
  不完整路径，且失败、重试、加载中禁用和键盘进入子列均无契约。
- follow-up: 主线程审查指出加载请求/错误不能以 `node.value` 为身份；Cascader
  允许不同父级下出现同值节点，并且同一异步分支在请求期间重复激活可能重复提交。
- goal: 补齐最小异步子级加载协议；请求、错误、loading 和写入都按完整路径隔离，
  同一在途分支只提交一次。
- scope: `Cascader.svelte`、`cascader.test.svelte.ts`、本文。
  未改全局样式、依赖、其他组件、fixture/spec、i18n 词条或发布流程。
- risk/orchestration: medium / managed；pi 唯一写入者，主线程只读审查。
- non-goals: 不新增搜索框、取消令牌、真实 Provider、跨浏览器矩阵或读屏认证；
  不把旧证据当成本轮通过。

## 验收场景

```gherkin
Given 节点声明 hasChildren 但尚无 children
When 用户点击或按右方向键
Then 不提交路径；有加载器时显示加载中，无加载器时显示不可展开错误

Given 不同父级下存在相同 value 的节点
When 两条异步分支同时或先后加载
Then 请求、loading、错误和子级写回互不覆盖，各自按完整路径隔离

Given 异步加载失败
When 用户查看子列
Then 显示加载失败且不写入受控值；有加载器时提供重试按钮

Given 加载失败后点击重试
When 加载成功
Then 子列出现、焦点回到该列第一个可用子项，且仍不自动提交；
     用户显式选择后才提交完整路径

Given 同一异步分支仍在请求中
When 用户重复点击、Enter（原生按钮触发 click）或右方向键激活
Then 仍只产生一次 onchange，不重复提交

Given 请求尚未完成时组件变为 disabled 或宿主替换 options/loader
When 旧请求返回
Then 不写入子级、不提交值；重新启用后需要新的请求；
     宿主替换 options 时旧响应同样失效，即使新旧树值相同
```

## 实现要点

- `CascaderOption` 增加可选 `hasChildren`，仅显式 `false`/`isLeaf` 表示叶节点；
  未加载分支不再被当成叶子提交。
- 新增 `loadChildren(node)`；加载结果只写回当前仍有效的请求。归属校验覆盖
  mounted、disabled、loader 身份、树版本、完整路径仍可解析和祖先禁用。
- 请求、loading、错误和子级写回统一使用 `JSON.stringify(fullPath)` 作为稳定
  路径身份；`updateChildrenAtPath` 只更新完整路径命中的节点，避免同值兄弟分支
  被一起写入。空子列也按父级完整路径读取 loading/error。
- 缓存只保存实际加载结果：`loadedChildren` 按完整路径记录
  `{ node, children }`，不再克隆整棵树或复用祖先快照。`effectiveOptions` 每次
  从宿主实时 `options` 递归叠加仍有效的加载条目；条目只在路径节点对象未变、
  宿主尚未补齐 `children`、且节点未变成 `isLeaf` 时生效。宿主原地修改祖先
  `disabled` 会立即反映到已显示后代，补齐/替换 `children` 或改为叶子会立即
  采用宿主结构；不同路径的条目相互独立。组件不改写宿主 options，也不附加
  Symbol/属性。宿主任何 options 替换都会推进树版本并清空缓存。
- `loads` 改为响应式 `SvelteMap`，使在途请求加入后，清理 effect 能订阅其完整
  路径上的实时 `disabled`/结构；请求在 `disabled true` 时被粘性删除，之后即使
  宿主改回 `false`，旧响应也不能复活或重新写入缓存。
- 请求归属同时校验路径节点对象身份、`children` 是否已由宿主补齐、是否已变成
  `isLeaf`，并在 effect 清理时对 path/祖先 `disabled` 做粘性失效；加载完成时
  不只看当前 disabled，避免 true→false 后旧响应复活。
- 提交前校验受控值是否已等于目标完整路径；同一在途分支被重复点击/键盘激活时
  复用同一 Promise，最终只产生一次 onchange。
- 加载中显示 `common.loading`，失败显示 `tree.loadFailed`；有加载器时显示
  `common.retry`，均为已有 i18n 词条。重试成功后聚焦该列第一个可用子项。
- 点击与右方向键共用激活路径；`changeOnSelect` 在加载成功后才允许提交分支，
  失败/禁用/过期请求不会部分提交。
- `hasChildren` 改为普通布尔判定，不再声明 `children` 一定存在；懒加载分支允许
  `children` 未定义，列计算显式处理空子列。
- 延迟焦点恢复带 `focusSeq` 意图版本：`retryColumn` 与 `ArrowRight` 在
  await/tick 后必须仍属于原操作，且 retry 还需完整父路径未变；用户切换分支、
  聚焦同级按钮、关闭再重开都会使旧恢复失效。组件自身恢复焦点时用
  `restoringFocus` 避免误记为用户意图。

## 红绿记录

- 上一轮基线：`cascader.test.svelte.ts` 18/18 通过；异步加载首版补齐后 23/23。
- 本轮先新增 6 条回归，再临时还原旧实现运行：
  **3 failed / 26 passed**。失败项为完整路径隔离、错误按路径保留、在途分支
  重复激活只提交一次；焦点恢复、options 迟到响应、loader 迟到响应三条用于
  防止修复回退。
- 修复后同文件：**29/29 通过**，退出码 0；原 23 条契约未削弱。

### 主线程阻断项修复轮

- 基线：29/29 通过。
- 先新增 8 条回归（不改旧断言），在旧实现上运行：
  **8 failed / 29 passed**。失败项：
  1. 内部写回标记导致后续宿主同值整树替换不推进 epoch（期望新请求 3 次，实际 2 次）。
  2. 宿主替换期间 disabled 先 true 后 false 后旧响应仍提交。
  3. 宿主在途补齐 `children` 后旧响应覆盖。
  4. 路径节点对象被原地替换后旧响应写入。
  5. 路径节点在途变成 `isLeaf` 后旧响应仍提交。
  6. retry 期间切换到其他分支后旧完成抢焦点。
  7. ArrowRight 期间用户聚焦同级按钮后旧完成抢焦点。
  8. 关闭再重开后 ArrowRight 旧完成抢焦点。
- 修复后同文件：**37/37 通过**，退出码 0；原 29 条契约未削弱。

### 宿主原地响应式缓存修复轮

- 基线：37/37 通过。
- 主线程指出 `internalTree` 克隆加载路径祖先，宿主随后在 `$state options`
  原地禁用/改叶子/补齐 children 时，`effectiveOptions` 仍可能读取旧快照。
- 先新增 5 条使用 `$state` + `act` 的响应式回归（4 个场景，其中在途 sibling
  失效按 self/ancestor 参数化），在旧实现上运行：**5 failed / 37 passed**。
  失败项：
  1. 加载成功后宿主原地禁用祖先，已显示后代按钮未禁用且仍可点击/键盘激活。
  2. 宿主原地把已加载分支改成 `isLeaf` 后，旧后代列未删除。
  3. 宿主原地补齐/替换 `children` 后，仍显示旧加载缓存而不是宿主数据。
  4. 另一分支在途时宿主将其 `disabled` 原地 true→false，旧响应仍复活。
  5. 同一场景禁用其共同祖先，旧响应仍复活。
- 修复后同文件：**42/42 通过**，退出码 0；原 37 条契约未削弱。

```sh
cd packages/ui
npx vitest run --config vitest.config.ts src/components/cascader.test.svelte.ts
```

- 另执行 `git diff --check` 通过。
- 本轮只运行上述单文件测试和差异检查；未运行全仓测试、build、deploy 或
  Playwright fixture/spec。

## 仍未验证边界

- 未扩展 `CascaderFixture.svelte` / `cascader.spec.ts`，未运行浏览器、跨浏览器
  或真实网络/Provider。
- 未验证真实读屏、完整 Tab/指针矩阵、请求取消/超时，以及受控值直接指向未加载
  分支时的自动预加载；当前只在用户激活或重试时加载。
- 本轮已用 `$state` + `act` 覆盖宿主对同一 options 数组的深层原地修改
  （祖先 `disabled`、`isLeaf`、补齐/替换 `children`、在途节点 或共同祖先
  `disabled` true→false）。若宿主使用普通非响应式对象直接 mutation，Svelte
  仍不会通知组件；该场景需要宿主状态框架或浏览器验证。
- 未单独运行 typecheck；`hasChildren` 的谓词移除与列计算已由本文件测试执行路径
  覆盖，类型面仍需后续全仓检查确认。
- 搜索不在当前 Cascader 契约内，本轮未新增搜索语义。

## 真实源码消费者浏览器续接（2026-10-22）

- parent/source/reason：续接本文组件契约 / 用户继续企业级 UI 原目标 /
  补齐异步真实源码消费者浏览器证据，不改生产组件。
- 范围：仅 `CascaderFixture.svelte`、`cascader.spec.ts`、本文和
  `enterprise-ui-plan.md` 的追加记录。复用既有
  `playwright.cascader.config.ts` 三引擎两视口配置，未跑全仓。
- fixture：保留原静态两场景；`?view=cascader&async=true` 切换异步模式。
  异步树只通过公开 `hasChildren` 声明未加载分支，通过公开 `loadChildren`
  返回由宿主逐次持有的 Promise。宿主按钮用 `dispatchEvent('click')` 控制
  resolve/reject 和祖先原地 `disabled` true→false，避免把面板外点击关闭行为
  混入加载协议；组件激活、列间导航、Retry 与显式提交均使用真实 click 或
  keyboard。输出 `cascader-changes`、`cascader-value` 精确 JSON 载荷和
  `cascader-load-calls` 调用计数。

### 新增浏览器场景

1. 键盘 Right 加载与共享请求：打开后聚焦 `Async parent`，连续两次 Right
   只产生 1 次 `loadChildren`，回调计数与受控值保持 `0` / `null`，期间显示
   加载状态；宿主 resolve 后首个已加载子项获得真实焦点，再按 Enter 才提交
   `["async-parent","loaded-1"]`，回调恰好 1 次。
2. 失败提示与键盘 Retry：reject 后只显示通用
   `Failed to load child nodes`，不包含 `PRIVATE_CASCADER_LOAD`；不提交值。
   用真实 Tab 进入 Retry 并按 Enter 发起第 2 次请求，成功后回调仍为 0，
   继续用 Right + Enter 才提交 `["async-parent","loaded-2"]`。
3. 原地禁用作废旧响应：请求 1 在途时宿主把祖先 `disabled` 原地设为 true
   再设回 false；重新启用本身不自动加载，真实 click 父项后才产生请求 2。
   先 resolve 请求 2 显示 `Loaded second`，再 resolve 旧请求 1，旧
   `Loaded first` 始终不出现且不覆盖新结果；回调计数仍为 0、受控值仍为 null。

### 精确命令与结果

```sh
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.cascader.config.ts --max-failures=1
```

- Playwright 汇总：**36 passed**，退出码 0；其中 6 项是带 `test.fail` 标记的
  已知缺陷预期失败，上述 5 个场景（原静态 2 + 新增异步 3）在
  Chromium/WebKit/Firefox × 1440px/390px 的**必需 30/30 真实通过**。
- `git diff --check` 通过，退出码 0。
- 本轮未运行组件单测、全仓测试、typecheck、build、deploy 或真实网络服务。

### 发现的组件缺陷（未改生产组件）

- 键盘把焦点放在 Retry 按钮后按 Enter，加载态会替换当前聚焦的 Retry 按钮，
  面板内 `focusin` 使 `retryColumn` 的焦点意图失效；加载成功后焦点实际回到
  `Async parent`，而不是组件契约所述的首个已加载子项。实测三引擎两视口均可
  复现，故保留独立 `test.fail` 回归；生产组件修复后该用例会变为 unexpected
  pass，必须移除标记并转正。上面的场景 2 只对必需语义断言：
  Retry 成功不自动提交，随后由用户显式导航和 Enter 提交。

### 仍未覆盖边界

- 未验证真实读屏、完整 Tab/指针矩阵、Escape/外部点击与在途请求的组合。
- 未实现或验证请求取消、超时、真实 Provider/网络、分发包和发布部署。
- 该轮记录时 Retry 按钮成功后的焦点缺口尚未修复，只报告并保留预期失败回归；
  后续修复证据见文末“键盘 Retry 焦点归属修复”一节。
- 未验证受控值直接指向未加载分支时的自动预加载、搜索或并发大量分支。

## 键盘 Retry 焦点归属修复（2026-10-22 续接）

- parent/source/reason：续接本文“发现的组件缺陷”/用户要求修复浏览器真实缺陷/
  三引擎两视口均复现 Retry 成功后焦点回到父项，需在保持用户切换分支或关闭
  重开时旧操作不抢焦点的前提下修复。
- scope：仅 `Cascader.svelte`、`cascader.test.svelte.ts`、`cascader.spec.ts`
  和本文；`enterprise-ui-plan.md` 只追加记录。未改 fixture、样式、依赖、i18n、
  其他组件或发布流程。
- risk/orchestration：medium / native；单一写入者，确定性单元测试与浏览器
  矩阵作为验证证据。
- non-goals：不新增请求取消/超时、搜索、真实 Provider、读屏认证或全仓验证；
  不自动提交值，不改变既有公开 API。

### 失败回归与修复

- 先新增组件回归 `keeps retry focus intent when the loading state replaces the
  focused Retry button`：先聚焦 Retry，再触发 click（原生按钮 Enter 激活路径），
  用延迟 Promise 保持加载态，断言加载态替换聚焦按钮后，重试成功仍聚焦首个
  可用子项。修复前运行：**1 failed / 42 passed（43 条）**；失败断言为
  `document.activeElement` 仍是父项 `Region`，而不是 `Child`。
- 修复后同文件：**43/43 通过**，退出码 0；原 42 条契约未削弱，继续覆盖
  用户切换分支、聚焦同级项、关闭重开时旧延迟焦点不抢占。
- 最小修复：`retryColumn` 在启动时记录仍是当前焦点的 Retry 锚点；
  `handlePanelFocusIn` 仅在锚点已因加载态替换而断开时忽略一次布局内
  `focusin`，请求结束后清除该状态。用户真实切换分支仍由
  `handleSelectOption`/键盘导航推进焦点意图；打开/关闭 effect 仍开启新意图。
  提交路径未改，重试成功不会写入受控值。

### 浏览器转正

- `cascader.spec.ts` 中原独立 `test.fail` 已改为正常 `test`，断言未降低：
  Retry 成功后 `Loaded second` 必须获得真实焦点。
- Playwright 三引擎（Chromium/WebKit/Firefox）× 两视口（1440px/390px）：
  **36 passed**，退出码 0。此前为“必需 30/30 真实通过 + 6 个
  `test.fail` 预期失败”，本轮 6 个原预期失败全部真实通过，故 36/36 均为
  正常通过；键盘 Retry 焦点用例单场景 6/6 通过。

```sh
cd packages/ui
npx vitest run --config vitest.config.ts src/components/cascader.test.svelte.ts

cd ../../scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.cascader.config.ts --max-failures=1

cd ../..
git diff --check
```

- `git diff --check` 通过，退出码 0。
- 本轮未运行全仓测试、typecheck、build、deploy 或真实网络服务。

### 本轮仍未验证边界

- 未验证真实读屏、完整 Tab/指针矩阵、Escape/外部点击与在途请求组合。
- 未实现或验证请求取消、超时、真实 Provider/网络、分发包和发布部署。
- 未验证受控值直接指向未加载分支时的自动预加载、搜索或大量并发分支。
- 修复只针对“聚焦 Retry 后由加载态替换触发的一次布局内焦点迁移”；若用户
  在加载中通过非 click/键盘路径移动焦点，其与旧重试完成的竞态仍需浏览器矩阵
  继续扩展验证。
