# Incremental Surface data loading

`SurfaceRenderer` still validates the entire incoming spec before issuing queries. It now reconciles data sources by their query and effective resource policy instead of clearing every source on each spec edit.

| Change | Data loading behavior |
| --- | --- |
| Title, layout, widget label/props, placement, widget order, locale, messages | Reuse current results and in-flight requests |
| Equivalent JSON, omitted/default page size, reordered policy allowlists | Reuse current results and in-flight requests |
| One source's resource, record ID, filters, sorting, or page size | Reload only that source |
| One resource's readable/filterable/sortable fields or limits | Reload sources for that resource, after whole-spec validation |
| Provider identity/methods, owning registered access control, auth-provider identity, logout version, tenant cache identity, surface ID, or `dataScopeKey` | Invalidate the affected source identities |
| Removed source | Remove its state and retire its pending response |
| Invalid spec | Clear all source state; issue no new queries |
| `refresh(sourceId)` / `refresh()` | Force a named / complete refresh |
| Component destruction | Retire all requests; ignore subsequent responses and error callbacks |

Source states are held in a `SvelteMap`; widgets read only their own bound source. Provider records are not recursively wrapped in reactive proxies. Query snapshots copy filter arrays and resource-policy allowlists so an in-flight request cannot acquire a later edit's projection policy. Sort priority and filter order remain significant.

## Host-controlled session scope

The cache is local to each renderer. It is not shared across users, component instances, or application trees. Presentation edits are not a reauthorization or freshness signal.

When credentials, login identity, authorization decisions, or other provider-internal state change **without replacing an observable provider/context value**, the host must change `dataScopeKey`, explicitly call `refresh()`, or unmount the renderer. This includes a login/session transition on the same provider instance that does not change the existing logout version. Use a non-secret revision, not a token or credential:

```svelte
<SurfaceRenderer
  {spec}
  {policy}
  {dataProvider}
  dataScopeKey={sessionRevision}
/>
```

`dataScopeKey?: string | number` is a trusted host prop, not part of `SurfaceSpec` and not an AI-controlled action. This change does not add mutations or replace backend authorization.

Equivalent edits also preserve a current error instead of retrying it automatically. Use `refresh()` to retry. No TTL, automatic polling, or global query cache is added.

## Owning permission context

Permission checks now use the same checked `AdminContext` provider as the cache identity, rather than calling the module-global provider inside a scoped tree. Scoped denial blocks both list and get-one reads even when a global provider allows them. Tenant metadata follows the owning context. Malformed decisions and provider failures still fail closed through the registered provider's decoder.

Without a scoped context, the accessor preserves the module-level compatibility provider. An explicit null provider inside a scoped context remains authoritative, matching the core context contract; it does not inherit an unrelated global provider. Unrelated global registrations no longer refetch scoped sources. Replacing the owning provider still invalidates its results and pending permission checks. These are browser-side read controls, not server authorization.

## Race handling

An entry's request owner is replaced on reload and removed on deletion, invalidation, or destruction. Late successes and failures cannot overwrite a newer owner, including when a deleted source ID is reused. Currentness is also checked against the latest validated request plan before accepting a response and after an asynchronous permission check, so an obsolete permission result cannot start a new provider query.

This is logical cancellation. A provider request already sent over the network is not physically aborted: the existing read-provider contract has no cancellation signal. Manual refresh intentionally supersedes even an in-flight request.
