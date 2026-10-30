<script lang="ts">
  interface TourStep {
    title: string;
    description?: string;
    href?: string;
  }

  interface Props {
    steps: TourStep[];
    title?: string;
    current?: number;
    dismissHref?: string;
    label?: string;
  }

  let { steps, title = 'Guided tour', current = 0, dismissHref, label = 'Guided tour' }: Props = $props();
</script>

<section class="lite-tour lite-card" aria-label={label}>
  <header>
    <h2>{title}</h2>
    {#if dismissHref}<a href={dismissHref} aria-label="Dismiss tour">×</a>{/if}
  </header>
  <ol>
    {#each steps as step, index (step.title)}
      <li data-active={index === current || undefined}>
        <span>{index + 1}</span>
        <div>
          <strong>{step.title}</strong>
          {#if step.description}<p>{step.description}</p>{/if}
          {#if step.href}<a href={step.href}>View step</a>{/if}
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .lite-tour { display: block; }
  .lite-tour header { display: flex; align-items: baseline; justify-content: space-between; }
  .lite-tour h2 { margin: 0; color: #1D2129; font-size: 14px; }
  .lite-tour header a { color: #4E5969; font-size: 20px; line-height: 1; text-decoration: none; }
  .lite-tour ol { display: block; margin: 0; padding: 0; list-style: none; }
  .lite-tour li { display: flex; padding: 8px; border: 1px solid #F2F3F5; border-radius: 6px; }
  .lite-tour li[data-active] { border-color: #165DFF; background: #F7F8FA; }
  .lite-tour li > span { display: inline-grid; flex: 0 0 24px; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: #E8F3FF; color: #165DFF; font-size: 12px; font-weight: 600; }
  .lite-tour li strong { color: #1D2129; font-size: 13px; }
  .lite-tour li p { margin: 2px 0 0; color: #4E5969; font-size: 12px; line-height: 1.5; }
  .lite-tour li a { color: #165DFF; font-size: 12px; }

  .lite-tour > * + * { margin-top: 12px; }
  .lite-tour li + li { margin-top: 8px; }
  .lite-tour li > span { margin-right: 10px; }
</style>
