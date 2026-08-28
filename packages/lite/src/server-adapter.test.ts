import { describe, expect, mock, test } from 'bun:test';
import type {
  AuthProvider,
  DataProvider,
  FieldDefinition,
  ResourceDefinition,
} from '@svadmin/core';
import {
  createAuthActions,
  createAuthGuard,
  createCrudActions,
  createLegacyRedirectHook,
  createListLoader,
} from './server-adapter';

const fields: FieldDefinition[] = [
  {
    key: 'contacts',
    label: 'Contacts',
    type: 'array',
    subFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
];

const resource: ResourceDefinition = {
  name: 'accounts',
  label: 'Accounts',
  fields,
};

describe('createListLoader search compatibility', () => {
  test('searches every searchable field with one logical OR filter', async () => {
    const getList = mock(async () => ({ data: [], total: 0 }));
    const provider = { getList } as unknown as DataProvider;
    const searchableResource: ResourceDefinition = {
      name: 'posts',
      label: 'Posts',
      fields: [
        { key: 'title', label: 'Title', type: 'text', searchable: true },
        { key: 'summary', label: 'Summary', type: 'textarea', searchable: true },
        { key: 'status', label: 'Status', type: 'text' },
      ],
    };

    await createListLoader(provider, searchableResource)({
      url: new URL('https://admin.example/lite/posts?q=release'),
    });

    expect(getList).toHaveBeenCalledWith({
      resource: 'posts',
      pagination: { current: 1, pageSize: 10 },
      sorters: [],
      filters: [{
        operator: 'or',
        value: [
          { field: 'title', operator: 'contains', value: 'release' },
          { field: 'summary', operator: 'contains', value: 'release' },
        ],
      }],
    });
  });

  test('falls back to finite pagination and trusted resource sorting', async () => {
    const getList = mock(async () => ({ data: [], total: 0 }));
    const provider = { getList } as unknown as DataProvider;
    const sortableResource: ResourceDefinition = {
      name: 'posts',
      label: 'Posts',
      pageSize: 0,
      defaultSort: { field: 'title', order: 'desc' },
      fields: [
        { key: 'title', label: 'Title', type: 'text', sortable: true },
        { key: 'internal', label: 'Internal', type: 'text', sortable: false },
      ],
    };

    const result = await createListLoader(provider, sortableResource)({
      url: new URL('https://admin.example/lite/posts?page=Infinity&sort=internal&order=asc'),
    });

    expect(getList).toHaveBeenCalledWith({
      resource: 'posts',
      pagination: { current: 1, pageSize: 10 },
      sorters: [{ field: 'title', order: 'desc' }],
      filters: [],
    });
    expect(result).toMatchObject({
      page: 1,
      pageSize: 10,
      sort: 'title',
      order: 'desc',
      pagination: { page: 1, perPage: 10 },
      currentSort: 'title',
      currentOrder: 'desc',
    });
  });
});

describe('createAuthGuard AuthProvider compatibility', () => {
  function authProvider(check: AuthProvider['check']): AuthProvider {
    return {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check,
      getIdentity: mock(async () => null),
    };
  }

  function guardEvent(pathname: string) {
    const url = new URL(pathname, 'https://admin.example');
    return {
      url,
      request: new Request(url),
      cookies: {
        get: mock(() => undefined),
        delete: mock(() => undefined),
      },
    };
  }

  test('trusts AuthProvider.check without requiring a Lite-only marker cookie', async () => {
    const check = mock(async () => ({ authenticated: true }));
    const resolve = mock(async () => new Response('protected content'));
    const event = guardEvent('/lite/posts');

    const response = await createAuthGuard(authProvider(check))({ event: event as never, resolve });

    expect(await response.text()).toBe('protected content');
    expect(check).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  test('allows exported public auth pages and honors a safe provider redirect', async () => {
    const check = mock(async () => ({ authenticated: false, redirectTo: '/sign-in?expired=1' }));
    const resolve = mock(async () => new Response('public content'));
    const guard = createAuthGuard(authProvider(check));

    const publicEvent = guardEvent('/lite/forgot-password');
    expect(await (await guard({ event: publicEvent as never, resolve })).text()).toBe('public content');
    expect(check).not.toHaveBeenCalled();

    const protectedEvent = guardEvent('/lite/posts');
    const response = await guard({ event: protectedEvent as never, resolve });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?expired=1');
    expect(protectedEvent.cookies.delete).toHaveBeenCalled();
  });

  test('keeps root auth routes protected when a custom login page uses another name', async () => {
    const check = mock(async () => ({ authenticated: false }));
    const resolve = mock(async () => new Response('public content'));
    const guard = createAuthGuard(authProvider(check), '/auth/sign-in');

    const rootRegisterEvent = guardEvent('/register');
    const response = await guard({ event: rootRegisterEvent as never, resolve });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/sign-in');
    expect(check).toHaveBeenCalledTimes(1);

    const siblingRegisterEvent = guardEvent('/auth/register');
    expect(await (await guard({ event: siblingRegisterEvent as never, resolve })).text())
      .toBe('public content');
    expect(check).toHaveBeenCalledTimes(1);
  });
});

describe('createAuthActions exported page compatibility', () => {
  const cookies = {
    set: mock(() => undefined),
    delete: mock(() => undefined),
  };

  function authRequest(pathname: string, values: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value);
    const url = new URL(pathname, 'https://admin.example');
    return {
      url,
      request: new Request(url, { method: 'POST', body: formData }),
      cookies,
    };
  }

  test('exposes actions used by every exported authentication page', () => {
    const provider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
    } satisfies AuthProvider;

    expect(Object.keys(createAuthActions(provider)).sort()).toEqual([
      'forgot_password',
      'login',
      'logout',
      'register',
      'update_password',
      'update_profile',
    ]);
  });

  test('validates confirmed passwords and delegates optional provider methods', async () => {
    const register = mock(async () => ({ success: true }));
    const forgotPassword = mock(async () => ({ success: true }));
    const updatePassword = mock(async () => ({ success: true }));
    const updateProfile = mock(async () => ({ success: true }));
    const provider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
      register,
      forgotPassword,
      updatePassword,
      updateProfile,
    } satisfies AuthProvider;
    const actions = createAuthActions(provider);

    await expect(actions.register(authRequest('/lite/register', {
      email: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'different',
    }) as never)).resolves.toEqual({ success: false, error: 'Passwords do not match' });
    expect(register).not.toHaveBeenCalled();

    await expect(actions.forgot_password(authRequest('/lite/forgot-password', {
      email: 'user@example.com',
    }) as never)).resolves.toEqual({ success: true });
    await expect(actions.update_password(authRequest('/lite/update-password', {
      password: 'secret1',
      confirmPassword: 'secret1',
    }) as never)).resolves.toEqual({ success: true });
    await expect(actions.update_profile(authRequest('/lite/profile', {
      name: 'Alice',
      email: 'alice@example.com',
    }) as never)).resolves.toEqual({ success: true });

    expect(forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(updatePassword).toHaveBeenCalledWith({ password: 'secret1' });
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com' });
  });

  test('rejects missing password confirmation before invoking providers', async () => {
    const register = mock(async () => ({ success: true }));
    const updatePassword = mock(async () => ({ success: true }));
    const provider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
      register,
      updatePassword,
    } satisfies AuthProvider;
    const actions = createAuthActions(provider);

    await expect(actions.register(authRequest('/lite/register', {
      email: 'user@example.com',
      password: 'secret1',
    }) as never)).resolves.toEqual({
      success: false,
      error: 'Password and confirmation are required',
    });
    await expect(actions.update_password(authRequest('/lite/update-password', {
      password: 'secret1',
    }) as never)).resolves.toEqual({
      success: false,
      error: 'Password and confirmation are required',
    });
    expect(register).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test('preserves the AuthProvider receiver for class-style methods', async () => {
    const provider = {
      marker: 'provider-context',
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
      async register(this: { marker: string }, params: Record<string, unknown>) {
        if (this.marker !== 'provider-context') throw new Error('AuthProvider context was lost');
        return { success: params.email === 'user@example.com' };
      },
    } as unknown as AuthProvider;

    await expect(createAuthActions(provider).register(authRequest('/lite/register', {
      email: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
      error: 'client-form-state',
    }) as never)).resolves.toEqual({ success: true });
  });

  test('does not expose unexpected logout exception details', async () => {
    const deleteCookie = mock(() => undefined);
    const provider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => { throw new Error('postgres://user:secret@db.internal'); }),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
    } satisfies AuthProvider;

    await expect(createAuthActions(provider).logout({
      cookies: { delete: deleteCookie },
    } as never)).resolves.toEqual({ success: false, error: 'Logout failed' });
    expect(deleteCookie).toHaveBeenCalledWith('svadmin-session', { path: '/' });
  });

  test('does not expose unexpected registration exception details', async () => {
    const provider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
      register: mock(async () => { throw 'api-key=secret'; }),
    } satisfies AuthProvider;

    await expect(createAuthActions(provider).register(authRequest('/lite/register', {
      email: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    }) as never)).resolves.toEqual({ success: false, error: 'Registration failed' });
  });

  test('does not expose unexpected login exception details', async () => {
    const provider = {
      login: mock(async () => { throw 'api-key=secret'; }),
      logout: mock(async () => ({ success: true })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
    } satisfies AuthProvider;

    await expect(createAuthActions(provider).login(authRequest('/lite/login', {
      email: 'user@example.com',
      password: 'secret1',
    }) as never)).resolves.toEqual({ success: false, error: 'Login failed' });
  });

  test('honors logout action failures and successful provider redirects', async () => {
    const deleteCookie = mock(() => undefined);
    const failedProvider = {
      login: mock(async () => ({ success: true })),
      logout: mock(async () => ({
        success: false,
        error: { message: 'Session could not be revoked' },
      })),
      check: mock(async () => ({ authenticated: true })),
      getIdentity: mock(async () => null),
    } satisfies AuthProvider;

    await expect(createAuthActions(failedProvider).logout({
      cookies: { delete: deleteCookie },
    } as never)).resolves.toEqual({ success: false, error: 'Session could not be revoked' });

    const redirectedProvider = {
      ...failedProvider,
      logout: mock(async () => ({ success: true, redirectTo: '/signed-out' })),
    } satisfies AuthProvider;
    await expect(createAuthActions(redirectedProvider).logout({
      cookies: { delete: deleteCookie },
    } as never)).rejects.toMatchObject({ status: 303, location: '/signed-out' });
    expect(deleteCookie).toHaveBeenCalledTimes(2);
  });
});

describe('createLegacyRedirectHook navigation compatibility', () => {
  test('preserves query state, respects path segments, and leaves mutations untouched', async () => {
    const hook = createLegacyRedirectHook('/lite/');
    const resolve = mock(async () => new Response('resolved'));
    const legacyHeaders = {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Mozilla/5.0 Trident/7.0; rv:11.0',
    };

    const postsUrl = new URL('https://admin.example/posts?page=3&q=release');
    const postsResponse = await hook({
      event: {
        url: postsUrl,
        request: new Request(postsUrl, { headers: legacyHeaders }),
      } as never,
      resolve,
    });
    expect(postsResponse.headers.get('location')).toBe('/lite/posts?page=3&q=release');

    const similarPrefixUrl = new URL('https://admin.example/litefoo?page=2');
    const similarPrefixResponse = await hook({
      event: {
        url: similarPrefixUrl,
        request: new Request(similarPrefixUrl, { headers: legacyHeaders }),
      } as never,
      resolve,
    });
    expect(similarPrefixResponse.headers.get('location')).toBe('/lite/litefoo?page=2');

    const mutationUrl = new URL('https://admin.example/posts?/delete');
    const mutationResponse = await hook({
      event: {
        url: mutationUrl,
        request: new Request(mutationUrl, { method: 'POST', headers: legacyHeaders }),
      } as never,
      resolve,
    });
    expect(await mutationResponse.text()).toBe('resolved');
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  test('maps a modern SPA prefix to the standalone Lite route without changing SPA code', async () => {
    const hook = createLegacyRedirectHook({ litePrefix: '/lite', spaPrefix: '/admin' });
    const resolve = mock(async () => new Response('resolved'));
    const url = new URL('https://admin.example/admin/orders/show/7?tab=history');
    const response = await hook({
      event: {
        url,
        request: new Request(url, {
          headers: {
            accept: 'text/html',
            'user-agent': 'Mozilla/5.0 Trident/7.0; rv:11.0',
          },
        }),
      } as never,
      resolve,
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/lite/orders/show/7?tab=history');
    expect(response.headers.get('vary')).toBe('User-Agent');
    expect(response.headers.get('cache-control')).toBe('private, no-store');

    const outsideUrl = new URL('https://admin.example/docs');
    const outsideResponse = await hook({
      event: {
        url: outsideUrl,
        request: new Request(outsideUrl, {
          headers: {
            accept: 'text/html',
            'user-agent': 'Mozilla/5.0 Trident/7.0; rv:11.0',
          },
        }),
      } as never,
      resolve,
    });
    expect(await outsideResponse.text()).toBe('resolved');
  });
});

describe('createCrudActions array form parsing', () => {
  test('rejects invalid top-level boolean tokens before calling the provider', async () => {
    const create = mock(async () => ({ data: { id: 'unexpected' } }));
    const provider = { create } as unknown as DataProvider;
    const booleanResource: ResourceDefinition = {
      name: 'settings',
      label: 'Settings',
      fields: [{ key: 'active', label: 'Active', type: 'boolean', required: true }],
    };
    const formData = new FormData();
    formData.set('active', 'garbage');

    const result = await createCrudActions(provider, booleanResource).create({
      request: new Request('https://admin.example/lite/settings', { method: 'POST', body: formData }),
    } as never);

    expect(result).toMatchObject({ success: false, error: 'Validation failed' });
    expect(create).not.toHaveBeenCalled();
  });

  test('rejects invalid nested boolean tokens before calling the provider', async () => {
    const create = mock(async () => ({ data: { id: 'unexpected' } }));
    const provider = { create } as unknown as DataProvider;
    const nestedBooleanResource: ResourceDefinition = {
      name: 'accounts',
      label: 'Accounts',
      fields: [{
        key: 'contacts',
        label: 'Contacts',
        type: 'array',
        subFields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'active', label: 'Active', type: 'boolean', required: true },
        ],
      }],
    };
    const formData = new FormData();
    formData.set('contacts[0][_present]', '1');
    formData.set('contacts[0][name]', 'Alice');
    formData.set('contacts[0][active]', 'garbage');

    const result = await createCrudActions(provider, nestedBooleanResource).create({
      request: new Request('https://admin.example/lite/accounts', { method: 'POST', body: formData }),
    } as never);

    expect(result).toMatchObject({ success: false, error: 'Validation failed' });
    expect(create).not.toHaveBeenCalled();
  });

  test('does not expose unexpected provider exception details', async () => {
    const create = mock(async () => { throw new Error('postgres://user:secret@db.internal'); });
    const update = mock(async () => { throw 'api-key=secret'; });
    const deleteOne = mock(async () => { throw new Error('internal-table-name'); });
    const provider = { create, update, deleteOne } as unknown as DataProvider;
    const simpleResource: ResourceDefinition = {
      name: 'posts',
      label: 'Posts',
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'password', label: 'Password', type: 'password' },
        {
          key: 'credentials',
          label: 'Credentials',
          type: 'array',
          subFields: [
            { key: 'username', label: 'Username', type: 'text' },
            { key: 'password', label: 'Password', type: 'password' },
          ],
        },
      ],
    };
    const actions = createCrudActions(provider, simpleResource);
    const createForm = new FormData();
    createForm.set('title', 'Release');
    createForm.set('password', 'Sup3rSecret!');
    createForm.set('credentials[0][_present]', '1');
    createForm.set('credentials[0][username]', 'alice');
    createForm.set('credentials[0][password]', 'NestedSecret!');
    const updateForm = new FormData();
    updateForm.set('_id', 'post-1');
    updateForm.set('title', 'Updated release');
    const deleteForm = new FormData();
    deleteForm.set('id', 'post-1');

    await expect(actions.create({
      request: new Request('https://admin.example/lite/posts', { method: 'POST', body: createForm }),
    } as never)).resolves.toEqual({
      success: false,
      error: 'Create failed',
      values: { title: 'Release', credentials: [{ username: 'alice' }] },
    });
    await expect(actions.update({
      request: new Request('https://admin.example/lite/posts/post-1', { method: 'POST', body: updateForm }),
    } as never)).resolves.toEqual({
      success: false,
      error: 'Update failed',
      values: { title: 'Updated release', credentials: [] },
    });
    await expect(actions.delete({
      request: new Request('https://admin.example/lite/posts/post-1', { method: 'POST', body: deleteForm }),
    } as never)).resolves.toEqual({ success: false, error: 'Delete failed' });
  });

  test('enforces ResourceDefinition CRUD flags before invoking the provider', async () => {
    const create = mock(async () => ({ data: { id: 'unexpected' } }));
    const update = mock(async () => ({ data: { id: 'unexpected' } }));
    const deleteOne = mock(async () => ({ data: { id: 'unexpected' } }));
    const provider = { create, update, deleteOne } as unknown as DataProvider;
    const lockedResource: ResourceDefinition = {
      name: 'locked',
      label: 'Locked',
      canCreate: false,
      canEdit: false,
      canDelete: false,
      fields: [{ key: 'title', label: 'Title', type: 'text' }],
    };
    const createForm = new FormData();
    createForm.set('title', 'Blocked');
    const updateForm = new FormData();
    updateForm.set('_id', 'locked-1');
    updateForm.set('title', 'Blocked');
    const deleteForm = new FormData();
    deleteForm.set('id', 'locked-1');

    await expect(createCrudActions(provider, lockedResource).create({
      request: new Request('https://admin.example/lite/locked', { method: 'POST', body: createForm }),
    } as never)).resolves.toEqual({ success: false, error: 'Create is disabled for this resource' });
    await expect(createCrudActions(provider, lockedResource).update({
      request: new Request('https://admin.example/lite/locked', { method: 'POST', body: updateForm }),
    } as never)).resolves.toEqual({ success: false, error: 'Edit is disabled for this resource' });
    await expect(createCrudActions(provider, lockedResource).delete({
      request: new Request('https://admin.example/lite/locked', { method: 'POST', body: deleteForm }),
    } as never)).resolves.toEqual({ success: false, error: 'Delete is disabled for this resource' });

    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(deleteOne).not.toHaveBeenCalled();
  });

  test('restores numeric select values before calling create', async () => {
    const create = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 1, ...variables },
    }));
    const provider = { create } as unknown as DataProvider;
    const optionResource: ResourceDefinition = {
      name: 'members',
      label: 'Members',
      fields: [
        { key: 'role', label: 'Role', type: 'select', options: [{ label: 'Admin', value: 1 }] },
        { key: 'teams', label: 'Teams', type: 'multiselect', options: [{ label: 'Core', value: 10 }] },
      ],
    };
    const formData = new FormData();
    formData.set('role', '1');
    formData.append('teams', '10');

    await createCrudActions(provider, optionResource).create({
      request: new Request('https://admin.example/lite/members', { method: 'POST', body: formData }),
    } as never);

    expect(create).toHaveBeenCalledWith({
      resource: 'members',
      variables: { role: 1, teams: [10] },
    });
  });
  test('parses sparse bracketed rows, coerces sub-fields, and removes checked rows', async () => {
    const create = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 1, ...variables },
    }));
    const provider = { create } as unknown as DataProvider;
    const formData = new FormData();
    formData.set('contacts[0][_present]', '1');
    formData.set('contacts[0][name]', 'Alice');
    formData.set('contacts[0][age]', '42');
    formData.set('contacts[0][active]', 'on');
    formData.set('contacts[2][_present]', '1');
    formData.set('contacts[2][name]', 'Bob');
    formData.set('contacts[4][_present]', '1');
    formData.set('contacts[4][name]', 'Removed');
    formData.set('contacts[4][_delete]', 'on');

    const request = new Request('http://localhost/accounts', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, resource).create({ request } as never);

    expect(result).toEqual({ success: true, id: 1 });
    expect(create).toHaveBeenCalledWith({
      resource: 'accounts',
      variables: {
        contacts: [
          { name: 'Alice', age: 42, active: true },
          { name: 'Bob', active: false },
        ],
      },
    });
  });

  test('parses empty draft and removed required rows as an empty array', async () => {
    const create = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 1, ...variables },
    }));
    const provider = { create } as unknown as DataProvider;
    const formData = new FormData();
    formData.set('contacts[0][_present]', '1');
    formData.set('contacts[1][_present]', '1');
    formData.set('contacts[1][name]', '');
    formData.set('contacts[1][_delete]', '1');

    const request = new Request('http://localhost/accounts', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, resource).create({ request } as never);

    expect(result).toEqual({ success: true, id: 1 });
    expect(create).toHaveBeenCalledWith({
      resource: 'accounts',
      variables: { contacts: [] },
    });
  });

  test('does not call create when a required array draft is empty', async () => {
    const create = mock(async () => ({ data: { id: 1 } }));
    const provider = { create } as unknown as DataProvider;
    const contacts = fields[0];
    if (!contacts) throw new Error('contacts field fixture is missing');
    const requiredResource: ResourceDefinition = {
      ...resource,
      fields: [{ ...contacts, required: true }],
    };
    const formData = new FormData();
    formData.set('contacts[0][_present]', '1');

    const request = new Request('http://localhost/accounts', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, requiredResource).create({ request } as never);

    expect(result).toEqual({
      success: false,
      error: 'Validation failed',
      values: { contacts: [] },
      errors: { contacts: ['Contacts must contain at least one item'] },
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('does not call update when a real array row omits a required child', async () => {
    const update = mock(async () => ({ data: { id: 1 } }));
    const provider = { update } as unknown as DataProvider;
    const formData = new FormData();
    formData.set('_id', 'account-1');
    formData.set('contacts[0][_present]', '1');
    formData.set('contacts[0][name]', '');
    formData.set('contacts[0][age]', '42');

    const request = new Request('http://localhost/accounts/account-1', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, resource).update({ request } as never);

    expect(result).toEqual({
      success: false,
      error: 'Validation failed',
      values: { contacts: [{ name: '', age: 42, active: false }] },
      errors: { contacts: ['Name is required'] },
    });
    expect(update).not.toHaveBeenCalled();
  });

  test('validates numbers and preserves all uploaded files before calling create', async () => {
    const create = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 1, ...variables },
    }));
    const provider = { create } as unknown as DataProvider;
    const uploadResource: ResourceDefinition = {
      name: 'uploads',
      label: 'Uploads',
      fields: [
        { key: 'count', label: 'Count', type: 'number', required: true },
        { key: 'optionalCount', label: 'Optional count', type: 'number' },
        { key: 'attachment', label: 'Attachment', type: 'file', required: true },
        { key: 'avatar', label: 'Avatar', type: 'image', required: true },
        { key: 'gallery', label: 'Gallery', type: 'images', required: true },
      ],
    };
    const attachment = new File(['report'], 'report.txt', { type: 'text/plain' });
    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const firstImage = new File(['first'], 'first.png', { type: 'image/png' });
    const secondImage = new File(['second'], 'second.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('count', '42.5');
    formData.set('optionalCount', '');
    formData.set('attachment', attachment);
    formData.set('avatar', avatar);
    formData.append('gallery', firstImage);
    formData.append('gallery', secondImage);

    const request = new Request('http://localhost/uploads', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, uploadResource).create({ request } as never);

    expect(result).toEqual({ success: true, id: 1 });
    expect(create).toHaveBeenCalledTimes(1);
    const variables = create.mock.calls[0]?.[0].variables;
    expect(variables?.count).toBe(42.5);
    expect(variables?.optionalCount).toBeUndefined();
    expect(variables?.attachment).toBeInstanceOf(File);
    expect(variables?.avatar).toBeInstanceOf(File);
    expect(variables?.gallery).toHaveLength(2);
    expect((variables?.gallery as File[]).map((file) => file.name)).toEqual(['first.png', 'second.png']);
  });

  test('keeps an existing required upload when edit submits no replacement file', async () => {
    const update = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 'upload-1', ...variables },
    }));
    const provider = { update } as unknown as DataProvider;
    const uploadResource: ResourceDefinition = {
      name: 'uploads',
      label: 'Uploads',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'attachment', label: 'Attachment', type: 'file', required: true },
      ],
    };
    const formData = new FormData();
    formData.set('_id', 'upload-1');
    formData.set('title', 'Existing upload');

    const request = new Request('http://localhost/uploads/upload-1', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, uploadResource).update({ request } as never);

    expect(result).toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      resource: 'uploads',
      id: 'upload-1',
      variables: { title: 'Existing upload' },
    });
  });

  test('retains nested edit upload references and lets new Files replace retained references', async () => {
    const update = mock(async ({ variables }: { variables: Record<string, unknown> }) => ({
      data: { id: 'account-1', ...variables },
    }));
    const provider = { update } as unknown as DataProvider;
    const documentsResource: ResourceDefinition = {
      name: 'accounts',
      label: 'Accounts',
      fields: [{
        key: 'documents',
        label: 'Documents',
        type: 'array',
        required: true,
        subFields: [
          { key: 'attachment', label: 'Attachment', type: 'file', required: true },
          { key: 'gallery', label: 'Gallery', type: 'images', required: true },
        ],
      }],
    };
    const replacement = new File(['replacement'], 'replacement.pdf', { type: 'application/pdf' });
    const firstNewImage = new File(['new-one'], 'new-one.png', { type: 'image/png' });
    const secondNewImage = new File(['new-two'], 'new-two.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('_id', 'account-1');
    formData.set('documents[0][_present]', '1');
    formData.append('documents[0][attachment]', '/stored/report.pdf');
    formData.append('documents[0][gallery]', '/stored/first.png');
    formData.append('documents[0][gallery]', '/stored/second.png');
    formData.set('documents[1][_present]', '1');
    formData.append('documents[1][attachment]', '/stored/old.pdf');
    formData.append('documents[1][attachment]', replacement);
    formData.append('documents[1][gallery]', '/stored/old.png');
    formData.append('documents[1][gallery]', firstNewImage);
    formData.append('documents[1][gallery]', secondNewImage);

    const request = new Request('http://localhost/accounts/account-1', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, documentsResource).update({ request } as never);

    expect(result).toEqual({ success: true });
    expect(update).toHaveBeenCalledTimes(1);
    const documents = update.mock.calls[0]?.[0].variables.documents as Record<string, unknown>[];
    expect(documents[0]).toEqual({
      attachment: '/stored/report.pdf',
      gallery: ['/stored/first.png', '/stored/second.png'],
    });
    expect(documents[1]?.attachment).toBeInstanceOf(File);
    expect((documents[1]?.attachment as File).name).toBe('replacement.pdf');
    expect((documents[1]?.gallery as File[]).map((file) => file.name)).toEqual(['new-one.png', 'new-two.png']);
  });

  test('leaves delete action validation behavior unchanged', async () => {
    const deleteOne = mock(async () => ({ data: { id: 'account-1' } }));
    const provider = { deleteOne } as unknown as DataProvider;
    const formData = new FormData();
    formData.set('id', 'account-1');

    const request = new Request('http://localhost/accounts/account-1', {
      method: 'POST',
      body: formData,
    });
    const result = await createCrudActions(provider, resource).delete({ request } as never);

    expect(result).toEqual({ success: true });
    expect(deleteOne).toHaveBeenCalledWith({ resource: 'accounts', id: 'account-1' });
  });

  test('only follows same-origin absolute paths after delete', async () => {
    const deleteOne = mock(async () => ({ data: { id: 'account-1' } }));
    const provider = { deleteOne } as unknown as DataProvider;
    const externalForm = new FormData();
    externalForm.set('id', 'account-1');
    externalForm.set('redirect', 'https://evil.example/landing');
    const externalRequest = new Request('https://admin.example/lite/accounts', {
      method: 'POST',
      body: externalForm,
    });

    await expect(
      createCrudActions(provider, resource).delete({ request: externalRequest } as never),
    ).resolves.toEqual({ success: true });

    const controlCharacterForm = new FormData();
    controlCharacterForm.set('id', 'account-1');
    controlCharacterForm.set('redirect', '/lite/accounts\nlocation:https://evil.example');
    const controlCharacterRequest = new Request('https://admin.example/lite/accounts', {
      method: 'POST',
      body: controlCharacterForm,
    });

    await expect(
      createCrudActions(provider, resource).delete({ request: controlCharacterRequest } as never),
    ).resolves.toEqual({ success: true });

    const localForm = new FormData();
    localForm.set('id', 'account-1');
    localForm.set('redirect', '/lite/accounts?page=2');
    const localRequest = new Request('https://admin.example/lite/accounts', {
      method: 'POST',
      body: localForm,
    });

    await expect(
      createCrudActions(provider, resource).delete({ request: localRequest } as never),
    ).rejects.toMatchObject({ status: 303, location: '/lite/accounts?page=2' });
  });

  test('rejects update and delete submissions without a record id', async () => {
    const update = mock(async () => ({ data: { id: 'unexpected' } }));
    const deleteOne = mock(async () => ({ data: { id: 'unexpected' } }));
    const provider = { update, deleteOne } as unknown as DataProvider;
    const updateRequest = new Request('https://admin.example/lite/accounts', {
      method: 'POST',
      body: new FormData(),
    });
    const deleteRequest = new Request('https://admin.example/lite/accounts', {
      method: 'POST',
      body: new FormData(),
    });

    await expect(
      createCrudActions(provider, resource).update({ request: updateRequest } as never),
    ).resolves.toEqual({ success: false, error: 'Missing record id' });
    await expect(
      createCrudActions(provider, resource).delete({ request: deleteRequest } as never),
    ).resolves.toEqual({ success: false, error: 'Missing record id' });
    expect(update).not.toHaveBeenCalled();
    expect(deleteOne).not.toHaveBeenCalled();
  });
});
