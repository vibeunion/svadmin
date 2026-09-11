import { Type } from '@sinclair/typebox';
import { defineResource, useOne } from '@svadmin/core';
import * as unsafe from '@svadmin/core/unsafe';
import { useRecordDetail } from './record-detail.svelte';

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const query = useOne({ resource: posts, id: 1 });
if (query.isSuccess) {
  const title: string = query.data.data.title;
  void title;
  // @ts-expect-error Record data cannot claim the wrong schema type.
  const invalid: number = query.data.data.title;
  void invalid;
}
if (query.isError) {
  // @ts-expect-error External errors remain unknown.
  const invalid: Error = query.error;
  void invalid;
}
// @ts-expect-error Resource ID types remain checked.
useOne({ resource: posts, id: '1' });
// @ts-expect-error A detail reader cannot omit its explicit record ID.
useRecordDetail(() => ({ resourceName: 'posts' }));
// @ts-expect-error The unchecked detail entry point is removed.
unsafe.useShow({ resource: 'posts', id: 1 });
const detail = useRecordDetail(() => ({ resourceName: 'posts', id: 1 }));
if (detail.query.isSuccess) {
  const value: unknown = detail.query.data.data['title'];
  void value;
  // @ts-expect-error Erased UI metadata never manufactures a concrete field type.
  const invalid: string = detail.query.data.data['title'];
  void invalid;
}
