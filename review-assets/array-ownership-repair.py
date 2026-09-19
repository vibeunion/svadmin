from pathlib import Path
import json, os, subprocess, urllib.request

HEAD = 'a21bdfc8121715f5d148454657daf687f17e2414'
assets = Path(os.environ['REVIEW_ASSETS'])
form = Path('packages/ui/src/components/JsonSchemaForm.svelte')
text = form.read_text()
before = '''  function writePath(path: string[], nextValue: unknown): void {
    if (!editable() || !prepared.ok || pathReadonly(path)) return;
    try {
      value = writeSchemaFormPath(prepared.value, path, nextValue);
      // Capture the actual bindable value after Svelte wraps it, not its raw source.
      internalValue = value;
      failure = null;
      validationIssues = [];
    }
    catch { failure = 'invalid'; }
  }'''
after = '''  function writePath(path: string[], nextValue: unknown): boolean {
    if (!editable() || !prepared.ok || pathReadonly(path)) return false;
    try {
      value = writeSchemaFormPath(prepared.value, path, nextValue);
      // Capture the actual bindable value after Svelte wraps it, not its raw source.
      internalValue = value;
      failure = null;
      validationIssues = [];
      return true;
    }
    catch { failure = 'invalid'; return false; }
  }'''
assert text.count(before) == 1
text = text.replace(before, after)
before = '''  function removeArrayItem(path: string[], index: number): void {
    if (!editable()) return;
    const current = readPath(path);
    if (Array.isArray(current)) writePath(path, current.filter((_, itemIndex) => itemIndex !== index));
  }'''
after = '''  function removeArrayItem(path: string[], index: number): void {
    if (!editable()) return;
    const current = readPath(path);
    if (!Array.isArray(current) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) return;
    const prefix = schemaFormPointer(path) + '/';
    const nextIssues = parseIssues.flatMap(issue => {
      if (!issue.path.startsWith(prefix)) return [issue];
      const tail = issue.path.slice(prefix.length);
      const separator = tail.indexOf('/');
      const segment = separator < 0 ? tail : tail.slice(0, separator);
      if (!/^(0|[1-9][0-9]*)$/u.test(segment)) return [issue];
      const itemIndex = Number(segment);
      if (itemIndex === index) return [];
      if (itemIndex < index) return [issue];
      return [{ ...issue, path: prefix + String(itemIndex - 1) + (separator < 0 ? '' : tail.slice(separator)) }];
    });
    // Retire only the removed item's error and shift surviving descendants with their
    // array item. A rejected readonly/disabled write must not clear any error.
    if (writePath(path, current.filter((_, itemIndex) => itemIndex !== index))) parseIssues = nextIssues;
  }'''
assert text.count(before) == 1
form.write_text(text.replace(before, after))

probe = (assets / 'array-parse-probe.test.svelte.ts').read_text()
probe = probe[probe.index('const schema ='):]
probe = probe.replace('const schema =', 'const arrayOwnershipSchema =').replace('{ schema,', '{ schema: arrayOwnershipSchema,')
probe = probe.replace('numberInput', 'arrayOwnershipNumberInput')
probe = probe.replace("    await fireEvent.click(view.getAllByRole('button', { name: 'Remove', exact: true })[0]!);", "    const removeButton = view.getAllByRole('button', { name: 'Remove', exact: true })[0];\n    if (!removeButton) throw new Error('Missing array removal control');\n    await fireEvent.click(removeButton);")
probe = probe.replace('    expect(onsubmit).toHaveBeenCalledExactlyOnceWith(', '    expect(onsubmit).toHaveBeenCalledTimes(1);\n    expect(onsubmit).toHaveBeenCalledWith(')
tests = Path('packages/ui/src/components/enterprise-components.test.svelte.ts')
assert "describe('array parse-error ownership'" not in tests.read_text()
tests.write_text(tests.read_text() + '\n' + probe)
docs = Path('docs/architecture/enterprise-ui-reconciliation.md')
docs.write_text(docs.read_text() + '\nArray-item removal retires parse errors belonging to the removed item and reindexes errors for surviving descendants. An invalid numeric draft cannot become a stale blocker on a deleted path or silently become valid when a previous row is removed. A rejected readonly/disabled write leaves errors unchanged. These are actual recursive component regressions, not a relaxation of input validation.\n')
subprocess.run(['git', 'diff', '--check'], check=True)
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
assert set(changed) == {str(form), str(tests), str(docs)}, changed

# Create only candidate Git objects. No branch update or bypass of the normal PR checks.
base_url = 'https://api.github.com/repos/vibeunion/svadmin'
headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'}
def api(path, value=None):
    request = urllib.request.Request(base_url + path, headers=headers, data=None if value is None else json.dumps(value).encode())
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)
base = api('/git/commits/' + HEAD)
tree = api('/git/trees', {'base_tree': base['tree']['sha'], 'tree': [
    {'path': name, 'mode': '100644', 'type': 'blob', 'content': Path(name).read_text()} for name in changed
]})
commit = api('/git/commits', {'message': 'fix(ui): retain numeric error ownership across array item removal', 'tree': tree['sha'], 'parents': [HEAD]})
print('CANDIDATE_HEAD=' + commit['sha'])
print('CANDIDATE_TREE=' + tree['sha'])
print('PARENT=' + HEAD)
