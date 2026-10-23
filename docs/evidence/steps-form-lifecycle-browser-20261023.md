# StepsForm 提交生命周期浏览器证据（2026-10-23）

## 范围

真实挂载 `packages/ui/src/components/StepsForm.svelte`，由 enterprise fixture
提供受控本地 DataProvider、导航记录和可结算 deferred 写入。未修改 StepsForm
生产源码；仅新增浏览器消费者 fixture、spec、专属配置和 App 路由。

## 主线程独立结果

```text
bunx playwright test --config=scripts/fixtures/enterprise-ui/playwright.steps-form-lifecycle.config.ts
36/36 passed
exit 0
duration 56.8s
Chromium/WebKit/Firefox × desktop/narrow，workers=1
```

pi 自测同一配置为 36/36、exit 0、约 56.6s；两次独立记录，不合并。
所有场景断言 pageerror 为空，narrow 视口断言无页面横向溢出；截图使用
`animations: 'disabled'`，并等待有限动画及 opacity 稳定。

## 场景

1. 两步填写后提交：`onSuccess` 一次、导航一次，Provider variables 精确匹配。
2. 同步失败后停留确认步、保留草稿和安全错误，显式重试成功。
3. 异步失败后停留确认步、保留草稿和安全错误，显式重试成功。
4. 提交 pending 时 Back、步骤导航、重复 submit 不新增写入且不丢草稿；
   确认步本身没有 Cancel 入口，未虚构该控件。
5. 宿主替换后旧成功回执不污染新 StepsForm。
6. 宿主替换后旧失败回执不污染新 StepsForm。

测试过程中曾有步骤指示器 accessible name 定位失败，修正为按步骤文本及
`aria-current` 定位后最终通过；该中间失败不计为生产缺陷。

## 边界

Provider、导航和宿主控制均为本地受控实现；不证明真实后端持久化、取消、回滚、
幂等、权限/租户隔离、读屏、发布包或部署。pending 时对被禁用控件的事件级守卫
使用事件派发验证，不能等同真实用户点击禁用按钮。
