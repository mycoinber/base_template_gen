import { defineEventHandler, createError, setResponseHeader } from "h3";
import { resolveSiteRuntime } from "../../utils/site-runtime";

export const runtime = "nodejs";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "s-maxage=3600, stale-while-revalidate=600");

  const offerId = String(event.context.params?.offerId || "").trim();
  if (!offerId) {
    throw createError({ statusCode: 400, statusMessage: "Offer id is required" });
  }

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    return await $fetch(`${backendBase}/pages/${siteId}/offers/${offerId}`, {
      method: "GET",
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 500;
    throw createError({ statusCode, statusMessage: "Failed to fetch offer" });
  }
});
