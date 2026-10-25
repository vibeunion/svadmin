# RelationPicker 真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二实体与关系选择器
- source: 用户继续完善企业级规范；reason: RelationPicker 搜索模式已有
  Chromium/WebKit 场景，补齐统一源码消费者和 Firefox 回归
- scope: `scripts/fixtures/enterprise-ui/?view=relation`、本地 DataProvider stub、
  Dialog 搜索/分页/取消/作用域变化、Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: medium / managed；主线程单写入并执行确定性验证，未修改
  生产组件，不提交、推送、发布或部署。

## 验收约定

Given 多选 Dialog 中存在草稿，When 搜索、加载第二页后取消，Then 不触发
`onchange`，重开时搜索、分页和勾选草稿均清理。

Given Dialog 打开时宿主替换 tenant/provider 作用域，Then 组件自动关闭并丢弃
未提交草稿，不产生错误或伪造提交。

## 结果

- 组件定向测试：`packages/ui/src/components/relation-picker.test.svelte.ts`
  **26/26**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.relation-picker.config.ts --max-failures=1
  ```

- 浏览器结果：**6/6**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 覆盖真实 Dialog、Row 1 草稿、搜索、Load more、Cancel、重开清理、外部
  Provider/tenant 作用域切换、无提交回调和窄屏无横向溢出。
- 作用域切换通过宿主按钮事件派发模拟外部状态变化；因 Dialog 遮罩存在，未把
  被遮挡按钮的鼠标点击伪装成用户路径。
- `git diff --check` 通过。

## 边界

- 使用本地 DataProvider stub，不证明真实授权、租户服务、分页一致性、查询取消、
  并发冲突、屏幕阅读器、发布包或生产部署。
- DOM/Dialog/键盘自动化不等同于读屏软件认证。
