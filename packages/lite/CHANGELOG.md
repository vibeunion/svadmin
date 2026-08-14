# Changelog

## [0.4.0](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.15...lite-v0.4.0) (2026-08-14)


### ⚠ BREAKING CHANGES

* **deps:** @lucide/svelte replaces lucide-svelte as icon package. @tiptap/* upgraded from v2 to v3. zod upgraded from v3 to v4 in @svadmin/lite.
* **core:** trigger major release for removed deprecated APIs

### 🚀 Features

* add lite enterprise components (PermissionMatrix, AuditLog, ArrayField) and docs ([6fbb9a5](https://github.com/zuohuadong/svadmin/commit/6fbb9a59110a475fad487d112eceaf0e93e72e0a))
* **core,ui,lite:** add multi-level menu support with MenuItem type and recursive SidebarItem ([25603ae](https://github.com/zuohuadong/svadmin/commit/25603ae08ee576beda973ee3acfa43ff92cc1cea))
* **lite:** add @svadmin/lite — zero-JS SSR admin UI with full CRUD, i18n, and UA auto-degradation ([c66d726](https://github.com/zuohuadong/svadmin/commit/c66d726a3aebe623c1e1158f044fa7f61b7beb7e))
* **lite:** add 13 degraded components (Advanced UX + Charts/Widgets) for SSR ([f4f1a6b](https://github.com/zuohuadong/svadmin/commit/f4f1a6b2e323757928bc8f5d0e263813cc7c2c02))
* **lite:** add 13 no-JS components (Pages & Layout) for SSR ([9646f8f](https://github.com/zuohuadong/svadmin/commit/9646f8fea528d37984cf010ef56725e87ba81cf9))
* **lite:** add 25 no-JS components (Action Buttons & Core Fields) ([e182515](https://github.com/zuohuadong/svadmin/commit/e1825155e0e94d580cda1c20026709586c1520f1))
* **lite:** add missing SSR-compatible components ([4da89c7](https://github.com/zuohuadong/svadmin/commit/4da89c71a3cfeb746dbb83fdfd7c80c8d012a540))
* **lite:** modernize lite.css — IE11+ custom form controls & Indigo palette ([951d256](https://github.com/zuohuadong/svadmin/commit/951d2569747df21fdc4afb392bdcced06ee5db37))
* **lite:** modernize lite.css for IE11+ with custom form controls and Indigo palette ([24ddea3](https://github.com/zuohuadong/svadmin/commit/24ddea324a3a649bfdb6593d81b074cb210281e3))


### 🐛 Bug Fixes

* **adapters:** harden providers and ui runtime ([e11b2ec](https://github.com/zuohuadong/svadmin/commit/e11b2ec4f0ce5b51e2b9ffccb2542fa4bfbbf0d7))
* **build:** resolve playwright error and preserve semver strings for npm publish using node-workspace ([67e71d4](https://github.com/zuohuadong/svadmin/commit/67e71d4946430122fe1eea7ac06bc40cf9441a85))
* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))
* **core:** batch resolve lite routing, forms, theme mapping and proxy logic ([26318fe](https://github.com/zuohuadong/svadmin/commit/26318fe59afd905874fd6f2bf4b6ecd169809a93))
* **core:** resolve crud action targets, pb promises, sso decodes, and i18n missing keys ([53c77cb](https://github.com/zuohuadong/svadmin/commit/53c77cb8962aa21ed19e2a15a1934a4fc6a8cb55))
* **core:** resolve functional regressions in routing, forms, and live providers ([09e4f69](https://github.com/zuohuadong/svadmin/commit/09e4f69246ae96c1e4357391e2b53aaad8756902))
* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))
* **core:** resolve regressions across SSR auth, mutation hooks, lite components and editor types ([5b716e2](https://github.com/zuohuadong/svadmin/commit/5b716e22dd1f0664b3a884b8d74a583590467065))
* **lite:** add publishConfig to allow OIDC publishing for new scoped package ([24743f1](https://github.com/zuohuadong/svadmin/commit/24743f1403d54351c482dc8e5a7c07d8c8889b17))
* **lite:** align SSR components with core contracts ([4ce272e](https://github.com/zuohuadong/svadmin/commit/4ce272eacd350051b7e8a14a1f5bc70332b66b49))
* **lite:** harden compatibility edge cases ([4e4365f](https://github.com/zuohuadong/svadmin/commit/4e4365f097479c32c2631ec431c7ad14a59fab20))
* **lite:** resolve modal action binding, auth/delete redirects, and select components schemas ([f4da5cd](https://github.com/zuohuadong/svadmin/commit/f4da5cd9e5c81cf0c4673eb05777999b34632c4f))
* **lite:** restore native template interpolation and parse svadmin-session ([68c5212](https://github.com/zuohuadong/svadmin/commit/68c521227e6870e9e84fb785fc815e746f191d27))
* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))


### 💅 Elegance & Refactoring

* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))
* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))


### 📝 Documentation

* **lite:** add multi-level menu documentation and usage examples ([84111a6](https://github.com/zuohuadong/svadmin/commit/84111a647575f81608a133cc4a4f2b4af9e235cd))


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))
* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))
* **deps:** bump the bun-minor-and-patch group across 4 directories with 50 updates ([#182](https://github.com/zuohuadong/svadmin/issues/182)) ([b1d05ae](https://github.com/zuohuadong/svadmin/commit/b1d05ae88caaa96b8697c14a2882af76e33eaf34))
* **deps:** major dependency audit - tiptap v3, zod v4, lucide unification ([4f4ca97](https://github.com/zuohuadong/svadmin/commit/4f4ca97e17e77b0aff769d14a7a8d23fb5e1c16f))
* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))
* **deps:** update all dependencies and fix Svelte 5 & Tiptap breaking changes ([250f19c](https://github.com/zuohuadong/svadmin/commit/250f19c35d6fbed58f8e1710e1fab9087cf69f5a))
* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))
* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))
* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))
* release main ([c555c7b](https://github.com/zuohuadong/svadmin/commit/c555c7bb989d6b09e428e5b8eb80b30c36ec123c))
* release main ([f39a6dd](https://github.com/zuohuadong/svadmin/commit/f39a6dd0ff8f33533794672d8293ff4158402939))
* release main ([cedb9a1](https://github.com/zuohuadong/svadmin/commit/cedb9a1712aaf6a450ef2e7f88236f396c110514))
* release main ([f5524bf](https://github.com/zuohuadong/svadmin/commit/f5524bfb9d2d9a47e142258fddd2d5994dd9fe13))
* release main ([535bf00](https://github.com/zuohuadong/svadmin/commit/535bf00db259feace197b01241e5e80e86050b80))
* release main ([732049c](https://github.com/zuohuadong/svadmin/commit/732049cc0e8ef842f5a789b398dab16aca8b9ec7))
* release main ([d0f3d8a](https://github.com/zuohuadong/svadmin/commit/d0f3d8ab328a430f7727db0544d49e514a069504))
* release main ([874c1f6](https://github.com/zuohuadong/svadmin/commit/874c1f6d36ac62c59fb59ced8ef54afd5076bee8))
* release main ([f54fc17](https://github.com/zuohuadong/svadmin/commit/f54fc17f39a22ef3a886badcb84d252150b133c8))
* release main ([252f1ac](https://github.com/zuohuadong/svadmin/commit/252f1ac613e6ebc4245602a52397592aeb02c218))
* release main ([c8a0a4a](https://github.com/zuohuadong/svadmin/commit/c8a0a4a8aee4433828016746262bbc9ccd8d27b4))
* release main ([c2cf540](https://github.com/zuohuadong/svadmin/commit/c2cf540f7f02e29dac2f1680cc383612d7d9a417))
* release main ([37836d3](https://github.com/zuohuadong/svadmin/commit/37836d37fbcd0fee10d1973ba801bb8317a5e85d))
* release main ([1e68b41](https://github.com/zuohuadong/svadmin/commit/1e68b41fbcee52456f42c62c513e115bf56c1395))
* release main ([0e4d4e6](https://github.com/zuohuadong/svadmin/commit/0e4d4e6df4c4c4722413e04b1880c0803fe00ea5))
* release main ([#108](https://github.com/zuohuadong/svadmin/issues/108)) ([cf85315](https://github.com/zuohuadong/svadmin/commit/cf8531528b84c0fa35a3e85c112e168173e36698))
* release main ([#109](https://github.com/zuohuadong/svadmin/issues/109)) ([6c11dcb](https://github.com/zuohuadong/svadmin/commit/6c11dcb01ad0c068bbceafd51eb0f486b2d41e21))
* release main ([#112](https://github.com/zuohuadong/svadmin/issues/112)) ([c930b57](https://github.com/zuohuadong/svadmin/commit/c930b578509f69cd05d299838b4ca55aa28ee59e))
* release main ([#116](https://github.com/zuohuadong/svadmin/issues/116)) ([7124de0](https://github.com/zuohuadong/svadmin/commit/7124de09dadbc424674bd7b4d490c298ac768e79))
* release main ([#152](https://github.com/zuohuadong/svadmin/issues/152)) ([b1e260f](https://github.com/zuohuadong/svadmin/commit/b1e260fb5f40d8048f689e2930f49a7e4d495a19))
* release main ([#181](https://github.com/zuohuadong/svadmin/issues/181)) ([e9a401b](https://github.com/zuohuadong/svadmin/commit/e9a401bfe2c225c2799264a374b35d1ea3f7a679))
* release main ([#184](https://github.com/zuohuadong/svadmin/issues/184)) ([416c2ad](https://github.com/zuohuadong/svadmin/commit/416c2ad55837ca2fc9456144e280af6c489ed979))
* release main ([#191](https://github.com/zuohuadong/svadmin/issues/191)) ([ce0b29e](https://github.com/zuohuadong/svadmin/commit/ce0b29e19ae3bb962e8b6b23c344464691fd724f))
* release main ([#201](https://github.com/zuohuadong/svadmin/issues/201)) ([925fd58](https://github.com/zuohuadong/svadmin/commit/925fd5831dea6320daad1ee7cf0e7c2ae69d8f34))
* release main ([#218](https://github.com/zuohuadong/svadmin/issues/218)) ([f66701f](https://github.com/zuohuadong/svadmin/commit/f66701f33ae7ce6d14f27fc0f399cf2574d99b4d))
* release main ([#227](https://github.com/zuohuadong/svadmin/issues/227)) ([de73183](https://github.com/zuohuadong/svadmin/commit/de7318349f87a4539a3db2f6cfe61f4cddd33e92))
* release main ([#87](https://github.com/zuohuadong/svadmin/issues/87)) ([56581db](https://github.com/zuohuadong/svadmin/commit/56581dba457486dad2e2a4a5a0662e174a89790d))
* release main ([#88](https://github.com/zuohuadong/svadmin/issues/88)) ([fd144bd](https://github.com/zuohuadong/svadmin/commit/fd144bdb211d9a9036888c98f31abb3a5f8e98b2))
* release main ([#92](https://github.com/zuohuadong/svadmin/issues/92)) ([baefbd5](https://github.com/zuohuadong/svadmin/commit/baefbd5874e21f4a3d17b9c7b7e70002bea41a1a))
* **release:** complete 0.36 compatibility closure ([e2cb740](https://github.com/zuohuadong/svadmin/commit/e2cb74098f08d2e87690b9d6ef0f44afbe7d5a59))
* **release:** decouple workspace versions for local dev and use dynamic npm publishing ([a54fbe7](https://github.com/zuohuadong/svadmin/commit/a54fbe7270a1afd2b482bdae2684de3139379784))

## [0.3.15](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.14...lite-v0.3.15) (2026-08-14)


### 🐛 Bug Fixes

* **lite:** support Core 0.36.0

## [0.3.14](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.13...lite-v0.3.14) (2026-08-11)


### 🐛 Bug Fixes

* **lite:** harden compatibility edge cases ([4e4365f](https://github.com/zuohuadong/svadmin/commit/4e4365f097479c32c2631ec431c7ad14a59fab20))

## [0.3.13](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.12...lite-v0.3.13) (2026-08-11)


### 🐛 Bug Fixes

* **lite:** align SSR components with core contracts ([4ce272e](https://github.com/zuohuadong/svadmin/commit/4ce272eacd350051b7e8a14a1f5bc70332b66b49))

## [0.3.12](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.11...lite-v0.3.12) (2026-08-10)


### 🔧 Miscellaneous Chores

* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))

## [0.3.11](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.10...lite-v0.3.11) (2026-07-30)


### 🔧 Miscellaneous Chores

* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))

## [0.3.10](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.9...lite-v0.3.10) (2026-07-22)


### 🔧 Miscellaneous Chores

* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))

## [0.3.9](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.8...lite-v0.3.9) (2026-07-15)


### 🔧 Miscellaneous Chores

* **deps:** bump the bun-minor-and-patch group across 4 directories with 50 updates ([#182](https://github.com/zuohuadong/svadmin/issues/182)) ([b1d05ae](https://github.com/zuohuadong/svadmin/commit/b1d05ae88caaa96b8697c14a2882af76e33eaf34))

## [0.3.8](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.7...lite-v0.3.8) (2026-07-11)


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))

## [0.3.7](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.6...lite-v0.3.7) (2026-06-27)


### 🐛 Bug Fixes

* **adapters:** harden providers and ui runtime ([e11b2ec](https://github.com/zuohuadong/svadmin/commit/e11b2ec4f0ce5b51e2b9ffccb2542fa4bfbbf0d7))

## [0.3.6](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.5...lite-v0.3.6) (2026-06-04)


### 🔧 Miscellaneous Chores

* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))

## [0.3.5](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.4...lite-v0.3.5) (2026-05-04)


### 🐛 Bug Fixes

* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))

## [0.3.4](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.3...lite-v0.3.4) (2026-04-13)


### 🔧 Miscellaneous Chores

* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))

## [0.3.3](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.2...lite-v0.3.3) (2026-04-11)


### 🐛 Bug Fixes

* **core:** batch resolve lite routing, forms, theme mapping and proxy logic ([26318fe](https://github.com/zuohuadong/svadmin/commit/26318fe59afd905874fd6f2bf4b6ecd169809a93))
* **core:** resolve crud action targets, pb promises, sso decodes, and i18n missing keys ([53c77cb](https://github.com/zuohuadong/svadmin/commit/53c77cb8962aa21ed19e2a15a1934a4fc6a8cb55))
* **lite:** restore native template interpolation and parse svadmin-session ([68c5212](https://github.com/zuohuadong/svadmin/commit/68c521227e6870e9e84fb785fc815e746f191d27))

## [0.3.2](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.1...lite-v0.3.2) (2026-04-11)


### 🐛 Bug Fixes

* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))
* **lite:** resolve modal action binding, auth/delete redirects, and select components schemas ([f4da5cd](https://github.com/zuohuadong/svadmin/commit/f4da5cd9e5c81cf0c4673eb05777999b34632c4f))

## [0.3.1](https://github.com/zuohuadong/svadmin/compare/lite-v0.3.0...lite-v0.3.1) (2026-04-10)


### 🐛 Bug Fixes

* **core:** resolve functional regressions in routing, forms, and live providers ([09e4f69](https://github.com/zuohuadong/svadmin/commit/09e4f69246ae96c1e4357391e2b53aaad8756902))
* **core:** resolve regressions across SSR auth, mutation hooks, lite components and editor types ([5b716e2](https://github.com/zuohuadong/svadmin/commit/5b716e22dd1f0664b3a884b8d74a583590467065))

## [0.3.0](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.5...lite-v0.3.0) (2026-04-05)


### ⚠ BREAKING CHANGES

* **deps:** @lucide/svelte replaces lucide-svelte as icon package. @tiptap/* upgraded from v2 to v3. zod upgraded from v3 to v4 in @svadmin/lite.

### 🔧 Miscellaneous Chores

* **deps:** major dependency audit - tiptap v3, zod v4, lucide unification ([4f4ca97](https://github.com/zuohuadong/svadmin/commit/4f4ca97e17e77b0aff769d14a7a8d23fb5e1c16f))

## [0.2.5](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.4...lite-v0.2.5) (2026-04-04)


### 🔧 Miscellaneous Chores

* **deps:** update all dependencies and fix Svelte 5 & Tiptap breaking changes ([250f19c](https://github.com/zuohuadong/svadmin/commit/250f19c35d6fbed58f8e1710e1fab9087cf69f5a))

## [0.2.4](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.3...lite-v0.2.4) (2026-04-03)


### 🐛 Bug Fixes

* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))

## [0.2.3](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.2...lite-v0.2.3) (2026-03-31)


### 🔧 Miscellaneous Chores

* **release:** decouple workspace versions for local dev and use dynamic npm publishing ([a54fbe7](https://github.com/zuohuadong/svadmin/commit/a54fbe7270a1afd2b482bdae2684de3139379784))

## [0.2.2](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.1...lite-v0.2.2) (2026-03-31)


### 🐛 Bug Fixes

* **build:** resolve playwright error and preserve semver strings for npm publish using node-workspace ([67e71d4](https://github.com/zuohuadong/svadmin/commit/67e71d4946430122fe1eea7ac06bc40cf9441a85))

## [0.2.1](https://github.com/zuohuadong/svadmin/compare/lite-v0.2.0...lite-v0.2.1) (2026-03-29)


### Bug Fixes

* **lite:** add publishConfig to allow OIDC publishing for new scoped package ([24743f1](https://github.com/zuohuadong/svadmin/commit/24743f1403d54351c482dc8e5a7c07d8c8889b17))

## [0.2.0](https://github.com/zuohuadong/svadmin/compare/lite-v0.1.0...lite-v0.2.0) (2026-03-29)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Features

* add lite enterprise components (PermissionMatrix, AuditLog, ArrayField) and docs ([6fbb9a5](https://github.com/zuohuadong/svadmin/commit/6fbb9a59110a475fad487d112eceaf0e93e72e0a))
* **core,ui,lite:** add multi-level menu support with MenuItem type and recursive SidebarItem ([25603ae](https://github.com/zuohuadong/svadmin/commit/25603ae08ee576beda973ee3acfa43ff92cc1cea))
* **lite:** add @svadmin/lite — zero-JS SSR admin UI with full CRUD, i18n, and UA auto-degradation ([c66d726](https://github.com/zuohuadong/svadmin/commit/c66d726a3aebe623c1e1158f044fa7f61b7beb7e))
* **lite:** add 13 degraded components (Advanced UX + Charts/Widgets) for SSR ([f4f1a6b](https://github.com/zuohuadong/svadmin/commit/f4f1a6b2e323757928bc8f5d0e263813cc7c2c02))
* **lite:** add 13 no-JS components (Pages & Layout) for SSR ([9646f8f](https://github.com/zuohuadong/svadmin/commit/9646f8fea528d37984cf010ef56725e87ba81cf9))
* **lite:** add 25 no-JS components (Action Buttons & Core Fields) ([e182515](https://github.com/zuohuadong/svadmin/commit/e1825155e0e94d580cda1c20026709586c1520f1))
* **lite:** add missing SSR-compatible components ([4da89c7](https://github.com/zuohuadong/svadmin/commit/4da89c71a3cfeb746dbb83fdfd7c80c8d012a540))
* **lite:** modernize lite.css — IE11+ custom form controls & Indigo palette ([951d256](https://github.com/zuohuadong/svadmin/commit/951d2569747df21fdc4afb392bdcced06ee5db37))
* **lite:** modernize lite.css for IE11+ with custom form controls and Indigo palette ([24ddea3](https://github.com/zuohuadong/svadmin/commit/24ddea324a3a649bfdb6593d81b074cb210281e3))


### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))
