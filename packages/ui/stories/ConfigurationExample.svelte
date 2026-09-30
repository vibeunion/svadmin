<script lang="ts">
  import { Save } from '@lucide/svelte';
  import ConfigurationPage from '../src/components/ConfigurationPage.svelte';
  import SettingsGroup from '../src/components/content/SettingsGroup.svelte';
  import SettingsFieldRow from '../src/components/content/SettingsFieldRow.svelte';
  import { Select } from '../src/components/ui/select/index.js';
  import { Button } from '../src/components/ui/button/index.js';

  let reviewer = $state('甲');
  let approver = $state('乙');
  let saved = $state({ reviewer: '甲', approver: '乙' });
  let savedOnce = $state(false);
  const dirty = $derived(reviewer !== saved.reviewer || approver !== saved.approver);
  const id = $props.id();
</script>

<ConfigurationPage title="流程签名" description="设置流程单的默认审核人与批准人。">
  <SettingsGroup title="默认签名人员">
    <SettingsFieldRow label="审核人" controlId={`${id}-reviewer`}>
      {#snippet control()}
        <Select id={`${id}-reviewer`} value={reviewer} onchange={(event) => { reviewer = event.currentTarget.value; }}>
          <option value="甲">验收成员甲</option><option value="乙">验收成员乙</option>
        </Select>
      {/snippet}
    </SettingsFieldRow>
    <SettingsFieldRow label="批准人" controlId={`${id}-approver`} separated>
      {#snippet control()}
        <Select id={`${id}-approver`} value={approver} onchange={(event) => { approver = event.currentTarget.value; }}>
          <option value="甲">验收成员甲</option><option value="乙">验收成员乙</option>
        </Select>
      {/snippet}
    </SettingsFieldRow>
  </SettingsGroup>
  {#snippet footer()}
    <span role="status" aria-live="polite">{dirty ? '有未保存的修改' : savedOnce ? '已保存至本次演示' : ''}</span>
    <Button variant="outline" disabled={!dirty} onclick={() => { reviewer = saved.reviewer; approver = saved.approver; }}>撤销修改</Button>
    <Button disabled={!dirty} onclick={() => { saved = { reviewer, approver }; savedOnce = true; }}><Save size={16} />保存签名配置</Button>
  {/snippet}
</ConfigurationPage>
