const normalizeBaseUrl = (value?: string | null) => {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/+$/, "");
};

const toOrigin = (value?: string | null) => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return "";
  try {
    return new URL(normalized).origin;
  } catch {
    return "";
  }
};

const MEDIA_STORAGE_URL = (process.env.MEDIA_STORAGE_URL || "").trim();
const CSS_SLUG = (process.env.SLUG || "site").trim() || "site";
const HMR_PORT = Number(process.env.NUXT_HMR_PORT || 24679);

export default defineNuxtConfig({
  css: ["#layers/ui/assets/scss/main.scss"],
  tailwindcss: {
    cssPath: "#layers/ui/assets/css/tailwind.css",
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      style: [
        {
          children:
            "html,body{background:#070a11;color:#f2f6ff;min-height:100%;}body::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 15% -10%,rgba(250,214,112,.15),transparent 40%),radial-gradient(circle at 85% 10%,rgba(88,188,255,.12),transparent 35%);z-index:-1;}",
        },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        ...(toOrigin(MEDIA_STORAGE_URL)
          ? [{ rel: "preconnect", href: toOrigin(MEDIA_STORAGE_URL) }]
          : []),
      ],
    },
  },
  vite: {
    css: {
      modules: {
        generateScopedName: `[local]-${CSS_SLUG}_[hash:base64:5]`,
      },
    },
    server: {
      watch: {
        usePolling: true,
      },
      hmr: {
        port: HMR_PORT,
      },
    },
  },
  googleFonts: {
    families: {
      Cinzel: [500, 600, 700],
      Manrope: [400, 500, 600, 700],
    },
    display: "swap",
    preconnect: true,
    preload: true,
    useStylesheet: true,
  },
});
