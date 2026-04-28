# Template DNA: `base_template_layer`

## 1. Goal
Зафиксировать архитектурные и runtime-контракты, которые должны сохраниться при любом редизайне UI.

## 2. Layer Architecture
- Root config: `nuxt.config.ts` только включает devtools и подключает слои.
- Data layer: `layers/base/**`.
- UI layer: `layers/ui/**`.

Распределение ответственности:
- `layers/base`: runtime config, server API proxy, middleware, data normalization, media/head utils, i18n/query plugins.
- `layers/ui`: layout shell, pages, visual components, tokens and styling.

Anti-corruption rule:
- UI не ходит напрямую во внешний backend; UI работает через `$axios` на `/api/*` и composables из base.
- Бизнес-логика data/SEO/SSR не переносится в `layers/ui`.

## 3. Runtime Contract
Источники:
- `layers/base/nuxt.config.ts`
- `layers/base/server/utils/site-runtime.ts`
- `layers/ui/nuxt.config.ts`

Обязательные ENV:
- `SITE_ID` -> `runtimeConfig.public.siteId` / `runtimeConfig.server.siteId`
- `BACKEND_URL` -> `runtimeConfig.*.backHost` + proxy endpoints

Опциональные ENV:
- `MEDIA_STORAGE_URL`, `SITE_URL`, `SITE_NAME`, `NUXT_HMR_PORT`, `SLUG`.

Критичные runtime допущения:
- При отсутствии `SITE_ID` или `BACKEND_URL/BACK_HOST` сервер бросает 500 в `resolveSiteRuntime`.
- SSR включен, route rule `/**` использует ISR (`7200`).
- Dev/HMR порт управляется через `NUXT_HMR_PORT` (по умолчанию `24679`).

## 4. Data Layer Contract
### 4.1 API proxy contract
- `GET /api/pages` -> backend `${BACKEND_URL}/pages/:siteId`
- `GET /api/pages/:slug` -> backend `${BACKEND_URL}/pages/:siteId?slug=...`
- `GET /api/nav` -> backend `${BACKEND_URL}/pages/nav?siteId=...`

Файлы:
- `layers/base/server/api/pages/index.ts`
- `layers/base/server/api/pages/[...slug].ts`
- `layers/base/server/api/nav.ts`

### 4.2 Page normalization contract (`usePageData`)
`usePageData(siteId, slug)` нормализует и гарантирует совместимость:
- Page keys: `type`, `slug`, `fullSlug`, `canonicalSlug`, `localePrefix`, `hero`, `offers`, `logo`, `head`.
- Article keys: `article.H1`, `article.intro`, `article.blocks[]`.
- Block keys: `_id`, `H2`, `imageUrl[]`, `faqs[]|null`, `reviews[]|null`.

Файл:
- `layers/base/composables/usePageData.ts`

### 4.3 Shared state keys
Используются в разных UI компонентах и не должны быть переименованы:
- `siteLogo`
- `siteLangPrefix`
- `currentOfferId`
- `currentOfferData`
- `currentHeaderOfferData`
- `currentFooterOfferData`
- `isBot`

## 5. UI Structural Contract
### 5.1 Routing
- `layers/ui/pages/index.vue` делегирует рендер в `layers/ui/pages/[...slug].vue`.
- Catch-all slug поведение должно сохраниться.

### 5.2 Layout shell
- `layers/ui/app.vue` -> `<NuxtLayout><NuxtPage/></NuxtLayout>` + optional analytics.
- `layers/ui/layouts/default.vue` загружает `/nav`, рендерит `Header`, `slot`, `Footer`.

### 5.3 Required render order (`Main`)
В `layers/ui/components/Main/index.vue` должен сохраняться порядок:
1. hero offer ИЛИ hero media
2. gallery offers (`placement === 'gallery'`)
3. main H1/intro
4. table of contents
5. block sections по `type`
6. author block

### 5.4 Block type mapping
- `intro` -> `sections/Intro.vue`
- `h2`, `section` -> `sections/Heading.vue`
- `review` -> `sections/Review.vue`
- `product_review` -> `sections/ProductReview.vue`
- `faq` -> `sections/Faq.vue`
- fallback -> `sections/Default.vue`

## 6. SEO and SSR Contract
Non-negotiable pipeline в `layers/ui/pages/[...slug].vue`:
- canonical + alternates (`hreflang`, `x-default`)
- robots/meta/OG/Twitter
- Schema.org nodes (WebSite, Organization, WebPage, Article, BreadcrumbList, FAQPage, Review, AggregateRating, Person)
- head/body custom code blocks (`headCodeBlocks`, `bodyCodeBlocks`)
- SSR redirect по `data.redirect.to`

Редизайн не должен менять этот pipeline и его источники данных.

## 7. Visual DNA Baseline (Pre-Redesign Snapshot)
Снято по исходным файлам до редизайна:
- Tokens: `layers/ui/assets/scss/variables/_variables.scss`
- Global type/spacing: `layers/ui/assets/scss/main.scss`
- Shell/components: `layers/ui/components/{Header,Main,Footer}/**`

База до редизайна:
- Dark card UI (`--background-01`, `--background-02`, `--border`)
- Accent CTA palette (`--color-01`, `--color-02`, `--color-03`)
- Fonts: body `Inter`, display `Oswald`
- Rounded cards `~0.625rem`, container width `80%`, mobile breakpoint `541px`

## 8. Allowed Redesign Surface
Можно менять:
- UI tokens, typography, spacing rhythm, component geometry.
- Header/Footer/Main/section visuals and motion.
- CTA appearance and visual hierarchy.

Нельзя менять без отдельного согласования:
- API endpoints and backend mapping in `layers/base`.
- Data normalization shape in `usePageData`.
- Catch-all routing behavior.
- SEO/SSR/head/schema pipeline.
- Offers placements semantics (`hero`, `header`, `footer`, `gallery`).

## 9. Non-Negotiables
- `layers/base` сохраняет ownership backend/runtime/data.
- UI остаётся совместим с текущим `data` payload.
- No regression для SSR redirects и metadata injection.
- Offers CTA blocks остаются на прежних placement контрактах.

## 10. Definition of Done
- Контракты из разделов 3-6 сохранены.
- Редизайн реализован в `layers/ui` и визуально консистентен.
- Desktop/mobile рендер читаемый и стабильный.
- `npm run dev` стартует без новых import/runtime ошибок.
