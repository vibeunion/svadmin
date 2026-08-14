# Changelog

## [0.14.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.13.2...create-svadmin-v0.14.0) (2026-08-14)


### ⚠ BREAKING CHANGES

* **deps:** @lucide/svelte replaces lucide-svelte as icon package. @tiptap/* upgraded from v2 to v3. zod upgraded from v3 to v4 in @svadmin/lite.
* **core:** trigger major release for removed deprecated APIs

### 🚀 Features

* **admin:** align capabilities with Refine v5 ([#229](https://github.com/zuohuadong/svadmin/issues/229)) ([37b7fb9](https://github.com/zuohuadong/svadmin/commit/37b7fb9d06b367fb4ef7060f16251df5f9b97822))
* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))
* **ui:** refine sidebar and content pages ([bba29e0](https://github.com/zuohuadong/svadmin/commit/bba29e0e6c00b0dc05aac4d499e9fef88623f29e))


### 🐛 Bug Fixes

* **adapters:** harden providers and ui runtime ([e11b2ec](https://github.com/zuohuadong/svadmin/commit/e11b2ec4f0ce5b51e2b9ffccb2542fa4bfbbf0d7))
* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))
* **create-svadmin:** fix Tailwind v4 scaffolding and broken deps ([974a314](https://github.com/zuohuadong/svadmin/commit/974a314d736236e8de8ceba846ce97cdc2d9352e))
* **create-svadmin:** fix Tailwind v4 scaffolding and broken deps ([945a611](https://github.com/zuohuadong/svadmin/commit/945a611e9bc3f8063ff47e9be598835227539241))
* **create:** align scaffold dependency versions ([fe31d14](https://github.com/zuohuadong/svadmin/commit/fe31d147a9342cb6a5275bb2ad90165008868322))
* **ui,create-svadmin:** replace residual lucide-svelte imports with @lucide/svelte ([#93](https://github.com/zuohuadong/svadmin/issues/93)) ([2e2a7dd](https://github.com/zuohuadong/svadmin/commit/2e2a7ddf865d3d3a404ebf83f3f16f85fe9c0c40))
* **ui:** add timer cleanup to ChatDialog, i18n all PermissionMatrix strings ([2b7e8a0](https://github.com/zuohuadong/svadmin/commit/2b7e8a0a9eee8cde4aa949f067fddc5dcdb3ab7a))
* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))
* **ui:** self-register Tailwind component sources ([c68028f](https://github.com/zuohuadong/svadmin/commit/c68028fcebaf80a54e1d708a1b28daf93098c10d))


### 💅 Elegance & Refactoring

* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))
* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))


### 📝 Documentation

* **refine:** add svadmin adapters to Vite optimizeDeps.exclude ([dece22c](https://github.com/zuohuadong/svadmin/commit/dece22ca7b0196351e41baaf8d299d256e42e367))


### 🔧 Miscellaneous Chores

* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))
* **deps:** major dependency audit - tiptap v3, zod v4, lucide unification ([4f4ca97](https://github.com/zuohuadong/svadmin/commit/4f4ca97e17e77b0aff769d14a7a8d23fb5e1c16f))
* **deps:** update all dependencies and fix Svelte 5 & Tiptap breaking changes ([250f19c](https://github.com/zuohuadong/svadmin/commit/250f19c35d6fbed58f8e1710e1fab9087cf69f5a))
* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))
* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))
* **deps:** upgrade TypeScript 5.8 to 6.0 ([5cc750e](https://github.com/zuohuadong/svadmin/commit/5cc750edde9c9f1f404d5a7eb8eb0bccecf1f44c))
* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))
* release main ([c555c7b](https://github.com/zuohuadong/svadmin/commit/c555c7bb989d6b09e428e5b8eb80b30c36ec123c))
* release main ([f5524bf](https://github.com/zuohuadong/svadmin/commit/f5524bfb9d2d9a47e142258fddd2d5994dd9fe13))
* release main ([535bf00](https://github.com/zuohuadong/svadmin/commit/535bf00db259feace197b01241e5e80e86050b80))
* release main ([6112f85](https://github.com/zuohuadong/svadmin/commit/6112f85e127c34a78d1398fa75cc45973f4ddfa4))
* release main ([732049c](https://github.com/zuohuadong/svadmin/commit/732049cc0e8ef842f5a789b398dab16aca8b9ec7))
* release main ([d0f3d8a](https://github.com/zuohuadong/svadmin/commit/d0f3d8ab328a430f7727db0544d49e514a069504))
* release main ([fdbb704](https://github.com/zuohuadong/svadmin/commit/fdbb704977babdd3a445014582f0003ec875c06c))
* release main ([5f37653](https://github.com/zuohuadong/svadmin/commit/5f376536c193709eaa3055a34bc79072f904ea82))
* release main ([cf14a58](https://github.com/zuohuadong/svadmin/commit/cf14a5842cdbfe24fb126c78493da3bfced894e4))
* release main ([01c3f66](https://github.com/zuohuadong/svadmin/commit/01c3f660b457ec36e18fc68d1d05eb07c0b64290))
* release main ([b1b2f19](https://github.com/zuohuadong/svadmin/commit/b1b2f19a6fdb2754266d6f06903ee20090c369f4))
* release main ([a77f3dc](https://github.com/zuohuadong/svadmin/commit/a77f3dc2e37da76ebe3139ea0c5c6d4aeecfd35f))
* release main ([0f87dd9](https://github.com/zuohuadong/svadmin/commit/0f87dd92d411963dfd2cbf4173b0f4556e8a689f))
* release main ([10c3282](https://github.com/zuohuadong/svadmin/commit/10c32827e7ae42fdd1ef279defb26f437d092465))
* release main ([6393166](https://github.com/zuohuadong/svadmin/commit/6393166f0f692d533d2141e496cc1358cece936a))
* release main ([#109](https://github.com/zuohuadong/svadmin/issues/109)) ([6c11dcb](https://github.com/zuohuadong/svadmin/commit/6c11dcb01ad0c068bbceafd51eb0f486b2d41e21))
* release main ([#119](https://github.com/zuohuadong/svadmin/issues/119)) ([990a891](https://github.com/zuohuadong/svadmin/commit/990a891f9002dca7ef7ad7ade39251dde149b69e))
* release main ([#152](https://github.com/zuohuadong/svadmin/issues/152)) ([b1e260f](https://github.com/zuohuadong/svadmin/commit/b1e260fb5f40d8048f689e2930f49a7e4d495a19))
* release main ([#154](https://github.com/zuohuadong/svadmin/issues/154)) ([23e01d7](https://github.com/zuohuadong/svadmin/commit/23e01d7b5171126f91d53244de318449a22756b5))
* release main ([#184](https://github.com/zuohuadong/svadmin/issues/184)) ([416c2ad](https://github.com/zuohuadong/svadmin/commit/416c2ad55837ca2fc9456144e280af6c489ed979))
* release main ([#191](https://github.com/zuohuadong/svadmin/issues/191)) ([ce0b29e](https://github.com/zuohuadong/svadmin/commit/ce0b29e19ae3bb962e8b6b23c344464691fd724f))
* release main ([#201](https://github.com/zuohuadong/svadmin/issues/201)) ([925fd58](https://github.com/zuohuadong/svadmin/commit/925fd5831dea6320daad1ee7cf0e7c2ae69d8f34))
* release main ([#218](https://github.com/zuohuadong/svadmin/issues/218)) ([f66701f](https://github.com/zuohuadong/svadmin/commit/f66701f33ae7ce6d14f27fc0f399cf2574d99b4d))
* release main ([#228](https://github.com/zuohuadong/svadmin/issues/228)) ([f619425](https://github.com/zuohuadong/svadmin/commit/f619425157279ff948205b1b0ade5fde9f0baafa))
* release main ([#232](https://github.com/zuohuadong/svadmin/issues/232)) ([bce07f3](https://github.com/zuohuadong/svadmin/commit/bce07f3c3cbf493ad689478a541f0bde97c8f2d4))
* release main ([#87](https://github.com/zuohuadong/svadmin/issues/87)) ([56581db](https://github.com/zuohuadong/svadmin/commit/56581dba457486dad2e2a4a5a0662e174a89790d))
* release main ([#88](https://github.com/zuohuadong/svadmin/issues/88)) ([fd144bd](https://github.com/zuohuadong/svadmin/commit/fd144bdb211d9a9036888c98f31abb3a5f8e98b2))
* release main ([#92](https://github.com/zuohuadong/svadmin/issues/92)) ([baefbd5](https://github.com/zuohuadong/svadmin/commit/baefbd5874e21f4a3d17b9c7b7e70002bea41a1a))
* release main ([#94](https://github.com/zuohuadong/svadmin/issues/94)) ([3ac969d](https://github.com/zuohuadong/svadmin/commit/3ac969d1dc6e9dd2acb6ae3fc4c830d2974bb9a7))
* **release:** complete 0.36 compatibility closure ([e2cb740](https://github.com/zuohuadong/svadmin/commit/e2cb74098f08d2e87690b9d6ef0f44afbe7d5a59))

## [0.13.2](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.13.1...create-svadmin-v0.13.2) (2026-08-14)


### 🐛 Bug Fixes

* **create:** align generated projects with Core 0.36.0 and UI 0.42.0

## [0.13.1](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.13.0...create-svadmin-v0.13.1) (2026-08-11)


### 🐛 Bug Fixes

* **create:** align generated projects with UI 0.41.1

## [0.13.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.5...create-svadmin-v0.13.0) (2026-08-11)


### 🚀 Features

* **admin:** align capabilities with Refine v5 ([#229](https://github.com/zuohuadong/svadmin/issues/229)) ([37b7fb9](https://github.com/zuohuadong/svadmin/commit/37b7fb9d06b367fb4ef7060f16251df5f9b97822))

## [0.12.5](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.4...create-svadmin-v0.12.5) (2026-08-10)


### 🔧 Miscellaneous Chores

* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))

## [0.12.4](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.3...create-svadmin-v0.12.4) (2026-07-30)


### 🔧 Miscellaneous Chores

* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))

## [0.12.3](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.2...create-svadmin-v0.12.3) (2026-07-22)


### 🔧 Miscellaneous Chores

* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))

## [0.12.2](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.1...create-svadmin-v0.12.2) (2026-07-15)


### 🐛 Bug Fixes

* **ui:** self-register Tailwind component sources ([c68028f](https://github.com/zuohuadong/svadmin/commit/c68028fcebaf80a54e1d708a1b28daf93098c10d))

## [0.12.1](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.12.0...create-svadmin-v0.12.1) (2026-06-27)


### 🐛 Bug Fixes

* **adapters:** harden providers and ui runtime ([e11b2ec](https://github.com/zuohuadong/svadmin/commit/e11b2ec4f0ce5b51e2b9ffccb2542fa4bfbbf0d7))

## [0.12.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.6...create-svadmin-v0.12.0) (2026-06-12)


### 🚀 Features

* **ui:** refine sidebar and content pages ([bba29e0](https://github.com/zuohuadong/svadmin/commit/bba29e0e6c00b0dc05aac4d499e9fef88623f29e))

## [0.11.6](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.5...create-svadmin-v0.11.6) (2026-06-04)


### 🔧 Miscellaneous Chores

* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))

## [0.11.5](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.4...create-svadmin-v0.11.5) (2026-05-05)


### 🐛 Bug Fixes

* **create:** align scaffold dependency versions ([fe31d14](https://github.com/zuohuadong/svadmin/commit/fe31d147a9342cb6a5275bb2ad90165008868322))

## [0.11.4](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.3...create-svadmin-v0.11.4) (2026-05-04)


### 🐛 Bug Fixes

* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))

## [0.11.3](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.2...create-svadmin-v0.11.3) (2026-04-13)


### 📝 Documentation

* **refine:** add svadmin adapters to Vite optimizeDeps.exclude ([dece22c](https://github.com/zuohuadong/svadmin/commit/dece22ca7b0196351e41baaf8d299d256e42e367))

## [0.11.2](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.1...create-svadmin-v0.11.2) (2026-04-11)


### 🐛 Bug Fixes

* **ui:** add timer cleanup to ChatDialog, i18n all PermissionMatrix strings ([2b7e8a0](https://github.com/zuohuadong/svadmin/commit/2b7e8a0a9eee8cde4aa949f067fddc5dcdb3ab7a))

## [0.11.1](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.11.0...create-svadmin-v0.11.1) (2026-04-05)


### 🐛 Bug Fixes

* **ui,create-svadmin:** replace residual lucide-svelte imports with @lucide/svelte ([#93](https://github.com/zuohuadong/svadmin/issues/93)) ([2e2a7dd](https://github.com/zuohuadong/svadmin/commit/2e2a7ddf865d3d3a404ebf83f3f16f85fe9c0c40))

## [0.11.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.10.4...create-svadmin-v0.11.0) (2026-04-05)


### ⚠ BREAKING CHANGES

* **deps:** @lucide/svelte replaces lucide-svelte as icon package. @tiptap/* upgraded from v2 to v3. zod upgraded from v3 to v4 in @svadmin/lite.

### 🔧 Miscellaneous Chores

* **deps:** major dependency audit - tiptap v3, zod v4, lucide unification ([4f4ca97](https://github.com/zuohuadong/svadmin/commit/4f4ca97e17e77b0aff769d14a7a8d23fb5e1c16f))
* **deps:** upgrade TypeScript 5.8 to 6.0 ([5cc750e](https://github.com/zuohuadong/svadmin/commit/5cc750edde9c9f1f404d5a7eb8eb0bccecf1f44c))

## [0.10.4](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.10.3...create-svadmin-v0.10.4) (2026-04-04)


### 🔧 Miscellaneous Chores

* **deps:** update all dependencies and fix Svelte 5 & Tiptap breaking changes ([250f19c](https://github.com/zuohuadong/svadmin/commit/250f19c35d6fbed58f8e1710e1fab9087cf69f5a))

## [0.10.3](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.10.2...create-svadmin-v0.10.3) (2026-04-03)


### 🐛 Bug Fixes

* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))

## [0.10.2](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.10.1...create-svadmin-v0.10.2) (2026-04-01)


### 🐛 Bug Fixes

* **create-svadmin:** fix Tailwind v4 scaffolding and broken deps ([974a314](https://github.com/zuohuadong/svadmin/commit/974a314d736236e8de8ceba846ce97cdc2d9352e))
* **create-svadmin:** fix Tailwind v4 scaffolding and broken deps ([945a611](https://github.com/zuohuadong/svadmin/commit/945a611e9bc3f8063ff47e9be598835227539241))

## [0.10.1](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.10.0...create-svadmin-v0.10.1) (2026-03-31)


### 💅 Elegance & Refactoring

* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))

## [0.10.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.9.0...create-svadmin-v0.10.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Features

* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))
* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** add component injection via Svelte Context DI ([0f2b765](https://github.com/zuohuadong/svadmin/commit/0f2b76539be91004150729d9690e94648f3fd1f6))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* **create-svadmin:** synchronize css templates with new-york oklch styling and remove conflicting mappings ([82c9ba5](https://github.com/zuohuadong/svadmin/commit/82c9ba507dcf74938f34052d44a9dd9681cfcd76))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
* **ui:** resolve typography font loading and adjust badge styling ([c7a0c6b](https://github.com/zuohuadong/svadmin/commit/c7a0c6bea0d2ec36b3a926a547236dc254b9e6f1))


### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.9.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.8.0...create-svadmin-v0.9.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.8.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.7.0...create-svadmin-v0.8.0) (2026-03-27)


### Features

* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))

## [0.7.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.6.0...create-svadmin-v0.7.0) (2026-03-27)


### Features

* **ui:** add component injection via Svelte Context DI ([0f2b765](https://github.com/zuohuadong/svadmin/commit/0f2b76539be91004150729d9690e94648f3fd1f6))

## [0.6.0](https://github.com/zuohuadong/svadmin/compare/create-svadmin-v0.5.14...create-svadmin-v0.6.0) (2026-03-26)


### Features

* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* **create-svadmin:** synchronize css templates with new-york oklch styling and remove conflicting mappings ([82c9ba5](https://github.com/zuohuadong/svadmin/commit/82c9ba507dcf74938f34052d44a9dd9681cfcd76))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
* **ui:** resolve typography font loading and adjust badge styling ([c7a0c6b](https://github.com/zuohuadong/svadmin/commit/c7a0c6bea0d2ec36b3a926a547236dc254b9e6f1))
