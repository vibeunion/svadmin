# Changelog

## [0.9.13](https://github.com/vibeunion/svadmin/compare/strapi-v0.9.12...strapi-v0.9.13) (2026-08-27)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @svadmin/refine-adapter bumped to 0.10.4
  * peerDependencies
    * @svadmin/core bumped to 0.42.0

## [0.9.12](https://github.com/vibeunion/svadmin/compare/strapi-v0.9.11...strapi-v0.9.12) (2026-08-27)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @svadmin/refine-adapter bumped to 0.10.3
  * peerDependencies
    * @svadmin/core bumped to 0.41.1

## [0.9.11](https://github.com/vibeunion/svadmin/compare/strapi-v0.9.10...strapi-v0.9.11) (2026-08-16)


### 🔧 Miscellaneous Chores

* **repo:** transfer to vibeunion org ([0fbdf8b](https://github.com/vibeunion/svadmin/commit/0fbdf8bdd6b0559135d1c3636323e963d688dda3))
* **repo:** transfer to vibeunion org ([78f26be](https://github.com/vibeunion/svadmin/commit/78f26be1b53d0fbe74e1c3a6c6c21547833c2334))
* **repo:** transfer to vibeunion org ([a2fdf96](https://github.com/vibeunion/svadmin/commit/a2fdf966a822dfe7f3de6990567a5689e6732857))

## [0.9.10](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.9...strapi-v0.9.10) (2026-07-30)


### 🔧 Miscellaneous Chores

* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))

## [0.9.9](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.8...strapi-v0.9.9) (2026-07-11)


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))

## [0.9.8](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.7...strapi-v0.9.8) (2026-06-04)


### 🔧 Miscellaneous Chores

* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))

## [0.9.7](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.6...strapi-v0.9.7) (2026-05-04)


### 🐛 Bug Fixes

* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))

## [0.9.6](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.5...strapi-v0.9.6) (2026-04-13)


### 🐛 Bug Fixes

* **providers:** make refine-adapter a hard dependency ([f8ca988](https://github.com/zuohuadong/svadmin/commit/f8ca9883471bcee8da53ea7634441db31e3cd521))
* **providers:** use dynamic import for refine-adapter ([bd922de](https://github.com/zuohuadong/svadmin/commit/bd922de8b96ee6334515dcdca3c81cdf4a4163f4))

## [0.9.5](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.4...strapi-v0.9.5) (2026-04-13)


### 🔧 Miscellaneous Chores

* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))
* **workspace:** formatting and lockfile sync ([4939f3e](https://github.com/zuohuadong/svadmin/commit/4939f3ec24f599a66dc40c5680c3485dbb34605d))

## [0.9.4](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.3...strapi-v0.9.4) (2026-04-10)


### 🐛 Bug Fixes

* **providers,auth:** lazy dynamic imports for peer deps, SSR safeguards for window.location access ([2bc5819](https://github.com/zuohuadong/svadmin/commit/2bc5819d59ad223f71e42fa208c8e717412b2552))


### 💅 Elegance & Refactoring

* **core:** migrate 9 data provider pkgs to refine-adapter ([1ba465d](https://github.com/zuohuadong/svadmin/commit/1ba465d1f7de63e7efb6d632ad1f4750be07cfd5))

## [0.9.3](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.2...strapi-v0.9.3) (2026-04-03)


### 🐛 Bug Fixes

* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))

## [0.9.2](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.1...strapi-v0.9.2) (2026-03-31)


### 🔧 Miscellaneous Chores

* **release:** decouple workspace versions for local dev and use dynamic npm publishing ([a54fbe7](https://github.com/zuohuadong/svadmin/commit/a54fbe7270a1afd2b482bdae2684de3139379784))

## [0.9.1](https://github.com/zuohuadong/svadmin/compare/strapi-v0.9.0...strapi-v0.9.1) (2026-03-31)


### 🐛 Bug Fixes

* **build:** resolve playwright error and preserve semver strings for npm publish using node-workspace ([67e71d4](https://github.com/zuohuadong/svadmin/commit/67e71d4946430122fe1eea7ac06bc40cf9441a85))

## [0.9.0](https://github.com/zuohuadong/svadmin/compare/strapi-v0.8.0...strapi-v0.9.0) (2026-03-30)


### ⚠ BREAKING CHANGES

* Deprecated legacy useHasPermission API. usePermissions now returns immediate .has() and .can() methods and drops .data envelope. AutoTable drops global cellRenderer prop in favor of columns definitions map. Sidebar now defaults to SvelteKit path routing instead of hash-based (#).

### Code Refactoring

* modernize enterprise architecture and resolve technical debt ([860ae60](https://github.com/zuohuadong/svadmin/commit/860ae607b1d3002e3318c51047d6219bc073050f))

## [0.8.0](https://github.com/zuohuadong/svadmin/compare/strapi-v0.7.0...strapi-v0.8.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Features

* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* align peerDependencies to ^0.5.0 and complete release-please extra-files ([35fca5a](https://github.com/zuohuadong/svadmin/commit/35fca5a4fa0c8a3284a4f763b46f969c0634459b))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))


### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.7.0](https://github.com/zuohuadong/svadmin/compare/strapi-v0.6.0...strapi-v0.7.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.6.0](https://github.com/zuohuadong/svadmin/compare/strapi-v0.5.14...strapi-v0.6.0) (2026-03-26)


### Features

* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* align peerDependencies to ^0.5.0 and complete release-please extra-files ([35fca5a](https://github.com/zuohuadong/svadmin/commit/35fca5a4fa0c8a3284a4f763b46f969c0634459b))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
