<script lang="ts">
  interface Props {
    companyName?: string;
    sealTitle?: string;
    serialNumber?: string;
    class?: string;
  }

  let {
    companyName = '上海创智多租户研发网络科技有限公司',
    sealTitle = '电子审批专用章',
    serialNumber = '3101040098214',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-seal-stamp {className}"
  data-svadmin-component="LiteElectronicSealStamp"
  role="img"
  aria-label="{companyName} {sealTitle}"
>
  <div class="lite-seal-circle">
    <div class="lite-seal-company">{companyName}</div>
    <div class="lite-seal-star">★</div>
    <div class="lite-seal-title">{sealTitle}</div>
    <div class="lite-seal-serial font-mono">{serialNumber}</div>
  </div>
</div>

<style>
  .lite-seal-stamp {
    display: inline-block;
    padding: 8px;
    transform: rotate(-5deg);
  }
  .lite-seal-circle {
    width: 140px;
    height: 140px;
    border: 3px solid #f53f3f;
    border-radius: 50%;
    color: #f53f3f;
    text-align: center;
    box-sizing: border-box;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }
  .lite-seal-company { font-size: 9px; font-weight: bold; line-height: 1.1; }
  .lite-seal-star { font-size: 22px; line-height: 1; }
  .lite-seal-title { font-size: 11px; font-weight: bold; letter-spacing: 1px; }
  .lite-seal-serial { font-size: 8px; font-family: monospace; letter-spacing: 1px; }
  .font-mono { font-family: monospace; }
</style>
