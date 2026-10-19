# Product workspace

This blueprint is generated from a validated `svadmin.product.json`. It keeps
product decisions, navigation and page metadata in generated files so the
application starts with a coherent information architecture instead of a
database-shaped menu.

The default provider is an empty in-memory provider. It is useful for visual
review and route acceptance, but it is not a backend, an authorization boundary,
or a source of business data. Wire an explicit provider and command contract
before enabling production mutations.

Generated files under `src/generated` are derived artifacts. Edit the product
plan and regenerate the project rather than editing those files by hand.
