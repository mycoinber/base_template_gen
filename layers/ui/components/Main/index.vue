<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { resolveMediaPath } from '#layers/base/utils/mediaPath';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const config = useRuntimeConfig();

const blocks = computed(() =>
  Array.isArray(props.data.article?.blocks) ? props.data.article.blocks : [],
);

const introBlock = computed(() =>
  blocks.value.find(
    (block) => typeof block?.type === 'string' && block.type.toLowerCase() === 'intro',
  ) || null,
);

const heroOffer = computed(() => {
  const offers = Array.isArray(props.data?.offers) ? props.data.offers : [];
  return offers.find((entry) => entry?.placement === 'hero') || null;
});

const heroOfferList = computed(() => {
  const offers = Array.isArray(props.data?.offers) ? props.data.offers : [];
  return offers.filter((entry) => entry?.placement === 'gallery');
});

const heroMedia = computed(() => {
  const offerMedia = heroOffer.value?.data?.imageMedia || heroOffer.value?.data?.image;
  if (offerMedia && typeof offerMedia === 'object' && offerMedia.path) {
    return offerMedia;
  }
  if (typeof offerMedia === 'string' && offerMedia) {
    return { path: offerMedia, alt: heroOffer.value?.data?.title || heroOffer.value?.data?.label || 'hero' };
  }
  const intro = introBlock.value || null;
  if (intro) {
    if (Array.isArray(intro.imageUrl) && intro.imageUrl.length && intro.imageUrl[0]?.path) {
      return intro.imageUrl[0];
    }
    if (intro.image && intro.image.path) {
      return intro.image;
    }
  }
  const heroArray = Array.isArray(props.data?.hero) ? props.data.hero : [];
  if (heroArray.length && heroArray[0]?.path) {
    return heroArray[0];
  }
  return null;
});

const heroAlt = computed(() => {
  if (heroOffer.value?.data?.title) return heroOffer.value.data.title;
  if (heroOffer.value?.data?.label) return heroOffer.value.data.label;
  if (heroMedia.value?.alt) return heroMedia.value.alt;
  if (introBlock.value?.headline) return introBlock.value.headline;
  return props.data?.article?.H1 || 'hero';
});

const heroMediaSrc = computed(() => {
  const media = heroMedia.value;
  if (!media) return '';
  const variants = Array.isArray(media.variants) ? media.variants : [];
  if (variants.length) {
    const sorted = [...variants].sort((a, b) => (b?.width || 0) - (a?.width || 0));
    const best = sorted[0];
    if (best?.path) return resolveMediaPath(best.path);
  }
  const fallback = media.originalPath || media.path || '';
  return fallback ? resolveMediaPath(fallback) : '';
});

const sectionComponents = {
  intro: defineAsyncComponent(() => import('./sections/Intro.vue')),
  h2: defineAsyncComponent(() => import('./sections/Heading.vue')),
  section: defineAsyncComponent(() => import('./sections/Heading.vue')),
  review: defineAsyncComponent(() => import('./sections/Review.vue')),
  product_review: defineAsyncComponent(() => import('./sections/ProductReview.vue')),
  faq: defineAsyncComponent(() => import('./sections/Faq.vue')),
  default: defineAsyncComponent(() => import('./sections/Default.vue')),
};

const resolveSection = (type) => {
  if (!type) return sectionComponents.default;
  const key = type.toLowerCase();
  return sectionComponents[key] || sectionComponents.default;
};

const hasAuthor = computed(() => Boolean(props.data?.author || props.data?.aiauthor));

const isLoaded = ref(import.meta.server);
const isBot = useState('isBot', () => false);

if (import.meta.server) {
  const event = useRequestEvent();
  isBot.value = event.context.isBot || false;
} else {
  onMounted(() => {
    setTimeout(() => {
      isLoaded.value = true;
    }, 100);
  });
}
</script>

<template>
  <div v-if="!isLoaded" class="fixed top-0 left-0 w-full h-screen flex items-center justify-center bg-background-01 z-[9999]">
    <MainLoader />
  </div>

  <section
    v-if="heroOffer"
    class="relative w-full mb-8 overflow-hidden rounded-[0.625rem] border border-border"
  >
    <AdsHero :offer="heroOffer" />
  </section>
  <section
    v-else-if="heroMedia"
    class="relative w-full mb-8 overflow-hidden rounded-[0.625rem] border border-border h-[40rem] max-[541px]:min-h-[24rem]"
  >
    <img
      :src="heroMediaSrc"
      :alt="heroAlt"
      class="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
    <div class="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-b from-transparent via-black/50 to-background-01 pointer-events-none"></div>
  </section>

  <AdsHeroOfferList :offers="heroOfferList" />

  <MainTitle v-if="data.article?.H1" :data="data" />

  <MainTableOfContent v-if="blocks.length" :data="data" />

  <component
    v-for="block in blocks"
    :key="block._id"
    :is="resolveSection(block.type)"
    :block="block"
    :page="data"
    :is-bot="isBot"
    :is-loaded="isLoaded"
  />

  <MainAuthor v-if="hasAuthor" :data="data" />
</template>
