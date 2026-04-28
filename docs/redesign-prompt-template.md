# Nuxt Layer Redesign Prompt Template

## A. Input Block (YAML)
```yaml
theme: "Grey Eagle Online Casino in Canada"
redesign_goal: "Increase trust and conversion while preserving long-form readability"
audience: "Canada-focused online casino users (new + returning), 21+"
brand_direction:
  tone: "premium, assertive, trustworthy"
  visual_keywords: ["charcoal", "steel", "gold accents", "eagle", "northern lights glow"]
  forbidden: ["generic SaaS look", "neon overload", "purple default casino style"]
constraints:
  keep_layer_split: true
  keep_data_contract: true
  keep_seo_ssr_pipeline: true
  keep_offer_placements: ["hero", "header", "footer", "gallery"]
  no_new_dependencies: true
technical_limits:
  editable_scope:
    - "layers/ui/**"
    - "docs/**"
  immutable_scope:
    - "layers/base/**"
    - "pages/[...slug].vue SEO/SSR logic"
deliverables:
  - "implemented UI redesign"
  - "docs/template-dna.md"
  - "docs/redesign-brief.md"
  - "verification report"
```

## B. Master Prompt
```text
Ты senior frontend engineer для Nuxt layer-проекта.

Контекст:
- Архитектура: root + layers/base + layers/ui.
- Изменения нужны в коде, а не только концепт.

Нельзя ломать:
1) Контракт данных из usePageData (shape page/article/blocks/offers/logo/head).
2) Роутинг pages/index.vue -> pages/[...slug].vue.
3) SEO/SSR pipeline в catch-all (canonical, alternates, robots, OG/Twitter, schema.org, head/body code blocks, SSR redirects).
4) Offer placements: hero/header/footer/gallery.
5) Границы слоёв: backend/runtime/data остаются в layers/base.

Нужно сделать:
1) Сформулировать визуальную концепцию на основе INPUT.
2) Обновить UI-код в layers/ui (tokens, shell, primary content path).
3) Сохранить контракты и существующие data bindings.
4) Проверить desktop/mobile рендер и отсутствие новых runtime/import ошибок.
5) Дать отчёт о рисках и совместимости.

Формат ответа:
- Concept
- File-by-file implementation
- Compatibility notes
- Verification checklist (contracts, SEO/SSR, offers, responsive, runtime)
```

## C. Minimal One-Shot Prompt
```text
Сделай редизайн только для [COMPONENT_OR_PAGE] в стиле [STYLE_DIRECTION].
Ограничения: не менять data contract, SEO/SSR pipeline и offers placements.
Верни: изменения по файлам + риски + чеклист проверки.
```

## D. Validation Request
Перед финалом обязательно приложи:
- Risk notes: что потенциально может регресснуть.
- Compatibility notes: какие контракты подтверждены как сохранённые.
- Verification checklist: contracts, routing, SEO/SSR, offers placements, responsive, runtime startup.
