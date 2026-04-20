# Changelog

All notable changes to this project will be documented in this file.

## 2025-09-13

### Added
- Composable `useOffer` to fetch offer data via `@tanstack/vue-query` (`composables/useOffer.ts`).
- Global state `currentOfferId` derived from page data in `usePageData` to share offer context across components (`composables/usePageData.ts`).
- Client plugin to filter noisy dev warnings (e.g., Vue Suspense experimental notice) (`plugins/filter-warnings.client.ts`).
- Head HTML block support: parsing of custom head blocks of type `html` into `meta`, `link`, `script`, `style`, and `noscript` and merging into `useHead`:
  - `pages/index.vue`
  - `pages/[...slug].vue`

### Changed
- Header buttons now use the offer link when available and render as non-link buttons when no offer:
  - `components/Header/index.vue` passes `offerId` to buttons instead of a static link.
  - `components/General/Button.vue` and `components/General/ButtonTwo.vue` resolve the link themselves via `useOffer` and fall back to rendering a `<button>` when no link is present. Explicit `data.link` takes precedence over `offer.link`.
- `components/Main/Hero.client.vue` refactored to use `useOffer` composable for offer data instead of inline fetching.

### Fixed
- Removed TypeScript generics in JS SFCs causing "string is not defined" in `useState`:
  - `components/General/Button.vue`
  - `components/General/ButtonTwo.vue`
- Quieter and safer error handling for page fetches; treat 404 as expected and avoid logging non-POJO errors (`composables/usePageData.ts`).
- Avoid sending `slug=undefined` to backend and improved proxy handler (`server/api/pages/page-by-slug.ts`).
- Web manifest warning by setting `description` to an empty string instead of `null` (`public/manifest.webmanifest`).

