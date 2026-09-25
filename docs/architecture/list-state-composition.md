# 列表状态组合

## 决策

列表框架采用已有 Provider / Resource 契约、Svelte 原生响应式模块和显式
函数依赖。此实现不引入 DI 容器、装饰器、AOP 编织或额外编译阶段，也不要求
业务页面新增 controller / service / repository 层。

`AutoTable.svelte` 是组合入口，不是业务服务。五个状态模块均按组件实例创建，
不在模块顶层保存用户、租户或查询状态。它们是 UI 包内部实现，不作为新的
稳定消费 API；应用继续使用现有 AutoTable 属性、snippets 与 Provider。

## 职责

| 模块 | 拥有的状态和行为 | 不负责 |
| --- | --- | --- |
| `list-state.svelte.ts` | 搜索防抖、规范筛选、分页排序、查询快照和 URL 写入 | 数据请求、权限、选择 |
| `saved-list-views.svelte.ts` | 个人与远端视图、默认视图、版本冲突、访问主体和过期响应保护 | 表格状态如何应用 |
| `list-column-preferences.svelte.ts` | 列显隐与顺序、存储值校验、列状态与持久化 | 身份解析、跨作用域迁移授权 |
| `list-selection.svelte.ts` | 跨页 ID、全量匹配及排除项、批量快照、选择恢复 | 删除授权、后端执行 |
| `list-deletion.svelte.ts` | 确认请求、pending、执行 token、部分失败及迟到结果处理 | 权限判定、数据源选择、scope 定义 |

组合入口保留 `useList` / `useCan` / `useDeleteMany`、资源绑定、TanStack
适配、scope 变化协调、详情导航和渲染。不能为了减少行数，把这些依赖隐藏进
通用 service locator，或将模板拆成需要转发所有状态的组件。

## 依赖与生命周期

- 响应式输入通过 getter 传入。返回状态通过 getter、`$derived` 或稳定的
  TanStack selector 读取，不解构响应式值的瞬时快照。
- 模块在组件初始化期创建；测试在 `$effect.root` 中创建并显式销毁。
  定时器和异步 token 失效跟随 owner 生命周期。
- 保存视图通过 capture/apply 回调组合查询与列状态。恢复视图不标记 dirty，
  用户修改仍沿用现有 dirty 语义。
- 选择快照保留数字与字符串 ID 的区别。`scope: 'selected'` 与
  `scope: 'all'` 是不同的业务契约，不能将当前已加载页当成全部匹配结果。
- 删除继续走已有 checked mutation。模块中的 undoable 分支只保留选择展示
  和失败恢复行为，不增加撤销队列、不自动重试，也不将恢复选择解释成数据库回滚。

## 隔离与回写

1. 入口先解析资源、Provider、租户和身份对应的偏好 scope。
2. scope 改变时，列与视图写入暂停，直到新 scope 的偏好加载完成。
3. 查询条件变化清除选择；排序变化保留选择。更广泛的 table scope 变化由
   入口重置删除 token、选择、展开行和本地详情状态。
4. 删除结果仅在 token 和捕获的 scope 仍有效时应用。每个会继续写入 UI
   的异步等待点后重新检查，包括成功后的 `tick()`。
5. 远端视图各自保留请求 epoch / scope 检查，迟到响应不覆盖新上下文。

前端权限用于控制 UI 和调用入口，后端仍必须独立鉴权。不得通过全局 singleton
共享用户状态，也不得把状态恢复或旧请求忽略描述成取消了服务端操作。

## 扩展与验收

新领域逻辑优先放到业务 feature 的普通 TypeScript 函数；共享认证、通知、
数据访问等能力复用 Provider。Svelte Context 只用于明确的组件子树共享。
编译器／代码生成只在另有契约生成需求时评估，不是此分层的运行前提。

更改状态模块时，先运行对应 `*.test.svelte.ts`，再运行
`auto-table-interactions`、`auto-table-enterprise` 和 `resource-workspace`
集成测试。跨模块改动同时回归五个状态模块和 `saved-list-views.test.ts`。
使用 UI 包目录的 `vitest.config.ts`，并检查类型、lint、架构边界和双端编译。

本地测试、声明生成和包检查不等于浏览器端完整验收、发布或部署证明。
