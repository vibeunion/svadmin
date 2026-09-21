/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './history-bootstrap';
import { mount } from 'svelte';
import './app.css';

// 动态加载保证构建分包后，路由模块也不会早于历史保护模块注册监听器。
const app = import('./App.svelte').then(({ default: App }) =>
  mount(App, { target: document.getElementById('app')! }));

export default app;
