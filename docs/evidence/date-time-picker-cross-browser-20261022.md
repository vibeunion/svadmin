# 日期与时间公开入口跨浏览器证据

- parent: `enterprise-ui-plan.md` 批次二 DatePicker / TimePicker /
  DateTimePicker / DateRangePicker
- source: 用户继续完善企业级规范；reason: 已有公共入口绑定和 Chromium 走查，
  补齐真实源码消费者三引擎回归
- scope: `scripts/fixtures/enterprise-ui/?view=date-time`、`instant=1`、
  Chromium/WebKit/Firefox、1440px/390px
- Delegation Decision: low / managed；主线程单写入并执行确定性验证，未修改生产
  组件，不提交、推送、发布或部署。

## 结果

- 组件定向测试：`packages/ui/src/components/date-time-picker-binding.test.svelte.ts`
  **4/4**。
- 浏览器命令：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.date-time.config.ts --max-failures=1
  ```

- 浏览器结果：**12/12**，退出码 0。
- 覆盖矩阵：civil/instant 两种模式 × Chromium、WebKit、Firefox × 1440px 桌面、
  390px 窄屏。
- 覆盖 Date、Time、DateTime、DateRange 的真实标签、父值回填、父级清空、范围
  `start/end` 保持，以及窄屏无横向溢出。
- `git diff --check` 通过。

## 边界

- 仅验证公开入口的本地源码消费者，不证明完整日历面板、禁用日期、DST/时区
  全部边界、真实 Provider、读屏软件、发布包或生产部署。
