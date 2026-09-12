import { mount } from 'svelte';
import Harness from '../fixtures/DropdownContainmentHarness.svelte';
import '../../src/app.css';

const target = document.getElementById('app');
if (!target) throw new Error('Missing test mount');
mount(Harness, { target });
