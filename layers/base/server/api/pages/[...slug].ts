import { defineEventHandler, createError, setResponseHeader } from "h3";
import { resolveSiteRuntime, normalizeSlugParam } from "../../utils/site-runtime";

export const runtime = "nodejs";

const fetchPagePayload = async (
  backendBase: string,
  siteId: string,
  slug?: string
) => {
  const endpoint = `${backendBase}/pages/${siteId}`;
  return $fetch<any>(endpoint, {
    method: "GET",
    params: slug ? { slug } : undefined,
  });
};

const normalizeSlug = (value: unknown) =>
  typeof value === "string"
    ? value.trim().replace(/^\/+/g, "").replace(/\/+/g, "/").replace(/\/+$/g, "")
    : "";

const resolveHomeVersionFallback = async (
  backendBase: string,
  siteId: string,
  slug: string
) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug || normalizedSlug.includes("/")) return null;

  const rootPayload = await fetchPagePayload(backendBase, siteId);
  if (Number(rootPayload?.homePage) !== 1) return null;

  const version = Array.isArray(rootPayload?.alters)
    ? rootPayload.alters.find((alter: any) => normalizeSlug(alter?.slug) === normalizedSlug)
    : null;
  const legacyFullSlug = normalizeSlug(version?.fullSlug);
  if (!legacyFullSlug || legacyFullSlug === normalizedSlug) return null;

  const legacyPayload = await fetchPagePayload(backendBase, siteId, legacyFullSlug);
  const versionCanonicalUrl = typeof version?.canonicalUrl === "string"
    ? version.canonicalUrl.trim()
    : "";
  const versionAmpUrl = typeof version?.ampUrl === "string"
    ? version.ampUrl.trim()
    : "";

  return {
    ...legacyPayload,
    head: versionCanonicalUrl || versionAmpUrl
      ? {
          ...(legacyPayload?.head || {}),
          ...(versionCanonicalUrl ? { canonicalUrl: versionCanonicalUrl } : {}),
          ...(versionAmpUrl ? { ampUrl: versionAmpUrl } : {}),
        }
      : legacyPayload?.head,
    slug: rootPayload?.slug || legacyPayload?.slug || "",
    fullSlug: normalizedSlug,
    canonicalSlug: "",
    localePrefix: normalizedSlug,
    homePage: 1,
    lang: version?.hreflang || legacyPayload?.lang || rootPayload?.lang,
    primaryLang: rootPayload?.primaryLang || legacyPayload?.primaryLang,
    alters: rootPayload?.alters || legacyPayload?.alters,
  };
};

export default defineEventHandler(async (event) => {
  setResponseHeader(
    event,
    "Cache-Control",
    "no-cache, max-age=0, must-revalidate"
  );

  const slugParam = event.context.params?.slug as string | string[] | undefined;
  const slug = normalizeSlugParam(slugParam);

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    return await fetchPagePayload(backendBase, siteId, slug);
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 500;
    if (statusCode === 404 && slug) {
      const fallback = await resolveHomeVersionFallback(backendBase, siteId, slug).catch(() => null);
      if (fallback) return fallback;
    }
    throw createError({ statusCode, statusMessage: "Failed to fetch page" });
  }
});
