import { Type } from '@sinclair/typebox';
export const actionDescriptor = {
  id: 'contacts.create', version: 'v1', label: 'Create contact', approval: 'confirm' as const,
  inputSchema: Type.Object({
    profile: Type.Object({ name: Type.String({ title: 'Contact name', minLength: 1 }), active: Type.Boolean({ title: 'Active', default: true }) }, { title: 'Profile', additionalProperties: false }),
    addresses: Type.Array(Type.Object({ city: Type.String({ title: 'City', minLength: 1 }) }, { additionalProperties: false }), { title: 'Addresses', maxItems: 4 }),
  }, { additionalProperties: false }),
};
export const policy = { resources: { contacts: { readFields: ['id', 'name'], maxPageSize: 10 } } };
export const firstChunk = 'root = Surface("contacts", "Contact operations", [records], [count, table, first, second], "md")\n'
  + 'records = Source({"id":"records","type":"resource-list","resource":"contacts","pageSize":10})\n'
  + 'count = Metric("count", {"label":"Contacts", "format":"number", "appearance":{"tone":"info","density":"compact"}}, {"sourceId":"records","pointer":"/total"}, 4)\n'
  + 'table = ResourceTable("table", {"title":"Records", "columns":[{"field":"name","label":"Name"}],"appearance":{"density":"compact"}}, {"sourceId":"records","pointer":"/items"}, 8)\n'
  + 'first = ResourceForm("first", {"actionId":"contacts.create","title":"Create primary contact", "appearance":{"tone":"info","density":"compact"}}, null, 6)\n';
export const lastChunk = 'second = ResourceForm("second", {"actionId":"contacts.create","title":"Create secondary contact"}, null, 6)\n';
