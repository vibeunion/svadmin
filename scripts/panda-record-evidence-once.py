"""Record only already-verified PR screenshots and migrate the obsolete README contract."""
from pathlib import Path
import io
import json
import os
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import zipfile

TESTED = '6fe9b80e4a5547c5a0135a8c71118deb1f03fefd'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD^'], text=True).strip() == TESTED

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

request = urllib.request.Request(
    'https://api.github.com/repos/vibeunion/svadmin/actions/artifacts/10574653456/zip',
    headers={'Authorization': 'Bearer ' + os.environ['GITHUB_TOKEN'], 'Accept': 'application/vnd.github+json'},
)
try:
    urllib.request.build_opener(NoRedirect).open(request, timeout=30)
    raise RuntimeError('Expected GitHub artifact redirect')
except urllib.error.HTTPError as error:
    assert error.code == 302, error.code
    location = error.headers['Location']
assert urllib.parse.urlsplit(location).scheme == 'https'
# Never forward the GitHub credential to the signed storage URL.
with urllib.request.urlopen(location, timeout=60) as response:
    archive = zipfile.ZipFile(io.BytesIO(response.read()))
provenance = json.loads(archive.read('panda-styles/provenance.json'))
assert provenance['testedCommit'] == TESTED
assert provenance['baselineCommit'] == 'cf6c4746578176ea773a17ef6f49f353292f7818'
assert provenance['failures'] == [] and provenance['pageErrors'] == []
assert len(provenance['checks']) == 6
assert all(check['defaultScreenshotsIdentical'] for check in provenance['checks'])
out = Path('docs/pr-evidence/panda-styles')
out.mkdir(parents=True, exist_ok=True)
for size in ['1440x900', '1920x1080', '390x844']:
    for mode in ['light', 'dark']:
        name = f'{size}-{mode}.png'
        content = archive.read('panda-styles/' + name)
        assert content.startswith(b'\x89PNG\r\n\x1a\n')
        (out / name).write_bytes(content)
(out / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')

p = Path('README.md')
s = p.read_text()
s = s.replace('### Tailwind CSS v4 Integration / Tailwind CSS v4 集成', '### Precompiled CSS Integration / 预生成 CSS 集成')
start = s.index('> **Important / 重要**: Tailwind CSS v4')
end = s.index('**1. Import the UI stylesheet', start)
s = s[:start] + '> **No host CSS compiler required / 消费端无需 CSS 编译器**: UI and AI Elements ship precompiled CSS. Import their styles once; do not install Tailwind or Panda just to use SVAdmin. Panda is used only when building the UI package from source.\n>\n> UI 与 AI Elements 发布预生成 CSS。消费端只需引入样式，不需要安装 Tailwind 或 Panda；Panda 仅用于从源码构建 UI 的语义 tokens / recipes。\n\n' + s[end:]
start = s.index('If an existing app still contains `@source')
end = s.index('**2. Configure Vite', start)
s = s[:start] + '''The plain CSS entry does not scan component sources. Remove obsolete SVAdmin `@source` directives. Existing hosts that intentionally use Tailwind v4 for their own application styles may opt into `@svadmin/ui/app.theme.css` instead of `app.css`, and `@svadmin/ai-elements/ai.theme.css` instead of `ai.css`. These legacy metadata entries do not make Tailwind a dependency of SVAdmin. Import only one entry per package.

普通 CSS 入口不扫描组件源码，请删除旧的 SVAdmin `@source` 指令。仍自行使用 Tailwind v4 的宿主，可将 UI 入口换为 `app.theme.css`，将 AI Elements 入口换为 `ai.theme.css`；每个包只引入一种入口。已编译的兼容类名和变量不应被批量删除。新样式请使用原生 CSS 或受控 recipes，而不是新增未经编译的工具类。

For the opt-in Surface semantic variants, also import `@svadmin/surface/styles.css` and follow [Surface styling](packages/surface/STYLING.md). The default `svadmin/v1` contract is unchanged.

''' + s[end:]
p.write_text(s)
