"""真实 Chromium 中测试插件 iframe；宿主 Plugin API 是合成替身，不是真实 Figma 验收。
运行前准备插件产物：prepare-plugin.mjs --id TEST_NUMERIC_ID --out NEW_DIR
需要本地已有 playwright 与 Chromium；不是运行工具的依赖。
"""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--plugin', type=Path, required=True)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    args = parser.parse_args()
    args.evidence.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parents[1]
    core = (root / 'core.cjs').read_text()
    runtime = (root / 'runtime.cjs').read_text()
    fixtures = (root / 'test/fixtures.cjs').read_text()
    ui = (args.plugin / 'ui.html').read_text()
    blueprint = (root / 'demo.blueprint.json').read_bytes()
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
        for width, height, theme in [(480,740,'light'),(480,740,'dark'),(390,844,'light'),(390,844,'dark')]:
            page = browser.new_page(viewport={'width': width, 'height': height}, color_scheme=theme, accept_downloads=True)
            requests, errors = [], []
            page.set_default_timeout(5000)
            page.on('request', lambda req: requests.append(req.url))
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.set_content('<!doctype html><style>body{margin:0}iframe{border:0;width:100vw;height:100vh}</style><iframe title="Plugin UI"></iframe>')
            page.add_script_tag(content=core)
            page.add_script_tag(content=runtime)
            page.add_script_tag(content=fixtures)
            page.evaluate("""() => {
              const frame = document.querySelector('iframe');
              window.mock = FigmaOfflineFixtures.createMock({ onMessage: msg => frame.contentWindow.postMessage({pluginMessage:msg}, '*') });
              window.engine = FigmaOfflineRuntime.createRuntime(mock.figma, () => '2026-09-19T00:00:00Z');
              window.received = [];
              window.addEventListener('message', event => {
                if (event.source !== frame.contentWindow || !event.data.pluginMessage) return;
                received.push(event.data.pluginMessage);
                if (!window.holdMessages) engine.handle(event.data.pluginMessage);
              });
            }""")
            theme_css = (':root{--figma-color-text:#ededee;--figma-color-bg:#18191c;--figma-color-bg-secondary:#27292e;--figma-color-border:#676a72;--figma-color-border-brand:#98a7ff;}' if theme == 'dark' else '')
            page.locator('iframe').evaluate('(frame, html) => { frame.srcdoc = html; }', ui.replace('<style>', '<style>' + theme_css))
            frame = page.frame_locator('iframe')
            frame.locator('#export').wait_for()
            assert frame.locator('#confirm').is_disabled()
            # 真正跨 iframe 发送消息到同一运行时代码，再下载完整导出 JSON。
            frame.locator('#export').click()
            frame.locator('#download:not([disabled])').wait_for()
            with page.expect_download() as event:
                frame.locator('#download').click()
            downloaded = event.value
            export_path = args.evidence / f'ui-{width}-{theme}.svfig.json'
            downloaded.save_as(export_path)
            bundle = json.loads(export_path.read_text())
            assert bundle['format'] == 'svadmin/figma-export-v1'
            assert len(bundle['nodes']) == 1 and len(bundle['assets']) == 1
            assert page.evaluate('mock.calls.filter(c => c[0].startsWith("create")).length') == 0
            # 导出结构不能作为可写蓝图；攻击文案不变为可执行 HTML。
            frame.locator('#blueprint').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer': json.dumps(bundle).encode()})
            frame.locator('#status').filter(has_text='unexpected key').wait_for()
            assert frame.locator('#confirm').is_disabled()
            # 有效蓝图先预览，不自动写画布；确认必须显式勾选。
            frame.locator('#blueprint').set_input_files({'name':'demo.blueprint.json','mimeType':'application/json','buffer':blueprint})
            frame.locator('#consent:not([disabled])').wait_for()
            assert page.evaluate('mock.calls.filter(c => c[0].startsWith("create")).length') == 0
            assert frame.locator('#confirm').is_disabled()
            frame.locator('#consent').check()
            frame.locator('#confirm').click()
            frame.locator('#status').filter(has_text='导入操作已返回').wait_for()
            assert page.evaluate('mock.figma.root.children.length') == 2
            assert page.evaluate('mock.variables.size') == 7
            # stale stage 在取消后不可提交。
            frame.locator('#blueprint').set_input_files({'name':'demo.blueprint.json','mimeType':'application/json','buffer':blueprint})
            frame.locator('#consent:not([disabled])').wait_for()
            frame.locator('#cancel').click()
            frame.locator('#status').filter(has_text='已取消').wait_for()
            assert frame.locator('#confirm').is_disabled()
            # 冒充旧响应不能解锁本次请求；数据中的 HTML 只能作为文本显示。
            page.evaluate('window.holdMessages = true')
            frame.locator('#blueprint').set_input_files({'name':'demo.blueprint.json','mimeType':'application/json','buffer':blueprint})
            page.wait_for_function('received.at(-1).type === "stage"')
            latest = page.evaluate('received.at(-1).requestId')
            page.evaluate("""() => document.querySelector('iframe').contentWindow.postMessage({pluginMessage:{type:'staged',requestId:'old',stageId:'bad',summary:{},target:'bad'}},'*')""")
            page.wait_for_timeout(50)
            assert frame.locator('#consent').is_disabled()
            page.evaluate("""id => document.querySelector('iframe').contentWindow.postMessage({pluginMessage:{type:'error',requestId:id,message:'<img src=x onerror="window.attack=true">'}},'*')""", latest)
            frame.locator('#status').filter(has_text='<img').wait_for()
            assert frame.locator('#status img').count() == 0
            assert frame.locator('#confirm').is_disabled()
            assert frame.locator('body').evaluate('el => el.scrollWidth <= document.documentElement.clientWidth')
            frame.locator('#export').focus()
            page.keyboard.press('Shift+Tab')
            page.keyboard.press('Tab')
            assert frame.locator('#export').evaluate('el => el === document.activeElement && getComputedStyle(el).outlineStyle !== "none"')
            shot = args.evidence / f'plugin-ui-{width}-{theme}.png'
            page.screenshot(path=str(shot))
            assert not requests, requests
            assert not errors, errors
            results.append({'width':width,'height':height,'theme':theme,'status':'passed','networkRequests':requests,'pageErrors':errors,'screenshot':shot.name,'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()})
            page.close()
        browser.close()
    report = {'environment':'Real Chromium / synthetic Figma Plugin API host; NOT real Figma acceptance', 'cases':results, 'blueprintSha256':hashlib.sha256(blueprint).hexdigest(), 'uiSha256':hashlib.sha256(ui.encode()).hexdigest()}
    (args.evidence / 'ui-browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'passed':len(results),'failed':0,'realFigma':False}))


if __name__ == '__main__':
    main()
