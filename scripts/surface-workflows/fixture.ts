import { Type } from '@sinclair/typebox';
export const actionDescriptor = {
  id: 'contacts.create', version: 'v1', label: 'Create contact', approval: 'confirm' as const,
  inputSchema: Type.Object({
    profile: Type.Object({ name: Type.String({ title: 'Contact name', minLength: 1 }), active: Type.Boolean({ title: 'Active', default: true }) }, { title: 'Profile', additionalProperties: false }),
    addresses: Type.Array(Type.Object({ city: Type.String({ title: 'City', minLength: 1 }) }, { additionalProperties: false }), { title: 'Addresses', maxItems: 4 }),
  }, { additionalProperties: false }),
};
export const policy = { resources: {
  contacts: { readFields: ['id', 'name', 'active', 'balance'], allowGetOne: true, maxPageSize: 10 },
  events: { readFields: ['id', 'action', 'at', 'actor', 'comment'], maxPageSize: 10 },
} };
export const firstChunk = 'root = Surface("contacts", "Contact operations", [records], [count, table, first, second], "md")\n'
  + 'records = Source({"id":"records","type":"resource-list","resource":"contacts","pageSize":10})\n'
  + 'count = Metric("count", {"label":"Contacts", "format":"number", "appearance":{"tone":"info","density":"compact"}}, {"sourceId":"records","pointer":"/total"}, 4)\n'
  + 'table = ResourceTable("table", {"title":"Records", "columns":[{"field":"name","label":"Name"}],"appearance":{"density":"compact"}}, {"sourceId":"records","pointer":"/items"}, 8)\n'
  + 'first = ResourceForm("first", {"actionId":"contacts.create","title":"Create primary contact", "appearance":{"tone":"info","density":"compact"}}, null, 6)\n';
export const lastChunk = 'second = ResourceForm("second", {"actionId":"contacts.create","title":"Create secondary contact"}, null, 6)\n';

// 合成只读业务记录；与真实模型或生产审计来源无关。
export const businessFirstChunk = 'root = Surface("contacts", "Contact workspace", [records, person, events], [detail, activity, first, second], "md")\n'
  + 'records = Source({"id":"records","type":"resource-list","resource":"contacts","pageSize":10})\n'
  + 'person = Source({"id":"person","type":"resource-one","resource":"contacts","recordId":"seed"})\n'
  + 'events = Source({"id":"events","type":"resource-list","resource":"events","pageSize":10})\n'
  + 'detail = ResourceDetail("detail", {"title":"Contact details","fields":[{"field":"name","label":"Name"},{"field":"active","label":"Active","format":"boolean"},{"field":"balance","label":"Balance","format":"number"}],"tone":"info","density":"compact"}, {"sourceId":"person","pointer":""}, 6)\n'
  + 'first = ResourceForm("first", {"actionId":"contacts.create","title":"Create primary contact"}, null, 6)\n';
export const businessLastChunk = 'activity = ActivityFeed("activity", {"title":"Contact activity","idField":"id","actionField":"action","timestampField":"at","actorField":"actor","commentField":"comment","tone":"neutral","density":"compact"}, {"sourceId":"events","pointer":"/items"}, 6)\n'
  + lastChunk;
