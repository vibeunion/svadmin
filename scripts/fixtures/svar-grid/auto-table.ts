import { mount } from 'svelte';
import '../../../packages/ui/src/app.css';
import AutoTableConsumer from './AutoTableConsumer.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture root');
mount(AutoTableConsumer, { target });
