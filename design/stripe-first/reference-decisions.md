# Stripe-first：参考研究与实现决策

研究日期：2026-09-19。主参考为 Stripe 官方产品模式；ThemeForest 仅补充企业场景与资产组织。
这里区分来源明确描述、svadmin 自主选择、未验证内容。没有购买或复制模板、代码、字体、商标或 Figma 图层。

## 已核对的来源与采用方式

| 来源 | 来源支持的观察 | svadmin 的实现决定 | 不照搬或尚未实现 |
| --- | --- | --- | --- |
| [Stripe Full-page apps](https://docs.stripe.com/stripe-apps/patterns/full-page-apps) | 列表进入详情、主次双栏、页面级操作、内容加载期间保留导航；详情有返回路径。 | `WorkspaceLayout` 的单栏/主次栏 recipe；客户详情以活动为主、属性为辅，窄屏回到单栏。列表进入详情及返回保留搜索和状态筛选。 | 文档功能为 private preview；本项目不安装 Stripe SDK。样例仍是内存视图切换，不声称实现了 Stripe 的路由与可分享链接。 |
| [Stripe Filter controls](https://docs.stripe.com/stripe-apps/patterns/filter-controls) | 筛选放表格上方；先过滤数据再计算行数；激活的条件有明确的清除操作。 | 新增 all/active/pending 的有限状态筛选，与搜索取交集；清除状态不清空搜索；零结果可同时重置条件。 | 用有 `aria-pressed` 的原生按钮，不伪装成完整 Tabs，也不复制 Chip/Menu 的 SDK 实现。 |
| [Stripe Empty states](https://docs.stripe.com/stripe-apps/patterns/empty-state) | 首次无数据与筛选零结果应分别解释；局部空/错误不应该占据整个页面。 | 保留六种列表状态、五种详情状态；无权限不显示身份、数据和筛选数；局部活动失败保留已加载属性。 | 样例权限只验证展示，不是后端授权。新筛选数仅正常场景展示，首次空为0，未知/失败为破折号。 |
| [Stripe Action buttons](https://docs.stripe.com/stripe-apps/patterns/action-buttons) | 操作位置应保持一致；可根据内容滚动需求选择页头或正文之后。 | 新建保留在页头，行内“查看”降为 ghost；设置保存留在表单末尾，不在侧栏再增加一个主操作。 | 不把所有动作都涂成品牌色；不自动创建真实客户或发送邮件。 |
| [Metronic API Keys 演示](https://keenthemes.com/metronic/tailwind/demo1/account/api-keys) | 公开演示分开组织账户设置、团队、安全和 API 访问，密钥列表含状态等元信息。 | 设置按“基本信息/开发者访问”分组；复用现有 `ApiKeyList`，仅提供明确为合成的掩码和只读元信息。 | 不复制示例 key、供应商样式或运行时；不提供复制/撤销回调，不以演示内容认证安全实现。 |
| [DashLite Figma 商品说明](https://themeforest.net/item/dashlite-admin-dashboard-ui-kit-figma-template/43384325) | 作者列出用户列表/详情、交易/发票等页面，以及 Atomic Design、Auto Layout、组件变体。 | 仅作为列表身份信息、业务页面覆盖和命名组织的补充研究；我们的颜色和尺寸仍来自 svadmin。 | 未购买或逐层审查 `.fig`，不声称其页面已导入或与代码同步。 |
| [Vuexy Figma 商品说明](https://themeforest.net/item/vuexy-figma-admin-dashboard-ui-kit-template-with-atomic-design-system/29721411) | 作者说明组件/变体、Auto Layout、颜色和文本变量的资产组织。 | 用明确的 section/toolbar/workspace/settings/list 部件命名，公开有限 recipes，设计规则与组件名称对应。 | 只核对公开说明，不声称审计付费文件内部；不采用其默认配色和代码。 |

## 本项目自己的视觉决定

白色/主题内容表面、中性导航、单一品牌强调色、细分隔线、平面设置分组、14px数据正文、13px辅助层、金额末端对齐。
这些数值和选择是 svadmin 的版本化实现，不是从 Stripe 截图测得的官方 tokens。
颜色继续引用 `foreground`、`muted`、`border` 及现有主题变量；间距使用既有 spacing 单位，圆角使用既有 radius 变量，不新增第二套调色板。

六个 Panda slot recipes 共36个部件：`productSection`、`productToolbar`、`productWorkspace`、`productSettings`、`productSettingsRow`、`productList`。
前五个连接现有公开组件 `SectionHeader`、`PageToolbar`、`WorkspaceLayout`、`SettingsGroup`、`SettingsFieldRow`。
`productList` 从 `@svadmin/ui/recipes` 导出，用于现有 Table/业务列表组合。所有合法变体构建期预生成；消费端只用普通 CSS，不安装 Panda 或 Tailwind。

```svelte
<script lang="ts">
  import { WorkspaceLayout, SettingsGroup, SettingsFieldRow, Input } from '@svadmin/ui';
  import '@svadmin/ui/app.css';
  let name = $state('Example workspace');
</script>
<WorkspaceLayout secondaryWidth="20rem">
  {#snippet primary()}
    <SettingsGroup title="基本信息" description="统一分组，不重复嵌套卡片。">
      <SettingsFieldRow label="名称">
        {#snippet control()}<Input bind:value={name} aria-label="名称" />{/snippet}
      </SettingsFieldRow>
    </SettingsGroup>
  {/snippet}
  {#snippet secondary()}<p>与当前任务有关的补充说明。</p>{/snippet}
</WorkspaceLayout>
```

## 验证与未完成边界

新增契约检查覆盖实际发布 CSS、所有36部件、单/双栏、分隔状态、焦点/表格规则和缺失CSS反例。
Svelte组件测试覆盖公开 snippets、回调、可选侧栏、移动端顺序、侧栏折叠和 class/bodyClass。
浏览器继续完整152场景、4条交互序列和2条键盘/动态偏好检查，并新增筛选交集、响应式栏数、表格分隔、数值对齐和只读密钥展示断言。
测试结果以实际修订对应的工作流为准；重复PNG一致不是历史视觉等价、Stripe像素复制或无障碍认证。

本轮Figma读取 `8:53` 仍返回Starter额度限制。已有文件保留，未创建新图层；不以浏览器截图冒充Figma同步。
[Envato Regular License](https://themeforest.net/licenses/terms/regular)第8条限制将商品作为工具、模板或源文件再分发；本轮仅研究公开说明并独立实现，不产生付费素材再分发许可。
