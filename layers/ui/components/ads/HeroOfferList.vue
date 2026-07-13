<script setup>
import { computed } from 'vue'
import { resolveMediaPath } from '#layers/base/utils/mediaPath'

const props = defineProps({
  offers: {
    type: Array,
    default: () => [],
  },
})

const normalizedOffers = computed(() => {
  const list = Array.isArray(props.offers) ? props.offers : []
  return list.filter((offer) => offer?.placement === 'gallery')
})

const resolveImageSrc = (offer) => {
  const data = offer?.data || {}
  const candidate = data.imageMedia || data.image || null
  if (!candidate) return ''
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
      return resolveMediaPath(trimmed)
    }
    return ''
  }
  if (typeof candidate === 'object') {
    const rawPath = candidate.path || candidate.url || candidate.src || ''
    if (typeof rawPath !== 'string') return ''
    const trimmed = rawPath.trim()
    return trimmed ? resolveMediaPath(trimmed) : ''
  }
  return ''
}

const resolveTitle = (offer) => {
  const data = offer?.data || {}
  return data.title || data.label || ''
}

const resolveOfferId = (offer) => {
  const data = offer?.data || {}
  return offer?.offer || data.id || data._id || ''
}

const resolveButtonText = (offer) => {
  const data = offer?.data || {}
  if (typeof data.ctaText === 'string' && data.ctaText.trim()) {
    return data.ctaText.trim()
  }
  if (typeof data.button === 'string' && data.button.trim()) {
    return data.button.trim()
  }
  return 'Learn more'
}

const cards = computed(() =>
  normalizedOffers.value.map((offer, index) => ({
    key: offer?.offer || offer?.id || offer?._id || `offer-${index}`,
    offerId: resolveOfferId(offer),
    imageSrc: resolveImageSrc(offer),
    title: resolveTitle(offer),
    buttonText: resolveButtonText(offer),
  }))
)

const { openOffer } = useOfferNavigation()
</script>

<template>
  <section v-if="cards.length" class="my-10 max-[541px]:my-6">
    <div class="container">
      <div
        class="grid grid-cols-5 gap-3 max-[541px]:flex max-[541px]:-mx-4 max-[541px]:overflow-x-auto max-[541px]:px-4 max-[541px]:pb-2"
      >
        <div
          v-for="card in cards"
          :key="card.key"
          class="panel-card relative aspect-[4/3] w-full overflow-hidden p-2 max-[541px]:min-w-[66.666%] max-[541px]:basis-[66.666%] max-[541px]:flex-none"
        >
          <div
            class="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[0.65rem]"
          >
            <img
              v-if="card.imageSrc"
              :src="card.imageSrc"
              :alt="card.title || 'Offer'"
              class="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div
              v-if="card.imageSrc"
              class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/48 to-black/12"
            ></div>
            <div class="relative z-10 flex w-full flex-col justify-end gap-3 p-3 text-color-white">
              <h3 class="font-font-02 text-[1rem] font-semibold leading-tight text-center">
                {{ card.title }}
              </h3>
            <button
              v-if="card.offerId"
              type="button"
              class="eagle-cta font-font-01 inline-flex w-full items-center justify-center px-3 py-2.5 text-[0.68rem] no-underline"
              @click="openOffer(card.offerId)"
            >
              {{ card.buttonText }}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
