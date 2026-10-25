# Combobox 真实消费者跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二异步 Select / MultiSelect / AutoComplete
- source: 用户继续完善企业级规范；reason: Combobox 已完成键盘和 DOM 关联单测，
  补齐真实源码消费者与跨浏览器基本路径
- scope: `scripts/fixtures/enterprise-ui/?view=combobox`、本地 DataProvider stub、
  Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: low / managed；主线程单写入并执行确定性验证，未修改生产
  组件，不提交、推送、发布或部署。

## 结果

- 组件定向测试：`packages/ui/src/components/combobox-field.test.svelte.ts`
  **33/33**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.combobox.config.ts --max-failures=1
  ```

- 浏览器结果：**6/6**，退出码 0。
- 覆盖矩阵：Chromium、WebKit、Firefox × 1440px 桌面、390px 窄屏。
- 覆盖双实例 Enter/Space 打开、真实 listbox ID 关联、role=combobox 搜索输入、
  选项选择、单次回调、Escape 回焦、实例间 ID 不重复和窄屏无横向溢出。
- 首次失败是测试错误地依赖不存在的 `placeholder` 属性；改用稳定语义
  `role="combobox"` 后重跑 6/6 通过，未修改组件实现。
- `git diff --check` 通过。

## 边界

- 使用本地 DataProvider stub，不证明真实分页、搜索取消、权限/租户隔离、服务端
  查询一致性、屏幕阅读器或发布部署。
- DOM role 与键盘自动化不等同于屏幕阅读器认证。
