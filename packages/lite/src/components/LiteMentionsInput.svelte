<script lang="ts">
  export interface MentionOption {
    id: string;
    label: string;
    type?: 'user' | 'tag' | 'entity';
    subtitle?: string;
  }

  interface Props {
    name?: string;
    value?: string;
    placeholder?: string;
    users?: MentionOption[];
    tags?: MentionOption[];
    rows?: number;
    disabled?: boolean;
    class?: string;
  }

  let {
    name = 'content',
    value = '',
    placeholder = 'Type @ or # to mention...',
    users = [],
    tags = [],
    rows = 3,
    disabled = false,
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-mentions {className}">
  <textarea
    {name}
    {value}
    {placeholder}
    {rows}
    {disabled}
    class="sv-lite-textarea"
  ></textarea>

  {#if users.length > 0 || tags.length > 0}
    <div class="sv-lite-mentions-hints">
      <span class="sv-lite-hints-title">Quick Mentions:</span>
      {#each users as u (u.id)}
        <span class="sv-lite-mention-badge">@{u.label}</span>
      {/each}
      {#each tags as t (t.id)}
        <span class="sv-lite-mention-badge sv-lite-tag">#{t.label}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sv-lite-mentions {
    display: block;
    width: 100%;
    font-size: 12px;
  }
  .sv-lite-textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #0f172a;
  }
  .sv-lite-mentions-hints {
    margin-top: 6px;
    padding: 4px 6px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }
  .sv-lite-hints-title {
    font-weight: 600;
    color: #64748b;
    margin-right: 6px;
  }
  .sv-lite-mention-badge {
    display: inline-block;
    padding: 2px 6px;
    margin-right: 4px;
    margin-bottom: 2px;
    background-color: #e0e7ff;
    color: #4338ca;
    border-radius: 3px;
    font-size: 11px;
  }
  .sv-lite-tag {
    background-color: #f1f5f9;
    color: #475569;
  }
</style>
