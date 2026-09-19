import { describe, expect, it } from 'vitest';
import { createOpenUIStatementGuard, OPENUI_LIMITS } from './openui-guard.js';
const calls = ['Surface', 'Source', 'Metric', 'ResourceForm'];
const program = 'root = Surface("s", "中文", [orders], [metric])\norders = Source({"id":"orders","type":"resource-list","resource":"orders"})\nmetric = Metric("metric", {"label":"A \\"quote\\"", "format":"number"}, {"sourceId":"orders","pointer":"/total"}, 12)\n';

describe('bounded OpenUI statement framing', () => {
  it('produces identical complete statements at every two-chunk boundary', () => {
    const whole = createOpenUIStatementGuard(calls);
    const expected = [...whole.push(program), ...whole.finish()];
    for (let at = 0; at <= program.length; at += 1) {
      const stream = createOpenUIStatementGuard(calls);
      expect([...stream.push(program.slice(0, at)), ...stream.push(program.slice(at)), ...stream.finish()]).toEqual(expected);
    }
  });
  it('emits a completed declaration before the response finishes', () => {
    const stream = createOpenUIStatementGuard(calls);
    expect(stream.push('root = Surface("s", "S", [], [form])\nform = Resource')).toHaveLength(1);
    expect(stream.push('Form("f", {"actionId":"orders.update"})\n')).toHaveLength(1);
  });
  it.each([
    'root = Surface("s", "S", [], [])\nx = Mutation("delete_all", {})\n',
    '$state = 1\n', 'x = eval("bad")\n', 'x = Source({"__proto__":{}})\n',
    'x = Source({"a":1,"a":2})\n', 'x = Source({"a": 1 + 2})\n',
    'root = Surface("s", "S", [], [m, m])\n', 'x = [x,x]\n',
    'root = Surface("s", "S", [], [Metric("m", {})])\n',
    'x = Metric("x", {"label": y})\n', 'x = Source({"a": 1e999})\n',
    'root = Surface("s", "S", [], [])\nroot = Surface("s", "T", [], [])\n',
  ])('rejects unsupported executable or ambiguous input %s', (text) => {
    const stream = createOpenUIStatementGuard(calls);
    expect(() => { stream.push(text); stream.finish(); }).toThrow();
  });
  it('does not release auto-closed or truncated syntax', () => {
    const stream = createOpenUIStatementGuard(calls);
    expect(stream.push('root = Surface("s", "S", [], [')).toEqual([]);
    expect(() => stream.finish()).toThrow('Truncated');
    expect(() => stream.finish()).toThrow('Truncated');
  });
  it('bounds characters and nesting before invoking the upstream parser', () => {
    expect(() => createOpenUIStatementGuard(calls).push(' '.repeat(OPENUI_LIMITS.characters + 1))).toThrow();
    expect(() => createOpenUIStatementGuard(calls).push('x = Source(' + '['.repeat(40))).toThrow();
  });
});
