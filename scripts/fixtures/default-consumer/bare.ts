import { mount } from 'svelte';
import '@svadmin/ui/app.css';
import BareApp from './BareApp.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing app target');
mount(BareApp, { target });
