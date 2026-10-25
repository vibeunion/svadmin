# 数值入口区域/精度/非法输入契约复核

- parent: `enterprise-ui-plan.md` 批次二 NumberInput / MoneyInput / PercentInput
- source: 企业级验收 B2-01 原始缺口（区域小数/千分位、精度/舍入、输入法或粘贴
  非法值）；用户要求先读源码，仅在既有契约存在时补最小测试
- Delegation Decision: managed；pi 为唯一 writer，主线程只读审查，未修改生产
  组件，不提交、推送、发布或部署
- scope: `packages/ui/src/components/NumericInput.svelte` 及其三个公开包装、现有
  `numeric-input.test.svelte.ts` 与两份既有数值证据

## 源码现有契约（据 2026-10-23 源码）

统一实现在 `NumericInput.svelte`，`NumberInput`/`MoneyInput`/`PercentInput` 只是
固定 `mode` 的薄包装，未增加格式化或校验逻辑。

1. 解析：只接受 `Number(input.value)` 的有限值；非空且 `Number.isFinite` 为假时
   直接返回，不写值、不触发 `onchange`。空字符串单独映射为 `null`。
2. 精度：`precision` 截断取整并夹取到 `0..20`；仅用于展示
   `toFixed(precision)`，不回写、不舍入存储值。
3. 步进：`step` 缺省时由精度推导为 `10 ** -precision`；`scale="1"` 的百分比
   缺省步进为 `1`，显式 `step` 乘 100。
4. 边界：`min`/`max` 在存储值与展示边界上做夹取，`scale="1"` 的百分比边界
   乘 100。
5. 区域化：源码没有任何 locale、小数逗号、千分位分隔符或输入法组合事件的
   解析/格式化分支，`type="number"` 交由浏览器处理。

因此本轮只为 1–3 补测试；区域化格式没有可断言的产品契约，不做设计。

## 新增最小测试

`packages/ui/src/components/numeric-input.test.svelte.ts` 新增 3 个用例：

- 精度只影响展示并夹取到 `0..20`：`1.23456` + `precision=2` 展示 `1.23`，
  但 `onchange` 收到未舍入的 `1.23456`；`precision=-3` 展示 `1`；
  `precision=25` 按 20 位展示。
- 步进由精度与百分比缩放推导：`precision=2 -> step="0.01"`、
  `precision=0 -> step="1"`、`scale="1"` 百分比缺省 `step="1"`。
- 非法值被忽略（防御分支限定）：`1,234.5`、`1.234,5`、`1 234`、`12abc`、
  `1e999` 均不触发 `onchange`，随后合法 `19.5` 仍只回调一次。该用例只用
  happy-dom 未净化文本命中 `Number.isFinite` 防御分支，不代表真实粘贴、
  区域格式或输入法输入；也不证明控件在真实浏览器里保持原显示。

未重复父值回填、`null`/`0` 区分、金额原单位、百分比缩放等既有覆盖。

## 结果

- 定向测试：`packages/ui` 下
  `bunx vitest run src/components/numeric-input.test.svelte.ts`
  → **10/10 通过**（原 7 例 + 新增 3 例），退出码 0。
  主线程此前记录的 10/10、退出码 0、6.73s 是补强前命名版的独立结果；
  本轮只调整用例命名/注释与证据措辞，未新增或删除用例。
- `git diff --check` 通过。
- 工作区既有脏改动全部保留，未执行格式化、提交、推送或部署。

## 边界与结论

- 本轮验证的是组件自身防御分支。测试使用 happy-dom，它不会像真实浏览器那样
  对 `type="number"` 做取值净化；真实 Chromium/WebKit/Firefox **可能**会把
  `1,5`、`1 234` 之类输入净化为空串，从而落入 `null` 分支而非“忽略”分支。
  该真实浏览器行为本轮未验证，不能用 happy-dom 结果替代。两种路径都**可能**
  不写入错误数字，但表现不同，故不把区域小数/千分位列为已支持能力，也不
  宣称控件保持原显示。
- 输入法组合输入无源码契约：`type="number"` 不派发可用组合事件，本轮不新增
  用例，也不宣称 IME 安全。
- 精度契约是"展示舍入、存储原值"。若产品需要按精度写回或银行家舍入，属新
  API 设计，需单独需求确认。
- 未覆盖真实表单 Provider、读屏软件、发布包与生产部署。