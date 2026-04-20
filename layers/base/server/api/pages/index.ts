import { defineEventHandler, createError, setResponseHeader } from "h3";
import { resolveSiteRuntime } from "../../utils/site-runtime";

export const runtime = "nodejs";

const fetchPagePayload = async (
  backendBase: string,
  siteId: string,
  slug?: string
) => {
  const endpoint = `${backendBase}/pages/${siteId}`;
  return $fetch(endpoint, {
    method: "GET",
    params: slug ? { slug } : undefined,
  });
};

export default defineEventHandler(async (event) => {
  setResponseHeader(
    event,
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=600"
  );

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    return await fetchPagePayload(backendBase, siteId);
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 500;
    throw createError({ statusCode, statusMessage: "Failed to fetch page" });
  }
});
