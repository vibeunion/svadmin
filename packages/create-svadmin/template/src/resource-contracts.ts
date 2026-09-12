import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core';

export const posts = defineResource('posts', {
  record: Type.Object({
    id: Type.Number(), userId: Type.Number(), title: Type.String(), body: Type.String(),
  }),
});
export const users = defineResource('users', {
  record: Type.Object({
    id: Type.Number(), name: Type.String(), username: Type.String(), email: Type.String(),
    phone: Type.String(), website: Type.String(),
    address: Type.Object({
      street: Type.String(), suite: Type.String(), city: Type.String(), zipcode: Type.String(),
      geo: Type.Object({ lat: Type.String(), lng: Type.String() }),
    }),
    company: Type.Object({ name: Type.String(), catchPhrase: Type.String(), bs: Type.String() }),
  }),
});
export const comments = defineResource('comments', {
  record: Type.Object({
    id: Type.Number(), postId: Type.Number(), name: Type.String(), email: Type.String(), body: Type.String(),
  }),
});
export const todos = defineResource('todos', {
  record: Type.Object({
    id: Type.Number(), userId: Type.Number(), title: Type.String(), completed: Type.Boolean(),
  }),
});
