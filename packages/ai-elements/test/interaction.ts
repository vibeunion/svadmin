import { mount } from 'svelte';
import Harness from './fixtures/InteractionHarness.svelte';
import '../dist/ai.css';

document.documentElement.classList.toggle('dark', new URLSearchParams(location.search).has('dark'));
mount(Harness, { target: document.body });
