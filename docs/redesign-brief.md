# Redesign Brief: Grey Eagle Online Casino (Canada)

## 1. Run Context
- Theme input: `Grey Eagle Online Casino in Canada`
- Execution mode: full-cycle redesign (docs + real UI implementation)
- Scope: `layers/ui/**` + `docs/**`
- Immutable scope: `layers/base/**` and SEO/SSR contracts in `layers/ui/pages/[...slug].vue`

## 2. Assumptions
- Tone: premium + trust-first conversion (not flashy/neon).
- Audience: Canada-focused users who compare offers and read long-form reviews before registration.
- Language/region: EN-first visual tone with neutral internationalizable UI copy.
- No new dependencies: existing Nuxt/Tailwind/SCSS stack only.

## 3. Design Direction
### Color strategy
- Primary background: deep graphite/night (`charcoal`).
- Surface hierarchy: layered steel-gray cards for readability.
- Accent hierarchy:
  - Gold accent for premium highlights and micro-labels.
  - Crimson CTA for primary conversion actions.
  - Cool cyan secondary accent for info and navigation emphasis.

### Typography strategy
- Display/headlines: high-contrast serif with casino/editorial character.
- Body: highly readable sans-serif for long-form article blocks.
- Keep strong visual distinction between display and body roles.

### Layout rhythm and component language
- Wide desktop shell with controlled max width and better breathing room.
- Frosted/glass-like header and elevated content cards.
- Unified rounded geometry and stronger border gradients.
- Better scanning hierarchy: Hero -> offer gallery -> H1/intro -> TOC -> sections.

### CTA and conversion hierarchy
- Primary CTA: high-contrast crimson button with subtle lift on hover.
- Secondary CTA: muted steel variant for low-priority actions.
- Offer cards preserve placements (`hero`, `header`, `footer`, `gallery`) with upgraded visuals only.

### Motion constraints
- Low-amplitude transitions only (opacity/transform/shadow), no aggressive animation loops.
- Skeleton/loader and interactive states remain lightweight for content-first UX.

## 4. Contract Preservation Rules
Must remain intact:
- `usePageData` normalized payload consumption.
- Catch-all route flow (`pages/index.vue` -> `pages/[...slug].vue`).
- SEO/head/schema/SSR redirect pipeline in `pages/[...slug].vue`.
- Shared state keys for logo/lang and offers.
- Offers placements and data-shape compatibility.

## 5. Implementation Targets
Primary files:
- `layers/ui/assets/scss/variables/_variables.scss`
- `layers/ui/assets/scss/main.scss`
- `layers/ui/nuxt.config.ts`
- `layers/ui/layouts/default.vue`
- `layers/ui/components/Header/index.vue`
- `layers/ui/components/Main/index.vue`
- `layers/ui/components/Footer/index.vue`

Extended visual alignment files:
- `layers/ui/components/Main/{Title,TableOfContent,Author}.vue`
- `layers/ui/components/Main/sections/{Heading,Default,Review,Faq,ProductReview,Intro}.vue`
- `layers/ui/components/ads/{Hero,HeroOfferList,HeaderCta,FooterCta}.vue`
- `layers/ui/components/General/{Button,ButtonTwo,ButtonThree}.vue`

## 6. Acceptance Criteria
- Theme clearly reads as “Grey Eagle / Canada-premium casino review” without breaking readability.
- Desktop and mobile remain coherent (including `<=541px`).
- No backend/data logic moved into UI.
- All monetization placements still render from current data contracts.
- `npm run dev` starts without new runtime/import errors.

## 7. Verification Checklist (for this run)
- [x] Base-layer ownership preserved.
- [x] Routing and layout shell still intact.
- [x] SEO/SSR catch-all logic untouched.
- [x] Offers: hero/header/footer/gallery compatibility confirmed.
- [x] Long-form content (tables/lists/FAQ/reviews) remains readable.
- [x] Runtime startup smoke-check completed.
