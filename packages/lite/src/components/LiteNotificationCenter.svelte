<script lang="ts">
  import { renderRichContent, type MarkdownRenderOptions } from '../rich-content.js';

  interface NotificationItem {
    id: string;
    title: string;
    description?: string;
    time?: string;
    href?: string;
    read?: boolean;
    tone?: 'info' | 'success' | 'warning' | 'danger';
  }

  interface Props {
    items: NotificationItem[];
    title?: string;
    emptyText?: string;
    markAllHref?: string;
    /** Render item descriptions as Markdown/allowlisted HTML. Defaults to plain text. */
    richContent?: boolean;
    richContentOptions?: MarkdownRenderOptions;
  }

  let {
    items,
    title = 'Notifications',
    emptyText = 'No notifications',
    markAllHref,
    richContent = false,
    richContentOptions,
  }: Props = $props();

  function body(value: string): string {
    return renderRichContent(value, richContentOptions);
  }
</script>

<section class="lite-notification-center lite-card" aria-label={title}>
  <header>
    <h2>{title}</h2>
    {#if markAllHref}<a href={markAllHref}>Mark all read</a>{/if}
  </header>
  {#if items.length === 0}
    <p class="lite-muted">{emptyText}</p>
  {:else}
    <ul>
      {#each items as item (item.id)}
        <li data-read={item.read || undefined} data-tone={item.tone ?? 'info'}>
          <span class="lite-notification-center__dot" aria-hidden="true"></span>
          {#if item.href}<a href={item.href}>{item.title}</a>{:else}<strong>{item.title}</strong>{/if}
          {#if item.description}
            {#if richContent}
              <div class="lite-notification-center__rich">{@html body(item.description)}</div>
            {:else}
              <p>{item.description}</p>
            {/if}
          {/if}
          {#if item.time}<time>{item.time}</time>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .lite-notification-center { padding: 0; overflow: hidden; }
  .lite-notification-center header { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #E5E6EB; }
  .lite-notification-center h2 { margin: 0; color: #1D2129; font-size: 14px; }
  .lite-notification-center header a { color: #165DFF; font-size: 12px; }
  .lite-notification-center ul { margin: 0; padding: 0; list-style: none; }
  .lite-notification-center li { position: relative; display: block; padding: 12px 16px 12px 30px; border-bottom: 1px solid #F2F3F5; }
  .lite-notification-center li:last-child { border-bottom: 0; }
  .lite-notification-center li[data-read] { opacity: 0.65; }
  .lite-notification-center__dot { position: absolute; top: 16px; left: 16px; width: 7px; height: 7px; border-radius: 999px; background: #165DFF; }
  .lite-notification-center li[data-tone='success'] .lite-notification-center__dot { background: #00B42A; }
  .lite-notification-center li[data-tone='warning'] .lite-notification-center__dot { background: #FF7D00; }
  .lite-notification-center li[data-tone='danger'] .lite-notification-center__dot { background: #F53F3F; }
  .lite-notification-center li a, .lite-notification-center li strong { color: #1D2129; font-size: 13px; }
  .lite-notification-center li p { margin: 0; color: #4E5969; font-size: 12px; line-height: 1.5; }
  .lite-notification-center li time { color: #86909C; font-size: 11px; }
  .lite-notification-center__rich :global(p) { margin: 0; }
  .lite-notification-center__rich :global(a) { color: #165DFF; }
  .lite-notification-center__rich :global(code) { padding: 1px 4px; border-radius: 3px; background: #F2F3F5; font-family: monospace; font-size: 12px; }
</style>
