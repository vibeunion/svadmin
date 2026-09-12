import { Type } from '@sinclair/typebox';
import { defineResource, useImport, type ResourceContract, type ImportResult } from '@svadmin/core';
import { parseContractCreateInput } from '../../../core/src/resource-contract';
import * as unsafe from '@svadmin/core/unsafe';

const schemas = {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
};
const posts = defineResource('posts', schemas);
const importer = useImport({
  resource: posts,
  mapData: item => ({ title: typeof item['title'] === 'string' ? item['title'] : '' }),
  onFinish: result => {
    const title: string | undefined = result.succeeded[0]?.title;
    const request: { title: string } | undefined = result.errored[0]?.request;
    void title;
    void request;
    // @ts-expect-error Receipt fields derive from the record schema.
    const bad: number | undefined = result.succeeded[0]?.title;
    void bad;
  },
});
const result: Promise<ImportResult<typeof schemas>> = importer.handleChange({ file: new File(['[]'], 'posts.json') });
void result;
importer.reset();
const progress: number = importer.progress.processedAmount;
void progress;
// @ts-expect-error Public progress is an immutable snapshot.
importer.progress.totalAmount = 1;
// @ts-expect-error No progress setter accepts caller-invented completion.
importer.setProgress({ totalAmount: 1, processedAmount: 1 });
const parsed = parseContractCreateInput(posts, { title: 'Imported' });
const title: string = parsed.title;
void title;
void importer.handleChange({ file: new File(['[]'], 'posts.json') });
// @ts-expect-error Raw resource names do not carry validation evidence.
useImport({ resource: 'posts' });
// @ts-expect-error No create schema means the resource cannot be imported.
useImport({ resource: defineResource('readonly', { record: Type.Object({ id: Type.Number() }) }) });
// @ts-expect-error A mapper must return the concrete create payload.
useImport({ resource: posts, mapData: () => ({ title: false }) });
// @ts-expect-error Parsed file fields remain unknown until narrowed.
useImport({ resource: posts, mapData: row => ({ title: row['title'] }) });
// @ts-expect-error Only browser File objects are accepted.
void importer.handleChange({ file: { name: 'posts.json', text: async () => '[]' } });
// @ts-expect-error Per-call target overrides are forbidden.
void importer.handleChange({ file: new File([], 'posts.json'), resource: 'other' });
// @ts-expect-error Cache policy cannot be bypassed.
useImport({ resource: posts, invalidates: false });
declare const dynamic: ResourceContract;
const erased = useImport({ resource: dynamic, mapData: row => row });
const unknownInput = parseContractCreateInput(dynamic, {});
// @ts-expect-error An erased contract cannot manufacture concrete input types.
const fabricated: { title: string } = unknownInput;
void fabricated;
// @ts-expect-error Dynamic record fields stay unknown.
const fabricatedTitle: string | undefined = erased.mutationResult?.succeeded[0]?.['title'];
void fabricatedTitle;
// @ts-expect-error The unchecked importer has been removed, not aliased for compatibility.
unsafe.useImport({ resource: 'posts' });
