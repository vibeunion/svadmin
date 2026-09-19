import { mount } from 'svelte';
import App from './App.svelte';

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('dark', params.get('dark') === '1');
const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = `/__ui.css${location.search}`;
await new Promise<void>((resolve, reject) => {
  css.onload = () => resolve();
  css.onerror = () => reject(new Error('Fixture stylesheet failed to load'));
  document.head.append(css);
});
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture mount point');
mount(App, { target, props: { variants: params.get('variants') !== '0' } });
