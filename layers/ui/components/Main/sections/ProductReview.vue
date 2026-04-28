<script setup>
import { computed } from "vue";
import { resolveMediaPath } from "#layers/base/utils/mediaPath";

const props = defineProps({
  block: {
    type: Object,
    default: () => ({}),
  },
});

const contentHtml = computed(() => String(props.block?.content || "").trim());

const splitProductReviewContent = (value = "") => {
  const source = String(value || "").trim();
  if (!source) {
    return { introHtml: "", bodyHtml: "" };
  }

  const sectionOpenMatch = source.match(/<section\b[^>]*>/i);
  const sectionBodyMatch = source.match(/<section\b[^>]*>([\s\S]*?)<\/section>/i);
  if (!sectionOpenMatch || !sectionBodyMatch) {
    return { introHtml: "", bodyHtml: source };
  }

  const sectionOpen = sectionOpenMatch[0];
  const sectionBody = sectionBodyMatch[1] || "";
  const firstSectionMatch = sectionBody.match(/<div\b[^>]*class="[^"]*pr-section[^"]*"[^>]*>/i);

  if (!firstSectionMatch || typeof firstSectionMatch.index !== "number") {
    return { introHtml: sectionBody.trim(), bodyHtml: "" };
  }

  const firstSectionStart = firstSectionMatch.index;
  const introHtml = sectionBody.slice(0, firstSectionStart).trim();
  const bodyInner = sectionBody.slice(firstSectionStart).trim();
  const bodyHtml = bodyInner ? `${sectionOpen}${bodyInner}</section>` : "";

  return { introHtml, bodyHtml };
};

const splitContent = computed(() => splitProductReviewContent(contentHtml.value));
const introHtml = computed(() => splitContent.value.introHtml);
const bodyHtml = computed(() => splitContent.value.bodyHtml || (!splitContent.value.introHtml ? contentHtml.value : ""));

const sectionImage = computed(() => {
  if (Array.isArray(props.block?.imageUrl) && props.block.imageUrl.length) {
    return props.block.imageUrl[0];
  }
  if (props.block?.imageMedia?.path) {
    return props.block.imageMedia;
  }
  if (props.block?.image?.path) {
    return props.block.image;
  }
  return null;
});

const sectionImageSrc = computed(() => {
  const media = sectionImage.value;
  if (!media) return "";
  const variants = Array.isArray(media.variants) ? media.variants : [];
  if (variants.length) {
    const sorted = [...variants].sort((a, b) => (b?.width || 0) - (a?.width || 0));
    if (sorted[0]?.path) return resolveMediaPath(sorted[0].path);
  }
  const fallback = media.originalPath || media.path || "";
  return fallback ? resolveMediaPath(fallback) : "";
});

const sectionHeadline = computed(() => props.block?.headline || props.block?.H2 || "Product Review");

const isImageLeft = computed(() => {
  const order = Number(props.block?.order ?? 0);
  if (!Number.isFinite(order)) return true;
  return order % 2 === 0;
});
</script>

<template>
  <section :id="block._id" class="my-10 max-[541px]:my-6">
    <div class="container">
      <div
        :class="[
          'product-review-head',
          { 'product-review-head--reverse': isImageLeft },
        ]"
      >
        <div class="product-review-intro panel-card">
          <h2 class="mb-4">{{ sectionHeadline }}</h2>

          <div
            v-if="introHtml"
            class="product-review-intro-content rich-content"
            v-html="introHtml"
          />
        </div>

        <div v-if="sectionImageSrc" class="product-review-media">
          <div class="panel-card w-full aspect-square overflow-hidden">
            <img
              :src="sectionImageSrc"
              :alt="sectionImage?.alt || sectionHeadline"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <div
        v-if="bodyHtml"
        class="product-review-content panel-card mt-4 p-5 max-[541px]:p-4"
        v-html="bodyHtml"
      />
    </div>
  </section>
</template>

<style scoped>
.product-review-head {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.product-review-head--reverse {
  flex-direction: row-reverse;
}

.product-review-intro {
  flex: 1 1 auto;
  min-width: 0;
  padding: 1.25rem;
}

.product-review-media {
  flex: 0 0 16.6667%;
  max-width: 16.6667%;
  min-width: 0;
}

.product-review-intro-content :deep(p) {
  margin: 0 0 0.8rem;
  font-size: 1.05rem;
  line-height: 1.6;
  text-align: left;
  color: color-mix(in srgb, var(--color-white) 88%, #9ca3af);
}

.product-review-intro-content :deep(p:last-child) {
  margin-bottom: 0;
}

.product-review-intro h2 {
  text-align: left;
}

.product-review-content {
  --pr-card: color-mix(in srgb, var(--background-02) 86%, #0f1728);
  --pr-border: color-mix(in srgb, var(--border) 86%, #24344f);
  --pr-accent: var(--color-01);
  --pr-success: #10b981;
  --pr-warning: #f59e0b;
  margin-top: 0.25rem;
}

.product-review-content :deep(section[data-type="product_review"]) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.product-review-content :deep(section[data-type="product_review"] > p) {
  grid-column: 1 / -1;
  margin: 0;
  text-align: left;
  font-size: 1.05rem;
  line-height: 1.6;
  color: color-mix(in srgb, var(--color-white) 88%, #9ca3af);
}

.product-review-content :deep(.pr-section) {
  margin-top: 0;
  border: 1px solid var(--pr-border);
  border-radius: 0.75rem;
  background: var(--pr-card);
}

.product-review-content :deep(.pr-section p:last-child) {
  margin-bottom: 0;
}

.product-review-content :deep(.pr-section-how_offer_works),
.product-review-content :deep(.pr-section-key_terms),
.product-review-content :deep(.pr-section-pros),
.product-review-content :deep(.pr-section-cons) {
  padding: 1.2rem;
  position: relative;
}

.product-review-content :deep(.pr-section-how_offer_works::before),
.product-review-content :deep(.pr-section-key_terms::before),
.product-review-content :deep(.pr-section-pros::before),
.product-review-content :deep(.pr-section-cons::before) {
  display: inline-block;
  margin-bottom: 0.65rem;
  font-family: var(--font-02);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-white) 72%, #9ca3af);
}

.product-review-content :deep(.pr-section-how_offer_works::before) {
  content: "How Offer Works";
}

.product-review-content :deep(.pr-section-key_terms::before) {
  content: "Key Terms";
}

.product-review-content :deep(.pr-section-pros::before) {
  content: "Pros";
}

.product-review-content :deep(.pr-section-cons::before) {
  content: "Cons";
}

.product-review-content :deep(.pr-section-how_offer_works p),
.product-review-content :deep(.pr-section-key_terms p),
.product-review-content :deep(.pr-section-pros p),
.product-review-content :deep(.pr-section-cons p) {
  margin: 0;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-white) 82%, #9ca3af);
}

.product-review-content :deep(.pr-section-quick_facts) {
  grid-column: 1 / -1;
  padding: 0;
  border: 0;
  background: transparent;
  overflow-x: auto;
}

.product-review-content :deep(.pr-section-quick_facts table) {
  width: 100%;
  border-collapse: collapse;
  min-width: 34rem;
}

.product-review-content :deep(.pr-section-best_for) {
  grid-column: 1 / -1;
  background: transparent;
  border: 0;
  padding: 0;
}

.product-review-content :deep(.pr-fit-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.product-review-content :deep(.pr-fit-item) {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--pr-border);
}

.product-review-content :deep(.pr-fit-item-best) {
  border-color: color-mix(in srgb, var(--pr-success) 26%, var(--pr-border));
  background: color-mix(in srgb, var(--pr-success) 7%, var(--pr-card));
}

.product-review-content :deep(.pr-fit-item-not-ideal) {
  border-color: color-mix(in srgb, var(--pr-warning) 26%, var(--pr-border));
  background: color-mix(in srgb, var(--pr-warning) 8%, var(--pr-card));
}

.product-review-content :deep(.pr-fit-label) {
  margin: 0 0 0.45rem;
  font-family: var(--font-02);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.product-review-content :deep(.pr-fit-label-best) {
  color: color-mix(in srgb, var(--pr-success) 76%, var(--color-white));
}

.product-review-content :deep(.pr-fit-label-not-ideal) {
  color: color-mix(in srgb, var(--pr-warning) 76%, var(--color-white));
}

.product-review-content :deep(.pr-fit-text) {
  margin: 0;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-white) 88%, #9ca3af);
}

.product-review-content :deep(.pr-section-bottom_line) {
  grid-column: 1 / -1;
  padding: 1.35rem 1.2rem;
  text-align: center;
}

.product-review-content :deep(.pr-section-bottom_line::before) {
  content: "Final Verdict";
  display: inline-block;
  margin-bottom: 0.7rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pr-accent) 28%, var(--pr-border));
  background: color-mix(in srgb, var(--pr-accent) 12%, transparent);
  font-family: var(--font-02);
  font-size: 0.68rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pr-accent) 72%, var(--color-white));
}

.product-review-content :deep(.pr-bottom-line) {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.62;
  font-style: italic;
  color: color-mix(in srgb, var(--color-white) 90%, #9ca3af);
}

@media (max-width: 900px) {
  .product-review-head,
  .product-review-head--reverse {
    flex-direction: column;
    gap: 1rem;
  }

  .product-review-media {
    flex: none;
    max-width: 100%;
    width: 100%;
  }

  .product-review-content :deep(section[data-type="product_review"]) {
    grid-template-columns: 1fr;
  }

  .product-review-content :deep(section[data-type="product_review"] > p),
  .product-review-content :deep(.pr-section-quick_facts),
  .product-review-content :deep(.pr-section-best_for),
  .product-review-content :deep(.pr-section-bottom_line) {
    grid-column: auto;
  }

  .product-review-content :deep(.pr-fit-grid) {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 541px) {
  .product-review-content :deep(section[data-type="product_review"] > p) {
    text-align: left;
    font-size: 0.95rem;
  }

  .product-review-content :deep(.pr-section-quick_facts) {
    overflow-x: auto;
  }

  .product-review-content :deep(.pr-section-quick_facts table) {
    min-width: 30rem;
  }

  .product-review-content :deep(.pr-bottom-line) {
    font-size: 0.98rem;
  }
}
</style>
