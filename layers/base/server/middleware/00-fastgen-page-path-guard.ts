const normalizePath = (value: unknown) => String(value || '')
  .trim()
  .replace(/^\/+/, '')
  .replace(/\/{2,}/g, '/')
  .replace(/\/+$/, '')

const isSitePageRequest = (pathname: string) => {
  if (["/site-manifest.json", "/manifest.webmanifest", "/favicon.ico", "/yandex-browser-manifest.json"].includes(pathname)) return false
  if (/^\/(?:robots\.txt|sitemap\.xml)\/?$/.test(pathname)) return false
  if (/^\/(?:_nuxt|_ipx|__fastgen|api|media|siteid|offer|footer|go)(?:\/|$)/.test(pathname)) return false
  return true
}

export default defineEventHandler(async (event) => {
  if (!['GET', 'HEAD'].includes(event.method || '')) return
  const url = getRequestURL(event)
  if (!isSitePageRequest(url.pathname)) return

  const config = useRuntimeConfig(event) as any
  const backendUrl = config.backendUrl || config.server?.backHost || config.public?.backHost
  const siteId = config.public?.siteId || config.server?.siteId
  if (!backendUrl || !siteId) return
  const endpoint = `${String(backendUrl).replace(/\/+$/, '')}/pages/${encodeURIComponent(String(siteId))}`
  const slug = normalizePath(url.pathname)

  try {
    // A valid content path must be recognised by Frontback itself.
    const page = await $fetch<any>(endpoint, { query: { slug, routing: 'exact' } })
    if (page?.redirect?.to) return sendRedirect(event, page.redirect.to, page.redirect.statusCode || 302)
    return
  } catch (error: any) {
    const status = Number(error?.statusCode || error?.response?.status || error?.status || 500)
    if (status !== 404 || slug.includes('/')) {
      if (status === 404) {
        const root = await $fetch<any>(endpoint, { query: { routing: 'exact' } }).catch(() => null)
        return sendRedirect(event, root?.redirect?.to || (root?.originalSlug ? `/${root.originalSlug}/` : '/'), 302)
      }
      return
    }
  }

  // One-segment locale home aliases are valid only when root hreflang data
  // declares them. The page API resolves their backing fullSlug afterwards.
  const home = await $fetch<any>(endpoint, { query: { routing: 'exact' } }).catch(() => null)
  const declared = Array.isArray(home?.alters) && home.alters.some((entry: any) => (
    normalizePath(entry?.slug) === slug && normalizePath(entry?.fullSlug)
  ))
  if (!declared) return sendRedirect(event, home?.redirect?.to || (home?.originalSlug ? `/${home.originalSlug}/` : '/'), 302)
})
