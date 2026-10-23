# 邮件查询反馈归属

## 任务约定

- 日期：2026-10-21；parent：`ENTERPRISE_PRODUCT_SYSTEM.md` 的查询错误归属规则。
- source：用户要求继续完善企业级规范；reason：当前文件夹和角标的查询反馈
  未区分，存在重复通知及配置随文件夹切换失效的风险。
- 目标：当前邮件文件夹的查询失败只由 `WorkspaceQueryState` 显示并重试；
  收件箱未读角标在收件箱页作为同一查询的观察者，不重复发送通知。
- 非目标：不改草稿、发送、归档、已读、权限或真实邮件投递边界。
- Delegation Decision：low、managed；主线程单写入者，一名只读 verifier。

## 验收

```gherkin
Given 用户打开收件箱且列表读取失败
When 收件箱列表和未读角标观察同一个查询
Then 只显示一个内联错误，不发送重复通知

Given 收件箱读取失败
When 用户再次失败或恢复
Then Retry 仍可用，恢复后错误消失且不触发邮件写入

Given 用户查看草稿而收件箱未读统计读取失败
When 当前文件夹记录加载成功
Then 草稿保持可用，收件箱显示未知数量并保留默认通知

Given 草稿页中的收件箱统计失败已通知
When 不卸载页面而切换到收件箱并重试
Then 收件箱改由内联状态反馈，不再新增默认通知
```

## 验证

`example/test/pm-business-pages.test.ts`：59/59，退出码 0，包含此前 Todo、CRM、
Domain、Operations 等消费者场景。邮件新增证据包括：

- 七个文件夹均覆盖首次失败、再次失败、恢复及默认通知静默。
- 重试只读取当前文件夹，恢复后显示实际邮件详情链接，不把错误消失当作恢复。
- `create`、`update`、`updateMany` 和 `executeLocalMail` 均未在重试中调用。
- 草稿正常而收件箱统计失败时，草稿可用、角标显示未知数量且保留一次通知。
- 同组件从草稿切换到收件箱后，重试不再产生默认通知。

首次扩展运行有一条角标断言误选全局导航，限定到 `Mail folders` 导航后重跑
得到上述结果；没有删除未知数量断言。Svelte 捕获初始属性的警告已通过
响应式 getter 修复。测试命令（工作目录 `example`）：

```sh
node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/pm-business-pages.test.ts
```

`git diff --check` 通过。一名只读 verifier 未发现阻断问题，其复核未运行测试，
以上退出状态来自主线程。反向从收件箱切换到草稿的通知恢复尚无直接测试；
本证据不代表浏览器、真实邮件服务或全站验收。没有提交、推送或部署。
