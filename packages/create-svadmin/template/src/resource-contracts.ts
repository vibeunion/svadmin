import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';

const postInput = Type.Object({
  userId: Type.Number(), title: Type.String({ minLength: 1 }), body: Type.String(),
});
export const posts = defineResource('posts', {
  record: Type.Object({
    id: Type.Number(), userId: Type.Number(), title: Type.String(), body: Type.String(),
  }),
  create: postInput,
  update: Type.Partial(postInput),
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
  update: Type.Partial(Type.Object({
    name: Type.String(), username: Type.String(), email: Type.String(),
    phone: Type.String(), website: Type.String(),
  })),
});
const commentInput = Type.Object({
  postId: Type.Number(), name: Type.String({ minLength: 1 }), email: Type.String(), body: Type.String(),
});
export const comments = defineResource('comments', {
  record: Type.Object({
    id: Type.Number(), postId: Type.Number(), name: Type.String(), email: Type.String(), body: Type.String(),
  }),
  create: commentInput,
  update: Type.Partial(commentInput),
});
const todoInput = Type.Object({
  userId: Type.Number(), title: Type.String({ minLength: 1 }), completed: Type.Boolean(),
});
export const todos = defineResource('todos', {
  record: Type.Object({
    id: Type.Number(), userId: Type.Number(), title: Type.String(), completed: Type.Boolean(),
  }),
  create: todoInput,
  update: Type.Partial(todoInput),
});
