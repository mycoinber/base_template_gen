<script setup>
import { computed } from 'vue'
import { resolveMediaPath } from '#layers/base/utils/mediaPath'

const props = defineProps({
  offer: {
    type: Object,
    required: true,
  },
})

const data = computed(() => props.offer?.data || {})
const image = computed(() => data.value.imageMedia || data.value.image || null)
const title = computed(() => data.value.title || data.value.label || '')
const description = computed(() => data.value.description || '')
const link = computed(() => data.value.link || '#')
const buttonText = computed(() => {
  if (typeof data.value.ctaText === 'string' && data.value.ctaText.trim()) {
    return data.value.ctaText.trim()
  }
  return data.value.button || 'Learn more'
})

const imageSrc = computed(() => {
  const media = image.value
  if (!media) return ''
  if (typeof media === 'string') {
    const trimmed = media.trim()
    return trimmed ? resolveMediaPath(trimmed) : ''
  }
  const variants = Array.isArray(media.variants) ? media.variants : []
  if (variants.length) {
    const sorted = [...variants].sort((a, b) => (b?.width || 0) - (a?.width || 0))
    if (sorted[0]?.path) return resolveMediaPath(sorted[0].path)
  }
  const fallback = media.originalPath || media.path || ''
  return fallback ? resolveMediaPath(fallback) : ''
})
</script>

<template>
  <div
    class="relative flex w-full min-h-[40rem] items-center justify-center overflow-hidden rounded-[0.625rem] border border-border text-color-white max-[541px]:min-h-[24rem]"
  >
    <div class="absolute inset-0">
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="title || 'Offer'"
        class="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
    <div
      class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-background-01"
    ></div>
    <div class="relative z-10 w-full">
      <div class="container">
        <div class="flex flex-col items-center justify-center gap-6 py-8 text-center">
          <div class="flex flex-col gap-2">
            <span class="font-font-02 text-6xl font-semibold leading-tight max-[541px]:text-xl">
              {{ title }}ы
            </span>

            <p v-if="description" class="text-base leading-relaxed opacity-80">
              {{ description }}
            </p>
          </div>

          <NuxtLink
            v-if="data.ctaText || data.button"
            :href="link"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="font-font-02 inline-flex w-full items-center justify-center rounded-[0.4rem] bg-color-01 px-6 py-4 text-base font-medium uppercase text-color-white no-underline transition-[filter] duration-300 hover:brightness-[0.7] max-w-80"
          >
            {{ buttonText }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
