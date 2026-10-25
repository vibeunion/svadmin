# 数值公开入口真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二 NumberInput / MoneyInput / PercentInput
- source: 用户继续完善企业级规范；reason: 数值包装已有绑定单测，补齐统一源码
  消费者和三引擎浏览器回归
- scope: `scripts/fixtures/enterprise-ui/?view=numeric`、三个公开包装、
  Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: low / managed；主线程单写入并执行确定性验证，未修改生产
  组件，不提交、推送、发布或部署。

## 验收约定

Given Number/Money/Percent 已绑定父值，When 用户输入、清空和输入零，Then
父值分别保持数字、`null` 和 `0` 的区别，`onchange` 每次输入只触发一次。

Given 父组件外部设置或清空值，When 控件重新渲染，Then 展示跟随父值变化且不
伪造用户输入回调；金额不改变存储单位，百分比按 `scale="1"` 展示百分比值。

## 结果

- 组件定向测试：`packages/ui/src/components/numeric-input.test.svelte.ts`
  **7/7**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.numeric.config.ts --max-failures=1
  ```

- 浏览器结果：**12/12**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 覆盖 Number/Money/Percent 的真实 `spinbutton` 标签、键盘输入、清空/零值、
  金额 `19.5`、百分比 `25 -> 0.25`、父值 `0/12.5/0.6` 回填与全部清空。
- 窄屏检查文档无横向溢出；`git diff --check` 通过。

## 边界

- 仅验证本地源码消费者和控件绑定，不证明区域化数字解析、精度策略、真实表单
  Provider、读屏软件、发布包或生产部署。
