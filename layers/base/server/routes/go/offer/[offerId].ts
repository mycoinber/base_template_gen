import {
  createError,
  defineEventHandler,
  sendRedirect,
  setResponseHeader,
} from "h3";
import { resolveSiteRuntime } from "../../../utils/site-runtime";

export const runtime = "nodejs";

const normalizeRedirectUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  setResponseHeader(event, "X-Robots-Tag", "noindex, nofollow");

  const offerId = String(event.context.params?.offerId || "").trim();
  if (!offerId) {
    throw createError({ statusCode: 400, statusMessage: "Offer id is required" });
  }

  const { siteId, backendBase } = resolveSiteRuntime(event);

  try {
    const response = await $fetch<{ link?: string }>(
      `${backendBase}/pages/${siteId}/offers/${offerId}/link`,
      { method: "GET" },
    );
    const link = normalizeRedirectUrl(response?.link);
    if (!link) {
      throw createError({ statusCode: 404, statusMessage: "Offer link not found" });
    }
    return sendRedirect(event, link, 302);
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.response?.status || 404;
    throw createError({
      statusCode,
      statusMessage: statusCode === 404 ? "Offer link not found" : "Failed to resolve offer link",
    });
  }
});
