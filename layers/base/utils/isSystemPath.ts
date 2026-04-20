/**
 * Checks if slug is a system (technical) path like favicon, robots, etc.
 * @param slug - Slug string or array
 * @returns {boolean}
 */
export function isSystemPath(slug: string | string[] | null | undefined): boolean {
    if (!slug) return true;
    const slugStr = Array.isArray(slug) ? slug.join('/') : String(slug);
    const SYSTEM_PATHS = [
        'favicon.ico', 'sitemap.xml', 'robots.txt', 'manifest.json', 'service-worker.js',
        '.well-known', 'apple-touch-icon', 'mstile-', '.xml', '.json',
    ];
    return SYSTEM_PATHS.some(p => slugStr.includes(p));
}
