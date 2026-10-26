import { describe, expect, test } from 'bun:test';
import { getSchema, resolveExtensions } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection, type Command } from '@tiptap/pm/state';
import { splitBlock, wrapIn } from '@tiptap/pm/commands';
import { requireValue } from '../../../../scripts/test-assertions';
import { fullPreset, minimalPreset, prosePreset } from './index';

const presets = [
  ['full', fullPreset],
  ['minimal', minimalPreset],
  ['prose', prosePreset],
] as const;

/** 在真实 EditorState 上执行 ProseMirror 命令，返回命令结果与事务后的状态。 */
function applyCommand(state: EditorState, command: Command): { ok: boolean; state: EditorState } {
  let next = state;
  const ok = command(next, (transaction) => {
    next = next.apply(transaction);
  });
  return { ok, state: next };
}

/** 把文档结构投影成稳定的字符串轮廓，忽略预设附加的节点属性（如 textAlign）。 */
function outline(node: ProseMirrorNode): string {
  if (node.isText) return node.text ?? '';
  if (node.childCount === 0) return node.type.name;
  const children = Array.from({ length: node.childCount }, (_, index) => outline(node.child(index)));
  return `${node.type.name}(${children.join('|')})`;
}

/** 用预设 schema 构造单段落文档，并把光标放在 "alphabeta" 中间。 */
function paragraphState(schema: Schema): EditorState {
  const doc = schema.node('doc', null, Fragment.fromArray([
    schema.node('paragraph', null, schema.text('alphabeta')),
  ]));
  return EditorState.create({ schema, doc, selection: TextSelection.create(doc, 6) });
}

describe('editor extension presets', () => {
  for (const [name, preset] of presets) {
    test(`${name} preset resolves every extension name exactly once`, () => {
      const extensions = resolveExtensions(
        preset({ placeholder: 'Write something' })
      );
      const names = extensions.map((extension) => extension.name);

      expect(names.length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length);
      expect(names.filter((extensionName) => extensionName === 'link')).toHaveLength(1);
      expect(names.filter((extensionName) => extensionName === 'underline')).toHaveLength(1);
    });

    test(`${name} preset applies real splitBlock and wrapIn transactions`, () => {
      const schema = getSchema(preset());
      const initial = paragraphState(schema);
      expect(initial.doc.textContent).toBe('alphabeta');

      // 真实段落切分：doc 由 1 个段落变成 2 个段落，光标落在第二段开头。
      const split = applyCommand(initial, splitBlock);
      expect(split.ok).toBe(true);
      expect(split.state.doc.childCount).toBe(2);
      expect(outline(split.state.doc)).toBe('doc(paragraph(alpha)|paragraph(beta))');

      // Fragment 身份一致：事务产物与同一 schema 新构造文档在结构与节点实现上等价。
      const expected = schema.node('doc', null, Fragment.fromArray([
        schema.node('paragraph', null, schema.text('alpha')),
        schema.node('paragraph', null, schema.text('beta')),
      ]));
      expect(split.state.doc.content).toBeInstanceOf(Fragment);
      expect(split.state.doc.eq(expected)).toBe(true);
      const bodyTextType = requireValue(schema.nodes['text']);
      expect(split.state.doc.firstChild?.content.firstChild?.type).toBe(bodyTextType);

      // 真实 blockquote 包裹：第二段被包进 blockquote，段落定义来自预设 schema。
      const blockquoteType = requireValue(schema.nodes['blockquote']);
      const wrapped = applyCommand(split.state, wrapIn(blockquoteType));
      expect(wrapped.ok).toBe(true);
      expect(outline(wrapped.state.doc)).toBe('doc(paragraph(alpha)|blockquote(paragraph(beta)))');
      expect(wrapped.state.doc.content).toBeInstanceOf(Fragment);
      const quoted = wrapped.state.doc.lastChild;
      expect(quoted?.type).toBe(blockquoteType);
      expect(quoted?.firstChild?.type).toBe(requireValue(schema.nodes['paragraph']));

      // 去重后的 link/underline mark 仍可在真实事务中写入并回读。
      const linkType = requireValue(schema.marks['link']);
      const underlineType = requireValue(schema.marks['underline']);
      const marked = applyCommand(split.state, (state, dispatch) => {
        dispatch?.(
          state.tr
            .addMark(1, 6, linkType.create({ href: 'https://svadmin.dev' }))
            .addMark(1, 6, underlineType.create())
        );
        return true;
      });
      expect(marked.ok).toBe(true);
      const marks = marked.state.doc.firstChild?.firstChild?.marks ?? [];
      expect(marks.map((mark) => mark.type)).toEqual([linkType, underlineType]);
      const firstMark = requireValue(marks[0]);
      const secondMark = requireValue(marks[1]);
      expect(firstMark.type).toBe(linkType);
      expect(secondMark.type).toBe(underlineType);
      expect(firstMark.attrs['href']).toBe('https://svadmin.dev');
    });
  }

  test('full preset keeps the configured link and underline extensions', () => {
    const extensions = resolveExtensions(fullPreset());
    const link = extensions.find((extension) => extension.name === 'link');
    const underline = extensions.find((extension) => extension.name === 'underline');

    expect(link?.options).toMatchObject({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    });
    expect(underline).toBeDefined();

    const schema = getSchema(fullPreset());
    expect(schema.marks['link']).toBeDefined();
    expect(schema.marks['underline']).toBeDefined();
  });
});
