"""Construct the disjoint source-tree union; create Git objects only, no ref writes."""
import json
import os
import subprocess
import urllib.request

BASE = 'db24c47be854d3788edca6c86bf1b76940a6fd42'
MAIN = 'd9726c4a850768e7e30bdf62e18add6c9a856056'
SOURCE = '467ec8a8c36040d82eb4ebe0b091c685ac47248a'

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

def paths(ref):
    return set(git('diff', '--name-only', BASE, ref).splitlines())

ours, theirs = paths(SOURCE), paths(MAIN)
assert len(ours) == 24 and len(theirs) == 11, (len(ours), len(theirs))
assert not ours.intersection(theirs), sorted(ours.intersection(theirs))
assert not git('diff', '--name-only', '--diff-filter=DR', BASE, SOURCE)
assert not any(name.startswith('review-assets/') or 'enterprise-array-' in name for name in ours)
subprocess.run(['git', 'switch', '--detach', MAIN], check=True)
subprocess.run(['git', 'restore', '--source=' + SOURCE, '--staged', '--worktree', '--', *sorted(ours)], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
expected_tree = git('write-tree')
for name in theirs:
    assert git('rev-parse', ':' + name) == git('rev-parse', MAIN + ':' + name), name
assert set(git('diff', '--cached', '--name-only', MAIN).splitlines()) == ours
entries = []
for line in git('ls-tree', '-r', SOURCE, '--', *sorted(ours)).splitlines():
    metadata, name = line.split('\t', 1)
    mode, kind, sha = metadata.split()
    assert mode == '100644' and kind == 'blob', name
    entries.append({'path': name, 'mode': mode, 'type': kind, 'sha': sha})
assert len(entries) == 24
url = 'https://api.github.com/repos/vibeunion/svadmin'
headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'}
def api(path, value=None):
    request = urllib.request.Request(url + path, headers=headers, data=None if value is None else json.dumps(value).encode())
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)
main_commit = api('/git/commits/' + MAIN)
tree = api('/git/trees', {'base_tree': main_commit['tree']['sha'], 'tree': entries})
assert tree['sha'] == expected_tree, (tree['sha'], expected_tree)
commit = api('/git/commits', {'message': 'fix(ui): integrate array validation repairs with current main', 'tree': tree['sha'], 'parents': [SOURCE, MAIN]})
print(json.dumps({'head': commit['sha'], 'tree': tree['sha'], 'parents': [SOURCE, MAIN], 'source_files': sorted(ours), 'main_files_preserved': sorted(theirs), 'diff_check': 'passed', 'runtime': 'fresh combined-head PR CI required; no branch or main updated'}, indent=2))
