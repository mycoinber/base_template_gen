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
    class="relative flex w-full min-h-[41rem] items-center justify-center overflow-hidden rounded-[1rem] border border-border text-color-white max-[541px]:min-h-[24rem]"
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
      class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/62 to-background-01"
    ></div>
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(248,207,120,.24),transparent_35%)]"></div>
    <div class="relative z-10 w-full">
      <div class="container">
        <div class="mx-auto flex max-w-[50rem] flex-col items-center justify-center gap-6 py-10 text-center max-[541px]:py-8">
          <div class="flex flex-col gap-3">
            <span class="eagle-pill mx-auto">Top Ranked In Canada</span>
            <span class="font-font-02 text-5xl font-semibold leading-tight max-[541px]:text-2xl">
              {{ title }}
            </span>

            <p v-if="description" class="mx-auto max-w-[52ch] text-base leading-relaxed text-color-soft">
              {{ description }}
            </p>
          </div>

          <NuxtLink
            v-if="data.ctaText || data.button"
            :href="link"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="eagle-cta font-font-01 inline-flex w-full max-w-80 items-center justify-center px-6 py-4 text-sm no-underline"
          >
            {{ buttonText }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
