"""Retain unmodified, verified CI evidence. Creates Git objects only, never moves refs."""
from pathlib import PurePosixPath
import base64
import hashlib
import io
import json
import os
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import zipfile

HEAD = os.environ['SOURCE_HEAD']
RUN_ID = int(os.environ['EVIDENCE_RUN_ID'])
assert re.fullmatch('[0-9a-f]{40}', HEAD)
API = 'https://api.github.com/repos/vibeunion/svadmin'
HEADERS = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'}

def api(path, payload=None):
    request = urllib.request.Request(API + path, headers=HEADERS, data=None if payload is None else json.dumps(payload).encode())
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

run = api(f'/actions/runs/{RUN_ID}')
require(run['head_sha'] == HEAD, 'Run belongs to a different source head')
require(run['event'] == 'pull_request' and run['path'] == '.github/workflows/enterprise-ui.yml', 'Unexpected workflow origin')
require(run['status'] == 'completed' and run['conclusion'] == 'success', 'Evidence run has not passed')
items = api(f'/actions/runs/{RUN_ID}/artifacts?per_page=100')['artifacts']
artifacts = [item for item in items if item['name'] == 'enterprise-ui-evidence' and not item['expired']]
require(len(artifacts) == 1, 'Expected one current Enterprise evidence artifact')
artifact = artifacts[0]
require(artifact['workflow_run']['head_sha'] == HEAD, 'Artifact source mismatch')
require(artifact['size_in_bytes'] < 250_000_000, 'Oversized evidence archive')

# Authenticate only to GitHub. Do not forward the token to signed object storage.
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect())
request = urllib.request.Request(API + f"/actions/artifacts/{artifact['id']}/zip", headers=HEADERS)
try:
    with opener.open(request, timeout=60) as response:
        archive_bytes = response.read(250_000_001)
except urllib.error.HTTPError as error:
    require(error.code == 302, 'Artifact download failed')
    location = error.headers['Location']
    target = urllib.parse.urlparse(location)
    require(target.scheme == 'https' and target.hostname is not None and (
        target.hostname.endswith('.blob.core.windows.net') or target.hostname.endswith('.actions.githubusercontent.com')
        or target.hostname.endswith('.githubusercontent.com')), 'Unexpected artifact download host')
    with urllib.request.urlopen(location, timeout=120) as response:
        archive_bytes = response.read(250_000_001)
require(len(archive_bytes) <= 250_000_000, 'Oversized artifact response')
digest = hashlib.sha256(archive_bytes).hexdigest()
require(artifact.get('digest') == 'sha256:' + digest, 'Archive digest does not match GitHub metadata')
archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
require(sum(info.file_size for info in archive.infolist()) < 500_000_000, 'Oversized uncompressed evidence')
for name in archive.namelist():
    path = PurePosixPath(name)
    require(not path.is_absolute() and '..' not in path.parts, 'Unsafe archive path')

def read(name):
    require(archive.namelist().count(name) == 1, 'Missing or duplicate evidence file: ' + name)
    return archive.read(name)

require(read('commit.txt').decode().strip() == HEAD, 'Recorded tested checkout differs from source head')
require(not read('diff-check.txt').strip(), 'Whitespace report contains errors')
unit = json.loads(read('unit-results.json'))
require(unit.get('success') is True and unit.get('numTotalTests') == 185 and unit.get('numPassedTests') == 185, 'Expected all 185 unit and component tests to pass')
require(unit.get('numFailedTests', 0) == 0 and unit.get('numPendingTests', 0) == 0, 'Failed or pending unit tests')
browser = json.loads(read('browser-results.json'))
stats = browser['stats']
require(stats.get('expected') == 10 and all(stats.get(key, 0) == 0 for key in ['unexpected', 'flaky', 'skipped']), 'Browser acceptance is not 10 clean passes')
require(not browser.get('errors'), 'Global browser errors')
results = []
def visit(suite):
    for spec in suite.get('specs', []):
        for test in spec.get('tests', []):
            result = test.get('results', [])
            require(len(result) == 1 and result[0]['status'] == 'passed' and result[0].get('retry', 0) == 0, 'Retried or non-passing browser test')
            results.append(spec['title'])
    for child in suite.get('suites', []):
        visit(child)
for suite in browser['suites']:
    visit(suite)
require(len(results) == 10, 'Unexpected browser test count')

source_hashes = {}
for line in read('source-sha256.txt').decode().splitlines():
    checksum, name = line.split(None, 1)
    name = name.strip()
    require(re.fullmatch('[0-9a-f]{64}', checksum) is not None, 'Invalid source hash')
    require(name.startswith('packages/ui/src/components/') and '..' not in PurePosixPath(name).parts, 'Unexpected source path')
    content = subprocess.check_output(['git', 'show', f'{HEAD}:{name}'])
    require(hashlib.sha256(content).hexdigest() == checksum, 'Source hash mismatch: ' + name)
    source_hashes[name] = checksum
require(len(source_hashes) >= 7, 'Incomplete source provenance')

prefix = f'docs/pr-evidence/enterprise-{HEAD[:8]}'
retained = {}
captures = []
for width, height in [(1440, 900), (1920, 1080), (390, 844)]:
    for theme in ['light', 'dark']:
        for state in ['ready', 'invalid']:
            filename = f'{state}-{width}x{height}-{theme}.png'
            content = read('screenshots/' + filename)
            require(content[:8] == b'\x89PNG\r\n\x1a\n' and content[12:16] == b'IHDR', 'Invalid PNG: ' + filename)
            bitmap_width = int.from_bytes(content[16:20], 'big')
            bitmap_height = int.from_bytes(content[20:24], 'big')
            require(bitmap_width == width and bitmap_height >= height, 'Unexpected full-page screenshot dimensions')
            retained[prefix + '/' + filename] = content
            captures.append({'file': filename, 'viewport': [width, height], 'bitmap': [bitmap_width, bitmap_height], 'sha256': hashlib.sha256(content).hexdigest(), 'theme': theme, 'state': state})

source_commit = api('/git/commits/' + HEAD)
provenance = {'source_head': HEAD, 'source_tree': source_commit['tree']['sha'], 'run_id': RUN_ID, 'run_url': run['html_url'], 'artifact_id': artifact['id'], 'archive_sha256': digest, 'source_hashes': source_hashes, 'unit_tests': {'passed': 185, 'failed': 0, 'pending': 0}, 'browser': {'passed': 10, 'failed': 0, 'flaky': 0, 'skipped': 0, 'test_titles': results}, 'captures': captures, 'boundaries': 'Unmodified synthetic production-browser fixture captures, full-page bitmaps under the stated viewports. Not deployed customer data, Figma synchronization or independent-human visual/accessibility certification. This helper creates evidence-only Git objects; no implementation ref or main is updated.'}
retained[prefix + '/provenance.json'] = (json.dumps(provenance, indent=2, ensure_ascii=False) + '\n').encode()
for name in ['unit-results.json', 'browser-results.json', 'source-sha256.txt', 'commit.txt', 'diff-check.txt', 'diff-stat.txt']:
    retained[prefix + '/' + name] = read(name)
entries = []
for name, content in retained.items():
    blob = api('/git/blobs', {'content': base64.b64encode(content).decode(), 'encoding': 'base64'})
    entries.append({'path': name, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
tree = api('/git/trees', {'base_tree': source_commit['tree']['sha'], 'tree': entries})
commit = api('/git/commits', {'message': f'docs: retain verified enterprise browser evidence for {HEAD[:8]}', 'tree': tree['sha'], 'parents': [HEAD]})
print(json.dumps({'evidence_commit': commit['sha'], 'evidence_tree': tree['sha'], 'prefix': prefix, 'run_id': RUN_ID, 'artifact_id': artifact['id'], 'archive_sha256': digest, 'unit_passed': 185, 'browser_passed': 10, 'captures': captures}, indent=2))
