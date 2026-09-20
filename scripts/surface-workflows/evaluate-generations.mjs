import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Type } from '@sinclair/typebox';
import { createBusinessSurfaceDefinitions } from '../../packages/surface/dist/business-definitions.js';
import { createSurfaceOpenUIStream } from '../../packages/surface/dist/openui.js';
import { createInteractiveSurfaceDefinitions, defaultSurfaceDefinitions } from '../../packages/surface/dist/workflows.js';
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath || !process.env.SVADMIN_OPENUI_ENTRY) throw new Error('Usage: SVADMIN_OPENUI_ENTRY=... node scripts/surface-workflows/evaluate-generations.mjs actual-model-output.jsonl report.json');
const { createStreamingParser } = await import(pathToFileURL(process.env.SVADMIN_OPENUI_ENTRY).href);
const cases = JSON.parse(readFileSync(new URL('./generation-cases.json', import.meta.url), 'utf8'));
const action = { id: 'contacts.create', version: 'v1', label: 'Create contact', approval: 'confirm', inputSchema: Type.Object({ name: Type.String({ minLength: 1 }) }, { additionalProperties: false }) };
const catalog = createInteractiveSurfaceDefinitions([action], createBusinessSurfaceDefinitions(defaultSurfaceDefinitions));
const policy = { resources: { contacts: { readFields: ['id', 'name'], allowGetOne: true, maxPageSize: 10 }, events: { readFields: ['id', 'action', 'at', 'actor'], maxPageSize: 10 } } };
const lines = readFileSync(inputPath, 'utf8').split('\n').filter((line) => line.trim());
if (!lines.length) throw new Error('No actual model outputs supplied; no rate can be computed');
const results = lines.map((line) => {
  const sample = JSON.parse(line);
  const task = cases.find((item) => item.id === sample.caseId);
  if (!task || typeof sample.output !== 'string' || typeof sample.model !== 'string' || !sample.model || !sample.runId) throw new Error('Each sample requires a known caseId, model, runId and output');
  const stream = createSurfaceOpenUIStream({ catalog, policy, createStreamingParser });
  const partial = stream.push(sample.output); const result = partial.ok ? stream.finish() : partial;
  const widgets = result.ok ? result.preview?.widgets ?? [] : [];
  const metric = widgets.find((w) => w.type === 'metric');
  const detail = widgets.find((w) => w.type === 'resource-detail');
  const detailSource = result.ok ? result.preview?.dataSources.find((source) => source.id === detail?.binding?.sourceId) : undefined;
  const activity = widgets.find((w) => w.type === 'activity-feed');
  const activitySource = result.ok ? result.preview?.dataSources.find((source) => source.id === activity?.binding?.sourceId) : undefined;
  const intentPassed = result.ok && task.requiredTypes.every((type) => widgets.some((w) => w.type === type))
    && (!task.actionId || widgets.some((w) => w.type === 'resource-form' && w.props.actionId === task.actionId))
    && (!task.requireCount || metric?.binding?.pointer === '/total')
    && (!task.tone || metric?.props?.appearance?.tone === task.tone)
    && (!task.density || metric?.props?.appearance?.density === task.density)
    && (!task.detailFields || (detailSource?.resource === 'contacts' && detailSource?.type === 'resource-one' && detailSource.recordId === task.recordId && task.detailFields.every((field) => detail?.props.fields?.some((item) => item.field === field))))
    && (!task.activityFields || (activitySource?.resource === 'events' && Object.entries(task.activityFields).every(([key, field]) => activity?.props[key] === field)))
    && (!task.requireNameColumn || widgets.some((w) => w.type === 'resource-table' && w.props.columns?.some((column) => column.field === 'name')));
  return { caseId: task.id, model: sample.model, runId: sample.runId, protocolPassed: result.ok, intentPassed: !!intentPassed,
    ...(result.ok ? {} : { error: result.error.code }) };
});
const passed = (key, rows) => rows.filter((row) => row[key]).length / rows.length;
const groups = Object.fromEntries([...new Set(results.map((row) => row.model))].map((model) => {
  const rows = results.filter((row) => row.model === model);
  return [model, { samples: rows.length, protocolPassRate: passed('protocolPassed', rows), intentPassRate: passed('intentPassed', rows), missingCases: cases.filter((task) => !rows.some((row) => row.caseId === task.id)).map((task) => task.id) }];
}));
writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), evidence: 'User-supplied model outputs; no provider call made by this evaluator', groups, results }, null, 2) + '\n');
console.info(JSON.stringify(groups, null, 2));
