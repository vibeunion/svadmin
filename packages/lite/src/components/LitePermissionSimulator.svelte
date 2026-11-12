<script lang="ts">
  export interface SimulationUser {
    id: string;
    name: string;
    department: string;
    securityClearance: string;
  }

  interface Props {
    title?: string;
    users?: SimulationUser[];
    class?: string;
  }

  let {
    title = '权限模拟沙箱 (SSR 静态列表)',
    users = [
      { id: 'u1', name: '李思远 (财务主管)', department: '财务结算中心', securityClearance: 'L3' },
      { id: 'u2', name: '王小磊 (开发人员)', department: '技术工程部', securityClearance: 'L1' },
      { id: 'u3', name: '赵宏 (合规安全总监)', department: '信息安全合规处', securityClearance: 'L4' },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-perm-simulator {className}"
  data-svadmin-component="LitePermissionSimulator"
  role="region"
  aria-label="Permission Simulator"
>
  <header class="lite-sim-header">
    <div class="lite-sim-title-row">
      <span class="lite-sim-icon">👤</span>
      <h4 class="lite-sim-title">{title}</h4>
    </div>
    <span class="lite-sim-count">可模拟 {users.length} 个角色身份</span>
  </header>

  <div class="lite-sim-body">
    <div class="lite-sim-users">
      {#each users as u (u.id)}
        <div class="lite-user-card">
          <div class="lite-user-top">
            <span class="lite-user-name">{u.name}</span>
            <span class="lite-user-level font-mono">[{u.securityClearance}]</span>
          </div>
          <div class="lite-user-dept">{u.department}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .lite-perm-simulator {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-sim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-sim-title-row { display: flex; align-items: center; }
  .lite-sim-icon { font-size: 14px; margin-right: 6px; }
  .lite-sim-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-sim-count { font-size: 11px; color: #86909c; }
  .lite-sim-body { padding: 12px 14px; }
  .lite-sim-users { display: flex; flex-direction: column; }
  .lite-user-card {
    border: 1px solid #f2f3f5;
    background: #fafafa;
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 6px;
  }
  .lite-user-card:last-child { margin-bottom: 0; }
  .lite-user-top { display: flex; justify-content: space-between; align-items: center; }
  .lite-user-name { font-weight: 600; color: #1d2129; }
  .lite-user-level { font-size: 10px; color: #165dff; font-weight: 600; }
  .font-mono { font-family: monospace; }
  .lite-user-dept { font-size: 11px; color: #86909c; margin-top: 2px; }
</style>
