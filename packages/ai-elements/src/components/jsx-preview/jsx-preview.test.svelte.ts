import { Type } from '@sinclair/typebox';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  defineJSXPreviewComponent as defineJSXPreviewComponentFromRoot,
  defineJSXPreviewSnippet as defineJSXPreviewSnippetFromRoot,
  parseJSXPreview as parseJSXPreviewFromRoot,
  type JSXPreviewSchemaProps as RootJSXPreviewSchemaProps,
} from '../../index.js';
import Host from './JSXPreview.test-host.svelte';
import { completeJsxTags } from './completeJsxTags.js';
import { parseJSXPreview, type JSXPreviewSchemaProps } from './parser.js';

afterEach(cleanup);

describe('JSXPreview parser', () => {
  it('exports the TypeBox registry API from the package root', () => {
    expect(defineJSXPreviewComponentFromRoot).toBeTypeOf('function');
    expect(defineJSXPreviewSnippetFromRoot).toBeTypeOf('function');
    expect(parseJSXPreviewFromRoot).toBe(parseJSXPreview);
  });

  it('derives closed registered-component props from the TypeBox schema', () => {
    const schema = Type.Object({ count: Type.Number() });
    expect(schema).toBeDefined();
    type LocalProps = JSXPreviewSchemaProps<typeof schema>;
    type RootProps = RootJSXPreviewSchemaProps<typeof schema>;

    expectTypeOf<LocalProps>().toEqualTypeOf<RootProps>();
    expectTypeOf<keyof LocalProps>().toEqualTypeOf<'children' | 'count'>();
  });

  it('parses nested intrinsic elements and safe binding paths without evaluating code', () => {
    const result = parseJSXPreview(
      '<article className="result"><h2>{user.name}</h2><p>{items[0]} &amp; safe</p></article>',
      { bindings: { user: { name: 'Ada' }, items: ['reviewed'] } },
    );

    expect(result).toMatchObject({
      ok: true,
      nodes: [{
        name: 'article',
        props: { class: 'result' },
        children: [
          { name: 'h2', children: [{ value: 'Ada' }] },
          { name: 'p', children: [{ value: 'reviewed' }, { value: ' & safe' }] },
        ],
      }],
    });
  });

  it('rejects executable expressions, dangerous elements, and unsafe URLs', () => {
    expect(parseJSXPreview('<div>{globalThis.alert(1)}</div>').ok).toBe(false);
    expect(parseJSXPreview('<script>danger()</script>').ok).toBe(false);
    expect(parseJSXPreview('<a href="javascript:alert(1)">Unsafe</a>').ok).toBe(false);
    expect(parseJSXPreview('<img src="x" onerror="alert(1)" />').ok).toBe(false);
    expect(parseJSXPreview('<button popovertarget="host-dialog">Open host dialog</button>').ok).toBe(false);
    expect(parseJSXPreview('<button commandfor="host-dialog">Control host dialog</button>').ok).toBe(false);
  });

  it('neutralizes form-associated attributes and submit controls', () => {
    const result = parseJSXPreview(
      '<form id="preview"><label htmlFor="host-field">Role</label><input name="role" form="host-form" type="submit" /><button type="submit">Save</button></form>',
    );

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw result.error;
    const [form] = result.nodes;
    expect(form).toMatchObject({ type: 'element', name: 'form' });
    if (!form || form.type !== 'element') throw new Error('Expected a form preview node.');
    expect(form.props).toEqual({ id: 'preview' });
    const [label, input, button] = form.children.filter((node) => node.type === 'element');
    expect(label?.props).toEqual({});
    expect(input?.props).toMatchObject({ type: 'text' });
    expect(input?.props).not.toHaveProperty('name');
    expect(input?.props).not.toHaveProperty('form');
    expect(button?.props).toMatchObject({ type: 'button' });
  });

  it('requires TypeBox schemas and rejects invalid registered component props', () => {
    const component = (() => undefined) as never;
    const components = {
      Card: {
        component,
        schema: Type.Object({ count: Type.Number() }),
      },
    };

    expect(parseJSXPreview('<Card count={2} />', { components }).ok).toBe(true);
    expect(parseJSXPreview('<Card count="two" />', { components }).ok).toBe(false);
    expect(parseJSXPreview('<Card count={2} secret="blocked" />', { components }).ok).toBe(false);
    expect(parseJSXPreview('<Card count={2} />', {
      components: { Card: { component } } as never,
    }).ok).toBe(false);
  });

  it('completes streamed tags without retaining a partial attribute', () => {
    expect(completeJsxTags('<div><p>Done</p><span className="part')).toBe('<div><p>Done</p></div>');
    expect(completeJsxTags("<><div>{'<span>'}</div>")).toBe("<><div>{'<span>'}</div></>");
  });
});

describe('JSXPreview rendering', () => {
  it('renders intrinsic HTML and escapes markup supplied through bindings', () => {
    const { container } = render(Host, {
      jsx: '<div><strong>{title}</strong><p>{unsafe}</p></div>',
      bindings: {
        title: 'Generated result',
        unsafe: '<img src=x onerror=alert(1)>',
      },
    });

    expect(screen.getByText('Generated result').tagName).toBe('STRONG');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders registered Svelte components and snippet components with binding props', async () => {
    const onactivate = vi.fn();
    render(Host, {
      jsx: '<Card title={title} count={count} onactivate={activate}><Badge tone="info">Ready</Badge></Card>',
      bindings: { title: 'Deployment', count: 3, activate: onactivate },
    });

    expect(screen.getByTestId('custom-card')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Deployment' })).not.toBeNull();
    expect(screen.getByLabelText('Card count').textContent).toBe('3');
    expect(screen.getByTestId('snippet-badge').getAttribute('data-tone')).toBe('info');
    expect(screen.getByText('Ready')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    expect(onactivate).toHaveBeenCalledOnce();
  });

  it('auto-completes streaming JSX and falls back to the last successful render', async () => {
    const view = render(Host, {
      jsx: '<div><span>Streaming',
      isStreaming: true,
    });
    expect(screen.getByText('Streaming')).not.toBeNull();

    await view.rerender({
      jsx: '<div><span>Broken</div>',
      isStreaming: true,
    });

    await waitFor(() => expect(screen.getByText('Streaming')).not.toBeNull());
    expect(screen.queryByText('Broken')).toBeNull();
    expect(screen.queryByTestId('preview-error')).toBeNull();
  });

  it('reports non-streaming errors once and does not render unsafe content', async () => {
    const onerror = vi.fn();
    const view = render(Host, {
      jsx: '<iframe src="https://example.test"></iframe>',
      onerror,
    });

    await waitFor(() => expect(onerror).toHaveBeenCalledOnce());
    expect(screen.getByTestId('preview-error').textContent).toContain('Unsupported intrinsic element');
    expect(view.container.querySelector('iframe')).toBeNull();

    await view.rerender({
      jsx: '<iframe src="https://example.test"></iframe>',
      onerror,
    });
    expect(onerror).toHaveBeenCalledOnce();
  });

  it('cannot submit or inject fields into a host form', async () => {
    const onsubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const { container } = render(Host, {
      jsx: '<form><input name="role" value="admin" /><button type="submit">Submit preview</button></form>',
      wrapInForm: true,
      onsubmit,
    });

    const preview = container.querySelector('[aria-label="Generated JSX preview"]');
    const input = preview?.querySelector('input');
    const hostForm = container.querySelector<HTMLFormElement>('#host-form');
    expect(input?.getAttribute('name')).toBeNull();
    expect(input?.getAttribute('form')).toMatch(/-isolated-form$/);
    expect(hostForm?.elements.namedItem('role')).toBeNull();
    expect(preview?.querySelector('button')?.getAttribute('type')).toBe('button');
    await fireEvent.click(preview?.querySelector('button') as HTMLButtonElement);
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('isolates form controls rendered by registered Svelte components', async () => {
    const onsubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const { container } = render(Host, {
      jsx: '<FormCard label="Generated role" />',
      wrapInForm: true,
      onsubmit,
    });

    const hostForm = container.querySelector<HTMLFormElement>('#host-form');
    const customForm = screen.getByTestId('custom-form-card');
    const input = customForm.querySelector('input');
    const button = screen.getByRole('button', { name: 'Submit custom' });
    await waitFor(() => expect(input?.getAttribute('form')).toMatch(/-isolated-form$/));

    expect(input?.getAttribute('name')).toBeNull();
    expect(hostForm?.elements.namedItem('customRole')).toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    await fireEvent.click(button);
    expect(onsubmit).not.toHaveBeenCalled();
  });
});
