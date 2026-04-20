import { createError } from "h3";
import type { H3Event } from "h3";

const stripTrailingSlash = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/\/$/, "");
};

const resolveSiteId = (event: H3Event) => {
  const config = useRuntimeConfig(event);
  const serverSiteId = typeof config.server?.siteId === "string" ? config.server.siteId : "";
  const publicSiteId = typeof config.public?.siteId === "string" ? config.public.siteId : "";
  return serverSiteId || publicSiteId || "";
};

export const resolveSiteRuntime = (event: H3Event) => {
  const config = useRuntimeConfig(event);
  const siteId = resolveSiteId(event);
  if (!siteId) {
    throw createError({ statusCode: 500, statusMessage: "SITE_ID is not configured" });
  }
  const backendBase = stripTrailingSlash(config.server?.backHost || "");
  if (!backendBase) {
    throw createError({ statusCode: 500, statusMessage: "BACKEND_URL/BACK_HOST is not configured" });
  }
  return { siteId, backendBase };
};

export const normalizeSlugParam = (raw: string | string[] | undefined) => {
  if (!raw) return "";
  const segments = Array.isArray(raw) ? raw : raw.split("/");
  return segments.map((segment) => segment?.trim()).filter(Boolean).join("/");
};
