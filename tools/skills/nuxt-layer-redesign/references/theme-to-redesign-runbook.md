# Theme-to-Redesign Runbook

Use this when user input is mainly thematic (for example, "sportsbook", "medtech", "travel blog") and expects implementation, not only analysis.

## 1) Convert theme into design decisions
Define:
- visual direction (bold/minimal/editorial/high-conversion)
- token updates (background/surface/text/border/accent)
- typography roles (display/body)
- CTA voice and density
- section emphasis (hero vs long-form content vs offers)

## 2) Map decisions to files
Typical write scope:
- `layers/ui/assets/scss/variables/_variables.scss`
- `layers/ui/assets/scss/main.scss`
- `layers/ui/layouts/default.vue`
- `layers/ui/components/Header/index.vue`
- `layers/ui/components/Main/index.vue`
- `layers/ui/components/Footer/index.vue`

## 3) Keep contracts intact
Never break:
- `usePageData` output assumptions
- existing offers placement and data shape
- slug/lang routing behavior
- head/schema/redirect logic in catch-all page

## 4) Apply redesign
Implement directly in UI layer with theme consistency across:
- shell (header/footer/layout)
- primary content flow (hero, title, sections)
- component states and responsive behavior

## 5) Validate
At minimum:
- run `nuxi dev`
- check no new import/runtime errors
- confirm mobile and desktop still render
- confirm no base-layer contract regressions

## 6) Report
Always provide:
- assumptions made from the theme
- files changed
- what was intentionally preserved
- residual risks and follow-up options
