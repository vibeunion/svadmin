# Example 剩余风险收尾

日期：2026-09-21。

- Parent：remediation.md；来源：用户“继续直至所有都修复”。
- 目标：修复上轮明确遗留的本地恢复风险、运行时警告，并补齐内置危险操作和导出行为的验证缺口。
- 非目标：真实邮件/MFA/生产服务接入、发布、提交、全仓无关清理。
- 风险中等；编排 managed：主 writer 负责运行时生命周期与集成；Mail writer 负责邮件恢复；UI writer 负责内置危险操作与导出；完成后一个只读集成复核。
- 验收使用直接相关单文件回归、example 检查/构建和浏览器重放；不运行全仓套件。
- 当前状态：本次核查已知的本地可修复项完成；通过专项回归、独立复核和正式构建浏览器复验。没有发布、部署或远端 CI 验收。

## 当前证据

- 查询销毁微任务读取已失效的 `options.queryKey` 已改为普通 key 快照；生命周期单文件 5/5，包括未等待 effect 刷新的参数变更与卸载。独立认证相关 9 项定向回归通过。
- 内置安全/导出追加 9/9；实际修复 MFA 取消后的视觉状态和 API 密钥复制失败反馈，见 [builtin-followup.md](builtin-followup.md)。UI 已统一构建。
- `common.dashboard` 缺失翻译已补齐；I18nScope 单文件 8/8，浏览器标题已为 Dashboard。
- 邮件已用单次整库提交替代两阶段状态；独立复核发现的 ID 复用及重复源 ID 已增加版本和源指纹校验，专项 23/23，综合业务单文件重跑 19/19。另覆盖授权等待期间身份切换、退出和原地权限撤销，见 [business-followup.md](business-followup.md)。
- Office 无 Navigation API 时，原 fallback 对未知条目的方向计算错误；公共历史序号已替代局部编号。进一步实际重放发现 Window 监听器先后顺序仍导致取消时卸载丢稿，现由应用启动时注册的统一监听器分发页面 guard，并动态加载 App 保证构建后的求值顺序。历史单文件 4/4；完整 UI 调试重放取消前进后保留 `ORDER-TRACE-UNSAVED`，无 pageerror；独立反向/末尾复验通过。
- 新出现的路由切换 `derived_inert` 已定位到 Layout 的退出动画保留了 INERT 页面，路由变化仍触发其 `useParsed` 派生状态。移除路由内容的退出动画、保留进入动画，不修改或抑制 Svelte 警告。新增旧页面即时卸载行为回归，Layout 单文件 6/6；正式构建连续切换 12 次无警告和页面错误。
- Office 独立开发态完整复验包括反向、重复取消和末尾前进；正式构建也通过无 Navigation API 的取消前进回放，稿件 `ORDER-TRACE-UNSAVED` 保留且无 pageerror。证据 `output/playwright/pm-remediation-20260921/office-5193-independent-history.json`、`office-history-order.json`。
- 最后手机复拍发现邮件长面包屑顶端为 -11px，超出 70px 固定顶栏；Header 改为最小高度与内容自适应，并去除顶栏内面包屑的页面级底间距。颜色契约 4/4；最终正式构建实测手机面包屑 top=12、bottom=87，顶栏高度 100；桌面顶栏保持 70。菜单和右侧按钮完整可见。
- 独立只读最终 Mail 复核无阻塞发现，复跑专项 23/23。独立 WebKit 浏览器实测归档存储拒绝后整库不变（Inbox 3 / Archive 1），刷新重试再刷新为 2 / 2，目标恰好一条；保存草稿后发送并刷新，草稿删除且 Sent 2→3，只新增一条。证据 `output/playwright/pm-mail-final-5191/results.md` 及四张截图。

## 最终集成结果

- UI 与 example 最终构建成功；example 类型检查 0 errors / 0 warnings。Layout/Header 定向 lint 通过；`git diff --check` 通过。
- 最后 Header 样式构建后，390px / 1440px 下复拍 Inbox、Archive、CRM Accounts、Dashboard，共 8 个视图；无 console warning、pageerror、文档横向溢出，面包屑上下界均在顶栏内。首页无面包屑，明确不要求它存在。截图 `output/playwright/pm-remediation-20260921/followup-*.png`。
- 构建保留已有大 chunk、KaTeX 动静态混用和库打包 `import.meta.env` 可移植性提示；这些不是已验证浏览器路径中的运行时错误，本轮未扩展为打包优化。
- 本轮没有重新执行全部路由扫描；此前 351 条路由及 Lite 两轮 211 路由覆盖仍以各自证据轮次为准，新增变更使用上述定向验收。
- 本地体验地址 `http://127.0.0.1:5191/`。真实邮件、MFA 外部服务和跨标签事务不在演示承诺内；不将本地测试通过等同于发布或生产验收。

```gherkin
Scenario: 邮件跨刷新恢复不重复创建
  Given 浏览器拒绝邮件跨文件夹提交
  When 用户刷新后重试
  Then 失败时源和目标均不改变
  And 成功时目标新增与源清理同时提交且只发生一次

Scenario: 路由生命周期不会读取已销毁派生状态
  Given 用户反复打开工作区与内置页面
  When 用户切换路由并返回
  Then 不出现 derived_inert 警告
  And 页面数据与翻译仍随当前状态更新

Scenario: 危险操作取消与失败不误报成功
  Given 用户进入已连接测试 provider 的安全设置
  When 用户取消删除或 provider 拒绝操作
  Then 取消不调用写入
  And 失败保持可恢复反馈与一致状态

Scenario: 导出与复制结果可信
  Given 当前列表存在已筛选记录
  When 用户导出或复制
  Then 导出内容对应当前筛选
  And 复制失败不显示成功
```
