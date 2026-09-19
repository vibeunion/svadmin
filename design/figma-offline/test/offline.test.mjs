import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync, symlinkSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import C from '../core.cjs';
import { createRuntime } from '../runtime.cjs';
import { analyze, assetExtension } from '../analyze.mjs';
import { preparePlugin } from '../prepare-plugin.mjs';
import fixtures from './fixtures.cjs';
const { blueprint, createMock, PNG } = fixtures;
const fixture = async options => { const mock = createMock(options); const runtime = createRuntime(mock.figma, () => '2026-09-19T00:00:00Z'); return { ...mock, runtime, ...(await runtime.exportSelection({ includePreviews: true })) }; };
const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'svadmin-figma-'));

test('selected export preserves official response and references without writes', async () => {
  const f = await fixture(); assert.equal(f.summary.nodes, 1); assert.equal(f.summary.variables, 1); assert.equal(f.summary.assets, 1);
  assert.deepEqual(f.bundle.nodes[0].document, f.selected.raw); assert.deepEqual(f.bundle.nodes[0].rest.document, f.selected.raw);
  assert.equal(f.bundle.rights.redistributionApproved, false); assert.equal(f.calls.filter(c => c[0].startsWith('create')).length, 0);
});
test('REST nodes-map response supported', async () => { const f = await fixture({ restMap: true }); assert.equal(f.bundle.nodes[0].document.id, f.selected.id); });
test('unknown REST shape fails closed', () => assert.throws(() => C.documents({}, 'x'), /Unsupported/));
test('empty selection refused', async () => { const f = createMock(); f.page.selection = []; await assert.rejects(createRuntime(f.figma).exportSelection(), /Select/); });
test('overlapping selection keeps only owning root', () => { const p = { id: 'p' }, c = { id: 'c', parent: p }; assert.deepEqual(C.rootsOnly([p, c]), [p]); });
test('node preflight refuses oversized selections before exportAsync', async () => { const f = createMock(); f.selected.children = Array.from({ length: 5001 }, () => ({ children: [] })); await assert.rejects(createRuntime(f.figma).exportSelection(), /budget/); assert.equal(f.calls.length, 0); });
test('unreferenced variables are opt-in', async () => {
  const f = createMock(); f.variables.set('secret', { ...f.variables.get('v-original'), id: 'secret', name: 'Not selected' });
  const r = createRuntime(f.figma); assert.equal((await r.exportSelection()).bundle.variables.items.length, 1);
  assert.equal((await r.exportSelection({ includeAllLocalTokens: true })).bundle.variables.items.length, 2);
});
test('collect alias closure and explicit cycles without infinite loop', async () => {
  const f = createMock(), original = f.variables.get('v-original'); original.valuesByMode.m = { type: 'VARIABLE_ALIAS', id: 'v-second' };
  f.variables.set('v-second', { ...original, id: 'v-second', valuesByMode: { m: { type: 'VARIABLE_ALIAS', id: 'v-original' } } });
  const { bundle } = await createRuntime(f.figma).exportSelection(); assert.equal(bundle.variables.items.length, 2); assert.ok(C.diagnostics(bundle).some(w => w.code === 'ALIAS_CYCLE'));
});
test('missing remote variables produce warnings', async () => { const f = createMock(); f.variables.clear(); const { bundle } = await createRuntime(f.figma).exportSelection(); assert.ok(C.diagnostics(bundle).some(w => w.code === 'MISSING_VARIABLE')); });
test('referenced styles introduce variable and image dependencies', async () => {
  const f = createMock(); f.selected.raw.styles = { fill: 'paint' }; f.styleMap.set('paint', { id: 'paint', name: 'Image fill', type: 'PAINT', paints: [{ type: 'IMAGE', imageHash: 'image-1' }] });
  const { bundle } = await createRuntime(f.figma).exportSelection({ includeImages: true }); assert.equal(bundle.assets.length, 1); assert.equal(bundle.styles.length, 1); assert.equal(bundle.assets[0].kind, 'image');
});
test('failed preview is reported not represented as success', async () => {
  const f = createMock(); const original = f.selected.exportAsync; f.selected.exportAsync = async s => { if (s.format === 'PNG') throw new Error('failure'); return original(s); };
  const { bundle } = await createRuntime(f.figma).exportSelection({ includePreviews: true }); assert.equal(bundle.assets.length, 0); assert.ok(bundle.warnings.some(w => w.code === 'PREVIEW_UNAVAILABLE'));
});
test('preview cap uses longest dimension and an sRGB PNG', async () => { const f = createMock(); f.selected.width = 3200; await createRuntime(f.figma).exportSelection({ includePreviews: true }); const c = f.calls.find(c => c[1].format === 'PNG')[1]; assert.equal(c.constraint.value, .5); assert.equal(c.colorProfile, 'SRGB'); });
test('page switch while exporting fails', async () => { const f = createMock(); const original = f.selected.exportAsync; f.selected.exportAsync = async c => { f.figma.currentPage = { id: 'other' }; return original(c); }; await assert.rejects(createRuntime(f.figma).exportSelection(), /Page changed/); });
test('export options reject arbitrary keys and nonbooleans', async () => { const f = createMock(), r = createRuntime(f.figma); await assert.rejects(r.exportSelection({ url: 'https://invalid' }), /Invalid/); await assert.rejects(r.exportSelection({ includeImages: 'yes' }), /flag/); });
test('base64 encoder works without Buffer or btoa', () => { for (let n = 0; n < 20; n++) { const b = Uint8Array.from({length:n},(_,i)=>i*17%256); assert.equal(C.encode64(b), Buffer.from(b).toString('base64')); } });

for (const [name, mutate, pattern] of [
  ['unknown format', b => b.format = 'figma', /format/],
  ['fake license approval', b => b.rights.redistributionApproved = true, /rights/],
  ['empty roots', b => b.nodes = [], /Empty/],
  ['root mismatch', b => b.nodes[0].rootId = 'wrong', /mismatch/],
  ['duplicate nodes', b => b.nodes.push(b.nodes[0]), /Duplicate/],
  ['duplicate variables', b => b.variables.items.push(b.variables.items[0]), /Duplicate/],
  ['duplicate assets', b => b.assets.push(b.assets[0]), /Duplicate/],
  ['invalid base64', b => b.assets[0].base64 = '???', /base64/],
  ['unknown preview node', b => b.assets[0].nodeId = 'unknown', /Unknown/],
  ['malicious path', b => b.assets[0].path = '../escape', /unexpected/],
  ['unsafe JSON keys', b => Object.defineProperty(b.source, '__proto__', { value: {}, enumerable: true }), /Unsafe/],
  ['bad token scope', b => b.scope.tokens = 'whole-world', /scope/],
]) test(`bundle rejects ${name}`, async () => { const {bundle} = await fixture(); mutate(bundle); assert.throws(() => C.validateBundle(bundle), pattern); });

test('blueprint has complete limits and bindings', () => { const s = C.validateBlueprint(blueprint()); assert.equal(s.nodes, 5); assert.equal(s.tokens, 6); assert.equal(s.components, 1); });
for (const [name, mutate, pattern] of [
  ['third-party export', b => b.format = C.FORMAT, /self-authored/],
  ['no ownership', b => b.ownership = 'unknown', /self-authored/],
  ['arbitrary code', b => b.code = 'evil', /unexpected/],
  ['CSS expression', b => b.tokens.surface.css = 'url(https://invalid)', /CSS/],
  ['missing token', b => b.nodes[0].fill = 'missing', /binding/],
  ['wrong token type', b => b.nodes[0].fill = 'space', /binding/],
  ['wrong scope', b => b.tokens.ink.scopes = [], /binding/],
  ['cyclic aliases', b => { b.tokens['primitive/white'].alias = 'surface'; delete b.tokens['primitive/white'].value; }, /cycle/],
  ['missing alias', b => b.tokens.surface.alias = 'missing', /alias/],
  ['NaN float', b => b.tokens.space.value = NaN, /number/],
  ['out of range color', b => b.tokens.ink.value.r = 12, /channel/],
  ['oversized font', b => b.tokens.body.value = 200, /font size/],
  ['invalid component reference', b => b.nodes[1].children[1].component = 'unknown', /earlier/],
  ['instance override', b => b.nodes[1].children[1].text = 'override', /overrides/],
  ['raw unsupported node', b => b.nodes[0].kind = 'SVG', /Unsupported/],
  ['duplicate key', b => b.nodes[1].key = b.nodes[0].key, /Duplicate/],
]) test(`blueprint rejects ${name}`, () => { const b=blueprint(); mutate(b); assert.throws(()=>C.validateBlueprint(b),pattern); });

test('staging validates without mutation and freezes the input snapshot', async () => {
  const f = createMock(), r = createRuntime(f.figma), b = blueprint(), stage = r.stageBlueprint(b);
  assert.equal(f.calls.length,0); b.title='mutated'; const result=await r.importBlueprint(stage.stageId,true);
  assert.equal(f.nodes.get(result.createdPageId).name,'Offline bridge — synthetic smoke demo'); assert.equal(result.createdVariableIds.length,6); assert.equal(result.createdNodeIds.length,7);
  const component=[...f.nodes.values()].find(n=>n.type==='COMPONENT'); assert.equal(component.primaryAxisSizingMode,'FIXED'); assert.equal(component.counterAxisSizingMode,'AUTO');
  assert.ok(component.boundVariables.itemSpacing); assert.ok(f.variables.has('v-original'));
});
test('import needs confirmation and rejects stale stage ID', async () => { const f=createMock(),r=createRuntime(f.figma); const s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,false),/confirmation/); await assert.rejects(r.importBlueprint('stale',true),/confirmation/); assert.equal(f.calls.length,0); });
test('new stage invalidates earlier preview', async()=>{ const f=createMock(),r=createRuntime(f.figma); const a=r.stageBlueprint(blueprint()); r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(a.stageId,true),/confirmation/); });
test('page changed after preview produces zero writes', async()=>{ const f=createMock(),r=createRuntime(f.figma),s=r.stageBlueprint(blueprint()); f.figma.currentPage={id:'other'}; await assert.rejects(r.importBlueprint(s.stageId,true),/Page changed/); assert.equal(f.calls.length,0); });
test('page changed while font is loading produces zero writes', async()=>{ const f=createMock({onFont:async figma=>{figma.currentPage={id:'other'};}}),r=createRuntime(f.figma),s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,true),/Page changed/); assert.equal(f.calls.filter(c=>c[0].startsWith('create')).length,0); });
test('missing fonts stop before mutations', async()=>{ const f=createMock({failFont:true}),r=createRuntime(f.figma),s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,true),/missing font/); assert.equal(f.figma.root.children.length,1); assert.equal(f.variables.size,1); });
test('import failure rolls back only created page and variables', async()=>{ const f=createMock({failText:true}),r=createRuntime(f.figma),s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,true),/rolled back/); assert.equal(f.figma.root.children.length,1); assert.equal(f.variables.size,1); assert.equal(f.collections.size,1); assert.equal(f.figma.currentPage.id,f.page.id); });
test('rollback failures are explicitly reported', async()=>{ const f=createMock({failText:true,failRollback:true}),r=createRuntime(f.figma),s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,true),/Rollback incomplete/); });
test('repeat import refuses to duplicate a blueprint ID', async()=>{ const f=createMock(),r=createRuntime(f.figma); let s=r.stageBlueprint(blueprint()); await r.importBlueprint(s.stageId,true); s=r.stageBlueprint(blueprint()); await assert.rejects(r.importBlueprint(s.stageId,true),/already imported/); });
test('handler enforces single flight and current cancellation', async()=>{ let release; const f=createMock({onFont:()=>new Promise(r=>release=r)}),r=createRuntime(f.figma); await r.handle({type:'stage',requestId:'a',blueprint:blueprint()}); const id=f.messages[0].stageId;
  const first=r.handle({type:'confirm',requestId:'b',stageId:id,confirmed:true}); await r.handle({type:'confirm',requestId:'c',stageId:id,confirmed:true}); assert.equal(f.messages.at(-1).type,'error'); release(); await first; assert.equal(f.messages.at(-1).type,'imported');
  await r.handle({type:'stage',requestId:'d',blueprint:blueprint()}); const second=f.messages.at(-1).stageId; await r.handle({type:'cancel',requestId:'e'}); await r.handle({type:'confirm',requestId:'f',stageId:second,confirmed:true}); assert.equal(f.messages.at(-1).type,'error');
});
test('invalid stage clears previous input and unknown commands do not mutate',async()=>{ const f=createMock(),r=createRuntime(f.figma); const s=r.stageBlueprint(blueprint()); assert.throws(()=>r.stageBlueprint({})); await assert.rejects(r.importBlueprint(s.stageId,true),/confirmation/); await r.handle({type:'eval',requestId:'a',code:'anything'}); assert.equal(f.calls.length,0); });

test('analyzer writes deterministic safe files and preserves source digests',async()=>{ const d=tmp();try {const {bundle}=await fixture(); bundle.nodes[0].document.name='../../outside'; const input=path.join(d,'input.json'); const raw=JSON.stringify(bundle);writeFileSync(input,raw); const report=analyze(input,path.join(d,'output'));assert.equal(report.sourceSha256,createHash('sha256').update(raw).digest('hex'));assert.ok(existsSync(path.join(d,'output/previews/0001.png')));assert.equal(readdirSync(path.join(d,'output/previews')).length,1);assert.equal(report.summary.nodes,1);assert.ok(report.warnings.length);assert.throws(()=>analyze(input,path.join(d,'output')),/EEXIST/);}finally{rmSync(d,{recursive:true,force:true});}});
test('analyzer rejects existing symlink output',async()=>{const d=tmp();try {const {bundle}=await fixture();const input=path.join(d,'in.json');writeFileSync(input,JSON.stringify(bundle));symlinkSync(d,path.join(d,'output'));assert.throws(()=>analyze(input,path.join(d,'output')),/EEXIST/);}finally{rmSync(d,{recursive:true,force:true});}});
test('native .fig rejected without fetching a third-party parser',()=>{const d=tmp();try{writeFileSync(path.join(d,'native.fig'),'fig-kiwi');assert.throws(()=>analyze(path.join(d,'native.fig'),path.join(d,'out')),/Native .fig/);assert.ok(!existsSync(path.join(d,'out')));}finally{rmSync(d,{recursive:true,force:true});}});
test('malformed preview and noncanonical base64 cause no output directory',async()=>{const d=tmp();try{const {bundle}=await fixture();bundle.assets[0].base64=Buffer.from('<svg onload="anything"/>').toString('base64');const input=path.join(d,'in.json');writeFileSync(input,JSON.stringify(bundle));assert.throws(()=>analyze(input,path.join(d,'out')),/not PNG/);assert.ok(!existsSync(path.join(d,'out')));bundle.assets[0].base64='AB==';writeFileSync(input,JSON.stringify(bundle));assert.throws(()=>analyze(input,path.join(d,'out')),/canonical/);}finally{rmSync(d,{recursive:true,force:true});}});
test('unknown image payloads remain opaque .bin, never executable HTML/SVG',()=>{assert.equal(assetExtension(Buffer.from('<html>'),'image'),'bin');assert.equal(assetExtension(Buffer.from(PNG),'preview'),'png');});
test('CLI fails with a useful error on wrong arguments',()=>{const r=spawnSync(process.execPath,['design/figma-offline/analyze.mjs'],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/Usage/);});
test('build uses no network, preserves real plugin ID and does not overwrite',()=>{const d=tmp();try{const out=preparePlugin('123456789012345',path.join(d,'plugin'));const m=JSON.parse(readFileSync(path.join(out,'manifest.json')));assert.deepEqual(m.networkAccess.allowedDomains,['none']);assert.equal(m.id,'123456789012345');assert.throws(()=>preparePlugin('123456789012345',out),/EEXIST/);assert.throws(()=>preparePlugin('not-a-real-id',path.join(d,'bad')),/numeric/);const html=readFileSync(path.join(out,'ui.html'),'utf8');assert.ok(!html.includes('/*__CORE__*/'));assert.ok(!/<script[^>]*src=|<link[^>]*href=/i.test(html));}finally{rmSync(d,{recursive:true,force:true});}});
test('exact bundled plugin runs in a sandbox without Node globals',async()=>{const d=tmp();try{const out=preparePlugin('123456789012345',path.join(d,'plugin')),f=createMock();const context=vm.createContext({figma:f.figma,__html__:'test',Uint8Array,structuredClone});vm.runInContext(readFileSync(path.join(out,'code.js'),'utf8'),context,{timeout:2000});assert.equal(typeof f.figma.ui.onmessage,'function');await f.figma.ui.onmessage({type:'export',requestId:'sandbox-export',options:{includePreviews:true}});assert.equal(f.messages.at(-1).type,'exported');}finally{rmSync(d,{recursive:true,force:true});}});

test('instance definitions outside the export are explicitly unresolved',async()=>{const {bundle}=await fixture();bundle.nodes[0].document.children=[{id:'instance',type:'INSTANCE',componentId:'remote-main'}];assert.ok(C.diagnostics(bundle).some(w=>w.code==='COMPONENT_DEFINITION_NOT_EXPORTED'));});
