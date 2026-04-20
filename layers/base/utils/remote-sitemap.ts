import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

const SITE_ORIGIN_PLACEHOLDER = "{{SITE_ORIGIN}}";

export interface RemoteSitemapImage {
  loc: string;
  title?: string | null;
}

export interface RemoteSitemapEntry {
  loc: string;
  lastmod?: string | null;
  images?: RemoteSitemapImage[];
}

export interface RemoteSitemapPayload {
  siteId: string | null;
  baseUrl: string | null;
  urls: RemoteSitemapEntry[];
}

export interface RemoteSitemapConfig {
  siteId?: string | null;
  backendBaseUrl?: string | null;
  sitemapApiBase?: string | null;
}

export interface RemoteSitemapHandlers {
  fetchRemoteSitemap: () => Promise<RemoteSitemapPayload | null>;
  buildSitemapFromPayload: (
    payload: RemoteSitemapPayload | null,
    event?: H3Event
  ) => string;
}

export const createRemoteSitemapHandlers = (
  config?: RemoteSitemapConfig
): RemoteSitemapHandlers => {
  const resolved = resolveRemoteSitemapConfig(config);
  const siteId = resolved.siteId;
  const endpointBase = resolved.sitemapApiBase || resolved.backendBaseUrl;

  const fetchRemoteSitemap = async (): Promise<RemoteSitemapPayload | null> => {
    if (!siteId || !endpointBase) {
      return null;
    }
    const endpoint = `${endpointBase}/sites/sitemap?siteId=${siteId}`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as RemoteSitemapPayload;
    } catch {
      return null;
    }
  };

  const buildSitemapFromPayload = (
    payload: RemoteSitemapPayload | null,
    event?: H3Event
  ) => {
    if (!payload || !Array.isArray(payload.urls) || payload.urls.length === 0) {
      return buildEmptySitemap();
    }

    const baseUrl = resolveBaseUrl(event, payload.baseUrl);
    const urlsXml = payload.urls
      .map((entry) => serializeUrlEntry(entry, baseUrl))
      .filter((entry): entry is string => Boolean(entry))
      .join("\n");

    return buildSitemapXml(urlsXml);
  };

  const resolveBaseUrl = (event?: H3Event, rawBaseUrl?: string | null) => {
    const eventBase = sanitizeBaseUrl(extractBaseUrlFromEvent(event));
    if (eventBase) {
      return eventBase;
    }

    const sanitized = sanitizeBaseUrl(rawBaseUrl);
    return sanitized === SITE_ORIGIN_PLACEHOLDER ? "" : sanitized;
  };

  const extractBaseUrlFromEvent = (event?: H3Event) => {
    const req = event?.node?.req;
    if (!req) {
      return "";
    }
    const host =
      pickHeaderValue(req.headers?.["x-forwarded-host"]) ||
      pickHeaderValue(req.headers?.host);
    if (!host) {
      return "";
    }
    const protoHeader = pickHeaderValue(req.headers?.["x-forwarded-proto"]);
    const protocol =
      protoHeader?.split(",")[0]?.trim() ||
      (isEventSecure(event) ? "https" : "http");
    return `${protocol}://${host.split(",")[0]?.trim()}`;
  };

  return {
    fetchRemoteSitemap,
    buildSitemapFromPayload,
  };
};

export const shouldHandleSitemapEvent = (event?: H3Event) => {
  const rawPath = event?.path || event?.node?.req?.url || "";
  if (!rawPath) {
    return false;
  }
  const normalized = rawPath.split("?")[0]?.toLowerCase() || "";
  if (!normalized || normalized.includes("sitemap_index")) {
    return false;
  }
  return normalized.includes("sitemap.xml");
};

const buildEmptySitemap = () =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    "</urlset>",
  ].join("\n");

const buildSitemapXml = (urlsXml: string) => {
  const body = urlsXml ? `\n${urlsXml}\n` : "\n";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    body.trimEnd(),
    "</urlset>",
  ].join("\n");
};

const sanitizeBaseUrl = (value?: string | null) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  let trimmed = value.trim();
  while (trimmed.endsWith("/")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

const resolveRemoteSitemapConfig = (config?: RemoteSitemapConfig) => {
  if (config) {
    return {
      siteId: (config.siteId ?? "").trim(),
      backendBaseUrl: sanitizeBaseUrl(config.backendBaseUrl),
      sitemapApiBase: sanitizeBaseUrl(config.sitemapApiBase),
    };
  }

  const runtimeConfig = getRuntimeConfigSnapshot();
  return {
    siteId: (runtimeConfig.siteId ?? "").trim(),
    backendBaseUrl: sanitizeBaseUrl(runtimeConfig.backendBaseUrl),
    sitemapApiBase: sanitizeBaseUrl(runtimeConfig.sitemapApiBase),
  };
};

const getRuntimeConfigSnapshot = (): Required<RemoteSitemapConfig> => {
  try {
    const runtime = useRuntimeConfig();
    const server = (runtime as any)?.server || {};
    const publicConfig = (runtime as any)?.public || {};
    return {
      siteId: server.siteId || publicConfig.siteId || "",
      backendBaseUrl: server.backHost || publicConfig.backHost || "",
      sitemapApiBase:
        server.sitemapApiBase || publicConfig.sitemapApiBase || "",
    };
  } catch {
    return { siteId: "", backendBaseUrl: "", sitemapApiBase: "" };
  }
};

const pickHeaderValue = (value?: string | string[]) => {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] || "" : value;
};

const isEventSecure = (event?: H3Event) => {
  const socket = event?.node?.req?.socket as
    | { encrypted?: boolean }
    | undefined;
  return Boolean(socket && socket.encrypted);
};

const serializeUrlEntry = (entry: RemoteSitemapEntry, baseUrl: string) => {
  const loc = resolveEntryLoc(entry.loc, baseUrl);
  if (!loc) {
    return null;
  }

  const normalizedLoc = loc.endsWith('/') ? loc : `${loc}/`;
  const pieces = [`  <url>`, `    <loc>${escapeXml(normalizedLoc)}</loc>`];

  if (entry.lastmod) {
    pieces.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  }

  if (Array.isArray(entry.images)) {
    for (const img of entry.images) {
      const imgLoc = normalizeImageLoc(img.loc, baseUrl);
      if (!imgLoc) continue;
      pieces.push("    <image:image>");
      pieces.push(`      <image:loc>${escapeXml(imgLoc)}</image:loc>`);
      if (img.title) {
        pieces.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      }
      pieces.push("    </image:image>");
    }
  }

  pieces.push("  </url>");
  return pieces.join("\n");
};

const resolveEntryLoc = (loc?: string | null, baseUrl?: string) => {
  const normalized = typeof loc === "string" ? loc.trim() : "";
  if (!normalized) {
    return null;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return baseUrl ? `${baseUrl}${path}` : path;
};

const normalizeImageLoc = (loc?: string | null, baseUrl?: string) => {
  const normalized = typeof loc === "string" ? loc.trim() : "";
  if (!normalized) {
    return null;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return baseUrl ? `${baseUrl}${normalized}` : normalized;
  }
  return normalized;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
