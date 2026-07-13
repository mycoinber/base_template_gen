import { defineEventHandler, getRequestURL, sendRedirect } from "h3";

const HAS_FILE_EXTENSION_RE = /\.[a-z0-9]{1,8}$/i;
const MULTI_SLASH_RE = /\/{2,}/g;

const SKIP_PREFIXES = [
  "/_nuxt",
  "/api",
  "/media",
  "/siteid",
];

const SKIP_EXACT = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

const normalizePathname = (pathname: string): string => {
  if (!pathname) return "/";
  if (/^\/+$/.test(pathname)) return "/";
  const collapsed = pathname.replace(MULTI_SLASH_RE, "/");
  return collapsed || "/";
};

const shouldSkipTrailingSlash = (pathname: string): boolean => {
  if (SKIP_EXACT.has(pathname)) return true;
  if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  const lastSegment = pathname.split("/").filter(Boolean).pop() || "";
  return HAS_FILE_EXTENSION_RE.test(lastSegment);
};

const withTrailingSlash = (pathname: string): string => {
  if (pathname === "/") return pathname;
  if (pathname.endsWith("/")) return pathname;
  return `${pathname}/`;
};

export default defineEventHandler((event) => {
  const method = event.node?.req?.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    return;
  }

  const url = getRequestURL(event);
  const originalPathname = url.pathname || "/";
  const rawRequestUrl = event.node?.req?.url || "";
  const rawPathname = (rawRequestUrl.split("?")[0] || originalPathname || "/") as string;
  const hadMultipleSlashes = /\/{2,}/.test(rawPathname);
  const normalizedPathname = normalizePathname(rawPathname || originalPathname);
  let changed = false;

  let finalPathname = normalizedPathname;

  if (normalizedPathname !== originalPathname || hadMultipleSlashes) {
    changed = true;
  }

  if (!shouldSkipTrailingSlash(finalPathname)) {
    const trailed = withTrailingSlash(finalPathname);
    if (trailed !== finalPathname) {
      finalPathname = trailed;
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = finalPathname;

  return sendRedirect(event, redirectUrl.toString(), 301);
});
