# ModalForm / DrawerForm 提交状态统一

## 任务边界

- parent/source：B2-10 表单引擎统一，承接 QuickEditDrawer 关闭策略复核。
- reason：通用包装此前只用 try/finally 提交，无本地失败反馈、事件级重复提交防卫，
  页脚禁用取消但关闭按钮/Escape/遮罩仍可关闭。
- orchestration：managed，pi 唯一代码执行者，主线程独立审查和验证。
- 不改 AutoForm、Core 或共享 Dialog/Sheet 原语；不新增业务 Schema/Provider 协议。
- 不提交、推送、发布或部署，保留工作区其他改动。

## 验收契约

1. 给定有草稿的打开表单，当提交同步抛错或异步拒绝，保持表单和草稿，
   显示本地化安全错误；用户显式再次提交成功才关闭。
2. 给定 disabled、外部 isSubmitting 或本地提交中，当收到重复 SubmitEvent/
   requestSubmit，不重复调用提交回调。
3. 给定本地或外部提交中，当用户取消、关闭、Escape 或点击遮罩，保持打开且不触发
   取消回调；空闲时相同操作必须能关闭，以排除测试事件无效导致的假通过。
4. 给定旧请求在途，当宿主强制关闭再重开，或保持打开但切换 onsubmit 身份，
   旧成功/失败不关闭新一轮或覆盖错误；旧 finally 不释放新请求的提交锁。
5. 给定关闭/重开或卸载后保存的旧 form DOM 引用，派发 submit 不调用新的提交回调。

## 实现与审查

- 两包装增加请求身份和轮次隔离，关闭或回调身份变化时清理本地请求状态。
- 提交入口检查 open、销毁标记、当前 form 元素身份、disabled 与 busy。
- 同步/异步错误均捕获，只用 `common.operationFailed` 和既有 FeedbackNotice 展示。
- Modal 通过 onOpenChange，Drawer 通过 onCloseRequest 阻止提交中的普通关闭。
- 保持旧取消回调语义：Modal 非页脚的关闭不新增 oncancel；Drawer 沿用原语 onClose。
- 主线程否决了首版“回调切换”测试的证据强度：宿主固定包装函数掩盖了真实身份。
  修正版直接透传回调，并单独验证 open 不变时的 handler 替换。
- 主线程要求补关闭动作的空闲正控制，以及旧 form 引用重新提交的回归。

## 单文件执行

```sh
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/modal-drawer-form.test.svelte.ts
```

- pi 首轮报告 12 failed / 4 passed（16）；包含 Drawer 查询 role 的测试问题，
  不能全部记为生产缺陷。修正后首版 16/16。
- 审查返修首轮 10 failed / 16 passed（26）；其中两条是 overlay 事件模拟问题。
  新增旧 form 关闭重开场景另报 2 failed。以上仅为 pi 过程记录，未由主线程重跑红测。
- pi 最终 30/30，exit 0，约 6.50s。
- 主线程独立最终 30/30，exit 0，6.52s；目标生产/测试文件 diffcheck exit 0。
- 未运行全仓门禁或 typecheck/build。单测环境为 happy-dom，不替代真实浏览器。

## 待补证据与限制

- 专属真实浏览器已由 pi 自测并由主线程独立复核：Chromium/WebKit/Firefox ×
  desktop/narrow，`36/36` passed，exit 0；pi 约 53.0s，主线程 53.3s，两次独立
  记录、不合并。所有场景断言 pageerror 为空，窄屏断言无页面横向溢出。
- 浏览器返修补充真实同步 throw、唯一 `PRIVATE_*` 诊断脱敏断言、桌面 Drawer 遮罩
 真实指针点击和动画稳定截图；首轮 36/36 仅作为历史记录，不作为最终稳定视觉证据。
- 同一同步批次先 false 再 true、未被组件观察到的 open 中间态不属于已验证轮次切换；
  测试通过真实渲染周期分隔关闭与重开。
- 不证明服务端请求取消、回滚、幂等；旧回调的业务副作用仍可继续执行。
- 不证明真实读屏、发布包、部署，不能据此关闭整个 B2-10。
