# Template DNA Outline

Use this as the canonical structure for `docs/template-dna.md`.

## 1. Goal
Define what must survive any redesign.

## 2. Layer architecture
- Root config role
- `layers/base` role
- `layers/ui` role
- Explicit anti-corruption rule between layers

## 3. Runtime contract
- Required ENV vars and defaults
- Production-vs-dev toggles that affect build/runtime
- Port/HMR assumptions

## 4. Data layer contract
- API endpoints used by UI
- Backend mapping per endpoint
- Required normalized page fields
- Shared `useState` keys and consumers

## 5. UI structural contract
- Routing flow and catch-all behavior
- Layout shell responsibilities
- Section/block type to component mapping
- Required render order for critical content

## 6. SEO and SSR contract
- Canonical and alternate links
- Robots and metadata sources
- JSON-LD nodes and when they are emitted
- Head/body custom code block support
- SSR redirects

## 7. Visual DNA baseline
- Color/typography tokens
- Scale, rhythm, spacing, shape language
- CTA tone and hierarchy
- Responsive behavior (desktop/mobile)

## 8. Allowed redesign surface
List what can be changed safely.

## 9. Non-negotiables
List what cannot be changed without explicit approval.

## 10. Definition of Done
- Compatibility checks
- Visual acceptance checks
- Runtime checks
