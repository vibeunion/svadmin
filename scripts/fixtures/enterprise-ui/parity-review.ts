import { mount } from 'svelte';
import '@svadmin/ui/app.css';
import '@svadmin/ai-elements/ai.css';
import ParityReviewFixture from './ParityReviewFixture.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing parity fixture mount target');
mount(ParityReviewFixture, { target });
