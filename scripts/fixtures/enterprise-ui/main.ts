import { mount } from 'svelte';
import '@svadmin/ui/app.css';
import App from './App.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture mount target');
mount(App, { target });
