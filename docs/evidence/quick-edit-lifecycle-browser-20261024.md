# QuickEditDrawer 提交生命周期浏览器证据（2026-10-24）

## 范围

真实挂载 `AutoTable → QuickEditDrawer → AutoForm`，不使用测试 harness。
宿主只控制记录 ID、强制卸载和 deferred `DataProvider.update` 结算，
不读取或写入抽屉私有状态；未修改生产源码。

## 主线程独立结果

```text
npx playwright test --config scripts/fixtures/enterprise-ui/playwright.quick-edit-lifecycle.config.ts --reporter=list
18/18 passed
exit 0
29.5s
Chromium/WebKit/Firefox × desktop/narrow，workers=1
```

pi 自测同一配置为 18/18、exit 0；两次独立记录，不合并。
每个场景断言 pageerror 为空；窄屏断言页面无横向溢出和抽屉边界；
截图使用 `animations: 'disabled'`。

## 场景

1. `update` pending 时，Close、Escape、overlay、Cancel 均保持抽屉打开，
   草稿保留，`update` 仍只有 1 次；deferred resolve 后只关闭一次并写入精确变量。
2. 宿主强制关闭记录 1 并打开记录 2，旧 update resolve 不污染新抽屉草稿、
   错误或宿主打开状态。
3. 同一替换流程下旧 update reject 不污染新抽屉，不显示旧错误，也不泄露私有诊断。

## 边界

- 窄屏 Drawer 铺满视口，没有可达的面板外指针区域；该项使用同一真实 overlay
  handler 的 DOM click dispatch，不能宣称窄屏真实指针命中遮罩。
- 宿主强制关闭属于测试控制面的卸载，不是用户关闭按钮；普通关闭 pending 路径
  单独由场景 1 覆盖。
- Provider 为受控本地实现，不证明真实后端取消、回滚、幂等、RBAC、租户隔离、
  读屏、发布包或部署。
