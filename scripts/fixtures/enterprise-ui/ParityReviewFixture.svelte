<script lang="ts">
  import Grid from '../../../packages/ui/src/components/Grid.svelte';
  import Row from '../../../packages/ui/src/components/Row.svelte';
  import Col from '../../../packages/ui/src/components/Col.svelte';
  import Menu from '../../../packages/ui/src/components/Menu.svelte';
  import Tour from '../../../packages/ui/src/components/Tour.svelte';
  import ResizeBox from '../../../packages/ui/src/components/ResizeBox.svelte';
  import ConfigProvider from '../../../packages/ui/src/components/ConfigProvider.svelte';
  import NotificationHost from '../../../packages/ui/src/components/NotificationHost.svelte';
  import { Button } from '../../../packages/ui/src/components/ui/button/index.js';
  import { Progress } from '../../../packages/ui/src/components/ui/progress/index.js';
  import { notification } from '../../../packages/ui/src/notifications.svelte.js';

  let tourOpen = $state(false);
  let selectedCount = $state(0);
  let actionCount = $state(0);
  const menu = [{ id: 'reports', label: 'Reports', children: [{ id: 'weekly', label: 'Weekly' }] }, { id: 'settings', label: 'Settings' }];
</script>

<main>
  <h1>Parity interaction regression</h1>
  <p>Real components with UI and AI styles loaded together.</p>
  <section aria-label="Keyboard menu"><h2>Keyboard menu</h2><Menu items={menu} onselect={() => selectedCount++} /></section>
  <section aria-label="Collapsed menu"><h2>Collapsed menu</h2><div class="collapsed"><Menu items={menu} collapsed onselect={() => selectedCount++}>{#snippet icon(item)}<span aria-hidden="true">{item.label.slice(0, 1)}</span>{/snippet}</Menu></div></section>
  <p data-selection-count>{selectedCount}</p>
  <section><h2>Nested responsive layout</h2>
    <Grid columns={2} mdColumns={4} class="outer-grid">
      <Grid columns={1} class="inner-grid"><span>Inner A</span><span>Inner B</span></Grid>
      <span>Outer column</span>
    </Grid>
    <Row><Col span={12} md={8} mdOffset={2} class="outer-col"><Row><Col span={24} class="inner-col">Nested full width</Col></Row></Col></Row>
  </section>
  <section><h2>Progress feedback</h2><Progress value={35} showInfo aria-label="Line progress" /><Progress value={75} variant="circle" showInfo aria-label="Circle progress" /></section>
  <section><h2>Vertical resize</h2><ResizeBox direction="vertical" width={320} height={200} maxHeight={250} label="Vertical panel">Keyboard arrows change the height.</ResizeBox></section>
  <section><h2>Config defaults and notifications</h2><ConfigProvider componentSize="sm"><Button>Inherited size</Button><Button size="lg">Explicit size</Button></ConfigProvider>
    <Button onclick={() => notification.success('Review saved', 'Responsive and keyboard checks passed', { duration: 0, key: 'review', actionLabel: 'Undo review', onAction: () => actionCount++ })}>Notify</Button>
    <p data-action-count>{actionCount}</p>
  </section>
  <Button onclick={() => tourOpen = true}>Start tour</Button>
  <Tour bind:open={tourOpen} steps={[{ title: 'Welcome' }, { title: 'Ready' }]} />
  <NotificationHost />
</main>

<style>
  main { max-width: 70rem; margin: 0 auto; padding: 1.5rem; color: var(--foreground); background: var(--background); }
  section { margin-block: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-md); }
  h1, h2, p { margin-block: 0.5rem; }
  .collapsed { width: 3rem; }
</style>
