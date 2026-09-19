import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../core.cjs';
import { createRuntime } from '../runtime.cjs';
import fixtures from './fixtures.cjs';

function expansion(depth) {
  const b = fixtures.blueprint();
  b.nodes = [b.nodes[0]];
  let previous = 'action';
  for (let i = 0; i < depth; i++) {
    const key = `component-${i}`;
    b.nodes.push({ key, kind: 'COMPONENT', name: key, layout: 'VERTICAL', width: 400,
      fill: 'surface', padding: 'space', gap: 'space', radius: 'radius', children: [0,1].map(j =>
        ({ key: `instance-${i}-${j}`, kind: 'INSTANCE', name: `instance-${j}`, component: previous })) });
    previous = key;
  }
  return b;
}

test('preview counts expanded instance descendants, not only blueprint entries', () => {
  const summary = C.validateBlueprint(fixtures.blueprint());
  assert.equal(summary.nodes, 5);
  assert.equal(summary.expandedNodes, 6);
  assert.equal(C.validateBlueprint(expansion(2)).expandedNodes, 18);
});

test('small recursive component graph fails before any canvas write when expanded budget is exceeded', () => {
  const mock = fixtures.createMock();
  const runtime = createRuntime(mock.figma);
  const b = expansion(10); // 32 explicit entries, but thousands of cloned descendants.
  assert.throws(() => runtime.stageBlueprint(b), /Expanded instance node budget/);
  assert.equal(mock.calls.length, 0);
  assert.equal(mock.figma.root.children.length, 1);
});

// 保留底层原因用于诊断，不改变只回滚本次新增对象的边界。
test('import rollback preserves the original caught error as its cause', async () => {
  const mock = fixtures.createMock({ failText: true });
  const runtime = createRuntime(mock.figma);
  const staged = runtime.stageBlueprint(fixtures.blueprint());
  await assert.rejects(runtime.importBlueprint(staged.stageId, true), error => {
    assert.match(error.message, /Created resources rolled back/);
    assert.ok(error.cause instanceof Error);
    assert.equal(error.cause.message, 'synthetic text failure');
    return true;
  });
  assert.equal(mock.figma.root.children.length, 1);
  assert.equal(mock.variables.size, 1);
});
