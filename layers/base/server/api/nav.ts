import { defineEventHandler, createError, setResponseHeader } from "h3";
import { resolveSiteRuntime } from "../utils/site-runtime";

export const runtime = "nodejs";

export default defineEventHandler(async (event) => {
  setResponseHeader(
    event,
    "Cache-Control",
    "s-maxage=120, stale-while-revalidate=60"
  );

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    const endpoint = `${backendBase}/pages/nav`;
    return await $fetch(endpoint, {
      params: { siteId },
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 500;
    throw createError({ statusCode, statusMessage: "Failed to fetch navigation" });
  }
});
