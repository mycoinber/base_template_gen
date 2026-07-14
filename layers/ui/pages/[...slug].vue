<template>
  <main>
    <Main v-if="data?.type" :data="data" />
  </main>
  <!-- SSR-rendered body code blocks -->
  <div v-for="(code, i) in bodyHtmlCodes" :key="'bh-'+i" v-html="code" />
  <component v-for="(code, i) in bodyJsCodes" :key="'bjs-'+i" :is="'script'" type="text/javascript">{{ code }}</component>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { manifestToHead } from "#layers/base/utils/manifestHead";
import { dedupeLinks, dedupeMeta, toContentString } from "#layers/base/utils/headUtils";
const { locale } = useI18n();
const url = useRequestURL();
const siteDomain = `${url.protocol}//${url.host}`;
const config = useRuntimeConfig();
const route = useRoute();

const siteId = import.meta.server ? config.server.siteId : config.public.siteId;

// Сборка slug-а из catch-all
const rawSlug = route.params.slug;

const slugArray = Array.isArray(rawSlug)
  ? rawSlug
  : typeof rawSlug === "string"
    ? rawSlug.split("/")
    : [];

const slug = slugArray.length ? slugArray.join("/") : "";
// Получаем данные страницы
const { data, status, error } = await usePageData(siteId, slug);

if (error.value) {
  throw error.value;
}

const normalizeRequestSlug = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
};

if (import.meta.server) {
  const requestedSlug = normalizeRequestSlug(slug);
  const isHomePage = Number(data.value?.homePage) === 1;
  const hasLocalePrefix = Boolean(data.value?.localePrefix);

  if (isHomePage && !hasLocalePrefix && requestedSlug) {
    await navigateTo("/", {
      redirectCode: 301,
    });
  }
}

const { data: siteManifestRaw } = await useSiteManifest();

const manifestHead = computed(() => manifestToHead(siteManifestRaw.value));

// --- HEAD LOGIC ---

const pageHead = computed(() => data.value?.head || {});
const pagePrimaryLang = computed(() => data.value?.primaryLang || null);
const pageLang = computed(() => resolveActivePageLang());
const pageDomain = computed(() => data.value?.domain || siteDomain);
const isHomePage = computed(() => Number(data.value?.homePage) === 1);
const hasCanonicalPageSlug = computed(() => Boolean(normalizeSlugForPath(data.value?.canonicalSlug)));
const isVersionHomePage = computed(() => Boolean(data.value?.localePrefix) && !hasCanonicalPageSlug.value);
const isResolvedHomePage = computed(() => isHomePage.value || isVersionHomePage.value);
const isRootHomePage = computed(() => isResolvedHomePage.value && !data.value?.localePrefix);
const currentSlugValue = computed(() => {
  const prefix = normalizeSlugForPath(data.value?.localePrefix);
  if (isResolvedHomePage.value) {
    return prefix;
  }
  return normalizeSlugForPath(data.value?.fullSlug || data.value?.slug || slug || "");
});
const pageSlug = computed(() => currentSlugValue.value);
const originalSlugValue = computed(() => {
  if (isResolvedHomePage.value) return "";

  const canonical = normalizeSlugForPath(data.value?.canonicalSlug);
  if (canonical) return canonical;

  const current = normalizeSlugForPath(data.value?.fullSlug || data.value?.slug || slug || "");
  const prefix = normalizeSlugForPath(data.value?.localePrefix);
  if (prefix && (current === prefix || current.startsWith(`${prefix}/`))) {
    return current.slice(prefix.length).replace(/^\/+/g, "");
  }
  return isRootHomePage.value ? "" : current;
});
const canonicalSlugValue = computed(() => (
  isRootHomePage.value
    ? ""
    : originalSlugValue.value
));
const canonicalPathValue = computed(() => currentSlugValue.value);
const pageUrl = computed(() => buildAbsoluteHref(pageDomain.value, pageSlug.value));

const getEntryId = (entry) => {
  const raw = entry?.id || entry?._id;
  if (raw && typeof raw === "object") {
    return raw.id || raw._id || raw.$oid || "";
  }
  return raw ? String(raw) : "";
};

const versionSeoEntries = computed(() => {
  const versions = Array.isArray(data.value?.versions) ? data.value.versions : [];
  return versions
    .map((version) => {
      const slugValue = normalizeSlugForPath(version?.slug);
      const hreflangValue = typeof version?.hreflang === "string" ? version.hreflang.trim() : "";
      const canonicalUrlValue = typeof version?.canonicalUrl === "string" ? version.canonicalUrl.trim() : "";
      const hreflangUrlValue = typeof version?.hreflangUrl === "string" ? version.hreflangUrl.trim() : "";
      const ampUrlValue = typeof version?.ampUrl === "string" ? version.ampUrl.trim() : "";
      if (!slugValue && !hreflangValue) return null;
      return {
        id: getEntryId(version),
        slug: slugValue,
        hreflang: hreflangValue,
        canonicalUrl: canonicalUrlValue,
        hreflangUrl: hreflangUrlValue,
        ampUrl: ampUrlValue,
      };
    })
    .filter(Boolean);
});

const findVersionSeoFallback = (entry = {}) => {
  const entryId = getEntryId(entry);
  const entrySlug = normalizeSlugForPath(entry?.slug);
  const entryHreflang = typeof entry?.hreflang === "string" ? entry.hreflang.trim().toLowerCase() : "";

  return versionSeoEntries.value.find((version) => {
    if (entryId && version.id && entryId === version.id) return true;
    if (entrySlug && version.slug && entrySlug === version.slug) return true;
    return Boolean(entryHreflang && version.hreflang && entryHreflang === version.hreflang.toLowerCase());
  }) || null;
};

const activeVersionSeo = computed(() => {
  const current = currentSlugValue.value;
  const prefix = normalizeSlugForPath(data.value?.localePrefix);
  if (!current && !prefix) return null;

  return versionSeoEntries.value.find((version) => {
    if (prefix && version.slug === prefix) return true;
    return Boolean(version.slug && current && (current === version.slug || current.startsWith(`${version.slug}/`)));
  }) || null;
});

const canonicalHref = computed(() => {
  const explicitCanonical = typeof pageHead.value?.canonicalUrl === "string"
    ? pageHead.value.canonicalUrl.trim()
    : typeof pageHead.value?.canonical === "string"
      ? pageHead.value.canonical.trim()
      : "";
  const versionCanonical = typeof activeVersionSeo.value?.canonicalUrl === "string"
    ? activeVersionSeo.value.canonicalUrl.trim()
    : "";
  return explicitCanonical || versionCanonical || buildAbsoluteHref(pageDomain.value, canonicalPathValue.value);
});

const ampHref = computed(() => {
  const explicitAmp = typeof pageHead.value?.ampUrl === "string"
    ? pageHead.value.ampUrl.trim()
    : typeof pageHead.value?.amp === "string"
      ? pageHead.value.amp.trim()
      : "";
  const versionAmp = typeof activeVersionSeo.value?.ampUrl === "string"
    ? activeVersionSeo.value.ampUrl.trim()
    : "";
  const rawAmp = explicitAmp || versionAmp;
  if (!rawAmp) return "";
  return /^https?:\/\//i.test(rawAmp)
    ? rawAmp
    : buildAbsoluteHref(pageDomain.value, rawAmp);
});

const originalHreflangHref = computed(() => {
  const explicitHref = typeof pageHead.value?.hreflangUrl === "string"
    ? pageHead.value.hreflangUrl.trim()
    : typeof pageHead.value?.hreflangHref === "string"
      ? pageHead.value.hreflangHref.trim()
      : "";
  if (!explicitHref) return "";
  return /^https?:\/\//i.test(explicitHref)
    ? explicitHref
    : buildAbsoluteHref(siteDomain, explicitHref);
});

const normalizeSiteUrl = (value) => {
  if (!value) return "";
  return String(value).trim().replace(/\/+$/, "");
};

const isLocalhostUrl = (value) => /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value || "");

const schemaBaseUrl = computed(() => {
  const fromConfig = normalizeSiteUrl(config.public?.siteUrl || config.server?.siteUrl);
  if (fromConfig) return fromConfig;
  const fallback = normalizeSiteUrl(pageDomain.value);
  if (process.env.NODE_ENV === "production" && isLocalhostUrl(fallback)) {
    return "";
  }
  return fallback;
});

const schemaPageUrl = computed(() => buildAbsoluteHref(schemaBaseUrl.value, pageSlug.value));

// Парсим глобальные <meta> и <link>
const globalHeadRaw = import.meta.server ? config.server.globalHead : config.public.globalHead;
const globalHeadSource = Array.isArray(globalHeadRaw) ? globalHeadRaw : [];
const globalHead = {
  link: globalHeadSource
    .filter(tag => tag.startsWith("<link"))
    .map(tag => Object.fromEntries(Array.from(tag.matchAll(/(\w+)=["'](.*?)["']/g)).map(([_, name, value]) => [name, value]))),
  meta: globalHeadSource
    .filter(tag => tag.startsWith("<meta"))
    .map(tag => Object.fromEntries(Array.from(tag.matchAll(/(\w+)=["'](.*?)["']/g)).map(([_, name, value]) => [name, value]))),
};

const toAbsoluteUrl = (value, base) => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  try {
    const normalizedBase = base?.endsWith("/") ? base : `${base}/`;
    return new URL(raw, normalizedBase).toString();
  } catch {
    return raw;
  }
};

const normalizeDimension = (value) => {
  if (value == null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return String(Math.round(num));
};

const toIsoDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const stripHtml = (value) => {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const humanizeSegment = (value) => {
  if (!value) return "";
  const text = String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const normalizeSlugForPath = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
};

const buildAbsoluteHref = (base, slugValue) => {
  if (!base) return "";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedSlug = normalizeSlugForPath(slugValue);
  const relative = normalizedSlug ? `${normalizedSlug}/` : "";
  try {
    return normalizedSlug ? new URL(relative, normalizedBase).toString() : normalizedBase;
  } catch (error) {
    return normalizedSlug ? `${normalizedBase}${relative}` : normalizedBase;
  }
};

const ogImage = computed(() => {
  const image = data.value?.article?.introImage?.[0];
  const src = image?.path || image?.url || image?.src;
  return toAbsoluteUrl(src, pageDomain.value);
});
const ogImageWidth = computed(() => {
  const image = data.value?.article?.introImage?.[0];
  return normalizeDimension(image?.width ?? image?.w);
});
const ogImageHeight = computed(() => {
  const image = data.value?.article?.introImage?.[0];
  return normalizeDimension(image?.height ?? image?.h);
});
const siteName = computed(() => {
  const fromConfig = config.public?.siteName || config.server?.siteName;
  const fromData = data.value?.siteName || data.value?.site?.name || data.value?.name;
  const fallback = pageDomain.value ? pageDomain.value.replace(/^https?:\/\//, "") : "";
  const value = fromData || fromConfig || fallback;
  return value ? String(value) : undefined;
});
const publishedTime = computed(() =>
  toIsoDate(
    data.value?.article?.createdAt ||
      data.value?.createdAt ||
      data.value?.publishedAt ||
      pageHead.value?.publishedAt,
  )
);
const modifiedTime = computed(() =>
  toIsoDate(
    data.value?.article?.updatedAt ||
      data.value?.updatedAt ||
      data.value?.modifiedAt ||
      pageHead.value?.modifiedAt,
  )
);
const twitterSite = computed(() => {
  const fromConfig = config.public?.twitterSite || config.server?.twitterSite;
  const fromData = data.value?.twitterSite || pageHead.value?.twitterSite;
  return fromData || fromConfig || undefined;
});

const schemaBreadcrumbs = computed(() => {
  if (!schemaBaseUrl.value) return [];
  const items = [];
  const homeName = siteName.value || "Home";
  const homeUrl = schemaBaseUrl.value;
  if (homeUrl) {
    items.push({ name: homeName, item: homeUrl });
  }
  if (pageSlug.value) {
    const segments = String(pageSlug.value).split("/").filter(Boolean);
    let path = "";
    segments.forEach((segment, index) => {
      path += `${segment}/`;
      const isLast = index === segments.length - 1;
      items.push({
        name: isLast ? (pageHead.value.title || humanizeSegment(segment)) : humanizeSegment(segment),
        item: `${schemaBaseUrl.value}/${path}`,
      });
    });
  }
  return items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.item,
  }));
});

const schemaFaq = computed(() => {
  const blocks = Array.isArray(data.value?.article?.blocks) ? data.value.article.blocks : [];
  const faqs = [];
  for (const block of blocks) {
    const blockFaqs = Array.isArray(block?.faqs) ? block.faqs : [];
    for (const faq of blockFaqs) {
      const question = stripHtml(faq?.question);
      const answer = stripHtml(faq?.answer);
      if (question && answer) {
        faqs.push({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        });
      }
    }
  }
  return faqs;
});

const normalizedAlters = computed(() => {
  const alters = Array.isArray(data.value?.alters) ? data.value.alters : [];
  return alters
    .map((alter) => {
      const versionSeo = findVersionSeoFallback(alter);
      const slugValue = normalizeSlugForPath(alter?.slug);
      const rawFullSlugValue = normalizeSlugForPath(alter?.fullSlug);
      const fullSlugValue = isResolvedHomePage.value ? slugValue : rawFullSlugValue;
      const hreflangValue = typeof alter?.hreflang === "string" ? alter.hreflang.trim() : "";
      const hreflangUrlValue = typeof alter?.hreflangUrl === "string" && alter.hreflangUrl.trim()
        ? alter.hreflangUrl.trim()
        : versionSeo?.hreflangUrl || "";
      const canonicalUrlValue = typeof alter?.canonicalUrl === "string" && alter.canonicalUrl.trim()
        ? alter.canonicalUrl.trim()
        : versionSeo?.canonicalUrl || "";
      const ampUrlValue = typeof alter?.ampUrl === "string" && alter.ampUrl.trim()
        ? alter.ampUrl.trim()
        : versionSeo?.ampUrl || "";
      if (!slugValue || !hreflangValue) return null;
      return {
        slug: slugValue,
        fullSlug: fullSlugValue,
        hreflang: hreflangValue,
        canonicalUrl: canonicalUrlValue,
        hreflangUrl: hreflangUrlValue,
        ampUrl: ampUrlValue,
        isDefault: Boolean(alter?.isDefault),
      };
    })
    .filter((entry) => Boolean(entry && entry.slug && entry.hreflang));
});

function resolveActiveAlternate() {
  const current = currentSlugValue.value;
  const prefix = normalizeSlugForPath(data.value?.localePrefix);
  if (!current && !prefix) return null;

  return normalizedAlters.value.find((alter) => {
    if (alter.fullSlug && alter.fullSlug === current) return true;
    if (prefix && alter.slug === prefix) return true;
    return Boolean(alter.slug && current && (current === alter.slug || current.startsWith(`${alter.slug}/`)));
  }) || null;
}

function resolveActivePageLang() {
  const activeAlter = resolveActiveAlternate();
  if (activeAlter?.hreflang) return activeAlter.hreflang;

  const explicitLang = typeof data.value?.lang === "string" ? data.value.lang.trim() : "";
  return explicitLang || pagePrimaryLang.value || "en";
}

const buildAlternateHref = (alterOrSlug = "") => {
  if (!alterOrSlug && originalHreflangHref.value) {
    return originalHreflangHref.value;
  }

  const explicitHref = typeof alterOrSlug === "object" && alterOrSlug
    ? (typeof alterOrSlug.hreflangUrl === "string" ? alterOrSlug.hreflangUrl.trim() : "")
    : "";
  if (explicitHref) {
    return /^https?:\/\//i.test(explicitHref)
      ? explicitHref
      : buildAbsoluteHref(siteDomain, normalizeSlugForPath(explicitHref));
  }

  const fullSlug = typeof alterOrSlug === "object" && alterOrSlug
    ? normalizeSlugForPath(alterOrSlug.fullSlug)
    : "";
  if (fullSlug) {
    return buildAbsoluteHref(siteDomain, fullSlug);
  }

  const prefix = typeof alterOrSlug === "object" && alterOrSlug
    ? normalizeSlugForPath(alterOrSlug.slug)
    : normalizeSlugForPath(alterOrSlug);
  const segments = [];
  if (prefix) segments.push(prefix);
  if (canonicalSlugValue.value) segments.push(canonicalSlugValue.value);
  const combined = segments.join("/");
  return buildAbsoluteHref(siteDomain, combined);
};

const alternateLinks = computed(() => {
  const links = [];
  const primaryLang = pagePrimaryLang.value || pageLang.value;
  const defaultHref = buildAlternateHref();
  const seen = new Set();

  if (primaryLang) {
    links.push({ key: `alternate-${primaryLang}`, rel: "alternate", hreflang: primaryLang, href: defaultHref });
    seen.add(`${primaryLang}-${defaultHref}`);
  }

  for (const alter of normalizedAlters.value) {
    const href = buildAlternateHref(alter);
    const key = `${alter.hreflang}-${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ key: `alternate-${alter.hreflang}`, rel: "alternate", hreflang: alter.hreflang, href });
  }

  const defaultAlter = normalizedAlters.value.find((alter) => alter.isDefault && alter.hreflang);
  const xDefaultHref = defaultAlter ? buildAlternateHref(defaultAlter) : defaultHref;
  const xDefaultKey = `x-default-${xDefaultHref}`;
  if (!seen.has(xDefaultKey)) {
    links.push({ key: "alternate-x-default", rel: "alternate", hreflang: "x-default", href: xDefaultHref });
    seen.add(xDefaultKey);
  }

  return links;
});

const schemaAuthor = computed(() => {
  const author = data.value?.author || data.value?.aiauthor;
  if (!author) return null;
  const nameCandidate = author?.name;
  const first = nameCandidate?.first || "";
  const last = nameCandidate?.last || "";
  const fullName = [first, last].filter(Boolean).join(" ").trim() || nameCandidate?.full || nameCandidate?.value || "";
  const name = String(fullName || author?.name || author?.fullName || "").trim();
  if (!name) return null;
  const imageCandidate = Array.isArray(author?.picture)
    ? author.picture[0]?.path
    : author?.picture?.path || author?.avatarMedia?.path || author?.avatar?.path;
  const imageUrl = toAbsoluteUrl(imageCandidate, schemaBaseUrl.value || pageDomain.value);
  const description = stripHtml(author?.bio);
  const authorId = schemaPageUrl.value ? `${schemaPageUrl.value}#author` : undefined;
  const node = {
    "@type": "Person",
    name,
    image: imageUrl ? [imageUrl] : undefined,
    description: description || undefined,
  };
  if (authorId) {
    node["@id"] = authorId;
  }
  return node;
});

const schemaReviews = computed(() => {
  const blocks = Array.isArray(data.value?.article?.blocks) ? data.value.article.blocks : [];
  const reviews = [];
  for (const block of blocks) {
    const blockReviews = Array.isArray(block?.reviews) ? block.reviews : [];
    for (const review of blockReviews) {
      const authorName = stripHtml(
        review?.authorBio || review?.name || review?.author?.name || review?.author,
      );
      const ratingValue = Number(review?.rating);
      if (!authorName || !Number.isFinite(ratingValue) || ratingValue <= 0) {
        continue;
      }
      const body = stripHtml(review?.comment || review?.content);
      const datePublished = toIsoDate(review?.date);
      reviews.push({
        "@type": "Review",
        author: { "@type": "Person", name: authorName },
        reviewRating: {
          "@type": "Rating",
          ratingValue,
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: body || undefined,
        datePublished,
      });
    }
  }
  return reviews;
});

const schemaAggregateRating = computed(() => {
  const ratings = schemaReviews.value
    .map((review) => Number(review?.reviewRating?.ratingValue))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!ratings.length) return undefined;
  const total = ratings.reduce((sum, value) => sum + value, 0);
  const average = Number((total / ratings.length).toFixed(1));
  return {
    "@type": "AggregateRating",
    ratingValue: average,
    reviewCount: ratings.length,
    bestRating: 5,
    worstRating: 1,
  };
});

const schemaNodes = computed(() => {
  const nodes = [];
  const isArticle = String(data.value?.type || "").toLowerCase() === "article";
  const websiteId = schemaBaseUrl.value ? `${schemaBaseUrl.value}#website` : undefined;
  const orgId = schemaBaseUrl.value ? `${schemaBaseUrl.value}#organization` : undefined;
  const pageId = schemaPageUrl.value ? `${schemaPageUrl.value}#webpage` : undefined;
  const articleId = isArticle && schemaPageUrl.value ? `${schemaPageUrl.value}#article` : undefined;
  const siteNameValue = siteName.value;
  const logoCandidate = data.value?.logo?.[0]?.path || data.value?.siteLogo?.[0]?.path;
  const logoUrl = toAbsoluteUrl(logoCandidate, schemaBaseUrl.value || pageDomain.value);
  const authorNode = schemaAuthor.value;

  if (schemaBaseUrl.value && siteNameValue) {
    nodes.push({
      "@type": "WebSite",
      "@id": websiteId,
      url: schemaBaseUrl.value,
      name: siteNameValue,
      inLanguage: pageLang.value,
    });
  }

  if (schemaBaseUrl.value && siteNameValue) {
    nodes.push({
      "@type": "Organization",
      "@id": orgId,
      url: schemaBaseUrl.value,
      name: siteNameValue,
      logo: logoUrl ? { "@type": "ImageObject", url: logoUrl } : undefined,
    });
  }

  if (schemaPageUrl.value) {
    const webPageNode = {
      "@type": "WebPage",
      "@id": pageId,
      url: schemaPageUrl.value,
      name: pageHead.value.title || siteNameValue || "Website",
      description: pageHead.value.description || undefined,
      isPartOf: websiteId ? { "@id": websiteId } : undefined,
      inLanguage: pageLang.value,
      author: !isArticle && authorNode
        ? authorNode["@id"]
          ? { "@id": authorNode["@id"] }
          : { "@type": "Person", name: authorNode.name }
        : undefined,
      aggregateRating: !isArticle ? schemaAggregateRating.value : undefined,
    };
    nodes.push(webPageNode);
  }

  if (schemaBreadcrumbs.value.length) {
    nodes.push({
      "@type": "BreadcrumbList",
      itemListElement: schemaBreadcrumbs.value,
    });
  }

  const articleHeadline = pageHead.value.title || data.value?.article?.H1;
  if (isArticle && articleHeadline) {
    nodes.push({
      "@type": "Article",
      "@id": articleId,
      headline: articleHeadline,
      description: pageHead.value.description || undefined,
      image: ogImage.value ? [toAbsoluteUrl(ogImage.value, schemaBaseUrl.value || pageDomain.value)] : undefined,
      datePublished: publishedTime.value,
      dateModified: modifiedTime.value,
      inLanguage: pageLang.value,
      mainEntityOfPage: pageId ? { "@id": pageId } : undefined,
      publisher: orgId ? { "@id": orgId } : undefined,
      author: authorNode
        ? authorNode["@id"]
          ? { "@id": authorNode["@id"] }
          : { "@type": "Person", name: authorNode.name }
        : undefined,
      aggregateRating: isArticle ? schemaAggregateRating.value : undefined,
    });
  }

  if (schemaFaq.value.length) {
    nodes.push({
      "@type": "FAQPage",
      mainEntity: schemaFaq.value,
    });
  }

  if (authorNode) {
    nodes.push(authorNode);
  }

  if (schemaReviews.value.length) {
    const reviewedId = isArticle ? articleId : pageId;
    const updatedReviews = schemaReviews.value.map((review) =>
      reviewedId
        ? { ...review, itemReviewed: { "@id": reviewedId } }
        : review,
    );
    nodes.push(...updatedReviews);
  }

  return nodes.filter(Boolean);
});

// === Универсальный headMeta с поддержкой robots.metaTags ===
const isRobotsMeta = (entry) => {
  const name = entry?.name ?? (entry?.type === "name" ? entry?.key : null);
  return typeof name === "string" && name.trim().toLowerCase() === "robots";
};

const normalizeHeadMetaEntry = (entry) => {
  const attrName = entry?.type === "property" ? "property" : entry?.type === "httpEquiv" ? "httpEquiv" : "name";
  const attrValue = entry?.[attrName] ?? entry?.key;
  const normalizedValue = attrValue != null ? String(attrValue).trim() : "";
  if (!attrName || !normalizedValue) return null;
  const normalized = { [attrName]: normalizedValue };
  const content = toContentString(entry?.content ?? entry?.value);
  if (content !== undefined) normalized.content = content;
  if (entry?.key != null) normalized.key = String(entry.key);
  return normalized;
};

const headMeta = computed(() => {
  const baseMeta = [
    { name: "description", content: toContentString(pageHead.value.description) },
    { name: "keywords", content: toContentString(pageHead.value.keywords) },
    { property: "og:title", content: toContentString(pageHead.value.title) },
    { property: "og:description", content: toContentString(pageHead.value.description) },
    { property: "og:image", content: toContentString(ogImage.value) },
    { property: "og:image:width", content: toContentString(ogImageWidth.value) },
    { property: "og:image:height", content: toContentString(ogImageHeight.value) },
    { property: "og:url", content: toContentString(pageUrl.value) },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: toContentString(siteName.value) },
    { property: "og:locale", content: toContentString(pageLang.value) },
    { property: "article:published_time", content: toContentString(publishedTime.value) },
    { property: "article:modified_time", content: toContentString(modifiedTime.value) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: toContentString(pageHead.value.title) },
    { name: "twitter:description", content: toContentString(pageHead.value.description) },
    { name: "twitter:image", content: toContentString(ogImage.value) },
    { name: "twitter:site", content: toContentString(twitterSite.value) },
  ];

  const metaArray = Array.isArray(pageHead.value.meta) ? pageHead.value.meta : [];
  const globalMeta = globalHead.meta || [];
  const manifestMetaEntries = manifestHead.value.meta || [];
  const robotsMetaTags = Array.isArray(data.value?.robots?.metaTags) ? data.value.robots.metaTags : [];

  const robotsContent = toContentString(pageHead.value.robots);
  let robotsMeta = robotsContent
    ? { name: "robots", content: robotsContent }
    : metaArray.find(isRobotsMeta)
      || robotsMetaTags.find(isRobotsMeta);

  const metaWithoutRobots = metaArray.filter(m => !isRobotsMeta(m));
  const robotsOtherMeta = robotsMetaTags.filter(m => !isRobotsMeta(m));

  const manifestNames = manifestMetaEntries
    .map(entry => entry?.name)
    .filter(Boolean);

  const usedNames = new Set([
    ...metaWithoutRobots.map(m => m.name ?? m.key),
    ...manifestNames,
    ...(globalMeta.map(m => m.name).filter(Boolean)),
  ]);
  const robotsOtherMetaFiltered = robotsOtherMeta.filter(m => !usedNames.has(m.name));

  const pageMetaEntries = metaWithoutRobots
    .map(normalizeHeadMetaEntry)
    .filter(Boolean);

  const robotsEntry = robotsMeta
    ? [{
        key: "robots",
        name: "robots",
        content: toContentString(robotsMeta.content ?? robotsMeta.value),
      }].filter(item => item.content !== undefined)
    : [];

  const robotsOtherEntries = robotsOtherMetaFiltered
    .map(m => {
      const name = m?.name != null ? String(m.name) : "";
      if (!name) return null;
      const content = toContentString(m?.content ?? m?.value);
      const entry = { name };
      if (content !== undefined) entry.content = content;
      return entry;
    })
    .filter(Boolean);

  const combined = [
    ...baseMeta,
    ...pageMetaEntries,
    ...robotsEntry,
    ...robotsOtherEntries,
    ...manifestMetaEntries,
    ...globalMeta,
  ].filter(Boolean);

  return dedupeMeta(combined);
});


const headLinks = computed(() => {
  const manifestLinks = manifestHead.value.link || [];
  const combined = [
    { key: "canonical", rel: "canonical", href: canonicalHref.value },
    ampHref.value ? { key: "amphtml", rel: "amphtml", href: ampHref.value } : null,
    ...alternateLinks.value,
    ...manifestLinks,
    ...(globalHead.link || []),
  ].filter(Boolean);

  return dedupeLinks(combined);
});


const headScripts = computed(() => [
  ...(Array.isArray(data.value?.pixel) && data.value.pixel.length > 0 ? [{
    innerHTML: `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      ${data.value.pixel.map(pixelId => `fbq('init', '${pixelId}');`).join('\n')}
      fbq('track', 'PageView');
    `,
    type: "text/javascript"
  }] : []),
  ...(Array.isArray(data.value?.gtm) ? data.value.gtm.map((gtmId, index) => ({
    key: `gtm-script-${index}`,
    innerHTML: `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `
  })) : [])
]);

const headNoScripts = computed(() => [
  ...(Array.isArray(data.value?.pixel) ? data.value.pixel.map(pixelId => ({
    innerHTML: `
      <img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
    `
  })) : []),
  ...(Array.isArray(data.value?.gtm) ? data.value.gtm.map((gtmId, index) => ({
    key: `gtm-noscript-${index}`,
    innerHTML: `
      <iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe>
    `
  })) : [])
]);

useHead({
  htmlAttrs: { lang: pageLang.value },
  title: pageHead.value.title || "Website",
  meta: headMeta.value,
  link: headLinks.value,
  script: headScripts.value,
  noscript: headNoScripts.value,
});

useSchemaOrg(schemaNodes);

if (data.value?.lang) {
  locale.value = data.value.lang;
}

// --- Site-level custom code blocks ---
const headBlocks = computed(() => Array.isArray(data.value?.headCodeBlocks) ? data.value.headCodeBlocks : []);
const bodyBlocks = computed(() => Array.isArray(data.value?.bodyCodeBlocks) ? data.value.bodyCodeBlocks : []);

const extractCode = (html) => {
  if (!html) return "";
  let s = String(html);
  const m = s.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (m) s = m[1];
  if (/&lt;|&gt;|&amp;|&quot;|&#039;/.test(s)) {
    s = s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }
  return s;
};

const toHeadScripts = computed(() => headBlocks.value
  .filter(b => b?.type === 'js')
  .map((b, i) => ({ key: `head-js-${i}` , innerHTML: extractCode(b.content), type: 'text/javascript' }))
);
const toHeadStyles = computed(() => headBlocks.value
  .filter(b => b?.type === 'css')
  .map((b, i) => ({ key: `head-css-${i}`, children: extractCode(b.content) }))
);
const toHeadLdJson = computed(() => headBlocks.value
  .filter(b => b?.type === 'blocks')
  .map((b, i) => ({ key: `head-ld-${i}`, type: 'application/ld+json', children: extractCode(b.content) }))
);

// Support head custom HTML blocks: extract meta/link/script/style/noscript
const headHtmlBlocks = computed(() => headBlocks.value
  .filter(b => b?.type === 'html')
  .map(b => extractCode(b.content))
);

const parseAttrs = (str = '') => {
  const attrs = {};
  const re = /(\w[\w:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(str))) {
    const key = m[1];
    const val = m[3] ?? m[4] ?? m[5] ?? '';
    attrs[key] = val;
  }
  return attrs;
};

const toHeadHtmlScripts = computed(() => {
  const res = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const html of headHtmlBlocks.value) {
    let m;
    while ((m = re.exec(html))) {
      const attrs = parseAttrs(m[1] || '');
      const children = (m[2] || '').trim();
      const entry = { ...attrs };
      if (children) entry.innerHTML = children;
      res.push(entry);
    }
  }
  return res;
});

const toHeadHtmlStyles = computed(() => {
  const res = [];
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  for (const html of headHtmlBlocks.value) {
    let m;
    while ((m = re.exec(html))) {
      const attrs = parseAttrs(m[1] || '');
      const children = (m[2] || '').trim();
      res.push({ ...attrs, children });
    }
  }
  return res;
});

const toHeadHtmlMeta = computed(() => {
  const res = [];
  const re = /<meta([^>]*)>/gi;
  for (const html of headHtmlBlocks.value) {
    let m;
    while ((m = re.exec(html))) {
      const attrs = parseAttrs(m[1] || '');
      if (Object.keys(attrs).length) res.push(attrs);
    }
  }
  return res;
});

const toHeadHtmlLinks = computed(() => {
  const res = [];
  const re = /<link([^>]*)>/gi;
  for (const html of headHtmlBlocks.value) {
    let m;
    while ((m = re.exec(html))) {
      const attrs = parseAttrs(m[1] || '');
      if (Object.keys(attrs).length) res.push(attrs);
    }
  }
  return res;
});

const toHeadHtmlNoScripts = computed(() => {
  const res = [];
  const re = /<noscript>([\s\S]*?)<\/noscript>/gi;
  for (const html of headHtmlBlocks.value) {
    let m;
    while ((m = re.exec(html))) {
      const children = (m[1] || '').trim();
      if (children) res.push({ innerHTML: children });
    }
  }
  return res;
});

// Merge additional head assets from code blocks
useHead({
  meta: toHeadHtmlMeta.value,
  link: toHeadHtmlLinks.value,
  script: [...toHeadScripts.value, ...toHeadLdJson.value, ...toHeadHtmlScripts.value],
  style: [...toHeadStyles.value, ...toHeadHtmlStyles.value],
  noscript: toHeadHtmlNoScripts.value,
});

// Body code prepared for SSR rendering
const bodyHtmlCodes = computed(() => bodyBlocks.value
  .filter(b => ['html', 'text', 'universal'].includes(b?.type))
  .map(b => extractCode(b.content))
);
const bodyJsCodes = computed(() => bodyBlocks.value
  .filter(b => b?.type === 'js')
  .map(b => extractCode(b.content))
);

// SSR редирект
if (data.value?.redirect?.to && import.meta.server) {
  const target = data.value.redirect.to;
  const isExternal = /^https?:\/\//i.test(target);
  await navigateTo(target, {
    redirectCode: data.value.redirect.statusCode || 301,
    external: isExternal,
  });
}
</script>
