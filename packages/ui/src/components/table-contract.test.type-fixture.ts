import type { ComponentProps, Snippet } from 'svelte';
import AutoTable from './AutoTable.svelte';
import { copyTableRecord, tableRowKey } from './table-contract';
import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core';
import { formatContractRouteId, parseContractRouteId } from '@svadmin/core/schema';

const record = copyTableRecord({ id: 1, title: 'Title' });
const id: string | number = record.id;
void id;
// @ts-expect-error Dynamic metadata cannot promise business field types.
const title: string = record['title'];
void title;
// @ts-expect-error Object identities are not valid row keys.
tableRowKey({});
const numeric = defineResource('numbers', { record: Type.Object({ id: Type.Number() }) });
const parsed: number = parseContractRouteId(numeric, '1');
void parsed;
// @ts-expect-error Route identity remains schema-derived.
const stringId: string = parseContractRouteId(numeric, '1');
void stringId;
// @ts-expect-error Link writers must supply a schema-owned identity type.
formatContractRouteId(numeric, '1');
declare const cell: Snippet<[{ value: unknown; record: Record<string, unknown> }]>;
const props: ComponentProps<typeof AutoTable> = { resourceName: 'posts', columns: { title: cell } };
void props;
declare const unsafeCell: Snippet<[{ value: number; record: { id: number } }]>;
// @ts-expect-error A metadata-driven renderer must narrow unknown business values.
const unsafeProps: ComponentProps<typeof AutoTable> = { resourceName: 'posts', columns: { title: unsafeCell } };
void unsafeProps;
