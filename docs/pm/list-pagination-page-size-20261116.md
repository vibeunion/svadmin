# ListPagination 单页仍可调整每页条数

PM-Decision: approved

JTBD：用户将23条结果从每页10条切为50条后，仍能在同一位置切回10条，继续按页办理。当前每页条数控件位于多页和showSummary分支内，结果变成单页或宿主关闭汇总文字时，控件消失。

信息架构：记录数汇总、每页条数选择和页码导航是独立能力。保持当前多页布局；单页不显示上一页、页码、下一页或跳转，只在已配置onPageSizeChange及有效pageSize时保留选择入口。纯单页且无回调仍沿用原简短汇总；showSummary仅控制文字汇总，不隐藏明确配置的选择控件。使用原有国际化文案和32px控件。

边界：仅修改ListPagination及同一回归文件，不改变宿主页码重置策略、数据/provider、权限、全局配置默认值、其他列表、分页算法或发布流程。

```gherkin
Feature: 每页条数在分页状态变化后仍可操作
Scenario: 多页变单页后返回
  Given 23条结果以每页10条显示
  When 用户选择每页50条并收到宿主更新
  Then 同一选择器仍可切回10条，单页不显示页码导航
Scenario: 汇总文字关闭
  Given 宿主关闭showSummary并提供每页条数回调
  When 查看多页、单页或0条结果
  Then 选择器仍可用，关闭的汇总不出现，0条不伪造导航
Scenario: 原单页静态汇总保持
  Given 宿主没有配置每页条数回调
  When 单页或0条结果出现
  Then 沿原汇总显示策略，不新增无效控件
Scenario: 组合与本地化保持
  Given ListFooter使用原分页组合且具有条数回调
  When 变成单页或切换语言
  Then 选择器与可访问名称正确，记录数不重复，回调参数保持
```

状态矩阵：多页/单页/0条 × showSummary开关 × 有/无条数回调；ListFooter组合；中英切换。该控件没有数据加载、错误或折叠状态，沿宿主处理，不添加假状态。

Delegation Decision：native，low risk，external=0，单owner/writer；这是可逆的单组件展示条件修复，由当前执行者完成定向测试、源码差异审查和真实浏览器验证，不需要领域或独立评审lane。

验证：仅运行直接相关的list-pagination.test.svelte.ts、定向ESLint、check:vibe-governance及git diff --check。1440x900与1920x1080使用实际源组件进行10→50→10、关闭汇总、0条和Footer组合验收。当前连接未暴露svadmin_getDiagnostics，因此另通过仓库本地MCP handler调用同名工具，转交实际浏览器夹具的已核验诊断；这不等于连接完整应用采集器。未授权发布、合并或部署。

## 实施结果

- 仅将条数选择的可见条件与分页/汇总条件分开，复用原选择器、样式和国际化。单页且有选择器时使用group语义，页码导航只在多页显示；无回调的原单页汇总保持。
- 唯一定向文件改前16 pass/3 fail，三个新增场景均因缺少选择器失败；改后 **19 pass/0 fail**。覆盖23条的10→50→10、单页语言切换、showSummary=false、0条和ListFooter不重复计数，原16项保持。
- 定向ESLint、check:vibe-governance和git diff --check通过。六个实际源组件截图和两份结构化结果位于`docs/pr-evidence/list-pagination-page-size/`。
- 1440x900与1920x1080均复现改前主分页和Footer选择器消失、焦点丢失；改后选择器均保留，主选择器焦点保持，可切回10条。单页没有页码或上一页/下一页，0条与关闭汇总不隐藏选择器，语言切换与Footer单次计数通过。最终浏览器pageerror、console warning/error、请求失败和页面横向溢出均为0。
- 夹具首次语言按钮误用不存在的getLocale，已改用现有locale属性并重跑；该夹具错误没有算作产品回归或通过证据。浏览器使用真实ListPagination/ListFooter源码及现有主题产物，记录为本地构造数据，不代表宿主应用、生产或全套测试验收。

本次只提交上游PR，不自动合并、发布或修改下游依赖。
