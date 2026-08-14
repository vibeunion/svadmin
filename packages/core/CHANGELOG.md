# Changelog

## [0.37.0](https://github.com/zuohuadong/svadmin/compare/core-v0.36.0...core-v0.37.0) (2026-08-14)


### ⚠ BREAKING CHANGES

* **core & ui:** useList, useOne, useShow, useMany now return the Tanstack Query result directly instead of wrapping it in { query, overtime }.
* **core:** useList, useOne, useShow, useMany now return the Tanstack Query result directly instead of wrapping it in { query, overtime }.
* **core:** useList, useOne, useShow, useMany now return the Tanstack Query result directly instead of wrapping it in { query, overtime }.
* **core:** useTranslation now returns { t, locale, setLocale, getAvailableLocales } instead of { translate, getLocale, changeLocale }. The locale is a reactive property instead of a getter function.
* Deprecated legacy useHasPermission API. usePermissions now returns immediate .has() and .can() methods and drops .data envelope. AutoTable drops global cellRenderer prop in favor of columns definitions map. Sidebar now defaults to SvelteKit path routing instead of hash-based (#).
* **core:** trigger major release for removed deprecated APIs

### 🚀 Features

* **admin:** align capabilities with Refine v5 ([#229](https://github.com/zuohuadong/svadmin/issues/229)) ([37b7fb9](https://github.com/zuohuadong/svadmin/commit/37b7fb9d06b367fb4ef7060f16251df5f9b97822))
* **core,ui,lite:** add multi-level menu support with MenuItem type and recursive SidebarItem ([25603ae](https://github.com/zuohuadong/svadmin/commit/25603ae08ee576beda973ee3acfa43ff92cc1cea))
* **core:** add AgentProvider with tool calling, approval gates, and generative UI events ([40f6952](https://github.com/zuohuadong/svadmin/commit/40f6952c9f04aecac0ea833bb0205f82cc4da30d))
* **core:** add fetchWithInterceptor and createFeatureGate ([6d2c7d7](https://github.com/zuohuadong/svadmin/commit/6d2c7d79c19252761796850998b2f2eb88ef930d))
* **core:** add fetchWithInterceptor and createFeatureGate ([c48c4b7](https://github.com/zuohuadong/svadmin/commit/c48c4b7d2e6ea1eab854894ee2d5d7ee76078c2b))
* **core:** add useHasPermission() reactive Rune closure ([4911d3b](https://github.com/zuohuadong/svadmin/commit/4911d3be9421a4a80b948717c755ed18c2279c8f))
* **core:** align refinedev auth and access edge cases ([a3df3e1](https://github.com/zuohuadong/svadmin/commit/a3df3e15607599aa4acb3b4dc90b6cfdc494cc21))
* **core:** enterprise improvements for i18n and routing ([9388aa9](https://github.com/zuohuadong/svadmin/commit/9388aa92b687287f27280cff20345339107af28e))
* **core:** flatten query hook return values ([90a66ef](https://github.com/zuohuadong/svadmin/commit/90a66ef12dd551f74c079995764e0c80c5d42b3a))
* **core:** flatten query hook return values ([#107](https://github.com/zuohuadong/svadmin/issues/107)) ([6082bd1](https://github.com/zuohuadong/svadmin/commit/6082bd1c6290701219b2b5eaf72f4b52845cd258))
* **core:** freeze Svelte hook contracts ([b76cb4a](https://github.com/zuohuadong/svadmin/commit/b76cb4a9a72f3340a381111c44ea7b2980ed796b))
* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))
* **core:** support dark-first theme mode and custom CSS token ([8311787](https://github.com/zuohuadong/svadmin/commit/8311787b62df1252492780c7df2f7549b25c5964))
* **core:** support dark-first theme mode and custom CSS token override ([6526b58](https://github.com/zuohuadong/svadmin/commit/6526b58be3e61896101fa7faed6310f4a1bd3904))
* **example:** complete menu coverage and metronic high-value modules ([84384f2](https://github.com/zuohuadong/svadmin/commit/84384f299553c4962fbfc805a2af57478df675b6))
* **example:** complete reference pages and responsive styling ([#207](https://github.com/zuohuadong/svadmin/issues/207)) ([57c5af0](https://github.com/zuohuadong/svadmin/commit/57c5af05a0521b2a763b5c8d61962d11de9965ed))
* **example:** expand reference app pages ([39ae832](https://github.com/zuohuadong/svadmin/commit/39ae8320e8a07297cd77fc0ba669cd590b3a300c))
* **example:** polish admin demo shell ([65559dd](https://github.com/zuohuadong/svadmin/commit/65559dddb4531ecbe5540312864dec0f3d35ae1a))
* **example:** refine admin demo shell ([e8070d2](https://github.com/zuohuadong/svadmin/commit/e8070d2f492627166dd5b0a1845d0f12f483aa8b))
* implement FieldRenderer component and initialize rich text editor package with modular toolbar and extension support ([3d99335](https://github.com/zuohuadong/svadmin/commit/3d993350c9a2b476d51bd49e9d83bcd664b6aad6))
* **sso:** add rotation-safe browser session lifecycle ([#185](https://github.com/zuohuadong/svadmin/issues/185)) ([9fa0881](https://github.com/zuohuadong/svadmin/commit/9fa08818ed175958669e2e227d29d381f115b0de))
* svelte 5 runes migration, AI review workflow, eslint baseline, and dependabot config ([3b7a0b0](https://github.com/zuohuadong/svadmin/commit/3b7a0b0f89470f43f7ca3685ee25f1ad86353fc6))
* **task:** add provider-first task center ([08ef269](https://github.com/zuohuadong/svadmin/commit/08ef269db4d000736f3bf92d90b2f620a4b6276c))
* **ui:** add ArrayField for nested dynamic form groups ([0407757](https://github.com/zuohuadong/svadmin/commit/04077572b3d6a668df136d6a22375206735d775c))
* **ui:** add clean-flat layout preset for high contrast modern aesthetics ([8dba20b](https://github.com/zuohuadong/svadmin/commit/8dba20b7049362ca7e4c9a3de3063660ea8f97db))
* **ui:** add enterprise RBAC, audit logs, tenant switcher, task queue, and draggable grid ([449dfaf](https://github.com/zuohuadong/svadmin/commit/449dfaf73febe25a08073c4ea63f0d76f38a2f51))
* **ui:** add Metronic-inspired admin pages ([bfa10db](https://github.com/zuohuadong/svadmin/commit/bfa10db87a80c6781e4668340437259705ed6fdc))
* **ui:** add Settings Hub with profile, appearance, and system info pages ([a1b284d](https://github.com/zuohuadong/svadmin/commit/a1b284d613ffe20234e05f2df7c052c9fd1fac00))
* **ui:** add Settings sub-pages, ErrorPage, Dashboard expansion and i18n ([eb55054](https://github.com/zuohuadong/svadmin/commit/eb55054458928ae2033113e8fd577628a9261819))
* **ui:** add siteUrl prop to optionally render a Go To Site button in the header ([#97](https://github.com/zuohuadong/svadmin/issues/97)) ([abf5de0](https://github.com/zuohuadong/svadmin/commit/abf5de07d581b1b59a8deab4e01657591dc10025))
* **ui:** expand admin example pages ([7d7dc5e](https://github.com/zuohuadong/svadmin/commit/7d7dc5eb1039191d606bf0deea0fd87bc51772f6))
* **ui:** refine AutoTable to fluid borderless design and Sidebar to pill-style elevated states ([de92adc](https://github.com/zuohuadong/svadmin/commit/de92adc3fbf0077fb68c5a49009b546397916786))
* **ui:** refine sidebar and content pages ([bba29e0](https://github.com/zuohuadong/svadmin/commit/bba29e0e6c00b0dc05aac4d499e9fef88623f29e))
* **ui:** support component icons in menu & migrate tanstack v9 standalone functions ([#134](https://github.com/zuohuadong/svadmin/issues/134)) ([e47ca73](https://github.com/zuohuadong/svadmin/commit/e47ca7389c631eb7772b0583697c1b083e015a2f))
* **ui:** support passing Svelte components directly as menu/sidebar icons ([af54e3e](https://github.com/zuohuadong/svadmin/commit/af54e3e7d0bc0fee06f0d25d1a42ad1cf7624177))


### 🐛 Bug Fixes

* **auth:** combine trusted permission resolvers with UI-only hints ([#211](https://github.com/zuohuadong/svadmin/issues/211)) ([246cf3e](https://github.com/zuohuadong/svadmin/commit/246cf3e15120b933da0c23fa4eaf4a67f14acc56))
* **build:** resolve vite 8 rolldown and svelte-table compatibility ([#100](https://github.com/zuohuadong/svadmin/issues/100)) ([e6d26f3](https://github.com/zuohuadong/svadmin/commit/e6d26f300312684b3831c9f7b61f4886f8dae955))
* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))
* **core & ui:** resolve critical Svelte 5 context bounds, proxy loops, and package exports ([#110](https://github.com/zuohuadong/svadmin/issues/110)) ([b0a1fd7](https://github.com/zuohuadong/svadmin/commit/b0a1fd72b20e6a1d92de445ee2a95fbbf182d218))
* **core & ui:** resolve layout remounts, auth retention and action leaks ([4d75ddb](https://github.com/zuohuadong/svadmin/commit/4d75ddbd0ef307a08da76fcb47e75f89c72dba47))
* **core,hasura:** add ssr guard for csv export, migrate hasura to async import ([722dd3d](https://github.com/zuohuadong/svadmin/commit/722dd3da5a92cacc2681221736463b79e6beea05))
* **core,ui:** connect color theme switching to CSS variable overrides ([4a62936](https://github.com/zuohuadong/svadmin/commit/4a62936be2d2ab9b17d8ebb1b945cc8238d9d4f7))
* **core,ui:** ssr guards for router/theme, pin tanstack table alpha.10 ([d7025b9](https://github.com/zuohuadong/svadmin/commit/d7025b97842902cd6d171d0b60f60e1b8c687728))
* **core:** add authentication error delegation (401/403) to all data hooks matching refine parity ([8b28cf9](https://github.com/zuohuadong/svadmin/commit/8b28cf99d0bb67509851b8c6813c83383dad4914))
* **core:** add bun types to tsconfig.json to resolve test compilation errors ([ce6fb1e](https://github.com/zuohuadong/svadmin/commit/ce6fb1e5f0de00d844513f0d68c37ba81b2149d1))
* **core:** align mutation/query hooks with refine patterns — onSettled invalidation, many-query optimistic updates, live event publishing, reactive useResource, notification dedup guards ([1123472](https://github.com/zuohuadong/svadmin/commit/112347253f22607988c105e80ba7c7050db8eb0b))
* **core:** allow nullable task record fields ([#144](https://github.com/zuohuadong/svadmin/issues/144)) ([7260fb4](https://github.com/zuohuadong/svadmin/commit/7260fb4cc528a738c362429bc16311c21b3739a3))
* **core:** apply minor utility patches and listener deduplication ([300da96](https://github.com/zuohuadong/svadmin/commit/300da96ca280f75a7c63f6b238c7c72c469756de))
* **core:** batch resolve lite routing, forms, theme mapping and proxy logic ([26318fe](https://github.com/zuohuadong/svadmin/commit/26318fe59afd905874fd6f2bf4b6ecd169809a93))
* **core:** break circular import TDZ causing router crashes ([dea90af](https://github.com/zuohuadong/svadmin/commit/dea90af81365c3b4d6e5348ba0fc42eec0c045e1))
* **core:** complete clone routing, SSR hardening, refine-adapter safety ([e896f2a](https://github.com/zuohuadong/svadmin/commit/e896f2ae786dde01cb82dbb38ecbe2f4bc4830fa))
* **core:** complete refine dev logic parity and ui memory leak resolutions ([3b5c29a](https://github.com/zuohuadong/svadmin/commit/3b5c29ac171affb17e96dc749482d25f06c7cad7))
* **core:** convert colorThemes derived export to function ([cb12bf6](https://github.com/zuohuadong/svadmin/commit/cb12bf65f2eb9456f0a9ff8413b738cbf616ba90))
* **core:** export publishLiveEvent out of mutation hooks to resolve TS error ([b477c26](https://github.com/zuohuadong/svadmin/commit/b477c265204935715cd9a40cc792751f310306b5))
* **core:** harden export and sso validation ([#187](https://github.com/zuohuadong/svadmin/issues/187)) ([35f286d](https://github.com/zuohuadong/svadmin/commit/35f286dada562609d104f8617b3abe4997eae2fd))
* **core:** improve query caching and optimistic update recovery ([a18356e](https://github.com/zuohuadong/svadmin/commit/a18356e0f777b8d21e5f58bee8d9d2250a64f1ef))
* **core:** improve query invalidation scopes, add bulk live events, and fix sidebar collapse state ([92bc1f7](https://github.com/zuohuadong/svadmin/commit/92bc1f7c58c8e80023ac958b7988a0e8ba913cf1))
* **core:** improve useForm autoSave queuing and dataProvider scope passing ([a115db4](https://github.com/zuohuadong/svadmin/commit/a115db4a59e9d5c575a97a44d6773d40308ad96a))
* **core:** make fetch interceptor SSR-safe ([4cd386e](https://github.com/zuohuadong/svadmin/commit/4cd386efa88fa1083fc23f76b91b10096d884f8a))
* **core:** migrate CanAccess and useCan logic to support Svelte 5 closures ([38d4f78](https://github.com/zuohuadong/svadmin/commit/38d4f785e2ca3d7dfc6b62445b29f230e74df284))
* **core:** patch useImport parsing, hooks reactivity, and route bindings ([ca478c0](https://github.com/zuohuadong/svadmin/commit/ca478c0ac964796ad92930945f7200e7a08513aa))
* **core:** plug autoSaveTimer memory leaks and solidify mutation reactivity ([f2ec660](https://github.com/zuohuadong/svadmin/commit/f2ec6609389f0ce9aa3914bbaf5af90dd3ef4545))
* **core:** quality refinements — error handling, memory leaks, Svelte 5 compat ([01013db](https://github.com/zuohuadong/svadmin/commit/01013dbd3741d1e3abc11e6158e5358694ff8269))
* **core:** quality refinements — error handling, memory leaks, Svelte 5 compat ([a92829a](https://github.com/zuohuadong/svadmin/commit/a92829aa34910f4df2b850bc33c076e9f1ceb66c))
* **core:** refactor query hooks runtime reactivity and patch mcp/ws logic ([07897d7](https://github.com/zuohuadong/svadmin/commit/07897d715a2731f595f84395f8f4fa9285b2f616))
* **core:** remove hardcoded role hierarchy from createFeatureGate ([4cbdaa2](https://github.com/zuohuadong/svadmin/commit/4cbdaa22b72b1820402d48cc9eed2ae8a3ee197c))
* **core:** remove proxy from extendQuery to restore svelte 5 reactivity ([b83a997](https://github.com/zuohuadong/svadmin/commit/b83a9974868a926b8ce41cd84d4140b5068c18c1))
* **core:** resolve clone mode routing, actual path templates, and nested redirect bugs ([5a2636f](https://github.com/zuohuadong/svadmin/commit/5a2636fe30adea28a3eb4cf04a46534c90930060))
* **core:** resolve crud action targets, pb promises, sso decodes, and i18n missing keys ([53c77cb](https://github.com/zuohuadong/svadmin/commit/53c77cb8962aa21ed19e2a15a1934a4fc6a8cb55))
* **core:** resolve custom primary keys, pessimistic mutation contexts, useParsed deps, and live sync ([323e8f4](https://github.com/zuohuadong/svadmin/commit/323e8f4b805cb8c35492823bc34ea12cddb89d77))
* **core:** resolve data provider regressions and type errors ([8728fcc](https://github.com/zuohuadong/svadmin/commit/8728fcc737cbf6ece7400de7282984e3f2dce9f0))
* **core:** resolve functional regressions in routing, forms, and live providers ([09e4f69](https://github.com/zuohuadong/svadmin/commit/09e4f69246ae96c1e4357391e2b53aaad8756902))
* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))
* **core:** resolve reactivity and routing issues across hooks, ui, and auth ([0311806](https://github.com/zuohuadong/svadmin/commit/03118069696e16452aa16d6c737ee303348ef1f4))
* **core:** resolve regressions across SSR auth, mutation hooks, lite components and editor types ([5b716e2](https://github.com/zuohuadong/svadmin/commit/5b716e22dd1f0664b3a884b8d74a583590467065))
* **core:** resolve routing, auth SSR, live events and clone logic regressions from audit ([a025c8c](https://github.com/zuohuadong/svadmin/commit/a025c8c66847dd7fae5fa9ce5bfe81d7a8550dc4))
* **core:** resolve TS typing and Svelte 5 rune strictness issues across hooks and components ([b8021e4](https://github.com/zuohuadong/svadmin/commit/b8021e4dbe765838c1cf0e3cc0287d4fa5cadb1d))
* **core:** resolve vite 8 roldown parsing bugs by removing TS interfaces from .svelte.ts ([#100](https://github.com/zuohuadong/svadmin/issues/100)) ([b37e986](https://github.com/zuohuadong/svadmin/commit/b37e98610ef4b27a08bfcf0b976350059f00682a))
* **core:** restore live subscription callback typing and arrow function wrapper ([d11c986](https://github.com/zuohuadong/svadmin/commit/d11c986219df71d1846fe8583742045fd6411d67))
* **core:** restore MaybeGetter and getter params compatibility with Svelte 5 proxy fix ([4347ffd](https://github.com/zuohuadong/svadmin/commit/4347ffd197e6c59f0e4710598a420f5957a679c9))
* **core:** restore Svelte 5 reactivity context for data hooks and live subscriptions ([d788148](https://github.com/zuohuadong/svadmin/commit/d7881486f35c3a5720db3338ceaa6ea94c3b158e))
* **core:** router formatting, breadcrumb parsing, and hook caching ([2b31b0b](https://github.com/zuohuadong/svadmin/commit/2b31b0bc1587514c030bb6788116deb3f7269f34))
* **core:** sync casl and casbin adapters with AccessControlProvider CanParams update ([47dedac](https://github.com/zuohuadong/svadmin/commit/47dedac167b72bc0814367912c8709d93567363a))
* **core:** sync casl/casbin adapters with CanParams[] update ([ba2cee2](https://github.com/zuohuadong/svadmin/commit/ba2cee24882afe054582d5625321b8a5a868906f))
* **core:** upgrade cache invalidation to use query predicates and refine hook utilities ([b1c2749](https://github.com/zuohuadong/svadmin/commit/b1c2749159bed2dafc79393108f9306d99012001))
* **core:** use target[prop] proxy receiver bypassing to fix Svelte 5 nested proxy tracking ([37182f5](https://github.com/zuohuadong/svadmin/commit/37182f523bfe69643c508e596cda015a6a80c476))
* **deps:** replace svelte-sonner with sonner-svelte to resolve Tailwind CSS v4 Vite plugin compile error ([98b330a](https://github.com/zuohuadong/svadmin/commit/98b330a8cea21bd81debd2a85b4923c5f3edf6cb))
* **i18n:** add missing common.noDataHint translation keys ([#91](https://github.com/zuohuadong/svadmin/issues/91)) ([7842107](https://github.com/zuohuadong/svadmin/commit/78421072c182f3076f2cf71078fc82ad0c21509b))
* **lite:** resolve modal action binding, auth/delete redirects, and select components schemas ([f4da5cd](https://github.com/zuohuadong/svadmin/commit/f4da5cd9e5c81cf0c4673eb05777999b34632c4f))
* point permissions export to Svelte source ([#176](https://github.com/zuohuadong/svadmin/issues/176)) ([e18824c](https://github.com/zuohuadong/svadmin/commit/e18824ca6aa189ff8086b3ce08c55cb9f8f10a04))
* **providers:** resolve relative import path in firebase adapter and mock router test environment ([235091f](https://github.com/zuohuadong/svadmin/commit/235091fc9fccc77f9a8217d75d1094190fbc29fc))
* **quality:** address build warnings and test noise ([19a7637](https://github.com/zuohuadong/svadmin/commit/19a7637a6cd09bc660d71d058ca275124271254f))
* **supabase:** throw clear error when @refinedev/supabase is missing ([3ff0925](https://github.com/zuohuadong/svadmin/commit/3ff092597e4f58d6210c29a9aa84cbbf98a6d7d8))
* **ui & core:** patch xss vulnerability, approval bridge, access lockout and type errors ([046ed42](https://github.com/zuohuadong/svadmin/commit/046ed42ca1e4011718cf616f374e3aa2397b08dc))
* **ui,supabase:** clone route support, SSR localStorage guards, missing i18n key ([e1e96ad](https://github.com/zuohuadong/svadmin/commit/e1e96ad991ae1bb545aade3033b9776ae8805347))
* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))
* **ui:** normalize task queue records ([#142](https://github.com/zuohuadong/svadmin/issues/142)) ([1619fd4](https://github.com/zuohuadong/svadmin/commit/1619fd418f623533ea774ae5dbd4102a8d93ce23))
* **ui:** resolve routing, formatLink, and optional auth provider bugs ([acf7344](https://github.com/zuohuadong/svadmin/commit/acf73447b4fdb3aa3ae19b31147cdd5f347a3fe3))
* **ui:** stabilize AutoTable E2E rendering ([9795318](https://github.com/zuohuadong/svadmin/commit/9795318e3f9163152fef500e55aeeb4135335a3d))
* **ui:** upgrade @tanstack/table-core and fix AutoTable missing export ([b37e986](https://github.com/zuohuadong/svadmin/commit/b37e98610ef4b27a08bfcf0b976350059f00682a))
* **ui:** upgrade tanstack table to 9.0.0-alpha.32, fix autotable api compat ([8868f96](https://github.com/zuohuadong/svadmin/commit/8868f96762ec00f9ab40eec2e4600d389bc5c00a))


### 💅 Elegance & Refactoring

* **core:** adopt elegant useTranslation API ([ae97678](https://github.com/zuohuadong/svadmin/commit/ae976780076f695f013d53136fd496b7cc9a20bb))
* **core:** architectural refinements (notify, auth hooks, SSR, protective guards) ([f2e9333](https://github.com/zuohuadong/svadmin/commit/f2e93333826ab585ec1d72a2fe4d3cd8f524514f))
* **core:** architectural refinements (notify, auth hooks, SSR, protective guards) ([59a8ad1](https://github.com/zuohuadong/svadmin/commit/59a8ad1e6051cf1fea2fa816878c2ce0bd997790))
* **core:** cleanup tech debt and remove deprecated apis ([ecdf89e](https://github.com/zuohuadong/svadmin/commit/ecdf89e45913aa87ac2e9fe482093dedd66e3fb1))
* **core:** decouple sonner-svelte from core to make it truly headless ([e9ea226](https://github.com/zuohuadong/svadmin/commit/e9ea226cd1765fe3d43a0d53705a14ec27e5be44))
* **core:** eliminate all backward-compat debt and fix reactivity bugs ([e8aea9c](https://github.com/zuohuadong/svadmin/commit/e8aea9c11c59f77270c3728604b22c60c7ab9f1a))
* **core:** eliminate all backward-compat debt and fix reactivity bugs ([b4fb15a](https://github.com/zuohuadong/svadmin/commit/b4fb15a8bbb2a0069fc957e5c9471eb111aa7a1f))
* **core:** eliminate all backward-compat debt and fix reactivity… ([19996d7](https://github.com/zuohuadong/svadmin/commit/19996d7cc79365985baf9de157aac300ec62ec7d))
* **core:** eliminate all backward-compat tech debt and fix reactivity bugs ([2133f4f](https://github.com/zuohuadong/svadmin/commit/2133f4f6da3c6c8fc0186d08dae12701ccfed912))
* **core:** extract pure utilities to helpers-pure.ts and add 21 unit tests ([9519061](https://github.com/zuohuadong/svadmin/commit/9519061e432204c673b0ce98da0c5d164b5d7661))
* **core:** make core fully headless by decoupling sonner-svelte ([6f6c561](https://github.com/zuohuadong/svadmin/commit/6f6c5618597df5fcb8257f3bd09ba813710bce6c))
* **core:** migrate permissions and core utilities to Svelte 5 runes ([8e3ed99](https://github.com/zuohuadong/svadmin/commit/8e3ed9950b56ffcbe4877f46987bd8eb69ef21f1))
* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))
* elegance refinements ([8081767](https://github.com/zuohuadong/svadmin/commit/80817673e4a4b971391c6cffc8b7bcaf26b95750))
* elegance refinements — navigation guard, permissions refetch, sidebar matching, batch delete ([ff46f8f](https://github.com/zuohuadong/svadmin/commit/ff46f8f0991ddd4dc126c9161fa9bf30d658d221))
* modernize enterprise architecture and resolve technical debt ([860ae60](https://github.com/zuohuadong/svadmin/commit/860ae607b1d3002e3318c51047d6219bc073050f))
* **nestjsx-crud:** remove unused query-string dependency ([e9ea226](https://github.com/zuohuadong/svadmin/commit/e9ea226cd1765fe3d43a0d53705a14ec27e5be44))
* **ui:** clean reactive task center bindings ([31118dd](https://github.com/zuohuadong/svadmin/commit/31118dd29bdb2b8a5d7ae8283d0f4e7ae1c4dc8a))


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))
* **ci:** add commitlint + husky to enforce conventional commit standards ([400d2c0](https://github.com/zuohuadong/svadmin/commit/400d2c0c3dc8939fd69ef048649ed8ec58b55a03))
* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))
* **deps:** bump TanStack packages ([6468031](https://github.com/zuohuadong/svadmin/commit/646803168e6f55685febb312cd05ce171387554a))
* **deps:** bump the bun-minor-and-patch group across 4 directories with 50 updates ([#182](https://github.com/zuohuadong/svadmin/issues/182)) ([b1d05ae](https://github.com/zuohuadong/svadmin/commit/b1d05ae88caaa96b8697c14a2882af76e33eaf34))
* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))
* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))
* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))
* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))
* release main ([c555c7b](https://github.com/zuohuadong/svadmin/commit/c555c7bb989d6b09e428e5b8eb80b30c36ec123c))
* release main ([97abf5d](https://github.com/zuohuadong/svadmin/commit/97abf5d91302813c938a317e083846dd6d788037))
* release main ([6112f85](https://github.com/zuohuadong/svadmin/commit/6112f85e127c34a78d1398fa75cc45973f4ddfa4))
* release main ([d96fea2](https://github.com/zuohuadong/svadmin/commit/d96fea209e61f1a3732f0ea13ee66d44611151f3))
* release main ([732049c](https://github.com/zuohuadong/svadmin/commit/732049cc0e8ef842f5a789b398dab16aca8b9ec7))
* release main ([d0f3d8a](https://github.com/zuohuadong/svadmin/commit/d0f3d8ab328a430f7727db0544d49e514a069504))
* release main ([73af458](https://github.com/zuohuadong/svadmin/commit/73af45856e6b488e08e504084f39c868dba9a367))
* release main ([90cdcc5](https://github.com/zuohuadong/svadmin/commit/90cdcc5d7e6ef4a220dd64d0b16ac48e14dbbc68))
* release main ([b547e62](https://github.com/zuohuadong/svadmin/commit/b547e62694dc26510de8aedf8020455ff464a4f5))
* release main ([6e07abe](https://github.com/zuohuadong/svadmin/commit/6e07abefdbb0b6f34c872091d0828b188677d5fa))
* release main ([beb5e89](https://github.com/zuohuadong/svadmin/commit/beb5e89d8a521df0aa6b2006c97ac22088aacf21))
* release main ([79eec5f](https://github.com/zuohuadong/svadmin/commit/79eec5fbe7b286d38427e6fdf394a5790e1b1a15))
* release main ([cf14a58](https://github.com/zuohuadong/svadmin/commit/cf14a5842cdbfe24fb126c78493da3bfced894e4))
* release main ([01c3f66](https://github.com/zuohuadong/svadmin/commit/01c3f660b457ec36e18fc68d1d05eb07c0b64290))
* release main ([779d092](https://github.com/zuohuadong/svadmin/commit/779d092ccbbf76f6b3af3efaeb442ee77a3818dc))
* release main ([5381e99](https://github.com/zuohuadong/svadmin/commit/5381e99ec3ebd8b02bdc4c4af4b7a686d35e9768))
* release main ([3703839](https://github.com/zuohuadong/svadmin/commit/37038396c4d828c62725d23070624618952af54f))
* release main ([4894d4a](https://github.com/zuohuadong/svadmin/commit/4894d4a39d6124d9dfdd82e2517b37f2f76f2c71))
* release main ([0a025b0](https://github.com/zuohuadong/svadmin/commit/0a025b055b2f0ef6e5f7043f784e82bd7208a025))
* release main ([c741a3b](https://github.com/zuohuadong/svadmin/commit/c741a3b2ab1974cce44883f8adaf47f6834b00df))
* release main ([16dc274](https://github.com/zuohuadong/svadmin/commit/16dc27464c9546b237986e097bba95ac70feb8ce))
* release main ([8619786](https://github.com/zuohuadong/svadmin/commit/86197869a163ad0c187ae5d2b764b3e0a3974fbc))
* release main ([15c7b27](https://github.com/zuohuadong/svadmin/commit/15c7b27bfcc84f41c2f20663648163a197ce343e))
* release main ([f67b549](https://github.com/zuohuadong/svadmin/commit/f67b54975cdc0f1647c1e620aa1b192ee76d366d))
* release main ([ec6e22b](https://github.com/zuohuadong/svadmin/commit/ec6e22bd8ab719848dc4c050017659a0cd4cb3ce))
* release main ([5fe9e40](https://github.com/zuohuadong/svadmin/commit/5fe9e403f6696592c27ec0f03293b336bbbc50ae))
* release main ([9ebd692](https://github.com/zuohuadong/svadmin/commit/9ebd692863c6853116a622392a31a377d9f86c6f))
* release main ([3ebd51f](https://github.com/zuohuadong/svadmin/commit/3ebd51f4636b17f10cc8e1cc97e4ab346b817cd2))
* release main ([7861153](https://github.com/zuohuadong/svadmin/commit/78611531e1d9c405a50988ef97b73d87fcafa2f1))
* release main ([86a0b3e](https://github.com/zuohuadong/svadmin/commit/86a0b3e3e67b455ed0e5802c12121c5dff5dca76))
* release main ([d9b9000](https://github.com/zuohuadong/svadmin/commit/d9b90007676e3405c963138b4aa38e94903fda0b))
* release main ([1f8e7e1](https://github.com/zuohuadong/svadmin/commit/1f8e7e1e7b71b10bc9e0353a1db53e697af6f77c))
* release main ([b1b2f19](https://github.com/zuohuadong/svadmin/commit/b1b2f19a6fdb2754266d6f06903ee20090c369f4))
* release main ([a77f3dc](https://github.com/zuohuadong/svadmin/commit/a77f3dc2e37da76ebe3139ea0c5c6d4aeecfd35f))
* release main ([0f87dd9](https://github.com/zuohuadong/svadmin/commit/0f87dd92d411963dfd2cbf4173b0f4556e8a689f))
* release main ([aea9541](https://github.com/zuohuadong/svadmin/commit/aea9541b1a61dc8034d2654248d70149323db5f9))
* release main ([f30b3d6](https://github.com/zuohuadong/svadmin/commit/f30b3d6ae9b823387860fc0d73ae9845dda58dcb))
* release main ([827c10b](https://github.com/zuohuadong/svadmin/commit/827c10b66c7a4da67c69e2da083e6d3b46b65ebe))
* release main ([910aa29](https://github.com/zuohuadong/svadmin/commit/910aa298b799f23eac27b17a5d5612d951048810))
* release main ([10c3282](https://github.com/zuohuadong/svadmin/commit/10c32827e7ae42fdd1ef279defb26f437d092465))
* release main ([6393166](https://github.com/zuohuadong/svadmin/commit/6393166f0f692d533d2141e496cc1358cece936a))
* release main ([b48c1b3](https://github.com/zuohuadong/svadmin/commit/b48c1b3a34c6c2459cc669771da2bb6da60b9597))
* release main ([2ad394d](https://github.com/zuohuadong/svadmin/commit/2ad394de09c3791657c44d162c51a1dc1787d74d))
* release main ([#101](https://github.com/zuohuadong/svadmin/issues/101)) ([ebb9d07](https://github.com/zuohuadong/svadmin/commit/ebb9d07040d0803790897a96b81fb11a89226451))
* release main ([#103](https://github.com/zuohuadong/svadmin/issues/103)) ([dd7cd8f](https://github.com/zuohuadong/svadmin/commit/dd7cd8fe674ca537d8f8cfc7223c289cf5eba833))
* release main ([#105](https://github.com/zuohuadong/svadmin/issues/105)) ([752d7ca](https://github.com/zuohuadong/svadmin/commit/752d7ca61b0677921507de9ed31447db99e17f86))
* release main ([#106](https://github.com/zuohuadong/svadmin/issues/106)) ([40613a5](https://github.com/zuohuadong/svadmin/commit/40613a53d7e5555041e706609dd918346ebc9c0b))
* release main ([#108](https://github.com/zuohuadong/svadmin/issues/108)) ([cf85315](https://github.com/zuohuadong/svadmin/commit/cf8531528b84c0fa35a3e85c112e168173e36698))
* release main ([#109](https://github.com/zuohuadong/svadmin/issues/109)) ([6c11dcb](https://github.com/zuohuadong/svadmin/commit/6c11dcb01ad0c068bbceafd51eb0f486b2d41e21))
* release main ([#111](https://github.com/zuohuadong/svadmin/issues/111)) ([a56b028](https://github.com/zuohuadong/svadmin/commit/a56b02879d3145c9c97fbdc7a6356c46327e0133))
* release main ([#112](https://github.com/zuohuadong/svadmin/issues/112)) ([c930b57](https://github.com/zuohuadong/svadmin/commit/c930b578509f69cd05d299838b4ca55aa28ee59e))
* release main ([#113](https://github.com/zuohuadong/svadmin/issues/113)) ([fdeee44](https://github.com/zuohuadong/svadmin/commit/fdeee4460c3467fa069fdd5219b343464aa04f1e))
* release main ([#114](https://github.com/zuohuadong/svadmin/issues/114)) ([ce6ee08](https://github.com/zuohuadong/svadmin/commit/ce6ee08750f7cb3ce644b1a0abb917ba26f4b68b))
* release main ([#115](https://github.com/zuohuadong/svadmin/issues/115)) ([ca3402f](https://github.com/zuohuadong/svadmin/commit/ca3402f1a17fff02b7cd7b6e2768817f95834eb3))
* release main ([#116](https://github.com/zuohuadong/svadmin/issues/116)) ([7124de0](https://github.com/zuohuadong/svadmin/commit/7124de09dadbc424674bd7b4d490c298ac768e79))
* release main ([#117](https://github.com/zuohuadong/svadmin/issues/117)) ([3466543](https://github.com/zuohuadong/svadmin/commit/3466543eb955d922d36d3b3aa48cb5f9906144b0))
* release main ([#118](https://github.com/zuohuadong/svadmin/issues/118)) ([c451503](https://github.com/zuohuadong/svadmin/commit/c4515031812828f268c52215a132ea60285ea2c9))
* release main ([#121](https://github.com/zuohuadong/svadmin/issues/121)) ([3d2716f](https://github.com/zuohuadong/svadmin/commit/3d2716f08988efdaeb152630f3924088950585e4))
* release main ([#135](https://github.com/zuohuadong/svadmin/issues/135)) ([f03c372](https://github.com/zuohuadong/svadmin/commit/f03c3728a6d2a1dd574437f917619c572b052ea3))
* release main ([#138](https://github.com/zuohuadong/svadmin/issues/138)) ([9c205b3](https://github.com/zuohuadong/svadmin/commit/9c205b35d72a395ea692ad3a743c17776ae1ae0d))
* release main ([#143](https://github.com/zuohuadong/svadmin/issues/143)) ([0d34644](https://github.com/zuohuadong/svadmin/commit/0d346442191fd247ad6008f34b7df62f3dc05e47))
* release main ([#145](https://github.com/zuohuadong/svadmin/issues/145)) ([fc07411](https://github.com/zuohuadong/svadmin/commit/fc074117cf08cda231e629ef65b40462a455862b))
* release main ([#152](https://github.com/zuohuadong/svadmin/issues/152)) ([b1e260f](https://github.com/zuohuadong/svadmin/commit/b1e260fb5f40d8048f689e2930f49a7e4d495a19))
* release main ([#160](https://github.com/zuohuadong/svadmin/issues/160)) ([afbb3ae](https://github.com/zuohuadong/svadmin/commit/afbb3ae155b7fca97c4219a1fac947d6e2212fc1))
* release main ([#174](https://github.com/zuohuadong/svadmin/issues/174)) ([b9ec328](https://github.com/zuohuadong/svadmin/commit/b9ec328939890eee72337e5fca548b20c7dad377))
* release main ([#175](https://github.com/zuohuadong/svadmin/issues/175)) ([2631e54](https://github.com/zuohuadong/svadmin/commit/2631e54a598b17ed617e35c702d4ab329c3b815a))
* release main ([#181](https://github.com/zuohuadong/svadmin/issues/181)) ([e9a401b](https://github.com/zuohuadong/svadmin/commit/e9a401bfe2c225c2799264a374b35d1ea3f7a679))
* release main ([#184](https://github.com/zuohuadong/svadmin/issues/184)) ([416c2ad](https://github.com/zuohuadong/svadmin/commit/416c2ad55837ca2fc9456144e280af6c489ed979))
* release main ([#186](https://github.com/zuohuadong/svadmin/issues/186)) ([02316cd](https://github.com/zuohuadong/svadmin/commit/02316cd00d3cfc0eb7a7d63557d0babb4df3cc2d))
* release main ([#188](https://github.com/zuohuadong/svadmin/issues/188)) ([7ae1278](https://github.com/zuohuadong/svadmin/commit/7ae127897f4526749875ee0554e70f838f75e7ad))
* release main ([#191](https://github.com/zuohuadong/svadmin/issues/191)) ([ce0b29e](https://github.com/zuohuadong/svadmin/commit/ce0b29e19ae3bb962e8b6b23c344464691fd724f))
* release main ([#201](https://github.com/zuohuadong/svadmin/issues/201)) ([925fd58](https://github.com/zuohuadong/svadmin/commit/925fd5831dea6320daad1ee7cf0e7c2ae69d8f34))
* release main ([#202](https://github.com/zuohuadong/svadmin/issues/202)) ([609f2aa](https://github.com/zuohuadong/svadmin/commit/609f2aa42bad524a79e00de1c69d5f5362a7bbcc))
* release main ([#205](https://github.com/zuohuadong/svadmin/issues/205)) ([0ec7beb](https://github.com/zuohuadong/svadmin/commit/0ec7beb02984856b104b1cae02c972ec772132b8))
* release main ([#212](https://github.com/zuohuadong/svadmin/issues/212)) ([87234c8](https://github.com/zuohuadong/svadmin/commit/87234c87fe28a952eefdce80f00773344e1a25e6))
* release main ([#218](https://github.com/zuohuadong/svadmin/issues/218)) ([f66701f](https://github.com/zuohuadong/svadmin/commit/f66701f33ae7ce6d14f27fc0f399cf2574d99b4d))
* release main ([#228](https://github.com/zuohuadong/svadmin/issues/228)) ([f619425](https://github.com/zuohuadong/svadmin/commit/f619425157279ff948205b1b0ade5fde9f0baafa))
* release main ([#87](https://github.com/zuohuadong/svadmin/issues/87)) ([56581db](https://github.com/zuohuadong/svadmin/commit/56581dba457486dad2e2a4a5a0662e174a89790d))
* release main ([#92](https://github.com/zuohuadong/svadmin/issues/92)) ([baefbd5](https://github.com/zuohuadong/svadmin/commit/baefbd5874e21f4a3d17b9c7b7e70002bea41a1a))
* release main ([#98](https://github.com/zuohuadong/svadmin/issues/98)) ([98a6172](https://github.com/zuohuadong/svadmin/commit/98a6172a8be007dfd4edbfa52d7fc65c9cff5b1f))
* release main ([#99](https://github.com/zuohuadong/svadmin/issues/99)) ([36e6171](https://github.com/zuohuadong/svadmin/commit/36e61715cf84a2acd77df06c66332faba0a7035a))

## [0.36.0](https://github.com/zuohuadong/svadmin/compare/core-v0.35.0...core-v0.36.0) (2026-08-13)


### 🚀 Features

* **core:** freeze Svelte hook contracts ([b76cb4a](https://github.com/zuohuadong/svadmin/commit/b76cb4a9a72f3340a381111c44ea7b2980ed796b))

## [0.35.0](https://github.com/zuohuadong/svadmin/compare/core-v0.34.2...core-v0.35.0) (2026-08-11)


### 🚀 Features

* **admin:** align capabilities with Refine v5 ([#229](https://github.com/zuohuadong/svadmin/issues/229)) ([37b7fb9](https://github.com/zuohuadong/svadmin/commit/37b7fb9d06b367fb4ef7060f16251df5f9b97822))

## [0.34.2](https://github.com/zuohuadong/svadmin/compare/core-v0.34.1...core-v0.34.2) (2026-08-10)


### 🔧 Miscellaneous Chores

* **deps:** upgrade dependencies to latest ([01b5b4f](https://github.com/zuohuadong/svadmin/commit/01b5b4fe65df4bab2d409cbb4a880b14946c4fe0))

## [0.34.1](https://github.com/zuohuadong/svadmin/compare/core-v0.34.0...core-v0.34.1) (2026-08-05)


### 🐛 Bug Fixes

* **auth:** combine trusted permission resolvers with UI-only hints ([#211](https://github.com/zuohuadong/svadmin/issues/211)) ([246cf3e](https://github.com/zuohuadong/svadmin/commit/246cf3e15120b933da0c23fa4eaf4a67f14acc56))

## [0.34.0](https://github.com/zuohuadong/svadmin/compare/core-v0.33.0...core-v0.34.0) (2026-08-05)


### 🚀 Features

* **example:** complete reference pages and responsive styling ([#207](https://github.com/zuohuadong/svadmin/issues/207)) ([57c5af0](https://github.com/zuohuadong/svadmin/commit/57c5af05a0521b2a763b5c8d61962d11de9965ed))

## [0.33.0](https://github.com/zuohuadong/svadmin/compare/core-v0.32.3...core-v0.33.0) (2026-08-04)


### 🚀 Features

* **ui:** expand admin example pages ([7d7dc5e](https://github.com/zuohuadong/svadmin/commit/7d7dc5eb1039191d606bf0deea0fd87bc51772f6))

## [0.32.3](https://github.com/zuohuadong/svadmin/compare/core-v0.32.2...core-v0.32.3) (2026-07-30)


### 🔧 Miscellaneous Chores

* **deps:** upgrade workspace dependencies ([f86acb7](https://github.com/zuohuadong/svadmin/commit/f86acb7115099a9e5222da0cca9f55ce9834fe01))
* **deps:** upgrade workspace dependencies ([7585402](https://github.com/zuohuadong/svadmin/commit/75854020b577f82f8ca0a43a0fc1f85864bec229))

## [0.32.2](https://github.com/zuohuadong/svadmin/compare/core-v0.32.1...core-v0.32.2) (2026-07-22)


### 🔧 Miscellaneous Chores

* **deps:** bump dependencies and bun to 1.3.14 ([35c8b2a](https://github.com/zuohuadong/svadmin/commit/35c8b2a1f599bb70fd2a0733225f48788eba62c3))

## [0.32.1](https://github.com/zuohuadong/svadmin/compare/core-v0.32.0...core-v0.32.1) (2026-07-18)


### 🐛 Bug Fixes

* **core:** harden export and sso validation ([#187](https://github.com/zuohuadong/svadmin/issues/187)) ([35f286d](https://github.com/zuohuadong/svadmin/commit/35f286dada562609d104f8617b3abe4997eae2fd))

## [0.32.0](https://github.com/zuohuadong/svadmin/compare/core-v0.31.2...core-v0.32.0) (2026-07-18)


### 🚀 Features

* **sso:** add rotation-safe browser session lifecycle ([#185](https://github.com/zuohuadong/svadmin/issues/185)) ([9fa0881](https://github.com/zuohuadong/svadmin/commit/9fa08818ed175958669e2e227d29d381f115b0de))

## [0.31.2](https://github.com/zuohuadong/svadmin/compare/core-v0.31.1...core-v0.31.2) (2026-07-15)


### 🔧 Miscellaneous Chores

* **deps:** bump the bun-minor-and-patch group across 4 directories with 50 updates ([#182](https://github.com/zuohuadong/svadmin/issues/182)) ([b1d05ae](https://github.com/zuohuadong/svadmin/commit/b1d05ae88caaa96b8697c14a2882af76e33eaf34))

## [0.31.1](https://github.com/zuohuadong/svadmin/compare/core-v0.31.0...core-v0.31.1) (2026-07-11)


### 🔧 Miscellaneous Chores

* **all:** sync all packages ([f1c5115](https://github.com/zuohuadong/svadmin/commit/f1c5115d190e7168bb4ae2a588f16a452ccf1ced))

## [0.31.0](https://github.com/zuohuadong/svadmin/compare/core-v0.30.0...core-v0.31.0) (2026-06-23)


### 🚀 Features

* **core:** align refinedev auth and access edge cases ([a3df3e1](https://github.com/zuohuadong/svadmin/commit/a3df3e15607599aa4acb3b4dc90b6cfdc494cc21))
* **example:** complete menu coverage and high-value admin modules ([84384f2](https://github.com/zuohuadong/svadmin/commit/84384f299553c4962fbfc805a2af57478df675b6))
* **example:** expand reference app pages ([39ae832](https://github.com/zuohuadong/svadmin/commit/39ae8320e8a07297cd77fc0ba669cd590b3a300c))


### 🐛 Bug Fixes

* point permissions export to Svelte source ([#176](https://github.com/zuohuadong/svadmin/issues/176)) ([e18824c](https://github.com/zuohuadong/svadmin/commit/e18824ca6aa189ff8086b3ce08c55cb9f8f10a04))

## [0.30.0](https://github.com/zuohuadong/svadmin/compare/core-v0.29.0...core-v0.30.0) (2026-06-14)


### 🚀 Features

* **example:** refine admin demo shell ([e8070d2](https://github.com/zuohuadong/svadmin/commit/e8070d2f492627166dd5b0a1845d0f12f483aa8b))

## [0.29.0](https://github.com/zuohuadong/svadmin/compare/core-v0.28.0...core-v0.29.0) (2026-06-12)


### 🚀 Features

* **ui:** refine sidebar and content pages ([bba29e0](https://github.com/zuohuadong/svadmin/commit/bba29e0e6c00b0dc05aac4d499e9fef88623f29e))

## [0.28.0](https://github.com/zuohuadong/svadmin/compare/core-v0.27.1...core-v0.28.0) (2026-06-11)


### 🚀 Features

* **example:** polish admin demo shell ([65559dd](https://github.com/zuohuadong/svadmin/commit/65559dddb4531ecbe5540312864dec0f3d35ae1a))
* **ui:** add clean-flat layout preset for high contrast modern aesthetics ([8dba20b](https://github.com/zuohuadong/svadmin/commit/8dba20b7049362ca7e4c9a3de3063660ea8f97db))
* **ui:** add reference-inspired admin pages ([bfa10db](https://github.com/zuohuadong/svadmin/commit/bfa10db87a80c6781e4668340437259705ed6fdc))
* **ui:** add Settings sub-pages, ErrorPage, Dashboard expansion and i18n ([eb55054](https://github.com/zuohuadong/svadmin/commit/eb55054458928ae2033113e8fd577628a9261819))

## [0.27.1](https://github.com/zuohuadong/svadmin/compare/core-v0.27.0...core-v0.27.1) (2026-06-04)


### 🔧 Miscellaneous Chores

* **deps:** upgrade all dependencies and fix lint errors ([509f285](https://github.com/zuohuadong/svadmin/commit/509f28531f9f61d019f15aeb555160c24f64b48b))

## [0.27.0](https://github.com/zuohuadong/svadmin/compare/core-v0.26.0...core-v0.27.0) (2026-06-03)


### 🚀 Features

* svelte 5 runes migration, AI review workflow, eslint baseline, and dependabot config ([3b7a0b0](https://github.com/zuohuadong/svadmin/commit/3b7a0b0f89470f43f7ca3685ee25f1ad86353fc6))


### 🐛 Bug Fixes

* **core:** remove hardcoded role hierarchy from createFeatureGate ([4cbdaa2](https://github.com/zuohuadong/svadmin/commit/4cbdaa22b72b1820402d48cc9eed2ae8a3ee197c))

## [0.26.0](https://github.com/zuohuadong/svadmin/compare/core-v0.25.5...core-v0.26.0) (2026-06-03)


### 🚀 Features

* **core:** add fetchWithInterceptor and createFeatureGate ([6d2c7d7](https://github.com/zuohuadong/svadmin/commit/6d2c7d79c19252761796850998b2f2eb88ef930d))
* **core:** add fetchWithInterceptor and createFeatureGate ([c48c4b7](https://github.com/zuohuadong/svadmin/commit/c48c4b7d2e6ea1eab854894ee2d5d7ee76078c2b))


### 🐛 Bug Fixes

* **core:** make fetch interceptor SSR-safe ([4cd386e](https://github.com/zuohuadong/svadmin/commit/4cd386efa88fa1083fc23f76b91b10096d884f8a))

## [0.25.5](https://github.com/zuohuadong/svadmin/compare/core-v0.25.4...core-v0.25.5) (2026-05-23)


### 🐛 Bug Fixes

* **ui:** stabilize AutoTable E2E rendering ([9795318](https://github.com/zuohuadong/svadmin/commit/9795318e3f9163152fef500e55aeeb4135335a3d))

## [0.25.4](https://github.com/zuohuadong/svadmin/compare/core-v0.25.3...core-v0.25.4) (2026-05-12)


### 🔧 Miscellaneous Chores

* **deps:** bump TanStack packages ([6468031](https://github.com/zuohuadong/svadmin/commit/646803168e6f55685febb312cd05ce171387554a))

## [0.25.3](https://github.com/zuohuadong/svadmin/compare/core-v0.25.2...core-v0.25.3) (2026-05-04)


### 🐛 Bug Fixes

* **ci:** e2e selectors, publish hygiene, MarkdownField XSS, eslint ignores ([d922639](https://github.com/zuohuadong/svadmin/commit/d9226399d120b326c7161055f93d3594ce299b57))

## [0.25.2](https://github.com/zuohuadong/svadmin/compare/core-v0.25.1...core-v0.25.2) (2026-04-26)


### 🐛 Bug Fixes

* **core:** allow nullable task record fields ([#144](https://github.com/zuohuadong/svadmin/issues/144)) ([7260fb4](https://github.com/zuohuadong/svadmin/commit/7260fb4cc528a738c362429bc16311c21b3739a3))

## [0.25.1](https://github.com/zuohuadong/svadmin/compare/core-v0.25.0...core-v0.25.1) (2026-04-25)


### 🐛 Bug Fixes

* **ui:** normalize task queue records ([#142](https://github.com/zuohuadong/svadmin/issues/142)) ([1619fd4](https://github.com/zuohuadong/svadmin/commit/1619fd418f623533ea774ae5dbd4102a8d93ce23))

## [0.25.0](https://github.com/zuohuadong/svadmin/compare/core-v0.24.0...core-v0.25.0) (2026-04-19)


### 🚀 Features

* **task:** add provider-first task center ([08ef269](https://github.com/zuohuadong/svadmin/commit/08ef269db4d000736f3bf92d90b2f620a4b6276c))


### 💅 Elegance & Refactoring

* **ui:** clean reactive task center bindings ([31118dd](https://github.com/zuohuadong/svadmin/commit/31118dd29bdb2b8a5d7ae8283d0f4e7ae1c4dc8a))

## [0.24.0](https://github.com/zuohuadong/svadmin/compare/core-v0.23.6...core-v0.24.0) (2026-04-14)


### 🚀 Features

* **ui:** support component icons in menu & migrate tanstack v9 standalone functions ([#134](https://github.com/zuohuadong/svadmin/issues/134)) ([e47ca73](https://github.com/zuohuadong/svadmin/commit/e47ca7389c631eb7772b0583697c1b083e015a2f))
* **ui:** support passing Svelte components directly as menu/sidebar icons ([af54e3e](https://github.com/zuohuadong/svadmin/commit/af54e3e7d0bc0fee06f0d25d1a42ad1cf7624177))

## [0.23.6](https://github.com/zuohuadong/svadmin/compare/core-v0.23.5...core-v0.23.6) (2026-04-14)


### 🐛 Bug Fixes

* **core:** restore MaybeGetter and getter params compatibility with Svelte 5 proxy fix ([4347ffd](https://github.com/zuohuadong/svadmin/commit/4347ffd197e6c59f0e4710598a420f5957a679c9))
* **supabase:** throw clear error when @refinedev/supabase is missing ([3ff0925](https://github.com/zuohuadong/svadmin/commit/3ff092597e4f58d6210c29a9aa84cbbf98a6d7d8))

## [0.23.5](https://github.com/zuohuadong/svadmin/compare/core-v0.23.4...core-v0.23.5) (2026-04-13)


### 🐛 Bug Fixes

* **providers:** resolve relative import path in firebase adapter and mock router test environment ([235091f](https://github.com/zuohuadong/svadmin/commit/235091fc9fccc77f9a8217d75d1094190fbc29fc))

## [0.23.4](https://github.com/zuohuadong/svadmin/compare/core-v0.23.3...core-v0.23.4) (2026-04-13)


### 🐛 Bug Fixes

* **core:** break circular import TDZ causing router crashes ([dea90af](https://github.com/zuohuadong/svadmin/commit/dea90af81365c3b4d6e5348ba0fc42eec0c045e1))

## [0.23.3](https://github.com/zuohuadong/svadmin/compare/core-v0.23.2...core-v0.23.3) (2026-04-13)


### 🐛 Bug Fixes

* **core:** apply minor utility patches and listener deduplication ([300da96](https://github.com/zuohuadong/svadmin/commit/300da96ca280f75a7c63f6b238c7c72c469756de))
* **core:** export publishLiveEvent out of mutation hooks to resolve TS error ([b477c26](https://github.com/zuohuadong/svadmin/commit/b477c265204935715cd9a40cc792751f310306b5))
* **core:** resolve TS typing and Svelte 5 rune strictness issues across hooks and components ([b8021e4](https://github.com/zuohuadong/svadmin/commit/b8021e4dbe765838c1cf0e3cc0287d4fa5cadb1d))


### 🔧 Miscellaneous Chores

* **deps:** mark peer dependencies as optional to fix bun workspace resolution lock ([e928690](https://github.com/zuohuadong/svadmin/commit/e928690734161b133eb5227fb0454b92d1887149))

## [0.23.2](https://github.com/zuohuadong/svadmin/compare/core-v0.23.1...core-v0.23.2) (2026-04-12)


### 🐛 Bug Fixes

* **core:** improve query invalidation scopes, add bulk live events, and fix sidebar collapse state ([92bc1f7](https://github.com/zuohuadong/svadmin/commit/92bc1f7c58c8e80023ac958b7988a0e8ba913cf1))
* **core:** improve useForm autoSave queuing and dataProvider scope passing ([a115db4](https://github.com/zuohuadong/svadmin/commit/a115db4a59e9d5c575a97a44d6773d40308ad96a))


### 💅 Elegance & Refactoring

* **core:** migrate permissions and core utilities to Svelte 5 runes ([8e3ed99](https://github.com/zuohuadong/svadmin/commit/8e3ed9950b56ffcbe4877f46987bd8eb69ef21f1))

## [0.23.1](https://github.com/zuohuadong/svadmin/compare/core-v0.23.0...core-v0.23.1) (2026-04-12)


### 🐛 Bug Fixes

* **core:** convert colorThemes derived export to function ([cb12bf6](https://github.com/zuohuadong/svadmin/commit/cb12bf65f2eb9456f0a9ff8413b738cbf616ba90))

## [0.23.0](https://github.com/zuohuadong/svadmin/compare/core-v0.22.1...core-v0.23.0) (2026-04-12)


### 🚀 Features

* **ui:** refine AutoTable to fluid borderless design and Sidebar to pill-style elevated states ([de92adc](https://github.com/zuohuadong/svadmin/commit/de92adc3fbf0077fb68c5a49009b546397916786))


### 🐛 Bug Fixes

* **core:** add authentication error delegation (401/403) to all data hooks matching refine parity ([8b28cf9](https://github.com/zuohuadong/svadmin/commit/8b28cf99d0bb67509851b8c6813c83383dad4914))
* **core:** align mutation/query hooks with refine patterns — onSettled invalidation, many-query optimistic updates, live event publishing, reactive useResource, notification dedup guards ([1123472](https://github.com/zuohuadong/svadmin/commit/112347253f22607988c105e80ba7c7050db8eb0b))
* **core:** complete refine dev logic parity and ui memory leak resolutions ([3b5c29a](https://github.com/zuohuadong/svadmin/commit/3b5c29ac171affb17e96dc749482d25f06c7cad7))
* **core:** improve query caching and optimistic update recovery ([a18356e](https://github.com/zuohuadong/svadmin/commit/a18356e0f777b8d21e5f58bee8d9d2250a64f1ef))
* **core:** plug autoSaveTimer memory leaks and solidify mutation reactivity ([f2ec660](https://github.com/zuohuadong/svadmin/commit/f2ec6609389f0ce9aa3914bbaf5af90dd3ef4545))
* **core:** upgrade cache invalidation to use query predicates and refine hook utilities ([b1c2749](https://github.com/zuohuadong/svadmin/commit/b1c2749159bed2dafc79393108f9306d99012001))


### 💅 Elegance & Refactoring

* **core:** extract pure utilities to helpers-pure.ts and add 21 unit tests ([9519061](https://github.com/zuohuadong/svadmin/commit/9519061e432204c673b0ce98da0c5d164b5d7661))

## [0.22.1](https://github.com/zuohuadong/svadmin/compare/core-v0.22.0...core-v0.22.1) (2026-04-11)


### 🐛 Bug Fixes

* **core & ui:** resolve layout remounts, auth retention and action leaks ([4d75ddb](https://github.com/zuohuadong/svadmin/commit/4d75ddbd0ef307a08da76fcb47e75f89c72dba47))
* **core:** batch resolve lite routing, forms, theme mapping and proxy logic ([26318fe](https://github.com/zuohuadong/svadmin/commit/26318fe59afd905874fd6f2bf4b6ecd169809a93))
* **core:** patch useImport parsing, hooks reactivity, and route bindings ([ca478c0](https://github.com/zuohuadong/svadmin/commit/ca478c0ac964796ad92930945f7200e7a08513aa))
* **core:** refactor query hooks runtime reactivity and patch mcp/ws logic ([07897d7](https://github.com/zuohuadong/svadmin/commit/07897d715a2731f595f84395f8f4fa9285b2f616))
* **core:** resolve crud action targets, pb promises, sso decodes, and i18n missing keys ([53c77cb](https://github.com/zuohuadong/svadmin/commit/53c77cb8962aa21ed19e2a15a1934a4fc6a8cb55))
* **core:** router formatting, breadcrumb parsing, and hook caching ([2b31b0b](https://github.com/zuohuadong/svadmin/commit/2b31b0bc1587514c030bb6788116deb3f7269f34))
* **ui & core:** patch xss vulnerability, approval bridge, access lockout and type errors ([046ed42](https://github.com/zuohuadong/svadmin/commit/046ed42ca1e4011718cf616f374e3aa2397b08dc))

## [0.22.0](https://github.com/zuohuadong/svadmin/compare/core-v0.21.2...core-v0.22.0) (2026-04-11)


### ⚠ BREAKING CHANGES

* **core & ui:** useList, useOne, useShow, useMany now return the Tanstack Query result directly instead of wrapping it in { query, overtime }.

### 🐛 Bug Fixes

* **core & ui:** resolve critical Svelte 5 context bounds, proxy loops, and package exports ([#110](https://github.com/zuohuadong/svadmin/issues/110)) ([b0a1fd7](https://github.com/zuohuadong/svadmin/commit/b0a1fd72b20e6a1d92de445ee2a95fbbf182d218))
* **core:** restore live subscription callback typing and arrow function wrapper ([d11c986](https://github.com/zuohuadong/svadmin/commit/d11c986219df71d1846fe8583742045fd6411d67))

## [0.21.2](https://github.com/zuohuadong/svadmin/compare/core-v0.21.1...core-v0.21.2) (2026-04-11)


### 🐛 Bug Fixes

* **core,hasura:** add ssr guard for csv export, migrate hasura to async import ([722dd3d](https://github.com/zuohuadong/svadmin/commit/722dd3da5a92cacc2681221736463b79e6beea05))
* **core,ui:** ssr guards for router/theme, pin tanstack table alpha.10 ([d7025b9](https://github.com/zuohuadong/svadmin/commit/d7025b97842902cd6d171d0b60f60e1b8c687728))
* **core:** resolve clone mode routing, actual path templates, and nested redirect bugs ([5a2636f](https://github.com/zuohuadong/svadmin/commit/5a2636fe30adea28a3eb4cf04a46534c90930060))
* **core:** resolve custom primary keys, pessimistic mutation contexts, useParsed deps, and live sync ([323e8f4](https://github.com/zuohuadong/svadmin/commit/323e8f4b805cb8c35492823bc34ea12cddb89d77))
* **core:** resolve P2 lifecycle and routing bugs ([f9e3969](https://github.com/zuohuadong/svadmin/commit/f9e3969cb30b6ff94ef69a66ba19d939ef4998bb))
* **core:** resolve reactivity and routing issues across hooks, ui, and auth ([0311806](https://github.com/zuohuadong/svadmin/commit/03118069696e16452aa16d6c737ee303348ef1f4))
* **core:** restore Svelte 5 reactivity context for data hooks and live subscriptions ([d788148](https://github.com/zuohuadong/svadmin/commit/d7881486f35c3a5720db3338ceaa6ea94c3b158e))
* **lite:** resolve modal action binding, auth/delete redirects, and select components schemas ([f4da5cd](https://github.com/zuohuadong/svadmin/commit/f4da5cd9e5c81cf0c4673eb05777999b34632c4f))
* **ui:** resolve routing, formatLink, and optional auth provider bugs ([acf7344](https://github.com/zuohuadong/svadmin/commit/acf73447b4fdb3aa3ae19b31147cdd5f347a3fe3))
* **ui:** upgrade tanstack table to 9.0.0-alpha.32, fix autotable api compat ([8868f96](https://github.com/zuohuadong/svadmin/commit/8868f96762ec00f9ab40eec2e4600d389bc5c00a))

## [0.21.1](https://github.com/zuohuadong/svadmin/compare/core-v0.21.0...core-v0.21.1) (2026-04-10)


### 🐛 Bug Fixes

* **core:** complete clone routing, SSR hardening, refine-adapter safety ([e896f2a](https://github.com/zuohuadong/svadmin/commit/e896f2ae786dde01cb82dbb38ecbe2f4bc4830fa))
* **core:** resolve data provider regressions and type errors ([8728fcc](https://github.com/zuohuadong/svadmin/commit/8728fcc737cbf6ece7400de7282984e3f2dce9f0))
* **core:** resolve functional regressions in routing, forms, and live providers ([09e4f69](https://github.com/zuohuadong/svadmin/commit/09e4f69246ae96c1e4357391e2b53aaad8756902))
* **core:** resolve regressions across SSR auth, mutation hooks, lite components and editor types ([5b716e2](https://github.com/zuohuadong/svadmin/commit/5b716e22dd1f0664b3a884b8d74a583590467065))
* **core:** resolve routing, auth SSR, live events and clone logic regressions from audit ([a025c8c](https://github.com/zuohuadong/svadmin/commit/a025c8c66847dd7fae5fa9ce5bfe81d7a8550dc4))
* **ui,supabase:** clone route support, SSR localStorage guards, missing i18n key ([e1e96ad](https://github.com/zuohuadong/svadmin/commit/e1e96ad991ae1bb545aade3033b9776ae8805347))

## [0.21.0](https://github.com/zuohuadong/svadmin/compare/core-v0.20.4...core-v0.21.0) (2026-04-09)


### ⚠ BREAKING CHANGES

* **core:** useList, useOne, useShow, useMany now return the Tanstack Query result directly instead of wrapping it in { query, overtime }.

### 🚀 Features

* **core:** flatten query hook return values ([#107](https://github.com/zuohuadong/svadmin/issues/107)) ([6082bd1](https://github.com/zuohuadong/svadmin/commit/6082bd1c6290701219b2b5eaf72f4b52845cd258))

## [0.20.4](https://github.com/zuohuadong/svadmin/compare/core-v0.20.3...core-v0.20.4) (2026-04-09)


### 🐛 Bug Fixes

* **quality:** address build warnings and test noise ([19a7637](https://github.com/zuohuadong/svadmin/commit/19a7637a6cd09bc660d71d058ca275124271254f))

## [0.20.3](https://github.com/zuohuadong/svadmin/compare/core-v0.20.2...core-v0.20.3) (2026-04-09)


### 🐛 Bug Fixes

* **core:** add bun types to tsconfig.json to resolve test compilation errors ([ce6fb1e](https://github.com/zuohuadong/svadmin/commit/ce6fb1e5f0de00d844513f0d68c37ba81b2149d1))

## [0.20.2](https://github.com/zuohuadong/svadmin/compare/core-v0.20.1...core-v0.20.2) (2026-04-08)


### 🐛 Bug Fixes

* **build:** resolve vite 8 rolldown and svelte-table compatibility ([#100](https://github.com/zuohuadong/svadmin/issues/100)) ([e6d26f3](https://github.com/zuohuadong/svadmin/commit/e6d26f300312684b3831c9f7b61f4886f8dae955))

## [0.20.1](https://github.com/zuohuadong/svadmin/compare/core-v0.20.0...core-v0.20.1) (2026-04-07)


### 🐛 Bug Fixes

* **core,ui:** connect color theme switching to CSS variable overrides ([4a62936](https://github.com/zuohuadong/svadmin/commit/4a62936be2d2ab9b17d8ebb1b945cc8238d9d4f7))

## [0.20.0](https://github.com/zuohuadong/svadmin/compare/core-v0.19.5...core-v0.20.0) (2026-04-06)


### 🚀 Features

* **ui:** add siteUrl prop to optionally render a Go To Site button in the header ([#97](https://github.com/zuohuadong/svadmin/issues/97)) ([abf5de0](https://github.com/zuohuadong/svadmin/commit/abf5de07d581b1b59a8deab4e01657591dc10025))

## [0.19.5](https://github.com/zuohuadong/svadmin/compare/core-v0.19.4...core-v0.19.5) (2026-04-05)


### 🐛 Bug Fixes

* **i18n:** add missing common.noDataHint translation keys ([#91](https://github.com/zuohuadong/svadmin/issues/91)) ([7842107](https://github.com/zuohuadong/svadmin/commit/78421072c182f3076f2cf71078fc82ad0c21509b))

## [0.19.4](https://github.com/zuohuadong/svadmin/compare/core-v0.19.3...core-v0.19.4) (2026-04-03)


### 🐛 Bug Fixes

* **ui:** fix unclosed string literal in ConfigErrorScreen ternary ([#85](https://github.com/zuohuadong/svadmin/issues/85)) ([cee2db1](https://github.com/zuohuadong/svadmin/commit/cee2db17c87b314f8cbf7f1822b63bb57645f87d))

## [0.19.3](https://github.com/zuohuadong/svadmin/compare/core-v0.19.2...core-v0.19.3) (2026-03-31)


### 💅 Elegance & Refactoring

* **core:** decouple sonner-svelte from core to make it truly headless ([e9ea226](https://github.com/zuohuadong/svadmin/commit/e9ea226cd1765fe3d43a0d53705a14ec27e5be44))
* **core:** make core fully headless by decoupling sonner-svelte ([6f6c561](https://github.com/zuohuadong/svadmin/commit/6f6c5618597df5fcb8257f3bd09ba813710bce6c))
* **nestjsx-crud:** remove unused query-string dependency ([e9ea226](https://github.com/zuohuadong/svadmin/commit/e9ea226cd1765fe3d43a0d53705a14ec27e5be44))

## [0.19.2](https://github.com/zuohuadong/svadmin/compare/core-v0.19.1...core-v0.19.2) (2026-03-30)


### 💅 Elegance & Refactoring

* **core:** architectural refinements (notify, auth hooks, SSR, protective guards) ([f2e9333](https://github.com/zuohuadong/svadmin/commit/f2e93333826ab585ec1d72a2fe4d3cd8f524514f))
* **core:** architectural refinements (notify, auth hooks, SSR, protective guards) ([59a8ad1](https://github.com/zuohuadong/svadmin/commit/59a8ad1e6051cf1fea2fa816878c2ce0bd997790))

## [0.19.1](https://github.com/zuohuadong/svadmin/compare/core-v0.19.0...core-v0.19.1) (2026-03-30)


### Bug Fixes

* **core:** quality refinements — error handling, memory leaks, Svelte 5 compat ([01013db](https://github.com/zuohuadong/svadmin/commit/01013dbd3741d1e3abc11e6158e5358694ff8269))
* **core:** quality refinements — error handling, memory leaks, Svelte 5 compat ([a92829a](https://github.com/zuohuadong/svadmin/commit/a92829aa34910f4df2b850bc33c076e9f1ceb66c))

## [0.19.0](https://github.com/zuohuadong/svadmin/compare/core-v0.18.1...core-v0.19.0) (2026-03-30)


### ⚠ BREAKING CHANGES

* **core:** useTranslation now returns { t, locale, setLocale, getAvailableLocales } instead of { translate, getLocale, changeLocale }. The locale is a reactive property instead of a getter function.

### Features

* **core:** enterprise improvements for i18n and routing ([9388aa9](https://github.com/zuohuadong/svadmin/commit/9388aa92b687287f27280cff20345339107af28e))


### Code Refactoring

* **core:** adopt elegant useTranslation API ([ae97678](https://github.com/zuohuadong/svadmin/commit/ae976780076f695f013d53136fd496b7cc9a20bb))

## [0.18.1](https://github.com/zuohuadong/svadmin/compare/core-v0.18.0...core-v0.18.1) (2026-03-30)


### Bug Fixes

* **core:** sync casl and casbin adapters with AccessControlProvider CanParams update ([47dedac](https://github.com/zuohuadong/svadmin/commit/47dedac167b72bc0814367912c8709d93567363a))
* **core:** sync casl/casbin adapters with CanParams[] update ([ba2cee2](https://github.com/zuohuadong/svadmin/commit/ba2cee24882afe054582d5625321b8a5a868906f))

## [0.18.0](https://github.com/zuohuadong/svadmin/compare/core-v0.17.1...core-v0.18.0) (2026-03-30)


### ⚠ BREAKING CHANGES

* Deprecated legacy useHasPermission API. usePermissions now returns immediate .has() and .can() methods and drops .data envelope. AutoTable drops global cellRenderer prop in favor of columns definitions map. Sidebar now defaults to SvelteKit path routing instead of hash-based (#).

### Code Refactoring

* modernize enterprise architecture and resolve technical debt ([860ae60](https://github.com/zuohuadong/svadmin/commit/860ae607b1d3002e3318c51047d6219bc073050f))

## [0.17.1](https://github.com/zuohuadong/svadmin/compare/core-v0.17.0...core-v0.17.1) (2026-03-30)


### Bug Fixes

* **deps:** replace svelte-sonner with sonner-svelte to resolve Tailwind CSS v4 Vite plugin compile error ([98b330a](https://github.com/zuohuadong/svadmin/commit/98b330a8cea21bd81debd2a85b4923c5f3edf6cb))

## [0.17.0](https://github.com/zuohuadong/svadmin/compare/core-v0.16.0...core-v0.17.0) (2026-03-29)


### Features

* **core:** add AgentProvider with tool calling, approval gates, and generative UI events ([40f6952](https://github.com/zuohuadong/svadmin/commit/40f6952c9f04aecac0ea833bb0205f82cc4da30d))
* implement FieldRenderer component and initialize rich text editor package with modular toolbar and extension support ([3d99335](https://github.com/zuohuadong/svadmin/commit/3d993350c9a2b476d51bd49e9d83bcd664b6aad6))

## [0.16.0](https://github.com/zuohuadong/svadmin/compare/core-v0.15.0...core-v0.16.0) (2026-03-29)


### Features

* **ui:** add ArrayField for nested dynamic form groups ([0407757](https://github.com/zuohuadong/svadmin/commit/04077572b3d6a668df136d6a22375206735d775c))
* **ui:** add enterprise RBAC, audit logs, tenant switcher, task queue, and draggable grid ([449dfaf](https://github.com/zuohuadong/svadmin/commit/449dfaf73febe25a08073c4ea63f0d76f38a2f51))


### Bug Fixes

* **core:** migrate CanAccess and useCan logic to support Svelte 5 closures ([38d4f78](https://github.com/zuohuadong/svadmin/commit/38d4f785e2ca3d7dfc6b62445b29f230e74df284))

## [0.15.0](https://github.com/zuohuadong/svadmin/compare/core-v0.14.0...core-v0.15.0) (2026-03-29)


### Features

* **ui:** add Settings Hub with profile, appearance, and system info pages ([a1b284d](https://github.com/zuohuadong/svadmin/commit/a1b284d613ffe20234e05f2df7c052c9fd1fac00))

## [0.14.0](https://github.com/zuohuadong/svadmin/compare/core-v0.13.0...core-v0.14.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Features

* **core,sso:** add AccessControlProvider, CASL/Casbin adapters, and @svadmin/sso OIDC plugin ([271e135](https://github.com/zuohuadong/svadmin/commit/271e135aead8c32cea080e807912a51dec9fb48e))
* **core,ui,drizzle:** enterprise features sprint - useCan type fix, responsive table, field inference ([52c44b8](https://github.com/zuohuadong/svadmin/commit/52c44b84b363aad25ee866346fd6cb3208eb29d9))
* **core,ui,lite:** add multi-level menu support with MenuItem type and recursive SidebarItem ([25603ae](https://github.com/zuohuadong/svadmin/commit/25603ae08ee576beda973ee3acfa43ff92cc1cea))
* **core:** add useHasPermission() reactive Rune closure ([4911d3b](https://github.com/zuohuadong/svadmin/commit/4911d3be9421a4a80b948717c755ed18c2279c8f))
* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))
* **core:** support dark-first theme mode and custom CSS token ([8311787](https://github.com/zuohuadong/svadmin/commit/8311787b62df1252492780c7df2f7549b25c5964))
* **core:** support dark-first theme mode and custom CSS token override ([6526b58](https://github.com/zuohuadong/svadmin/commit/6526b58be3e61896101fa7faed6310f4a1bd3904))
* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** enhance ChatDialog with context-awareness, persistence, and action buttons ([26b40f0](https://github.com/zuohuadong/svadmin/commit/26b40f015aad5ebf7db356091fe1895db4ffac02))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* **core,ui:** resolve tanstack query v6 type errors and select element constraint ([30cc3ae](https://github.com/zuohuadong/svadmin/commit/30cc3ae3f2a6ebf2673465c87c5dcf74ad9e8cca))
* **core:** rename rune-using .ts files to .svelte.ts to fix runtime errors ([d007d75](https://github.com/zuohuadong/svadmin/commit/d007d75aa5ad3e1112efb568e269dba5311c2fbf))
* **core:** resolve strict ts constraints across all data providers and stabilize tests ([028a2a6](https://github.com/zuohuadong/svadmin/commit/028a2a6205a9bbe2afd2db558546fb862a4a8bac))
* **core:** update missing import paths in context.svelte.ts for live.svelte ([9b07010](https://github.com/zuohuadong/svadmin/commit/9b070108647210ded9ec94a18113d851137c913d))
* **core:** verify automatic release pipeline recovery ([8e67f4b](https://github.com/zuohuadong/svadmin/commit/8e67f4bec332b2a41483fade5a98c8299f9f9968))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
* resolve code standards violations and add engineering config ([91b2c8a](https://github.com/zuohuadong/svadmin/commit/91b2c8a0c92b61223187b8e78900444188386cbf))
* **ui:** adapt LoginPage to generic identifier and restore core index encoding ([ee849cf](https://github.com/zuohuadong/svadmin/commit/ee849cfceeaf0f1f5e0b8ae5a227628d9d8df1e5))
* **ui:** use [@theme](https://github.com/theme) instead of [@theme](https://github.com/theme) inline to preserve Tailwind defaults; add i18n keys ([052d436](https://github.com/zuohuadong/svadmin/commit/052d4368084c246ed92d06ebc8c945c4743ab0e1))


### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.13.0](https://github.com/zuohuadong/svadmin/compare/core-v0.12.0...core-v0.13.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **core:** trigger major release for removed deprecated APIs

### Code Refactoring

* **core:** trigger major release for removed deprecated APIs ([d84d348](https://github.com/zuohuadong/svadmin/commit/d84d34862d0151ac30b52dd4a9371f5f449a2e68))

## [0.12.0](https://github.com/zuohuadong/svadmin/compare/core-v0.11.0...core-v0.12.0) (2026-03-28)


### Features

* **core:** add useHasPermission() reactive Rune closure ([4911d3b](https://github.com/zuohuadong/svadmin/commit/4911d3be9421a4a80b948717c755ed18c2279c8f))

## [0.11.0](https://github.com/zuohuadong/svadmin/compare/core-v0.10.0...core-v0.11.0) (2026-03-27)


### Features

* **core,ui,lite:** add multi-level menu support with MenuItem type and recursive SidebarItem ([25603ae](https://github.com/zuohuadong/svadmin/commit/25603ae08ee576beda973ee3acfa43ff92cc1cea))

## [0.10.0](https://github.com/zuohuadong/svadmin/compare/core-v0.9.0...core-v0.10.0) (2026-03-27)


### Features

* **core:** implement native theme preset system ([031c7b5](https://github.com/zuohuadong/svadmin/commit/031c7b53c15813bd219dfb1a16fc5a5a144fb088))

## [0.9.0](https://github.com/zuohuadong/svadmin/compare/core-v0.8.0...core-v0.9.0) (2026-03-27)


### Features

* **core:** support dark-first theme mode and custom CSS token ([8311787](https://github.com/zuohuadong/svadmin/commit/8311787b62df1252492780c7df2f7549b25c5964))
* **core:** support dark-first theme mode and custom CSS token override ([6526b58](https://github.com/zuohuadong/svadmin/commit/6526b58be3e61896101fa7faed6310f4a1bd3904))

## [0.8.0](https://github.com/zuohuadong/svadmin/compare/core-v0.7.0...core-v0.8.0) (2026-03-27)


### Features

* **ui:** enhance ChatDialog with context-awareness, persistence, and action buttons ([26b40f0](https://github.com/zuohuadong/svadmin/commit/26b40f015aad5ebf7db356091fe1895db4ffac02))

## [0.7.0](https://github.com/zuohuadong/svadmin/compare/core-v0.6.1...core-v0.7.0) (2026-03-27)


### Features

* **core,ui,drizzle:** enterprise features sprint - useCan type fix, responsive table, field inference ([52c44b8](https://github.com/zuohuadong/svadmin/commit/52c44b84b363aad25ee866346fd6cb3208eb29d9))


### Bug Fixes

* **core,ui:** resolve tanstack query v6 type errors and select element constraint ([30cc3ae](https://github.com/zuohuadong/svadmin/commit/30cc3ae3f2a6ebf2673465c87c5dcf74ad9e8cca))

## [0.6.1](https://github.com/zuohuadong/svadmin/compare/core-v0.6.0...core-v0.6.1) (2026-03-27)


### Bug Fixes

* **core:** verify automatic release pipeline recovery ([8e67f4b](https://github.com/zuohuadong/svadmin/commit/8e67f4bec332b2a41483fade5a98c8299f9f9968))
* **ui:** adapt LoginPage to generic identifier and restore core index encoding ([ee849cf](https://github.com/zuohuadong/svadmin/commit/ee849cfceeaf0f1f5e0b8ae5a227628d9d8df1e5))

## [0.6.0](https://github.com/zuohuadong/svadmin/compare/core-v0.5.14...core-v0.6.0) (2026-03-26)


### Features

* **core,sso:** add AccessControlProvider, CASL/Casbin adapters, and @svadmin/sso OIDC plugin ([271e135](https://github.com/zuohuadong/svadmin/commit/271e135aead8c32cea080e807912a51dec9fb48e))
* svadmin — headless admin framework for Svelte 5 ([d67041a](https://github.com/zuohuadong/svadmin/commit/d67041a4b6aec77702b0490fe934d3207a88daac))
* **ui:** Sheet, Collapsible, 8 new components + 12 UI enhancements (v0.3.19-v0.3.22) ([58b0a57](https://github.com/zuohuadong/svadmin/commit/58b0a57e24f7caaa9cd5d445a4ada1b20edda261))


### Bug Fixes

* **core:** rename rune-using .ts files to .svelte.ts to fix runtime errors ([d007d75](https://github.com/zuohuadong/svadmin/commit/d007d75aa5ad3e1112efb568e269dba5311c2fbf))
* **core:** resolve strict ts constraints across all data providers and stabilize tests ([028a2a6](https://github.com/zuohuadong/svadmin/commit/028a2a6205a9bbe2afd2db558546fb862a4a8bac))
* **core:** update missing import paths in context.svelte.ts for live.svelte ([9b07010](https://github.com/zuohuadong/svadmin/commit/9b070108647210ded9ec94a18113d851137c913d))
* **packages:** add repository URLs to all package.json for npm provenance ([e84978c](https://github.com/zuohuadong/svadmin/commit/e84978cda2d616d37caf388d48adf5315dfe6f13))
* resolve code standards violations and add engineering config ([91b2c8a](https://github.com/zuohuadong/svadmin/commit/91b2c8a0c92b61223187b8e78900444188386cbf))
* **ui:** use [@theme](https://github.com/theme) instead of [@theme](https://github.com/theme) inline to preserve Tailwind defaults; add i18n keys ([052d436](https://github.com/zuohuadong/svadmin/commit/052d4368084c246ed92d06ebc8c945c4743ab0e1))
