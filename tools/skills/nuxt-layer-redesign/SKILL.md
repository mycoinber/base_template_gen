---
name: nuxt-layer-redesign
description: Execute end-to-end redesign for Nuxt layer-based projects from a theme input. Use when a project with `layers/base` and `layers/ui` needs Template DNA capture, prompt artifacts, and real UI redesign changes that preserve data contracts, SSR, routing, and SEO behavior.
---

# Nuxt Layer Redesign

## Overview
Use this skill when the user provides a site theme and expects full execution: capture contracts, generate redesign artifacts, implement UI redesign, and validate compatibility.

## Theme-first input
Accept minimal input:
- `theme` (required), for example: sportsbook, crypto-casino, health blog, legal services.

Accept optional input:
- `tone` (premium, aggressive, editorial, playful)
- `target audience`
- `region/language focus`
- `constraints` (keep brand colors, keep component X, no new deps)

If optional data is missing, make reasonable assumptions and proceed. Do not block on questions unless a missing value creates high risk of breaking contracts.

## Execution workflow

### 1. Map layer boundaries
Inspect and list responsibilities per layer.

Collect at minimum:
- Root `nuxt.config.*`
- `layers/base/nuxt.config.*`
- `layers/ui/nuxt.config.*`
- Base server routes, API handlers, middleware, composables
- UI pages, layouts, app shell, core content components

Use fast discovery commands:
- `rg --files layers`
- `rg -n "usePageData|useHead|useSchemaOrg|routeRules|runtimeConfig|offers|localePrefix" layers`

### 2. Extract immutable contracts
Document contracts that redesign must not break.

Always capture:
- Runtime ENV contract (`SITE_ID`, backend URL, media URL, site URL/name, dev ports)
- API proxy contract and backend mapping
- Data normalization contract (required page/article/block fields)
- Shared state keys consumed across components
- Routing contract (`index` delegating to catch-all, slug behavior)
- SEO/head/schema pipeline (canonical, alternates, robots, OG/Twitter, JSON-LD, custom code blocks)
- SSR redirect behavior

### 3. Build theme design brief
Translate `theme` input into a concrete visual brief:
- color strategy (primary/secondary/surface/border/accent)
- typography strategy (display/body roles)
- layout rhythm and card/button language
- CTA tone and conversion hierarchy
- motion and visual effects constraints

Keep this brief compatible with existing content density and long-form readability.

### 4. Extract baseline visual DNA
Summarize current visual base so redesign preserves UX stability where needed.

Record:
- Token palette and typography tokens
- Core spacing scale and shape language (container widths, radius, border style)
- Component hierarchy and render order on page
- Desktop/mobile breakpoint behavior and key responsive patterns

### 5. Produce redesign artifacts
Create project docs in `docs/`.

Required outputs:
- `docs/template-dna.md`
- `docs/redesign-prompt-template.md`
- `docs/redesign-brief.md` (theme-specific brief for current run)

Use outlines from:
- `references/template-dna-outline.md`
- `references/redesign-prompt-outline.md`
- `references/theme-to-redesign-runbook.md`

### 6. Implement redesign in UI layer
Apply real redesign changes in `layers/ui`:
- update style tokens and global styles
- update key layout/components (`app`, `layouts`, `Header`, `Main`, `Footer`, sections) based on theme brief
- keep data bindings and props contract untouched
- avoid moving backend/data logic into UI

Default scope: redesign shared shell + primary content path. Expand only if requested.

### 7. Gate redesign changes
Before approving redesign output, verify:
- Data contract compatibility
- No base-layer logic moved into UI
- SEO/SSR contracts preserved
- Offers placement compatibility (`hero`, `header`, `footer`, `gallery`)
- Desktop/mobile rendering integrity
- `nuxi dev` starts without new runtime/import errors

Use `references/verification-checklist.md` as final gate.

## Output rules
Keep docs concrete and file-linked.

Do:
- Cite real file paths and key functions/components
- Separate non-negotiables from redesign freedom
- Include acceptance criteria and verification checklist
- Include explicit assumptions derived from theme input
- Report files changed for docs and for UI implementation separately

Do not:
- Describe architecture abstractly without mapping to repository files
- Permit redesign steps that alter backend contracts by default
- Duplicate long code snippets when a contract summary is enough
