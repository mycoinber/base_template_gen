import { createError, getRequestURL, setHeader, type H3Event } from 'h3'
import { $fetch } from 'ofetch'

export function crawlOrigin(event: H3Event) {
  return getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
}

export function buildRobots(content: unknown, origin: string) {
  if (typeof content !== 'string' || /^\s*(?:<!doctype\s+html|<html)/i.test(content)) {
    throw new Error('Invalid robots response')
  }
  const rules = content.trim() || 'User-agent: *\nAllow: /'
  return /^\s*sitemap\s*:/im.test(rules)
    ? `${rules}\n`
    : `${rules}\nSitemap: ${origin}/sitemap.xml\n`
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]!)

function absoluteUrl(value: unknown, origin: string, trailingSlash = false) {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  // The API uses site-relative paths; preserve explicit HTTP(S) URLs from legacy data.
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `/${raw.replace(/^\/+/, '')}`, origin)
  if (trailingSlash && !url.pathname.endsWith('/')) url.pathname += '/'
  return url.href
}

export function buildSitemap(payload: any, origin: string) {
  if (!payload || !Array.isArray(payload.urls)) throw new Error('Invalid sitemap response')
  const seen = new Set<string>()
  const entries: string[] = []
  for (const entry of payload.urls) {
    const loc = absoluteUrl(entry?.loc, origin, true)
    if (!loc || seen.has(loc)) continue
    seen.add(loc)
    const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`]
    if (typeof entry.lastmod === 'string' && Number.isFinite(Date.parse(entry.lastmod))) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`)
    }
    for (const image of Array.isArray(entry.images) ? entry.images : []) {
      const imageLoc = absoluteUrl(image?.loc, origin)
      if (!imageLoc) continue
      lines.push('    <image:image>', `      <image:loc>${escapeXml(imageLoc)}</image:loc>`)
      if (typeof image.title === 'string' && image.title) lines.push(`      <image:title>${escapeXml(image.title)}</image:title>`)
      lines.push('    </image:image>')
    }
    lines.push('  </url>')
    entries.push(lines.join('\n'))
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

export async function serveCrawlDocument(event: H3Event, config: any, kind: 'robots' | 'sitemap') {
  try {
    const backendUrl = String(config.backendUrl || config.server?.backHost || config.public?.backHost || '').replace(/\/+$/, '')
    const siteId = String(config.public?.siteId || config.server?.siteId || '')
    if (!backendUrl || !siteId) throw new Error('Crawl configuration missing')
    const payload = await $fetch(`${backendUrl}/sites/${kind}`, {
      query: kind === 'sitemap' ? { siteId, routing: 'exact' } : { siteId }, timeout: 5000, retry: 0,
      responseType: kind === 'robots' ? 'text' : 'json',
    })
    const origin = crawlOrigin(event)
    const body = kind === 'robots' ? buildRobots(payload, origin) : buildSitemap(payload, origin)
    setHeader(event, 'Content-Type', kind === 'robots' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300')
    return body
  } catch {
    // Do not turn a temporary API failure into cached crawl restrictions or an empty sitemap.
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Retry-After', '60')
    throw createError({ statusCode: 503, statusMessage: 'Crawl document temporarily unavailable' })
  }
}
