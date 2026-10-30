# Component / Pro parity audit

Status date: 2026-10-30

This audit compares the current `@svadmin/ui` surface with:

- the reference React component catalog;
- the reference Pro React page catalog;
- the svadmin example template gallery and product pages.

The goal is migration compatibility and missing admin capability, not pixel
copying. The default visual style is already represented by the `default` color
preset and the `clean-flat` layout preset.

Legend: ✅ direct capability · 🔁 compatibility alias · ⚠️ partial or different
API shape · ❌ missing · ➖ internal / not a public contract.

## Component matrix

Current snapshot: **55 direct**, **13 alias**, **1 partial**, **0 missing**,
**2 internal** across 71 reference React components.

| Reference | svadmin surface | Status | Notes |
| --- | --- | --- | --- |
| Affix | `Affix` | ✅ | |
| Alert | `Alert` namespace | ✅ | Compound primitives, closable state |
| Anchor | `Anchor` | ✅ | |
| AutoComplete | `AutoComplete` | ✅ | |
| Avatar | `Avatar` | ✅ | |
| BackTop | `BackTop` | ✅ | |
| Badge | `Badge` | ✅ | |
| Breadcrumb | `Breadcrumb` namespace, `Breadcrumbs` | ✅ | |
| Button | `Button` | ✅ | |
| Calendar | `Calendar` | ✅ | |
| Card | `Card` namespace | ✅ | |
| Carousel | `Carousel` | ✅ | |
| Cascader | `Cascader` | ✅ | |
| Checkbox | `Checkbox` | ✅ | |
| Collapse | `Collapse` | ✅ | aligned expansion behavior |
| ColorPicker | `ColorPicker` | ✅ | |
| Comment | `CommentThread`, alias `Comment` | 🔁 | |
| ConfigProvider | `ConfigProvider` | ✅ | Defaults for size, density, direction, locale |
| DatePicker | `DatePicker`, `DateRangePicker`, `DateTimePicker` | ✅ | |
| Descriptions | `DescriptionList`, alias `Descriptions` | 🔁 | |
| Divider | `Separator`, alias `Divider` | ✅ | |
| Drawer | `Sheet` namespace, alias `Drawer` | 🔁 | Namespace alias; compound API differs from the reference |
| Dropdown | `DropdownMenu` namespace, alias `Dropdown` | 🔁 | Namespace alias; compound API differs from the reference |
| Empty | `EmptyState`, `LiteEmptyState` | ✅ | Supports `image` / `imageUrl` and custom icon slot |
| Form | `AutoForm`, `JsonSchemaForm`, `StepForm` | ⚠️ | Schema-first, not `Form.Item` compound API |
| Grid | `Grid`, `GridCell`, `Row`, `Col` | ✅ | |
| Icon | `@lucide/svelte` | ✅ | Ecosystem icon package |
| Image | `Image`, `ImagePreview`, `MediaThumbnail` | ✅ | Fallback and preview states included |
| Input | `Input`, `Textarea`, `PasswordInput` | ✅ | |
| InputNumber | `NumberInput`, alias `InputNumber` | 🔁 | |
| InputTag | `TagsInput`, alias `InputTag` | 🔁 | |
| Layout | `Layout`, `AdminApp` | ✅ | |
| Link | `Link` | ✅ | |
| List | `ItemList`, alias `List` | 🔁 | |
| Mentions | `MentionsInput`, alias `Mentions` | 🔁 | |
| Menu | `Menu` | ✅ | Keyboard and nested menu behavior covered |
| Message | `toast`, `message`, `Message` | 🔁 | Global service, not a component tree |
| Modal | `Dialog` namespace, alias `Modal` | 🔁 | Namespace alias; compound API differs from the reference |
| Notification | `notification`, `Notification`, `NotificationHost` | ✅ | Service, host and four placements |
| PageHeader | `PageHeader`, `ContentPageHeader` | ✅ | |
| Pagination | `Pagination`, `ListPagination` | ✅ | |
| Popconfirm | `Popconfirm` | ✅ | |
| Popover | `Popover` namespace | ✅ | |
| Portal | internal portal primitives | ➖ | Not a user-facing contract |
| Progress | `Progress` | ✅ | |
| Radio | `RadioGroup`, alias `Radio` | 🔁 | |
| Rate | `Rate`, `RatingField` | ✅ | |
| ResizeBox | `ResizeBox` | ✅ | |
| Result | `Result`, template `ResultTemplate` | ✅ | Success and error statuses supported |
| Select | `Select`, `SelectField`, `MultiSelectField` | ✅ | |
| Skeleton | `Skeleton`, `PageSkeleton` | ✅ | |
| Slider | `Slider`, `RangeSlider` | ✅ | |
| Space | `Space` | ✅ | |
| Spin | `Spin` | ✅ | |
| Statistic | `Statistic`, `StatsCard`, `MetricBlock` | ✅ | |
| Steps | `Steps`, `WorkspaceStageStepper` | ✅ | |
| Switch | `Switch` | ✅ | |
| Table | `Table` namespace, `AutoTable`, `GroupedTable`, `TreeTable` | ✅ | |
| Tabs | `Tabs`, `EditableTabs`, `StatusTabs` | ✅ | |
| Tag | `Tag`, `LiteTag` | ✅ | Closable, checkable, disabled and compact states |
| Timeline | `Timeline`, `ActivityTimeline` | ✅ | |
| TimePicker | `TimePicker` | ✅ | |
| Tooltip | `Tooltip` namespace | ✅ | |
| Transfer | `Transfer` | ✅ | |
| Tree | `Tree` | ✅ | |
| TreeSelect | `TreeSelect` | ✅ | |
| Trigger | internal trigger primitives | ➖ | Not a user-facing contract |
| Typography | `Title`, `Text`, `TypographyEllipsis`, `TypographyText` | ✅ | |
| Upload | `FileUpload`, alias `Upload` | 🔁 | |
| VerificationCode | `OtpInput`, alias `VerificationCode` | 🔁 | |
| Watermark | `Watermark` | ✅ | |

## Pro page matrix

| Pro page | svadmin route / surface | Status | Notes |
| --- | --- | --- | --- |
| Login | `LoginPage`, `/#/login` | ✅ | |
| Dashboard / Workplace | `/templates/workplace` | ✅ | |
| Dashboard / Monitor | `/templates/monitor` | ✅ | |
| Visualization / Data analysis | `/templates/analysis` | ✅ | Revenue-analysis composition |
| Visualization / Multi-dimension analysis | `/templates/analysis-multi` | ✅ | `MultiDimensionAnalysisTemplate` with dimension switcher and insight rail |
| List / Search table | `/templates/search-table` | ✅ | |
| List / Card | `/templates/card-list` | ✅ | |
| Form / Group | `/templates/group-form` | ✅ | |
| Form / Step | `/templates/step-form` | ✅ | |
| Form / Advanced | `/templates/advanced-form` | ✅ | |
| Profile / Basic | `/templates/profile` | ✅ | Public-profile composition |
| Detail / Basic and advanced | `/templates/basic-detail`, `/templates/advanced-detail` | ✅ | |
| Result / Success | `/templates/result` | ✅ | |
| Result / Error | `/templates/result-error` | ✅ | Failure state with recovery actions |
| Exception / 403 | `/templates/exception` | ✅ | |
| Exception / 404 and 500 | `/templates/exception-404`, `/templates/exception-500` | ✅ | Dedicated routes and E2E coverage |
| User / Info | `/templates/user-info` | ✅ | Rich public-profile sections and activity |
| User / Setting | `/templates/user-settings` | ✅ | Profile, notification and security sections |

## Page composition depth

Route coverage is complete, but Pro pages are richer than a single table or
card grid. The templates now expose optional slots for those sections without
forcing one fixed mock layout.

| Pro page | Pro sections | svadmin slots | Remaining host-owned work |
| --- | --- | --- | --- |
| Workplace | Overview, popular contents, content percentage, shortcuts, carousel, announcement, docs | `metrics`, `primary`, `secondary`, `contentPercentage`, `media`, `shortcuts`, `announcements`, `docs` | Real content-percentage aggregation and carousel assets |
| Monitor | Chat panel, studio, data statistics, studio status, quick operations, studio information | `metrics`, `chart`, `chat`, `activity`, `status`, `quickOperations`, `information` | Live chat transport and telemetry come from the host |
| Search table | Search form, add/upload/download group, table, pagination | `filters`, `bulkActions`, `table`, `pagination`, `footer` | Column settings, export jobs and permission checks |
| Card list | Tabs, search, add card, card grid | `tabs`, `filters`, `addCard`, `items` | Tab-specific queries and add-card mutations |
| Basic detail | Approval steps, current/origin parameters, adjustment history | `steps`, `details`, `summary`, `comparison`, `history` | Parameter diff source and audit writes |
| User settings | Basic info, security, verified identity | `UserSettingsTemplate` with `basic`, `security`, `verification` tabs | Identity-verification provider and document upload |
| User info | Header, projects, news, team | `UserInfoTemplate` with `header`, `projects`, `news`, `team` | News feed and social graph provider |

## Refine alignment

svadmin follows Refine's split rather than emulating every reference component API:
core owns hooks and provider contracts, while UI components and page
compositions stay in the UI layer.

- `@svadmin/refine-adapter` bridges Refine data, auth, access control,
  notification, live, router and i18n providers.
- Table depth stays split across first-party components instead of one mega
  table API.
- Upload storage, DatePicker timezone rules, Modal/Drawer composition and form
  validation stay with the host or UI layer.
- Trigger/Portal remain internal, matching Refine's UI-kit boundary.

## Remaining API-depth candidates

These are behavior or API-shape differences, not missing page families. They are
tracked separately so the route/component coverage remains honest.

| Area | Reference behavior | Current svadmin surface | Next action |
| --- | --- | --- | --- |
| Table | Selection, expandable rows, tree data and virtualization in one table API | Split across `AutoTable`, `TreeTable`, `VirtualTable`, `GroupedTable` | Keep the split; add composition examples instead of a mega-table |
| Upload | Drag/drop, directory upload, custom request | `FileUpload` has drag/drop, progress, cancel and retry | Directory upload remains host-owned |
| Select | Remote search and virtualized option list | Native `Select` plus `ComboboxField` with remote search/virtualization | Prefer `ComboboxField` for large remote lists |
| ConfigProvider | Component size/density cascades broadly | `Button`, `Input`, `Select`, `Badge`, `Tag` consume it | Extend size contracts only where a component already has a size prop |
| DatePicker | Timezone, recurrence and business calendars | Date/range/time pickers without timezone ownership | Keep timezone and recurrence in the host domain layer |
| Modal / Drawer / Dropdown | Compound call shape | Namespace aliases to `Dialog`, `Sheet`, `DropdownMenu` | Do not fake the reference compound API |
| Form | `Form.Item` compound validation | Schema-first `AutoForm` / `JsonSchemaForm` | Non-goal: keep one validation owner |
| Portal / Trigger | Public primitives | Internal portal/trigger seams | Non-goal: do not expose implementation details |

## Completed in this round

- Added the generic `Tag` / `LiteTag` primitive with closable, checkable,
  disabled and compact states.
- Added `EmptyState.image` / `imageAlt` and `LiteEmptyState.imageUrl`.
- Added namespace aliases `Modal`, `Drawer` and `Dropdown`.
- Added `/templates/analysis-multi`, `/templates/user-info`,
  `/templates/user-settings`, `/templates/result-error`,
  `/templates/exception-404` and `/templates/exception-500`.
- Added `MultiDimensionAnalysisTemplate` and covered all new routes in E2E.
- Added optional Pro page-depth slots to `WorkplaceTemplate`,
  `MonitorTemplate`, `SearchTableTemplate`, `CardListTemplate` and
  `BasicDetailTemplate`, with gallery demos and E2E assertions.
- Added `UserInfoTemplate` and `UserSettingsTemplate` for the Pro user
  center and tabbed settings compositions.
- Added `contentPercentage`, `chat` and `comparison` slots plus their gallery
  demos and E2E checks.
- Added `Alert` closable state and `Notification` top/bottom-left/right
  placement support.
- Added Refine router and i18n provider adapters, completing the Refine-style
  provider bridge without moving UI depth into core.

## Remaining non-goals

### P2 — not recommended

1. **`Form.Item` compound parity.** svadmin intentionally uses schema-first
   forms; adding a parallel compound API would fragment validation ownership.
2. **`Trigger` / `Portal` public parity.** These are internal implementation
   seams in bits-ui and should stay out of the public contract.

## What changed in this round

Added compatible aliases: `Comment`, `InputTag`, `List`, `Message`,
`Notification`, `Radio`, `Split`, `VerificationCode`, plus namespace aliases
`Modal`, `Drawer` and `Dropdown`. Existing aliases `Descriptions`, `InputNumber`,
`Mentions`, `message` and `Upload` remain.

The alias identities are covered by `packages/ui/src/public-alias-exports.test.ts`.
