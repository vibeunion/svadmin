# Changelog

## [0.24.2](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.24.1...create-svadmin-v0.24.2) (2026-09-02)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.24.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.24.0...create-svadmin-v0.24.1) (2026-09-01)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.49.0

## [0.24.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.23.1...create-svadmin-v0.24.0) (2026-09-01)


### ⚠ BREAKING CHANGES

* **ai-elements:** remove legacy AI component exports from @svadmin/ui.

### 🚀 Features

* **admin:** align capabilities with Refine v5 ([#229](https://github.com/vibeunion/svadmin/issues/229)) ([37b7fb9](https://github.com/vibeunion/svadmin/commit/37b7fb9d06b367fb4ef7060f16251df5f9b97822))
* **ai-elements:** add Svelte 5 AI component library ([#362](https://github.com/vibeunion/svadmin/issues/362)) ([6ae760d](https://github.com/vibeunion/svadmin/commit/6ae760dba8da58052654326b51ae4673bf2da385))
* **core,create:** add graphql inferencer and automated inference cli ([6512c94](https://github.com/vibeunion/svadmin/commit/6512c9435ad91bdc83c13bd0e874db82b7cb6ac4))
* **lite:** implement dynamic catch-all routes and example resources support ([d94a481](https://github.com/vibeunion/svadmin/commit/d94a481da67c1ae6440e7c360afe901d6d23313d))
* **ui,create-svadmin:** add navigation menu component and lite init command ([745b86f](https://github.com/vibeunion/svadmin/commit/745b86f772f82d2f9929e7f0bdcb95d3d10dbb64))
* **ui,lite,cli:** add enterprise data interaction components and generate command ([41c233e](https://github.com/vibeunion/svadmin/commit/41c233e1a9a313eaf0cc58d66801d90a649b0b34))
* **ui:** adopt Stripe-first design system ([eee648c](https://github.com/vibeunion/svadmin/commit/eee648ca9ac83576f8dcf9ef86c969c09a882d48))
* **ui:** apply ui-ux-pro-max design guidelines and accessibility standards ([02badd4](https://github.com/vibeunion/svadmin/commit/02badd45374df1b8913786fc9241315fbc07cdcd))
* **ui:** formalize feedback and generation guidance ([26db9da](https://github.com/vibeunion/svadmin/commit/26db9da44f8b9961a6d59c70e41a64bc51f11ad1))
* **ui:** implement design system density dials and accessible components polish ([4297429](https://github.com/vibeunion/svadmin/commit/429742940d17771a440b668cc8f83dd9399a6422))
* **ui:** refine sidebar and content pages ([bba29e0](https://github.com/vibeunion/svadmin/commit/bba29e0e6c00b0dc05aac4d499e9fef88623f29e))
* **ui:** unify stripe-first reference pages ([9378ab1](https://github.com/vibeunion/svadmin/commit/9378ab16875ce339bd6928733fa4585059b3ffb6))


### 🐛 Bug Fixes

* **adapters:** harden providers and ui runtime ([e11b2ec](https://github.com/vibeunion/svadmin/commit/e11b2ec4f0ce5b51e2b9ffccb2542fa4bfbbf0d7))
* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/vibeunion/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))
* **create-svadmin:** sync release scaffold versions ([5124e9b](https://github.com/vibeunion/svadmin/commit/5124e9bd3273da418066a814ea95234c8ba47358))
* **create-svadmin:** sync updated dependency ranges ([2431a29](https://github.com/vibeunion/svadmin/commit/2431a29ac489401e755308c7bd93a5c5950aa8e0))
* **create:** align scaffold dependency versions ([fe31d14](https://github.com/vibeunion/svadmin/commit/fe31d147a9342cb6a5275bb2ad90165008868322))
* **release:** sync create-svadmin ranges ([db32ad0](https://github.com/vibeunion/svadmin/commit/db32ad008546476eedbaeedf4e08bdb40c8d9f66))
* **release:** sync create-svadmin ranges for 0.42.2/0.36.3 ([99bafcf](https://github.com/vibeunion/svadmin/commit/99bafcf92731520890fc3dcdc8b1f09e7e752b7d))
* **release:** sync create-svadmin ui range ([7a653f6](https://github.com/vibeunion/svadmin/commit/7a653f69dd6a5e9b64b21b24c81a53deb1bc1ec0))
* **ui:** add timer cleanup to ChatDialog, i18n all PermissionMatrix strings ([2b7e8a0](https://github.com/vibeunion/svadmin/commit/2b7e8a0a9eee8cde4aa949f067fddc5dcdb3ab7a))
* **ui:** self-register Tailwind component sources ([c68028f](https://github.com/vibeunion/svadmin/commit/c68028fcebaf80a54e1d708a1b28daf93098c10d))


### 📝 Documentation

* **refine:** add svadmin adapters to Vite optimizeDeps.exclude ([dece22c](https://github.com/vibeunion/svadmin/commit/dece22ca7b0196351e41baaf8d299d256e42e367))


### 🔧 Miscellaneous Chores

* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/vibeunion/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))
* **deps:** bump the bun-minor-and-patch group across 3 directories with 35 updates ([71d0419](https://github.com/vibeunion/svadmin/commit/71d0419922a11379b8e89bdc5295ec24d2af71a5))
* **deps:** update Bun patch dependencies ([#245](https://github.com/vibeunion/svadmin/issues/245)) ([6480f18](https://github.com/vibeunion/svadmin/commit/6480f18e942513f975c33714dcb09dbe0e7c6bc6))
* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/vibeunion/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))
* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/vibeunion/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))
* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/vibeunion/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/vibeunion/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))
* refresh PR evidence ([f9b928b](https://github.com/vibeunion/svadmin/commit/f9b928b57be04e33f136859a903ccf1d827b958f))
* release main ([83d7bc1](https://github.com/vibeunion/svadmin/commit/83d7bc1244bade1d73db6ab82468a7471fb3b794))
* release main ([0c50b40](https://github.com/vibeunion/svadmin/commit/0c50b4010061518c8334d02e361f6b3619e7d2b4))
* release main ([bdb7757](https://github.com/vibeunion/svadmin/commit/bdb77570e2d1affa1db2a443fc534cdc72fdcea9))
* release main ([8b6d284](https://github.com/vibeunion/svadmin/commit/8b6d2846a2390dd53af46c30ec44358a9fab5a62))
* release main ([c0fb1d9](https://github.com/vibeunion/svadmin/commit/c0fb1d97c981af05ec921e24ad77b14c6f8fd411))
* release main ([1612732](https://github.com/vibeunion/svadmin/commit/1612732aeabd3d4420701538414cd9acea98da51))
* release main ([af82d20](https://github.com/vibeunion/svadmin/commit/af82d20c8f7d6f03efd449a69a33813965c0fe7c))
* release main ([9d99361](https://github.com/vibeunion/svadmin/commit/9d9936135139500ac024430d943731073e3961ae))
* release main ([cdfbfb6](https://github.com/vibeunion/svadmin/commit/cdfbfb6a8438e8088ed4de98570e0950ef549e2e))
* release main ([e472d45](https://github.com/vibeunion/svadmin/commit/e472d4552ef10416fefacdd24377baf3ec822942))
* release main ([035891f](https://github.com/vibeunion/svadmin/commit/035891f135256ad830ee4f2da5d452788a1e3684))
* release main ([a3dc95c](https://github.com/vibeunion/svadmin/commit/a3dc95c879f7f179fe9b336cb8d7b3e0672f1f55))
* release main ([55232b4](https://github.com/vibeunion/svadmin/commit/55232b4de0a50dd497830dfb4926379e6cad5893))
* release main ([c555c7b](https://github.com/vibeunion/svadmin/commit/c555c7bb989d6b09e428e5b8eb80b30c36ec123c))
* release main ([f5524bf](https://github.com/vibeunion/svadmin/commit/f5524bfb9d2d9a47e142258fddd2d5994dd9fe13))
* release main ([535bf00](https://github.com/vibeunion/svadmin/commit/535bf00db259feace197b01241e5e80e86050b80))
* release main ([6112f85](https://github.com/vibeunion/svadmin/commit/6112f85e127c34a78d1398fa75cc45973f4ddfa4))
* release main ([732049c](https://github.com/vibeunion/svadmin/commit/732049cc0e8ef842f5a789b398dab16aca8b9ec7))
* release main ([d0f3d8a](https://github.com/vibeunion/svadmin/commit/d0f3d8ab328a430f7727db0544d49e514a069504))
* release main ([#109](https://github.com/vibeunion/svadmin/issues/109)) ([6c11dcb](https://github.com/vibeunion/svadmin/commit/6c11dcb01ad0c068bbceafd51eb0f486b2d41e21))
* release main ([#119](https://github.com/vibeunion/svadmin/issues/119)) ([990a891](https://github.com/vibeunion/svadmin/commit/990a891f9002dca7ef7ad7ade39251dde149b69e))
* release main ([#152](https://github.com/vibeunion/svadmin/issues/152)) ([b1e260f](https://github.com/vibeunion/svadmin/commit/b1e260fb5f40d8048f689e2930f49a7e4d495a19))
* release main ([#154](https://github.com/vibeunion/svadmin/issues/154)) ([23e01d7](https://github.com/vibeunion/svadmin/commit/23e01d7b5171126f91d53244de318449a22756b5))
* release main ([#184](https://github.com/vibeunion/svadmin/issues/184)) ([416c2ad](https://github.com/vibeunion/svadmin/commit/416c2ad55837ca2fc9456144e280af6c489ed979))
* release main ([#191](https://github.com/vibeunion/svadmin/issues/191)) ([ce0b29e](https://github.com/vibeunion/svadmin/commit/ce0b29e19ae3bb962e8b6b23c344464691fd724f))
* release main ([#201](https://github.com/vibeunion/svadmin/issues/201)) ([925fd58](https://github.com/vibeunion/svadmin/commit/925fd5831dea6320daad1ee7cf0e7c2ae69d8f34))
* release main ([#218](https://github.com/vibeunion/svadmin/issues/218)) ([f66701f](https://github.com/vibeunion/svadmin/commit/f66701f33ae7ce6d14f27fc0f399cf2574d99b4d))
* release main ([#228](https://github.com/vibeunion/svadmin/issues/228)) ([f619425](https://github.com/vibeunion/svadmin/commit/f619425157279ff948205b1b0ade5fde9f0baafa))
* release main ([#232](https://github.com/vibeunion/svadmin/issues/232)) ([bce07f3](https://github.com/vibeunion/svadmin/commit/bce07f3c3cbf493ad689478a541f0bde97c8f2d4))
* release main ([#244](https://github.com/vibeunion/svadmin/issues/244)) ([438db0e](https://github.com/vibeunion/svadmin/commit/438db0e67c9faf2d4aa150df1e74364928b14d5f))
* release main ([#247](https://github.com/vibeunion/svadmin/issues/247)) ([73c78d3](https://github.com/vibeunion/svadmin/commit/73c78d332767eb205516c8bac75b949bfaa2c5e7))
* release main ([#249](https://github.com/vibeunion/svadmin/issues/249)) ([fe9921b](https://github.com/vibeunion/svadmin/commit/fe9921b7d3a14ba8a790e9f100a06fc5484e298f))
* release main ([#250](https://github.com/vibeunion/svadmin/issues/250)) ([8ab807e](https://github.com/vibeunion/svadmin/commit/8ab807ecbf6328733049be87d6a4344053e84533))
* release main ([#259](https://github.com/vibeunion/svadmin/issues/259)) ([a5722ce](https://github.com/vibeunion/svadmin/commit/a5722ce1348c597dd287b3dc81701fab7024046e))
* release main ([#261](https://github.com/vibeunion/svadmin/issues/261)) ([b941156](https://github.com/vibeunion/svadmin/commit/b941156c5a2308f2766aef957b609c49d5488c90))
* release main ([#262](https://github.com/vibeunion/svadmin/issues/262)) ([32d6a5d](https://github.com/vibeunion/svadmin/commit/32d6a5da5827cb5ee54a12c5099c4ed86308bf77))
* release main ([#263](https://github.com/vibeunion/svadmin/issues/263)) ([6e2997d](https://github.com/vibeunion/svadmin/commit/6e2997dc010fb2eb1be5dc69b92ee3866ab4aad4))
* release main ([#269](https://github.com/vibeunion/svadmin/issues/269)) ([0129f8f](https://github.com/vibeunion/svadmin/commit/0129f8f058c0d1522d7d2c439d3e78947d38001a))
* release main ([#271](https://github.com/vibeunion/svadmin/issues/271)) ([31378c0](https://github.com/vibeunion/svadmin/commit/31378c0a7eea057d52e54e3c7b4f61d06d3ad827))
* release main ([#276](https://github.com/vibeunion/svadmin/issues/276)) ([ccc18bb](https://github.com/vibeunion/svadmin/commit/ccc18bb159ef0dc288cf591473fc0b9bcb46c73c))
* release main ([#278](https://github.com/vibeunion/svadmin/issues/278)) ([6e9cdb2](https://github.com/vibeunion/svadmin/commit/6e9cdb2a89cd2cedf48728c82ad9a7a75596e2ab))
* release main ([#280](https://github.com/vibeunion/svadmin/issues/280)) ([670d78f](https://github.com/vibeunion/svadmin/commit/670d78fb299089e51827c04bc933dd6fcc7df57f))
* release main ([#283](https://github.com/vibeunion/svadmin/issues/283)) ([e610389](https://github.com/vibeunion/svadmin/commit/e610389402a656160b76a5288c92c845428b9e96))
* release main ([#291](https://github.com/vibeunion/svadmin/issues/291)) ([05e882c](https://github.com/vibeunion/svadmin/commit/05e882cbad5a5531d729daba99b807a99b299f9d))
* release main ([#293](https://github.com/vibeunion/svadmin/issues/293)) ([3acaf94](https://github.com/vibeunion/svadmin/commit/3acaf940a29c27ed63d26479692651890f54727a))
* release main ([#295](https://github.com/vibeunion/svadmin/issues/295)) ([aa494c4](https://github.com/vibeunion/svadmin/commit/aa494c4c3ce87db1bd3b08eaf0c3113a2e9a6661))
* release main ([#298](https://github.com/vibeunion/svadmin/issues/298)) ([0c8c30d](https://github.com/vibeunion/svadmin/commit/0c8c30d3e73f27f466eea089ceb4c2c3598f3f52))
* release main ([#299](https://github.com/vibeunion/svadmin/issues/299)) ([1a05e86](https://github.com/vibeunion/svadmin/commit/1a05e86e3f99baa9f6c805ce45dd8bb15652f9f6))
* release main ([#301](https://github.com/vibeunion/svadmin/issues/301)) ([817310a](https://github.com/vibeunion/svadmin/commit/817310a38d8812b22df3c4442d972f7341be171d))
* release main ([#307](https://github.com/vibeunion/svadmin/issues/307)) ([f7efbfb](https://github.com/vibeunion/svadmin/commit/f7efbfb05a1980e0fd36247fc79a2ada51a50ac0))
* release main ([#310](https://github.com/vibeunion/svadmin/issues/310)) ([fcbbb76](https://github.com/vibeunion/svadmin/commit/fcbbb76a3a25d8bcbb629fd807a8b494959f765b))
* release main ([#315](https://github.com/vibeunion/svadmin/issues/315)) ([5d70361](https://github.com/vibeunion/svadmin/commit/5d703615b3c4e74f8603babbd9c3185e98d7aca2))
* release main ([#316](https://github.com/vibeunion/svadmin/issues/316)) ([f2c38a5](https://github.com/vibeunion/svadmin/commit/f2c38a5819d186b108857eedb4f95c410125da46))
* release main ([#326](https://github.com/vibeunion/svadmin/issues/326)) ([cea194b](https://github.com/vibeunion/svadmin/commit/cea194bc29458682e1b9469b1fac7b89870d8b28))
* **release:** complete 0.36 compatibility closure ([e2cb740](https://github.com/vibeunion/svadmin/commit/e2cb74098f08d2e87690b9d6ef0f44afbe7d5a59))
* **release:** sync core scaffold version ([cb20464](https://github.com/vibeunion/svadmin/commit/cb20464a82e4cc9122a18c460923e6ffc0bc4df9))
* **repo:** transfer to vibeunion org ([0fbdf8b](https://github.com/vibeunion/svadmin/commit/0fbdf8bdd6b0559135d1c3636323e963d688dda3))
* **repo:** transfer to vibeunion org ([78f26be](https://github.com/vibeunion/svadmin/commit/78f26be1b53d0fbe74e1c3a6c6c21547833c2334))
* **repo:** transfer to vibeunion org ([a2fdf96](https://github.com/vibeunion/svadmin/commit/a2fdf966a822dfe7f3de6990567a5689e6732857))

## [0.23.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.23.0...create-svadmin-v0.23.1) (2026-09-01)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.23.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.22.2...create-svadmin-v0.23.0) (2026-09-01)


### ⚠ BREAKING CHANGES

* **ai-elements:** remove legacy AI component exports from @svadmin/ui.

### 🚀 Features

* **ai-elements:** add Svelte 5 AI component library ([#362](https://github.com/vibeunion/svadmin/issues/362)) ([6ae760d](https://github.com/vibeunion/svadmin/commit/6ae760dba8da58052654326b51ae4673bf2da385))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.48.0

## [0.22.2](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.22.1...create-svadmin-v0.22.2) (2026-08-31)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.22.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.22.0...create-svadmin-v0.22.1) (2026-08-30)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.47.1

## [0.22.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.21.0...create-svadmin-v0.22.0) (2026-08-28)


### 🚀 Features

* **ui,lite,cli:** add enterprise data interaction components and generate command ([41c233e](https://github.com/vibeunion/svadmin/commit/41c233e1a9a313eaf0cc58d66801d90a649b0b34))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.47.0

## [0.21.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.20.0...create-svadmin-v0.21.0) (2026-08-28)


### 🚀 Features

* **ui,create-svadmin:** add navigation menu component and lite init command ([745b86f](https://github.com/vibeunion/svadmin/commit/745b86f772f82d2f9929e7f0bdcb95d3d10dbb64))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.46.0

## [0.20.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.19.0...create-svadmin-v0.20.0) (2026-08-28)


### 🚀 Features

* **lite:** implement dynamic catch-all routes and example resources support ([d94a481](https://github.com/vibeunion/svadmin/commit/d94a481da67c1ae6440e7c360afe901d6d23313d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.45.0

## [0.19.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.18.2...create-svadmin-v0.19.0) (2026-08-28)


### 🚀 Features

* **core,create:** add graphql inferencer and automated inference cli ([6512c94](https://github.com/vibeunion/svadmin/commit/6512c9435ad91bdc83c13bd0e874db82b7cb6ac4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @svadmin/core bumped to 0.44.0

## [0.18.2](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.18.1...create-svadmin-v0.18.2) (2026-08-28)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.18.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.18.0...create-svadmin-v0.18.1) (2026-08-28)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.18.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.17.0...create-svadmin-v0.18.0) (2026-08-28)


### 🚀 Features

* **ui:** apply ui-ux-pro-max design guidelines and accessibility standards ([02badd4](https://github.com/vibeunion/svadmin/commit/02badd45374df1b8913786fc9241315fbc07cdcd))

## [0.17.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.11...create-svadmin-v0.17.0) (2026-08-28)


### 🚀 Features

* **ui:** implement design system density dials and accessible components polish ([4297429](https://github.com/vibeunion/svadmin/commit/429742940d17771a440b668cc8f83dd9399a6422))

## [0.16.11](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.10...create-svadmin-v0.16.11) (2026-08-27)


### Dependencies

* Synchronize generated project dependencies with current workspace releases.

## [0.16.10](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.9...create-svadmin-v0.16.10) (2026-08-27)


### 🔧 Miscellaneous Chores

* release main ([#326](https://github.com/vibeunion/svadmin/issues/326)) ([cea194b](https://github.com/vibeunion/svadmin/commit/cea194bc29458682e1b9469b1fac7b89870d8b28))

## [0.16.9](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.8...create-svadmin-v0.16.9) (2026-08-27)


### 🔧 Miscellaneous Chores

* release main ([#315](https://github.com/vibeunion/svadmin/issues/315)) ([5d70361](https://github.com/vibeunion/svadmin/commit/5d703615b3c4e74f8603babbd9c3185e98d7aca2))

## [0.16.8](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.7...create-svadmin-v0.16.8) (2026-08-27)


### 🔧 Miscellaneous Chores

* release main ([#307](https://github.com/vibeunion/svadmin/issues/307)) ([f7efbfb](https://github.com/vibeunion/svadmin/commit/f7efbfb05a1980e0fd36247fc79a2ada51a50ac0))

## [0.16.7](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.6...create-svadmin-v0.16.7) (2026-08-27)


### 🔧 Miscellaneous Chores

* release main ([#299](https://github.com/vibeunion/svadmin/issues/299)) ([1a05e86](https://github.com/vibeunion/svadmin/commit/1a05e86e3f99baa9f6c805ce45dd8bb15652f9f6))

## [0.16.6](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.5...create-svadmin-v0.16.6) (2026-08-27)


### 🔧 Miscellaneous Chores

* release main ([#295](https://github.com/vibeunion/svadmin/issues/295)) ([aa494c4](https://github.com/vibeunion/svadmin/commit/aa494c4c3ce87db1bd3b08eaf0c3113a2e9a6661))

## [0.16.5](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.4...create-svadmin-v0.16.5) (2026-08-26)


### 🔧 Miscellaneous Chores

* release main ([#291](https://github.com/vibeunion/svadmin/issues/291)) ([05e882c](https://github.com/vibeunion/svadmin/commit/05e882cbad5a5531d729daba99b807a99b299f9d))

## [0.16.4](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.3...create-svadmin-v0.16.4) (2026-08-26)


### 🔧 Miscellaneous Chores

* release main ([#283](https://github.com/vibeunion/svadmin/issues/283)) ([e610389](https://github.com/vibeunion/svadmin/commit/e610389402a656160b76a5288c92c845428b9e96))

## [0.16.3](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.2...create-svadmin-v0.16.3) (2026-08-26)


### 🔧 Miscellaneous Chores

* release main ([0c50b40](https://github.com/vibeunion/svadmin/commit/0c50b4010061518c8334d02e361f6b3619e7d2b4))
* release main ([bdb7757](https://github.com/vibeunion/svadmin/commit/bdb77570e2d1affa1db2a443fc534cdc72fdcea9))

## [0.16.2](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.1...create-svadmin-v0.16.2) (2026-08-25)


### 🔧 Miscellaneous Chores

* release main ([#276](https://github.com/vibeunion/svadmin/issues/276)) ([ccc18bb](https://github.com/vibeunion/svadmin/commit/ccc18bb159ef0dc288cf591473fc0b9bcb46c73c))

## [0.16.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.0...create-svadmin-v0.16.1) (2026-08-25)


### 🔧 Miscellaneous Chores

* release main ([#269](https://github.com/vibeunion/svadmin/issues/269)) ([0129f8f](https://github.com/vibeunion/svadmin/commit/0129f8f058c0d1522d7d2c439d3e78947d38001a))

## [0.16.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.15.0...create-svadmin-v0.16.0) (2026-08-25)


### 🚀 Features

* **ui:** adopt Stripe-first design system ([eee648c](https://github.com/vibeunion/svadmin/commit/eee648ca9ac83576f8dcf9ef86c969c09a882d48))

## [0.15.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.14.1...create-svadmin-v0.15.0) (2026-08-25)


### 🚀 Features

* **ui:** formalize feedback and generation guidance ([26db9da](https://github.com/vibeunion/svadmin/commit/26db9da44f8b9961a6d59c70e41a64bc51f11ad1))

## [0.14.1](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.14.0...create-svadmin-v0.14.1) (2026-08-25)


### 🔧 Miscellaneous Chores

* release main ([#261](https://github.com/vibeunion/svadmin/issues/261)) ([b941156](https://github.com/vibeunion/svadmin/commit/b941156c5a2308f2766aef957b609c49d5488c90))

## [0.14.0](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.8...create-svadmin-v0.14.0) (2026-08-24)


### 🚀 Features

* **ui:** unify stripe-first reference pages ([9378ab1](https://github.com/vibeunion/svadmin/commit/9378ab16875ce339bd6928733fa4585059b3ffb6))

## [0.13.8](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.7...create-svadmin-v0.13.8) (2026-08-24)


### 🐛 Bug Fixes

* **release:** sync create-svadmin ui range ([7a653f6](https://github.com/vibeunion/svadmin/commit/7a653f69dd6a5e9b64b21b24c81a53deb1bc1ec0))


### 🔧 Miscellaneous Chores

* release main ([9d99361](https://github.com/vibeunion/svadmin/commit/9d9936135139500ac024430d943731073e3961ae))

## [0.13.7](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.6...create-svadmin-v0.13.7) (2026-08-22)


### 🐛 Bug Fixes

* **release:** sync create-svadmin ranges ([db32ad0](https://github.com/vibeunion/svadmin/commit/db32ad008546476eedbaeedf4e08bdb40c8d9f66))
* **release:** sync create-svadmin ranges for 0.42.2/0.36.3 ([99bafcf](https://github.com/vibeunion/svadmin/commit/99bafcf92731520890fc3dcdc8b1f09e7e752b7d))

## [0.13.6](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.5...create-svadmin-v0.13.6) (2026-08-20)


### 🔧 Miscellaneous Chores

* release main ([#249](https://github.com/vibeunion/svadmin/issues/249)) ([fe9921b](https://github.com/vibeunion/svadmin/commit/fe9921b7d3a14ba8a790e9f100a06fc5484e298f))

## [0.13.5](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.4...create-svadmin-v0.13.5) (2026-08-18)


### 🔧 Miscellaneous Chores

* **deps:** update Bun patch dependencies ([#245](https://github.com/vibeunion/svadmin/issues/245)) ([6480f18](https://github.com/vibeunion/svadmin/commit/6480f18e942513f975c33714dcb09dbe0e7c6bc6))

## [0.13.4](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.3...create-svadmin-v0.13.4) (2026-08-17)


### 🔧 Miscellaneous Chores

* release main ([035891f](https://github.com/vibeunion/svadmin/commit/035891f135256ad830ee4f2da5d452788a1e3684))
* **release:** sync core scaffold version ([cb20464](https://github.com/vibeunion/svadmin/commit/cb20464a82e4cc9122a18c460923e6ffc0bc4df9))

## [0.13.3](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.13.2...create-svadmin-v0.13.3) (2026-08-16)


### 🐛 Bug Fixes

* **create-svadmin:** sync updated dependency ranges ([2431a29](https://github.com/vibeunion/svadmin/commit/2431a29ac489401e755308c7bd93a5c5950aa8e0))


### 🔧 Miscellaneous Chores

* **deps:** bump the bun-minor-and-patch group across 3 directories with 35 updates ([71d0419](https://github.com/vibeunion/svadmin/commit/71d0419922a11379b8e89bdc5295ec24d2af71a5))
* **repo:** transfer to vibeunion org ([0fbdf8b](https://github.com/vibeunion/svadmin/commit/0fbdf8bdd6b0559135d1c3636323e963d688dda3))
* **repo:** transfer to vibeunion org ([78f26be](https://github.com/vibeunion/svadmin/commit/78f26be1b53d0fbe74e1c3a6c6c21547833c2334))
* **repo:** transfer to vibeunion org ([a2fdf96](https://github.com/vibeunion/svadmin/commit/a2fdf966a822dfe7f3de6990567a5689e6732857))

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
