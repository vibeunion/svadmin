# Admin UI：参考研究与实现决策

历史研究日期：2026-09-19。以下为研究与需求的摘要，不是用户原话；原始记录保留在 Git 历史。已撤下的供应商链接不再作为活动参考，也不替换为虚构 URL。当前资产参考清单见 `references.json`，仅保留 Park 及其许可门禁。
这里区分历史来源观察、svadmin 自主选择、未验证内容。没有购买或复制模板、代码、字体、商标或 Figma 图层。

## 本项目页面规则

- 列表进入详情保留返回路径；主次双栏在窄屏回到单栏。样例仍是内存视图切换，不声称提供可分享路由。
- 筛选置于表格上方，与搜索取交集；先过滤后计算行数，零结果提供重置。使用 `aria-pressed` 原生按钮，不冒充完整 Tabs。
- 首次无数据与筛选零结果分别解释；局部活动失败保留已加载属性。样例权限仅验证展示，不是后端授权。
- 新建位于页头，行内查看使用次级操作，保存位于表单末尾；不自动创建真实客户或发送邮件。

## 已核对的来源与采用方式

| 来源 | 来源支持的观察 | svadmin 的实现决定 | 不照搬或尚未实现 |
| --- | --- | --- | --- |
| [Metronic API Keys 演示](https://keenthemes.com/metronic/tailwind/demo1/account/api-keys) | 公开演示分开组织账户设置、团队、安全和 API 访问，密钥列表含状态等元信息。 | 设置按“基本信息/开发者访问”分组；复用现有 `ApiKeyList`，仅提供明确为合成的掩码和只读元信息。 | 不复制示例 key、供应商样式或运行时；不提供复制/撤销回调，不以演示内容认证安全实现。 |
| [DashLite Figma 商品说明](https://themeforest.net/item/dashlite-admin-dashboard-ui-kit-figma-template/43384325) | 作者列出用户列表/详情、交易/发票等页面，以及 Atomic Design、Auto Layout、组件变体。 | 仅作为列表身份信息、业务页面覆盖和命名组织的补充研究；我们的颜色和尺寸仍来自 svadmin。 | 未购买或逐层审查 `.fig`，不声称其页面已导入或与代码同步。 |
| [Vuexy Figma 商品说明](https://themeforest.net/item/vuexy-figma-admin-dashboard-ui-kit-template-with-atomic-design-system/29721411) | 作者说明组件/变体、Auto Layout、颜色和文本变量的资产组织。 | 用明确的 section/toolbar/workspace/settings/list 部件命名，公开有限 recipes，设计规则与组件名称对应。 | 只核对公开说明，不声称审计付费文件内部；不采用其默认配色和代码。 |

## 本项目自己的视觉决定

白色/主题内容表面、中性导航、单一品牌强调色、细分隔线、平面设置分组、14px数据正文、13px辅助层、金额末端对齐。
这些数值和选择是 svadmin 的版本化实现，不是从第三方截图测得的官方 tokens。
颜色继续引用 `foreground`、`muted`、`border` 及现有主题变量；间距使用既有 spacing 单位，圆角使用既有 radius 变量，不新增第二套调色板。

历史实现为六个 Panda slot recipes、共36个部件；该记录不代表当前 API。当前 recipes 来源为 `packages/ui/src/recipes.ts`，公开组件包括 `SectionHeader`、`PageToolbar`、`WorkspaceLayout`、`SettingsGroup`、`SettingsFieldRow`。Preview 的列表布局使用本地语义类与真实 Table 组件，不再导入已移除的 `productList`。消费端使用发布 CSS，预览不另加样式框架。

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
以上测试范围为历史研究记录，测试结果以实际修订对应的工作流为准；重复PNG一致不是历史视觉等价、第三方产品像素复制或无障碍认证。

本轮Figma读取 `8:53` 仍返回Starter额度限制。已有文件保留，未创建新图层；不以浏览器截图冒充Figma同步。
[Envato Regular License](https://themeforest.net/licenses/terms/regular)第8条限制将商品作为工具、模板或源文件再分发；本轮仅研究公开说明并独立实现，不产生付费素材再分发许可。
