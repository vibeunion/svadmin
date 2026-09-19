from pathlib import Path
import json
import os
import subprocess
import urllib.request

HEAD = '034eb737b1ad4caca02fcd42c5f83559aaedb592'

def edit(path, before, after):
    p = Path(path)
    text = p.read_text()
    if text.count(before) != 1:
        raise RuntimeError(f'{path}: anchor count is {text.count(before)}: {before[:80]}')
    p.write_text(text.replace(before, after))

form = 'packages/ui/src/components/JsonSchemaForm.svelte'
edit(form, '      internalValue = writeSchemaFormPath(prepared.value, path, nextValue);\n      value = internalValue;', '''      value = writeSchemaFormPath(prepared.value, path, nextValue);
      // Capture the actual bindable value after Svelte wraps it, not its raw source.
      internalValue = value;''')

tests = 'packages/ui/src/components/filter-builder.test.svelte.ts'
edit(tests, "import FilterBuilder from './FilterBuilder.svelte';", "import FilterBuilder from './FilterBuilder.svelte';\nimport FilterBuilderLocale from './FilterBuilderLocale.test.svelte';")
edit(tests, """  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [],
    });""", """  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilderLocale, {
      fields: testFields,
      locale: 'zh',
    });""")

builder = 'packages/ui/src/components/FilterBuilder.svelte'
edit(builder, '''            {:else}
              <Input id={`${uid}-${node.id}-value`} type={!collection && field?.type === 'number' ? 'number' : 'text'} step="any" aria-invalid={invalid} value={valueText(node.value)} placeholder={collection ? '[1, 2]' : ''}
                oninput={(event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />''', '''            {:else if !collection && field?.type === 'number'}
              <Input id={`${uid}-${node.id}-value`} type="number" step="any" aria-invalid={invalid} value={typeof node.value === 'number' ? node.value : undefined}
                oninput={(event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />
            {:else}
              <Input id={`${uid}-${node.id}-value`} type="text" aria-invalid={invalid} value={valueText(node.value)} placeholder={collection ? '[1, 2]' : ''}
                oninput={(event) => { if (event.currentTarget instanceof HTMLInputElement) changeValue(node, event.currentTarget.value); }} />''')

adapter = 'packages/ui/src/components/enterprise/recursive-schema-form.ts'
edit(adapter, "      function bound(key: string): number | undefined {\n        const value = raw[key];", "      const definition = raw;\n      function bound(key: string): number | undefined {\n        const value = definition[key];")

p = Path('packages/ui/src/components/enterprise-components.test.svelte.ts')
p.write_text(p.read_text() + '''

describe('recursive form parse-error ownership', () => {
  it('retains an invalid numeric draft across sibling edits until that field is corrected', async () => {
    const onsubmit = vi.fn(), onvalidationerror = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit, onvalidationerror });
    const amount = input(view.container, '[name="amount"]');
    Object.defineProperty(amount, 'validity', { value: { badInput: true }, configurable: true });
    await fireEvent.input(amount, { target: { value: '' } });
    await fireEvent.change(input(view.container, '[name="enabled"]'), { target: { checked: true } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onvalidationerror).toHaveBeenCalledWith(expect.arrayContaining([{ path: '/amount', code: 'invalid-value' }]));
    Object.defineProperty(amount, 'validity', { value: { badInput: false }, configurable: true });
    await fireEvent.input(amount, { target: { value: '0' } });
    await fireEvent.submit(view.getByTestId('json-schema-form'));
    expect(onsubmit).toHaveBeenCalledWith({ amount: 0, enabled: true, plan: 1 });
  });
});
''')
subprocess.run(['git', 'diff', '--check'], check=True)
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
expected = [form, tests, builder, adapter, str(p)]
if set(changed) != set(expected):
    raise RuntimeError('Unexpected file set')

# Upload Git objects only. The connected GitHub writer performs the guarded ref update.
base_url = 'https://api.github.com/repos/vibeunion/svadmin'
headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'}
def api(path, value=None):
    request = urllib.request.Request(base_url + path, headers=headers, data=None if value is None else json.dumps(value).encode())
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)
base = api('/git/commits/' + HEAD)
tree = api('/git/trees', {'base_tree': base['tree']['sha'], 'tree': [
    {'path': name, 'mode': '100644', 'type': 'blob', 'content': Path(name).read_text()} for name in changed
]})
commit = api('/git/commits', {'message': 'fix(ui): preserve form error ownership and strict input contracts', 'tree': tree['sha'], 'parents': [HEAD]})
print('CANDIDATE_HEAD=' + commit['sha'])
print('CANDIDATE_TREE=' + tree['sha'])
print('PARENT=' + HEAD)
print('No branch ref was updated. Runtime and strict checks remain required.')
