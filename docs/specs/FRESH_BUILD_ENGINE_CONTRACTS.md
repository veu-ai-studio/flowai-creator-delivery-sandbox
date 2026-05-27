# Fresh Build Engine Interface Contracts

Status: Phase 3A local validation
Feature flag: `FLOWAI_ENABLE_FRESH_BUILD=false`
Scope: Contracts for local module outputs only. No production run, repo write, preview deploy, or claim promotion is implied by this document.

## Module Sequence

Fresh Build Engine Phase 3A is composed of three standalone modules:

1. Feature Extractor
   - Module: `src/lib/freshBuild/featureExtractor.js`
   - Export: `extractFeatures(url, options)`
   - Consumes: live product URL plus optional injected crawler/Browserless test doubles
   - Produces: `FeatureInventory`

2. Design Synthesizer
   - Module: `src/lib/freshBuild/designSynthesizer.js`
   - Export: `synthesizeDesign(url, options)`
   - Consumes: live product URL and optional `FeatureInventory`
   - Produces: `DesignSpec`

3. Codebase Generator
   - Module: `src/lib/freshBuild/codebaseGenerator.js`
   - Export: `generateCodebase(featureInventory, designSpec, options)`
   - Consumes: `FeatureInventory`, `DesignSpec`, and operator options
   - Produces: `GeneratedCodebase`

All modules are product-agnostic. Unknown values must be explicit `UNKNOWN`. Auth-gated page content must be explicit `AUTH_REQUIRED`. Fresh Build remains disabled unless Victor explicitly enables the feature flag in a later phase.

## FeatureInventory Schema

Validator: `validateFeatureInventory(inventory)`

Required top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | Submitted product URL. |
| `pages` | FeaturePage[] | yes | Discovered pages, including auth-gated placeholders where applicable. |
| `components` | FeatureComponent[] | yes | Distinct UI components identified across pages. |
| `userFlows` | FeatureUserFlow[] | yes | User journeys inferred from navigation, forms, and interactions. |
| `content` | object | yes | Text, images, CTAs, tone/style summary. |
| `businessRules` | object | yes | Access, pricing, validation, endpoint, and entity observations. |
| `metadata` | object | yes | Extraction metadata and summary counts. |

### FeaturePage

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | Page URL or `UNKNOWN`. |
| `title` | string | yes | Page title or `UNKNOWN`. |
| `purpose` | string | yes | Inferred page purpose or `UNKNOWN` / `AUTH_REQUIRED`. |
| `primaryContent` | string | yes | Primary content summary or `UNKNOWN` / `AUTH_REQUIRED`. |
| `navigation` | `{ label, target, confidence }[]` | yes | Links found on the page. |
| `hierarchy` | `{ parent, children, confidence }` | yes | Parent/child relationship. |
| `access` | `PUBLIC \| AUTH_REQUIRED \| UNKNOWN` | yes | Page access classification. |
| `confidence` | number | yes | `0..1`. |

### FeatureComponent

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable component id. |
| `type` | string | yes | `nav`, `hero`, `card`, `form`, `modal`, `table`, `list`, `button`, `footer`, etc. |
| `content` | string | yes | Component text/content summary or `UNKNOWN`. |
| `purpose` | string | yes | Component purpose or `UNKNOWN`. |
| `pages` | string[] | yes | Page URLs where component appears. |
| `interactive` | boolean \| `UNKNOWN` | yes | Whether component is interactive. |
| `confidence` | number | yes | `0..1`. |

### FeatureUserFlow

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Stable flow id. |
| `name` | string | yes | Flow name such as sign up, login, search, checkout, submit, or `UNKNOWN`. |
| `steps` | `{ label, url, confidence }[]` | yes | Ordered flow steps. |
| `entryPoint` | string | yes | Flow entry URL or `UNKNOWN`. |
| `exitPoint` | string | yes | Flow exit URL or `UNKNOWN`. |
| `formFields` | `{ name, type, required, confidence }[]` | yes | Form fields involved in the flow. |
| `states` | `{ success, error, confidence }` | yes | Success/error states. |
| `confidence` | number | yes | `0..1`. |

### FeatureInventory Content

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `textByPage` | object | yes | Page URL keyed text summaries. |
| `imageReferences` | array | yes | `{ pageUrl, src, purpose, confidence }` observations. |
| `ctas` | array | yes | CTA links/buttons and targets. |
| `toneAndStyle` | object | yes | `{ summary, confidence }`. |
| `confidence` | number | yes | `0..1`. |

### FeatureInventory Business Rules

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `accessControl` | object | yes | `{ summary, confidence }`. |
| `pricing` | object | yes | `{ summary, confidence }`. |
| `validationRules` | array | yes | Form validation observations. |
| `apiEndpoints` | array | yes | Observed API endpoint references. |
| `dataEntities` | array | yes | Inferred entities; empty when unknown. |
| `confidence` | number | yes | `0..1`. |

### FeatureInventory Metadata

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | Must match top-level `url`. |
| `totalPagesDiscovered` | number | yes | Crawl discovery count. |
| `totalComponentsIdentified` | number | yes | Component count. |
| `totalUserFlowsMapped` | number | yes | User-flow count. |
| `crawlTimestamp` | ISO string | yes | Extraction timestamp. |
| `version` | string | yes | Fresh Build version. |
| `confidence` | number | yes | `0..1`. |
| `crawl` | object | optional | Crawl envelope summary when live crawl is used. |
| `browserless` | object | optional | Browserless status metadata. |

## DesignSpec Schema

Validator: `validateDesignSpec(spec)`

Required top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | URL analyzed. |
| `visualSystem` | object | yes | Color palette, borders, shadows. |
| `typography` | object | yes | Font families, sizes, weights, line heights, hierarchy. |
| `layout` | object | yes | Structure, content width, spacing, breakpoints, navigation. |
| `components` | array | yes | Component visual specs aligned to FeatureInventory components. |
| `uxPatterns` | object | yes | Loading, error, empty, feedback, validation patterns. |
| `technologySignals` | object | yes | CSS framework, component library, animation, icon signals. |
| `metadata` | object | yes | Extraction method, timestamp, version, crawl/browserless evidence. |

### DesignSpec Visual System

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `primaryColors` | `{ hex, usageContext, confidence }[]` | yes | Hex values or `UNKNOWN`. |
| `secondaryColors` | array | yes | Additional colors. |
| `accentColors` | array | yes | CTA/accent colors. |
| `backgroundColors` | array | yes | Background color observations. |
| `textColors` | array | yes | Text color observations. |
| `borders` | array | yes | Border colors/styles. |
| `shadows` | array | yes | Shadow tokens or `UNKNOWN`. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec Typography

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fontFamilies` | `{ role, family, confidence }[]` | yes | Font families observed. |
| `fontSizes` | `{ value, usageContext, confidence }[]` | yes | Rendered/CSS sizes observed. |
| `fontWeights` | `{ value, usageContext, confidence }[]` | yes | Weights observed. |
| `lineHeights` | `{ value, usageContext, confidence }[]` | yes | Line heights observed. |
| `hierarchy` | `{ tag, count, confidence }[]` | yes | h1-h6 usage pattern. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec Layout

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `pattern` | string | yes | `grid`, `flex`, `dashboard_or_sidebar`, `sectioned_single_page`, or `UNKNOWN`. |
| `maxContentWidth` | `{ value, confidence }` | yes | Max width value or `UNKNOWN`. |
| `spacingSystem` | array | yes | Padding/margin observations. |
| `breakpoints` | array | yes | Media query observations. |
| `responsiveBehavior` | string | yes | Summary or `UNKNOWN`. |
| `navigation` | object | yes | Navigation position/style signals. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec Component Visual Spec

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `componentId` | string | yes | Source FeatureComponent id. |
| `type` | string | yes | Source component type. |
| `pages` | string[] | yes | Pages where the component appears. |
| `visualStyle` | string | yes | Rounded/outlined/filled/etc. or `UNKNOWN`. |
| `sizeVariants` | string[] | yes | Observed variants or `UNKNOWN`. |
| `colorUsage` | array | yes | Colors assigned from visual system. |
| `interactiveStates` | object | yes | hover/active/disabled states. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec UX Patterns

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `loadingStates` | string[] | yes | Observed loading states or `UNKNOWN`. |
| `errorStates` | string[] | yes | Observed error states or `UNKNOWN`. |
| `emptyStates` | string[] | yes | Observed empty states or `UNKNOWN`. |
| `feedbackPatterns` | string[] | yes | Toast/modal/alert/etc. or `UNKNOWN`. |
| `formValidationStyle` | string | yes | Validation style or `UNKNOWN`. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec Technology Signals

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `cssFramework` | `{ name, confidence }` | yes | Tailwind/Bootstrap signal or `UNKNOWN`. |
| `componentLibrary` | `{ name, confidence }` | yes | Radix/shadcn/MUI/etc. or `UNKNOWN`. |
| `animationLibrary` | `{ name, confidence }` | yes | Animation library signal or `UNKNOWN`. |
| `iconLibrary` | `{ name, confidence }` | yes | Icon library signal or `UNKNOWN`. |
| `confidence` | number | yes | `0..1`. |

### DesignSpec Metadata

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string | yes | Must match top-level `url`. |
| `extractionMethod` | string | yes | Current value: `multiPageCrawler+BrowserlessAdapter`. |
| `timestamp` | ISO string | yes | Synthesis timestamp. |
| `version` | string | yes | Fresh Build version. |
| `confidence` | number | yes | `0..1`. |
| `crawl` | object | yes | Crawl envelope summary. |
| `browserless` | object | yes | Browserless status metadata. |

## GeneratedCodebase Schema

Validator: `validateGeneratedCodebase(codebase)`

Required top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | `READY \| BLOCKED` | yes | `BLOCKED` when a hard safety/cap condition stops generation. |
| `files` | `{ path, content }[]` | yes | Generated file objects. Empty for cap-blocked result. |
| `stack` | string | yes | Default: `react-vite-tailwind-vercel`. |
| `pageCount` | number | yes | Number of pages generated. |
| `componentCount` | number | yes | Number of components generated. |
| `flowCount` | number | yes | Number of flows represented. |
| `platformDependencies` | [] | yes | Must always be empty. |
| `generatedAt` | ISO string | yes | Generation timestamp. |
| `sourceInventoryId` | string | yes | FeatureInventory id, metadata id, URL, or `UNKNOWN`. |
| `sourceDesignId` | string | yes | DesignSpec id, metadata id, URL, or `UNKNOWN`. |
| `metadata` | object | yes | API-call cap, safety gates, version. |

### GeneratedCodebase File Object

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `path` | string | yes | Relative path only; no absolute paths or `..`. |
| `content` | string | yes | Non-empty file content. |

Generated files currently include:

- `package.json`
- `index.html`
- `src/main.jsx`
- `src/App.jsx`
- `src/index.css`
- `tailwind.config.js`
- `postcss.config.js`
- `vercel.json`
- `README.md`
- one `src/components/*.jsx` file per FeatureInventory component
- one `src/pages/*.jsx` file per FeatureInventory page

### GeneratedCodebase Metadata

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `apiCallsUsed` | number | yes | Default local generator uses `0`. |
| `apiCallCap` | number | yes | Default and hard cap: `200`. |
| `blocked` | boolean | only for BLOCKED | Present when cap is exceeded. |
| `safetyGates` | object | yes for READY | Gate booleans for validation. |
| `version` | string | yes | Fresh Build version. |

### Safety Gates

Every `READY` GeneratedCodebase must pass all gates before it is returned:

| Gate | Rule |
| --- | --- |
| Zero platform SDK imports | Reject generated content containing Base44, Wix, Webflow, Bubble, Squarespace, platform SDK, or SDK-client references. |
| Dependency allowlist | `package.json` may include only allowlisted standard npm dependencies used by the generated stack. |
| Secret scan | Reject API-key, token, password, OpenAI-like `sk-`, GitHub `ghp_`, and Slack token patterns. |
| Syntactic validation | Reject invalid paths, empty content, unbalanced braces/parens/brackets, and module syntax in non-JS files. |
| Platform dependency enforcement | `platformDependencies` must be `[]`. |
| API call cap | If `apiCallsUsed > apiCallCap`, return `status: BLOCKED`, `reason: API_CALL_CAP_EXCEEDED`, and no files. |

## Module Interfaces

### `extractFeatures(url, options)`

Consumes:

- `url`: public product URL string.
- `options.now`: optional timestamp override.
- `options.skipCrawl`: when true, returns scaffold with explicit unknown/auth placeholders.
- `options.crawlSiteImpl`: optional test double for deterministic crawler.
- `options.browserlessConnector`: optional test double for Browserless.
- crawl options: `maxPages`, `maxDepth`, `sameOriginOnly`, `respectRobotsTxt`, `onPage`, `crawlImpl`, `fetchRobotsImpl`, `signal`.

Produces:

- Promise resolving to `FeatureInventory`.

Failure behavior:

- Throws on empty URL.
- Throws if output fails `validateFeatureInventory`.

### `synthesizeDesign(url, options)`

Consumes:

- `url`: public product URL string.
- `options.featureInventory`: optional precomputed FeatureInventory.
- `options.now`: optional timestamp override.
- `options.crawlSiteImpl`: optional test double for deterministic crawler.
- `options.browserlessConnector`: optional test double for Browserless.
- crawl options: `maxPages`, `maxDepth`, `sameOriginOnly`, `respectRobotsTxt`, `onPage`, `crawlImpl`, `fetchRobotsImpl`, `signal`.

Produces:

- Promise resolving to `DesignSpec`.

Failure behavior:

- Throws on empty URL.
- Throws if supplied or derived FeatureInventory is invalid.
- Throws if output fails `validateDesignSpec`.

### `generateCodebase(featureInventory, designSpec, options)`

Consumes:

- `featureInventory`: validated FeatureInventory object.
- `designSpec`: validated DesignSpec object.
- `options.productName`: optional product name for package/README/title.
- `options.targetStack`: optional stack label; default is `react-vite-tailwind-vercel`.
- `options.now`: optional timestamp override.
- `options.apiCallsUsed`: optional count used for cap enforcement; default `0`.
- `options.apiCallCap`: optional cap override; default `200`.

Produces:

- `GeneratedCodebase` with `status: READY` and generated files when all gates pass.
- `GeneratedCodebase` with `status: BLOCKED`, `reason: API_CALL_CAP_EXCEEDED`, and `files: []` if the API cap is exceeded.

Failure behavior:

- Throws if FeatureInventory is invalid.
- Throws if DesignSpec is invalid.
- Throws if any generated file fails safety validation.

## Current Phase 3A Boundary

This contract confirms local module interfaces only. Phase 3A does not:

- enable `FLOWAI_ENABLE_FRESH_BUILD`
- write generated files to GitHub
- deploy preview URLs
- mutate original product repos
- promote any SSOT release-critical claim to VERIFIED
- run Fresh Build in production

Those actions are reserved for later authorized phases.
