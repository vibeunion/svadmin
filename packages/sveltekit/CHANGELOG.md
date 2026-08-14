# Changelog

## [0.10.0](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.9...sveltekit-v0.10.0) (2026-08-14)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### 🚀 Features

* **ui:** refine AutoTable to fluid borderless design and Sidebar to pill-style elevated states ([de92adc](https://github.com/zuohuadong/svadmin/commit/de92adc3fbf0077fb68c5a49009b546397916786))


### 🐛 Bug Fixes

* **admin:** unblock scoped consumers ([#231](https://github.com/zuohuadong/svadmin/issues/231)) ([4f572d9](https://github.com/zuohuadong/svadmin/commit/4f572d9dd46c2bf656383718aafdc5ef3c08573c))
* **build:** resolve playwright error and preserve semver strings for npm publish using node-workspace ([67e71d4](https://github.com/zuohuadong/svadmin/commit/67e71d4946430122fe1eea7ac06bc40cf9441a85))
* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))
* **core:** improve query caching and optimistic update recovery ([a18356e](https://github.com/zuohuadong/svadmin/commit/a18356e0f777b8d21e5f58bee8d9d2250a64f1ef))
* **core:** resolve data provider regressions and type errors ([8728fcc](https://github.com/zuohuadong/svadmin/commit/8728fcc737cbf6ece7400de7282984e3f2dce9f0))
* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))
* **core:** router formatting, breadcrumb parsing, and hook caching ([2b31b0b](https://github.com/zuohuadong/svadmin/commit/2b31b0bc1587514c030bb6788116deb3f7269f34))
* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))
* **ui:** stabilize AutoTable state and search ([#195](https://github.com/zuohuadong/svadmin/issues/195)) ([24d158e](https://github.com/zuohuadong/svadmin/commit/24d158e5f6f6d5c475a9032805a277e2e4f15279))


### 💅 Elegance & Refactoring

* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))
* **core:** migrate permissions and core utilities to Svelte 5 runes ([8e3ed99](https://github.com/zuohuadong/svadmin/commit/8e3ed9950b56ffcbe4877f46987bd8eb69ef21f1))
* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))
* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))
* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))
* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))
* release main ([c555c7b](https://github.com/zuohuadong/svadmin/commit/c555c7bb989d6b09e428e5b8eb80b30c36ec123c))
* release main ([732049c](https://github.com/zuohuadong/svadmin/commit/732049cc0e8ef842f5a789b398dab16aca8b9ec7))
* release main ([d0f3d8a](https://github.com/zuohuadong/svadmin/commit/d0f3d8ab328a430f7727db0544d49e514a069504))
* release main ([874c1f6](https://github.com/zuohuadong/svadmin/commit/874c1f6d36ac62c59fb59ced8ef54afd5076bee8))
* release main ([f54fc17](https://github.com/zuohuadong/svadmin/commit/f54fc17f39a22ef3a886badcb84d252150b133c8))
* release main ([252f1ac](https://github.com/zuohuadong/svadmin/commit/252f1ac613e6ebc4245602a52397592aeb02c218))
* release main ([c8a0a4a](https://github.com/zuohuadong/svadmin/commit/c8a0a4a8aee4433828016746262bbc9ccd8d27b4))
* release main ([cf14a58](https://github.com/zuohuadong/svadmin/commit/cf14a5842cdbfe24fb126c78493da3bfced894e4))
* release main ([01c3f66](https://github.com/zuohuadong/svadmin/commit/01c3f660b457ec36e18fc68d1d05eb07c0b64290))
* release main ([b1b2f19](https://github.com/zuohuadong/svadmin/commit/b1b2f19a6fdb2754266d6f06903ee20090c369f4))
* release main ([a77f3dc](https://github.com/zuohuadong/svadmin/commit/a77f3dc2e37da76ebe3139ea0c5c6d4aeecfd35f))
* release main ([0f87dd9](https://github.com/zuohuadong/svadmin/commit/0f87dd92d411963dfd2cbf4173b0f4556e8a689f))
* release main ([#108](https://github.com/zuohuadong/svadmin/issues/108)) ([cf85315](https://github.com/zuohuadong/svadmin/commit/cf8531528b84c0fa35a3e85c112e168173e36698))
* release main ([#109](https://github.com/zuohuadong/svadmin/issues/109)) ([6c11dcb](https://github.com/zuohuadong/svadmin/commit/6c11dcb01ad0c068bbceafd51eb0f486b2d41e21))
* release main ([#112](https://github.com/zuohuadong/svadmin/issues/112)) ([c930b57](https://github.com/zuohuadong/svadmin/commit/c930b578509f69cd05d299838b4ca55aa28ee59e))
* release main ([#113](https://github.com/zuohuadong/svadmin/issues/113)) ([fdeee44](https://github.com/zuohuadong/svadmin/commit/fdeee4460c3467fa069fdd5219b343464aa04f1e))
* release main ([#115](https://github.com/zuohuadong/svadmin/issues/115)) ([ca3402f](https://github.com/zuohuadong/svadmin/commit/ca3402f1a17fff02b7cd7b6e2768817f95834eb3))
* release main ([#116](https://github.com/zuohuadong/svadmin/issues/116)) ([7124de0](https://github.com/zuohuadong/svadmin/commit/7124de09dadbc424674bd7b4d490c298ac768e79))
* release main ([#152](https://github.com/zuohuadong/svadmin/issues/152)) ([b1e260f](https://github.com/zuohuadong/svadmin/commit/b1e260fb5f40d8048f689e2930f49a7e4d495a19))
* release main ([#181](https://github.com/zuohuadong/svadmin/issues/181)) ([e9a401b](https://github.com/zuohuadong/svadmin/commit/e9a401bfe2c225c2799264a374b35d1ea3f7a679))
* release main ([#196](https://github.com/zuohuadong/svadmin/issues/196)) ([61d8f49](https://github.com/zuohuadong/svadmin/commit/61d8f49f2096981b5bf533a83a1ddf4dd97ca982))
* release main ([#201](https://github.com/zuohuadong/svadmin/issues/201)) ([925fd58](https://github.com/zuohuadong/svadmin/commit/925fd5831dea6320daad1ee7cf0e7c2ae69d8f34))
* release main ([#232](https://github.com/zuohuadong/svadmin/issues/232)) ([bce07f3](https://github.com/zuohuadong/svadmin/commit/bce07f3c3cbf493ad689478a541f0bde97c8f2d4))
* release main ([#87](https://github.com/zuohuadong/svadmin/issues/87)) ([56581db](https://github.com/zuohuadong/svadmin/commit/56581dba457486dad2e2a4a5a0662e174a89790d))
* **release:** complete 0.36 compatibility closure ([e2cb740](https://github.com/zuohuadong/svadmin/commit/e2cb74098f08d2e87690b9d6ef0f44afbe7d5a59))
* **release:** decouple workspace versions for local dev and use dynamic npm publishing ([a54fbe7](https://github.com/zuohuadong/svadmin/commit/a54fbe7270a1afd2b482bdae2684de3139379784))
* **workspace:** formatting and lockfile sync ([4939f3e](https://github.com/zuohuadong/svadmin/commit/4939f3ec24f599a66dc40c5680c3485dbb34605d))

## [0.9.9](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.8...sveltekit-v0.9.9) (2026-08-14)


### 🐛 Bug Fixes

* **sveltekit:** support Core 0.36.0

## [0.9.8](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.7...sveltekit-v0.9.8) (2026-08-11)


### 🐛 Bug Fixes

* **admin:** unblock scoped consumers ([#231](https://github.com/zuohuadong/svadmin/issues/231)) ([4f572d9](https://github.com/zuohuadong/svadmin/commit/4f572d9dd46c2bf656383718aafdc5ef3c08573c))

## [0.9.7](https://github.com/zuohuadong/svadmin/compare/sveltekit-v0.9.6...sveltekit-v0.9.7) (2026-07-30)


### 🔧 Miscellaneous Chores

* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))

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
