<script setup>
import { computed } from "vue";

const props = defineProps({
  offers: {
    type: Array,
    default: () => [],
  },
});

const storedHeaderOfferData = useState("currentHeaderOfferData", () => null);

const headerOffer = computed(() => {
  const offers = Array.isArray(props.offers) ? props.offers : [];
  return offers.find((entry) => entry?.placement === "header") || null;
});

const headerOfferData = computed(() => headerOffer.value?.data || storedHeaderOfferData.value || {});

const headerOfferLink = computed(() => headerOfferData.value?.link || "");

const headerPrimaryLabel = computed(() => {
  const data = headerOfferData.value || {};
  if (typeof data.ctaText === "string" && data.ctaText.trim()) {
    return data.ctaText.trim();
  }
  return "";
});

const headerOfferEnabled = computed(() =>
  Boolean(headerOfferLink.value && headerPrimaryLabel.value),
);
</script>

<template>
  <NuxtLink
    v-if="headerOfferEnabled"
    :href="headerOfferLink"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="font-font-02 inline-flex w-full items-center justify-center rounded-[0.4rem] bg-color-01 px-6 py-4 text-base font-medium uppercase text-color-white no-underline transition-[filter] duration-300 hover:brightness-[0.7]"
  >
    {{ headerPrimaryLabel }}
  </NuxtLink>
</template>
