import type { Component, Snippet } from 'svelte';
import type { BaseRecord, FieldDefinition } from '@svadmin/core';
import { snapshotPlainData } from '@svadmin/core/schema';
import {
  contractFormInvalidFields,
  contractKey,
  getContractFormFields,
  parseContractId,
  parseContractRecord,
  snapshotContractFormDraft,
  type ContractFormAction,
  type ContractFormDraft,
  type ContractFormValues,
  type ContractId,
  type ContractRecord,
  type ContractSchemas,
  type ResourceContract,
} from '@svadmin/core/resource-contract';

export type RecordField<S extends ContractSchemas> = Extract<keyof ContractRecord<S>, string>;
export type FormField<S extends ContractSchemas, A extends ContractFormAction> =
  Extract<keyof ContractFormValues<S, A>, string>;

/** 与 AutoTable 的现有 snippet 参数兼容；未经校验的数据保持 unknown。 */
export interface CellInput {
  value: unknown;
  record: Record<string, unknown>;
}
export interface FieldInput {
  field: FieldDefinition;
  value: unknown;
  onchange: (value: unknown) => void;
}
export interface CellContext<S extends ContractSchemas, K extends RecordField<S>> {
  key: K;
  record: ContractRecord<S>;
  value: ContractRecord<S>[K];
}
export type FieldState<T> = { valid: true; value: T } | { valid: false };
export interface FieldContext<S extends ContractSchemas, A extends ContractFormAction, K extends FormField<S, A>> {
  field: FieldDefinition & { key: K };
  state: FieldState<ContractFormValues<S, A>[K]>;
  readonly: boolean;
  /** 只接收符合当前操作契约的值，运行时也会重新校验。 */
  onchange: (value: ContractFormValues<S, A>[K]) => void;
  /** 草稿可以暂时不满足业务约束，但必须是可快照的普通数据。 */
  onDraftChange: (value: unknown) => void;
}
export type CellSnippets<S extends ContractSchemas> =
  Partial<Record<RecordField<S>, Snippet<[CellInput]>>>;
export interface RowContext<S extends ContractSchemas> {
  record: ContractRecord<S>;
  id: ContractId<S>;
}

/** 动态路由只擦除资源类型，不把未知记录或草稿假定为业务类型。 */
export interface ResourceRendering {
  readonly resource: ResourceContract;
  record(value: unknown): BaseRecord;
  records(value: unknown): BaseRecord[];
  draft(action: ContractFormAction, value: unknown): Record<string, unknown>;
}

/** 同名但不同实例的契约也不可混用；宿主配置必须绑定实际查询契约。 */
export function bindResourceRendering(
  rendering: ResourceRendering | undefined, resource: ResourceContract,
): ResourceRendering | undefined {
  if (rendering && rendering.resource !== resource) {
    throw new TypeError('Renderer resource contract mismatch');
  }
  return rendering;
}

function assertAction(action: ContractFormAction): void {
  if (!['create', 'edit', 'clone', 'show'].includes(action)) {
    throw new TypeError('Invalid renderer form action');
  }
}

// 私有契约快照是类型依据。只验证当前字段，不把不完整草稿当成完整提交参数。
function fieldState<S extends ContractSchemas, A extends ContractFormAction, K extends FormField<S, A>>(
  resource: ResourceContract<S>, action: A, key: K, value: unknown,
): FieldState<ContractFormValues<S, A>[K]>;
function fieldState(
  resource: ResourceContract, action: ContractFormAction, key: string, value: unknown,
): FieldState<unknown> {
  try {
    const draft = snapshotContractFormDraft(resource, action, { [key]: value });
    const invalid = contractFormInvalidFields(resource, action, draft);
    if (invalid.includes(key) || invalid.includes('_root')) return { valid: false };
    return { valid: true, value: Object.hasOwn(draft, key) ? draft[key] : undefined };
  } catch {
    return { valid: false };
  }
}

/** 业务记录/草稿边界；无需自定义 snippet 时，不把完整渲染工具链加入首屏。 */
export function createResourceRendering<S extends ContractSchemas>(resource: ResourceContract<S>) {
  contractKey(resource);
  function record(value: unknown): ContractRecord<S> {
    return parseContractRecord(resource, value);
  }
  function records(value: unknown): ContractRecord<S>[] {
    const snapshot = snapshotPlainData(value);
    if (!Array.isArray(snapshot)) throw new TypeError('Renderer records must be an array');
    return snapshot.map(record);
  }
  function draft<A extends ContractFormAction>(action: A, value: unknown): ContractFormDraft<S, A> {
    assertAction(action);
    return snapshotContractFormDraft(resource, action, value);
  }
  return Object.freeze({ resource, record, records, draft });
}

/** 原生 Svelte 渲染适配器：不执行生成代码，不发请求，也不改变组件生命周期。 */
export function createResourceRenderers<S extends ContractSchemas>(resource: ResourceContract<S>) {
  const boundary = createResourceRendering(resource);
  const { record, records, draft } = boundary;
  const recordFields = new Set<string>(getContractFormFields(resource, 'show'));

  function cell<K extends RecordField<S>>(key: K, input: CellInput): CellContext<S, K> {
    if (!recordFields.has(key)) throw new TypeError('Unknown renderer record field');
    const checked = record(input.record);
    // value 从已校验记录读取，不相信调用方传入的脱离记录的 value。
    return { key, record: checked, value: checked[key] };
  }

  function row(input: { record: Record<string, unknown>; id: string | number }): RowContext<S> {
    const checked = record(input.record);
    const id = parseContractId(resource, input.id);
    if (!Object.is(id, checked['id'])) throw new TypeError('Renderer row identity mismatch');
    return { record: checked, id };
  }

  function summary(input: { data: readonly unknown[]; total: number; visibleColumnsCount: number }) {
    if (!Array.isArray(input.data) || !Number.isSafeInteger(input.total) || input.total < 0
      || !Number.isSafeInteger(input.visibleColumnsCount) || input.visibleColumnsCount < 0) {
      throw new TypeError('Invalid renderer summary');
    }
    return { data: input.data.map(record), total: input.total, visibleColumnsCount: input.visibleColumnsCount };
  }

  function columns<const C extends CellSnippets<S>>(
    snippets: C & Record<Exclude<keyof C, RecordField<S>>, never>,
  ): C {
    if (!snippets || ![Object.prototype, null].includes(Object.getPrototypeOf(snippets))
      || Object.getOwnPropertySymbols(snippets).length) {
      throw new TypeError('Invalid renderer column map');
    }
    for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(snippets))) {
      if (!recordFields.has(key) || !property.enumerable || !('value' in property)
        || typeof property.value !== 'function') throw new TypeError('Invalid renderer column');
    }
    // 不冻结调用方对象，也不保留可被后来添加属性的原始映射。
    return { ...snippets };
  }

  function field<A extends ContractFormAction, K extends FormField<S, A>>(
    action: A, key: K, input: FieldInput,
  ): FieldContext<S, A, K> {
    assertAction(action);
    if (!getContractFormFields(resource, action).includes(key) || input.field.key !== key) {
      throw new TypeError('Renderer form field mismatch');
    }
    const change = input.onchange;
    const readonly = action === 'show';
    function assertWritable(): void {
      if (readonly) throw new TypeError('Cannot update a read-only renderer');
    }
    return {
      field: { ...input.field, key },
      state: fieldState(resource, action, key, input.value),
      readonly,
      onchange(value) {
        assertWritable();
        const checked = fieldState(resource, action, key, value);
        if (!checked.valid) throw new TypeError('Invalid renderer field value');
        change(checked.value);
      },
      onDraftChange(value) {
        assertWritable();
        const draft = snapshotContractFormDraft(resource, action, { [key]: value });
        change(Object.hasOwn(draft, key) ? draft[key] : undefined);
      },
    };
  }

  return Object.freeze({ resource, record, records, draft, cell, row, summary, columns, field });
}

/** 在普通 .ts 配置中保留组件与属性的类型关联；使用原生 <view.component {...view.props} />。 */
export interface ComponentView<P extends Record<string, unknown>> {
  component: Component<P>;
  props: P;
}
export function componentView<P extends Record<string, unknown>>(
  component: Component<P>, props: NoInfer<P>,
): ComponentView<P> {
  return { component, props };
}
