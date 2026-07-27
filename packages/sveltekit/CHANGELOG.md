# Changelog

## [0.9.6](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.5...sveltekit-v0.9.6) (2026-07-27)


### 🐛 Bug Fixes

* **ui:** stabilize AutoTable state and search ([#195](https://github.com/zuohuadong/svadmin/issues/195)) ([24d158e](https://github.com/zuohuadong/svadmin/commit/24d158e5f6f6d5c475a9032805a277e2e4f15279))

## [0.9.5](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.4...sveltekit-v0.9.5) (2026-07-11)


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))

## [0.9.4](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.3...sveltekit-v0.9.4) (2026-06-04)


### 🔧 Miscellaneous Chores

* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))

## [0.9.3](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.2...sveltekit-v0.9.3) (2026-05-04)


### 🐛 Bug Fixes

* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))

## [0.9.2](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.1...sveltekit-v0.9.2) (2026-04-13)


### 🔧 Miscellaneous Chores

* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))
* **workspace:** formatting and lockfile sync ([4939f3e](https://github.com/zuohuadong/svadmin/commit/4939f3ec24f599a66dc40c5680c3485dbb34605d))

## [0.9.1](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.0...sveltekit-v0.9.1) (2026-04-12)


### 💅 Elegance & Refactoring

* **core:** migrate permissions and core utilities to Svelte 5 runes ([8e3ed99](https://github.com/zuohuadong/svadmin/commit/8e3ed9950b56ffcbe4877f46987bd8eb69ef21f1))

## [0.9.0](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.7...sveltekit-v0.9.0) (2026-04-12)


### 🚀 Features

* **ui:** refine AutoTable to fluid borderless design and Sidebar to pill-style elevated states ([de92adc](https://github.com/zuohuadong/svadmin/commit/de92adc3fbf0077fb68c5a49009b546397916786))


### 🐛 Bug Fixes

* **core:** improve query caching and optimistic update recovery ([a18356e](https://github.com/zuohuadong/svadmin/commit/a18356e0f777b8d21e5f58bee8d9d2250a64f1ef))

## [0.8.7](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.6...sveltekit-v0.8.7) (2026-04-11)


### 🐛 Bug Fixes

* **core:** router formatting, breadcrumb parsing, and hook caching ([2b31b0b](https://github.com/zuohuadong/svadmin/commit/2b31b0bc1587514c030bb6788116deb3f7269f34))

## [0.8.6](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.5...sveltekit-v0.8.6) (2026-04-11)


### 🐛 Bug Fixes

* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))

## [0.8.5](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.4...sveltekit-v0.8.5) (2026-04-10)


### 🐛 Bug Fixes

* **core:** resolve data provider regressions and type errors ([8728fcc](https://github.com/zuohuadong/svadmin/commit/8728fcc737cbf6ece7400de7282984e3f2dce9f0))

## [0.8.4](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.3...sveltekit-v0.8.4) (2026-04-03)


### 🐛 Bug Fixes

* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))

## [0.8.3](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.2...sveltekit-v0.8.3) (2026-03-31)


### 🔧 Miscellaneous Chores

* **release:** decouple workspace versions for local dev and use dynamic npm publishing ([a54fbe7](https://github.com/zuohuadong/svadmin/commit/a54fbe7270a1afd2b482bdae2684de3139379784))

## [0.8.2](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.1...sveltekit-v0.8.2) (2026-03-31)


### 🐛 Bug Fixes

* **build:** resolve playwright error and preserve semver strings for npm publish using node-workspace ([67e71d4](https://github.com/zuohuadong/svadmin/commit/67e71d4946430122fe1eea7ac06bc40cf9441a85))

## [0.8.1](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.8.0...sveltekit-v0.8.1) (2026-03-31)


### 💅 Elegance & Refactoring

* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))

## [0.8.0](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.7.0...sveltekit-v0.8.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Features

* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* align peerDependencies to ^0.5.0 and complete release-please extra-files ([35fca5a](https://github.com/zuohuadong/svadmin/commit/35fca5a4fa0c8a3284a4f763b46f969c0634459b))
* **core:** resolve strict ts constraints across all data providers and stabilize tests ([028a2a6](https://github.com/zuohuadong/svadmin/commit/028a2a6205a9bbe2afd2db558546fb862a4a8bac))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))


### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.7.0](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.6.0...sveltekit-v0.7.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.6.0](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.5.14...sveltekit-v0.6.0) (2026-03-26)


### Features

* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* align peerDependencies to ^0.5.0 and complete release-please extra-files ([35fca5a](https://github.com/zuohuadong/svadmin/commit/35fca5a4fa0c8a3284a4f763b46f969c0634459b))
* **core:** resolve strict ts constraints across all data providers and stabilize tests ([028a2a6](https://github.com/zuohuadong/svadmin/commit/028a2a6205a9bbe2afd2db558546fb862a4a8bac))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
