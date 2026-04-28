# Verification Checklist

Run this checklist before accepting redesign output.

## Contracts
- [ ] `layers/base` keeps backend/API/runtime responsibilities.
- [ ] UI changes do not alter base endpoint contract.
- [ ] Required normalized fields are still consumed safely.

## Routing and rendering
- [ ] `pages/index` still delegates correctly.
- [ ] Catch-all slug route still resolves content.
- [ ] Layout shell still wraps page with required site chrome.

## SEO and SSR
- [ ] Canonical and alternates still render.
- [ ] OG/Twitter metadata still render.
- [ ] Schema.org output remains valid.
- [ ] Head/body code blocks still inject correctly.
- [ ] SSR redirects still execute server-side.

## Offers and monetization slots
- [ ] `hero` placement works.
- [ ] `header` placement works.
- [ ] `footer` placement works.
- [ ] `gallery` placement works.

## Responsive quality
- [ ] Desktop layout is coherent.
- [ ] Mobile layout (<= configured breakpoint) is coherent.
- [ ] Typography remains readable in long-form content.

## Runtime stability
- [ ] `nuxi dev` starts without new runtime errors.
- [ ] No unresolved imports or layer resolution warnings introduced.
