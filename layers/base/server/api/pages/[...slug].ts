import { defineEventHandler, createError, setResponseHeader } from "h3";
import { resolveSiteRuntime, normalizeSlugParam } from "../../utils/site-runtime";

export const runtime = "nodejs";

export default defineEventHandler(async (event) => {
  setResponseHeader(
    event,
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=600"
  );

  const slugParam = event.context.params?.slug as string | string[] | undefined;
  const slug = normalizeSlugParam(slugParam);

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    const endpoint = `${backendBase}/pages/${siteId}`;
    const result = await $fetch(endpoint, {
      method: "GET",
      params: slug ? { slug } : undefined,
    });
    return result;
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 500;
    throw createError({ statusCode, statusMessage: "Failed to fetch page" });
  }
});
