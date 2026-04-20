const normalizeBaseUrl = (value?: string | null) => {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/+$/, "");
};

const SITE_ID = (process.env.SITE_ID || "").trim();
const MEDIA_STORAGE_URL = (process.env.MEDIA_STORAGE_URL || "").trim();
const BACKEND_BASE_URL = normalizeBaseUrl(process.env.BACKEND_URL);
const SITE_URL = normalizeBaseUrl(process.env.SITE_URL);
const SITE_NAME = (process.env.SITE_NAME || "").trim();

export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: true,
  experimental: {
    appManifest: process.env.NODE_ENV === "production",
  },
  routeRules: {
    "/**": { isr: 7200 },
  },
  modules: [
    "@nuxt/image-edge",
    "@nuxt/icon",
    "@nuxtjs/google-fonts",
    "@nuxt/image",
    "@nuxtjs/tailwindcss",
    "nuxt-schema-org",
    "nuxt-og-image",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
    "nuxt-vitalizer",
  ],
  schemaOrg: {
    defaults: false,
  },
  site: {
    url: SITE_URL || undefined,
    name: SITE_NAME || undefined,
  },

  sitemap: {
    xsl: false,
    cacheMaxAgeSeconds: 0,
    excludeAppSources: true,
    sources: [],
  },
  vitalizer: {
    delayHydration: {
      hydrateOnEvents: [
        "mousemove",
        "scroll",
        "keydown",
        "click",
        "touchstart",
        "wheel",
      ],
      idleCallbackTimeout: 10000,
      postIdleTimeout: 4000,
    },
  },
  nitro: {
    logLevel: "debug",
    // node: true,
    preset: "cloudflare_pages",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    prerender: {
      // crawlLinks: true,
      ignore: ["/yandex-browser-manifest.json"],
    },
  },
  runtimeConfig: {
    public: {
      siteId: SITE_ID,
      mediaStorageUrl: MEDIA_STORAGE_URL || undefined,
      sitemapApiBase: BACKEND_BASE_URL,
      backHost: BACKEND_BASE_URL || undefined,
      vercelAnalytics:
        process.env.VERCEL === "1" || process.env.VERCEL === "true",
      siteUrl: SITE_URL || undefined,
      siteName: SITE_NAME || undefined,
    },
    server: {
      siteId: SITE_ID,
      backHost: BACKEND_BASE_URL || undefined,
      mediaStorageUrl: MEDIA_STORAGE_URL || undefined,
      sitemapApiBase: BACKEND_BASE_URL,
      siteUrl: SITE_URL || undefined,
      siteName: SITE_NAME || undefined,
    },
  },
  plugins: ["#layers/base/plugins/vue-query.ts"],
  image: {
    provider: "mediaProxy",
    dir: "public",
    providers: {
      mediaProxy: {
        provider: "#layers/base/providers/mediaProxy",
        options: {
          baseURL: "/media",
        },
      },
    },
    alias: {
      unsplash: BACKEND_BASE_URL || "http://localhost:3077",
    },
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  compatibilityDate: "2024-11-26",
});
