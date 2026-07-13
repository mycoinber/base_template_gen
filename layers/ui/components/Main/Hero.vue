<script setup>
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { resolveMediaPath } from '#layers/base/utils/mediaPath';
const { t } = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

// proxy images via same-origin route to hide backend

const offerId = computed(() => props.data.offer?._id || props.data.offer?.id || '')
const { offer } = useOffer(offerId)

const heroSections = computed(() => {
  return offer.value?.sections?.filter(section => section.type === 'hero') || [];
});

const resolveMediaSrc = (media) => {
  if (!media) return '';
  const variants = Array.isArray(media.variants) ? media.variants : [];
  if (variants.length) {
    const sorted = [...variants].sort((a, b) => (b?.width || 0) - (a?.width || 0));
    if (sorted[0]?.path) return resolveMediaPath(sorted[0].path);
  }
  const fallback = media.originalPath || media.path || '';
  return fallback ? resolveMediaPath(fallback) : '';
};

const heroBackground = computed(() => {
  const background = props.data?.offer?.background?.[0] || null;
  if (background) return resolveMediaSrc(background);
  const hero = Array.isArray(props.data?.hero) ? props.data.hero[0] : null;
  return resolveMediaSrc(hero);
});
</script>

<template>
  <div v-if="offer" class="grid grid-cols-[74%_26%] gap-6 max-[541px]:flex max-[541px]:flex-col">
    <div class="panel-card flex flex-col gap-4 p-5 max-[541px]:p-4">
      <div class="flex items-center justify-between gap-4 w-full">
        <span class="font-font-02 m-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap p-0 text-[1.9rem] font-semibold uppercase text-color-white max-[541px]:mx-auto max-[541px]:text-xl max-[541px]:text-center">{{ offer.label }}</span>

        <div class="flex items-center gap-4 max-[541px]:hidden">
          <span class="text-sm text-color-muted">{{ offer.title }}</span>

          <GeneralButton :data="{
            offerId,
            title: offer.button1 || t('play'),
            target: '_blank',
            rel: 'noopener noreferrer',
          }" />
        </div>
      </div>

      <div class="relative flex h-[40rem] w-full items-center justify-center overflow-hidden rounded-[0.95rem] border border-border max-[541px]:h-auto max-[541px]:min-h-[24rem] max-[541px]:py-6">
        <div class="absolute top-0 left-0 w-full h-full">
          <img
            v-if="heroBackground"
            :src="heroBackground"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div class="absolute inset-0 bg-gradient-to-b from-black/12 via-black/45 to-black/65"></div>

        <GeneralButtonThree :data="{
          offerId,
          title: offer.button2 || t('play'),
          target: '_blank',
          rel: 'noopener noreferrer',
        }" class="relative z-10 w-1/4 max-[541px]:w-3/4" />
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <template v-for="section in heroSections" :key="section._id">
      <div class="panel-card relative flex w-full flex-col p-4">
        <div class="absolute -left-4 -top-4 h-14 w-14 overflow-hidden rounded-full border border-border max-[541px]:-left-2 max-[541px]:-top-2 max-[541px]:h-12 max-[541px]:w-12">
          <NuxtImg
            v-if="section.images?.[0]?.path"
            :src="section.images[0].path"
            :alt="section.headline"
            sizes="(max-width: 541px) 48px, 56px"
            class="w-full h-full object-cover"
          />
          <NuxtImg
            v-else
            src="/bg.png"
            :alt="section.headline"
            sizes="(max-width: 541px) 48px, 56px"
            class="w-full h-full object-cover"
          />
        </div>

        <span class="font-font-02 mb-3 max-w-full overflow-hidden whitespace-nowrap pl-8 text-center text-base font-medium uppercase text-ellipsis text-color-white">{{ section.headline }}</span>

        <div class="flex flex-col items-center gap-3">
          <span class="font-font-02 border-t border-border pt-3 text-center text-[0.86rem] font-medium uppercase tracking-[0.08em] text-color-03">{{ section.headline }}</span>

          <GeneralButton :data="{
            offerId,
            title: section.cta || t('bonus'),
            target: '_blank',
            rel: 'noopener noreferrer',
          }" class="w-full" />

          <div class="flex items-center gap-3">
            <span class="border-r border-border pr-2 text-[0.7rem] uppercase tracking-[0.08em] text-color-muted text-center last:border-r-0">18+</span>

            <span class="border-r border-border pr-2 text-[0.7rem] uppercase tracking-[0.08em] text-color-muted text-center last:border-r-0">{{ $t('terms_apply') }}</span>

            <span class="border-r border-border pr-2 text-[0.7rem] uppercase tracking-[0.08em] text-color-muted text-center last:border-r-0">{{ $t('play_responsibility') }}</span>
          </div>
        </div>
      </div>
      </template>
    </div>
  </div>
</template>
