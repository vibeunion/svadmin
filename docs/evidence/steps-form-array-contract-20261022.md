# StepsForm 数组草稿契约

## 任务边界

- Parent：AutoForm 数组契约与表单引擎统一。
- Source：用户要求继续；Reason：StepsForm 仍将数组内部 Symbol 直接交给 Core。
- Medium / managed：主线程唯一 writer，一名只读 verifier。
- 仅修改 StepsForm 及其消费者测试；不修改 Core 的纯数据规则，不新增 reset API。

## 验收场景

1. Given 已就绪的数组步骤，When 新增行并逐字符输入，Then 保持同一输入节点和焦点。
2. Given 已编辑的数组，When 前进到确认步骤再返回并提交，Then 保留草稿且提交精确业务载荷。
3. Given 未提交的数组草稿，When 替换 tenant 或 provider，Then 旧行退役，新操作只提交当前草稿。

## 实现

StepsForm 写入前复用 `withoutArrayFieldMetadata`，仅移除 ArrayField 的两个已知内部标记。
UI 原值仅在 Core 权威快照与 scope 仍匹配时回显；新快照或 scope 使缓存失效。
步骤切换原有重挂载行为保持不变，不声称跨步骤保留 DOM 节点。

## 本地证据

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/steps-contract.test.svelte.ts
```

- 修复前新增场景在 Add 时复现 `HttpError: Invalid form draft`。
- 修复后新增 3 项通过。
- 最终单文件 70/70，通过局部严格类型检查，退出码 0。
- 目标代码 `git diff --check` 通过。
- 环境仍提示 svelte2tsx 缺失 source map；不影响本次测试退出状态。

## 浏览器续接

Follow-up contract：parent 为上述数组契约；source 为用户继续；reason 为缺少真实
浏览器消费者证据。Medium / managed，主线程唯一 writer，复用一名只读 verifier。
范围仅 enterprise-ui fixture、StepsForm 专属配置、浏览器用例和本证据。

新增 `StepsFormAccessibilityFixture.svelte`，使用源码 StepsForm、真实 QueryClient、
资源契约与动态 context，不使用 key 重挂载表单来模拟 provider/tenant 切换。

从 `scripts/fixtures/enterprise-ui` 执行：

```sh
bunx playwright test --config=./playwright.steps-form.config.ts
```

Chromium / WebKit / Firefox 各桌面 1440×1000、窄屏 390×844，共 48/48 通过，退出码 0：

| 场景 | 组合数 |
| --- | ---: |
| create 数组连续键盘输入、元素句柄仍连接、焦点、跨步骤返回、精确提交 | 6 |
| create 未提交草稿后 provider/tenant 切换，旧节点断开、新 provider 精确提交 | 12 |
| edit 旧读取延迟成功/失败，provider/tenant 替换后新草稿不被覆盖 | 24 |
| dirty edit refetch 完成后原节点及本地草稿保留，继续键盘输入并提交 | 6 |

迟到测试先等待新记录与第二次读取，再修改新草稿，最后释放或拒绝旧请求。
`settled-reads` 来自 provider 的 finally，只证明旧 provider 调用结算；
不单独宣称 QueryClient 全部内部处理完成。dirty refetch 的完成计数则在
`await queryClient.refetchQueries()` 后递增。所有场景检查浏览器 pageerror。

初次 grep 使用起始锚点导致未发现用例，修正后 list 明确为 48 项。
随后 create fixture 错误传入 ID，Core 正确拒绝；该批 2 项失败、1 项中断、
45 项未执行，未计为通过。改为仅 edit 传 ID 后 Chromium desktop 8/8，
再完成上述三引擎 48/48。

只读复核确认生产修复无 P0-P2 阻断；浏览器复核要求修正 create ID 与首个
提交场景的成功完成断言。ID 已修正；首场景补等待成功导航后单独复验
`--grep 'StepsForm keeps array identity'` 为 6/6，退出码 0，不计新增场景。
最新 diff 经只读 verifier 复核无 P0/P1/P2 阻断。

## 未覆盖边界

步骤跳转原有 DOM 重挂载保留，不声明跨步骤保持同一输入节点。
真实读屏、完整 Tab 顺序、复合首错聚焦、多实例错误 ID、消费者发布及部署仍未由
本轮补齐；不声明整个表单引擎统一完成。

后续首错聚焦、多实例错误 ID 与相关浏览器验收已在
`steps-form-error-focus-20261022.md` 续接；其中组件 84/84、浏览器 60/60
包含本文件此前覆盖，不应将两轮计数相加。
