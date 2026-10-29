import { cleanup, render, screen } from '@testing-library/svelte';
import type { Snippet } from 'svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AdvancedDetailTemplate from './AdvancedDetailTemplate.svelte';
import AdvancedFormTemplate from './AdvancedFormTemplate.svelte';
import AnalysisTemplate from './AnalysisTemplate.svelte';
import BasicDetailTemplate from './BasicDetailTemplate.svelte';
import CardListTemplate from './CardListTemplate.svelte';
import ExceptionTemplate from './ExceptionTemplate.svelte';
import GroupFormTemplate from './GroupFormTemplate.svelte';
import MonitorTemplate from './MonitorTemplate.svelte';
import ProfileTemplate from './ProfileTemplate.svelte';
import ResultTemplate from './ResultTemplate.svelte';
import SearchTableTemplate from './SearchTableTemplate.svelte';
import StepFormTemplate from './StepFormTemplate.svelte';
import TemplatePageShell from './TemplatePageShell.svelte';
import WorkplaceTemplate from './WorkplaceTemplate.svelte';

afterEach(() => cleanup());

const body = createRawSnippet(() => ({ render: () => '<p>Sample content</p>' }));
const stepContent = createRawSnippet(() => ({ render: () => '<p>Step</p>' })) as unknown as Snippet<[number]>;
const steps = [{ title: 'Basics' }, { title: 'Review' }];

function heading(name: string): void {
  expect(screen.getByRole('heading', { name })).toBeTruthy();
}

describe('page templates', () => {
  it('renders every composition with its primary content', () => {
    render(TemplatePageShell, { props: { title: 'Composition', primary: body } });
    heading('Composition');
    cleanup();

    render(WorkplaceTemplate, { props: { title: 'Workplace', primary: body, secondary: body } });
    heading('Workplace');
    cleanup();

    render(MonitorTemplate, { props: { title: 'Monitor', metrics: body, chart: body } });
    heading('Monitor');
    cleanup();

    render(AnalysisTemplate, { props: { title: 'Analysis', charts: body, records: body } });
    heading('Analysis');
    cleanup();

    render(SearchTableTemplate, { props: { title: 'Search table', table: body } });
    heading('Search table');
    cleanup();

    render(CardListTemplate, { props: { title: 'Card list', items: body } });
    heading('Card list');
    cleanup();

    render(GroupFormTemplate, { props: { title: 'Group form', form: body } });
    heading('Group form');
    cleanup();

    render(StepFormTemplate, { props: { title: 'Step form', steps, stepContent } });
    heading('Step form');
    cleanup();

    render(AdvancedFormTemplate, { props: { title: 'Advanced form', form: body, summary: body } });
    heading('Advanced form');
    cleanup();

    render(BasicDetailTemplate, { props: { title: 'Basic detail', details: body } });
    heading('Basic detail');
    cleanup();

    render(AdvancedDetailTemplate, { props: { title: 'Advanced detail', details: body, activity: body } });
    heading('Advanced detail');
    cleanup();

    render(ProfileTemplate, { props: { title: 'Profile', profile: body, activity: body } });
    heading('Profile');
    cleanup();

    render(ResultTemplate, { props: { status: 'success', title: 'Success' } });
    heading('Success');
    cleanup();

    render(ExceptionTemplate, { props: { status: 404 } });
    heading('Page not found');
  });
});