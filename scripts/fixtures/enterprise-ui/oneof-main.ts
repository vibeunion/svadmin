import { mount } from 'svelte';
import '@svadmin/ui/app.css';
import SchemaOneOfFixture from './SchemaOneOfFixture.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture mount target');
mount(SchemaOneOfFixture, { target });
