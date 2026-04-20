// composables/usePageData.ts
import { useNuxtApp, useAsyncData } from "#app";
import { createError } from "#imports";
import { watch } from "vue";

type AnyObject = Record<string, any>;

const ensureArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  return value != null ? [value] : [];
};

const normalizeMediaArray = (value: any): AnyObject[] => {
  return ensureArray(value)
    .map((entry) => (entry && typeof entry === "object" ? entry : null))
    .filter((entry): entry is AnyObject => Boolean(entry && entry.path));
};

const normalizeFaqs = (faqs: any, blockId: string) => {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  const mapped = faqs
    .map((faq, index) => ({
      _id: faq?._id || `${blockId}-faq-${index}`,
      question: faq?.question || "",
      answer: faq?.answer || "",
    }))
    .filter((faq) => faq.question && faq.answer);
  return mapped.length ? mapped : null;
};

const stripHtml = (value: unknown) =>
  typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : "";

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const resolveReviewAuthorName = (review: AnyObject, index: number) => {
  const explicitName = toTrimmedString(review?.name);
  if (explicitName) return explicitName;

  const authorBio = toTrimmedString(review?.authorBio);
  if (authorBio) return authorBio;

  if (typeof review?.author === "string") {
    const authorAsString = toTrimmedString(review.author);
    if (authorAsString) return authorAsString;
  }

  const author = review?.author && typeof review.author === "object" ? review.author : null;
  const firstName = toTrimmedString(author?.name);
  const lastName = toTrimmedString(author?.surname || author?.lastName || author?.last);
  const nickname = toTrimmedString(author?.nickname);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) return fullName;
  if (nickname) return nickname;
  return `Reviewer ${index + 1}`;
};

const resolveReviewDate = (review: AnyObject) => {
  const directDate = toTrimmedString(review?.date);
  if (directDate) return directDate;
  const updatedAt = toTrimmedString(review?.updatedAt);
  if (updatedAt) return updatedAt;
  const createdAt = toTrimmedString(review?.createdAt);
  if (createdAt) return createdAt;
  return null;
};

const normalizeReviews = (reviews: any, blockId: string) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const mapped = reviews
    .map((review, index) => {
      const avatarPictures = normalizeMediaArray(
        review?.author?.picture || review?.authorAvatar || review?.authorAvatarMedia,
      );
      const reviewAuthor = review?.author && typeof review.author === "object" ? review.author : {};
      const comment = review?.comment || review?.content || "";
      return {
        ...review,
        _id: review?._id || `${blockId}-review-${index}`,
        name: resolveReviewAuthorName(review, index),
        comment,
        rating: review?.rating ?? null,
        date: resolveReviewDate(review),
        author: {
          ...reviewAuthor,
          picture: avatarPictures,
        },
      };
    })
    .filter((review) => Boolean(stripHtml(review.comment)));
  return mapped.length ? mapped : null;
};

const normalizeBlocks = (blocks: any[] | undefined) => {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block, index) => {
    const blockId = block?._id || block?.id || `block-${index}`;
    const imageCandidates =
      block?.imageUrl || block?.imageMedia || block?.image || block?.hero || [];
    return {
      ...block,
      _id: blockId,
      H2: block?.H2 || block?.headline || block?.title || "",
      imageUrl: normalizeMediaArray(imageCandidates),
      faqs: normalizeFaqs(block?.faqs, blockId),
      reviews: normalizeReviews(block?.reviews, blockId),
    };
  });
};

const normalizePageResponse = (payload: AnyObject, slug: string | null) => {
  if (!payload || typeof payload !== "object") return {} as AnyObject;

  const article = payload.article || {};
  const normalizedBlocks = normalizeBlocks(article.blocks);
  const introBlock = normalizedBlocks.find(
    (block) => typeof block?.type === "string" && block.type.toLowerCase() === "intro",
  );
  const heroImages = Array.isArray(payload.hero) && payload.hero.length
    ? payload.hero
    : introBlock?.imageUrl && introBlock.imageUrl.length
      ? introBlock.imageUrl
      : [];

  const payloadFullSlug = typeof payload.fullSlug === "string" ? payload.fullSlug : null;
  const payloadCanonicalSlug = typeof payload.canonicalSlug === "string" ? payload.canonicalSlug : null;
  const payloadLocalePrefix = typeof payload.localePrefix === "string" ? payload.localePrefix : null;
  const fallbackSlug = slug || "";
  const canonicalFallback = payloadCanonicalSlug ?? payload.slug ?? fallbackSlug;
  const normalizedFullSlug = payloadFullSlug ?? canonicalFallback;

  return {
    ...payload,
    type: payload.type || "page",
    slug: normalizedFullSlug || "",
    fullSlug: normalizedFullSlug || "",
    canonicalSlug: canonicalFallback || "",
    localePrefix: payloadLocalePrefix,
    article: {
      ...article,
      H1: article.H1 || article.h1 || payload.head?.title || "",
      intro: article.intro || introBlock?.content || "",
      introImage: heroImages,
      blocks: normalizedBlocks,
    },
    hero: heroImages,
  };
};

const buildPageEndpoint = (slug: string | null) => {
  const segments = typeof slug === "string" && slug.trim()
    ? slug.split("/").filter(Boolean).map((segment) => encodeURIComponent(segment))
    : [];
  if (!segments.length) {
    return "/pages";
  }
  return `/pages/${segments.join("/")}`;
};

export function usePageData(siteId: string, slug: string | null) {
  const { $axios } = useNuxtApp() as any;

  const siteLogo = useState<any[]>("siteLogo", () => []);
  const langPrefixState = useState<string>("siteLangPrefix", () => "");

  const updateLogoState = (logo: any) => {
    siteLogo.value = Array.isArray(logo) ? logo : [];
  };

  const fetchPage = async () => {
    try {
      const endpoint = buildPageEndpoint(slug);
      const response = await $axios.get(endpoint);
      const payload = response.data || {};
      const normalized = normalizePageResponse(payload, slug);
      langPrefixState.value = normalized.localePrefix || "";
      if (import.meta.client) {
        updateLogoState(normalized.logo);
      }
      return normalized;
    } catch (error: any) {
      const status = Number(error?.response?.status) || 500;
      const message = error?.response?.data?.message || error?.message || "Failed to fetch page";
      throw createError({ statusCode: status, statusMessage: message });
    }
  };

  const asyncData = useAsyncData(
    `page-${slug || "home"}-${siteId}`,
    fetchPage,
    { server: true },
  );

  const currentOfferId = useState<string | null>("currentOfferId", () => null);
  const currentOfferData = useState<any | null>("currentOfferData", () => null);
  const currentHeaderOfferData = useState<any | null>("currentHeaderOfferData", () => null);
  const currentFooterOfferData = useState<any | null>("currentFooterOfferData", () => null);
  watch(
    () => asyncData.data.value?.offers,
    (offers) => {
      const list = Array.isArray(offers) ? offers : [];
      const hero = list.find((entry) => entry?.placement === "hero") || null;
      const header = list.find((entry) => entry?.placement === "header") || null;
      const footer = list.find((entry) => entry?.placement === "footer") || null;
      const id = hero?.offer || hero?.data?.id || null;
      currentOfferId.value = id || null;
      currentOfferData.value = hero?.data || null;
      currentHeaderOfferData.value = header?.data || null;
      currentFooterOfferData.value = footer?.data || null;
    },
    { immediate: true },
  );

  watch(
    () => asyncData.data.value?.localePrefix,
    (prefix) => {
      langPrefixState.value = prefix || "";
    },
    { immediate: true },
  );

  if (import.meta.client) {
    watch(
      () => asyncData.data.value?.logo,
      (logo) => updateLogoState(logo),
      { immediate: true },
    );
  }
  return asyncData;
}
