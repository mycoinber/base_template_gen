<script setup>
import { computed } from "vue";

const props = defineProps({
  offers: {
    type: Array,
    default: () => [],
  },
});

const storedFooterOfferData = useState("currentFooterOfferData", () => null);

const footerOffer = computed(() => {
  const offers = Array.isArray(props.offers) ? props.offers : [];
  return offers.find((entry) => entry?.placement === "footer") || null;
});

const footerOfferData = computed(() => footerOffer.value?.data || storedFooterOfferData.value || {});

const footerOfferLink = computed(() => footerOfferData.value?.link || "");

const footerPrimaryLabel = computed(() => {
  const data = footerOfferData.value || {};
  if (typeof data.ctaText === "string" && data.ctaText.trim()) {
    return data.ctaText.trim();
  }
  return "";
});

const footerOfferEnabled = computed(() =>
  Boolean(footerOfferLink.value && footerPrimaryLabel.value),
);
</script>

<template>
  <NuxtLink
    v-if="footerOfferEnabled"
    :href="footerOfferLink"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="eagle-cta font-font-01 inline-flex h-full w-full items-center justify-center px-4 py-3 text-xs tracking-[0.08em] no-underline"
  >
    {{ footerPrimaryLabel }}
  </NuxtLink>
</template>
