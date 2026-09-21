import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createSurfaceOpenUIStream, buildSurfaceOpenUIMessages } from '../../packages/surface/dist/openui.js';
import { createInteractiveSurfaceDefinitions, defaultSurfaceDefinitions } from '../../packages/surface/dist/workflows.js';
import { Type } from '@sinclair/typebox';
import { createBusinessSurfaceDefinitions } from '../../packages/surface/dist/business-definitions.js';

if (!process.env.SVADMIN_OPENUI_ENTRY) throw new Error('SVADMIN_OPENUI_ENTRY must resolve the real @openuidev/lang-core@0.3.0 entry');
const { createStreamingParser } = await import(pathToFileURL(process.env.SVADMIN_OPENUI_ENTRY).href);
const action = { id: 'contacts.create', version: 'v1', label: 'Create contact', approval: 'confirm',
  inputSchema: Type.Object({ name: Type.String({ minLength: 1 }) }, { additionalProperties: false }) };
const catalog = createInteractiveSurfaceDefinitions([action], defaultSurfaceDefinitions);
const policy = { resources: { contacts: { readFields: ['id', 'name'], maxPageSize: 10 } } };
const program = 'root = Surface("contacts", "客户", [records], [count, form], "md")\n'
  + 'records = Source({"id":"records","type":"resource-list","resource":"contacts","pageSize":10})\n'
  + 'count = Metric("count", {"label":"客户数量", "format":"number", "appearance":{"tone":"info","density":"compact"}}, {"sourceId":"records","pointer":"/total"}, 4)\n'
  + 'form = ResourceForm("form", {"actionId":"contacts.create"}, null, 8)\n';
const make = () => createSurfaceOpenUIStream({ catalog, policy, createStreamingParser });
let checks = 0;
function valid(result) { assert.equal(result.ok, true, JSON.stringify(result)); checks++; }
const whole = make(); valid(whole.push(program)); const expected = whole.finish(); valid(expected);
assert.equal(expected.complete, true); assert.equal(expected.preview.widgets.length, 2); checks += 2;
for (let at = 0; at <= program.length; at++) {
  const stream = make(); valid(stream.push(program.slice(0, at))); valid(stream.push(program.slice(at)));
  assert.deepEqual(stream.finish(), expected); checks++;
}
let materializations = 0;
const granular = createSurfaceOpenUIStream({ catalog, policy, createStreamingParser: (...args) => {
  const parser = createStreamingParser(...args);
  return { push: (chunk) => parser.push(chunk), getResult: () => { materializations++; return parser.getResult(); } };
} });
for (const character of program) valid(granular.push(character));
assert.deepEqual(granular.finish(), expected); assert.ok(materializations <= 5); checks += 2;
const partial = make(); valid(partial.push(program.slice(0, program.lastIndexOf('form ='))));
assert.equal(partial.push('').preview.widgets.length, 1); checks++;
assert.equal(partial.finish().ok, false); checks++;
for (const text of [program + 'evil = Mutation("erase", {})\n', program.replace('"contacts","pageSize"', '"secrets","pageSize"'),
  program.replace('"contacts.create"', '"admin.delete"'), program.replace('"density":"compact"', '"class":"raw"'),
  program.slice(0, -5), program + 'unused = Source({"id":"x","type":"resource-list","resource":"contacts"})\n',
  'root = Surface("s","S",[],[Metric("m",{})])\n']) {
  const stream = make(); const pushed = stream.push(text); const result = pushed.ok ? stream.finish() : pushed;
  assert.equal(result.ok, false, text); assert.equal(result.preview, null); checks += 2;
}
const messages = buildSurfaceOpenUIMessages('显示客户数量和创建表单', catalog, policy);
assert.equal(messages[0].role, 'system'); assert.ok(messages[0].content.includes('Create contact')); checks += 2;
// 同一个真实解析器验证新增目录，保留上方所有既有用例。
const businessCatalog = createBusinessSurfaceDefinitions(defaultSurfaceDefinitions);
const businessPolicy = { resources: {
  contacts: { readFields: ['id', 'name'], allowGetOne: true, maxPageSize: 10 },
  events: { readFields: ['id', 'action', 'at', 'actor'], maxPageSize: 10 },
} };
const businessProgram = 'root = Surface("contact", "Details and history", [person, events], [detail, timeline])\n'
  + 'person = Source({"id":"person","type":"resource-one","resource":"contacts","recordId":"c1"})\n'
  + 'events = Source({"id":"events","type":"resource-list","resource":"events","pageSize":10})\n'
  + 'detail = ResourceDetail("detail", {"title":"Details","fields":[{"field":"name","label":"Name"}],"tone":"info","density":"compact"}, {"sourceId":"person","pointer":""}, 6)\n'
  + 'timeline = ActivityFeed("timeline", {"title":"History","idField":"id","actionField":"action","timestampField":"at","actorField":"actor"}, {"sourceId":"events","pointer":"/items"}, 6)\n';
const businessStream = () => createSurfaceOpenUIStream({ catalog: businessCatalog, policy: businessPolicy, createStreamingParser });
const baseline = businessStream(); valid(baseline.push(businessProgram)); const businessExpected = baseline.finish(); valid(businessExpected);
assert.deepEqual(businessExpected.preview.widgets.map(widget => widget.type), ['resource-detail', 'activity-feed']); checks++;
for (let at = 0; at <= businessProgram.length; at++) {
  const stream = businessStream(); valid(stream.push(businessProgram.slice(0, at))); valid(stream.push(businessProgram.slice(at)));
  assert.deepEqual(stream.finish(), businessExpected); checks++;
}
for (const invalid of [businessProgram.replace('"field":"name"', '"field":"secret"'),
  businessProgram.replace('"actorField":"actor"', '"actorField":"secret"'),
  businessProgram.replace('"pointer":""', '"pointer":"/name"'),
  businessProgram.replace('"tone":"info"', '"style":"raw"')]) {
  const stream = businessStream(), result = stream.push(invalid);
  assert.equal((result.ok ? stream.finish() : result).ok, false); checks++;
}
console.info(JSON.stringify({ integration: '@openuidev/lang-core@0.3.0 (real parser factory)', checks,
  scope: 'Constrained static OpenUI subset. Deterministic protocol tests, not real-model generation accuracy.' }, null, 2));
