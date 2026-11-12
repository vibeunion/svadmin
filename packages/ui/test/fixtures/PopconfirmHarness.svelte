<script lang="ts">
  import Popconfirm from "../../src/components/Popconfirm.svelte";

  let {
    title = "确定删除？",
    okText = "确定",
    cancelText = "取消",
    okType = "primary",
    onConfirm = () => {},
  }: {
    title?: string;
    okText?: string;
    cancelText?: string;
    okType?: "primary" | "danger";
    onConfirm?: () => void;
  } = $props();
</script>

<Popconfirm {title} {okText} {cancelText} {okType} {...(onConfirm ? { onConfirm } : {})}>
  <button type="button">删除数据</button>
</Popconfirm>
